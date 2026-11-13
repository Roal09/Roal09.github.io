(function () {
  'use strict';

  const pages = new Map();
  const roots = new WeakMap();
  let nextId = 1;
  let activeDialog = null;
  const custom = '[data-mes-custom]';
  const text = element => (element?.textContent || '').replace(/\s+/g, ' ').trim();
  const clean = value => String(value || '').replace(/请选择|请输入|选择|输入|[\s（()）:：]/g, '').toLowerCase();

  function button(label, action, className) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className || 'mes-action';
    element.textContent = label;
    element.dataset.mesAction = action;
    return element;
  }

  function columnFor(label, headers) {
    const key = clean(label);
    if (!key) return -1;
    const exact = headers.findIndex(header => clean(header) === key);
    if (exact >= 0) return exact;
    const aliases = { 工位: '工位编号', 设备状态: '状态', 拧紧状态: '状态', 机型名称: '机型' };
    if (aliases[key]) return headers.findIndex(header => clean(header) === aliases[key]);
    return headers.findIndex(header => key && (clean(header).includes(key) || key.includes(clean(header))) && clean(header));
  }

  function notify(context, message) {
    context.message = message || '';
    const visible = context.visible || context.state.rows;
    const selected = context.state.rows.filter(row => context.state.selected.has(row.id)).length;
    context.status.textContent = `${visible.length} / ${context.state.rows.length} 条 · 已选 ${selected} 条${message ? ' · ' + message : ''}`;
  }

  function saveFilters(binding) {
    if (!binding.contexts.length) return;
    binding.contexts[0].state.draft = binding.filters.map(filter => filter.element.value);
  }

  function readFilters(binding) {
    const context = binding.contexts[0];
    const values = binding.filters.map(filter => filter.element.value.trim());
    const start = binding.filters.findIndex(filter => filter.kind === 'start');
    const end = binding.filters.findIndex(filter => filter.kind === 'end');
    if (start >= 0 && end >= 0 && values[start] && values[end] && values[start] > values[end]) {
      binding.filters[end].element.setCustomValidity('结束日期应晚于或等于开始日期');
      binding.filters[end].element.reportValidity();
      return false;
    }
    binding.filters.forEach(filter => filter.element.setCustomValidity(''));
    context.state.draft = values;
    context.state.applied = values.slice();
    return true;
  }

  function matching(row, binding) {
    const values = binding.contexts[0].state.applied || [];
    const dateField = binding.filters.findIndex(filter => filter.kind === 'dateColumn');
    return binding.filters.every((filter, index) => {
      const value = values[index];
      if (!value || filter.kind === 'dateColumn') return true;
      let column = filter.column;
      if ((filter.kind === 'start' || filter.kind === 'end') && dateField >= 0) {
        column = columnFor(values[dateField], binding.contexts[0].state.headers);
      }
      if (filter.kind === 'start' || filter.kind === 'end') {
        if (column < 0) column = row.values.findIndex(cell => /^\d{4}-\d{2}-\d{2}/.test(cell));
        const date = (row.values[column] || '').slice(0, 10);
        return date && (filter.kind === 'start' ? date >= value : date <= value);
      }
      const candidate = column < 0 ? row.values.join(' ') : row.values[column];
      return filter.kind === 'select' ? candidate === value : String(candidate || '').toLowerCase().includes(value.toLowerCase());
    });
  }

  function refreshOptions(binding) {
    const state = binding.contexts[0]?.state;
    if (!state) return;
    binding.filters.filter(filter => filter.kind === 'select').forEach(filter => {
      const current = filter.element.value;
      const values = [...new Set(state.rows.map(row => row.values[filter.column]).filter(Boolean))];
      filter.element.replaceChildren(new Option('全部' + filter.label, ''));
      values.forEach(value => filter.element.add(new Option(value, value)));
      if (current && !values.includes(current)) filter.element.add(new Option(current, current));
      filter.element.value = current;
    });
  }

  function render(context, binding) {
    const state = context.state;
    const rows = context === binding.contexts[0] ? state.rows.filter(row => matching(row, binding)) : state.rows;
    context.visible = rows;
    context.body.replaceChildren();
    rows.forEach((row, rowIndex) => {
      const tr = state.template.cloneNode(true);
      tr.dataset.mesRow = row.id;
      Array.from(tr.cells).forEach((cell, index) => {
        const content = cell.querySelector('.cell') || cell;
        if (index === context.operationIndex) {
          cell.classList.add('mes-operations');
          content.replaceChildren();
          if (!context.readonly && context.selectionIndex < 0) content.appendChild(rowCheckbox(row, state));
          content.appendChild(button('详情', 'detail'));
          if (!context.readonly) content.append(button('编辑', 'edit'), button('删除', 'delete', 'mes-action mes-danger'));
        } else if (index === context.selectionIndex) {
          content.replaceChildren();
          if (!context.readonly) content.appendChild(rowCheckbox(row, state));
          else content.textContent = String(rowIndex + 1);
        } else {
          content.textContent = row.values[index] || '';
        }
      });
      if (context.addOperation) {
        const cell = tr.insertCell();
        cell.className = 'el-table__cell mes-operations';
        if (!context.readonly && context.selectionIndex < 0) cell.appendChild(rowCheckbox(row, state));
        cell.appendChild(button('详情', 'detail'));
        if (!context.readonly) cell.append(button('编辑', 'edit'), button('删除', 'delete', 'mes-action mes-danger'));
      }
      context.body.appendChild(tr);
    });
    if (!rows.length) {
      const row = context.body.insertRow();
      const cell = row.insertCell();
      cell.colSpan = context.columnCount;
      cell.className = 'mes-empty';
      cell.textContent = '没有符合条件的记录，请调整筛选条件或清空检索。';
    }
    context.table.querySelectorAll('.el-table__empty-block').forEach(element => { element.hidden = true; });
    const total = binding.root.querySelector('.el-pagination__total');
    if (total) total.textContent = `共 ${rows.length} 条`;
    updateSelection(context);
    notify(context, context.message);
  }

  function rowCheckbox(row, state) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'mes-checkbox';
    input.dataset.mesRowCheck = row.id;
    input.checked = state.selected.has(row.id);
    input.setAttribute('aria-label', '选择记录 ' + row.values.find(Boolean));
    return input;
  }

  function updateSelection(context) {
    const ids = (context.visible || []).map(row => row.id);
    if (context.selectAll) {
      context.selectAll.checked = ids.length > 0 && ids.every(id => context.state.selected.has(id));
      context.selectAll.indeterminate = ids.some(id => context.state.selected.has(id)) && !context.selectAll.checked;
    }
    context.bulkButtons.forEach(element => {
      const enabled = context.state.selected.size > 0;
      element.disabled = !enabled;
      element.classList.toggle('is-disabled', !enabled);
      element.setAttribute('aria-disabled', String(!enabled));
    });
    notify(context, context.message);
  }

  function filtersFor(root, context) {
    const filters = [];
    const area = root.querySelector('.search-area');
    if (!area || area.closest(custom)) return filters;
    area.querySelectorAll('.el-select').forEach(original => {
      if (original.closest(custom)) return;
      const label = text(original.querySelector('.el-select__placeholder')) || original.querySelector('input')?.placeholder || '筛选';
      const dateColumn = /time-field-select/.test(original.className);
      const column = columnFor(label, context.state.headers);
      const select = document.createElement('select');
      select.className = 'mes-filter mes-native-select';
      select.setAttribute('aria-label', label);
      select.dataset.mesLabel = label;
      select.style.width = original.style.width;
      if (dateColumn) {
        context.state.headers.filter(header => /日期|时间/.test(header)).forEach(header => select.add(new Option(header, header)));
      } else {
        select.add(new Option('全部' + label, ''));
        [...new Set(context.state.rows.map(row => row.values[column]).filter(Boolean))].forEach(value => select.add(new Option(value, value)));
      }
      original.replaceWith(select);
      filters.push({ element: select, label, column, kind: dateColumn ? 'dateColumn' : 'select' });
    });
    area.querySelectorAll('input:not([type="checkbox"]),textarea').forEach(element => {
      if (element.closest(custom) || element.closest('.el-select')) return;
      const item = element.closest('.search-item') || element.parentElement;
      const directLabel = Array.from(item.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').replace(/[:：]/g, '').trim();
      const label = text(item.querySelector('.search-item-label')) || directLabel || element.placeholder || '关键词';
      const kind = /开始日期|开始时间/.test(label) ? 'start' : /结束日期|结束时间/.test(label) ? 'end' : 'text';
      element.removeAttribute('readonly');
      ['role', 'aria-controls', 'aria-haspopup', 'aria-expanded', 'aria-activedescendant', 'aria-autocomplete'].forEach(name => element.removeAttribute(name));
      element.setAttribute('aria-label', label);
      if (kind !== 'text') element.type = 'date';
      filters.push({ element, label, column: columnFor(label, context.state.headers), kind });
    });
    filters.sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    filters.forEach((filter, index) => {
      filter.element.value = context.state.draft?.[index] || (filter.kind === 'dateColumn' ? filter.element.options[0]?.value || '' : '');
    });
    return filters;
  }

  function dialog(context, binding, opener, title, build) {
    if (activeDialog) activeDialog.close();
    const modal = document.createElement('dialog');
    const returnRowId = opener?.closest('[data-mes-row]')?.dataset.mesRow;
    const returnAction = opener ? identify(opener) : '';
    modal.className = 'mes-dialog';
    const heading = document.createElement('h2');
    heading.id = 'mes-dialog-title';
    heading.textContent = title;
    modal.setAttribute('aria-labelledby', heading.id);
    const header = document.createElement('header');
    const close = button('×', 'close', 'mes-dialog-close');
    close.setAttribute('aria-label', '关闭对话框');
    close.addEventListener('click', () => modal.close());
    header.append(heading, close);
    const note = document.createElement('p');
    note.className = 'mes-dialog-note';
    note.textContent = '离线交互 · 修改仅保留在本页会话，不写入生产系统。';
    modal.append(header, note);
    build(modal);
    document.body.appendChild(modal);
    activeDialog = modal;
    modal.addEventListener('click', event => {
      if (event.target !== modal) return;
      const rect = modal.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
    });
    modal.addEventListener('close', () => {
      if (activeDialog === modal) activeDialog = null;
      modal.remove();
      const replacement = returnRowId ? binding.root.querySelector(`[data-mes-row="${returnRowId}"] [data-mes-action="${returnAction}"]`) : null;
      (opener?.isConnected ? opener : replacement || binding.root.querySelector('.mes-local-toolbar button,.hy-toolbar button,.button-area button'))?.focus();
    });
    modal.showModal();
    (modal.querySelector('input:not([readonly]),textarea:not([readonly]),select') || modal.querySelector('button'))?.focus();
  }

  function editRow(context, binding, row, mode, opener) {
    const labels = context.state.headers;
    const detail = mode === 'detail';
    dialog(context, binding, opener, `${mode === 'add' ? '新增' : detail ? '记录详情' : '编辑'} · ${context.page}`, modal => {
      const form = document.createElement('form');
      form.className = 'mes-form';
      const grid = document.createElement('div');
      grid.className = 'mes-field-grid';
      const controls = [];
      const dataColumns = labels.map((label, index) => ({ label, index })).filter(item => item.label && item.label !== '操作' && item.index !== context.selectionIndex);
      dataColumns.forEach(({ label, index }, position) => {
        const field = document.createElement('label');
        const caption = document.createElement('span');
        const required = position === 0;
        caption.textContent = label + (!detail && required ? ' *' : '');
        const input = document.createElement(/备注|说明/.test(label) ? 'textarea' : 'input');
        input.value = row ? row.values[index] || '' : '';
        input.required = !detail && required;
        input.readOnly = detail;
        input.maxLength = /备注|说明/.test(label) ? 1000 : 160;
        input.name = 'column-' + index;
        input.setAttribute('aria-label', label);
        if (/数量|产量/.test(label) && (!input.value || /^\d+(\.\d+)?$/.test(input.value))) {
          input.type = 'number';
          input.min = '0';
          input.step = '1';
        }
        if (required && !detail) input.addEventListener('input', () => input.setCustomValidity(input.value.trim() ? '' : '请填写' + label));
        field.append(caption, input);
        grid.appendChild(field);
        controls.push({ input, index });
      });
      const actions = document.createElement('div');
      actions.className = 'mes-dialog-actions';
      const cancel = button(detail ? '关闭' : '取消', 'close');
      cancel.addEventListener('click', () => modal.close());
      actions.appendChild(cancel);
      if (!detail) {
        const save = button('保存到本页', 'save', 'mes-primary');
        save.type = 'submit';
        actions.appendChild(save);
      }
      form.append(grid, actions);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!controls[0].input.value.trim()) {
          controls[0].input.setCustomValidity('请填写' + labels[controls[0].index]);
          controls[0].input.reportValidity();
          return;
        }
        const values = row ? row.values.slice() : labels.map(() => '');
        controls.forEach(({ input, index }) => { values[index] = input.value.trim(); });
        if (row && JSON.stringify(values) === JSON.stringify(row.values)) {
          notify(context, '未修改任何字段');
        } else {
          if (row) row.values = values;
          else context.state.rows.push({ id: String(nextId++), values });
          refreshOptions(binding);
          context.message = mode === 'add' ? '已新增 1 条本地记录' : '已保存本地修改';
          render(context, binding);
        }
        modal.close();
      });
      modal.appendChild(form);
    });
  }

  function deleteRows(context, binding, rows, opener) {
    if (!rows.length) { notify(context, '请先勾选要删除的记录'); return; }
    dialog(context, binding, opener, '确认删除本地记录', modal => {
      const message = document.createElement('p');
      message.className = 'mes-confirm-text';
      message.textContent = `将从本页移除 ${rows.length} 条记录。此操作只影响本地演示数据。`;
      const actions = document.createElement('div');
      actions.className = 'mes-dialog-actions';
      const cancel = button('取消', 'close');
      cancel.addEventListener('click', () => modal.close());
      const confirm = button('确认删除', 'confirm', 'mes-danger-button');
      confirm.addEventListener('click', () => {
        const ids = new Set(rows.map(row => row.id));
        context.state.rows = context.state.rows.filter(row => !ids.has(row.id));
        ids.forEach(id => context.state.selected.delete(id));
        refreshOptions(binding);
        context.message = `已删除 ${ids.size} 条本地记录`;
        render(context, binding);
        modal.close();
      });
      actions.append(cancel, confirm);
      modal.append(message, actions);
    });
  }

  function exportRows(context) {
    const rows = context.visible;
    if (!rows.length) { notify(context, '当前没有可导出的记录'); return; }
    const columns = context.state.headers.map((label, index) => ({ label, index })).filter(item => item.label && item.label !== '操作');
    const quote = value => '"' + String(value || '').replace(/^[=+\-@]/, "'$&").replace(/"/g, '""') + '"';
    const csv = [columns.map(column => quote(column.label)).join(','), ...rows.map(row => columns.map(column => quote(row.values[column.index])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${context.system}-${context.page}-本地数据.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(context, `已导出当前 ${rows.length} 条记录为 CSV`);
  }

  function restoreRows(context, binding, opener) {
    dialog(context, binding, opener, '恢复本页示例数据', modal => {
      const message = document.createElement('p');
      message.className = 'mes-confirm-text';
      message.textContent = `恢复本页最初的 ${context.state.initial.length} 条示例，并清空本页筛选及勾选。当前页的新增、编辑与删除将被撤销，其他页面保持不变。`;
      const actions = document.createElement('div');
      actions.className = 'mes-dialog-actions';
      const cancel = button('取消', 'close');
      cancel.addEventListener('click', () => modal.close());
      const confirm = button('确认恢复', 'confirm', 'mes-primary');
      confirm.addEventListener('click', () => {
        context.state.rows = context.state.initial.map(row => ({ id: row.id, values: row.values.slice() }));
        context.state.selected.clear();
        binding.filters.forEach(filter => { filter.element.value = filter.kind === 'dateColumn' ? filter.element.options[0]?.value || '' : ''; filter.element.setCustomValidity(''); });
        readFilters(binding);
        refreshOptions(binding);
        context.message = '已恢复本页初始示例';
        render(context, binding);
        modal.close();
      });
      actions.append(cancel, confirm);
      modal.append(message, actions);
    });
  }

  function explain(context, binding, opener) {
    const label = text(opener) || '此操作';
    dialog(context, binding, opener, label + ' · 功能说明', modal => {
      const message = document.createElement('p');
      message.className = 'mes-confirm-text';
      message.textContent = '此入口需要实际系统或原业务服务，本地演示未执行该操作。可在当前列表中体验筛选、查看详情、编辑记录与 CSV 导出；需要撤销本页修改时，请使用“恢复示例”。';
      const actions = document.createElement('div');
      actions.className = 'mes-dialog-actions';
      const close = button('知道了', 'close');
      close.addEventListener('click', () => modal.close());
      actions.appendChild(close);
      modal.append(message, actions);
    });
  }

  function identify(element) {
    if (element.dataset.mesAction) return element.dataset.mesAction;
    const label = text(element).replace(/\s/g, '');
    if (/^(检索|查询|搜索)$/.test(label)) return 'search';
    if (/^(清空|重置)$/.test(label)) return 'reset';
    if (/^刷新$/.test(label)) return 'refresh';
    if (/^(新增|添加)/.test(label)) return 'add';
    if (/^(编辑|修改)/.test(label)) return 'edit';
    if (/^(详情|查看)/.test(label)) return 'detail';
    if (/批量删除/.test(label)) return 'bulk-delete';
    if (/^删除$/.test(label)) return 'delete';
    if (/导出/.test(label)) return 'export';
    return '';
  }

  function bindRoot(root) {
    root.addEventListener('input', event => {
      if (!event.target.closest(custom)) saveFilters(roots.get(root));
    });
    root.addEventListener('change', event => {
      if (event.target.closest(custom)) return;
      const binding = roots.get(root);
      const checkbox = event.target.closest('[data-mes-row-check],[data-mes-all]');
      if (!checkbox) { saveFilters(binding); return; }
      const context = binding.contexts.find(item => item.table.contains(checkbox));
      if (!context) return;
      const ids = checkbox.hasAttribute('data-mes-all') ? context.visible.map(row => row.id) : [checkbox.dataset.mesRowCheck];
      ids.forEach(id => checkbox.checked ? context.state.selected.add(id) : context.state.selected.delete(id));
      context.table.querySelectorAll('[data-mes-row-check]').forEach(input => { input.checked = context.state.selected.has(input.dataset.mesRowCheck); });
      updateSelection(context);
    });
    root.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.target.closest(custom) || !event.target.closest('.search-area')) return;
      event.preventDefault();
      const binding = roots.get(root);
      if (binding.contexts.length && readFilters(binding)) binding.contexts.forEach(context => { context.message = '筛选已更新'; render(context, binding); });
    });
    root.addEventListener('click', event => {
      if (event.target.closest(custom)) return;
      const element = event.target.closest('button,.el-button');
      const binding = roots.get(root);
      if (!element || element.closest('.demo-guide,.demo-scenarios,.quick-access-grid')) return;
      if (!binding.contexts.length) {
        if (!text(element)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        explain({ page: binding.page }, binding, element);
        return;
      }
      const context = binding.contexts.find(item => item.table.contains(element)) || binding.contexts[0];
      const action = identify(element);
      if (!action) {
        if (!text(element) || element.closest('.el-pagination')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        explain(context, binding, element);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const row = context.state.rows.find(item => item.id === element.closest('[data-mes-row]')?.dataset.mesRow);
      if (action === 'search') {
        if (readFilters(binding)) binding.contexts.forEach(item => { item.message = '筛选已更新'; render(item, binding); });
      } else if (action === 'reset') {
        binding.filters.forEach(filter => { filter.element.value = filter.kind === 'dateColumn' ? filter.element.options[0]?.value || '' : ''; filter.element.setCustomValidity(''); });
        readFilters(binding);
        binding.contexts.forEach(item => { item.message = '已清空筛选'; render(item, binding); });
      } else if (action === 'refresh') {
        context.message = '已刷新本地记录'; render(context, binding);
      } else if (action === 'add') editRow(context, binding, null, 'add', element);
      else if (action === 'edit' || action === 'detail') { if (row) editRow(context, binding, row, action, element); else explain(context, binding, element); }
      else if (action === 'delete') { if (row) deleteRows(context, binding, [row], element); }
      else if (action === 'bulk-delete') deleteRows(context, binding, context.state.rows.filter(item => context.state.selected.has(item.id)), element);
      else if (action === 'export') exportRows(context);
      else if (action === 'restore') restoreRows(context, binding, element);
    }, true);
  }

  function init(root, options) {
    if (!root) return;
    const system = options.system;
    const page = options.page;
    const previous = roots.get(root);
    if (previous?.page === page && previous.contexts[0]?.table.isConnected) return;
    if (activeDialog) activeDialog.close();
    const binding = { root, system, page, contexts: [], filters: [] };
    roots.set(root, binding);
    if (!previous) bindRoot(root);
    root.querySelectorAll('.el-table').forEach((table, tableIndex) => {
      if (table.closest(custom) || table.parentElement.closest('.el-table')) return;
      const body = table.querySelector('.el-table__body-wrapper tbody') || table.querySelector('tbody');
      const headerRow = table.querySelector('.el-table__header-wrapper thead tr:last-child') || table.querySelector('thead tr:last-child');
      if (!body || !headerRow || !body.querySelector('tr')) return;
      const key = system + ':' + page + ':' + tableIndex;
      let state = pages.get(key);
      if (!state) {
        const headers = Array.from(headerRow.cells, cell => text(cell));
        state = { headers, template: body.querySelector('tr').cloneNode(true), rows: Array.from(body.querySelectorAll('tr')).map(row => ({ id: String(nextId++), values: Array.from(row.cells, cell => text(cell)) })), selected: new Set(), draft: [], applied: [] };
        state.initial = state.rows.map(row => ({ id: row.id, values: row.values.slice() }));
        pages.set(key, state);
      }
      const operationIndex = state.headers.findIndex(label => label === '操作');
      const selectionIndex = state.headers.findIndex(label => !label);
      const readonly = ['螺栓数据', '泄漏数据', '压装数据', '质量数据'].includes(page);
      const context = { table, body, state, system, page, readonly, operationIndex, selectionIndex, addOperation: operationIndex < 0, columnCount: state.headers.length + (operationIndex < 0 ? 1 : 0), bulkButtons: [], message: '' };
      table.classList.add('mes-interactive-table');
      let operationHeader = headerRow.cells[operationIndex];
      if (operationIndex < 0) {
        operationHeader = document.createElement('th');
        operationHeader.className = 'el-table__cell mes-operations';
        operationHeader.textContent = '操作';
        headerRow.appendChild(operationHeader);
        table.querySelectorAll('colgroup').forEach(group => {
          const width = readonly ? 90 : 170;
          const col = document.createElement('col'); col.width = String(width); group.appendChild(col);
          const owner = group.closest('table');
          const oldWidth = parseFloat(owner.style.width);
          if (Number.isFinite(oldWidth)) owner.style.width = oldWidth + width + 'px';
        });
      }
      operationHeader.classList.add('mes-operations');
      const bodyScroller = table.querySelector('.el-table__body-wrapper .el-scrollbar__wrap');
      const headerWrapper = table.querySelector('.el-table__header-wrapper');
      if (bodyScroller && headerWrapper) {
        bodyScroller.addEventListener('scroll', () => { headerWrapper.scrollLeft = bodyScroller.scrollLeft; }, { passive: true });
      }
      const selectionHeader = selectionIndex >= 0 ? headerRow.cells[selectionIndex] : operationHeader;
      const selectAll = document.createElement('input');
      selectAll.type = 'checkbox';
      selectAll.className = 'mes-checkbox';
      selectAll.dataset.mesAll = 'true';
      selectAll.setAttribute('aria-label', '选择当前筛选结果中的全部记录');
      if (!readonly) {
        if (selectionIndex >= 0) selectionHeader.replaceChildren(selectAll);
        else selectionHeader.prepend(selectAll);
        context.selectAll = selectAll;
      } else if (selectionIndex >= 0) {
        selectionHeader.textContent = '序号';
      }
      const status = document.createElement('div');
      status.className = 'mes-list-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      table.before(status);
      context.status = status;
      binding.contexts.push(context);
    });
    if (!binding.contexts.length) return;
    binding.filters = filtersFor(root, binding.contexts[0]);
    const first = binding.contexts[0];
    const existingButtons = Array.from(root.querySelectorAll('button')).filter(element => !element.closest('.el-table,' + custom));
    existingButtons.forEach(element => {
      const action = identify(element);
      if (!action) return;
      if (element.style.display === 'none') element.style.display = '';
      if (action === 'bulk-delete') first.bulkButtons.push(element);
    });
    let toolbar = root.querySelector('.hy-toolbar,.button-area,.action-controls');
    if (!toolbar || toolbar.closest(custom)) {
      toolbar = document.createElement('div');
      toolbar.className = 'mes-local-toolbar';
      first.status.before(toolbar);
    }
    (first.readonly ? ['export'] : ['add', 'bulk-delete', 'export', 'restore']).forEach(action => {
      if (existingButtons.some(element => identify(element) === action)) return;
      const element = button({ add: '新增', 'bulk-delete': '批量删除', export: '导出 CSV', restore: '恢复示例' }[action], action);
      toolbar.appendChild(element);
      if (action === 'bulk-delete') first.bulkButtons.push(element);
    });
    binding.contexts.forEach(context => render(context, binding));
  }

  window.MesInteractions = { init };
})();
