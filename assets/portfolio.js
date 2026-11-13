'use strict';

const PROJECTS = {
  da: {
    number: '01', code: 'A', title: '发动机装配 MES', english: 'Manufacturing / Engine Assembly',
    category: '发动机制造', position: '制造执行与质量追溯', origin: '企业项目 · 代号 A',
    summary: '面向发动机装配场景，覆盖安灯异常、质量门校验、工艺配置与生产统计，并整合多源装配数据，连接现场执行与质量追溯。',
    image: 'assets/da-preview.jpg', demo: 'mes/demo.html', next: 'hl',
    scenes: [
      { title: '质量门校验', description: '从检验记录进入工位与条码追溯。', target: '质量检验' },
      { title: '安灯异常管理', description: '查看异常类型、处理状态与通知配置。', target: '安灯基础' },
      { title: '螺栓拧紧数据', description: '查看装配记录中的扭矩与角度信息。', target: '螺栓数据' }
    ],
    statementTitle: '提交完成后，再发出通知。',
    statement: '安灯事件通过事务提交后监听触发异步通知。钉钉与音柱调用分别处理，音柱提供并发发送与超时重试，减少外部通知对业务主流程的影响。',
    flow: '异常建单 → 事务提交 → 异步通知 → 处理与关闭',
    implementations: [
      ['质量门逐项校验', '按质量门查找下属工位，结合机型与条码定位拧紧记录，比较单颗螺栓扭矩、角度的上下限，并保存验证结果。'],
      ['多源装配数据归集', '读取第三方 SQL Server 待同步数据，映射控制器与工位后写入业务库，更新同步状态；不同来源的数据服务于统一追溯。'],
      ['生产统计历史固化', '定时统计缸体、缸盖小时上线量与日合格率，持久化历史结果，为趋势分析与报表提供数据。']
    ],
    architecture: [['INTERFACE', 'Vue 3 / 业务界面'], ['APPLICATION', '业务服务 / 异步事件 / 定时统计'], ['DATA', 'MySQL / SQL Server / Oracle']],
    stack: ['Vue 3', 'TypeScript', 'Element Plus', 'Spring Boot 2.7', 'MyBatis-Plus', '动态多数据源', 'Redis', 'FreeMarker'],
    boundary: '列表筛选、编辑、删除与导出仅作用于本次演示数据，刷新页面后恢复，不连接生产系统。工艺配置与可视化规则编辑为不同模块，WebSocket 用于会话通知。'
  },
  hl: {
    number: '02', code: 'B', title: '零部件制造 MES', english: 'Manufacturing / System Integration',
    category: '零部件制造', position: '生产执行与现场集成', origin: '企业项目 · 代号 B',
    summary: '面向零部件制造场景，围绕生产计划、物料与料箱组织业务，对接外部仓储和激光打标设备，并提供小时产量统计与质量管理。',
    image: 'assets/hl-preview.jpg', demo: 'mes/demo-hl.html', next: 'hmdp',
    scenes: [
      { title: '生产计划协同', description: '查看计划、物料与生产编码相关界面。', target: '生产计划' },
      { title: '物料配置', description: '了解生产业务中的物料配置关系。', target: '物料配置' },
      { title: '小时产量分析', description: '体验按小时展示的离线示例图表。', target: '小时产量' }
    ],
    statementTitle: '让业务系统，连接制造现场。',
    statement: '生产计划通过外部 WMS 接口校验物料；激光设备使用 TCP Socket 通信，按协议组织指令、传输数据并解析应答。业务接口与设备协议各自承担明确职责。',
    flow: '生产计划 → WMS 物料校验 → 产品编码与排程',
    implementations: [
      ['生产计划与外部 WMS 联动', '下发前校验两类物料库存，处理接口超时并记录调用日志。WMS 是外部系统，由 MES 对接相关业务接口。'],
      ['激光设备 TCP 协议对接', '通过 Socket 建连，使用 STX / ETX 组织协议帧，提供模板初始化、打标数据发送与指令应答解析。'],
      ['物料绑定与小时统计', '维护料箱批次、数量与供应商信息；按机型、日期和小时聚合生产数据，支持产出分布查看。']
    ],
    architecture: [['INTERFACE', 'Vue 3 / 计划与物料界面'], ['APPLICATION', 'MES 业务服务 / 接口日志'], ['INTEGRATION', '外部 WMS API / 激光 TCP']],
    stack: ['Vue 3', 'TypeScript', 'Element Plus', 'Spring Boot 2.7', 'MyBatis-Plus', 'WMS 接口', 'TCP Socket', 'ECharts'],
    boundary: '图表使用确定性的离线示例数据。OPC UA 部分展示客户端与采集点配置管理；激光对接采用 TCP 协议。预览不包含设备或仓储系统的实时连接。'
  },
  hmdp: {
    number: '03', code: 'HMDP', title: 'AI 本地生活系统', english: 'AI Application / Local Life',
    category: 'AI 与本地生活', position: '技能配置与业务工具接入', origin: '基于开源点评项目扩展',
    summary: '基于本地生活项目扩展 AI 能力，将店铺、优惠券等业务接入智能客服，提供可配置技能、流式回复与 MCP 工具接口。',
    image: 'assets/ai-preview.jpg', demo: 'ai/demo.html', next: 'da',
    scenes: [
      { title: '评价内容总结', description: '查看输入表单与预设评价总结样例。', target: 'AI总结店铺评价' },
      { title: '经营日报', description: '体验业务数据到日报草稿的展示流程。', target: 'AI生成经营日报' },
      { title: '优惠券文案', description: '查看优惠力度与人群对应的文案样例。', target: 'AI生成优惠券文案' }
    ],
    statementTitle: '用配置与上下文，组织 AI 能力。',
    statement: '从数据库读取技能与提示词模板，填充用户输入和店铺、优惠券等业务上下文后调用模型。配合用户维度限流、运行记录与失败本地兜底，形成可追踪的调用过程。',
    flow: '技能配置 → 输入与业务上下文 → 模型调用 / 失败兜底 → 运行记录',
    implementations: [
      ['配置化 AI 技能中心', '提供 8 个业务技能，支持模板、启停与排序配置；按用户限流，并保存调用记录。技能中心输出供人工编辑使用的草稿。'],
      ['流式客服与业务工具', 'LangChain4j 客服绑定店铺、优惠券、订单、预约与 AI 技能 5 类工具，通过 Redis 保存按会话隔离的多轮记忆。'],
      ['通过 MCP 提供业务能力', '将店铺、优惠券、订单、预约及 AI 技能等能力暴露为 MCP 工具，供支持该协议的客户端接入。']
    ],
    architecture: [['BUSINESS INPUT', '技能表单 / 客服对话'], ['AI CAPABILITY', 'LangChain4j / 业务工具 / MCP'], ['CONTEXT & STORAGE', 'MySQL / Redis / 模型 API']],
    stack: ['Java 17', 'Spring Boot 3.5', 'LangChain4j', 'MCP SDK', 'MyBatis-Plus', 'MySQL', 'Redis', 'Redisson'],
    boundary: '店铺、优惠券与秒杀等为基础项目能力，重点展示新增 AI 扩展。当前交互仅播放预设样例，不调用实时模型；真实工程还包含 Redis Lua 与 Stream 订单处理。'
  }
};

const homeView = document.getElementById('home-view');
const caseView = document.getElementById('case-view');
const casePanels = new Map();
const MIN_FRAME_HEIGHT = 460;
const FRAME_BOTTOM_GAP = 18;
let activeProject = null;
let routeVersion = 0;

function demoUrl(project, target) {
  const parameter = project.code === 'HMDP' ? 'skill' : 'scene';
  return project.demo + (target ? '?' + parameter + '=' + encodeURIComponent(target) : '');
}

function renderCase(key) {
  casePanels.forEach((panel, panelKey) => { panel.hidden = panelKey !== key; });
  if (casePanels.has(key)) {
    requestAnimationFrame(fitFrame);
    return;
  }
  const project = PROJECTS[key];
  const panel = document.createElement('div');
  panel.className = 'case-panel';
  panel.dataset.project = key;
  panel.innerHTML = `
    <div class="container">
      <div class="workspace-heading">
        <div class="workspace-title"><span class="project-code">${project.code}</span><h1>${project.title}</h1><span class="workspace-badge">离线示例</span></div>
        <div class="workspace-shortcuts" aria-label="常用页面"><span>常用</span>${project.scenes.map((scene, index) => `<button data-scene="${index}">${scene.title}</button>`).join('')}</div>
      </div>
      <section aria-label="${project.title}界面导览">
        <div class="case-demo-shell">
          <div class="demo-stage"></div>
        </div>
      </section>
      <details class="case-notes"><summary>项目说明与技术实现<span>展开</span></summary><p class="case-lead">${project.summary}</p>
      <section class="case-section" aria-labelledby="implementation-${key}">
        <div class="case-section-head"><div><p class="section-kicker">BEHIND THE INTERFACE / ENGINEERING</p><h2 id="implementation-${key}">关键实现，展开来看。</h2></div><p>从具体业务出发，理解技术选择与处理方式。</p></div>
        <div class="case-implementation"><div class="implementation-statement"><span class="small-label">A CLOSER LOOK / ${project.code}</span><h3>${project.statementTitle}</h3><p>${project.statement}</p><div class="flow-line">${project.flow}</div></div><ol class="implementation-list">${project.implementations.map((item, index) => `<li><span class="impl-num">0${index + 1}</span><div><h3>${item[0]}</h3><p>${item[1]}</p></div></li>`).join('')}</ol></div>
        <div class="architecture"><div class="architecture-caption">SYSTEM CONNECTIONS / 系统关系</div><div class="architecture-flow">${project.architecture.map((item, index) => `${index ? '<span class="architecture-arrow" aria-hidden="true">→</span>' : ''}<div class="architecture-node"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join('')}</div></div>
        <details class="tech-details"><summary>技术栈与组件 <span>${project.stack.length} 项</span></summary><div class="tech-tags">${project.stack.map(item => `<span>${item}</span>`).join('')}</div></details>
        <p class="case-boundary">展示说明 / ${project.boundary}</p>
      </section>
      </details>
    </div>`;

  caseView.appendChild(panel);
  casePanels.set(key, panel);
  panel.querySelectorAll('[data-scene]').forEach(button => {
    button.addEventListener('click', () => {
      const scene = project.scenes[Number(button.dataset.scene)];
      panel.querySelectorAll('[data-scene]').forEach(item => item.classList.toggle('is-active', item === button));
      startDemo(key, scene.target);
      panel.querySelector('.case-demo-shell').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  });
  panel.querySelector('[data-scene="0"]').classList.add('is-active');
  startDemo(key, project.scenes[0].target);
}

function fitFrame() {
  const panel = casePanels.get(activeProject);
  if (!panel || caseView.hidden) return;
  const wrap = panel.querySelector('.live-wrap');
  const scaler = panel.querySelector('.live-scaler');
  const frame = panel.querySelector('.live-frame');
  if (!wrap || !scaler || wrap.clientWidth === 0) return;
  const width = wrap.clientWidth;
  const height = Math.max(MIN_FRAME_HEIGHT, window.innerHeight - wrap.getBoundingClientRect().top - FRAME_BOTTOM_GAP);
  frame.style.width = width + 'px';
  frame.style.height = height + 'px';
  scaler.style.width = width + 'px';
  scaler.style.height = height + 'px';
  scaler.style.transform = 'none';
  wrap.style.height = Math.round(height) + 'px';
}

function sendScene(frame, target) {
  const origin = location.protocol === 'file:' ? '*' : location.origin;
  frame.contentWindow.postMessage({ type: 'portfolio:scene', target }, origin);
}

function startDemo(key, target) {
  const project = PROJECTS[key];
  const panel = casePanels.get(key);
  const existing = panel.querySelector('.live-frame');
  if (existing) {
    if (target) {
      existing.dataset.target = target;
      if (existing.dataset.ready === 'true') sendScene(existing, target);
      else existing.dataset.pendingScene = target;
    }
    return;
  }
  const stage = panel.querySelector('.demo-stage');
  stage.innerHTML = '<div class="live-wrap"><div class="live-scaler"></div><div class="demo-loading" role="status">正在打开离线演示…</div></div>';
  const frame = document.createElement('iframe');
  frame.id = 'live-frame-' + key;
  frame.className = 'live-frame';
  frame.title = project.title + '离线交互演示';
  frame.dataset.target = target || '';
  frame.addEventListener('load', () => {
    if (!frame.isConnected) return;
    frame.dataset.ready = 'true';
    stage.querySelector('.demo-loading')?.remove();
    if (frame.dataset.pendingScene) {
      sendScene(frame, frame.dataset.pendingScene);
      delete frame.dataset.pendingScene;
    }
    fitFrame();
  });
  frame.src = demoUrl(project, target);
  stage.querySelector('.live-scaler').appendChild(frame);
  fitFrame();
}

function route() {
  const version = ++routeVersion;
  const hash = location.hash.slice(1) || 'home';
  activeProject = PROJECTS[hash] ? hash : null;
  homeView.hidden = Boolean(activeProject);
  caseView.hidden = !activeProject;
  document.body.classList.toggle('is-case', Boolean(activeProject));
  document.querySelectorAll('[data-view]').forEach(item => {
    const selected = item.dataset.view === (activeProject || 'home');
    item.classList.toggle('is-active', selected);
    if (selected) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  const headerLink = document.querySelector('.header-link');
  headerLink.href = activeProject ? PROJECTS[activeProject].demo : '#work';
  headerLink.innerHTML = (activeProject ? '独立窗口演示' : '项目索引') + ' <span aria-hidden="true">↗</span>';
  if (activeProject) {
    headerLink.target = '_blank';
    headerLink.rel = 'noopener';
  } else {
    headerLink.removeAttribute('target');
    headerLink.removeAttribute('rel');
  }
  if (activeProject) {
    renderCase(activeProject);
    document.title = PROJECTS[activeProject].title + ' — 项目作品集';
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    document.title = '项目作品集 — 制造业 MES 与 AI 应用';
    requestAnimationFrame(() => {
      if (version !== routeVersion) return;
      if (hash === 'home' || !document.getElementById(hash)) window.scrollTo({ top: 0, behavior: 'instant' });
      else document.getElementById(hash).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-category]').forEach(card => {
      card.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== card.dataset.category;
    });
  });
});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

function updateHeader() {
  document.querySelector('.site-header').classList.toggle('is-scrolled', scrollY > 8);
}

document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor?.classList.contains('skip-link')) {
    event.preventDefault();
    document.getElementById('main').focus({ preventScroll: true });
    document.getElementById('main').scrollIntoView({ block: 'start' });
    return;
  }
  if (anchor && anchor.getAttribute('href') === location.hash) {
    event.preventDefault();
    route();
  }
});
window.addEventListener('hashchange', route);
window.addEventListener('resize', fitFrame);
const projectTabs = Array.from(document.querySelectorAll('[data-view]'));
projectTabs.forEach((tab, index) => {
  tab.addEventListener('keydown', event => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const nextTab = projectTabs[(index + direction + projectTabs.length) % projectTabs.length];
    nextTab.focus();
    location.hash = nextTab.dataset.view;
  });
});
if ('ResizeObserver' in window) new ResizeObserver(fitFrame).observe(caseView);
window.addEventListener('scroll', updateHeader, { passive: true });
route();
updateHeader();
