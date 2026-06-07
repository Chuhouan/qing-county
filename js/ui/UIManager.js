/**
 * UIManager - UI总管理器（重构版）
 * 交互式UI：点击事件卡片、实时日志、可交互仪表盘
 */
class UIManager {
  constructor() {
    this.currentView = 'office';
    this._eventLog = [];
    this._maxLogEntries = 200;
    this._prevTension = null;
    this.aiSecretary = new AISecretary();
    this._factionFilter = null; // 派系视图的山头过滤器
    this._notificationLog = []; // 所有UI通知队列（季度内持久）
    this._narrativeTickerText = null; // 秘书叙事跑马灯暂存
  }

  init() {
    this._createLayout();
    this._setupEventListeners();
    this._setupNavigation();
    this.aiSecretary.init();
    // 恢复主题偏好
    var savedTheme = localStorage.getItem('xianzhi_theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      var btn = document.getElementById('btn-theme');
      if (btn) btn.textContent = '☀️';
    }
  }

  _createLayout() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div id="top-bar">
        <div id="tb-left">
          <div id="game-title">青县</div>
          <div id="tb-date">--</div>
        </div>
        <div id="tb-center">
          <span id="tb-week">第0周</span>
          <div id="tb-term-bar"><div id="tb-term-fill"></div></div>
        </div>
        <div id="tb-right">
          <nav id="top-nav">
            <span class="nav-group-label">治理</span>
            <button class="nav-btn active" data-view="office">📋办公</button>
            <button class="nav-btn" data-view="committee">🏛常委会</button>
            <button class="nav-btn" data-view="npc">🏛人大</button>
            <span class="nav-group-label">发展</span>
            <button class="nav-btn" data-view="map">🗺地图</button>
            <button class="nav-btn" data-view="personnel">👥人事</button>
            <button class="nav-btn" data-view="social">👥社会</button>
            <button class="nav-btn" data-view="economy">📈经济</button>
            <button class="nav-btn" data-view="superior">⭐上级</button>
            <button class="nav-btn" data-view="data">📊总览</button>
            <span class="nav-group-label">事务</span>
            <button class="nav-btn" data-view="tasks">🎯任务</button>
            <button class="nav-btn" data-view="talent">🧑‍💼人才</button>
            <button class="nav-btn" data-view="manual">📖百科</button>
            <span class="nav-group-label">信息</span>
            <button class="nav-btn" data-view="faction">🔗关系</button>
            <button class="nav-btn" data-view="inspection">🔍巡视</button>
            <button class="nav-btn" data-view="eventlog">📜日志</button>
          </nav>
          <span class="nav-sep"></span>
          <button id="btn-save" class="btn-small" title="存档">💾存档</button>
          <button id="btn-load" class="btn-small" title="读档">📂读档</button>
          <button id="btn-changelog" class="btn-small" title="更新历史">📋更新</button>
          <button id="btn-theme" class="btn-small" title="切换主题" onclick="uiManager._toggleTheme()">🌙主题</button>
        </div>
      </div>
      <div id="main-area">
        <div id="left-status">
          <div id="portrait-area">
            <div id="portrait-icon">👤</div>
            <div id="portrait-name">县长</div>
            <div id="portrait-role">县委书记</div>
          </div>
          <div id="status-bars">
            <div class="st-bar" data-term="socialTension"><span class="st-icon">🏘</span><span class="st-lbl">稳定</span><div class="st-track"><div class="st-fill" id="st-stability"></div></div><span class="st-val" id="st-stability-val">-</span></div>
            <div class="st-bar" data-term="gdpGrowth"><span class="st-icon">📈</span><span class="st-lbl">经济</span><div class="st-track"><div class="st-fill" id="st-economic"></div></div><span class="st-val" id="st-economic-val">-</span></div>
            <div class="st-bar" data-term="superiorTrust"><span class="st-icon">⭐</span><span class="st-lbl">上级</span><div class="st-track"><div class="st-fill" id="st-superior"></div></div><span class="st-val" id="st-superior-val">-</span></div>
            <div class="st-bar" data-term="energy"><span class="st-icon">⚡</span><span class="st-lbl">精力</span><div class="st-track"><div class="st-fill" id="st-energy"></div></div><span class="st-val" id="st-energy-val">-</span></div>
          </div>
          <div id="status-stats">
            <div class="st-stat" data-term="politicalCapital"><span>🏛 政治资本</span><span id="st-pcap">20</span></div>
            <div class="st-stat" data-term="treasuryBalance"><span>💰 国库</span><span id="st-treasury">-</span></div>
            <div class="st-stat" data-term="corruptionIndex"><span>⚠️ 腐败</span><span id="st-corruption" style="color:var(--accent-red);cursor:pointer;" onclick="uiManager._showCorruptionPanel()">0</span></div>
            <div class="st-stat" data-term=""><span>🎯 本周关注</span><span id="st-focus">未选</span></div>
          </div>
          <div id="traits-display"></div>
          <div class="quick-actions">
            <button class="qa-btn" data-action="meeting" title="召开会议" data-term="actionMeeting">🏛 会议</button>
            <button class="qa-btn" data-action="files" title="批阅文件" data-term="actionFiles">📄 文件</button>
            <button class="qa-btn" data-action="inspect" title="下乡调研" data-term="actionInspect">🚗 调研</button>
            <button class="qa-btn" data-action="talk" title="干部谈话" data-term="actionTalk">💬 谈话</button>
            <button class="qa-btn" data-action="superior" title="跑上级" data-term="actionSuperior">⭐ 上级</button>
            <button class="qa-btn" data-action="petition" title="信访" data-term="actionPetition">✉️ 信访</button>
          </div>
        </div>
        <div id="center-office">
          <div id="co-top">
            <div id="co-priority">
              <div class="co-section-header">📋 今日重点事务</div>
              <div id="co-priority-list"></div>
            </div>
            <div id="co-actions">
              <button id="btn-advance" class="btn-advance" data-term="advanceWeek">
                ⏩ 结束回合
                <span class="btn-advance-hint" id="advance-hint">第0周</span>
              </button>
            </div>
          </div>
          <div id="co-views">
            <div id="view-container">
              <div id="view-office" class="view-panel active"></div>
              <div id="view-committee" class="view-panel"></div>
              <div id="view-map" class="view-panel"></div>
              <div id="view-personnel" class="view-panel"></div>
              <div id="view-data" class="view-panel"></div>
              <div id="view-manual" class="view-panel"></div>
              <div id="view-tasks" class="view-panel"></div>
              <div id="view-eventlog" class="view-panel"></div>
              <div id="view-npc" class="view-panel"></div>
              <div id="view-inspection" class="view-panel"></div>
              <div id="view-talent" class="view-panel"></div>
              <div id="view-faction" class="view-panel"></div>
              <div id="view-social" class="view-panel"></div>
              <div id="view-economy" class="view-panel"></div>
              <div id="view-superior" class="view-panel"></div>
            </div>
          </div>
        </div>
        <div id="right-schedule">
          <div class="co-section-header">📌 待办</div>
          <div id="todo-list"></div>
          <div class="co-section-header mt-12">⚠️ 紧急</div>
          <div id="urgent-list"></div>
          <div class="co-section-header mt-12">📨 最新动态</div>
          <div id="notification-log-list"></div>
        </div>
      </div>
      <div id="bottom-news">
        <div id="news-ticker">
          <span class="ticker-label">📰 晚间新闻</span>
          <span id="ticker-text">欢迎就任县委书记，开启五年任期</span>
        </div>
        <div id="public-letters">
          <span class="ticker-label">📬 群众来信</span>
          <span id="letter-text">暂无新来信</span>
        </div>
      </div>
      <div id="modal-overlay" class="hidden"></div>
      <div id="ais-float-btn" onclick="uiManager._toggleSecretary()" title="AI秘书">🤖</div>
      <div id="ais-float-panel">
        <div id="ais-fp-header" onclick="uiManager._toggleSecretary()">
          <span>🤖 AI 秘书</span>
          <span id="ais-fp-toggle">✕</span>
        </div>
        <div id="ais-fp-body">
          <div id="ais-messages"></div>
          <div class="ais-suggestions" id="ais-suggestions"></div>
          <div class="ais-input-row">
            <input type="text" id="ais-input" placeholder="问秘书…" maxlength="120" />
            <button id="ais-send" title="发送">➤</button>
          </div>
        </div>
      </div>
      <div id="tooltip-container" class="hidden"></div>
      <div id="notification-toast-container"></div>
    `;
  }

  _setupEventListeners() {
    // 导航（顶部 + 内嵌选项卡）
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });
    // 推进时间
    document.getElementById('btn-advance')?.addEventListener('click', () => {
      gameEngine.advance();
    });

    // 快速操作（左栏底部）
    document.querySelectorAll('.qa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const player = stateManager.get('player');
        const county = stateManager.get('county');
        if (!player) return;

        const actions = {
          meeting: { label: '召开会议', energyCost: 15, stressChange: 3, effect: () => {
            const iq = gameEngine._traitModifiers?.infoQuality || 1;
            if (county) county.modifyTension(-1 * iq);
            if (player) player.politicalCapital = Math.min(200, (player.politicalCapital || 20) + 1 * iq);
          }},
          files: { label: '批阅文件', energyCost: 10, stressChange: 1, effect: () => {
            const iq = gameEngine._traitModifiers?.infoQuality || 1;
            if (county) county.modifyTension(-0.5 * iq);
          }},
          inspect: { label: '下乡调研', energyCost: 20, stressChange: -3, effect: () => {
            const iq = gameEngine._traitModifiers?.infoQuality || 1;
            if (county) county.modifyTension(-2 * iq);
            if (county?.economy) county.economy.economicVitality = Math.min(100, (county.economy.economicVitality || 50) + 1 * iq);
          }},
          talk: { label: '干部谈话', energyCost: 12, stressChange: 2, effect: () => {
            // 干部谈话：随机增加1名常委的关系
            const members = gameEngine.getSystem('personnel')?.getCommitteeMembers?.() || [];
            if (members.length > 0) {
              const target = members[Math.floor(Math.random() * members.length)];
              if (target) {
                const oldRel = target.relations?.player || 50;
                target.modifyRelation('player', 3);
                // 记录日志
                if (typeof uiManager !== 'undefined') {
                  uiManager._addEventLog('info', '干部互动',
                    `与${target.name}进行了谈话，关系 ${oldRel}→${target.relations?.player || 53}`);
                }
              }
            }
          }},
        };
        // 上级关系快速跳转
        actions.superior = { label: '跑上级', energyCost: 0, stressChange: 0, effect: () => {
          this.switchView('superior');
        }};
        actions.petition = { label: '信访工作台', energyCost: 0, stressChange: 0, effect: () => {
          this.switchView('petition');
        }};

        const act = actions[action];
        if (!act) return;

        // 精力检查
        if ((player.status.energy || 0) < act.energyCost) {
          this.showToast('⚠️ 精力不足，无法执行此操作！', 'warning');
          return;
        }

        player.modifyStatus('energy', -act.energyCost);
        player.modifyStatus('stress', act.stressChange);
        act.effect();

        this._addEventLog('info', '操作记录', `${act.label} — 精力-${act.energyCost}`);
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'info', title: '操作', message: `${act.label}完成`,
        });
        eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
      });
    });
    // 存档读档（弹窗式）
    document.getElementById('btn-save')?.addEventListener('click', () => { this._showSaveLoadModal('save'); });
    document.getElementById('btn-load')?.addEventListener('click', () => { this._showSaveLoadModal('load'); });

    // 更新历史
    document.getElementById('btn-changelog')?.addEventListener('click', () => {
      this._showChangelog();
    });

    // 悬浮提示系统
    this._initTooltipSystem();
  }

  /** 显示更新历史 */
  _showChangelog() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="width:640px;">
        <div class="mc-header">
          <span class="mc-icon">📋</span>
          <span class="mc-title">《青县》更新历史</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body" style="max-height:70vh;overflow-y:auto;">
          ${CHANGELOG.map(v => `
            <div class="cl-version">
              <div class="cl-header">
                <span class="cl-version-tag">${v.version}</span>
                <span class="cl-date">${v.date}</span>
                <span class="cl-title">${v.title}</span>
              </div>
              <ul class="cl-items">
                ${v.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /** 存读档弹窗（3槽+自动存档+时间戳+数据预览） */
  _showSaveLoadModal(mode) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    var slots = gameEngine.getSaveInfo();
    // 加自动存档
    try {
      var autoRaw = localStorage.getItem('xianzhi_save_auto');
      if (autoRaw) {
        var autoData = JSON.parse(autoRaw);
        slots.unshift({
          slot: 'auto', exists: true, isAuto: true,
          timestamp: autoData.timestamp,
          timeStr: autoData.time ? autoData.time.year + '年' + (autoData.time.month||1) + '月' : '?',
          turnCount: autoData.turnCount || 0,
          version: autoData.version || '?',
          gdp: (autoData.state?.county?.economy?.gdpGrowth) || 0,
          tension: autoData.state?.county?.socialTension || 0,
          treasury: autoData.state?.finance?.treasuryBalance || 0,
          playerName: autoData.state?.player?.name || '书记',
        });
      }
    } catch(e) {}

    var isSave = mode === 'save';
    var title = isSave ? '💾 保存游戏' : '📂 读取游戏';
    var actionLabel = isSave ? '保存到此槽' : '读取此档';

    var slotHtml = slots.map(function(s) {
      if (!s.exists) {
        return '<div style="padding:10px;border:1px dashed var(--border-color);border-radius:6px;text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:4px;">' +
          '槽位 ' + s.slot + ' — 空' +
          (isSave ? '<br><button class="fd-action-btn" style="margin-top:6px;" onclick="uiManager._doSave(' + s.slot + ')">' + actionLabel + '</button>' : '') +
        '</div>';
      }
      var dateStr = s.timestamp ? new Date(s.timestamp).toLocaleString('zh-CN') : '?';
      var autoTag = s.isAuto ? ' <span style="font-size:9px;padding:1px 4px;border-radius:3px;background:var(--accent-cyan);color:#fff;margin-left:4px;">自动</span>' : '';
      return '<div style="padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:4px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-size:12px;font-weight:500;">槽位' + s.slot + autoTag + '</span>' +
          '<span style="font-size:10px;color:var(--text-muted);">' + dateStr + '</span>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' +
          s.timeStr + ' · 第' + s.turnCount + '周 · ' + s.playerName +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:1px;">' +
          '经济 ' + (s.gdp ? (s.gdp*100).toFixed(1) : '?') + '% · 张力 ' + (s.tension || '?') + ' · 国库 ' + (s.treasury ? Math.round(s.treasury).toLocaleString() : '?') + '万' +
        '</div>' +
        '<div style="margin-top:4px;display:flex;gap:4px;">' +
          (isSave ? '<button class="fd-action-btn" onclick="uiManager._doSave(' + s.slot + ')" style="font-size:10px;padding:3px 8px;">覆盖保存</button>' :
            '<button class="fd-action-btn" onclick="uiManager._doLoad(' + s.slot + ')" style="font-size:10px;padding:3px 8px;">读取此档</button>') +
          '<button class="fd-action-btn" onclick="uiManager._doDeleteSave(' + s.slot + ')" style="font-size:10px;padding:3px 8px;border-color:var(--accent-red);color:var(--accent-red);">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');

    overlay.innerHTML = '<div class="modal-card" style="max-width:420px;"><div class="mc-header"><span class="mc-icon">' + (isSave ? '💾' : '📂') + '</span><span class="mc-title">' + title + '</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">' + (isSave ? '选择一个槽位保存当前进度' : '选择一个存档读取') + '</div>' +
        slotHtml +
      '</div></div>';
  }

  /** 执行保存 */
  _doSave(slot) {
    if (gameEngine.save(slot)) {
      this.showToast('存档成功（槽位' + slot + '）', 'success');
    } else {
      this.showToast('存档失败', 'error');
    }
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  /** 执行读档 */
  _doLoad(slot) {
    if (gameEngine.load(slot)) {
      this.showToast('读档成功', 'success');
      this.refreshAll();
    } else {
      this.showToast('读档失败', 'error');
    }
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  /** 删除存档 */
  _doDeleteSave(slot) {
    gameEngine.deleteSave(slot);
    this.showToast('已删除存档', 'info');
    this._showSaveLoadModal('load');
  }

  /** 初始化悬浮提示（支持EU4风格动态数值来源） */
  _initTooltipSystem() {
    const container = document.getElementById('tooltip-container');
    if (!container) return;

    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-term]');
      if (!el) { container.classList.add('hidden'); return; }
      const key = el.dataset.term;
      // 优先尝试动态数值来源
      const dynamic = getDynamicBreakdown(key);
      const html = dynamic || getTermTooltip(key);
      if (!html) { container.classList.add('hidden'); return; }
      container.innerHTML = html;
      container.classList.remove('hidden');
    });

    document.addEventListener('mousemove', (e) => {
      if (container.classList.contains('hidden')) return;
      let x = e.clientX + 15;
      let y = e.clientY + 10;
      // 防止溢出
      const w = container.offsetWidth || 300;
      const h = container.offsetHeight || 200;
      if (x + w > window.innerWidth) x = e.clientX - w - 15;
      if (y + h > window.innerHeight) y = e.clientY - h - 10;
      container.style.left = x + 'px';
      container.style.top = y + 'px';
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-term]')) {
        container.classList.add('hidden');
      }
    });
  }

  _setupNavigation() {
    eventBus.on(EVENTS.UI_REFRESH_DASHBOARD, () => this.refreshAll());
    eventBus.on(EVENTS.UI_NOTIFICATION, (d) => this.showNotification(d));
    eventBus.on(EVENTS.UI_OPEN_DECISION, (d) => { if (d.event) this.showDecisionModal(d.event); });
    eventBus.on(EVENTS.GAME_INIT, () => this.refreshAll());
    eventBus.on(EVENTS.BUDGET_REVIEW, (d) => {
      // 延时触发，让其他年度更新完成后再弹窗
      setTimeout(function(ui) { ui._showBudgetReview(d); }, 500, this);
    });
    eventBus.on(EVENTS.GAME_OVER, (d) => this.showGameOverModal(d));
    eventBus.on(EVENTS.FINANCE_MONTHLY, (d) => {
      this._addEventLog('info', '月度财政', `收入${d.income}万 / 支出${d.expense}万 / 结余${d.balance}万`);
    });
    eventBus.on(EVENTS.EVENT_TRIGGER, (d) => {
      this._addEventLog('warning', '新事件', d.event?.name || '未知事件');
    });
    // ——— 社会行动事件 ———
    eventBus.on(EVENTS.SOCIAL_PROTEST, (d) => {
      this._addEventLog('warning', '社会行动', (d.action?.icon || '⚠️') + ' ' + (d.action?.groupLabel || '') + (d.action?.name || '集体行动'));
      // 自动切换到办公室视图显示行动
      setTimeout(() => { this.switchView('office'); this.refreshAll(); }, 500);
    });
    // ——— 巡视决策弹窗 ———
    eventBus.on(EVENTS.INSPECTION_CHOICE, (d) => this._showInspectionChoiceModal(d));
    // ——— 每周决策流 ———
    eventBus.on(EVENTS.WEEKLY_FOCUS, (d) => this._showWeeklyFocusPanel(d));
    eventBus.on(EVENTS.WEEKLY_EVENTS, (d) => this._showWeeklyEventPanel(d));
    eventBus.on(EVENTS.WEEKLY_ADVANCE, () => {
      gameEngine._doAdvance();
      var taskSys = gameEngine.getSystem('tasks');
      if (taskSys && taskSys.checkAssignedTasks) taskSys.checkAssignedTasks();
      this.refreshAll();
      this.showToast('新的一周开始了', 'info');
      this.aiSecretary.updateAdvice();
    });
    eventBus.on(EVENTS.EVENT_RESOLVE, (d) => {
      this._addEventLog('info', '事件处理', `选择了选项#${d.choice}`);
    });
    eventBus.on(EVENTS.SOCIAL_TENSION, (d) => {
      if (d.newTension > 70) this._addEventLog('warning', '社会预警', `社会张力升至${Math.round(d.newTension)}`);
    });
    eventBus.on(EVENTS.COMMITTEE_VOTE, (d) => {
      const r = d.result;
      this._addEventLog('important', '常委会', `投票结果：${r.support}支持 ${r.oppose}反对 ${r.abstain}弃权 — ${r.result}`);
    });
    eventBus.on(EVENTS.STATE_CHANGE, (d) => {
      if (d.namespace === 'finance' && d.changes?.fiscalHealth !== undefined) {
        this._addEventLog('info', '财政', `财政健康度更新：${Math.round(d.changes.fiscalHealth)}`);
      }
    });
    // ——— 通知动态（全部弹窗→右侧面板持久展示） ———
    eventBus.on(EVENTS.UI_NOTIFICATION, (d) => {
      // 所有UI_NOTIFICATION都录入右侧面板
      this._notificationLog.push({
        id: 'ntf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        time: timeSystem?.getTimeString?.() || '',
        type: d.type || 'info',
        title: d.title || '',
        message: d.message || '',
        choices: d.choices || null,
        week: Math.ceil((timeSystem?.day || 1) / 7),
        month: timeSystem?.month || 1,
        year: timeSystem?.year || 2026
      });
      // 自动刷新右侧面板
      this._updateNotificationLog();
    });
    // 季度更新时清理旧通知
    eventBus.on(EVENTS.MONTH_CHANGE, (d) => {
      if (d.month % 3 === 1 && d.month !== 1) {
        const curQ = Math.ceil((d.month || 0) / 3);
        this._notificationLog = this._notificationLog.filter(e => {
          const eventQ = Math.ceil((e.month || 0) / 3);
          return eventQ === curQ;
        });
      }
      // 人大常委会双月例会检查
      if (this._checkStandingCommitteeMeeting) {
        this._checkStandingCommitteeMeeting(d.month);
      }
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
    document.querySelectorAll('.view-panel').forEach(p => p.classList.toggle('active', p.id === `view-${viewName}`));
    this.renderView(viewName);
  }

  renderView(viewName) {
    const c = document.getElementById(`view-${viewName}`);
    if (!c) return;
    const renderers = {
      office: '_renderOffice', committee: '_renderCommittee', map: '_renderMap',
      personnel: '_renderPersonnel',
      data: '_renderData', manual: '_renderManual', tasks: '_renderTasks', eventlog: '_renderEventLog', npc: '_renderNPC', talent: '_renderTalentPool',
      faction: '_renderFactionView', social: '_renderSocial',
      economy: '_renderEconomy', superior: '_renderSuperior',
      inspection: '_renderInspectionView',
    };
    if (renderers[viewName]) {
      var fn = this[renderers[viewName]];
      if (typeof fn === 'function') {
        fn.call(this, c);
      } else {
        c.innerHTML = '<div class="empty-state">⚠️ 视图加载中...<br><span style="font-size:11px;color:var(--text-muted);">' + renderers[viewName] + ' 尚未就绪</span></div>';
      }
    }
  }

  refreshAll() {
    this._updateTopBar();
    this._updateStatusPanel();
    this._updatePriorityList();
    this._updateNewsTicker();
    this._updateUrgentList();
    this._updateNotificationLog();
    this.renderView(this.currentView);
  }

  // ================ 天气系统 ================

  _weatherMap = ['☀️ 晴','⛅ 多云','☁️ 阴','🌧 雨','🌫 雾','❄️ 雪','🌪 大风'];

  _getWeather() {
    const seed = (timeSystem?.totalDays || 0) + (timeSystem?.month || 1) * 7;
    // 用月份影响概率：夏季多雨，冬季多雪
    const m = timeSystem?.month || 1;
    const rainChance = [3,4,5,8,10,12,14,12,8,5,3,2][m - 1] || 5;
    const snowChance = m <= 2 || m >= 11 ? 8 : 0;
    const r = Math.random() * 100;
    if (r < snowChance) return '❄️ 雪';
    if (r < snowChance + rainChance) return '🌧 雨';
    if (r < snowChance + rainChance + 10) return '🌫 雾';
    if (r < snowChance + rainChance + 10 + 3) return '🌪 大风';
    if (r < snowChance + rainChance + 10 + 3 + 30) return '☁️ 阴';
    if (r < snowChance + rainChance + 10 + 3 + 30 + 25) return '⛅ 多云';
    return '☀️ 晴';
  }

  // ================ 面板更新 ================

  _updateTopBar() {
    const dateEl = document.getElementById('tb-date');
    if (dateEl) dateEl.textContent = timeSystem?.getTimeString?.() || '--';
    const weekEl = document.getElementById('tb-week');
    if (weekEl) weekEl.textContent = `第${gameEngine.turnCount}周`;
    const termFill = document.getElementById('tb-term-fill');
    if (termFill) termFill.style.width = `${(timeSystem?.termYear || 1) / 5 * 100}%`;
    const hint = document.getElementById('advance-hint');
    if (hint) hint.textContent = `第${gameEngine.turnCount}周`;
  }

  _updateStatusPanel() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    const fin = stateManager.get('finance');
    if (!player) return;
    // 角色信息
    const nameEl = document.getElementById('portrait-name');
    if (nameEl) nameEl.textContent = player.name || '县长';
    const roleEl = document.getElementById('portrait-role');
    if (roleEl) roleEl.textContent = player.role || '县委书记';

    // 三条核心状态（替代旧精力/压力/健康）
    const tension = county?.socialTension ?? 0;
    const stability = Math.max(0, 100 - tension); // 稳定 = 100 - 张力
    const economic = Math.round((county?.economy?.gdpGrowth ?? 0.05) * 100); // 经济活力 = GDP增速×100
    const superior = Math.round(county?.superiorTrust?.citySecretary ?? 50);
    const pcap = player.politicalCapital ?? 20;
    const treasury = fin?.treasuryBalance ?? 0;

    const setState = (id, val, max, goodDir) => {
      const el = document.getElementById(id);
      if (el) {
        const pct = Math.min(100, (val / max) * 100);
        el.style.width = pct + '%';
        if (goodDir === 'up') {
          el.style.background = val > 60 ? 'var(--accent-green)' : val > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)';
        } else {
          el.style.background = val < 40 ? 'var(--accent-green)' : val < 60 ? 'var(--accent-yellow)' : 'var(--accent-red)';
        }
      }
      const valEl = document.getElementById(id + '-val');
      if (valEl) valEl.textContent = Math.round(val);
    };
    setState('st-stability', stability, 100, 'up');
    setState('st-economic', Math.min(100, economic + 50), 100, 'up'); // 映射到0-100
    setState('st-superior', superior, 100, 'up');
    setState('st-energy', player.status?.energy ?? 100, 100, 'up');

    // 统计数据
    const g = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    g('st-pcap', pcap);
    g('st-treasury', treasury.toLocaleString() + '万');
    g('st-focus', gameEngine.focusAreas?.length > 0 ? `${gameEngine.focusAreas.length}个领域` : '未选');
    // 腐败值
    var corruptionLevel = player.corruption?.level || 0;
    var corrEl = document.getElementById('st-corruption');
    if (corrEl) {
      corrEl.textContent = corruptionLevel + '%';
      corrEl.style.color = corruptionLevel > 60 ? 'var(--accent-red)' : corruptionLevel > 30 ? 'var(--accent-yellow)' : 'var(--text-muted)';
    }

    // 特质
    const traitsEl = document.getElementById('traits-display');
    if (traitsEl && player.traits?.length > 0) {
      traitsEl.innerHTML = player.traits.map(tId => {
        const t = getTrait?.(tId);
        return t ? `<span class="trait-badge" title="${t.desc}">${t.icon} ${t.name}</span>` : '';
      }).join('');
    }
  }

  _updateUrgentList() {
    const el = document.getElementById('urgent-list');
    if (!el) return;
    const evtSys = gameEngine.getSystem('event');
    const active = evtSys?.getActiveEvents?.() || [];
    const urgentItems = active.filter(e => e.type === 'emergency' || e.type === 'superior_task');
    if (urgentItems.length === 0) {
      el.innerHTML = '<div class="todo-item" style="color:var(--text-muted);">暂无紧急事项</div>';
      return;
    }
    el.innerHTML = urgentItems.map(e =>
      `<div class="todo-item urg-${e.type === 'emergency' ? 'red' : 'yellow'}" onclick="uiManager._showEventModal('${e.id}')">🚨 ${e.name}</div>`
    ).join('');
  }

  /** 更新右侧上级动态面板 */
  _updateNotificationLog() {
    const el = document.getElementById('notification-log-list');
    if (!el) return;
    if (this._notificationLog.length === 0) {
      el.innerHTML = '<div class="todo-item" style="color:var(--text-muted);font-size:11px;">暂无上级动态</div>';
      return;
    }
    // 最多显示最新8条，点击可展开查看全部
    const maxDisplay = 8;
    const events = this._notificationLog.slice(-maxDisplay).reverse();
    const totalCount = this._notificationLog.length;

    const typeColors = { info: '#4a90d9', warning: '#ff9800', error: '#f44336', success: '#4caf50', important: '#9c27b0' };
    const typeIcons = { info: 'ℹ️', warning: '⚠️', error: '❌', success: '✅', important: '🔔' };

    el.innerHTML = events.map(e => {
      const color = typeColors[e.type] || '#4a90d9';
      const icon = typeIcons[e.type] || 'ℹ️';
      const hasChoices = e.choices && e.choices.length > 0;
      return `<div class="todo-item superior-event-item" style="border-left:3px solid ${color};margin-bottom:4px;padding:6px 8px;cursor:pointer;font-size:11px;position:relative;"
        onclick="uiManager._openSuperiorEvent('${e.id}')" title="点击查看详情">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:500;">${icon} ${e.title || ''}</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="font-size:9px;color:var(--text-muted);">${e.time || ''}</span>
            <span style="font-size:10px;color:var(--text-muted);cursor:pointer;padding:0 2px;" onclick="event.stopPropagation();uiManager._dismissNotification('${e.id}')" title="关闭">✕</span>
          </span>
        </div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;">
          ${e.message || ''}
          ${hasChoices ? '<span style="color:var(--accent-yellow);margin-left:4px;">[需回应]</span>' : ''}
        </div>
      </div>`;
    }).join('');

    // 如果事件多于显示数，加"查看更多"按钮
    if (totalCount > maxDisplay) {
      el.innerHTML += `<div class="todo-item" style="font-size:10px;color:var(--text-muted);text-align:center;padding:4px;cursor:pointer;"
        onclick="uiManager.switchView('eventlog')">
        📋 查看全部${totalCount}条上级动态
      </div>`;
    }

    // 如果有需要回应的上级事件，加提示
    const pendingResponses = this._notificationLog.filter(e => e.choices && e.choices.length > 0);
    if (pendingResponses.length > 0) {
      el.innerHTML += `<div style="font-size:9px;color:#ff9800;margin-top:4px;text-align:center;">
        ⚡ ${pendingResponses.length}条待回应
      </div>`;
    }
  }

  /** 关闭单条通知 */
  _dismissNotification(eventId) {
    this._notificationLog = this._notificationLog.filter(e => e.id !== eventId);
    this._updateNotificationLog();
  }

  /** 点击上级事件条目 */
  _openSuperiorEvent(eventId) {
    const evt = this._notificationLog.find(e => e.id === eventId);
    if (!evt) return;
    if (evt.choices && evt.choices.length > 0) {
      // 有选项→显示决策弹窗
      this._showSuperiorChoiceModal(evt);
    } else {
      // 纯信息→用通知样式显示
      this.showNotification({ type: evt.type, title: evt.title, message: evt.message, persistent: true });
    }
  }

  /** 上级事件决策弹窗 */
  _showSuperiorChoiceModal(evt) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="width:450px;">
        <div class="mc-header">
          <span>${evt.title || '上级动态'}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;max-height:50vh;overflow-y:auto;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${evt.message}</div>
          ${(evt.choices || []).map((c, i) => `
            <div class="decision-option" onclick="uiManager._resolveSuperiorChoice('${evt.id}', ${i})"
              style="cursor:pointer;padding:10px 14px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
              <div style="font-size:13px;font-weight:500;">${c.label}</div>
            </div>
          `).join('')}
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);"
            onclick="document.getElementById('modal-overlay').classList.add('hidden')">暂不处理</button>
        </div>
      </div>`;
  }

  /** 执行上级事件选择 */
  _resolveSuperiorChoice(eventId, choiceIndex) {
    const evt = this._notificationLog.find(e => e.id === eventId);
    if (!evt || !evt.choices || !evt.choices[choiceIndex]) return;
    const choice = evt.choices[choiceIndex];
    // 执行选择
    if (choice.action) {
      // 如果是字符串action（如 repayFavor_0），解析调用
      if (typeof choice.action === 'string') {
        this._handleSuperiorActionString(choice.action);
      } else if (typeof choice.action === 'function') {
        choice.action();
      }
    }
    // 标记已处理
    evt.resolved = true;
    evt.choiceLabel = choice.label;
    // 关闭弹窗
    document.getElementById('modal-overlay')?.classList.add('hidden');
    this.refreshAll();
  }

  /** 展示巡视决策弹窗 */
  _showInspectionChoiceModal(data) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || !data || !data.choices) return;
    overlay.classList.remove('hidden');

    const uniqueId = data.eventId || 'insp_' + Date.now();
    const choicesHtml = data.choices.map((c, i) => `
      <div class="decision-option" onclick="uiManager._resolveInspectionChoice('${uniqueId}', ${i})"
        style="cursor:pointer;padding:10px 14px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:500;">${c.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${c.desc || ''}</div>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="modal-card" style="width:480px;">
        <div class="mc-header">
          <span>${data.title || '巡视决策'}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;max-height:60vh;overflow-y:auto;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${data.message || ''}</div>
          ${choicesHtml}
          <button class="sc-btn" style="margin-top:4px;width:100%;background:var(--bg-secondary);"
            onclick="document.getElementById('modal-overlay').classList.add('hidden')">暂不处理</button>
        </div>
      </div>`;

    // 存储到notificationLog以便持久化查阅
    this._notificationLog.push({
      id: uniqueId, time: timeSystem?.getTimeString?.() || '',
      type: 'inspection', title: data.title || '巡视决策',
      message: data.message || '',
      choices: data.choices,
      persistent: true, resolved: false,
      week: Math.ceil((timeSystem?.day || 1) / 7),
      month: timeSystem?.month || 1, year: timeSystem?.year || 2026,
    });
    this._updateNotificationLog();
  }

  /** 执行巡视决策选择 */
  _resolveInspectionChoice(eventId, choiceIndex) {
    const evt = this._notificationLog.find(e => e.id === eventId);
    if (!evt || !evt.choices || !evt.choices[choiceIndex]) return;
    const choice = evt.choices[choiceIndex];

    // 先移除弹窗
    document.getElementById('modal-overlay')?.classList.add('hidden');

    // 调用回调（如果有）
    if (choice.callback && typeof choice.callback === 'function') {
      choice.callback(choiceIndex);
    }
    // 调用action（如果有）
    if (choice.action && typeof choice.action === 'function') {
      choice.action();
    }

    evt.resolved = true;
    evt.choiceLabel = choice.label;
    this._updateNotificationLog();
    this.refreshAll();

    // 显示选中确认
    this.showToast('✅ 已选择：' + (choice.label || '选项'), 'info');
  }

  /** 处理字符串形式的上级操作（如 repayFavor_0） */
  _handleSuperiorActionString(actionStr) {
    if (actionStr.startsWith('repayFavor_')) {
      const idx = parseInt(actionStr.split('_')[1], 10);
      const sys = gameEngine.getSystem('superiorRelations');
      if (sys && sys.repayFavor) {
        sys.repayFavor(idx);
      }
    }
  }

  /** 弹出事件决策弹窗（由紧急事项/上级交办等调用） */
  _showEventModal(eventId) {
    const evtSys = gameEngine.getSystem('event');
    const evt = evtSys?._events?.find(e => e.id === eventId);
    if (evt) this.showDecisionModal(evt);
  }

  /** 今日重点事务——按优先级排序 */
  _updatePriorityList() {
    const el = document.getElementById('co-priority-list');
    if (!el) return;
    const evtSys = gameEngine.getSystem('event');
    const active = evtSys?.getActiveEvents?.() || [];
    const files = gameEngine._filePool || [];

    let items = [];
    // 紧急事件 → 红色
    for (const e of active.filter(x => x.type === 'emergency')) {
      items.push({ priority: 0, label: '🔴 重大危机', html: `<div class="prio-item prio-red" onclick="uiManager._showEventModal('${e.id}')"><span class="prio-tag">重大</span><span>${e.name}</span><span class="prio-arrow">→</span></div>` });
    }
    // 上级任务 → 黄色
    for (const e of active.filter(x => x.type === 'superior_task')) {
      items.push({ priority: 1, label: '🟡 上级交办', html: `<div class="prio-item prio-yellow" onclick="uiManager._showEventModal('${e.id}')"><span class="prio-tag">交办</span><span>${e.name}</span><span class="prio-arrow">→</span></div>` });
    }
    // 常规事件 → 蓝色
    for (const e of active.filter(x => x.type !== 'emergency' && x.type !== 'superior_task')) {
      items.push({ priority: 2, label: '🔵 事项', html: `<div class="prio-item prio-blue" onclick="uiManager._showEventModal('${e.id}')"><span class="prio-tag">事项</span><span>${e.name}</span><span class="prio-arrow">→</span></div>` });
    }
    // 文件 → 灰色例行
    for (const f of files.slice(0, 3)) {
      items.push({ priority: 3, label: '⚪ 文件', html: `<div class="prio-item prio-gray">📄 ${f.name || '待批文件'}</div>` });
    }

    items.sort((a, b) => a.priority - b.priority);
    el.innerHTML = items.length > 0
      ? items.map(i => i.html).join('')
      : '<div style="color:var(--text-muted);padding:16px;text-align:center;">📭 暂无待办事项，点击"推进一周"继续治理</div>';
  }

  _updateNewsTicker() {
    const ticker = document.getElementById('ticker-text');
    const letter = document.getElementById('letter-text');
    if (!ticker) return;
    // 优先使用秘书叙事文本（如果有待展示的非空文本）
    if (this._narrativeTickerText) {
      ticker.textContent = this._narrativeTickerText;
      this._narrativeTickerText = null;
      return;
    }
    // 取最新一条事件日志作为新闻
    const logs = stateManager.get('events')?.logs || this._eventLog || [];
    const lastLog = logs[logs.length - 1];
    if (lastLog) {
      ticker.textContent = `${lastLog.title}：${lastLog.message || ''}`;
    }
    // 群众来信
    if (letter) {
      const tension = stateManager.get('county')?.socialTension || 0;
      if (tension > 60) {
        letter.textContent = '🔴 群众反映强烈，社会张力偏高，建议尽快处理积案';
      } else if (tension > 40) {
        letter.textContent = '🟡 有群众来信反映乡镇小学设施老旧问题';
      } else {
        letter.textContent = '✅ 近期群众来信较少，社会面平稳';
      }
    }
  }

  // ============== 每周决策流 ==============

  /** 周一早晨：选择本周2个关注领域 */
  _showWeeklyFocusPanel(d) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    const areaDefs = {
      economicDevelopment: { label: '经济发展', icon: '📈', desc: '招商引资、企业服务、项目建设效果+50%', color: '#3fb950' },
      socialStability: { label: '社会稳定', icon: '🏘', desc: '信访处理、群体事件、舆情管控效果+50%', color: '#d29922' },
      peopleLivelihood: { label: '民生建设', icon: '🏥', desc: '教育医疗、扶贫救助、基础设施效果+50%', color: '#58a6ff' },
      partyConstruction: { label: '党的建设', icon: '🚩', desc: '干部管理、理论学习、巡视整改效果+50%', color: '#bc8cff' },
    };
    const weekStr = `第${gameEngine.turnCount + 1}周`;

    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:560px;">
        <div class="mc-header">
          <span class="mc-icon">📋</span>
          <span class="mc-title">周一早晨 · ${weekStr}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden');gameEngine._weeklyPhase='idle'">✕</button>
        </div>
        <div class="mc-body">
          <div class="mc-desc" style="margin-bottom:12px;">请选择本周的 <b>2个关注领域</b>。选中的领域相关事件处理效果+50%，未选领域效果-30%。</div>
          <div id="focus-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${Object.entries(areaDefs).map(([key, v]) => `
              <div class="focus-card" data-focus="${key}" onclick="uiManager._toggleFocus(this)" style="padding:14px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-card);cursor:pointer;transition:var(--transition);">
                <div style="font-size:24px;margin-bottom:6px;">${v.icon}</div>
                <div style="font-weight:600;font-size:14px;color:var(--text-primary);">${v.label}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${v.desc}</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text-muted);text-align:center;" id="focus-status">请选择2个领域</div>
          <button class="action-btn" style="width:100%;margin-top:12px;padding:10px;" id="btn-confirm-focus" disabled onclick="uiManager._confirmFocus()">确认选择 · 推进到本周事务</button>
        </div>
      </div>
    `;
  }

  /** 关注领域选择切换 */
  _toggleFocus(el) {
    const grid = document.getElementById('focus-grid');
    if (!grid) return;
    const selected = grid.querySelectorAll('.focus-card.selected');
    const isSelected = el.classList.contains('selected');
    if (isSelected) {
      el.classList.remove('selected');
      el.style.borderColor = 'var(--border-color)';
      el.style.background = 'var(--bg-card)';
    } else if (selected.length < 2) {
      el.classList.add('selected');
      el.style.borderColor = 'var(--accent-gold)';
      el.style.background = 'rgba(232,212,77,0.06)';
    }
    const newSelected = grid.querySelectorAll('.focus-card.selected');
    const status = document.getElementById('focus-status');
    if (status) status.textContent = `已选${newSelected.length}个领域${newSelected.length < 2 ? '（还需选' + (2 - newSelected.length) + '个）' : ' ✓'}`;
    const btn = document.getElementById('btn-confirm-focus');
    if (btn) btn.disabled = newSelected.length !== 2;
  }

  /** 确认关注领域选择 */
  _confirmFocus() {
    const selected = document.querySelectorAll('#focus-grid .focus-card.selected');
    if (selected.length !== 2) return;
    const areas = Array.from(selected).map(el => el.dataset.focus);
    gameEngine.setFocus(areas);
    // 关闭弹窗，然后开始事件处理
    document.getElementById('modal-overlay')?.classList.add('hidden');
    // 如果有事件，进入事件处理
    gameEngine.advance();
  }

  /** 处理本周事件 */
  _showWeeklyEventPanel(d) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    const { events, index, focus } = d;
    const evt = events[index];
    if (!evt) {
      // 没有事件了，直接推进
      gameEngine.advance();
      return;
    }

    const total = events.length;
    const focusLabels = { economicDevelopment: '经济发展', socialStability: '社会稳定',
      peopleLivelihood: '民生建设', partyConstruction: '党的建设' };
    const focusStr = focus ? focus.map(f => focusLabels[f] || f).join('、') : '无';

    // 特质对选项的影响
    const player = stateManager.get('player');
    const traitMods = (typeof getTraitEventModifiers === 'function' && player)
      ? getTraitEventModifiers(player, evt.options || []) : { locked: [], unlocked: [], boosted: [] };

    // 检查各选项是否有关注领域加成
    const optionsHtml = (evt.options || []).map((opt, oi) => {
      const hasFocusBonus = focus.some(f => {
        if (!opt.focusBonus) return false;
        if (Array.isArray(opt.focusBonus)) return opt.focusBonus.includes(f);
        return opt.focusBonus === f;
      });
      const costHtml = opt.cost ? Object.entries(opt.cost).map(([k, v]) => {
        if (k === 'money') return `💰 ${v}万`;
        if (k === 'politicalCapital') return `🏛 ${v}政治资本`;
        return `${k}:${v}`;
      }).join(' · ') : '无消耗';
      const effHtml = opt.effects ? Object.entries(opt.effects).map(([k, v]) => {
        const sign = v > 0 ? '+' : '';
        const labels = { stability: '稳定', economicVitality: '经济', superiorEvaluation: '上级' };
        return `${labels[k] || k}:${sign}${v}`;
      }).join(' · ') : '无极影响';
      // 特质锁定/加成
      const isLocked = traitMods.locked.includes(oi);
      const isBoosted = traitMods.boosted.includes(oi);
      return `
        <div class="weekly-opt" data-evt="${evt.id}" data-opt="${oi}" onclick="${isLocked ? '' : 'uiManager._resolveWeeklyEvent(this)'}"
          style="padding:12px;border:1px solid ${isLocked ? 'var(--accent-red)' : isBoosted ? 'var(--accent-purple)' : hasFocusBonus ? 'var(--accent-gold)' : 'var(--border-color)'};border-radius:var(--radius-md);background:${isLocked ? 'rgba(248,81,73,0.06)' : isBoosted ? 'rgba(163,113,247,0.06)' : hasFocusBonus ? 'rgba(232,212,77,0.04)' : 'var(--bg-card)'};cursor:${isLocked ? 'not-allowed' : 'pointer'};transition:var(--transition);margin-bottom:6px;${isLocked ? 'opacity:0.5;' : ''}">
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${isLocked ? '🔒 ' : isBoosted ? '💪 ' : ''}${opt.label || opt.text || opt.name || `选项${oi+1}`}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${opt.desc || opt.description || ''}</div>
          <div style="display:flex;gap:12px;margin-top:6px;font-size:11px;">
            <span style="color:var(--accent-red);">消耗: ${costHtml}</span>
            <span style="color:${hasFocusBonus ? 'var(--accent-gold)' : 'var(--accent-green)'};">效果: ${effHtml}</span>
            ${hasFocusBonus ? '<span style="color:var(--accent-gold);">🌟 本周关注加成</span>' : ''}
            ${isBoosted ? '<span style="color:var(--accent-purple);">💪 特质加成</span>' : ''}
            ${isLocked ? '<span style="color:var(--accent-red);">🔒 特质限制不可选</span>' : ''}
            ${!hasFocusBonus && !isBoosted && !isLocked && focus.length > 0 ? '<span style="color:var(--text-muted);font-size:10px;">效果-30%（未关注领域）</span>' : ''}
          </div>
        </div>`;
    }).join('');

    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:620px;">
        <div class="mc-header">
          <span class="mc-icon">⚠️</span>
          <span class="mc-title">本周事务 · ${index + 1}/${total}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">本周关注：${focusStr}</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${evt.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px;background:rgba(255,255,255,0.02);padding:10px;border-radius:var(--radius-sm);">${evt.description || evt.desc || evt.scene || '描述'}</div>
          <div style="font-size:12px;font-weight:600;color:var(--accent-cyan);margin-bottom:6px;">请选择处理方案：</div>
          ${optionsHtml}
          <div style="margin-top:8px;">
            <button class="action-btn" style="width:100%;padding:10px;background:transparent;border:1px solid var(--border-color);color:var(--text-muted);font-size:12px;" onclick="uiManager._skipWeeklyEvent()">暂不处理，进入下一项</button>
          </div>
        </div>
      </div>
    `;
  }

  /** 选择处理方案 */
  _resolveWeeklyEvent(el) {
    const optIdx = parseInt(el.dataset.opt);
    const evtId = el.dataset.evt;
    const evtSys = gameEngine.getSystem('event');
    if (evtSys) {
      evtSys.resolveEvent(evtId, optIdx);
    }
    // 应用资源消耗
    const evt = gameEngine.weeklyEvents.find(e => e.id === evtId) ||
                evtSys?._events?.find(e => e.id === evtId);
    const opt = evt?.options?.[optIdx];
    if (opt) {
      // 检查特质加成
      const player = stateManager.get('player');
      let traitBoost = 1.0;
      if (player && typeof getTraitEventModifiers === 'function') {
        const mods = getTraitEventModifiers(player, evt?.options || []);
        if (mods.boosted.includes(optIdx)) traitBoost = 1.3;
      }
      this._applyWeeklyOptionEffects(opt, traitBoost);
    }
    document.getElementById('modal-overlay')?.classList.add('hidden');
    gameEngine.confirmEvent();
  }

  /** 暂不处理 */
  _skipWeeklyEvent() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    gameEngine.confirmEvent();
  }

  /** 应用事件选项的资源消耗和状态变化（支持自动推测） */
  _applyWeeklyOptionEffects(opt, traitBoost = 1.0) {
    try {
      const player = stateManager.get('player');
      const county = stateManager.get('county');
      const finance = stateManager.get('finance');

      // 如果没有显式cost/effects，从文本自动推测
      const computed = this._computeOptionCosts(opt);
      const cost = opt.cost || computed.cost;
      const effects = opt.effects || computed.effects;

      if (cost) {
        // 特质修饰：财政消耗减少/增加
        const fiscalCostMod = gameEngine._traitModifiers?.fiscalCost;
        if (cost.money && finance) {
          const raw = cost.money;
          const final = fiscalCostMod ? Math.round(raw * fiscalCostMod) : raw;
          finance.treasuryBalance -= Math.min(finance.treasuryBalance, final);
          if (fiscalCostMod && fiscalCostMod !== 1) {
            this._addEventLog('info', '财政', `事件支出${final}万${fiscalCostMod < 1 ? '（节俭）' : '（大方）'}（原${raw}万）`);
          } else {
            this._addEventLog('info', '财政', `事件支出${final}万`);
          }
        }
        if (cost.politicalCapital && player) {
          player.politicalCapital = Math.max(0, (player.politicalCapital || 0) - cost.politicalCapital);
        }
      }

      if (effects) {
        const focus = gameEngine.focusAreas || [];
        let multiplier = 1.0;
        if (opt.focusBonus && focus.some(f => {
          if (Array.isArray(opt.focusBonus)) return opt.focusBonus.includes(f);
          return opt.focusBonus === f;
        })) {
          multiplier = 1.5;
        } else if (focus.length > 0) {
          multiplier = 0.7;
        }
        multiplier *= traitBoost; // 特质加成

        if (effects.stability !== undefined && county) {
          const delta = Math.round(effects.stability * multiplier);
          county.modifyTension(-delta);
          this._addEventLog('info', '状态', `稳定度${delta > 0 ? '+' : ''}${delta}`);
        }
        if (effects.economicVitality !== undefined) {
          if (!county.economy) county.economy = {};
          const delta = Math.round(effects.economicVitality * multiplier);
          county.economy.gdpGrowth = (county.economy.gdpGrowth || 0.05) + delta * 0.01;
          this._addEventLog('info', '状态', `经济活力${delta > 0 ? '+' : ''}${delta}`);
        }
        if (effects.superiorEvaluation !== undefined && county) {
          const delta = Math.round(effects.superiorEvaluation * multiplier);
          county.superiorTrust.citySecretary = (county.superiorTrust.citySecretary || 50) + delta;
          this._addEventLog('info', '状态', `上级评价${delta > 0 ? '+' : ''}${delta}`);
        }
      }

      this._addEventLog('info', '每周事务', `处理完成：${opt.label || opt.name || '已处理'}`);
    } catch (e) {
      console.error('[ApplyEffects]', e);
    }
  }

  /** 从选项文本自动推测消耗和效果（无显式定义时使用） */
  _computeOptionCosts(opt) {
    const cost = {};
    const effects = { stability: 0, economicVitality: 0, superiorEvaluation: 0 };
    const txt = [opt.label, opt.text, opt.name, opt.desc, opt.description].filter(Boolean).join(' ');

    // 消耗推测：钱
    if (/拨款|补贴|出资|配套|花费|投资|资助|经费|补偿/.test(txt)) {
      const m = txt.match(/(\d+)\s*万/);
      cost.money = m ? parseInt(m[1]) : 300;
    }
    // 消耗推测：政治资本
    if (/协调|求人|保干部|得罪|强推|承诺|批示|托关系/.test(txt)) {
      cost.politicalCapital = 8 + Math.floor(Math.random() * 9);
    }

    // 效果推测
    if (/经济|招商|投资|增长|发展|项目/.test(txt)) effects.economicVitality = 8 + Math.floor(Math.random() * 7);
    if (/减产|关闭|停工|亏损|倒闭/.test(txt)) effects.economicVitality = -(5 + Math.floor(Math.random() * 10));
    if (/稳定|安抚|平息|满意|解决|化解/.test(txt)) effects.stability = 5 + Math.floor(Math.random() * 10);
    if (/激化|得罪|不满|上访|抗议|冲突|聚集|争议/.test(txt)) effects.stability = -(5 + Math.floor(Math.random() * 10));
    if (/上级|汇报|请示|配合|领会|贯彻|落实/.test(txt)) effects.superiorEvaluation = 3 + Math.floor(Math.random() * 5);
    if (/推掉|不配合|不执行|压住|拖延|推出去/.test(txt)) effects.superiorEvaluation = -(3 + Math.floor(Math.random() * 5));

    return { cost: Object.keys(cost).length > 0 ? cost : null, effects };
  }

  // ============== 各视图渲染 ==============

  _renderOffice(c) {
    const county = stateManager.get('county');
    const brief = stateManager.get('weeklyBrief');
    const evtSys = gameEngine.getSystem('event');
    const activeEvents = evtSys?.getActiveEvents() || [];
    const player = stateManager.get('player');
    const gdpGrowth = county?.economy?.gdpGrowth || 0;
    const tension = county?.socialTension || 0;
    const stability = Math.max(0, 100 - tension);
    const ecoVital = county?.economy?.economicVitality ?? 50;
    const superior = county?.superiorTrust?.citySecretary ?? 50;
    const treasury = stateManager.get('finance')?.treasuryBalance ?? 0;

    // 社会行动数据
    var socialSys = gameEngine.getSystem('social');
    var pendingActions = socialSys ? socialSys.getPendingActions() : [];
    var socialMob = stateManager.get('socialMobilization');
    var activeGroupsList = (socialMob && socialMob.activeGroups) || [];
    var actionLevelIcons = ['', '✉️', '📋', '⚡', '🚧', '🔥'];
    var actionLevelNames = ['', '来信来访', '集体上访', '罢工罢市', '堵路集会', '群体事件'];

    c.innerHTML = `
      <div class="kpi-strip">
        <span class="kpi-item ${stability > 60 ? 'kpi-up' : stability < 40 ? 'kpi-down' : ''}">
          🏘 稳定 <b>${Math.round(stability)}</b>
        </span>
        <span class="kpi-item ${ecoVital > 60 ? 'kpi-up' : ecoVital < 40 ? 'kpi-down' : ''}">
          📈 经济 <b>${Math.round(ecoVital)}</b>
        </span>
        <span class="kpi-item ${superior > 60 ? 'kpi-up' : superior < 40 ? 'kpi-down' : ''}">
          ⭐ 上级 <b>${Math.round(superior)}</b>
        </span>
        <span class="kpi-item ${treasury > 0 ? treasury > 10000 ? 'kpi-up' : '' : 'kpi-down'}">
          💰 国库 <b>${treasury.toLocaleString()}万</b>
        </span>
      </div>
      <div style="margin-top:10px;">
        <div class="brief-section">
          <div class="brief-s-title">📋 年度路线 · ${GameEngine.STRATEGIES[gameEngine.currentStrategy]?.icon || ''} ${GameEngine.STRATEGIES[gameEngine.currentStrategy]?.name || '未选择'}</div>
          <div style="font-size:10px;color:var(--text-muted);">影响全年经济发展/社会稳定/财政压力走向</div>
        </div>
        <div class="brief-section">
          <div class="brief-s-title">⚡ 快捷操作</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div class="event-alert-card" onclick="uiManager.switchView('personnel')" style="border-left-color:var(--accent-blue);">
              <span style="font-size:10px;">👥</span>
              <span class="event-alert-name" style="font-size:11px;">干部谈话</span>
              <span class="event-alert-action">→</span>
            </div>
            <div class="event-alert-card" onclick="uiManager.switchView('map')" style="border-left-color:var(--accent-green);">
              <span style="font-size:10px;">🗺</span>
              <span class="event-alert-name" style="font-size:11px;">巡察乡镇</span>
              <span class="event-alert-action">→</span>
            </div>
            <div class="event-alert-card" onclick="uiManager.switchView('data')" style="border-left-color:#eab308;">
              <span style="font-size:10px;">💰</span>
              <span class="event-alert-name" style="font-size:11px;">审阅财政</span>
              <span class="event-alert-action">→</span>
            </div>
            <div class="event-alert-card" onclick="uiManager.switchView('committee')" style="border-left-color:var(--accent-purple);">
              <span style="font-size:10px;">🏛</span>
              <span class="event-alert-name" style="font-size:11px;">召开常委会</span>
              <span class="event-alert-action">→</span>
            </div>
          </div>
        </div>
        <div class="brief-section">
          <div class="brief-s-title" style="margin-top:8px;">⚠️ 待处理事项</div>
          <div class="brief-items">
            ${activeEvents.length > 0 ? activeEvents.slice(0, 5).map(e => `
              <div class="event-alert-card" onclick="uiManager.showDecisionModal(gameEngine.getSystem('event')._events.find(ev => ev.id === '${e.id}') || e)">
                <span class="event-alert-type ae-${e.type}">${({routine:'日常',petition:'上访',emergency:'紧急',superior_task:'上级',personnel:'人事'})[e.type] || e.type}</span>
                <span class="event-alert-name">${e.name}</span>
                <span class="event-alert-action">→</span>
              </div>`).join('') : '<div class="empty-state" style="padding:16px;">✅ 暂无待处理事件</div>'}
          </div>
        </div>
        ${pendingActions.length > 0 ? `
        <div class="brief-section">
          <div class="brief-s-title" style="margin-top:8px;color:var(--accent-red);">🚨 待处理社会行动</div>
          <div class="brief-items">
            ${pendingActions.map(function(a) {
              var icon = actionLevelIcons[a.level] || '⚠️';
              var levelName = actionLevelNames[a.level] || '';
              var bgColor = a.level >= 4 ? 'rgba(220,38,38,0.15)' : a.level >= 3 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.04)';
              var borderColor = a.level >= 4 ? 'var(--accent-red)' : a.level >= 3 ? '#eab308' : 'rgba(255,255,255,0.1)';
              return '<div class="event-alert-card" style="background:' + bgColor + ';border-left-color:' + borderColor + ';" onclick="uiManager._showSocialActionModal(\'' + a.id + '\')">' +
                '<span class="event-alert-type" style="background:' + borderColor + '33;color:' + borderColor + ';">' + icon + ' ' + levelName + '</span>' +
                '<span class="event-alert-name">' + a.groupLabel + '</span>' +
                '<span class="event-alert-action">→</span>' +
              '</div>';
            }).join('')}
          </div>
        </div>` : ''}
        ${activeGroupsList.filter(function(g) { return g.actionLevel > 0; }).length > 0 ? `
        <div class="brief-section">
          <div class="brief-s-title" style="margin-top:8px;color:var(--accent-orange);">⚠️ 群体情绪监测</div>
          <div class="brief-items">
            ${activeGroupsList.filter(function(g) { return g.actionLevel > 0; }).slice(0, 5).map(function(g) {
              var riskColor = g.actionLevel >= 4 ? 'var(--accent-red)' : g.actionLevel >= 2 ? '#eab308' : '#9ca3af';
              return '<div class="event-alert-card" style="background:rgba(255,255,255,0.02);border-left-color:' + riskColor + ';cursor:default;">' +
                '<span class="event-alert-type" style="background:' + riskColor + '22;color:' + riskColor + ';">⬆ ' + g.mobilization + '%</span>' +
                '<span class="event-alert-name">' + g.label + '</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">怨气' + g.grievance + ' · ' + g.actionDesc + '</span>' +
              '</div>';
            }).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
  }






  _showRelationNetwork() {
    const personnel = gameEngine.getSystem('personnel');
    const members = personnel?.getCommitteeMembers() || [];
    const player = stateManager.get('player');
    const centerX = 300, centerY = 200, radius = 120;
    const svgW = 600, svgH = 400;
    let svg = '<svg width="' + svgW + '" height="' + svgH + '" style="background:transparent;"><circle cx="' + centerX + '" cy="' + centerY + '" r="30" fill="#3fb95033" stroke="#3fb950" stroke-width="2"/>';
    svg += '<text x="' + centerX + '" y="' + centerY + '" fill="#fff" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="central">书记</text>';
    const colors = ['#58a6ff','#d29922','#bc8cff','#3fb950','#f85149','#e91e63','#00bcd4','#ff9800','#795548'];
    members.forEach(function(m, i) {
      const angle = (2 * Math.PI * i) / members.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const rel = (player?.relations?.committeeMembers?.[m.id] || m.relations?.player || 50);
      const relColor = rel > 60 ? '#3fb950' : rel > 40 ? '#ca8a04' : '#f85149';
      svg += '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + x + '" y2="' + y + '" stroke="' + relColor + '" stroke-width="' + Math.max(1, rel/20) + '" opacity="0.4"/>';
      svg += '<circle cx="' + x + '" cy="' + y + '" r="26" fill="' + colors[i % colors.length] + '33" stroke="' + colors[i % colors.length] + '" stroke-width="2"/>';
      svg += '<text x="' + x + '" y="' + y + '" fill="#fff" font-size="10" font-weight="600" text-anchor="middle" dominant-baseline="central">' + m.name + '</text>';
    });
    svg += '</svg>';
    this.showDecisionModal({
      name: '🔗 常委会关系网络',
      description: '节点=委员，线色=关系质量',
      scene: svg,
      choices: [{ label: '关闭', description: '' }],
    });
  }


  _showOfficialDetail(id) {
    const personnel = gameEngine.getSystem('personnel');
    const o = personnel?.get(id);
    if (!o) return;
    const committeeIds = ['magistrate','deputy_secretary','deputy_magistrate','discipline','organization','propaganda','politics_law','united_front','office_director'];
    const isCm = committeeIds.includes(id);
    var extraInfo = '';
    if (isCm) {
      const demandLabels = { taskCompletion:'任务完成', fiscalSafety:'财政安全', economicGrowth:'经济增长', stability:'社会稳定',
        partyBuilding:'党建', cadreMgmt:'干部管理', agriculture:'三农', projectMgmt:'项目管理',
        antiCorruption:'反腐败', discipline:'纪律建设', socialStability:'社会稳定',
        unitedFront:'统战', ethnicReligion:'民族宗教', nonPublicEconomy:'民营经济', serviceGuarantee:'服务保障',
        coordination:'统筹协调', confidentiality:'保密工作', ideology:'意识形态', media:'舆论管控',
        legalSystem:'法治建设', publicSecurity:'公共安全', antiEvil:'扫黑除恶',
        reform:'改革创新', innovation:'创新', bureauManagement:'部门管理', promotion:'晋升期许' };
      const demandsStr = Object.entries(o.demands||{}).sort(function(a,b){return b[1]-a[1];}).map(function(e){return (demandLabels[e[0]]||e[0])+' '+(e[1]*100).toFixed(0)+'%';}).join(' \u00B7 ');
      extraInfo = '\n📊 投票权重：' + (o.voteWeight||1) + '票' + (demandsStr ? '\n📋 核心诉求：' + demandsStr : '');
    }

    // 操作按钮
    var player = stateManager.get('player');
    var actionButtons = '';
    if (player) {
      var tierLabel = o._managementTier === 'city' ? '市管' : '县管';
      var tierColor = o._managementTier === 'city' ? 'var(--accent-blue)' : 'var(--accent-green)';
      var apptTypeLabel = o._appointmentType === 'gov' ? '政府·需人大任命' : '党内职务';
      var isInProcess = o._appointmentStatus && o._appointmentStatus !== 'completed';
      var abHtml = '<div style="display:flex;gap:4px;margin:6px 0;">' +
        '<span style="font-size:10px;padding:2px 5px;border-radius:4px;background:' + tierColor + '22;color:' + tierColor + ';">' + tierLabel + '</span>' +
        '<span style="font-size:10px;padding:2px 5px;border-radius:4px;background:rgba(22,163,74,0.1);color:var(--accent-green);">' + apptTypeLabel + '</span>' +
        (isInProcess ? '<span style="font-size:10px;padding:2px 5px;border-radius:4px;background:rgba(234,179,8,0.1);color:#eab308;">⚙️流程中</span>' : '') +
      '</div>';
      var procBtn = isInProcess
        ? '<button class="fd-action-btn" onclick="uiManager._showAppointmentProcess(\'' + id + '\')">⚙️ 查看流程</button>'
        : '<button class="fd-action-btn" onclick="uiManager._startAppointment(\'' + id + '\')">📋 启动任免流程</button>';
      actionButtons = abHtml +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;">' +
          procBtn +
          '<button class="fd-action-btn" onclick="uiManager._talkToOfficial(\'' + id + '\')">💬 谈话</button>' +
          '<button class="fd-action-btn" onclick="uiManager._showFactionOfficialDetail(\'' + id + '\')">🔍 详细资料</button>' +
        '</div>';
    }

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="modal-card" style="max-width:450px;"><div class="mc-header">' +
      '<span class="mc-icon">👤</span><span class="mc-title">' + o.name + ' · ' + o.title + '</span>' +
      '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(37,99,235,0.1);color:var(--accent-blue);">' + (o.faction||'无派系') + '</span>' +
      (isCm ? '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(255,215,0,0.15);color:var(--accent-gold);margin-left:4px;">⭐ 常委</span>' : '') +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">' +
          '年龄' + o.age + '岁 · ' + (o.rank||'正科') +
        '</div>' +
        (extraInfo ? '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;white-space:pre-line;border-top:1px solid var(--border-color);padding-top:6px;">' + extraInfo + '</div>' : '') +
        actionButtons +
      '</div></div>';
  }

  _talkToOfficial(id) {
    const personnel = gameEngine.getSystem('personnel');
    const o = personnel?.get(id);
    if (!o) return;
    const player = stateManager.get('player');
    if (!player) return;
    let relationGain = Math.floor(Math.random() * 5) + 3;
    const tMods = gameEngine._traitModifiers || {};
    if (tMods.relationBonus) relationGain = Math.round(relationGain * (1 + tMods.relationBonus));
    if (tMods.relationSpeed) relationGain = Math.round(relationGain * (1 + tMods.relationSpeed));
    if (tMods.talkEffectiveness) relationGain = Math.round(relationGain * (1 + tMods.talkEffectiveness));
    if (player.traits?.includes('diplomatic') && !tMods.relationBonus) relationGain = Math.round(relationGain * 1.3);
    if (player.traits?.includes('blunt') && !tMods.relationBonus) relationGain = Math.round(relationGain * 0.8);
    o.modifyRelation('player', relationGain);
    player.modifyRelation({type: 'committee', id}, relationGain);
    if (Math.random() < 0.15) {
      const abilKeys = Object.keys(o.abilities);
      const abil = abilKeys[Math.floor(Math.random() * abilKeys.length)];
      if (o.train) o.train(abil, 0.5);
      this.showToast('与' + o.name + '谈话，关系+' + relationGain + '，能力小幅提升', 'success');
    } else {
      this.showToast('与' + o.name + '谈话，关系+' + relationGain, 'success');
    }
    this._addEventLog('info', '干部谈话', '与' + o.name + '（' + o.title + '）谈话，关系+' + relationGain);
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
  }


  _showEnterpriseDetail(id) {
    const economy = gameEngine.getSystem('economy');
    const e = economy?.getEnterprises().find(function(ent) { return ent.id === id; });
    if (!e) return;
    const demandsList = e.demands ? e.demands.map(function(d) { return '\u00B7 ' + d; }).join('\n') : '\u65E0';
    const town = (stateManager.get('county')?.towns || []).find(function(t) { return t.id === e.townId; });
    const locStr = town ? '\uF09F\u2597\u2598 ' + town.name + ' \u00B7 ' + (e.sectorName || '') : '\uF09F\u2597\u2598 \u4F4D\u7F6E\u672A\u77E5';
    this.showDecisionModal({
      name: e.name + ' \u00B7 \u8BE6\u7EC6\u8D44\u6599',
      description: locStr + '\n\u884C\u4E1A\uFF1A' + e.industry + '\n\u5458\u5DE5\uFF1A' + e.employees + '\u4EBA | \u4EA7\u503C\uFF1A' + e.annualOutput + '\u4E07 | \u5229\u6DA6\uFF1A' + e.annualProfit + '\u4E07\n\u7A0E\u6536\uFF1A' + e.annualTax + '\u4E07 | \u8D1F\u503A\uFF1A' + e.debt + '\u4E07 | \u8D44\u4EA7\uFF1A' + e.assets + '\u4E07',
      scene: '\u8D1F\u503A\u7387\uFF1A' + (e.getDebtRatio ? e.getDebtRatio().toFixed(0) : 0) + '%\n\u6BDB\u5229\u7387\uFF1A' + (e.getProfitMargin ? e.getProfitMargin().toFixed(0) : 0) + '%\n\u8BC9\u6C42\uFF1A\n' + demandsList,
      choices: [{ label: '\u5173\u95ED', description: '' }],
    });
  }
  _renderPersonnel(c) {
    const personnel = gameEngine.getSystem('personnel');
    const officials = personnel?.getAll() || [];
    const members = personnel?.getCommitteeMembers() || [];
    var cityManaged = personnel ? personnel.getCityManaged() : [];
    var countyManaged = personnel ? personnel.getCountyManaged() : [];

    // Tab切换
    var activeTab = this._personnelTab || 'city';
    function tabClass(t) { return activeTab === t ? 'fv-tab active' : 'fv-tab'; }

    c.innerHTML = '<div class="section-header">👥 干部名录 · 人事管理</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
        '<div class="info-card" style="padding:6px 10px;flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;">' + members.length + '</div><div style="font-size:10px;color:var(--text-muted);">常委会（市管）</div></div>' +
        '<div class="info-card" style="padding:6px 10px;flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;">' + countyManaged.length + '</div><div style="font-size:10px;color:var(--text-muted);">部门负责人（县管）</div></div>' +
        '<div class="info-card" style="padding:6px 10px;flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;">' + Math.round((stateManager.get('personnel')||{}).morale||0) + '</div><div style="font-size:10px;color:var(--text-muted);">干部士气</div></div>' +
      '</div>' +
      '<div class="fv-tabs" style="display:flex;gap:4px;margin-bottom:8px;">' +
        '<button class="' + tabClass('city') + '" onclick="uiManager._personnelTab=\'city\';uiManager.renderView(\'personnel\')">🏛 市管干部 (' + cityManaged.length + ')</button>' +
        '<button class="' + tabClass('county') + '" onclick="uiManager._personnelTab=\'county\';uiManager.renderView(\'personnel\')">📋 县管干部 (' + countyManaged.length + ')</button>' +
        '<button class="' + tabClass('process') + '" onclick="uiManager._personnelTab=\'process\';uiManager.renderView(\'personnel\')">⚙️ 任免流程</button>' +
        '<button style="margin-left:auto;" class="fv-tab" onclick="uiManager._showRelationNetwork()">🔗 关系网络</button>' +
      '</div>';

    if (activeTab === 'process') {
      // 显示进行中的任免流程
      var inProcess = officials.filter(function(o) { return o._appointmentStatus && o._appointmentStatus !== 'completed'; });
      if (inProcess.length === 0) {
        c.innerHTML += '<div class="empty-state" style="padding:20px;">📋 当前没有进行中的任免流程<br><span style="font-size:11px;color:var(--text-muted);">在干部详情中点击"启动任免流程"开始</span></div>';
      } else {
        c.innerHTML += '<div class="brief-section"><div class="brief-s-title">⚙️ 进行中</div><div class="brief-items">' +
          inProcess.map(function(o) {
            var p = personnel.getAppointmentProcess(o.id);
            var issueCount = (p && p.irregularities) ? p.irregularities.length : 0;
            return '<div class="event-alert-card" onclick="uiManager._showAppointmentProcess(\'' + o.id + '\')">' +
              '<span class="event-alert-type">' + (o._managementTier === 'city' ? '🏛' : '📋') + '</span>' +
              '<span class="event-alert-name">' + o.name + ' · ' + o.title + '</span>' +
              '<span style="font-size:10px;color:var(--accent-cyan);">' + (p ? p.statusLabel : '?') + '</span>' +
              (issueCount > 0 ? '<span style="font-size:10px;color:var(--accent-red);">⚠️' + issueCount + '</span>' : '') +
              '<span class="event-alert-action">→</span></div>';
          }).join('') + '</div></div>';
      }
      return;
    }

    var displayList = activeTab === 'city' ? cityManaged : countyManaged;
    c.innerHTML += '<div class="personnel-grid">' +
      displayList.map(function(o) {
        var tierIcon = o._managementTier === 'city' ? '🏛' : '📋';
        var isInProcess = o._appointmentStatus && o._appointmentStatus !== 'completed';
        var processBadge = isInProcess ? '<span style="font-size:9px;padding:1px 4px;border-radius:3px;background:var(--accent-cyan);color:#fff;margin-left:4px;">流程中</span>' : '';
        var apptIcon = o._appointmentType === 'gov' ? '🏛' : '🚩';
        return '<div class="personnel-card" onclick="uiManager._showOfficialDetail(\'' + o.id + '\')">' +
          '<div class="pc-header"><span class="pc-name">' + o.name + '</span>' + processBadge +
          '<span class="pc-rank">' + (o.rank||'正科') + '</span></div>' +
          '<div class="pc-title">' + tierIcon + ' ' + o.title + ' <span style="font-size:9px;color:var(--text-muted);">' + (o._managementTier === 'city' ? '市管' : '县管') + ' · ' + (o._appointmentType === 'gov' ? '政府' : '党内') + '</span></div>' +
          '<div class="pc-desc">派系：' + (o.faction||'无') + ' | 年龄：' + (o.age||'—') + '岁 | 对书记 ' + Math.round((o.relations||{}).player||50) + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  _showTownDetail(townId) {
    const county = stateManager.get('county');
    const town = county?.towns?.find(function(t){return t.id===townId;});
    if (!town) return;
    const sectors = town.sectors || [];
    const economy = gameEngine.getSystem('economy');
    const enterprises = economy?.getEnterprises() || [];
    const townEnts = enterprises.filter(function(e){return e.townId===townId;});
    var popWan = (town.population / 10000).toFixed(1);
    var gdpYi = (town.gdp / 10000).toFixed(1);

    // 概况
    var profileIcons = { urban: '🏙', industrial: '🏭', agricultural: '🌾', tourism: '🏔', mixed: '🏘' };
    var profileNames = { urban: '县城综合型', industrial: '工业主导型', agricultural: '农业主导型', tourism: '旅游特色型', mixed: '综合发展型' };
    var icon = profileIcons[town.profile] || '🏘';
    var pName = profileNames[town.profile] || '综合型';

    // 稳定度颜色
    function stabColor(s) { return s > 70 ? 'var(--accent-green)' : s > 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'; }

    // 产业卡片（精简版：只显示名称和类型）
    function buildSectorCard(s, ent) {
      var hasClick = ent ? 'cursor:pointer;' : '';
      var clickAttr = ent ? 'onclick="uiManager._showEnterpriseDetail(\'' + ent.id + '\')"' : '';
      var typeIcons = { agriculture: '🌾', industry: '🏭', service: '🏪', tourism: '🏔' };
      var typeColors = { agriculture: 'var(--accent-green)', industry: 'var(--accent-red)', service: 'var(--accent-blue)', tourism: 'var(--accent-orange)' };
      var typeLabels = { agriculture: '农业', industry: '工业', service: '服务业', tourism: '旅游业' };
      var icon = typeIcons[s.type] || '📋';
      var color = typeColors[s.type] || 'var(--accent-blue)';
      var label = typeLabels[s.type] || s.type;

      return '<div style="padding:6px 10px;border-left:3px solid ' + color + ';border-radius:4px;margin-bottom:4px;background:var(--bg-card);display:flex;justify-content:space-between;align-items:center;' + hasClick + '" ' + clickAttr + '>' +
        '<span style="font-size:12px;">' + icon + ' ' + s.name + '</span>' +
        '<span style="font-size:10px;padding:1px 6px;border-radius:3px;color:' + color + ';">' + label + '</span>' +
        (ent ? '<span style="font-size:9px;color:var(--accent-blue);margin-left:auto;margin-right:4px;">🏢</span>' : '') +
      '</div>';
    }

    var sectorHtml = sectors.map(function(s) {
      var ent = townEnts.find(function(e){return e.sectorId === s.id;});
      return buildSectorCard(s, ent);
    }).join('') || '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:11px;">暂无产业数据</div>';

    // 弹窗
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="modal-card" style="max-width:520px;"><div class="mc-header">' +
      '<span class="mc-icon">' + icon + '</span>' +
      '<span class="mc-title">' + town.name + ' · ' + (town.type || '镇') + '</span>' +
      '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(37,99,235,0.1);color:var(--accent-blue);margin-right:8px;">' + pName + '</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        // 关键指标（带数据源标记）
        '<div style="font-size:8px;color:var(--text-muted);margin-bottom:6px;text-align:right;"><span style="background:rgba(57,210,192,0.15);color:var(--accent-cyan);padding:1px 5px;border-radius:3px;">🟢 实时</span> <span style="background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px;">⚪ 静态</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">' +
          '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;text-align:center;">' +
            '<div style="font-size:9px;color:var(--text-muted);">人口 <span style="font-size:8px;">⚪静态</span></div>' +
            '<div style="font-size:16px;font-weight:600;">' + popWan + '<span style="font-size:10px;font-weight:400;color:var(--text-muted);">万</span></div>' +
          '</div>' +
          '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;text-align:center;">' +
            '<div style="font-size:9px;color:var(--text-muted);">GDP <span style="font-size:8px;color:var(--accent-cyan);">🟢实时</span></div>' +
            '<div style="font-size:16px;font-weight:600;">' + gdpYi + '<span style="font-size:10px;font-weight:400;color:var(--text-muted);">亿</span></div>' +
          '</div>' +
          '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;text-align:center;">' +
            '<div style="font-size:9px;color:var(--text-muted);">稳定度 <span style="font-size:8px;color:var(--accent-cyan);">🟢实时</span></div>' +
            '<div style="font-size:16px;font-weight:600;color:' + stabColor(town.stability || 60) + ';">' + (town.stability || 60) + '</div>' +
          '</div>' +
        '</div>' +
        // 稳定度/满意度的进度条
        '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:2px;">' +
            '<span>社会满意度</span><span>' + (town.satisfaction || 60) + '%</span>' +
          '</div>' +
          '<div style="height:4px;background:var(--border-color);border-radius:2px;overflow:hidden;">' +
            '<div style="height:100%;width:' + (town.satisfaction || 60) + '%;background:' + stabColor(town.satisfaction || 60) + ';border-radius:2px;transition:width 0.3s;"></div>' +
          '</div>' +
        '</div>' +
        // 产业列表标题
        '<div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;">🏭 产业地块（' + sectors.length + '个）' +
          '<span style="font-size:8px;font-weight:400;color:var(--text-muted);margin-left:6px;">产业数据由县层面汇总</span>' +
        '</div>' +
        sectorHtml +
        // GDP构成（简单饼图替代：用文字比例）
        '<div style="margin-top:8px;font-size:10px;color:var(--text-muted);">' +
          '产业类型分布：' +
          (function() {
            var types = {};
            for (var si = 0; si < sectors.length; si++) {
              var st = sectors[si].type || 'other';
              types[st] = (types[st] || 0) + 1;
            }
            var parts = [];
            for (var t in types) {
              parts.push(({agriculture:'🌾农业',industry:'🏭工业',service:'🏪服务业',tourism:'🏔旅游业'})[t]||t + '×' + types[t]);
            }
            return parts.join(' · ') || '暂无';
          })() +
        '</div>' +
      '</div></div>';
  }

  _renderMap(c) {
    var county = stateManager.get('county');
    var towns = county?.towns || [];
    if (!c || towns.length === 0) {
      c.innerHTML = '<div class="section-header">🗺 县域地图</div><div style="padding:24px;text-align:center;color:var(--text-muted);">暂无乡镇数据</div>';
      return;
    }

    var self = this;
    var mapW = 600, mapH = 500;
    var totalPop = 0, totalGdp = 0;
    for (var i = 0; i < towns.length; i++) {
      totalPop += (towns[i].population || 0);
      totalGdp += (towns[i].gdp || 0);
    }

    // 乡镇位置（按TOWN_PROFILES顺序，15个）
    var TOWN_POS = [
      { id: 'town_0',  name: '城关镇', x: 310, y: 200 },  // 县城中心
      { id: 'town_1',  name: '红旗镇', x: 380, y: 220 },  // 县城东侧工业园
      { id: 'town_2',  name: '丰收镇', x: 300, y: 310 },  // 南部农业区
      { id: 'town_3',  name: '东风镇', x: 460, y: 230 },  // 东部化工区
      { id: 'town_4',  name: '新民镇', x: 370, y: 360 },  // 南综合
      { id: 'town_5',  name: '柳河镇', x: 240, y: 380 },  // 南沿河
      { id: 'town_6',  name: '双桥镇', x: 440, y: 300 },  // 东南综合
      { id: 'town_7',  name: '杨树镇', x: 180, y: 290 },  // 西农业
      { id: 'town_8',  name: '青石镇', x: 520, y: 280 },  // 最东建材
      { id: 'town_9',  name: '河口乡', x: 290, y: 430 },  // 最南
      { id: 'town_10', name: '松岭乡', x: 240, y: 60  },  // 北山区
      { id: 'town_11', name: '龙湾乡', x: 110, y: 230 },  // 西畜牧
      { id: 'town_12', name: '白云乡', x: 150, y: 120 },  // 西北古镇
      { id: 'town_13', name: '曙光乡', x: 190, y: 180 },  // 中西北综合
      { id: 'town_14', name: '前进乡', x: 70,  y: 350 },  // 最西
    ];

    // 道路网络: [起点索引, 终点索引, 道路类型]
    var ROADS = [
      [10, 12, 'county'],  // 松岭↔白云 县道
      [12, 13, 'county'],  // 白云↔曙光 县道
      [13, 0,  'province'], // 曙光↔城关 省道（北线入城）
      [11, 13, 'county'],  // 龙湾↔曙光 县道
      [11, 7,  'county'],  // 龙湾↔杨树 县道
      [7, 0,   'province'], // 杨树↔城关 省道（西线入城）
      [14, 11, 'county'],  // 前进↔龙湾 县道
      [14, 7,  'county'],  // 前进↔杨树 县道
      [0, 1,   'national'], // 城关↔红旗 国道（县城主干线）
      [0, 13,  'province'], // 城关↔曙光 省道
      [1, 3,   'province'], // 红旗↔东风 省道（工业走廊）
      [1, 6,   'county'],  // 红旗↔双桥 县道
      [6, 8,   'county'],  // 双桥↔青石 县道
      [3, 8,   'province'], // 东风↔青石 省道（工业走廊东段）
      [0, 2,   'national'], // 城关↔丰收 国道（南线）
      [2, 4,   'county'],  // 丰收↔新民 县道
      [2, 5,   'province'], // 丰收↔柳河 省道
      [5, 9,   'county'],  // 柳河↔河口 县道
      [4, 9,   'county'],  // 新民↔河口 县道
      [6, 4,   'county'],  // 双桥↔新民 县道
    ];

    // 地形区域多边形
    var TERRAIN = [
      { name: '北部山区', color: '#2d1b00', polygon: '30,20 270,20 300,90 260,140 200,130 100,110 30,80' },
      { name: '农业平原', color: '#002d1a', polygon: '40,200 200,180 300,280 400,380 250,460 50,420 20,300' },
      { name: '工业走廊', color: '#1a002d', polygon: '350,190 520,200 550,300 450,320 380,250' },
    ];

    // 河流路径
    var RIVER = 'M270,20 Q260,100 250,180 Q240,280 290,380 Q300,420 290,460';

    function stabColor(stab) {
      if (stab > 70) return '#3fb950';
      if (stab > 50) return '#d29922';
      return '#f85149';
    }

    function getTownIndexByName(name) {
      for (var ti = 0; ti < towns.length; ti++) {
        if (towns[ti].name === name) return ti;
      }
      return -1;
    }

    // 构建SVG
    var svgParts = ['<svg viewBox="0 0 ' + mapW + ' ' + mapH + '" style="width:100%;height:auto;">'];

    // 底图
    svgParts.push('<rect width="' + mapW + '" height="' + mapH + '" class="map-bg" rx="8"/>');

    // 地形区域
    for (var ti = 0; ti < TERRAIN.length; ti++) {
      svgParts.push('<polygon points="' + TERRAIN[ti].polygon + '" fill="' + TERRAIN[ti].color + '" class="map-terrain"/>');
    }

    // 区域标签
    svgParts.push('<text x="130" y="80" class="map-region-label" font-size="10" font-family="var(--font-sans)">🏔 北部山区</text>');
    svgParts.push('<text x="100" y="330" class="map-region-label" font-size="10" font-family="var(--font-sans)">🌾 农业平原</text>');
    svgParts.push('<text x="420" y="260" class="map-region-label" font-size="10" font-family="var(--font-sans)">🏭 工业走廊</text>');

    // 河流
    svgParts.push('<path d="' + RIVER + '" fill="none" class="map-river" stroke-width="4" opacity="0.2"/>');
    svgParts.push('<path d="' + RIVER + '" fill="none" class="map-river" stroke-width="2" opacity="0.4" stroke-dasharray="8,4"/>');

    // 河流标签
    svgParts.push('<text x="260" y="100" class="map-river" font-size="9" opacity="0.3" font-family="var(--font-sans)" transform="rotate(-15,260,100)">柳河</text>');

    // 道路
    var roadColors = { national: '#d29922', province: '#d97706', county: '#3fb950' };
    var roadWidths = { national: 3, province: 2, county: 1 };
    var roadDash = { national: '', province: '', county: '5,3' };

    for (var ri = 0; ri < ROADS.length; ri++) {
      var road = ROADS[ri];
      var fromPos = TOWN_POS[road[0]];
      var toPos = TOWN_POS[road[1]];
      if (!fromPos || !toPos) continue;
      var rType = road[2];
      var color = roadColors[rType] || '#3fb950';
      var width = roadWidths[rType] || 1;
      var dash = roadDash[rType] || '';
      svgParts.push('<line x1="' + fromPos.x + '" y1="' + fromPos.y + '" x2="' + toPos.x + '" y2="' + toPos.y + '" ' +
        'stroke="' + color + '" stroke-width="' + width + '" opacity="0.5" ' +
        (dash ? 'stroke-dasharray="' + dash + '"' : '') + ' class="map-road"/>');
    }

    // 国道标注
    svgParts.push('<text x="350" y="260" fill="#d29922" font-size="8" opacity="0.4" font-family="var(--font-sans)">G107</text>');

    // 城外方向标识
    svgParts.push('<text x="555" y="290" class="map-exit-sign" font-size="9" font-family="var(--font-sans)">→ 市区</text>');
    svgParts.push('<text x="30" y="370" class="map-exit-sign" font-size="9" font-family="var(--font-sans)">→ 邻县</text>');

    // 每个乡镇节点
    for (var ti = 0; ti < towns.length; ti++) {
      var t = towns[ti];
      var posIdx = -1;
      for (var pi = 0; pi < TOWN_POS.length; pi++) {
        if (TOWN_POS[pi].name === t.name) { posIdx = pi; break; }
      }
      if (posIdx === -1) continue;
      var pos = TOWN_POS[posIdx];

      var color = stabColor(t.stability || 60);
      var r = Math.max(16, Math.min(36, 18 + ((t.population || 0) / 100000) * 14));
      var sectorCount = (t.sectors ? t.sectors.length : 0);
      var profileMap = { urban: '🏙', industrial: '🏭', agricultural: '🌾', tourism: '🏔', mixed: '🏘' };
      var icon = profileMap[t.profile] || '🏘';
      var gdpYi = ((t.gdp || 0) / 10000).toFixed(1);

      // 镇域范围圈（半透明背景）
      svgParts.push('<circle cx="' + pos.x + '" cy="' + pos.y + '" r="' + (r + 12) + '" fill="' + color + '" opacity="0.04"/>');

      // 主圆点
      svgParts.push('<circle cx="' + pos.x + '" cy="' + pos.y + '" r="' + r + '" ' +
        'fill="' + color + '" opacity="0.15" stroke="' + color + '" stroke-width="2" ' +
        'class="map-town-dot" ' +
        'onclick="uiManager._showTownDetail(\'' + t.id + '\')" ' +
        'style="cursor:pointer;"/>');

      // 乡镇名
      svgParts.push('<text x="' + pos.x + '" y="' + (pos.y - r - 6) + '" ' +
        'text-anchor="middle" class="map-town-name" font-size="11" font-weight="600" ' +
        'font-family="var(--font-sans)" style="pointer-events:none;">' + icon + ' ' + t.name + '</text>');

      // 人口
      svgParts.push('<text x="' + pos.x + '" y="' + (pos.y + 4) + '" ' +
        'text-anchor="middle" class="map-town-stat" font-size="10" ' +
        'font-family="var(--font-sans)" style="pointer-events:none;">' + ((t.population || 0) / 10000).toFixed(1) + '万</text>');

      // GDP
      svgParts.push('<text x="' + pos.x + '" y="' + (pos.y + 16) + '" ' +
        'text-anchor="middle" class="map-town-stat" font-size="8" ' +
        'font-family="var(--font-sans)" style="pointer-events:none;">' + gdpYi + '亿</text>');
    }

    // 右下角图例
    svgParts.push(
      '<rect x="440" y="440" width="150" height="52" rx="6" class="map-legend-box"/>' +
      '<text x="448" y="456" class="map-region-label" font-size="9" font-family="var(--font-sans)">🟢 稳定 >70</text>' +
      '<text x="448" y="470" class="map-region-label" font-size="9" font-family="var(--font-sans)">🟡 一般 50-70</text>' +
      '<text x="448" y="484" class="map-region-label" font-size="9" font-family="var(--font-sans)">🔴 紧张 &lt;50</text>'
    );

    svgParts.push('</svg>');

    // ===== 右侧面板 =====
    var townCards = towns.map(function(t) {
      var color = stabColor(t.stability || 60);
      var popStr = ((t.population || 0) / 10000).toFixed(1) + '万';
      var entCount = (t.sectors ? t.sectors.length : 0);
      var gdpStr = ((t.gdp || 0) / 10000).toFixed(1) + '亿';
      var icons = { urban: '🏙', industrial: '🏭', agricultural: '🌾', tourism: '🏔', mixed: '🏘' };
      var icon = icons[t.profile] || '🏘';
      return '<div class="map-town-card" onclick="uiManager._showTownDetail(\'' + t.id + '\')">' +
        '<div class="mtc-dot" style="background:' + color + '"></div>' +
        '<div class="mtc-name">' + icon + ' ' + t.name + '</div>' +
        '<div class="mtc-stat">👥 ' + popStr + '</div>' +
        '<div class="mtc-stat">💰 ' + gdpStr + '</div>' +
        '<div class="mtc-ent">🏭 ' + entCount + '</div>' +
        '</div>';
    }).join('');

    c.innerHTML = '' +
      '<div class="section-header">🗺 ' + (county?.name || '') + ' · 县域地图' +
        '<span style="font-size:10px;font-weight:400;margin-left:8px;color:var(--text-muted);">' + towns.length + '个乡镇 · ' + (totalPop / 10000).toFixed(1) + '万人 · ' + (totalGdp / 10000).toFixed(1) + '亿</span>' +
      '</div>' +
      '<div style="display:flex;gap:12px;">' +
        '<div class="map-svg-container" style="flex:1;">' +
          svgParts.join('\n') +
        '</div>' +
        '<div class="map-sidebar">' +
          '<div class="map-info-bar">' +
            '<span>📍 辖区 <strong>' + towns.length + '</strong>个乡镇</span>' +
            '<span>👥 总人口 <strong>' + (totalPop / 10000).toFixed(1) + '万</strong></span>' +
            '<span>💰 总产值 <strong>' + (totalGdp / 10000).toFixed(1) + '亿</strong></span>' +
          '</div>' +
          '<div class="map-town-list" id="map-town-list">' + townCards + '</div>' +
        '</div>' +
      '</div>';
  }

  /** Show member interaction menu - v2 */
  /** 日常互动面板（常委会界面）—— 不涉及投票 */
  _showDailyInteractions(officialId) {
    const personnel = gameEngine.getSystem('personnel');
    const o = personnel?.get(officialId);
    if (!o) return;

    var loy = o._loyalty != null ? o._loyalty : 50;
    var statusLine = '当前关系值：' + Math.round(o.relations?.player||50) + ' | 忠诚度：' + loy;

    function renderGroup(title, actions) {
      if (!actions || !actions.length) return '';
      var h = '<div class="int-group-header">' + title + '</div>';
      for (var i = 0; i < actions.length; i++) {
        var a = actions[i];
        var c = [];
        if (a.cost.pc) c.push('政治资本' + a.cost.pc);
        if (a.cost.money) c.push('财政' + a.cost.money + '万');
        var cs = c.length ? c.join(' + ') : '免费';
        var rt = a.risk ? '<span class="int-risk"> ' + a.risk + '</span>' : '';
        var onclick = "uiManager._executeMemberInteraction('" + officialId + "','" + a.key + "')";
        h += '<div class="int-card" onclick="' + onclick + '">' +
          '<div class="int-row"><span class="int-label">' + a.label + '</span><span class="int-cost">' + cs + '</span></div>' +
          '<div class="int-desc">' + a.desc + rt + '</div>' +
          '<div class="int-benefit">' + a.benefit + '</div></div>';
      }
      return h;
    }

    var html = '<div class="int-status">' + statusLine + '</div>';
    html += renderGroup('日常管理', [
      { key:'inspect', label:'🔍 考察', desc:'查看干部履职报告和工作状态', cost:{}, benefit:'了解详情' },
      { key:'talk', label:'💬 约谈', desc:'缓解工作压力，关心干部', cost:{}, benefit:'满意度+10' },
      { key:'commend', label:'🏆 通报表扬', desc:'常委会公开表扬', cost:{ pc:3 }, benefit:'关系+5 威信+10' },
      { key:'training', label:'🎓 党校学习', desc:'派去培训提高能力', cost:{ pc:5 }, benefit:'关系+3 能力+5' },
      { key:'amnesty', label:'🛡 容错免责', desc:'出错时出面保他', cost:{ pc:8 }, benefit:'关系+15 忠诚+20', risk:'他人觉得偏心' },
      { key:'rotate', label:'🔄 轮岗交流', desc:'调到其他部门', cost:{ pc:10 }, benefit:'切断人脉根基', risk:'招致不满' },
    ]);
    html += renderGroup('社交', [
      { key:'banquet', label:'🍽 宴请', desc:'财政30万，关系+6', cost:{ money:30 }, benefit:'关系+6', risk:'腐败+3' },
    ]);
    html += renderGroup('工作', [
      { key:'assignTask', label:'📋 指派任务', desc:'分派具体工作给此干部', cost:{}, benefit:'完成后关系+3' },
    ]);

    this.showDecisionModal({ name: o.name + ' · ' + o.title + ' 日常管理', description: '', scene: html, choices: [{ label: '关闭', description: '' }] });
  }

  /** 投票前游说面板（会前沟通）—— 全针对投票 */

  _showMemberInteractions(officialId) {
    const personnel = gameEngine.getSystem('personnel');
    const o = personnel?.get(officialId);
    if (!o) return;

    var loy = o._loyalty != null ? o._loyalty : 50;
    var lev = o._leverage || 0;
    var bribe = o._bribeLevel || 0;
    var statusLine = '当前关系值：' + Math.round(o.relations?.player||50) + ' | 忠诚度：' + loy + ' | 把柄等级：' + lev;
    if (o._protected) statusLine += ' | 容错保护';
    if (o._promisedPromotion) statusLine += ' | 许诺未兑现';
    if (o._factionGroup) statusLine += ' | 圈子成员';
    if (o._bribeLevel > 0) statusLine += ' | 利益输送累计' + o._bribeLevel;
    if (o._corruptionRisk > 30) statusLine += ' | 腐败风险高';

    function renderGroup(title, actions) {
      if (!actions || !actions.length) return '';
      var h = '<div class="int-group-header">' + title + '</div>';
      for (var i = 0; i < actions.length; i++) {
        var a = actions[i];
        var c = [];
        if (a.cost.pc) c.push('政治资本' + a.cost.pc);
        if (a.cost.money) c.push('财政' + a.cost.money + '万');
        var cs = c.length ? c.join(' + ') : '免费';
        var rt = a.risk ? '<span class="int-risk"> ' + a.risk + '</span>' : '';
        var onclick = "uiManager._executeMemberInteraction('" + officialId + "','" + a.key + "')";
        h += '<div class="int-card" onclick="' + onclick + '">' +
          '<div class="int-row"><span class="int-label">' + a.label + '</span><span class="int-cost">' + cs + '</span></div>' +
          '<div class="int-desc">' + a.desc + rt + '</div>' +
          '<div class="int-benefit">' + a.benefit + '</div></div>';
      }
      return h;
    }

    var html = '<div class="int-status">' + statusLine + '</div>';
    html += renderGroup('正面激励', [
      { key:'commend', label:'通报表扬', desc:'常委会公开表扬', cost:{ pc:3 }, benefit:'关系+5 威信+10', effects:{ relation:5, staffTrust:10 } },
      { key:'training', label:'党校学习', desc:'派去培训提高能力', cost:{ pc:5 }, benefit:'关系+3 能力+5', effects:{ relation:3, trainAbility:'economy', trainAmount:5 } },
      { key:'amnesty', label:'容错免责', desc:'出错时出面保他', cost:{ pc:8 }, benefit:'关系+15 忠诚+20', effects:{ relation:15, loyalty:20, protect:true }, risk:'他人觉得偏心' },
    ]);
    html += renderGroup('组织措施', [
      { key:'winOver', label:'拉拢', desc:'关系+8，支持概率提升', cost:{ pc:5 }, benefit:'关系+8 支持+0.3', effects:{ relation:8, voteBoost:0.3 } },
      { key:'suppress', label:'打压', desc:'关系-15，反对概率降低', cost:{ pc:8 }, benefit:'反对+0.4', effects:{ relation:-15, voteSuppress:0.4 } },
      { key:'warn', label:'警告', desc:'免费，弃权概率增加', cost:{}, benefit:'弃权+0.3', effects:{ relation:-5, abstainChance:0.3 } },
      { key:'rotate', label:'轮岗交流', desc:'调到其他部门', cost:{ pc:10 }, benefit:'切断人脉根基', effects:{ relation:-15, rotate:true }, risk:'招致不满' },
      { key:'militaryOrder', label:'下达军令状', desc:'立硬指标，完成后大涨', cost:{}, benefit:'关系+15 政资+10', effects:{ militaryOrder:true }, risk:'失败后果严重' },
      { key:'promote', label:'推荐提拔', desc:'成为忠实支持者', cost:{ pc:12 }, benefit:'关系+20 忠诚支持', effects:{ relation:20, loyalty:true } },
    ]);
    html += renderGroup('灰色手段', [
      { key:'banquet', label:'宴请', desc:'财政30万，关系+6', cost:{ money:30 }, benefit:'关系+6', effects:{ relation:6, corruptionRisk:3 }, risk:'腐败+3' },
      { key:'bribe', label:'利益输送', desc:'安排家属工作/批地', cost:{ money:100 }, benefit:'关系+12 忠诚+10', effects:{ relation:12, loyalty:10, bribeLevel:15 }, risk:'腐败+15' },
      { key:'leverage', label:'拿捏把柄', desc:'收集黑料以控制', cost:{ pc:15 }, benefit:'把柄等级+40', effects:{ leverage:40, relation:-5 }, risk:'被发现则关系-30' },
      { key:'promise', label:'许诺升迁', desc:'私下承诺提拔', cost:{}, benefit:'关系+10 忠诚+8', effects:{ relation:10, loyalty:8, promise:true }, risk:'难兑现反噬' },
      { key:'formFaction', label:'拉帮结派', desc:'组圈子集体投票', cost:{ pc:8 }, benefit:'集体占票掩护', effects:{ faction:true }, risk:'暴露则案子' },
    ]);

    this.showDecisionModal({ name: o.name + ' ' + o.title + ' 互动', description: '', scene: html, choices: [{ label: '关闭', description: '' }] });
  }

  /** Execute interaction v2 */
  _executeMemberInteraction(officialId, actionKey) {
    const p = gameEngine.getSystem('personnel');
    const o = p?.get(officialId);
    const player = stateManager.get('player');
    const fin = stateManager.get('finance');
    if (!o || !player) return;

    var defs = {
      commend:  { label:'通报表扬', cost:{ pc:3 }, effects:{ relation:5, staffTrust:10 } },
      training: { label:'党校学习', cost:{ pc:5 }, effects:{ relation:3, trainAbility:'economy', trainAmount:5 } },
      amnesty:  { label:'容错免责', cost:{ pc:8 }, effects:{ relation:15, loyalty:20, protect:true } },
      winOver:  { label:'拉拢', cost:{ pc:5 }, effects:{ relation:8, voteBoost:0.3 } },
      suppress: { label:'打压', cost:{ pc:8 }, effects:{ relation:-15, voteSuppress:0.4 } },
      warn:     { label:'警告', cost:{}, effects:{ relation:-5, abstainChance:0.3 } },
      rotate:   { label:'轮岗交流', cost:{ pc:10 }, effects:{ relation:-15, rotate:true } },
      militaryOrder:{ label:'军令状', cost:{}, effects:{ militaryOrder:true } },
      promote:  { label:'推荐提拔', cost:{ pc:12 }, effects:{ relation:20, loyalty:true } },
      banquet:  { label:'宴请', cost:{ money:30 }, effects:{ relation:6, corruptionRisk:3 } },
      bribe:    { label:'利益输送', cost:{ money:100 }, effects:{ relation:12, loyalty:10, bribeLevel:15 } },
      leverage: { label:'拿捏把柄', cost:{ pc:15 }, effects:{ leverage:40, relation:-5 } },
      promise:  { label:'许诺升迁', cost:{}, effects:{ relation:10, loyalty:8, promise:true } },
      formFaction:{ label:'拉帮结派', cost:{ pc:8 }, effects:{ faction:true } },
    };
    var act = defs[actionKey];
    if (!act) return;
    if (act.cost.pc && (player.politicalCapital||0) < act.cost.pc) { this.showToast('政治资本不足！需要' + act.cost.pc + '点', 'warning'); return; }
    if (act.cost.money && (fin?.treasuryBalance||0) < act.cost.money) { this.showToast('国库余额不足！需要' + act.cost.money + '万', 'warning'); return; }
    if (act.cost.pc) player.politicalCapital -= act.cost.pc;
    if (act.cost.money) fin.treasuryBalance -= act.cost.money;

    var e = act.effects;
    if (e.relation) o.modifyRelation('player', e.relation);
    if (e.voteBoost) o._voteBoost = (o._voteBoost||0) + e.voteBoost;
    if (e.voteSuppress) o._voteSuppress = (o._voteSuppress||0) + e.voteSuppress;
    if (e.abstainChance) o._abstainChance = (o._abstainChance||0) + e.abstainChance;
    if (e.loyalty === true) o._loyal = true;
    if (typeof e.loyalty === 'number') o._loyalty = Math.min(100, (o._loyalty||50) + e.loyalty);
    if (e.staffTrust) o.relations.staffTrust = Math.min(100, (o.relations.staffTrust||60) + e.staffTrust);
    if (e.trainAbility && e.trainAmount) { o.train(e.trainAbility, e.trainAmount); this._addEventLog('info', '干部培训', o.name + '参加党校培训'); }
    if (e.protect) { o._protected = true; this._addEventLog('important', '干部保护', '您出面保了' + o.name); }
    if (e.rotate) { var ds = ['发改局(粮食和物资储备局)','教育局','财政局','交通局','市场监管局(知识产权局)','人社局']; this.showToast(o.name + '被调往' + ds[Math.floor(Math.random()*ds.length)], 'info'); this._addEventLog('info', '人事调动', o.name + '轮岗'); }
    if (e.militaryOrder) { o._militaryOrder = { progress:0, deadline:{ year:timeSystem?.year||2026, month:(timeSystem?.month||1)+3 } }; this._addEventLog('important', '军令状', o.name + '立下军令状'); }
    if (e.bribeLevel) { o._bribeLevel = (o._bribeLevel||0) + e.bribeLevel; o._corruptionRisk = (o._corruptionRisk||0) + e.bribeLevel; player.corruption = player.corruption||{level:0}; player.corruption.level = Math.min(100, (player.corruption.level||0)+Math.round(e.bribeLevel/3)); }
    if (e.leverage) { o._leverage = Math.min(100, (o._leverage||0) + e.leverage); this._addEventLog('warning', '秘密', '您获得了' + o.name + '的把柄'); }
    if (e.promise) { o._promisedPromotion = true; o._promiseDeadline = { year:timeSystem?.year||2026, month:(timeSystem?.month||1)+6 }; this._addEventLog('info', '私下许诺', '您向' + o.name + '许诺提拔'); }
    if (e.faction) { o._factionGroup = 'faction_'+Date.now(); this.showToast(o.name + '加入了您的利益圈子', 'success'); this._addEventLog('important', '派系', o.name + '加入利益圈子'); }
    if (e.corruptionRisk && player.corruption) player.corruption.level = Math.min(100, (player.corruption.level||0) + e.corruptionRisk);

    this._addEventLog('info', '干部互动', '对' + o.name + '执行"' + act.label + '"');
    this.showToast('对' + o.name + act.label + '完成', 'success');
    // 如果是从会前沟通进来的，回到沟通界面刷新状态
    if (this._lobbyIssueId) {
      this._showPreVoteLobby(this._lobbyIssueId);
    } else {
      document.getElementById('modal-overlay')?.classList.add('hidden');
    }
    this.refreshAll();
  }

  /** 投票游说——执行游说动作 */
  _executeLobbyAction(officialId, actionKey) {
    const p = gameEngine.getSystem('personnel');
    const o = p?.get(officialId);
    const player = stateManager.get('player');
    if (!o || !player) return;

    var rel = o.relations?.player || 50;
    var loy = o._loyalty != null ? o._loyalty : 50;
    var lev = o._leverage || 0;
    var successChance = Math.min(95, Math.round(rel * 0.3 + loy * 0.3 + lev * 0.4));

    // 处理利益输送（单独走腐败逻辑）
    if (actionKey === 'lobby_bribe') {
      var finance = stateManager.get('finance');
      if (!finance || (finance.treasuryBalance||0) < 50) { this.showToast('财政资金不足（需要50万）', 'warning'); return; }
      finance.treasuryBalance = Math.max(0, (finance.treasuryBalance||0) - 50);
      var corruptionRise = 5 + Math.floor(Math.random() * 11); // 5-15
      player.corruption = player.corruption || { level: 0 };
      player.corruption.level = Math.min(100, (player.corruption.level||0) + corruptionRise);
      var bribeSuccessChance = Math.min(95, successChance + 20);
      var success = Math.random() * 100 < bribeSuccessChance;
      if (success) {
        var vt = Math.random() < 0.5 ? 'support' : 'abstain';
        o._lobbyVote = vt;
        this.showToast('利益输送成功！' + o.name + '态度软化，腐败+' + corruptionRise, 'warning');
        this._addEventLog('warning', '投票游说', '对' + o.name + '利益输送' + corruptionRise + '点腐败');
      } else {
        o.modifyRelation('player', -10);
        this.showToast('利益输送失败，对方拒收，关系-10', 'error');
        this._addEventLog('warning', '投票游说', '对' + o.name + '利益输送失败');
      }
      // 刷新界面
      if (this._lobbyIssueId) {
        if (this._lobbyIssueId.indexOf('appt_') === 0) this._refreshAppointmentLobby(this._lobbyIssueId.replace('appt_', ''));
        else this._showPreVoteLobby(this._lobbyIssueId);
      }
      this.refreshAll();
      return;
    }

    // 使用把柄游说增加腐败风险
    if (lev > 0 && (actionKey === 'lobby_support' || actionKey === 'lobby_oppose')) {
      player.corruption = player.corruption || { level: 0 };
      player.corruption.level = Math.min(100, (player.corruption.level||0) + 2);
    }

    // 扣除消耗
    if (actionKey !== 'lobby_abstain') {
      if ((player.politicalCapital||0) < 3) { this.showToast('政治资本不足！需要3点', 'warning'); return; }
      player.politicalCapital -= 3;
    }

    var success = Math.random() * 100 < successChance;
    var voteTarget = actionKey === 'lobby_support' ? 'support' : actionKey === 'lobby_oppose' ? 'oppose' : 'abstain';
    var voteLabel = actionKey === 'lobby_support' ? '支持' : actionKey === 'lobby_oppose' ? '反对' : '弃权';

    if (success) {
      // 设置硬编码票型（覆盖calcVote计算结果）
      o._lobbyVote = voteTarget;
      this.showToast('游说成功！' + o.name + '将投' + voteLabel + '票', 'success');
      this._addEventLog('info', '投票游说', '成功游说' + o.name + '投' + voteLabel + '票');
    } else {
      // 游说失败，关系下降
      o.modifyRelation('player', -5);
      this.showToast('游说失败，' + o.name + '不为所动，关系-5', 'warning');
      this._addEventLog('info', '投票游说', '游说' + o.name + '投' + voteLabel + '票失败');
    }

    // 回到会前沟通界面刷新
    if (this._lobbyIssueId) {
      if (this._lobbyIssueId.indexOf('appt_') === 0) {
        var apptId = this._lobbyIssueId.replace('appt_', '');
        this._refreshAppointmentLobby(apptId);
      } else {
        this._showPreVoteLobby(this._lobbyIssueId);
      }
    }
    this.refreshAll();
  }

  _renderCommittee(c) {
    const personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    const members = personnel.getCommitteeMembers();
    c.innerHTML = `
      <div class="committee-layout">
        <div class="section-header">🏛 县委常委会（共${members.length}人）</div>
        <div class="committee-toolbar">
          <button class="action-btn" onclick="uiManager._startVoteProcess()" style="padding:8px 16px;">🗳 发起议题表决</button>
          <span style="font-size:12px;color:var(--text-secondary);margin-left:12px;">点击卡片查看详情</span>
        </div>
        <div class="committee-grid">
          ${members.map(m => {
            const topAbilities = Object.entries(m.abilities).sort((a,b) => b[1] - a[1]).slice(0, 3);
            return `
            <div class="committee-card">
              <div class="cc-header">
                <span class="cc-name">${m.name}</span>
                <span class="cc-faction ${m.faction === '书记系' ? 'cc-fac-secretary' : ''}">${m.faction}</span>
              </div>
              <div class="cc-title">${m.title}</div>
              <div class="cc-abilities">
                ${topAbilities.map(([k, v]) => `
                  <div class="cc-ability">
                    <span class="cc-ab-label">${this._abLabel(k)}</span>
                    <div class="cc-ab-bar"><div class="cc-ab-fill" style="width:${v}%"></div></div>
                    <span class="cc-ab-val">${v}</span>
                  </div>
                `).join('')}
              </div>
              <div class="cc-traits">${m.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div>
              <div style="display:flex;gap:8px;font-size:10px;color:var(--text-muted);margin:4px 0;">
                <span>🗳 ${m.voteWeight || 1}票权</span>
                <span class="${(m.relations.player || 0) > 60 ? 'c-green' : (m.relations.player || 0) < 40 ? 'c-red' : ''}">🤝 ${Math.round(m.relations.player || 0)}</span>
                <span class="${(m.workStatus?.satisfaction || 50) > 60 ? 'c-green' : (m.workStatus?.satisfaction || 50) < 40 ? 'c-red' : ''}">😊 ${Math.round(m.workStatus?.satisfaction || 50)}</span>
              </div>
                            <div class="cc-actions" style="display:flex;gap:4px;flex-wrap:wrap;">                <button class="action-btn" style="font-size:9px;padding:3px 6px;" onclick="event.stopPropagation();uiManager._talkToOfficial('${m.id}')">💬 谈心</button>                <button class="action-btn" style="font-size:9px;padding:3px 6px;" onclick="event.stopPropagation();uiManager._showOfficialDetail('${m.id}')">👤 详情</button>                <button class="action-btn" style="font-size:9px;padding:3px 6px;background:var(--accent-purple);color:#fff;" onclick="event.stopPropagation();uiManager._showDailyInteractions('${m.id}')">🎯 互动</button>              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  _abLabel(k) {
    const map = {
      politics: '政治', economy: '经济', personnel: '用人', crisis: '危机',
      integrity: '廉洁', profession: '专业', execution: '执行', coordination: '协调',
      innovation: '创新',
    };
    return map[k] || k;
  }

  // ============== 常委会表决流程 ==============

  /** 第一步：选择议题类别——消耗政治资本5点 */
  _startVoteProcess() {
    const player = stateManager.get('player');
    if (!player) return;
    // 召开常委会需要5点政治资本
    if ((player.politicalCapital || 0) < 5) {
      this.showToast('政治资本不足（需要5点），无法召开常委会', 'warning');
      return;
    }
    player.politicalCapital -= 5;
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:620px;">
        <div class="mc-header">
          <span class="mc-icon">🗳</span>
          <span class="mc-title">发起常委会表决 — 选择议题类别</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body">
          <div class="mc-desc">请选择您要在常委会上提请表决的议题类别：</div>
          <div class="vote-category-grid">
            ${VOTE_ISSUES.map(cat => `
              <div class="vote-category-card" onclick="uiManager._showCategoryIssues('${cat.category}')">
                <div class="vcc-icon">${cat.icon}</div>
                <div class="vcc-name">${cat.name}</div>
                <div class="vcc-count">${cat.issues.length}个议题</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /** 第二步：选择具体议题 */
  _showCategoryIssues(catKey) {
    const cat = VOTE_ISSUES.find(c => c.category === catKey);
    if (!cat) return;
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:620px;">
        <div class="mc-header">
          <span class="mc-icon">${cat.icon}</span>
          <span class="mc-title">${cat.name} — 选择议题</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body">
          <div class="mc-desc">请选择具体议题进行常委会表决：</div>
          <div class="vote-issue-list">
            ${cat.issues.map((issue, i) => `
              <div class="vote-issue-card" onclick="uiManager._showPreVoteLobby('${issue.id}')">
                <div class="vic-title">${i+1}. ${issue.name}</div>
                <div class="vic-desc">${issue.desc}</div>
                <div class="vic-factor-grid">
                  ${this._factorTag('💰', '经济', issue.factors.economicBenefit, true)}
                  ${this._factorTag('🌿', '环保', issue.factors.environmentalRisk, false)}
                  ${this._factorTag('⬆', '上级', issue.factors.superiorSupport, true)}
                  ${this._factorTag('💵', '财政', issue.factors.fiscalContribution, issue.factors.fiscalContribution >= 0)}
                  ${this._factorTag('👥', '民怨', issue.factors.publicOpposition, false)}
                </div>
              </div>
            `).join('')}
          </div>
          <button class="action-btn" style="width:100%;margin-top:12px;" onclick="uiManager._startVoteProcess()">← 返回类别选择</button>
        </div>
      </div>
    `;
  }

  _factorTag(icon, label, val, isPositive) {
    const cls = val > 50 ? 'fac-high' : val > 20 ? 'fac-med' : 'fac-low';
    return `<span class="fac-tag ${cls} ${isPositive ? 'fac-pos' : 'fac-neg'}">${icon} ${label} ${val > 0 ? '+' : ''}${val}</span>`;
  }
  // [NPC系统移至NPCSystem.js]
  /** 会前沟通中的委员互动（不关闭弹窗，互动后刷新委员卡片） */
  _lobbyInteract(issueId, memberId) {
    this._lobbyIssueId = issueId;
    this._showLobbyInteractions(memberId);
  }

  /** 第三步：执行投票——逐人唱票后展示结果 */
  _executeVote(issueId) {
    this._lobbyIssueId = null;
    // 清除所有委员的游说锁定
    var p = gameEngine.getSystem('personnel');
    if (p) {
      var all = p.getAll ? p.getAll() : [];
      for (var i = 0; i < all.length; i++) { delete all[i]._lobbyVote; }
    }
    let foundIssue = null, foundCat = null;
    for (const cat of VOTE_ISSUES) {
      const i = cat.issues.find(iss => iss.id === issueId);
      if (i) { foundIssue = i; foundCat = cat; break; }
    }
    if (!foundIssue) return;

    const personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    const members = personnel.getCommitteeMembers();

    // 单次预计算所有委员的投票
    const voteDetails = members.map(m => {
      const vote = m.calcVote(foundIssue.factors);
      const emoji = vote === 'support' ? '✅' : vote === 'oppose' ? '❌' : '⬜';
      const label = vote === 'support' ? '支持' : vote === 'oppose' ? '反对' : '弃权';
      return { m, vote, emoji, label };
    });

    // 统计结果
    const yesCount = voteDetails.filter(v => v.vote === 'support').length;
    const noCount = voteDetails.filter(v => v.vote === 'oppose').length;
    const abstainCount = voteDetails.filter(v => v.vote === 'abstain').length;
    const supportWeight = voteDetails.filter(v => v.vote === 'support').reduce((s, v) => s + v.m.voteWeight, 0);
    const totalWeight = members.reduce((s, m) => s + m.voteWeight, 0);
    const passRate = totalWeight > 0 ? supportWeight / totalWeight : 0;
    const passed = passRate > 0.5;

    const result = {
      support: yesCount, oppose: noCount, abstain: abstainCount,
      supportWeight, passRate, passed,
      result: passed ? '通过' : '未通过',
      _voteDetails: members.map(m => ({
        id: m.id, name: m.name,
        vote: m.calcVote(foundIssue.factors),
        relations: { player: m.relations.player, secretary: m.relations.secretary },
      })),
    };

    this._pendingVote = { issue: foundIssue, result, category: foundCat.name, categoryKey: foundCat.category };

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    // ========== 第一阶段：逐人唱票界面 ==========
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:640px;">
        <div class="mc-header">
          <span class="mc-icon">🗳</span>
          <span class="mc-title">常委会表决 · ${foundIssue.name}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body" id="vote-reveal-body">
          <div class="vote-reveal-header">
            <div class="vote-reveal-topic">📋 ${foundIssue.desc}</div>
            <div class="vote-reveal-progress" id="vote-reveal-progress">⏳ 准备唱票…</div>
          </div>
          <div class="vote-reveal-list" id="vote-reveal-list"></div>
        </div>
      </div>
    `;

    const listEl = document.getElementById('vote-reveal-list');
    const progressEl = document.getElementById('vote-reveal-progress');
    let idx = 0;

    // 逐人唱票
    function revealNext() {
      if (idx >= voteDetails.length) {
        progressEl.textContent = '✅ 全部唱票完毕，汇总结果…';
        setTimeout(showFinalResult, 600);
        return;
      }
      const v = voteDetails[idx];
      const row = document.createElement('div');
      row.className = `vote-member-row vote-reveal-item ${v.vote}`;
      row.innerHTML = `
        <span class="vmr-emoji">${v.emoji}</span>
        <span class="vmr-name">${v.m.name}</span>
        <span class="vmr-title">${v.m.title}</span>
        <span class="vmr-decision">${v.label}</span>
        <span class="vmr-relation" title="与书记关系:${v.m.relations.secretary} | 对您关系:${v.m.relations.player}">🤝${v.m.relations.secretary}</span>
        <span class="vmr-faction">${v.m.faction}</span>
      `;
      listEl.appendChild(row);

      // 触发入场动画
      requestAnimationFrame(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
      });

      idx++;
      progressEl.textContent = `🎤 唱票中… (${idx}/${voteDetails.length})  ${v.m.name}：${v.label}`;
      setTimeout(revealNext, 750);
    }

    // ========== 第二阶段：唱票完毕，展示最终结果 ==========
    function showFinalResult() {
      overlay.innerHTML = `
        <div class="modal-card" style="max-width:640px;">
          <div class="mc-header">
            <span class="mc-icon">${foundCat.icon}</span>
            <span class="mc-title">表决结果 · ${foundIssue.name}</span>
            <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
          </div>
          <div class="mc-body">
            <div class="vote-result-banner ${passed ? 'passed' : 'failed'}">
              ${passed ? '✅ 决议通过' : '❌ 决议未通过'}
              <span style="font-size:13px;font-weight:400;margin-left:12px;">
                ${yesCount}支持 / ${noCount}反对 / ${abstainCount}弃权
                （赞成率${(passRate * 100).toFixed(0)}%）
              </span>
            </div>

            <div style="font-size:12px;color:var(--text-secondary);margin:8px 0;">${foundIssue.desc}</div>

            <div class="mc-section-label">预期效果（通过后）</div>
            <div class="vote-effect-box">
              ${foundIssue.effects.pass}
            </div>

            <div class="mc-section-label">逐人投票详情</div>
            <div class="vote-member-list">
              ${voteDetails.map(v => `
                <div class="vote-member-row ${v.vote}">
                  <span class="vmr-emoji">${v.emoji}</span>
                  <span class="vmr-name">${v.m.name}</span>
                  <span class="vmr-title">${v.m.title}</span>
                  <span class="vmr-decision">${v.label}</span>
                  <span class="vmr-relation" title="与书记关系:${v.m.relations.secretary} | 对您关系:${v.m.relations.player}">🤝${v.m.relations.secretary}</span>
                  <span class="vmr-faction">${v.m.faction}</span>
                </div>
              `).join('')}
            </div>
            <div class="vote-calc-note">
              每位委员基于自身能力·性格·诉求权重·派系·关系综合计算（阈值>3支持 / &lt;-3反对）
            </div>

            <div class="mc-section-label" style="margin-top:12px;">您的决定</div>
            <div class="vote-actions">
              <button class="action-btn" onclick="uiManager._confirmVoteResult()">✅ 确认通过</button>
              <button class="action-btn btn-veto" onclick="uiManager._vetoVoteResult()">⛔ 行使一票否决权</button>
            </div>
          </div>
        </div>
      `;
    }

    // 延迟片刻后开始唱票
    setTimeout(revealNext, 400);
  }

  /** 确认投票结果 */
  _confirmVoteResult() {
    const pending = this._pendingVote;
    this._pendingVote = null;
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (pending) {
      const issue = pending.issue, result = pending.result;
      const player = stateManager.get('player');
      const county = stateManager.get('county');
      this._addEventLog('important', '常委会', `表决：${result.passed ? '✅通过' : '❌未通过'} "${issue.name}"`);
      if (result.passed) {
        if (pending.categoryKey === 'economic' || pending.categoryKey === 'finance') {
          if (county?.economy) county.economy.economicVitality = Math.min(100, (county.economy.economicVitality||50)+3);
        }
        if (pending.categoryKey === 'social' || pending.categoryKey === 'personnel') {
          county?.modifyTension(-5);
        }
        if (pending.categoryKey === 'party') {
          if (county?.superiorTrust) county.superiorTrust.citySecretary = Math.min(100, (county.superiorTrust.citySecretary||50)+3);
        }
        if (player) player.politicalCapital = Math.min(200, (player.politicalCapital||20)+2);
      } else {
        if (county?.superiorTrust) county.superiorTrust.citySecretary = Math.max(0, (county.superiorTrust.citySecretary||50)-3);
        if (player) player.politicalCapital = Math.max(0, (player.politicalCapital||20)-3);
      }
      // 委员态度变化
      const personnel = gameEngine.getSystem('personnel');
      if (personnel) {
        for (const m of personnel.getCommitteeMembers()) {
          const vote = result._voteDetails?.find(v => v.id === m.id);
          if (!vote) continue;
          if ((vote.vote === 'support' && result.passed) || (vote.vote === 'oppose' && !result.passed)) {
            m.modifyRelation('player', 1);
          } else {
            m.modifyRelation('player', -0.5);
          }
        }
      }
    }
    this.showToast('表决结果已记录并产生实际影响', 'success');
    this.refreshAll();
  }

  /** 一票否决——消耗政治资本10点，全委员关系-2 */
  _vetoVoteResult() {
    const pending = this._pendingVote;
    this._pendingVote = null;
    if (pending) {
      const personnel = gameEngine.getSystem('personnel');
      if (personnel) personnel.oneVoteVeto(pending.issue);
      this._addEventLog('important', '常委会', `书记否决了"${pending.issue.name}"`);
      const player = stateManager.get('player');
      if (player) player.politicalCapital = Math.max(0, (player.politicalCapital||20)-10);
      const members = personnel?.getCommitteeMembers() || [];
      for (const m of members) m.modifyRelation('player', -2);
      this.showToast('行使一票否决权，政治资本-10，委员关系下降', 'important');
    }
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    this.refreshAll();
  }
  // ============== 通知 & 弹窗 ==============

  showNotification(data) {
    const container = document.getElementById('notification-toast-container');
    if (!container) return;
    const type = data.type || 'info';
    const colors = { info: '#4a90d9', warning: '#ff9800', error: '#f44336', success: '#4caf50', important: '#9c27b0' };
    const icons = { info: 'ℹ️', warning: '⚠️', error: '❌', success: '✅', important: '🔔' };
    const toast = document.createElement('div');
    toast.className = `toast nt-${type}`;
    toast.innerHTML = `<div class="toast-icon">${icons[type] || 'ℹ️'}</div><div style="flex:1;"><div class="toast-title">${data.title || ''}</div><div class="toast-msg">${data.message || ''}</div></div><span onclick="this.parentElement.remove()" style="cursor:pointer;font-size:12px;color:var(--text-muted);padding:0 4px;flex-shrink:0;">✕</span>`;
    toast.style.borderLeftColor = colors[type] || '#4a90d9';
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('th'); setTimeout(() => toast.remove(), 300); },
      data.persistent ? 8000 : 3500);
  }

  showDecisionModal(event) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const hasChoices = event.choices && event.choices.length > 2;
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="mc-header">
          <span class="mc-icon">${event.type === 'emergency' ? '🚨' : event.type === 'petition' ? '📢' : event.type === 'superior_task' ? '📋' : '📌'}</span>
          <span class="mc-title">${event.name}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body">
          <div class="mc-desc">${event.description || ''}</div>
          ${event.scene ? `<div class="mc-scene">${event.scene.replace(/\n/g, '<br>')}</div>` : ''}
          <div class="mc-section-label">可选方案</div>
          <div class="mc-choices">
            ${(event.choices || []).map((c, i) => {
              const effectsHtml = Array.isArray(c.effects) ? c.effects.map(e => {
                const v = e.value || 0;
                const sign = v > 0 ? '+' : '';
                const targetLabel = {
                  social_tension: '社会张力',
                  player_ability: e.type ? { economy:'经济能力', livelihood:'民生能力', stability:'维稳能力',
                                    governance:'吏治能力', innovation:'创新力', integrity:'廉洁度' }[e.type] || e.type : '',
                  player_status: e.type ? { health:'健康', energy:'精力', stress:'压力' }[e.type] || e.type : '',
                  finance: '财政',
                  county_stat: e.type || '',
                };
                const label = targetLabel[e.target] || e.target || '';
                return `${sign}${v} ${label}`;
              }).join(' · ') : '';
              return `
              <div class="mc-choice" onclick="uiManager._resolveChoice('${event.id}', ${i})">
                <div class="mc-choice-label">${c.label}</div>
                ${c.description ? `<div class="mc-choice-desc">${c.description}</div>` : ''}
                ${effectsHtml ? `<div class="mc-choice-effects">${effectsHtml}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  _resolveChoice(eventId, choiceIndex) {
    const overlay = document.getElementById('modal-overlay');

    // 特殊处理：常委会投票
    if (eventId === '_committee_vote') {
      const pending = this._pendingVote;
      if (choiceIndex === 1) {
        const personnel = gameEngine.getSystem('personnel');
        if (personnel && pending) {
          personnel.oneVoteVeto(pending.issue);
          this.showToast('您行使了一票否决权，否决了常委会决议', 'important');
          this._addEventLog('important', '常委会', `书记行使一票否决权，否决了"${pending.issue.name}"决议`);
        }
      } else {
        this.showToast('投票结果已记录', 'info');
      }
      this._pendingVote = null;
      overlay?.classList.add('hidden');
      this.refreshAll();
      return;
    }


    const evtSys = gameEngine.getSystem('event');
    if (evtSys) {
      const result = evtSys.resolveEvent(eventId, choiceIndex);
      if (result) {
        this.showToast(`已选择：${result.choiceLabel}`, 'success');
        this._addEventLog('info', '事件处理', `"${eventId}" → ${result.choiceLabel}`);
      } else {
        this.showToast('事件已处理', 'info');
      }
    }
    overlay?.classList.add('hidden');
    this.refreshAll();
  }

  showGameOverModal(data) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const player = stateManager.get('player');
    const evalData = stateManager.get('evaluation');
    const promo = data.promotion;
    const promoOutcome = promo ? promo.possibleOutcomes
      .filter(o => o.actualProb > 0)
      .map(o => `<div class="po-row"><span>${o.label}</span><span class="po-bar-bg"><div class="po-bar-fill" style="width:${o.actualProb}%"></div></span><span>${o.actualProb.toFixed(0)}%</span></div>`).join('') : '';

    // 根据出局原因显示不同内容
    const reasonConfig = {
      corruption: {
        icon: '⛓️', title: '落马 · 锒铛入狱',
        desc: data.description || '因严重违纪违法被立案审查。',
        detail: data.severity > 7
          ? `涉案金额高达 ${data.bribeAmount || 0} 万元，违规操作 ${data.favorCount || 0} 次。`
          : '组织调查后受到纪律处分。',
      },
      illness: {
        icon: '🕊️', title: '病故 · 鞠躬尽瘁',
        desc: data.description || '因长期积劳成疾，医治无效。',
        detail: '治理不是在干净整洁的棋盘上移动棋子，而是在泥泞中前行。',
      },
      accident: {
        icon: '💥', title: '因公殉职',
        desc: data.description || '在执行公务中遭遇意外。',
        detail: '因公牺牲，追授荣誉称号。',
      },
      dismissed: {
        icon: '📄', title: '免职 · 黯然离场',
        desc: data.description || '因重大失职被免去县长职务。',
        detail: `任期内社会动荡，上级信任度仅${Math.round(player?.relations?.citySecretary || 0)}。`,
      },
      term_end: {
        icon: '🏁', title: '任期结束 · 晋升评价',
        desc: data.description || '您的五年任期已结束。',
        detail: '治理不是在干净整洁的棋盘上移动棋子，而是在泥泞中前行，在黑暗中摸索，在压力下抉择。',
      },
    };

    const cfg = reasonConfig[data.reason] || reasonConfig.term_end;

    overlay.innerHTML = `
      <div class="modal-card go-card">
        <div class="mc-header"><span class="mc-icon">${cfg.icon}</span><span class="mc-title">${cfg.title}</span></div>
        <div class="mc-body" style="text-align:center;">
          <div class="go-subtitle">${cfg.desc}</div>
          ${data.reason !== 'illness' && data.reason !== 'accident' ? `
          <div class="go-grid">
            <div class="go-stat"><span class="go-label">综合评价</span><span class="go-value hl-gold">${evalData?.rank || '未知'}</span></div>
            <div class="go-stat"><span class="go-label">政绩总分</span><span class="go-value">${Math.round(player?.getTotalPerformance?.() || 0)}</span></div>
            <div class="go-stat"><span class="go-label">任期</span><span class="go-value">${data.turn || 0}周</span></div>
            <div class="go-stat"><span class="go-label">上级信任</span><span class="go-value">${Math.round(player?.relations?.citySecretary || 0)}</span></div>
          </div>` : `
          <div class="go-grid">
            <div class="go-stat"><span class="go-label">任期</span><span class="go-value">${data.turn || 0}周</span></div>
            <div class="go-stat"><span class="go-label">政绩总分</span><span class="go-value">${Math.round(player?.getTotalPerformance?.() || 0)}</span></div>
          </div>`}
          <!-- 政绩对比柱状图 -->
          <div class="go-chart">
            <div class="go-chart-title">📊 六维政绩</div>
            <div class="go-chart-bars">
              ${[['经济', player?.performance?.economy || 0, '#3fb950'], ['稳定', player?.performance?.stability || 0, '#4a90d9'], ['民生', player?.performance?.livelihood || 0, '#d97706'], ['党建', player?.performance?.partyBuilding || 0, '#7c3aed'], ['改革', player?.performance?.innovation || 0, '#ca8a04'], ['廉洁', player?.performance?.integrity || 0, '#f85149']].map(([label, val, color]) => `
                <div class="go-bar-row">
                  <span class="go-bar-label">${label}</span>
                  <div class="go-bar-bg"><div class="go-bar-fill" style="width:${Math.min(100, val)}%;background:${color};"></div></div>
                  <span class="go-bar-val">${Math.round(val)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ${data.reason === 'corruption' ? `
          <div class="go-corruption">
            <div class="cc-detail">${data.detail || ''}</div>
            <div class="cc-lesson">权力是一把双刃剑。走得太远，就回不了头了。</div>
          </div>` : ''}
          ${promoOutcome ? `<div class="go-promo"><div class="go-promo-title">可能去向</div>${promoOutcome}</div>` : ''}

          <!-- 叙事结局区域 -->
          ${data.epilogue ? this._renderEpilogue(data.epilogue) : ''}

          <div class="go-desc">${cfg.detail}</div>
          <button onclick="location.reload()" class="btn-go-restart">🔄 重新开始</button>
        </div>
      </div>
    `;
  }

  /** 渲染叙事结局 */
  _renderEpilogue(epilogue) {
    if (!epilogue) return '';
    let html = '<div class="go-epilogue" style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">';
    html += '<div class="go-chart-title">📜 政治叙事 · 五年回顾</div>';

    // 总体评价
    if (epilogue.overall) {
      html += `<div style="font-size:12px;color:var(--text-primary);margin-bottom:8px;padding:8px;background:var(--bg-secondary);border-radius:6px;text-align:left;">`;
      html += `<span style="font-weight:600;">${epilogue.overall.title}</span> — 综合评分 ${epilogue.overall.score}分`;
      html += `</div>`;
    }

    // 剧情线结局
    if (epilogue.plotlineResults && epilogue.plotlineResults.length > 0) {
      html += '<div style="margin-bottom:8px;">';
      for (const p of epilogue.plotlineResults) {
        if (p.description) {
          html += `<div style="font-size:11px;padding:4px 8px;margin-bottom:4px;background:var(--bg-secondary);border-radius:4px;text-align:left;">
            <span style="font-weight:600;color:var(--accent-blue);">【${p.name}】</span>
            <span style="color:var(--text-primary);">${p.description}</span>
          </div>`;
        }
      }
      html += '</div>';
    }

    // 人物命运（前3个）
    if (epilogue.characterFates && epilogue.characterFates.length > 0) {
      html += '<div style="font-size:11px;margin-bottom:8px;">';
      const top3 = epilogue.characterFates.slice(0, 3);
      for (const f of top3) {
        html += `<div style="padding:3px 8px;text-align:left;border-left:2px solid var(--border-color);margin-bottom:4px;">
          <span style="font-weight:600;">${f.name}</span> ${f.fate}
          ${f.memoryNote ? `<span style="color:var(--text-muted);font-size:10px;">${f.memoryNote}</span>` : ''}
        </div>`;
      }
      html += '</div>';
    }

    // 叙事文本
    if (epilogue.narrative) {
      html += `<div style="font-size:11px;color:var(--text-secondary);padding:8px;background:var(--bg-secondary);border-radius:6px;text-align:left;line-height:1.6;white-space:pre-wrap;">${epilogue.narrative}</div>`;
    }

    // 历史评价
    if (epilogue.historicalRanking) {
      const rankColors = { '优秀': '#3fb950', '良好': '#4a90d9', '合格': '#d97706', '不合格': '#f85149' };
      const color = rankColors[epilogue.historicalRanking] || '#9ca3af';
      html += `<div style="margin-top:8px;font-size:12px;font-weight:600;color:${color};">历史评价: ${epilogue.historicalRanking}</div>`;
    }

    if (epilogue.postscript) {
      html += `<div style="margin-top:6px;font-size:11px;font-style:italic;color:var(--text-muted);">"${epilogue.postscript}"</div>`;
    }

    html += '</div>';
    return html;
  }

  showToast(msg, type = 'info') {
    this.showNotification({ type, title: type === 'error' ? '失败' : type === 'success' ? '完成' : '提示', message: msg });
  }

  /** AI秘书折叠/展开 */
  _toggleSecretary() {
    this.aiSecretary.toggle();
  }

  _addEventLog(type, title, message) {
    const entry = { time: timeSystem.getTimeString(), type, title, message };
    this._eventLog.push(entry);
    if (this._eventLog.length > this._maxLogEntries) this._eventLog.shift();
    const stored = stateManager.get('events')?.logs || [];
    stored.push(entry);
    stateManager.set('events', { logs: stored.slice(-200) });
    // 如果当前在事件日志视图，刷新
    if (this.currentView === 'eventlog') {
      const c = document.getElementById('view-eventlog');
      if (c) this._renderEventLog(c);
    }
  }

  // ============== 总览数据视图 ==============
  _renderData(c) {
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    const player = stateManager.get('player');
    const pop = stateManager.get('population');

    const gdp = county?.economy?.gdp || 0;
    const gdpGrowth = county?.economy?.gdpGrowth || 0;
    const ecoVital = county?.economy?.economicVitality ?? 50;
    const stability = Math.max(0, 100 - (county?.socialTension || 0));

    const fiscalHealth = finance?.fiscalHealth ?? 0;
    const treasury = finance?.treasuryBalance ?? 0;
    const monthlyInc = finance?.monthlyIncome ?? 0;
    const monthlyExp = finance?.monthlyExpense ?? 0;
    const debtRate = finance?.debtRate ?? 0;
    const selfSuff = finance?.selfSufficiency ?? 0;
    const pc = player?.politicalCapital ?? 0;

    function bar(val, max = 100, color = 'var(--accent-blue)') {
      const pct = Math.min(100, Math.round((val / max) * 100));
      return `<div class="data-bar"><div class="data-fill" style="width:${pct}%;background:${color};"></div></div><span class="data-val">${val}</span>`;
    }

    c.innerHTML = `
      <div class="view-section">
        <div class="section-header">📊 青县总览数据</div>
        <div class="data-grid">
          <div class="data-card">
            <div class="dc-title">📈 经济运行</div>
            <div class="dc-row"><span class="dc-label">GDP</span><span class="dc-value">${(gdp / 10000).toFixed(0)} 亿元</span></div>
            <div class="dc-row"><span class="dc-label">GDP增长率</span><span class="dc-value" style="color:${gdpGrowth >= 0.05 ? 'var(--accent-green)' : 'var(--accent-red)'}">${(gdpGrowth * 100).toFixed(1)}%</span></div>
            <div class="dc-row"><span class="dc-label">经济活力</span>${bar(ecoVital)}</div>
            <div class="dc-row"><span class="dc-label">工业占比</span><span class="dc-value">${((county?.economy?.industrialRatio || 0) * 100).toFixed(0)}%</span></div>
            <div class="dc-row"><span class="dc-label">农业占比</span><span class="dc-value">${((county?.economy?.agricultureRatio || 0) * 100).toFixed(0)}%</span></div>
            <div class="dc-row"><span class="dc-label">三产占比</span><span class="dc-value">${((county?.economy?.serviceRatio || 0) * 100).toFixed(0)}%</span></div>
          </div>
          <div class="data-card">
            <div class="dc-title">💰 财政状况</div>
            <div class="dc-row"><span class="dc-label">国库余额</span><span class="dc-value" style="color:${treasury >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${treasury.toFixed(0)} 万元</span></div>
            <div class="dc-row"><span class="dc-label">月收入</span><span class="dc-value">${monthlyInc.toFixed(0)} 万元</span></div>
            <div class="dc-row"><span class="dc-label">月支出</span><span class="dc-value">${monthlyExp.toFixed(0)} 万元</span></div>
            <div class="dc-row"><span class="dc-label">月结余</span><span class="dc-value" style="color:${(monthlyInc - monthlyExp) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${(monthlyInc - monthlyExp).toFixed(0)} 万元</span></div>
            <div class="dc-row"><span class="dc-label">财政健康</span>${bar(fiscalHealth)}</div>
            <div class="dc-row"><span class="dc-label">债务率</span><span class="dc-value" style="color:${debtRate > 80 ? 'var(--accent-red)' : 'var(--accent-green)'}">${debtRate.toFixed(0)}%</span></div>
            <div class="dc-row"><span class="dc-label">自给率</span>${bar(selfSuff)}</div>
            <div class="dc-row"><span class="dc-label">政治资本</span><span class="dc-value">${pc}</span></div>
          </div>
          <div class="data-card">
            <div class="dc-title">🏘 社会状况</div>
            <div class="dc-row"><span class="dc-label">稳定度</span>${bar(stability, 100, stability > 60 ? 'var(--accent-green)' : stability > 40 ? 'var(--accent-gold)' : 'var(--accent-red)')}</div>
            <div class="dc-row"><span class="dc-label">社会张力</span>${bar(county?.socialTension || 0, 100, '#f44336')}</div>
            <div class="dc-row"><span class="dc-label">总人口</span><span class="dc-value">${(pop?.total || 0).toLocaleString()} 人</span></div>
            <div class="dc-row"><span class="dc-label">城镇人口</span><span class="dc-value">${(pop?.urban || 0).toLocaleString()} 人</span></div>
            <div class="dc-row"><span class="dc-label">农村人口</span><span class="dc-value">${(pop?.rural || 0).toLocaleString()} 人</span></div>
            <div class="dc-row"><span class="dc-label">就业人口</span><span class="dc-value">${(pop?.employed || 0).toLocaleString()} 人</span></div>
          </div>
          <div class="data-card">
            <div class="dc-title">⭐ 上级评价</div>
            <div class="dc-row"><span class="dc-label">市委书记信任</span>${bar(county?.superiorTrust?.citySecretary || 50)}</div>
            <div class="dc-row"><span class="dc-label">省厅评价</span>${bar(county?.superiorTrust?.provincialEval || 50)}</div>
            <div class="dc-row"><span class="dc-label">中央印象</span>${bar(county?.superiorTrust?.centralImpression || 50)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============== 百科视图 ==============
  _renderManual(c) {
    const catOrder = ['财政', '经济', '社会', '政治', '人事'];
    const cats = {};
    for (const [key, def] of Object.entries(TERM_DEFS)) {
      const cat = def.category || '其他';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push({ key, ...def });
    }
    // 按指定顺序排序
    const sortedCats = Object.entries(cats).sort((a, b) => {
      const ia = catOrder.indexOf(a[0]), ib = catOrder.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    c.innerHTML = `
      <div class="view-section">
        <div class="section-header">📖 机制百科</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:4px;">
          悬停或点击名词查看详细定义、影响因素与计算公式
        </div>
        <div class="manual-cat-list">
          ${sortedCats.map(([cat, terms]) => `
            <div class="manual-cat">
              <div class="manual-cat-header">${cat}</div>
              <div class="manual-term-grid">
                ${terms.map(t => `
                  <div class="manual-term-card" onclick="uiManager._showTermDetail('${t.key}')">
                    <div class="mtc-icon">${t.icon || '📌'}</div>
                    <div class="mtc-name">${t.name}</div>
                    <div class="mtc-brief">${(t.def || '').substring(0, 30)}${(t.def || '').length > 30 ? '…' : ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /** 百科词条详情弹窗 */
  _showTermDetail(termKey) {
    const def = TERM_DEFS[termKey];
    if (!def) return;
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="max-width:560px;">
        <div class="mc-header">
          <span class="mc-icon">${def.icon || '📌'}</span>
          <span class="mc-title">${def.name}</span>
          <button class="mc-close" onclick="document.getElementById('modal-overlay').classList.add('hidden')">✕</button>
        </div>
        <div class="mc-body">
          <div style="font-size:13px;color:var(--text-primary);line-height:1.6;margin-bottom:12px;">${def.def || ''}</div>
          ${def.affects ? `
            <div class="mc-section-label">📤 影响</div>
            <div class="term-detail-box term-affects">${def.affects}</div>
          ` : ''}
          ${def.affectedBy ? `
            <div class="mc-section-label">📥 受制于</div>
            <div class="term-detail-box term-affected-by">${def.affectedBy}</div>
          ` : ''}
          ${def.formula ? `
            <div class="mc-section-label">🧮 计算公式</div>
            <div class="term-detail-box term-formula">${def.formula}</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ============== 治理路线图（国策树） ==============
  _renderTasks(c) {
    if (!this._focusBranch) this._focusBranch = 'economy';
    var taskSys = gameEngine.getSystem('tasks');
    var self = this;

    // 分支选项卡
    var branches = [
      { id: 'economy', name: '📈 经济发展', cls: 'economy' },
      { id: 'stability', name: '🏘 社会稳定', cls: 'stability' },
      { id: 'party', name: '🚩 党的建设', cls: 'party' },
      { id: 'reform', name: '🚀 改革创新', cls: 'reform' },
      { id: '_tasks', name: '📋 季度任务', cls: 'tasks' },
    ];

    var tabsHtml = branches.map(function(b) {
      var active = self._focusBranch === b.id ? ' active' : '';
      return '<button class="focus-tab tab-' + b.cls + active + '" onclick="uiManager._focusBranch=\'' + b.id + '\';uiManager.renderView(\'tasks\')">' + b.name + '</button>';
    }).join('');

    // 季度任务视图
    if (this._focusBranch === '_tasks') {
      this._renderQuarterlyTasks(c, tabsHtml);
      return;
    }

    // 国策树视图
    var branch = FOCUS_TREE[this._focusBranch];
    if (!branch) { this._focusBranch = 'economy'; this._renderTasks(c); return; }

    var focusState = taskSys ? taskSys.getFocusState() : { completed: [], inProgress: null, progress: 0 };

    // 按前置关系分层排序
    var focuses = branch.focuses;
    var layers = [];
    var assigned = {};
    for (var fi = 0; fi < focuses.length; fi++) {
      var f = focuses[fi];
      if (f.prerequisites.length === 0) {
        if (!layers[0]) layers[0] = [];
        layers[0].push(f);
        assigned[f.id] = true;
      }
    }
    // 剩下的放到后续层
    var changed = true;
    while (changed) {
      changed = false;
      for (var fi = 0; fi < focuses.length; fi++) {
        var f = focuses[fi];
        if (assigned[f.id]) continue;
        var allPrereqAssigned = true;
        for (var pi = 0; pi < (f.prerequisites || []).length; pi++) {
          if (!assigned[f.prerequisites[pi]]) { allPrereqAssigned = false; break; }
        }
        if (allPrereqAssigned) {
          var maxLayer = 0;
          for (var pi = 0; pi < (f.prerequisites || []).length; pi++) {
            for (var li = 0; li < layers.length; li++) {
              if (layers[li].find(function(x) { return x.id === f.prerequisites[pi]; })) {
                maxLayer = Math.max(maxLayer, li);
              }
            }
          }
          var targetLayer = maxLayer + 1;
          if (!layers[targetLayer]) layers[targetLayer] = [];
          layers[targetLayer].push(f);
          assigned[f.id] = true;
          changed = true;
        }
      }
    }

    // 渲染每层
    var focusHtml = '';
    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      if (li > 0) {
        // 层级连接线
        focusHtml += '<div style="text-align:center;font-size:10px;color:var(--text-muted);padding:2px 0;">⬇</div>';
      }
      for (var fi = 0; fi < layer.length; fi++) {
        var f = layer[fi];
        var isCompleted = focusState.completed.indexOf(f.id) !== -1;
        var isInProgress = focusState.inProgress === f.id;
        var prereqDone = true;
        for (var pi = 0; pi < (f.prerequisites || []).length; pi++) {
          if (focusState.completed.indexOf(f.prerequisites[pi]) === -1) { prereqDone = false; break; }
        }
        var isAvailable = prereqDone && !isCompleted && !isInProgress && !focusState.inProgress;
        var isLocked = !prereqDone && !isCompleted;

        var stateClass = isCompleted ? 'completed' : isInProgress ? 'in-progress' : isAvailable ? 'available' : 'locked';
        var statusText = isCompleted ? '✅ 已完成' : isInProgress ? '⏳ 进行中' : isAvailable ? '▶ 可开始' : '🔒 未解锁';
        var sideColor = isCompleted ? 'var(--accent-green)' : isInProgress ? 'var(--accent-blue)' : branch.color;

        var progressHtml = isInProgress && focusState.progress != null
          ? '<div class="fn-progress"><div class="fn-progress-fill" style="width:' + Math.round(focusState.progress) + '%;"></div></div>' +
            (focusState.assigneeName ? '<div style="font-size:9px;color:var(--text-muted);margin-top:2px;">👤 负责：' + focusState.assigneeName + '</div>' : '')
          : '';

        // 前置条件字符串
        var prereqHtml = '';
        if (f.prerequisites && f.prerequisites.length > 0 && isLocked) {
          var prereqNames = f.prerequisites.map(function(pid) {
            for (var xfi = 0; xfi < focuses.length; xfi++) {
              if (focuses[xfi].id === pid) return focuses[xfi].name;
            }
            return pid;
          });
          prereqHtml = '<div class="fn-prereq">🔓 需先完成：' + prereqNames.join(' → ') + '</div>';
        }

        var onClick = isAvailable ? 'onclick="uiManager._startFocus(\'' + f.id + '\')"' : '';

        focusHtml +=
          '<div class="focus-node ' + stateClass + '" ' + onClick + '>' +
            '<div class="fn-side" style="background:' + sideColor + ';"></div>' +
            '<div class="fn-main">' +
              '<div class="fn-header">' +
                '<span class="fn-name">' + f.name + '</span>' +
                '<span class="fn-status ' + stateClass + '">' + statusText + '</span>' +
              '</div>' +
              '<div class="fn-desc">' + f.desc + '</div>' +
              '<div class="fn-meta">' +
                '<span>💰 ' + f.cost + '万</span>' +
                '<span>⏱ ' + f.duration + '周</span>' +
              '</div>' +
              progressHtml +
              prereqHtml +
            '</div>' +
          '</div>';
      }
    }

    if (focusHtml === '') focusHtml = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:11px;">暂无国策</div>';

    var branchColors = { economy: '#2563eb', stability: '#16a34a', party: '#dc2626', reform: '#d97706' };
    var branchIcons = { economy: '📈', stability: '🏘', party: '🚩', reform: '🚀' };
    var bc = branchColors[this._focusBranch] || '#999';

    c.innerHTML =
      '<div class="section-header">' + (branchIcons[this._focusBranch] || '🎯') + ' 治理路线图 · ' + branch.name +
        (this._renderActivePressingMatters(c) ? '<span style="margin-left:8px;font-size:10px;color:var(--accent-red);">⚠️ ' + (gameEngine.getSystem('tasks')?.getActiveMatters() || []).length + '项待处理</span>' : '') +
      '</div>' +
      this._renderActivePressingMatters(c) +
      '<div style="margin-bottom:8px;display:flex;gap:8px;font-size:11px;color:var(--text-muted);">' +
        '<span>已完成 <strong style="color:var(--accent-green);">' + focusState.completed.length + '</strong></span>' +
        '<span>· 进行中 <strong style="color:' + bc + ';">' + (focusState.inProgress ? 1 : 0) + '</strong></span>' +
        '<span>· 可解锁 <strong style="color:var(--accent-blue);">' + focuses.filter(function(f) {
          if (focusState.completed.indexOf(f.id) !== -1) return false;
          for (var pi = 0; pi < (f.prerequisites || []).length; pi++) {
            if (focusState.completed.indexOf(f.prerequisites[pi]) === -1) return false;
          }
          return !focusState.inProgress;
        }).length + '</strong></span>' +
      '</div>' +
      '<div class="focus-tabs">' + tabsHtml + '</div>' +
      '<div class="focus-grid">' + focusHtml + '</div>' +
      this._renderMurmuring();
  }

  /** 季度任务视图（旧版任务列表） */
  _renderQuarterlyTasks(c, tabsHtml) {
    var taskSys = gameEngine.getSystem('tasks');
    var activeTasks = taskSys?.tasks || [];
    var completedTasks = taskSys?.completed || [];
    c.innerHTML =
      '<div class="section-header">📋 季度任务</div>' +
      this._renderActivePressingMatters(c) +
      '<div class="focus-tabs">' + tabsHtml + '</div>' +
      '<div style="margin-bottom:8px;display:flex;gap:8px;font-size:12px;">' +
        '<span style="padding:4px 10px;border-radius:3px;background:var(--accent-blue);color:#fff;">进行中 ' + activeTasks.length + '</span>' +
        '<span style="padding:4px 10px;border-radius:3px;background:rgba(255,255,255,0.05);color:var(--text-muted);">已完成 ' + completedTasks.length + '</span>' +
      '</div>' +
      (activeTasks.length === 0
        ? '<div style="padding:24px;text-align:center;color:var(--text-muted);">暂无进行中的任务。推进一周后季度初会自动生成。</div>'
        : '<div class="task-list">' + activeTasks.map(function(t) {
            var p = t.progress ?? 0;
            return '<div class="task-card' + (t.difficulty === 'hard' ? ' task-hard' : t.difficulty === 'easy' ? ' task-easy' : '') + '">' +
              '<div class="task-header"><span class="task-title">' + t.title + '</span><span class="task-type">' + (t.type || 'general') + '</span></div>' +
              '<div class="task-desc">' + (t.desc || '') + '</div>' +
              '<div class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:' + Math.min(100, p) + '%;"></div></div><span class="task-progress-text">' + Math.min(100, p) + '%</span></div>' +
              (t.deadline ? '<div class="task-deadline">⏰ 截止：' + t.deadline.year + '年' + t.deadline.month + '月</div>' : '') +
              (t.reward ? '<div class="task-reward">🏆 ' + Object.entries(t.reward).map(function(e) {
                return typeof e[1] === 'object' ? e[1].type + '+' + e[1].value : e[0] + '+' + e[1];
              }).join(' · ') + '</div>' : '') +
              '<div style="margin-top:4px;font-size:10px;"><button onclick="event.stopPropagation();uiManager._delegateTask(\'' + t.id + '\')" style="padding:2px 8px;font-size:10px;border:1px solid var(--border-color);border-radius:3px;background:var(--bg-card);color:var(--text-muted);cursor:pointer;">👤 分派人</button></div>' +
            '</div>';
          }).join('') + '</div>'
      ) +
      (completedTasks.length > 0
        ? '<div class="section-header" style="margin-top:20px;">✅ 已完成任务</div><div class="task-list">' +
          completedTasks.slice(-10).reverse().map(function(t) {
            return '<div class="task-card task-completed"><div class="task-header"><span class="task-title">' + t.title + '</span><span class="task-type" style="color:var(--accent-green);">✅ 完成</span></div><div class="task-desc">' + (t.desc || '') + '</div></div>';
          }).join('') + '</div>'
        : '') +
      this._renderMurmuring();
  }

  /** 干部圈动态流 — 从事件日志和派系系统收集"茶余饭后" */
  _renderMurmuring() {
    var lines = [];
    var week = timeSystem ? timeSystem.week : 0;

    // 来源1：派系关系动态
    var factionSys = gameEngine.getSystem('factions');
    if (factionSys) {
      var factions = factionSys.getAllFactions();
      if (factions) {
        // 检查权力最高的派系
        var sortedByPower = [];
        for (var fId3 in factions) sortedByPower.push(factions[fId3]);
        sortedByPower.sort(function(a, b) { return (b.power || 0) - (a.power || 0); });

        if (sortedByPower.length >= 1) {
          var topFaction = sortedByPower[0];
          if (topFaction.id === 'magistrate') lines.push('县长系权势' + topFaction.power + '——王立永在政府内部声望日隆');
          if (topFaction.id === 'local' && topFaction.power > 55) lines.push('本土系权势' + topFaction.power + '——吴德在本土干部中号召力很强');
          if (topFaction.id === 'appointed' && topFaction.power > 52) lines.push('空降系权势' + topFaction.power + '——陈洁在上级面前说话有分量');
        }

        // 检查紧张关系
        var tensions = [];
        for (var fId1 in factions) {
          for (var fId2 in factions) {
            if (fId1 < fId2) {
              var rel = (factions[fId1].relations || {})[fId2];
              if (rel != null && rel < -25) {
                tensions.push({ a: factions[fId1].name, b: factions[fId2].name, val: rel });
              }
            }
          }
        }
        if (tensions.length > 0) {
          var t1 = tensions[0];
          lines.push(t1.a + '与' + t1.b + '关系紧张（' + t1.val + '）——两会互相防备');
        }
      }
    }

    // 来源2：正在进行中的国策
    var taskSys = gameEngine.getSystem('tasks');
    if (taskSys) {
      var focusState = taskSys.getFocusState();
      if (focusState && focusState.inProgress) {
        var allF = getAllFocuses ? getAllFocuses() : [];
        for (var i = 0; i < allF.length; i++) {
          if (allF[i].id === focusState.inProgress) {
            if (focusState.assigneeName) {
              lines.push(focusState.assigneeName + '正在推进"' + allF[i].name + '"（' + Math.round(focusState.progress || 0) + '%）');
            } else {
              lines.push('书记亲自抓"' + allF[i].name + '"中');
            }
            break;
          }
        }
      }

      // 来源3：最近的当务之急决策
      var history = taskSys._matterHistory || [];
      if (history.length > 0) {
        var last = history[history.length - 1];
        var ago = '不久前';
        if (last.resolvedWeek != null) {
          var diff = week - last.resolvedWeek;
          ago = diff <= 1 ? '刚才' : diff + '周前';
        }
        lines.push(last.name + '——你' + ago + '做了处理');
      }
    }

    // 来源4：官员互动记录
    var logs = stateManager.get('events')?.logs || this._eventLog || [];
    var recentLogs = logs.slice(-15);
    var interactionLines = [];
    for (var li = recentLogs.length - 1; li >= 0; li--) {
      var l = recentLogs[li];
      if (l.type === '干部互动' && interactionLines.length < 2) {
        interactionLines.push(l.message || '');
      }
      if (l.type === '投票游说' && interactionLines.length < 2) {
        interactionLines.push(l.message || '');
      }
    }
    lines = lines.concat(interactionLines);

    if (lines.length === 0) return '';

    return '<div style="margin-top:12px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;border-left:3px solid var(--accent-gold);">' +
      '<div style="font-size:11px;font-weight:600;color:var(--accent-gold);margin-bottom:6px;">💬 干部圈 · 本周动态</div>' +
      lines.slice(0, 5).map(function(line) {
        return '<div style="font-size:11px;color:var(--text-secondary);padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);">' + line + '</div>';
      }).join('') +
    '</div>';
  }

  /** 开始执行国策（弹窗选择负责干部） */
  _startFocus(focusId) {
    var taskSys = gameEngine.getSystem('tasks');
    if (!taskSys) return;

    // 查国策信息
    var allFocuses = getAllFocuses ? getAllFocuses() : [];
    var focus = null;
    for (var i = 0; i < allFocuses.length; i++) {
      if (allFocuses[i].id === focusId) { focus = allFocuses[i]; break; }
    }
    if (!focus) return;

    var personnel = gameEngine.getSystem('personnel');
    var officials = personnel ? personnel.getAll().filter(function(o) { return o && o.id !== 'player'; }) : [];

    // 选人弹窗
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    var branch = focus.branch || '';
    var domainMap = { economy: 'economy', stability: 'stability', party: 'party', reform: 'economy' };
    var prefDomain = domainMap[branch] || 'general';

    overlay.classList.remove('hidden');
    var self = this;
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:380px;">' +
        '<div class="mc-header"><span class="mc-icon">👤</span><span class="mc-title">启动国策：' + focus.name + '</span>' +
        '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
        '<div class="mc-body">' +
          '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">💰 费用' + focus.cost + '万 · ⏱ ' + focus.duration + '周 · 选择负责干部（可选）</div>' +
          '<div style="max-height:300px;overflow-y:auto;">' +
            '<div class="pm-option-card" onclick="gameEngine.getSystem(\'tasks\').startFocus(\'' + focusId + '\');document.getElementById(\'modal-overlay\').classList.add(\'hidden\');uiManager.renderView(\'tasks\')">' +
              '<div><strong>🤵 我自己亲自抓</strong></div>' +
              '<div style="font-size:10px;color:var(--text-muted);">不指派干部，按标准速度推进</div>' +
            '</div>' +
            officials.map(function(o) {
              var abil = o._ability || 50;
              var speed = Math.round((0.6 + ((o.abilities?.profession || 50) + (o.abilities?.execution || 50)) / 200) * 100) + '%效率';
              return '<div class="pm-option-card" onclick="gameEngine.getSystem(\'tasks\').startFocus(\'' + focusId + '\',\'' + o.id + '\');document.getElementById(\'modal-overlay\').classList.add(\'hidden\');uiManager.renderView(\'tasks\')">' +
                '<div><strong>' + o.name + '</strong> <span style="font-size:9px;color:var(--text-muted);">' + (o.title || '') + '</span></div>' +
                '<div style="font-size:10px;color:var(--text-muted);">💪能力' + abil + ' · ⚡' + speed + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /** 分派季度任务给干部 */
  _delegateTask(taskId) {
    var taskSys = gameEngine.getSystem('tasks');
    if (!taskSys) return;
    var task = taskSys.tasks.find(function(t) { return t.id === taskId; });
    if (!task) return;

    var personnel = gameEngine.getSystem('personnel');
    var officials = personnel ? personnel.getAll().filter(function(o) { return o && o.id !== 'player'; }) : [];

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:380px;">' +
        '<div class="mc-header"><span class="mc-icon">👤</span><span class="mc-title">分派任务：' + task.title + '</span>' +
        '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
        '<div class="mc-body">' +
          '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">选择负责此任务的干部</div>' +
          '<div style="max-height:260px;overflow-y:auto;">' +
            officials.map(function(o) {
              return '<div class="pm-option-card" onclick="gameEngine.getSystem(\'tasks\').delegateQuarterlyTask(\'' + taskId + '\',\'' + o.id + '\');document.getElementById(\'modal-overlay\').classList.add(\'hidden\');uiManager.renderView(\'tasks\')">' +
                '<div><strong>' + o.name + '</strong> <span style="font-size:9px;color:var(--text-muted);">' + (o.title || '') + '</span></div>' +
                '<div style="font-size:10px;color:var(--text-muted);">💪能力' + (o._ability || 50) + ' · 执行' + (o.abilities?.execution || 50) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }
  _renderActivePressingMatters(c) {
    var taskSys = gameEngine.getSystem('tasks');
    if (!taskSys) return '';
    var matters = taskSys.getActiveMatters();
    if (!matters || matters.length === 0) return '';

    var catIcons = { crisis: '🚨', superior: '📡', faction: '🤝', opportunity: '🎯', people: '👥' };
    var catNames = { crisis: '危机', superior: '上级交办', faction: '派系博弈', opportunity: '机遇窗口', people: '群众诉求' };
    var week = timeSystem ? timeSystem.week : 0;

    return matters.map(function(m) {
      var remaining = Math.max(0, m.deadline - week);
      var urgentClass = remaining <= 2 ? 'deadline-urgent' : remaining <= 4 ? 'deadline-soon' : '';
      return '<div class="pressing-matter-card" onclick="uiManager._showPressingMatterModal(\'' + m.templateId + '\')">' +
        '<div class="pm-header">' +
          '<span class="pm-icon">' + (catIcons[m.category] || '📋') + '</span>' +
          '<span class="pm-name">' + m.name + '</span>' +
          '<span class="pm-category">' + (catNames[m.category] || m.category) + '</span>' +
        '</div>' +
        '<div class="pm-meta">' +
          '<span class="pm-deadline ' + urgentClass + '">⏰ 剩余' + remaining + '周</span>' +
          '<span class="pm-action-hint">点击处理 →</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /** 显示社会行动事件决策弹窗 */
  _showSocialActionModal(actionId) {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var actions = socialSys.getPendingActions();
    var action = null;
    for (var i = 0; i < actions.length; i++) {
      if (actions[i].id === actionId) { action = actions[i]; break; }
    }
    if (!action) return;

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    var groupRisk = action.level >= 4 ? '严重' : action.level >= 3 ? '警示' : action.level >= 2 ? '关注' : '一般';
    var effectDescs = [];
    if (action.effects.tension) effectDescs.push('社会张力' + (action.effects.tension > 0 ? '+' : '') + action.effects.tension);
    if (action.effects.economicVitality) effectDescs.push('经济活力' + action.effects.economicVitality);
    if (action.effects.superior) effectDescs.push('上级信任' + (action.effects.superior > 0 ? '+' : '') + action.effects.superior);
    if (action.effects.taxIncome) effectDescs.push('税收-' + Math.abs(action.effects.taxIncome * 100) + '%');

    var optionHtml = action.responseOptions.map(function(opt, oi) {
      var costParts = [];
      if (opt.cost.energy) costParts.push('⚡精力-' + opt.cost.energy);
      if (opt.cost.politicalCapital) costParts.push('🏛政资-' + opt.cost.politicalCapital);
      if (opt.cost.treasury) costParts.push('💰国库-' + opt.cost.treasury + '万');
      if (opt.cost.integrity) costParts.push('🔴廉洁-' + opt.cost.integrity);
      var costHtml = costParts.length > 0 ? '<div style="font-size:10px;color:var(--text-muted);margin-top:3px;">' + costParts.join(' · ') + '</div>' : '';

      var effectParts = [];
      if (opt.effects.grievanceRelief) effectParts.push('怨气-' + opt.effects.grievanceRelief);
      if (opt.effects.grievanceRise) effectParts.push('怨气+' + opt.effects.grievanceRise);
      if (opt.effects.tension) effectParts.push('张力' + (opt.effects.tension > 0 ? '+' : '') + opt.effects.tension);
      if (opt.effects.satisfaction) effectParts.push('满意度+' + opt.effects.satisfaction);
      if (opt.effects.mobilizationRise) effectParts.push('动员+' + opt.effects.mobilizationRise);
      var effHtml = effectParts.length > 0 ? '<div style="font-size:10px;color:var(--accent-blue);margin-top:2px;">效果：' + effectParts.join(' · ') + '</div>' : '';

      return '<div class="pm-option-card" onclick="uiManager._executeSocialAction(\'' + actionId + '\',' + oi + ')">' +
        '<div class="pm-opt-label">' + (opt.label || '选项' + (oi + 1)) + '</div>' +
        (opt.desc ? '<div class="pm-opt-desc">' + opt.desc + '</div>' : '') +
        costHtml + effHtml + '</div>';
    }).join('');

    overlay.innerHTML = '<div class="modal-card" style="max-width:520px;">' +
      '<div class="mc-header">' +
        '<span class="mc-icon">' + (action.icon || '⚠️') + '</span>' +
        '<span class="mc-title">' + action.groupLabel + action.name + '</span>' +
        '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button>' +
      '</div>' +
      '<div class="mc-body">' +
        '<div style="background:' + (action.level >= 4 ? 'var(--accent-red)' : action.level >= 3 ? '#eab308' : 'rgba(255,255,255,0.05)') + '22;padding:10px;border-radius:6px;margin-bottom:10px;font-size:12px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
            '<span><strong>' + action.groupLabel + '</strong></span>' +
            '<span style="color:' + (action.level >= 4 ? 'var(--accent-red)' : '#eab308') + ';">⚠️ ' + groupRisk + '</span>' +
          '</div>' +
          '<div style="color:var(--text-secondary);">' + action.desc + '</div>' +
          (effectDescs.length > 0 ? '<div style="margin-top:6px;font-size:10px;color:var(--text-muted);">若不处置：' + effectDescs.join(' · ') + '</div>' : '') +
        '</div>' +
        '<div style="font-size:12px;font-weight:600;margin-bottom:6px;">选择处置方式：</div>' +
        '<div class="pm-options">' + optionHtml + '</div>' +
        '<div style="margin-top:8px;text-align:right;">' +
          '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')" style="border-color:var(--text-muted);color:var(--text-muted);font-size:11px;">暂不处理</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /** 执行社会行动响应 */
  _executeSocialAction(actionId, optionIndex) {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var result = socialSys.resolveAction(actionId, optionIndex);
    document.getElementById('modal-overlay').classList.add('hidden');
    if (result && result.success) {
      var action = result.action;
      var option = result.option;
      this.showToast(action.groupLabel + action.name + ' → ' + option.label + ' 已处置', 'success');
      this._addEventLog('important', '社会行动', action.groupLabel + action.name + ' → ' + option.label + '（已处置）');
    } else if (result && result.error === 'already_resolved') {
      this.showToast('此行动已被处理', 'info');
    }
    this.refreshAll();
  }

  /** 显示当务之急决策弹窗 */
  _showPressingMatterModal(templateId) {
    var taskSys = gameEngine.getSystem('tasks');
    if (!taskSys) return;

    var matters = taskSys.getActiveMatters();
    var matter = null;
    for (var i = 0; i < matters.length; i++) {
      if (matters[i].templateId === templateId) { matter = matters[i]; break; }
    }
    if (!matter) return;

    var catNames = { crisis: '🚨 危机', superior: '📡 上级交办', faction: '🤝 派系博弈', opportunity: '🎯 机遇窗口', people: '👥 群众诉求' };
    var week = timeSystem ? timeSystem.week : 0;
    var remaining = Math.max(0, matter.deadline - week);

    var optionsHtml = matter.options.map(function(opt, oi) {
      var riskHtml = opt.risk ? '<div class="pm-opt-risk">⚠️ 风险：' + opt.risk + '</div>' : '';
      var costHtml = '';
      if (opt.cost) {
        var costs = [];
        if (opt.cost.money) costs.push('💰 财政-' + opt.cost.money + '万');
        if (opt.cost.politicalCapital != null) costs.push('🏛 政资' + (opt.cost.politicalCapital > 0 ? '-' : '+') + Math.abs(opt.cost.politicalCapital));
        if (opt.cost.annualCost) costs.push('📅 每年-' + opt.cost.annualCost + '万');
        if (costs.length) costHtml = '<div class="pm-opt-cost">' + costs.join(' · ') + '</div>';
      }
      var pcHtml = opt.politicalCapital ? '<div class="pm-opt-pc">🏛 政资+' + opt.politicalCapital + '</div>' : '';

      return '<div class="pm-option-card" onclick="gameEngine.getSystem(\'tasks\').resolveMatter(\'' + templateId + '\',' + oi + ');document.getElementById(\'modal-overlay\').classList.add(\'hidden\');uiManager.renderView(\'tasks\')">' +
        '<div class="pm-opt-label">' + (opt.label || '选项' + (oi + 1)) + '</div>' +
        '<div class="pm-opt-desc">' + (opt.desc || '') + '</div>' +
        costHtml + pcHtml +
        (opt.stances ? '<div class="pm-opt-stances">' + opt.stances.split('\n').map(function(s) { return '<div>' + s + '</div>'; }).join('') + '</div>' : '') +
        riskHtml +
      '</div>';
    }).join('');

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:560px;">' +
        '<div class="mc-header">' +
          '<span class="mc-icon">' + (catNames[matter.category] || '📋').charAt(0) + '</span>' +
          '<span class="mc-title">' + (catNames[matter.category] || '') + ' · ' + matter.name + '</span>' +
          '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button>' +
        '</div>' +
        '<div class="mc-body">' +
          '<div style="font-size:12px;color:var(--text-primary);margin-bottom:10px;line-height:1.6;">' + matter.desc + '</div>' +
          '<div style="font-size:11px;color:' + (remaining <= 2 ? 'var(--accent-red)' : remaining <= 4 ? 'var(--accent-yellow)' : 'var(--text-muted)') + ';margin-bottom:12px;">⏰ 剩余时间：<strong>' + remaining + '周</strong>' + (remaining <= 2 ? ' ⚠️紧迫' : '') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">选择处理方案：</div>' +
          optionsHtml +
        '</div>' +
      '</div>';
  }

  // ============== 事件日志视图 ==============
  _renderEventLog(c) {
    const logs = stateManager.get('events')?.logs || this._eventLog || [];
    const typeFilter = this._logFilter || 'all';

    const typeIcons = { important: '🔔', success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    const typeColors = { important: '#9c27b0', success: '#4caf50', warning: '#ff9800', error: '#f44336', info: '#4a90d9' };

    const filtered = typeFilter === 'all' ? logs : logs.filter(l => l.type === typeFilter);

    c.innerHTML = `
      <div class="view-section">
        <div class="section-header">📜 事件日志（共${logs.length}条）</div>
        <div class="log-filters" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
          ${['all', 'important', 'success', 'warning', 'error', 'info'].map(t => `
            <button class="log-filter-btn ${typeFilter === t ? 'active' : ''}"
                    onclick="uiManager._logFilter='${t}';uiManager.renderView('eventlog')">
              ${t === 'all' ? '全部' : (typeIcons[t] || '') + ' ' + t}
            </button>
          `).join('')}
          <button class="log-filter-btn" onclick="uiManager._clearLog()" style="margin-left:auto;color:var(--accent-red);">清空</button>
        </div>
        ${filtered.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--text-muted);">暂无日志记录</div>' : `
        <div class="log-list">
          ${filtered.slice().reverse().map(l => `
            <div class="log-entry" style="border-left:3px solid ${typeColors[l.type] || '#666'};">
              <span class="log-time">${l.time || '--:--'}</span>
              <span class="log-type" style="color:${typeColors[l.type] || '#666'}">${typeIcons[l.type] || 'ℹ️'}</span>
              <span class="log-title">${l.title || ''}</span>
              <span class="log-msg">${l.message || ''}</span>
            </div>
          `).join('')}
        </div>`}
      </div>
    `;
  }

  _clearLog() {
    this._eventLog = [];
    stateManager.set('events', { logs: [] });
    this.renderView('eventlog');
  }

  _healthColor(v) { if (v > 80) return 'green'; if (v > 60) return 'blue'; if (v > 40) return 'yellow'; return 'red'; }
  _tensionColor(v) { if (v < 30) return 'green'; if (v < 50) return 'yellow'; if (v < 70) return 'orange'; return 'red'; }

  /** 切换浅色/深色主题 */
  _toggleTheme() {
    var isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('xianzhi_theme', isLight ? 'light' : 'dark');
    document.getElementById('btn-theme').textContent = isLight ? '☀️' : '🌙';
  }

  /** ===== 预算审议系统 ===== */

  /** 显示预算审议弹窗（每年1月触发） */
  _showBudgetReview(data) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    var year = data ? data.year : (timeSystem ? timeSystem.year : '?');
    var finance = stateManager.get('finance');
    if (!finance) return;

    // 预算数据
    var budget = finance.budget || { personnel: 55000, operating: 12000, project: 35000, reserve: 3000 };
    var income = finance.monthlyIncome * 12 || 30000;
    var totalBudget = budget.personnel + budget.operating + budget.project + budget.reserve;

    // 用人大系统计算预算通过率
    if (!this._npcInitialized) this._initNPC();
    var voteResult = this._calcDelegatesForIssue('budget');
    var needed = Math.ceil(243 / 2) + 1;
    var passed = voteResult.support >= needed;

    overlay.classList.remove('hidden');
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:560px;">' +
      '<div class="mc-header"><span class="mc-icon">💰</span><span class="mc-title">' + year + '年度财政预算 · 人大审议</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div class="mc-desc" style="margin-bottom:10px;">根据《预算法》规定，年度财政预算草案需经县人民代表大会审议批准方可执行。</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div style="padding:8px;background:rgba(63,185,80,0.1);border-radius:6px;">' +
            '<div style="font-size:10px;color:var(--accent-green);">预计年度收入</div>' +
            '<div style="font-size:16px;font-weight:600;color:var(--accent-green);">' + Math.round(income) + '万</div>' +
          '</div>' +
          '<div style="padding:8px;background:rgba(248,81,73,0.1);border-radius:6px;">' +
            '<div style="font-size:10px;color:var(--accent-red);">预算总支出</div>' +
            '<div style="font-size:16px;font-weight:600;color:var(--accent-red);">' + totalBudget + '万</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:8px;">' +
          '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">预算构成</div>' +
          '<div style="font-size:11px;padding:4px 6px;background:var(--bg-card);border-radius:4px;border-left:3px solid var(--accent-blue);margin-bottom:2px;">人员经费：' + budget.personnel + '万 (' + Math.round(budget.personnel/totalBudget*100) + '%)</div>' +
          '<div style="font-size:11px;padding:4px 6px;background:var(--bg-card);border-radius:4px;border-left:3px solid var(--accent-green);margin-bottom:2px;">公用经费：' + budget.operating + '万 (' + Math.round(budget.operating/totalBudget*100) + '%)</div>' +
          '<div style="font-size:11px;padding:4px 6px;background:var(--bg-card);border-radius:4px;border-left:3px solid var(--accent-amber);margin-bottom:2px;">项目支出：' + budget.project + '万 (' + Math.round(budget.project/totalBudget*100) + '%)</div>' +
          '<div style="font-size:11px;padding:4px 6px;background:var(--bg-card);border-radius:4px;border-left:3px solid var(--accent-purple);">预备费：' + budget.reserve + '万 (' + Math.round(budget.reserve/totalBudget*100) + '%)</div>' +
        '</div>' +
        '<div class="npc-summary" style="margin-bottom:8px;">' +
          '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">🗳 人大预算审议表决</div>' +
          '<div class="npc-sum-row"><span class="npc-dot" style="background:#3fb950;"></span> 赞成 ' + voteResult.support + '人 (' + (voteResult.support/243*100).toFixed(0) + '%)</div>' +
          '<div class="npc-sum-row"><span class="npc-dot" style="background:#f85149;"></span> 反对 ' + voteResult.oppose + '人</div>' +
          '<div class="npc-sum-row"><span class="npc-dot" style="background:#484f58;"></span> 弃权 ' + voteResult.absent + '人</div>' +
        '</div>' +
        '<div style="font-size:11px;margin-bottom:6px;">需 <strong>' + needed + '</strong> 票通过（过半）</div>' +
        '<div style="font-size:12px;font-weight:500;margin-bottom:10px;color:' + (passed ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + (passed ? '✅ 预算草案预估可通过' : '❌ 预算草案可能被否决，建议与代表协商') + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="fd-action-btn" onclick="uiManager._confirmBudget()" style="flex:2;background:var(--accent-blue);color:#fff;border-color:var(--accent-blue);">✅ 提交表决</button>' +
          '<button class="fd-action-btn" onclick="uiManager._reviseBudget()" style="flex:1;">✏ 调整预算</button>' +
        '</div>' +
      '</div></div>';
  }

  /** 调整预算 — 打开调整面板 */
  _reviseBudget() {
    var finance = stateManager.get('finance');
    if (!finance) { this.showToast('财政系统未就绪', 'warning'); return; }

    var budget = finance.budget || { personnel: 55000, operating: 12000, project: 35000, reserve: 3000 };
    var income = finance.monthlyIncome * 12 || 30000;
    var totalBudget = budget.personnel + budget.operating + budget.project + budget.reserve;
    var deficit = totalBudget - income;

    this._closeModal();

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span>✏️ 调整预算</span>' +
      '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
      '<div class="mc-body" style="padding:16px;">' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">拖动滑块调整各项预算额度，调整后将重新计算预算草案。</div>' +
        '<div style="margin-bottom:8px;">' +
          budgetSlider('personnel', '人员经费', budget.personnel, '#3b82f6', totalBudget) +
          budgetSlider('operating', '公用经费', budget.operating, '#22c55e', totalBudget) +
          budgetSlider('project', '项目支出', budget.project, '#eab308', totalBudget) +
          budgetSlider('reserve', '预备费', budget.reserve, '#a855f7', totalBudget) +
        '</div>' +
        '<div id="revised-budget-summary" style="font-size:11px;padding:6px 8px;background:var(--bg-card);border-radius:4px;margin-bottom:8px;">' +
          '支出合计：<b id="revised-total">' + totalBudget + '</b>万 · ' +
          '预计收入：' + income + '万 · ' +
          '<span style="color:' + (deficit > 0 ? 'var(--accent-red)' : 'var(--accent-green)') + ';" id="revised-deficit">' +
            (deficit > 0 ? '超支' + deficit + '万' : '结余' + Math.abs(deficit) + '万') +
          '</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="fd-action-btn" style="flex:2;background:var(--accent-blue);color:#fff;border-color:var(--accent-blue);" onclick="uiManager._applyBudget()">✅ 确认调整</button>' +
          '<button class="fd-action-btn" style="flex:1;" onclick="uiManager._closeModal();uiManager._showBudgetReview()">取消</button>' +
        '</div>' +
      '</div></div>';

    function budgetSlider(key, label, val, color, total) {
      var pct = Math.round(val / total * 100);
      return '<div style="margin-bottom:6px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;">' +
          '<span style="font-weight:500;">' + label + '</span>' +
          '<span style="color:' + color + ';" id="b-' + key + '-val">' + val + '万 (' + pct + '%)</span>' +
        '</div>' +
        '<input type="range" min="0" max="' + (total * 0.6) + '" step="1000" value="' + val + '" ' +
          'oninput="uiManager._updateBudgetSlider(\'' + key + '\', this.value)" ' +
          'style="width:100%;height:4px;accent-color:' + color + ';" />' +
      '</div>';
    }
  }

  /** 预算滑块更新 */
  _updateBudgetSlider(key, value) {
    var el = document.getElementById('b-' + key + '-val');
    if (!el) return;
    var val = parseInt(value) || 0;
    var finance = stateManager.get('finance');
    var budget = finance?.budget || { personnel: 55000, operating: 12000, project: 35000, reserve: 3000 };
    var total = budget.personnel + budget.operating + budget.project + budget.reserve;
    budget[key] = val;
    var newTotal = budget.personnel + budget.operating + budget.project + budget.reserve;

    // 更新滑块显示
    var pct = Math.round(val / Math.max(1, newTotal) * 100);
    el.textContent = val + '万 (' + pct + '%)';

    // 更新合计
    var totalEl = document.getElementById('revised-total');
    if (totalEl) totalEl.textContent = newTotal;

    // 更新赤字
    var income = (stateManager.get('finance')?.monthlyIncome * 12) || 30000;
    var deficit = newTotal - income;
    var deficitEl = document.getElementById('revised-deficit');
    if (deficitEl) {
      deficitEl.textContent = deficit > 0 ? '超支' + deficit + '万' : '结余' + Math.abs(deficit) + '万';
      deficitEl.style.color = deficit > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
    }
  }

  /** 确认预算调整 */
  _applyBudget() {
    var finance = stateManager.get('finance');
    if (!finance) return;
    var budget = finance.budget || {};
    var keys = ['personnel', 'operating', 'project', 'reserve'];
    for (var i = 0; i < keys.length; i++) {
      var el = document.getElementById('b-' + keys[i] + '-val');
      if (el) {
        var match = el.textContent.match(/^(\d+)/);
        if (match) budget[keys[i]] = parseInt(match[1]) || 0;
      }
    }
    finance.budget = budget;
    this.showToast('预算已调整，重新计算表决结果', 'success');
    this._closeModal();
    this._showBudgetReview({ year: timeSystem ? timeSystem.year : '?' });
  }

  _showCorruptionPanel() {
    var player = stateManager.get('player');
    if (!player || !player.corruption) return;
    var c = player.corruption;
    var state = c.investigationState || 'none';
    var level = Math.round(c.level);

    var stateLabels = { 'none':'安全', undercurrent:'暗流涌动', preliminary:'初步调查', formal:'正式立案' };
    var stateIcons = { 'none':'✅', undercurrent:'⚪', preliminary:'🟡', formal:'🔴' };

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    var html = '<div class="modal-card" style="max-width:520px;">' +
      '<div class="mc-header"><span class="mc-icon">⚠️</span><span class="mc-title">腐败与纪委调查</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
      '<div class="corr-status-bar">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>腐败值</span><span>' + level + '%</span></div>' +
        '<div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">' +
          '<div style="height:100%;width:' + Math.min(100,level) + '%;background:' + (level>70?'var(--accent-red)':level>50?'var(--accent-yellow)':'var(--accent-green)') + ';border-radius:4px;transition:width 0.5s;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:var(--text-muted);">30%风险线  ·  50%警告线  ·  70%调查线</div>' +
      '</div>' +
      '<div style="margin-top:12px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:4px;">' +
        '<div style="font-size:12px;font-weight:600;">' + stateIcons[state] + ' 当前状态：' + stateLabels[state] + '</div>';

    if (state === 'undercurrent') {
      html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;line-height:1.5;">县纪委已收到相关举报，正在初步核查中。纪委书记陈洁近期活动频繁。<br>建议：立即收手、销毁相关材料。</div>';
    } else if (state === 'preliminary') {
      html += '<div style="font-size:11px;color:var(--accent-yellow);margin-top:6px;">县纪委已发出函询通知，要求书面说明情况。</div>';
    } else if (state === 'formal') {
      html += '<div style="font-size:11px;color:var(--accent-red);margin-top:6px;">市纪委已正式立案！部分职权被限制，每周推进自动触发调查进程。</div>';
    } else {
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">目前处于安全状态。注意控制腐败值在30%以下。</div>';
    }

    html += '</div>';

    // 互动选项
    if (state !== 'none') {
      html += '<div style="margin-top:10px;border-top:1px solid var(--border-color);padding-top:8px;">' +
        '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">应对措施</div>';
    }

    if (state === 'undercurrent') {
      html += this._corruptionActionBtn('stop', '🛑 收手止损', '腐败值每周自然下降加速，政治资本-5', '免费');
      html += this._corruptionActionBtn('destroy', '🔥 销毁证据', '降低被查风险30点，财政-50万', '财政50万');
      html += this._corruptionActionBtn('umbrella', '☂ 寻求保护', '利用上层关系压制调查，政治资本-15', '政治资本15');
    }
    if (state === 'preliminary') {
      html += this._corruptionActionBtn('reply', '📄 如实回复', '诚恳说明情况，过关概率+20%', '免费');
      html += this._corruptionActionBtn('influence', '🤝 找人打招呼', '利用人脉施加影响，政治资本-10', '政治资本10');
      html += this._corruptionActionBtn('scapegoat', '🐑 找替罪羊', '将责任推给下属，该下属关系-30', '政治资本5');
    }
    if (state === 'formal') {
      html += this._corruptionActionBtn('confess', '🙏 坦白从宽', '主动交代问题，处分降级', '免费');
      html += this._corruptionActionBtn('resist', '💪 顽抗到底', '拒不配合调查，风险极高', '免费');
      html += this._corruptionActionBtn('flee', '🏃 潜逃', '放弃一切逃跑，游戏结束', '免费');
    }

    if (state !== 'none') {
      html += '</div>';
    }

    // 腐败记录
    if (c.records && c.records.length > 0) {
      html += '<div style="margin-top:10px;border-top:1px solid var(--border-color);padding-top:8px;">' +
        '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">最近记录</div>' +
        c.records.slice(-3).map(function(r) {
          return '<div style="font-size:10px;color:var(--text-muted);padding:2px 0;">· ' + (r.type||'') + ' ' + (r.amount||0) + '万 (' + (r.target||'') + ')</div>';
        }).join('') + '</div>';
    }

    html += '</div></div>';
    overlay.innerHTML = html;
  }

  _corruptionActionBtn(key, label, desc, cost) {
    return '<div class="int-card" onclick="uiManager._executeCorruptionAction(\'' + key + '\')" style="margin-bottom:3px;">' +
      '<div class="int-row"><span class="int-label">' + label + '</span><span class="int-cost">' + cost + '</span></div>' +
      '<div class="int-desc">' + desc + '</div></div>';
  }

  _executeCorruptionAction(action) {
    var player = stateManager.get('player');
    var fin = stateManager.get('finance');
    if (!player || !player.corruption) return;
    var c = player.corruption;

    switch(action) {
      case 'stop':
        if ((player.politicalCapital||0) < 5) { this.showToast('政治资本不足', 'warning'); return; }
        player.politicalCapital -= 5;
        c.level = Math.max(0, c.level - 20);
        this._addEventLog('important', '腐败', '您决定收手止损，腐败值下降');
        break;
      case 'destroy':
        if ((fin?.treasuryBalance||0) < 50) { this.showToast('财政不足', 'warning'); return; }
        fin.treasuryBalance -= 50;
        c.investigationRisk = Math.max(0, (c.investigationRisk||0) - 30);
        this._addEventLog('important', '腐败', '您销毁了部分账目材料');
        break;
      case 'umbrella':
        if ((player.politicalCapital||0) < 15) { this.showToast('政治资本不足', 'warning'); return; }
        player.politicalCapital -= 15;
        c.protectiveUmbrella = (c.protectiveUmbrella||0) + 30;
        this._addEventLog('important', '腐败', '您动用了上层关系寻求保护伞');
        break;
      case 'reply':
        c.investigationRisk = Math.max(0, (c.investigationRisk||0) - 20);
        c.level = Math.max(0, c.level - 5);
        this._addEventLog('important', '腐败', '您向纪委提交了书面说明');
        break;
      case 'influence':
        if ((player.politicalCapital||0) < 10) { this.showToast('政治资本不足', 'warning'); return; }
        player.politicalCapital -= 10;
        c.investigationWeeks = Math.max(0, (c.investigationWeeks||0) - 3);
        if (c.investigationState === 'preliminary') c.investigationState = 'undercurrent';
        this._addEventLog('important', '腐败', '您通过关系延缓了调查进度');
        break;
      case 'scapegoat':
        if ((player.politicalCapital||0) < 5) { this.showToast('政治资本不足', 'warning'); return; }
        player.politicalCapital -= 5;
        c.level = Math.max(0, c.level - 15);
        c.investigationRisk = Math.max(0, (c.investigationRisk||0) - 15);
        this._addEventLog('important', '腐败', '您找了替罪羊承担部分责任');
        break;
      case 'confess':
        c.level = Math.max(0, c.level - 30);
        c.investigationState = 'none';
        c.investigationWeeks = 0;
        this.showToast('您主动坦白，组织从轻处理，给予党内严重警告', 'info');
        this._addEventLog('important', '腐败', '您主动坦白，从轻处理');
        break;
      case 'resist':
        this.showToast('顽抗态度导致调查升级', 'error');
        this._addEventLog('important', '腐败', '您选择对抗调查');
        break;
      case 'flee':
        var engine = gameEngine;
        if (engine && engine._endGame) {
          engine._endGame({ reason: 'corruption', description: '您因畏罪潜逃被全国通缉。' });
        }
        return;
    }

    this.showToast('操作完成', 'success');
    this._showCorruptionPanel();
    this.refreshAll();
  }

  // ==============================
  //  派系关系视图
  // ==============================

  /** 派系关系主视图 */
  _renderFactionView(c) {
    try {
      this._renderFactionViewSafe(c);
    } catch (e) {
      console.error('[派系视图] 渲染错误:', e, e.stack);
      c.innerHTML = '<div class="empty-state">⚠️ 派系视图渲染失败<br><span style="font-size:11px;color:var(--text-muted);">' + (e.message || '未知错误') + '</span></div>';
    }
  }

  /** 派系关系主视图（安全版本） */
  _renderFactionViewSafe(c) {
    var factionSys = gameEngine.getSystem('factions');
    var personnel = gameEngine.getSystem('personnel');
    if (!factionSys || !personnel) {
      c.innerHTML = '<div class="empty-state">请先进入游戏</div>';
      return;
    }
    var graph = factionSys.getRelationshipGraph();
    var clusters = factionSys.getFactionClusters();
    var all = personnel.getAll() || [];
    var self = this;

    // 山头卡片
    var clusterHtml = '<div class="fv-clusters">' +
      '<div class="fv-cluster-card' + (!this._factionFilter ? ' active' : '') + '" onclick="uiManager._factionFilter=null;uiManager.renderView(\'faction\')">' +
        '<div class="fv-cc-name">📊 全部</div>' +
        '<div class="fv-cc-count">' + all.length + '人</div>' +
      '</div>';

    var factionColors = { secretary: '#7c3aed', magistrate: '#2563eb', local: '#16a34a', appointed: '#dc2626', bureaucrat: '#d97706', nonaligned: '#9ca3af' };
    var factionNames = { secretary: '书记系', magistrate: '县长系', local: '本土系', appointed: '空降系', bureaucrat: '官僚系', nonaligned: '无派系' };

    for (var ci = 0; ci < clusters.length; ci++) {
      var cl = clusters[ci];
      var color = factionColors[cl.id] || '#9ca3af';
      var isActive = this._factionFilter === cl.id;
      clusterHtml += '<div class="fv-cluster-card' + (isActive ? ' active' : '') + '" onclick="uiManager._factionFilter=\'' + cl.id + '\';uiManager.renderView(\'faction\')">' +
        '<div class="fv-cc-name">' + (factionNames[cl.id] || cl.id) + '</div>' +
        '<div class="fv-cc-bar"><div class="fv-cc-fill" style="width:' + cl.power + '%;background:' + color + '"></div></div>' +
        '<div class="fv-cc-power">权势 ' + cl.power + '</div>' +
        '<div class="fv-cc-count">' + (cl.members ? cl.members.length : 0) + '人</div>' +
      '</div>';
    }
    clusterHtml += '</div>';

    // 过滤官员列表
    var filtered = all.filter(function(o) {
      if (!o) return false;
      if (self._factionFilter && o._factionId !== self._factionFilter) return false;
      return true;
    });

    // 关系网络图（SVG）
    var graphHtml = this._buildFactionGraphSVG(graph, filtered);

    // 官员列表
    var listHtml = filtered.map(function(o) {
      var name = o.name || '?';
      var title = o.title || '';
      var ability = o._ability || 50;
      var loyalty = o._loyalty || 50;
      var ambition = o._ambition || 50;
      var network = o._network || 0;
      var color = factionColors[o._factionId] || '#9ca3af';
      var isCommittee = ['magistrate','deputy_secretary','deputy_magistrate','discipline','organization','propaganda','politics_law','united_front','office_director'].indexOf(o.id) !== -1;
      return '<div class="fv-official-row" onclick="uiManager._showFactionOfficialDetail(\'' + o.id + '\')">' +
        '<div class="fv-or-avatar" style="background:' + color + ';">' + (isCommittee ? '⭐' : name[0]) + '</div>' +
        '<div class="fv-or-info">' +
          '<div class="fv-or-name">' + name + (isCommittee ? ' <span style="font-size:9px;color:var(--accent-gold);">常委</span>' : '') + '</div>' +
          '<div class="fv-or-title">' + title + '</div>' +
        '</div>' +
        '<div class="fv-or-stats">' +
          '<span class="fv-or-stat">💪' + ability + '</span>' +
          '<span class="fv-or-stat">❤️' + loyalty + '</span>' +
          '<span class="fv-or-stat">🔥' + ambition + '</span>' +
          '<span class="fv-or-stat">🔗' + network + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    c.innerHTML =
      '<div class="section-header">🔗 干部关系网络</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">点击山头过滤器 · 点击官员查看详情和操作 · 圆圈颜色=山头 · ⭐=常委</div>' +
      clusterHtml +
      '<div class="fv-graph-container">' +
        '<div class="fv-graph-title">关系网络图（连=朋友圈）</div>' +
        graphHtml +
      '</div>' +
      '<div class="section-header">' + (this._factionFilter ? (factionNames[this._factionFilter] || this._factionFilter) : '全部') + '干部 · ' + filtered.length + '人</div>' +
      '<div class="fv-officials">' + listHtml + '</div>';
  }

  /** 构建SVG关系网络图 */
  _buildFactionGraphSVG(graph, filtered) {
    if (!graph || graph.nodes.length === 0) return '<div style="padding:40px;text-align:center;color:var(--text-muted);">暂无数据</div>';

    // 把官员映射为node查找表
    var nodeMap = {};
    for (var ni = 0; ni < graph.nodes.length; ni++) {
      nodeMap[graph.nodes[ni].id] = graph.nodes[ni];
    }

    // 构建过滤后的节点和边
    var filteredIds = {};
    for (var fi = 0; fi < filtered.length; fi++) {
      filteredIds[filtered[fi].id] = true;
    }

    var displayNodes = [];
    for (var ni = 0; ni < graph.nodes.length; ni++) {
      if (filteredIds[graph.nodes[ni].id]) {
        displayNodes.push(graph.nodes[ni]);
      }
    }

    // 按领域和层级布局
    var domains = { general: [], economy: [], stability: [], livelihood: [], party: [] };
    var defaultOrder = ['general', 'economy', 'stability', 'livelihood', 'party'];
    var domainY = { general: 60, economy: 160, stability: 260, livelihood: 360, party: 460 };
    var domainLabel = { general: '核心领导', economy: '经济', stability: '维稳', livelihood: '民生', party: '党群' };

    for (var ni = 0; ni < displayNodes.length; ni++) {
      var n = displayNodes[ni];
      var d = n.domain || 'general';
      if (!domains[d]) d = 'general';
      domains[d].push(n);
    }

    // 最大高度
    var maxY = 540;
    var svgW = 600;

    var svgParts = ['<svg class="fv-graph-svg" viewBox="0 0 ' + svgW + ' ' + maxY + '">'];
    svgParts.push('<defs><marker id="fv-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L5 3L0 6" fill="none" stroke="var(--border-color)" stroke-width="0.8"/></marker></defs>');

    // 领域背景色块
    for (var di = 0; di < defaultOrder.length; di++) {
      var dk = defaultOrder[di];
      if (domains[dk].length === 0) continue;
      var yPos = domainY[dk] - 30;
      svgParts.push('<rect x="10" y="' + yPos + '" width="580" height="80" rx="8" fill="var(--bg-secondary)" opacity="0.3" stroke="var(--border-color)" stroke-width="0.3"/>');
      svgParts.push('<text x="16" y="' + (yPos + 14) + '" font-size="10" fill="var(--text-muted)" font-family="var(--font-sans)">' + domainLabel[dk] + '</text>');
    }

    // 分配节点位置
    var nodePositions = {};
    for (var dk = 0; dk < defaultOrder.length; dk++) {
      var domainNodes = domains[defaultOrder[dk]];
      if (domainNodes.length === 0) continue;
      var yBase = domainY[defaultOrder[dk]];
      var count = domainNodes.length;
      var spacing = Math.min(80, Math.max(40, (svgW - 80) / count));
      var startX = (svgW - (count - 1) * spacing) / 2;
      for (var ni2 = 0; ni2 < count; ni2++) {
        var nn = domainNodes[ni2];
        var xPos = startX + ni2 * spacing;
        var yPos = nn.isCommittee ? yBase - 15 : yBase;
        nodePositions[nn.id] = { x: xPos, y: yPos };
      }
    }

    // 修正位置冲突
    var posArr = [];
    for (var id in nodePositions) posArr.push({ id: id, x: nodePositions[id].x, y: nodePositions[id].y });
    for (var pi = 0; pi < posArr.length; pi++) {
      for (var pj = pi + 1; pj < posArr.length; pj++) {
        if (Math.abs(posArr[pi].x - posArr[pj].x) < 30 && Math.abs(posArr[pi].y - posArr[pj].y) < 40) {
          posArr[pj].x += 35;
        }
      }
    }

    // 画连线
    var drawnEdges = {};
    for (var ei = 0; ei < graph.edges.length; ei++) {
      var e = graph.edges[ei];
      if (!nodePositions[e.source] || !nodePositions[e.target]) continue;
      if (!filteredIds[e.source] || !filteredIds[e.target]) continue;
      var edgeKey = e.source < e.target ? e.source + '-' + e.target : e.target + '-' + e.source;
      if (drawnEdges[edgeKey]) continue;
      drawnEdges[edgeKey] = true;
      var p1 = nodePositions[e.source], p2 = nodePositions[e.target];
      var wCls = (e.weight || 1) >= 3 ? 'strong' : (e.weight || 1) <= 1 ? 'weak' : '';
      svgParts.push('<line class="fv-edge ' + wCls + '" x1="' + p1.x + '" y1="' + (p1.y + 20) + '" x2="' + p2.x + '" y2="' + (p2.y + 20) + '" marker-end="url(#fv-arrow)"/>');
    }

    // 画节点
    var factionColors2 = { secretary: '#7c3aed', magistrate: '#2563eb', local: '#16a34a', appointed: '#dc2626', bureaucrat: '#d97706', nonaligned: '#9ca3af' };
    for (var ni3 = 0; ni3 < displayNodes.length; ni3++) {
      var node = displayNodes[ni3];
      var pos = nodePositions[node.id];
      if (!pos) continue;
      var color = factionColors2[node.factionId] || '#9ca3af';
      var r = node.isCommittee ? 22 : 16;
      svgParts.push('<g class="fv-node" onclick="uiManager._showFactionOfficialDetail(\'' + node.id + '\')">' +
        '<circle class="fv-node-circle" cx="' + pos.x + '" cy="' + (pos.y + 20) + '" r="' + r + '" fill="' + color + '"' + (node.isCommittee ? ' stroke="#ffd700" stroke-width="2.5"' : '') + '/>' +
        '<text class="fv-node-text' + (node.isCommittee ? ' committee' : '') + '" x="' + pos.x + '" y="' + (pos.y + 20 + 4) + '" fill="#fff" font-weight="' + (node.isCommittee ? '600' : '400') + '">' + (node.name ? node.name.substring(0, 3) : '?') + '</text>' +
      '</g>');
    }

    svgParts.push('</svg>');
    return svgParts.join('\n');
  }

  /** 官员关系详情弹窗 */
  _showFactionOfficialDetail(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    var factionSys = gameEngine.getSystem('factions');
    if (!personnel || !factionSys) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var profile = factionSys.getProfile(officialId);
    if (!profile) return;

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    var self = this;
    var ability = profile.ability || o._ability || 50;
    var loyalty = o._loyalty || 50;
    var ambition = o._ambition || 50;
    var network = o._network || 0;
    var friends = profile.friends || [];
    var factionName = profile.factionName || o.faction || '中立';
    var bgTags = (profile.background || []).join(' · ') || '无记录';
    var isCommittee = ['magistrate','deputy_secretary','deputy_magistrate','discipline','organization','propaganda','politics_law','united_front','office_director'].indexOf(o.id) !== -1;

    // 朋友圈显示
    var friendsHtml = friends.map(function(fid) {
      var f = personnel.get(fid);
      if (!f) return '';
      return '<span class="fd-friend-tag" onclick="uiManager._showFactionOfficialDetail(\'' + f.id + '\')">' + (f.name || '?') + '</span>';
    }).join('') || '<span style="font-size:11px;color:var(--text-muted);">暂无密友</span>';

    // 能力值显示
    var abilKeys = ['profession','execution','coordination','innovation','economy','politics','crisis','integrity'];
    var abilLabels = { profession:'专业', execution:'执行', coordination:'协调', innovation:'创新', economy:'经济', politics:'政治', crisis:'危机', integrity:'廉洁' };
    var abilHtml = abilKeys.map(function(k) {
      var v = o.abilities[k];
      if (v === undefined) return '';
      var color = v > 75 ? 'var(--accent-green)' : v > 55 ? 'var(--accent-yellow)' : 'var(--accent-red)';
      return '<div class="fd-stat"><div class="fd-stat-label">' + (abilLabels[k] || k) + '</div><div class="fd-stat-val" style="color:' + color + '">' + v + '</div></div>';
    }).join('');

    // 操作按钮
    var isPlayer = stateManager.get('player');
    var actionsHtml = '';
    if (isPlayer) {
      // 管理层级标记
      var tierLabel = o._managementTier === 'city' ? '市管' : '县管';
      var tierColor = o._managementTier === 'city' ? 'var(--accent-blue)' : 'var(--accent-green)';
      var apptTypeLabel = o._appointmentType === 'gov' ? '政府职务·需人大任命' : '党内职务';
      var isInProcess = o._appointmentStatus && o._appointmentStatus !== 'completed';

      actionsHtml = '<div class="fd-section"><div class="fd-section-title">⚡ 操作</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:6px;">' +
          '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:' + tierColor + '22;color:' + tierColor + ';">' + tierLabel + '</span>' +
          '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(22,163,74,0.1);color:var(--accent-green);">' + apptTypeLabel + '</span>' +
          (isInProcess ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(234,179,8,0.1);color:#eab308;">⚙️ 流程中</span>' : '') +
        '</div>' +
        '<div class="fd-actions">' +
        (!isInProcess ? '<button class="fd-action-btn" onclick="uiManager._startAppointment(\'' + officialId + '\')">📋 启动任免流程</button>' :
          '<button class="fd-action-btn" onclick="uiManager._showAppointmentProcess(\'' + officialId + '\')">⚙️ 查看流程</button>') +
        '<button class="fd-action-btn" onclick="uiManager._factionTalk(\'' + officialId + '\')">💬 谈话</button>' +
        '<button class="fd-action-btn" onclick="uiManager._factionPromote(\'' + officialId + '\')">⬆ 提拔</button>' +
        (!isCommittee ? '<button class="fd-action-btn" onclick="uiManager._factionTransfer(\'' + officialId + '\')">🔄 调任</button>' : '') +
        '<button class="fd-action-btn danger" onclick="uiManager._factionPunish(\'' + officialId + '\')">⚖️ 查处</button>' +
      '</div></div>';
    }

    // 履历背景
    var bgHtml = bgTags ? '<div class="fd-section"><div class="fd-section-title">📋 履历</div><div style="font-size:11px;color:var(--text-secondary);">' + bgTags + '</div></div>' : '';

    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="modal-card" style="max-width:560px;"><div class="mc-header"><span class="mc-icon">👤</span><span class="mc-title">' + o.name + ' · ' + o.title + '</span>' +
      '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(37,99,235,0.1);color:var(--accent-blue);">' + factionName + '</span>' +
      (isCommittee ? '<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(255,215,0,0.15);color:var(--accent-gold);margin-left:4px;">⭐ 常委</span>' : '') +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div class="fd-section"><div class="fd-section-title">📊 干部属性</div><div class="fd-stats">' +
          '<div class="fd-stat"><div class="fd-stat-label">💪 综合能力</div><div class="fd-stat-val" style="color:' + (ability > 70 ? 'var(--accent-green)' : ability > 50 ? 'var(--accent-yellow)' : 'var(--accent-red)') + ';">' + ability + '</div></div>' +
          '<div class="fd-stat"><div class="fd-stat-label">❤️ 忠诚度</div><div class="fd-stat-val" style="color:' + (loyalty > 60 ? 'var(--accent-green)' : loyalty > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)') + ';">' + loyalty + '</div></div>' +
          '<div class="fd-stat"><div class="fd-stat-label">🔥 野心</div><div class="fd-stat-val" style="color:' + (ambition > 60 ? 'var(--accent-orange)' : 'var(--text-primary)') + ';">' + ambition + '</div></div>' +
          '<div class="fd-stat"><div class="fd-stat-label">🔗 关系网</div><div class="fd-stat-val">' + network + '人</div></div>' +
        '</div></div>' +
        '<div class="fd-section"><div class="fd-section-title">📈 能力明细</div><div class="fd-stats">' + abilHtml + '</div></div>' +
        bgHtml +
        '<div class="fd-section"><div class="fd-section-title">🤝 朋友圈 (' + friends.length + '人)</div><div class="fd-friends">' + friendsHtml + '</div></div>' +
        actionsHtml +
        '<div id="fd-chain-container" class="fd-chain-effects" style="display:none;"></div>' +
      '</div></div>';
  }

  /** 社会视图 — 群体情绪 + 舆论热点 + 社会网络 */
  _renderSocial(c) {
    var socialSys = gameEngine.getSystem('social');
    var county = stateManager.get('county');
    if (!socialSys || !county) { c.innerHTML = '<div class="empty-state">社会数据未初始化</div>'; return; }

    var groups = socialSys.getGroupSummary() || [];
    var opData = socialSys.getPublicOpinionData();
    var networkData = socialSys.getSocialNetworkData();
    var tension = county.socialTension || 0;
    var satisfaction = stateManager.get('social')?.satisfaction || 60;
    var pendingActions = socialSys.getPendingActions() || [];

    // v3：信访摘要数据
    var petitionState = stateManager.get('petition');
    var activeCases = petitionState ? petitionState.cases.filter(function(x) { return x.status !== 'resolved' && x.status !== 'archived'; }) : [];
    var petitionPressure = petitionState ? (petitionState.stats?.petitionPressure || 30) : 30;
    var backlogWarnings = [];
    if (socialSys.getBacklogStats) {
      var bls = socialSys.getBacklogStats();
      for (var bi = 0; bi < bls.length; bi++) {
        var bg = (stateManager.get('social')?.groups || []).find(function(g) { return g.id === bls[bi].groupType || g.type === bls[bi].groupType; });
        backlogWarnings.push({ label: bg ? bg.label : bls[bi].groupType, count: bls[bi].count, critical: bls[bi].critical });
      }
    }
    var allocData = socialSys.getAllocation ? socialSys.getAllocation() : { total: 100, allocated: { petitionResolve: 0, patrolDeter: 0, conflictInvestigation: 0, opinionMonitoring: 0 }, used: 0 };

    // v3：滑块HTML生成函数
    function sliderInput(key, label, value, color) {
      var idx = ['petitionResolve', 'patrolDeter', 'conflictInvestigation', 'opinionMonitoring'].indexOf(key);
      return '<div style="font-size:11px;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<span data-term="' + key + '" style="cursor:help;">' + label + '</span>' +
          '<span style="color:' + color + ';font-weight:500;" id="resVal' + idx + '">' + value + '</span>' +
        '</div>' +
        '<input type="range" min="0" max="100" value="' + value + '" ' +
          'oninput="uiManager._updateResourceSlider(' + idx + ', this.value)" ' +
          'style="width:100%;height:4px;accent-color:' + color + ';" />' +
      '</div>';
    }

    // 张力/满意度 仪表
    var tensionColor = tension > 70 ? 'var(--accent-red)' : tension > 50 ? '#eab308' : 'var(--accent-green)';
    var satColor = satisfaction < 40 ? 'var(--accent-red)' : satisfaction < 60 ? '#eab308' : 'var(--accent-green)';

    // 群体卡片
    var groupCards = groups.map(function(g) {
      var riskColor = g.grievance > 50 ? 'var(--accent-red)' : g.grievance > 30 ? '#eab308' : 'var(--accent-green)';
      var mobPct = g.mobilization || 0;
      return '<div class="group-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:10px;border-left:3px solid ' + riskColor + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-size:12px;font-weight:600;">' + g.label + '</span>' +
          '<span style="font-size:10px;color:var(--text-muted);">' + (g.ratio * 100).toFixed(0) + '%</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:6px;font-size:11px;">' +
          '<span data-term="satisfaction" style="cursor:help;">😊 ' + Math.round(g.satisfaction) + '</span>' +
          '<span data-term="grievance" style="color:' + riskColor + ';cursor:help;">😤 ' + Math.round(g.grievance) + '</span>' +
          '<span data-term="mobilization" style="cursor:help;">⬆ ' + Math.round(mobPct) + '%</span>' +
          '<span style="color:var(--text-muted);font-size:10px;">' + (g.action || '稳定') + '</span>' +
        '</div>' +
        (mobPct > 0 ? '<div style="margin-top:4px;height:3px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">' +
          '<div style="height:100%;width:' + Math.min(100, mobPct) + '%;background:' + riskColor + ';border-radius:2px;"></div>' +
        '</div>' : '') +
      '</div>';
    }).join('');

    // 舆论热点卡片
    var topicCards = (opData.topics || []).slice(0, 8).map(function(t) {
      var valColor = t.valence < 0 ? 'var(--accent-red)' : 'var(--accent-green)';
      var heatBar = Math.min(100, t.heat);
      return '<div class="topic-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;font-size:11px;">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">' + t.title + '</span>' +
          '<span style="color:' + valColor + ';font-weight:600;margin-left:6px;">' + (t.valence > 0 ? '+' : '') + t.valence + '</span>' +
        '</div>' +
        '<div style="margin-top:3px;height:3px;background:var(--bg-secondary);border-radius:2px;overflow:hidden;">' +
          '<div style="height:100%;width:' + heatBar + '%;background:' + (t.valence < 0 ? 'var(--accent-red)' : 'var(--accent-green)') + ';border-radius:2px;opacity:0.7;"></div>' +
        '</div>' +
        '<div style="margin-top:2px;font-size:9px;color:var(--text-muted);">热度 ' + Math.round(t.heat) + (t.suppressed ? ' 🔇' : '') + '</div>' +
      '</div>';
    }).join('') || '<div class="empty-state" style="padding:12px;">暂无活跃舆论热点</div>';

    // 社会网络（简化版）
    var networkSvg = '';
    if (networkData && networkData.nodes && networkData.nodes.length > 0) {
      var svgW = 500, svgH = 220;
      var centerX = 250, centerY = 110, radius = 80;
      var nodeCount = networkData.nodes.length;
      networkSvg = '<svg width="' + svgW + '" height="' + svgH + '" style="background:transparent;display:block;margin:0 auto;">';
      for (var ni = 0; ni < networkData.nodes.length; ni++) {
        var angle = (2 * Math.PI * ni / nodeCount) - Math.PI / 2;
        var nx = centerX + radius * Math.cos(angle);
        var ny = centerY + radius * Math.sin(angle);
        var n = networkData.nodes[ni];
        var gv = n.grievance || 50;
        var col = gv > 60 ? '#dc2626' : gv > 35 ? '#eab308' : '#22c55e';
        networkSvg += '<circle cx="' + nx + '" cy="' + ny + '" r="20" fill="' + col + '44" stroke="' + col + '" stroke-width="1.5"/>';
        networkSvg += '<text x="' + nx + '" y="' + ny + '" fill="var(--text-primary)" font-size="8" text-anchor="middle" dominant-baseline="central">' + (n.label || n.id || '?').substring(0, 4) + '</text>';
      }
      // 画连线
      for (var ei = 0; ei < (networkData.edges || []).length; ei++) {
        var e = networkData.edges[ei];
        var srcIdx = -1, tgtIdx = -1;
        for (var fi = 0; fi < networkData.nodes.length; fi++) {
          if (networkData.nodes[fi].id === e.source) srcIdx = fi;
          if (networkData.nodes[fi].id === e.target) tgtIdx = fi;
        }
        if (srcIdx >= 0 && tgtIdx >= 0) {
          var a1 = (2 * Math.PI * srcIdx / nodeCount) - Math.PI / 2;
          var a2 = (2 * Math.PI * tgtIdx / nodeCount) - Math.PI / 2;
          var x1 = centerX + radius * Math.cos(a1), y1 = centerY + radius * Math.sin(a1);
          var x2 = centerX + radius * Math.cos(a2), y2 = centerY + radius * Math.sin(a2);
          var ec = e.type === 'positive' ? 'rgba(34,197,94,0.3)' : 'rgba(220,38,38,0.3)';
          networkSvg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + ec + '" stroke-width="' + Math.max(0.5, (e.weight || 0.5)) + '"/>';
        }
      }
      networkSvg += '</svg>';
    } else {
      networkSvg = '<div class="empty-state" style="padding:16px;">数据不足</div>';
    }

    // 舆情控制面板
    var opControls = '<div style="display:flex;gap:6px;margin-top:6px;">' +
      '<button class="fd-action-btn" onclick="uiManager._socialPropaganda()" style="font-size:10px;padding:4px 8px;">📢 宣传引导</button>' +
      '<button class="fd-action-btn" onclick="uiManager._socialSuppress()" style="font-size:10px;padding:4px 8px;border-color:var(--accent-red);color:var(--accent-red);">🔇 压制信息</button>' +
    '</div>';

    // v3：互动引导提示（在innerHTML之前计算）
    var guideHtml = '';
    var hints = [];
    var playerEnergy = (stateManager.get('player')?.status?.energy) ?? 100;
    var allocUsed2 = allocData.allocated.petitionResolve + allocData.allocated.patrolDeter + allocData.allocated.conflictInvestigation + allocData.allocated.opinionMonitoring;
    if (playerEnergy < 15) hints.push('<span style="color:var(--accent-red);">⚠️ 精力极低(' + playerEnergy + ')，本周减少操作，等待下周恢复。</span>');
    else if (playerEnergy < 30) hints.push('<span style="color:var(--accent-yellow);">⚡ 精力偏低(' + playerEnergy + ')，优先处理积案和排查。</span>');
    if (backlogWarnings.length > 0) {
      var crit = backlogWarnings.filter(function(b) { return b.critical; });
      if (crit.length > 0) hints.push('<span style="color:var(--accent-red);">🔥 ' + crit[0].label + '积案严重！点击信访态势下方"查看详情"立即处理。</span>');
      else hints.push('<span style="color:var(--accent-yellow);">📋 ' + backlogWarnings.length + '类群体积案，建议点击"排查专项行动"。</span>');
    }
    if (activeCases.length > 5) hints.push('<span style="color:var(--accent-yellow);">📬 在办案件' + activeCases.length + '件，增加信访化解资源可加速处理。</span>');
    else if (activeCases.length > 0) hints.push('<span style="color:var(--text-muted);">📬 ' + activeCases.length + '件在办，局势可控。</span>');
    else hints.push('<span style="color:var(--accent-green);">✅ 无在办案件，社会状态稳定。</span>');
    if (pendingActions.length > 0) hints.push('<span style="color:var(--accent-red);">🚨 ' + pendingActions.length + '件集体行动待处理！在上方"待处理行动"区域响应。</span>');
    if (allocUsed2 === 0 && activeCases.length > 0) hints.push('<span style="color:var(--text-muted);">💡 维稳资源未分配，往下滑调整滑块。</span>');
    if (hints.length > 0) {
      guideHtml = '<div class="brief-section" style="margin-top:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;">' +
        '<div style="font-size:11px;font-weight:500;margin-bottom:4px;">💡 行动指引</div>' +
        hints.map(function(h) { return '<div style="font-size:11px;line-height:1.6;padding:2px 0;">' + h + '</div>'; }).join('') +
      '</div>';
    }

    c.innerHTML =
      '<div class="section-header">👥 社会系统 · 群体情绪与舆论</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
        '<div class="kpi-item" data-term="socialTension" style="padding:10px;background:var(--bg-card);border:1px solid var(--border-color);border-left:3px solid ' + tensionColor + ';cursor:help;">' +
          '<div style="font-size:10px;color:var(--text-muted);">社会张力</div>' +
          '<div style="font-size:20px;font-weight:700;color:' + tensionColor + ';">' + Math.round(tension) + '</div>' +
        '</div>' +
        '<div class="kpi-item" data-term="satisfaction" style="padding:10px;background:var(--bg-card);border:1px solid var(--border-color);border-left:3px solid ' + satColor + ';cursor:help;">' +
          '<div style="font-size:10px;color:var(--text-muted);">群众满意度</div>' +
          '<div style="font-size:20px;font-weight:700;color:' + satColor + ';">' + Math.round(satisfaction) + '</div>' +
        '</div>' +
      '</div>' +
      // 群体情绪面板
      '<div class="brief-section"><div class="brief-s-title">📊 群体情绪监测</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' + groupCards + '</div>' +
      '</div>' +
      // 待处理行动（如果有）
      (pendingActions.length > 0 ? '<div class="brief-section"><div class="brief-s-title" style="color:var(--accent-red);">🚨 待处理行动</div>' +
        pendingActions.map(function(a) {
          var col = a.level >= 4 ? 'var(--accent-red)' : a.level >= 3 ? '#eab308' : 'var(--accent-cyan)';
          return '<div class="event-alert-card" style="background:' + col + '22;border-left-color:' + col + ';" onclick="uiManager._showSocialActionModal(\'' + a.id + '\')">' +
            '<span class="event-alert-type" style="background:' + col + '44;color:' + col + ';">' + (a.icon || '⚠️') + ' Lv.' + a.level + '</span>' +
            '<span class="event-alert-name">' + a.groupLabel + a.name + '</span>' +
            '<span class="event-alert-action">→</span></div>';
        }).join('') + '</div>' : '') +
      // 舆论面板
      '<div class="brief-section" style="margin-top:8px;">' +
        '<div class="brief-s-title" style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span>📰 舆论热点</span>' +
          '<span style="font-size:10px;color:var(--text-muted);">宣传力 <span data-term="propagandaPower">' + Math.round(opData.propagandaPower || 50) + '</span> · 谣言风险 <span data-term="rumorRisk">' + Math.round(opData.rumorRisk || 30) + '</span> · 透明度 <span data-term="transparency">' + Math.round(opData.transparency || 40) + '</span></span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">' + topicCards + '</div>' +
        opControls +
      '</div>' +
      // 社会网络
      '<div class="brief-section" style="margin-top:8px;">' +
        '<div class="brief-s-title">🔗 群体关系网络（节点大小=怨气，绿=低·黄=中·红=高）</div>' +
        '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;margin-top:4px;">' + networkSvg + '</div>' +
      '</div>' +

      // === v3：信访态势摘要 ===
      '<div class="brief-section" style="margin-top:8px;">' +
        '<div class="brief-s-title" style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span>✉️ 信访态势</span>' +
          '<button class="sc-btn" id="btn-petition-detail" style="font-size:10px;padding:2px 8px;" onclick="uiManager._togglePetitionDetail()">查看详情 ▼</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px;">' +
          '<div data-term="petitionPressure" style="text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;cursor:help;">' +
            '<div style="font-size:18px;font-weight:700;color:' + (petitionPressure > 60 ? 'var(--accent-red)' : petitionPressure > 30 ? '#eab308' : 'var(--accent-green)') + ';">' + Math.round(petitionPressure) + '</div>' +
            '<div style="font-size:10px;color:var(--text-muted);">信访压力</div>' +
          '</div>' +
          '<div style="text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;">' +
            '<div style="font-size:18px;font-weight:700;">' + activeCases.length + '</div>' +
            '<div style="font-size:10px;color:var(--text-muted);">在办案件</div>' +
          '</div>' +
          // 积案预警
          (backlogWarnings.length > 0 ?
            '<div style="text-align:center;background:var(--accent-red)11;border:1px solid var(--accent-red);border-radius:6px;padding:8px;">' +
              '<div style="font-size:14px;font-weight:700;color:var(--accent-red);">' + backlogWarnings.length + '</div>' +
              '<div style="font-size:10px;color:var(--accent-red);">积案预警</div>' +
            '</div>' :
            '<div style="text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:8px;">' +
              '<div style="font-size:14px;font-weight:700;color:var(--accent-green);">✓</div>' +
              '<div style="font-size:10px;color:var(--text-muted);">无积案</div>' +
            '</div>') +
        '</div>' +
        (backlogWarnings.length > 0 ? '<div style="margin-top:6px;font-size:10px;color:var(--accent-red);">' +
          backlogWarnings.map(function(bw) { return '⚠️ ' + bw.label + '积案' + bw.count + '件，化解率低'; }).join('<br>') + '</div>' : '') +
        // v3：信访详情展开区域
        '<div id="petition-detail-inline" style="display:none;"></div>' +
      '</div>' +

      // === v3：维稳资源分配面板 ===
      '<div class="brief-section" style="margin-top:8px;">' +
        '<div class="brief-s-title">🛡️ 维稳资源分配（本周可用：' + allocData.total + '）</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px;">' +
          sliderInput('petitionResolve', '信访化解', allocData.allocated.petitionResolve, '#22c55e') +
          sliderInput('patrolDeter', '巡逻防控', allocData.allocated.patrolDeter, '#3b82f6') +
          sliderInput('conflictInvestigation', '矛盾排查', allocData.allocated.conflictInvestigation, '#eab308') +
          sliderInput('opinionMonitoring', '舆情监控', allocData.allocated.opinionMonitoring, '#a855f7') +
        '</div>' +
        '<button class="sc-btn" style="font-size:10px;padding:3px 10px;margin-top:4px;" onclick="uiManager._applyResourceAllocation()">应用分配</button>' +
        '<span id="resourceTotalDisplay" style="font-size:10px;color:var(--text-muted);margin-left:8px;"></span>' +
      '</div>' +

      // === v3：主动管理操作 ===
      '<div class="brief-section" style="margin-top:8px;">' +
        '<div class="brief-s-title">🎯 主动管理</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">' +
          '<button class="fd-action-btn" data-term="proactiveInvestigate" onclick="uiManager._socialInvestigate()" style="font-size:10px;padding:4px 8px;cursor:help;">👣 下访调研</button>' +
          '<button class="fd-action-btn" data-term="proactiveSweep" onclick="uiManager._socialSweep()" style="font-size:10px;padding:4px 8px;cursor:help;">🔍 排查专项行动</button>' +
          '<button class="fd-action-btn" data-term="proactiveMeeting" onclick="uiManager._socialMeeting()" style="font-size:10px;padding:4px 8px;cursor:help;">🤝 联席会议</button>' +
          '<button class="fd-action-btn" data-term="proactiveLivelihood" onclick="uiManager._socialLivelihood()" style="font-size:10px;padding:4px 8px;cursor:help;">🏗️ 民生微工程</button>' +
        '</div>' +
      '</div>' +
      guideHtml;
  }

  /** 经济视图 — EU4式产业与税收面板 */
  _renderEconomy(c) {
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    if (!county) { c.innerHTML = '<div class="empty-state">暂无数据</div>'; return; }

    const gdp = county.economy?.gdp || 0;
    const gdpGrowth = county.economy?.gdpGrowth || 0;
    const agR = (county.economy?.agricultureRatio || 0) * 100;
    const indR = (county.economy?.industrialRatio || 0) * 100;
    const svR = (county.economy?.serviceRatio || 0) * 100;
    const ecoVital = county.economy?.economicVitality ?? 50;
    const inc = finance?.incomeBreakdown || {};
    const exp = finance?.expenseBreakdown || {};

    // 产业类型标签
    function sectorTag(name, icn, val, color) {
      return '<div style="padding:10px;background:var(--bg-card);border-radius:6px;border-left:3px solid ' + color + ';">' +
        '<div style="font-size:11px;color:var(--text-muted);">' + icn + ' ' + name + '</div>' +
        '<div style="font-size:18px;font-weight:600;color:' + color + ';">' + val + '</div></div>';
    }

    // 收支条目
    function incRow(label, val, depth) {
      var pad = depth * 12;
      return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;padding-left:' + pad + 'px;border-bottom:1px solid var(--border-color);">' +
        '<span style="color:var(--text-secondary);">' + label + '</span>' +
        '<span style="font-weight:500;">' + (val || 0).toLocaleString() + '万</span></div>';
    }

    // 经济总览
    var growthColor = gdpGrowth >= 0.05 ? 'var(--accent-green)' : gdpGrowth >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    var gdpYi = (gdp / 10000).toFixed(1);

    c.innerHTML =
      '<div style="padding:12px;display:flex;flex-direction:column;gap:10px;">' +
        // === 顶部GDP卡片 ===
        '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;">' +
          '<div style="padding:12px;background:var(--bg-card);border-radius:8px;">' +
            '<div style="font-size:11px;color:var(--text-muted);">📊 地区生产总值</div>' +
            '<div style="font-size:24px;font-weight:700;">' + gdpYi + '<span style="font-size:12px;color:var(--text-muted);"> 亿元</span></div>' +
            '<div style="font-size:11px;color:' + growthColor + ';margin-top:2px;">' + (gdpGrowth >= 0 ? '▲' : '▼') + ' ' + (gdpGrowth * 100).toFixed(1) + '% 同比</div>' +
          '</div>' +
          sectorTag('第一产业·农业', '🌾', agR.toFixed(0) + '%', 'var(--accent-green)') +
          sectorTag('第二产业·工业', '🏭', indR.toFixed(0) + '%', 'var(--accent-red)') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">' +
          sectorTag('第三产业·服务业', '🏪', svR.toFixed(0) + '%', 'var(--accent-blue)') +
          '<div style="padding:10px;background:var(--bg-card);border-radius:6px;">' +
            '<div style="font-size:11px;color:var(--text-muted);">📈 经济活力</div>' +
            '<div style="font-size:18px;font-weight:600;">' + ecoVital + '<span style="font-size:10px;color:var(--text-muted);">/100</span></div>' +
            '<div style="height:4px;background:var(--border-color);border-radius:2px;margin-top:4px;overflow:hidden;">' +
              '<div style="height:100%;width:' + ecoVital + '%;background:' + (ecoVital > 60 ? 'var(--accent-green)' : ecoVital > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)') + ';border-radius:2px;"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // === EU4式收入树 ===
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--accent-green);">💰 月收入 ' + (finance?.monthlyIncome || 0).toLocaleString() + '万</div>' +
          '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid var(--border-color);">税收收入</div>' +
          incRow('  增值税（工业销售×13%）', inc?.tax?.sub?.vat?.value, 1) +
          incRow('  企业所得税（利润×25%）', inc?.tax?.sub?.corpTax?.value, 1) +
          incRow('  服务业营业税（营收×6%）', inc?.tax?.sub?.serviceTax?.value, 1) +
          incRow('  个人所得税', inc?.tax?.sub?.personalTax?.value, 1) +
          incRow('小计', inc?.tax?.total, 0) +
          '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid var(--border-color);margin-top:4px;">转移支付</div>' +
          incRow('  一般性转移', inc?.transfer?.sub?.general?.value, 1) +
          incRow('  专项转移', inc?.transfer?.sub?.special?.value, 1) +
          incRow('  税收返还', inc?.transfer?.sub?.taxReturn?.value, 1) +
          incRow('小计', inc?.transfer?.total, 0) +
          '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid var(--border-color);margin-top:4px;">非税收入</div>' +
          incRow('  行政收费', inc?.nonTax?.sub?.adminFees?.value, 1) +
          incRow('  罚没收入', inc?.nonTax?.sub?.fines?.value, 1) +
          incRow('  土地出让', inc?.nonTax?.sub?.land?.value, 1) +
          incRow('  国企利润上缴', inc?.nonTax?.sub?.stateProfit?.value, 1) +
          incRow('小计', inc?.nonTax?.total, 0) +
        '</div>' +

        // === EU4式支出树 ===
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--accent-red);">📤 月支出 ' + (finance?.monthlyExpense || 0).toLocaleString() + '万</div>' +
          incRow('在编工资', exp?.personnel?.sub?.salary?.value, 0) +
          incRow('社保公积金', exp?.personnel?.sub?.social?.value, 0) +
          incRow('公用经费', exp?.operating?.total, 0) +
          incRow('项目支出', exp?.project?.total, 0) +
          incRow('债务利息', exp?.debtInterest?.total, 0) +
          '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;padding:6px 0;margin-top:4px;border-top:2px solid var(--accent-red);">' +
            '<span>月结余</span>' +
            '<span style="color:' + ((finance?.monthlyBalance || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' +
              ((finance?.monthlyBalance || 0) >= 0 ? '+' : '') + (finance?.monthlyBalance || 0).toLocaleString() + '万</span>' +
          '</div>' +
        '</div>' +

        // === 征收率滑块 ===
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span style="font-size:12px;font-weight:600;">⚖ 征收率</span>' +
            '<span style="font-size:11px;color:var(--text-muted);">' + Math.round((finance?.collectRate || 0.75) * 100) + '%</span>' +
          '</div>' +
          '<div style="display:flex;gap:4px;">' +
            '<button class="fd-action-btn" onclick="gameEngine.getSystem(\'finance\')?.setCollectRate(Math.max(0.3, (stateManager.get(\'finance\')?.collectRate||0.75)-0.05))" style="font-size:10px;padding:2px 8px;">−5%</button>' +
            '<div style="flex:1;height:6px;background:var(--border-color);border-radius:3px;margin:6px 0;overflow:hidden;">' +
              '<div style="height:100%;width:' + ((finance?.collectRate || 0.75) * 100) + '%;background:' + ((finance?.collectRate || 0.75) > 0.9 ? 'var(--accent-red)' : 'var(--accent-blue)') + ';border-radius:3px;transition:width 0.3s;"></div>' +
            '</div>' +
            '<button class="fd-action-btn" onclick="gameEngine.getSystem(\'finance\')?.setCollectRate(Math.min(1.0, (stateManager.get(\'finance\')?.collectRate||0.75)+0.05))" style="font-size:10px;padding:2px 8px;">+5%</button>' +
          '</div>' +
          '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">征收率>90%每月+0.3社会张力，<50%引发县长不满</div>' +
        '</div>' +

        // === 重点企业 ===
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:6px;">🏢 重点企业</div>' +
          (gameEngine.getSystem('economy')?.getEnterprises() || []).slice(0, 4).map(function(e) {
            return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-color);">' +
              '<span>' + e.name + '</span>' +
              '<span style="color:var(--text-muted);">' + (e.employees || 0).toLocaleString() + '人 · ' + (e.type === 'state' ? '国企' : e.type === 'private' ? '民营' : '集体') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +

        // === 财政调控工具栏 ===
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:8px;">🎛 财政调控</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">' +

            // 节俭令
            '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                '<span style="font-weight:500;">📋 节俭令</span>' +
                '<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:' +
                  (finance?.austerityLevel === 0 ? 'rgba(63,185,80,0.15)' : finance?.austerityLevel === 1 ? 'rgba(210,153,34,0.15)' : 'rgba(248,81,73,0.15)') +
                  ';color:' +
                  (finance?.austerityLevel === 0 ? 'var(--accent-green)' : finance?.austerityLevel === 1 ? 'var(--accent-yellow)' : 'var(--accent-red)') +
                  ';">' + (['正常', '紧缩', '极简'][finance?.austerityLevel || 0]) + '</span>' +
              '</div>' +
              '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">' +
                (finance?.austerityLevel === 0 ? '当前：正常支出' : finance?.austerityLevel === 1 ? '公用经费-15%' : '公用经费-30%，效率下降') +
              '</div>' +
              '<button class="fd-action-btn" onclick="gameEngine.getSystem(\'finance\')?.toggleAusterity();uiManager.refreshAll();" style="font-size:10px;padding:3px 8px;width:100%;">' +
                (finance?.austerityLevel === 2 ? '恢复正常' : '收紧一级') +
              '</button>' +
            '</div>' +

            // 预算调剂
            '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;">' +
              '<div style="font-weight:500;margin-bottom:4px;">✏ 预算调剂</div>' +
              '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">压缩公用→充实预备费</div>' +
              '<div style="display:flex;gap:4px;">' +
                '<button class="fd-action-btn" onclick="var r=gameEngine.getSystem(\'finance\')?.reallocateBudget(\'operating\',\'reserve\',10);uiManager.refreshAll();if(r&&r.ok)uiManager.showToast(r.msg,\'info\');" style="font-size:9px;padding:2px 6px;flex:1;">转10%</button>' +
                '<button class="fd-action-btn" onclick="var r=gameEngine.getSystem(\'finance\')?.reallocateBudget(\'operating\',\'reserve\',20);uiManager.refreshAll();if(r&&r.ok)uiManager.showToast(r.msg,\'info\');" style="font-size:9px;padding:2px 6px;flex:1;">转20%</button>' +
                '<button class="fd-action-btn" onclick="var r=gameEngine.getSystem(\'finance\')?.reallocateBudget(\'project\',\'reserve\',15);uiManager.refreshAll();if(r&&r.ok)uiManager.showToast(r.msg,\'info\');" style="font-size:9px;padding:2px 6px;flex:1;">项目→预备</button>' +
              '</div>' +
            '</div>' +

            // 跑部钱进
            '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;">' +
              '<div style="font-weight:500;margin-bottom:4px;">🏃 跑部钱进</div>' +
              '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">' +
                (finance?.lobbyBoostMonths > 0 ? '✅ 已争取到加成，剩余' + finance.lobbyBoostMonths + '个月' : '转移支付+30%，持续6个月') +
              '</div>' +
              '<button class="fd-action-btn" onclick="var r=gameEngine.getSystem(\'finance\')?.lobbyForTransfer();uiManager.refreshAll();if(r){uiManager.showToast(r.msg||r,\'info\');}" style="font-size:10px;padding:3px 8px;width:100%;"' +
                (finance?.lobbyBoostMonths > 0 ? ' disabled' : '') +
              '>争取追加拨款</button>' +
            '</div>' +

            // 土地出让
            '<div style="padding:8px;background:var(--bg-secondary);border-radius:6px;">' +
              '<div style="font-weight:500;margin-bottom:4px;">🏗 土地出让</div>' +
              '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">' +
                '可出让地块：' + ((county?.resources?.land?.developablePlots || []).length) + '块' +
              '</div>' +
              ((county?.resources?.land?.developablePlots || []).length > 0
                ? (function() {
                    var plots = county.resources.land.developablePlots;
                    return plots.slice(0, 3).map(function(p) {
                      return '<button class="fd-action-btn" onclick="var r=gameEngine.getSystem(\'finance\')?.sellLand(\'' + p.id + '\');uiManager.refreshAll();if(r&&r.ok)uiManager.showToast(r.msg,\'success\');" style="font-size:9px;padding:2px 6px;width:100%;margin-bottom:2px;">' +
                        p.location + p.type + '用地 ' + p.size + '公顷' +
                      '</button>';
                    }).join('');
                  })()
                : '<div style="font-size:10px;color:var(--text-muted);">已无可出让地块</div>'
              ) +
            '</div>' +

          '</div>' +
        '</div>' +

        // === V3式图表区 ===
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
            '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">💰 收入构成</div>' +
            '<canvas id="eco-donut-income" width="300" height="210" style="width:100%;height:210px;"></canvas>' +
          '</div>' +
          '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
            '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">📤 支出构成</div>' +
            '<canvas id="eco-donut-expense" width="300" height="210" style="width:100%;height:210px;"></canvas>' +
          '</div>' +
        '</div>' +
        '<div style="padding:10px;background:var(--bg-card);border-radius:8px;margin-bottom:8px;">' +
          '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">📈 GDP趋势</div>' +
          '<div style="display:flex;gap:12px;align-items:center;margin-bottom:4px;">' +
            '<span style="font-size:20px;font-weight:700;">' + gdpYi + '<span style="font-size:11px;color:var(--text-muted);">亿</span></span>' +
            '<span style="font-size:11px;color:' + growthColor + ';">' + (gdpGrowth >= 0 ? '▲' : '▼') + ' ' + (gdpGrowth * 100).toFixed(1) + '%</span>' +
            '<span style="font-size:10px;color:var(--text-muted);">同比</span>' +
          '</div>' +
          '<canvas id="eco-chart-gdp" width="600" height="100" style="width:100%;height:100px;"></canvas>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
            '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">📊 收支对比</div>' +
            '<canvas id="eco-chart-fiscal" width="300" height="140" style="width:100%;height:140px;"></canvas>' +
          '</div>' +
          '<div style="padding:10px;background:var(--bg-card);border-radius:8px;">' +
            '<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">🏦 国库余额</div>' +
            '<canvas id="eco-chart-treasury" width="300" height="140" style="width:100%;height:140px;"></canvas>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 延迟绘制图表
    var self = this;
    var drawCharts = function() {
      var hr = window.historyRecorder;
      if (!hr) return;
      try {
        // 环形图（V3式收支构成）
        var donutInc = document.getElementById('eco-donut-income');
        var donutExp = document.getElementById('eco-donut-expense');
        if (donutInc && inc?.tax?.total) {
          ChartHelper.drawDonutChart(donutInc, [
            { label: '税收', value: inc.tax.total || 0, color: '#3fb950' },
            { label: '转移支付', value: inc.transfer.total || 0, color: '#58a6ff' },
            { label: '非税', value: inc.nonTax.total || 0, color: '#d29922' },
          ], { centerLabel: '月收入' });
        }
        if (donutExp && exp?.personnel?.total) {
          ChartHelper.drawDonutChart(donutExp, [
            { label: '人员', value: exp.personnel.total || 0, color: '#f85149' },
            { label: '公用', value: exp.operating.total || 0, color: '#bc8cff' },
            { label: '项目', value: exp.project.total || 0, color: '#58a6ff' },
            { label: '债务利息', value: exp.debtInterest.total || 0, color: '#d29922' },
          ], { centerLabel: '月支出' });
        }

        // GDP趋势
        var canvas1 = document.getElementById('eco-chart-gdp');
        if (canvas1 && hr.records.length >= 1) {
          var gdpData = hr.getGDPTrend(12);
          ChartHelper.drawLineChart(canvas1, gdpData.values.length >= 2 ? gdpData.values : [0, gdpData.values[0] || 0], {
            color: '#4a90d9', min: 0,
            labels: gdpData.labels.length >= 2 ? gdpData.labels : ['', gdpData.labels[0] || ''],
          });
        }

        // 收支柱状图 + 国库趋势
        var canvas2 = document.getElementById('eco-chart-fiscal');
        var canvas3 = document.getElementById('eco-chart-treasury');
        if (canvas2 && canvas3 && hr.records.length >= 2) {
          var fisData = hr.getFiscalTrend(12);
          ChartHelper.drawBarChart(canvas2, [fisData.income, fisData.expense], {
            colors: ['#3fb950', '#f85149'], labels: fisData.labels, legend: ['收入', '支出'],
          });
          ChartHelper.drawLineChart(canvas3, fisData.treasury, {
            color: '#d29922', label: '国库（百万元）', labels: fisData.labels,
          });
        }
      } catch(e) { /* chart draw error */ }
    };
    requestAnimationFrame(function() { setTimeout(drawCharts, 30); });
  }

  /** 社会视图工具栏 · 宣传引导 */
  _socialPropaganda() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var player = stateManager.get('player');
    if (!player || (player.politicalCapital || 0) < 5) {
      if (typeof this.showToast === 'function') this.showToast('政治资本不足（需要5点）', 'warning');
      return;
    }
    player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 5);
    var result = socialSys.publicOpinion.applyPropaganda(30, null);
    if (typeof this.showToast === 'function') this.showToast('宣传引导：正面热点+' + Math.round(result.positivityAdded || 0), 'success');
    this._addEventLog('info', '舆论', '书记部署宣传引导工作');
    this.refreshAll();
  }

  /** 社会视图工具栏 · 压制信息 */
  _socialSuppress() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var player = stateManager.get('player');
    if (!player || (player.politicalCapital || 0) < 8) {
      if (typeof this.showToast === 'function') this.showToast('政治资本不足（需要8点）', 'warning');
      return;
    }
    player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 8);
    var result = socialSys.publicOpinion.suppressInfo(40);
    if (typeof this.showToast === 'function') this.showToast('信息压制：抑制' + result.suppressedCount + '个热点 · 透明度-' + result.transparencyDrop + ' · 谣言风险+' + result.rumorRiskRise, 'warning');
    this._addEventLog('info', '舆论', '书记要求控制信息传播（透明度下降）');
    this.refreshAll();
  }

  // ════════════════════════════════════════════
  //  v3：维稳资源分配 + 主动管理操作
  // ════════════════════════════════════════════

  /** 更新滑块显示值 */
  _updateResourceSlider(idx, value) {
    var el = document.getElementById('resVal' + idx);
    if (el) el.textContent = value;
    // 计算总和
    var keys = ['petitionResolve', 'patrolDeter', 'conflictInvestigation', 'opinionMonitoring'];
    var total = 0;
    for (var i = 0; i < keys.length; i++) {
      var vi = document.getElementById('resVal' + i);
      if (vi) total += parseInt(vi.textContent) || 0;
    }
    var display = document.getElementById('resourceTotalDisplay');
    if (display) {
      var sys = gameEngine.getSystem('social');
      var allocData = sys ? sys.getAllocation() : { total: 100 };
      display.textContent = '已用 ' + total + '/' + allocData.total;
      if (total > allocData.total) display.style.color = 'var(--accent-red)';
      else display.style.color = 'var(--text-muted)';
    }
  }

  /** 应用资源分配 */
  _applyResourceAllocation() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys || !socialSys.setAllocation) { this.showToast('系统未就绪', 'warning'); return; }
    var keys = ['petitionResolve', 'patrolDeter', 'conflictInvestigation', 'opinionMonitoring'];
    var alloc = {};
    for (var i = 0; i < keys.length; i++) {
      var el = document.getElementById('resVal' + i);
      alloc[keys[i]] = parseInt(el ? el.textContent : '0') || 0;
    }
    socialSys.setAllocation(alloc);
    this.showToast('维稳资源分配已更新', 'success');
    this._addEventLog('info', '维稳', '调整了维稳资源分配方案');
    this.refreshAll();
  }

  /** 下访调研 */
  _socialInvestigate() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys || !socialSys.proactiveInvestigate) { this.showToast('系统未就绪', 'warning'); return; }

    // 弹窗选择群体
    var groups = socialSys.getGroupSummary() || [];
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div class="modal-card" style="width:360px;">' +
        '<div class="mc-header"><span>👣 选择调研群体</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
        '<div class="mc-body" style="padding:16px;max-height:50vh;overflow-y:auto;">' +
          groups.map(function(g) {
            return '<div class="decision-option" onclick="uiManager._doInvestigate(\'' + g.type + '\')" ' +
              'style="cursor:pointer;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px;">' +
              '<div style="font-size:13px;">' + g.label + '</div>' +
              '<div style="font-size:10px;color:var(--text-muted);">怨气 ' + Math.round(g.grievance) + ' · 动员度 ' + Math.round(g.mobilization) + '</div></div>';
          }).join('') +
          '<button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>' +
        '</div></div>';
  }

  _doInvestigate(groupType) {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var r = socialSys.proactiveInvestigate(groupType);
    if (r && r.success) this.showToast('下访完成，发现一起潜在矛盾并提前介入', 'success');
    else this.showToast(r ? r.msg : '操作失败', 'warning');
    this._closeModal();
    this._addEventLog('info', '维稳', '深入' + groupType + '群体调研走访');
    this.refreshAll();
  }

  /** 排查专项行动 */
  _socialSweep() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys || !socialSys.proactiveSweep) { this.showToast('系统未就绪', 'warning'); return; }
    var r = socialSys.proactiveSweep();
    if (r && r.success) this.showToast('排查专项行动启动，' + r.affectedCases + '件案件难度降低', 'success');
    else this.showToast(r ? r.msg : '操作失败', 'warning');
    this._addEventLog('info', '维稳', '启动矛盾排查专项行动');
    this.refreshAll();
  }

  /** 联席会议 */
  _socialMeeting() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys || !socialSys.proactiveJointMeeting) { this.showToast('系统未就绪', 'warning'); return; }
    var r = socialSys.proactiveJointMeeting();
    if (r && r.success) this.showToast('联席会议召开，越级风险下降', 'success');
    else this.showToast(r ? r.msg : '操作失败', 'warning');
    this._addEventLog('info', '维稳', '召开信访联席会议');
    this.refreshAll();
  }

  /** 民生微工程 */
  _socialLivelihood() {
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var groups = socialSys.getGroupSummary() || [];
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div class="modal-card" style="width:380px;">' +
        '<div class="mc-header"><span>🏗️ 民生微工程</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
        '<div class="mc-body" style="padding:16px;">' +
          '<div style="font-size:12px;margin-bottom:8px;">选择受益群体和投入资金</div>' +
          '<div style="margin-bottom:8px;">' +
            '<label style="font-size:11px;color:var(--text-muted);">受益群体</label>' +
            '<select id="livelihoodGroup" style="width:100%;padding:6px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-card);font-size:12px;">' +
              groups.map(function(g) { return '<option value="' + g.type + '">' + g.label + '</option>'; }).join('') +
            '</select></div>' +
          '<div style="margin-bottom:8px;">' +
            '<label style="font-size:11px;color:var(--text-muted);">投入资金（万元）</label>' +
            '<input type="number" id="livelihoodCost" value="100" min="10" max="500" style="width:100%;padding:6px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-card);font-size:12px;" />' +
          '</div>' +
          '<button class="sc-btn" style="width:100%;" onclick="uiManager._doLivelihood()">确认实施</button>' +
          '<button class="sc-btn" style="margin-top:4px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>' +
        '</div></div>';
  }

  _doLivelihood() {
    var group = document.getElementById('livelihoodGroup')?.value || 'farmer';
    var cost = parseInt(document.getElementById('livelihoodCost')?.value) || 100;
    var socialSys = gameEngine.getSystem('social');
    if (!socialSys) return;
    var r = socialSys.proactiveLivelihoodProject(group, cost);
    if (r && r.success) {
      this.showToast('民生工程投入' + cost + '万元，' + group + '群体怨气-' + r.grievanceRelief, 'success');
      this._addEventLog('success', '维稳', '实施民生微工程，投入' + cost + '万元');
    } else {
      this.showToast(r ? r.msg : '财政资金不足', 'warning');
    }
    this._closeModal();
    this.refreshAll();
  }

  /** 启动干部任免流程 */
  _startAppointment(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var o = personnel.get(officialId);
    if (!o) return;

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="modal-card" style="max-width:400px;"><div class="mc-header"><span class="mc-icon">📋</span><span class="mc-title">启动任免流程 · ' + o.name + '</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="margin-bottom:10px;font-size:12px;">拟对 <b>' + o.name + '</b>（' + o.title + '）启动任免流程</div>' +
        '<div style="margin-bottom:10px;font-size:11px;color:var(--text-muted);">' +
          '管理层级：' + (o._managementTier === 'city' ? '市管干部（报市委审批）' : '县管干部（县委决定）') + '<br>' +
          '职务类型：' + (o._appointmentType === 'gov' ? '政府职务（需人大任命）' : '党内职务') +
        '</div>' +
        '<div style="margin-bottom:10px;font-size:11px;color:var(--text-muted);">即将消耗：🏛 政治资本 5点</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="fd-action-btn" onclick="uiManager._doStartAppointment(\'' + officialId + '\')">✅ 确认启动</button>' +
          '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">取消</button>' +
        '</div>' +
      '</div></div>';
  }

  /** 执行启动任免流程 */
  _doStartAppointment(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var result = personnel.startAppointmentProcess(officialId, '', '书记主动启动');
    document.getElementById('modal-overlay').classList.add('hidden');
    if (result && result.success) {
      this.showToast(result.message, 'success');
      this._addEventLog('important', '人事流程', '对' + o.name + '启动任免流程');
      this.refreshAll();
      setTimeout(function(self, id) { self._showAppointmentProcess(id); }, 300, this, officialId);
    } else if (result && result.error) {
      this.showToast(result.error, 'warning');
    }
  }

  /** 显示任免流程交互面板 */
  _showAppointmentProcess(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var process = personnel.getAppointmentProcess(officialId);
    if (!process) { this.showToast('该干部暂无进行中的任免流程', 'info'); return; }

    var action = personnel.getAppointmentAction(officialId);
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    var tierLabel = o._managementTier === 'city' ? '市管干部' : '县管干部';
    var typeLabel = o._appointmentType === 'gov' ? '政府职务·需人大任命' : '党内职务';

    // 步骤时间线
    var flow = personnel.getFlowForOfficial(officialId);
    var flowHtml = flow.map(function(st) {
      var labels = { initiated: '📋动议', five_person_group: '👥五人小组', committee_vote: '🗳常委会', city_report: '📡报市委', npc_appointment: '🏛人大' };
      var isCurrent = st === process.status;
      var isPast = flow.indexOf(st) < flow.indexOf(process.status);
      var col = isPast ? 'var(--accent-green)' : isCurrent ? 'var(--accent-cyan)' : 'var(--text-tertiary)';
      return '<span style="font-size:10px;padding:3px 6px;border-radius:4px;background:' + col + '22;color:' + col + ';font-weight:' + (isCurrent ? '600' : '400') + ';">' + (labels[st] || st) + '</span>';
    }).join('<span style="color:var(--text-tertiary);font-size:10px;"> → </span>');

    // 违规项
    var issuesHtml = (process.irregularities || []).map(function(ir) {
      return '<div style="padding:3px 6px;font-size:10px;color:var(--accent-red);background:rgba(220,38,38,0.08);border-radius:4px;margin:2px 0;">⚠️ ' + ir + '</div>';
    }).join('');

    // 交互内容区
    var bodyHtml = '';

    if (action && action.step === 'five_person_group' && action.members) {
      // 五人小组交互酝酿
      var memberCards = action.members.map(function(m) {
        if (!m) return '';
        var s = m.support || 50;
        var barCol = s > 65 ? 'var(--accent-green)' : s > 50 ? '#eab308' : 'var(--accent-red)';
        return '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:4px;">' +
          '<span style="font-size:11px;font-weight:500;width:60px;">' + (m.name || '?') + '</span>' +
          '<span style="font-size:9px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (m.title || '') + '</span>' +
          '<div style="width:60px;height:16px;background:var(--bg-secondary);border-radius:8px;overflow:hidden;">' +
            '<div style="height:100%;width:' + Math.min(100, s) + '%;background:' + barCol + ';border-radius:8px;opacity:0.7;"></div>' +
          '</div>' +
          '<span style="font-size:11px;font-weight:600;color:' + barCol + ';width:30px;text-align:right;">' + Math.round(s) + '%</span>' +
        '</div>';
      }).join('');

      var avgSupport = action.support ? action.support.avg : 50;
      bodyHtml = '<div style="margin-bottom:8px;"><div class="brief-s-title" style="font-size:12px;">👥 五人小组酝酿</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">请审阅各位成员对 <b>' + o.name + '</b> 人选方案的态度：</div>' +
        memberCards +
        '<div style="margin-top:6px;text-align:center;font-size:11px;">平均支持度：<strong style="color:' + (avgSupport > 65 ? 'var(--accent-green)' : avgSupport > 50 ? '#eab308' : 'var(--accent-red)') + ';">' + Math.round(avgSupport) + '%</strong>' +
        (avgSupport < 50 ? ' <span style="color:var(--accent-red);">⚠️ 有争议</span>' : avgSupport < 65 ? ' <span style="color:#eab308;">⚠️ 需谨慎</span>' : ' ✅') +
        '</div>' +
        '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn" onclick="uiManager._confirmStep(\'' + officialId + '\',\'five_person_group\')">📋 确认酝酿结果</button>' +
          '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">暂缓</button>' +
        '</div></div>';
    } else if (action && action.step === 'initiated') {
      // 动议完成，准备五人小组
      bodyHtml = '<div style="margin-bottom:8px;"><div class="brief-s-title" style="font-size:12px;">📋 动议已启动</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">已对 <b>' + o.name + '</b> 启动任免流程。下一步：召开五人小组会议进行酝酿。</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn" onclick="uiManager._initFivePersonGroup(\'' + officialId + '\')">👥 开始五人小组酝酿</button>' +
        '</div></div>';
    } else if (action && action.step === 'committee_vote') {
      // 常委会表决——打开现有投票UI
      bodyHtml = '<div style="margin-bottom:8px;"><div class="brief-s-title" style="font-size:12px;">🗳 常委会表决</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">对 <b>' + o.name + '</b> 任免方案提交县委常委会讨论表决。</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn" onclick="uiManager._openCommitteeVote(\'' + officialId + '\')">🗳 召开常委会表决</button>' +
        '</div></div>';
    } else if (action && action.step === 'city_report') {
      // 报市委审批
      var county = stateManager.get('county');
      var superior = county ? (county.superiorTrust ? county.superiorTrust.citySecretary || 50 : 50) : 50;
      var approvalChance = Math.min(95, Math.round(superior * 0.5 + 10));
      bodyHtml = '<div style="margin-bottom:8px;"><div class="brief-s-title" style="font-size:12px;">📡 报市委审批</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;"><b>' + o.name + '</b> 属市管干部，需报市委审批。</div>' +
        '<div style="font-size:11px;margin-bottom:6px;">当前上级信任度：<strong>' + Math.round(superior) + '</strong> · 预计获批概率：<strong>' + approvalChance + '%</strong></div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn" onclick="uiManager._confirmStep(\'' + officialId + '\',\'city_report\')">📡 上报市委</button>' +
        '</div></div>';
    } else if (action && action.step === 'npc_appointment') {
      // 人大任命——扇形点阵投票
      bodyHtml = '<div style="margin-bottom:8px;"><div class="brief-s-title" style="font-size:12px;">🏛 人大任命</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;"><b>' + o.name + '</b> 属政府组成部门负责人，需经县人大常委会任命。</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">县委提名后，由县长提请县人大常委会审议表决。</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn" onclick="uiManager._openNPCVote(\'' + officialId + '\')">🏛 打开人大表决</button>' +
        '</div></div>';
    }

    // 步骤记录
    var logHtml = (process.log || []).map(function(l) {
      return '<div style="padding:3px 0;font-size:11px;border-bottom:1px solid var(--border-color);">' +
        '<span style="color:var(--accent-cyan);font-weight:500;">▸ ' + l.stage + '</span>' +
        '<span style="color:var(--text-muted);margin-left:6px;">' + l.time + '</span>' +
        '<div style="color:var(--text-secondary);font-size:10px;">' + l.detail + '</div></div>';
    }).join('') || '<div style="font-size:11px;color:var(--text-muted);padding:8px;">暂无步骤记录</div>';

    overlay.innerHTML = '<div class="modal-card" style="max-width:500px;"><div class="mc-header">' +
      '<span class="mc-icon">⚙️</span><span class="mc-title">' + o.name + ' · 任免流程</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(55,138,221,0.1);color:var(--accent-blue);">' + tierLabel + '</span>' +
          '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(22,163,74,0.1);color:var(--accent-green);">' + typeLabel + '</span>' +
          '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(234,179,8,0.1);color:#eab308;">' + (process ? process.statusLabel : '') + '</span>' +
        '</div>' +
        '<div style="margin-bottom:8px;">' + flowHtml + '</div>' +
        (issuesHtml ? '<div style="margin-bottom:6px;">' + issuesHtml + '</div>' : '') +
        bodyHtml +
        '<div style="margin-top:8px;border-top:1px solid var(--border-color);padding-top:6px;">' +
          '<div class="brief-s-title" style="font-size:11px;">步骤记录</div>' +
          '<div style="max-height:140px;overflow-y:auto;">' + logHtml + '</div>' +
        '</div>' +
      '</div></div>';
  }

  /** 五人小组酝酿：计算支持度并显示 */
  _initFivePersonGroup(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    personnel.holdFivePersonGroup(officialId);
    this._showAppointmentProcess(officialId);
  }

  /** 常委会投票：逐人唱票+结果展示（复用现有投票UI模式） */
  /** 常委会：会前沟通（逐人游说）→ 开始投票 */
  _openCommitteeVote(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var members = personnel.getCommitteeMembers();

    function calcStances(mList) {
      return mList.map(function(m) {
        if (m._lobbyVote) {
          var lv = m._lobbyVote;
          return { id: m.id, name: m.name, title: m.title, faction: m.faction,
            vote: lv, emoji: lv === 'support' ? '✅' : (lv === 'oppose' ? '❌' : '⬜'),
            label: lv === 'support' ? '支持' : (lv === 'oppose' ? '反对' : '弃权'),
            col: lv === 'support' ? 'var(--accent-green)' : (lv === 'oppose' ? 'var(--accent-red)' : '#eab308'),
            rel: Math.round(m.relations ? m.relations.player||50 : 50), lobbied: true };
        }
        var stance = 50;
        if (m._factionId === o._factionId) stance += 20;
        if (m._factionId === 'secretary' && o._factionId !== 'magistrate') stance += 15;
        if (m.relations && m.relations.player) stance += (m.relations.player - 50) * 0.3;
        var fiv = o._fivePersonSupport || {};
        if (fiv[m.id]) stance += (fiv[m.id] - 50) * 0.2;
        stance += (Math.random() - 0.5) * 20;
        var vote = stance >= 60 ? 'support' : (stance <= 40 ? 'oppose' : 'abstain');
        return { id: m.id, name: m.name, title: m.title, faction: m.faction,
          vote: vote, emoji: vote === 'support' ? '✅' : (vote === 'oppose' ? '❌' : '⬜'),
          label: vote === 'support' ? '支持' : (vote === 'oppose' ? '反对' : '弃权'),
          col: vote === 'support' ? 'var(--accent-green)' : (vote === 'oppose' ? 'var(--accent-red)' : '#eab308'),
          rel: Math.round(m.relations ? m.relations.player||50 : 50), lobbied: false };
      });
    }

    var details = calcStances(members);
    var yesCount = details.filter(function(v){return v.vote==='support';}).length;
    var noCount = details.filter(function(v){return v.vote==='oppose';}).length;
    var abstainCount = details.filter(function(v){return v.vote==='abstain';}).length;
    var passed = yesCount > members.length / 2;

    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    var memberCards = details.map(function(v) {
      var lb = v.lobbied ? ' <span style="font-size:8px;color:var(--accent-cyan);">🔒</span>' : '';
      return '<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:3px;">' +
        '<span style="font-size:10px;">' + v.emoji + '</span>' +
        '<span style="font-size:11px;font-weight:500;width:64px;">' + v.name + '</span>' +
        '<span style="font-size:9px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (v.title||'').replace('县委','').replace('县政府','') + '</span>' +
        '<span style="font-size:10px;font-weight:600;color:' + v.col + ';">' + v.label + lb + '</span>' +
        '<button class="btn-small" onclick="uiManager._lobbyInteract(\'appt_' + officialId + '\',\'' + v.id + '\')" style="font-size:9px;padding:2px 5px;">互动</button>' +
      '</div>';
    }).join('');

    overlay.innerHTML = '<div class="modal-card" style="max-width:500px;"><div class="mc-header"><span class="mc-icon">🗳</span><span class="mc-title">常委会 · ' + o.name + '任免</span>' +
      '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">会前沟通 · 点击"互动"游说影响常委态度（🔒=已游说锁定）</div>' +
        '<div id="pre-vote-stances">' + memberCards + '</div>' +
        '<div style="margin-top:6px;font-size:10px;color:var(--text-muted);text-align:center;">预估 ' + yesCount + '支持 / ' + noCount + '反对 / ' + abstainCount + '弃权' +
          (passed ? ' · <span style="color:var(--accent-green);">可过半数</span>' : ' · <span style="color:var(--accent-red);">未过半数</span>') +
        '</div>' +
        '<div id="vote-result-banner" style="display:none;" class="vote-result-banner"></div>' +
        '<div id="vote-member-list" class="vote-member-list" style="min-height:100px;"></div>' +
        '<div id="vote-actions" style="margin-top:8px;display:flex;gap:8px;justify-content:center;">' +
          '<button id="btn-start-vote" class="fd-action-btn" onclick="uiManager._revealAppointmentVote(\'' + officialId + '\')">🗳 开始投票</button>' +
          '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">暂缓</button>' +
        '</div>' +
      '</div></div>';

    this._appointmentVoteData = { officialId: officialId, details: details, yesCount: yesCount, noCount: noCount, abstainCount: abstainCount, passed: passed, members: members, calcStances: calcStances };
  }

  /** 揭示任命投票结果 */
  _revealAppointmentVote(officialId) {
    var data = this._appointmentVoteData;
    if (!data || data.officialId !== officialId) return;

    var personnel = gameEngine.getSystem('personnel');
    var o = personnel ? personnel.get(officialId) : null;
    if (!o) return;

    // 重新计算投票（考虑游说效果）
    var result = data.calcStances(data.members);
    var yes = result.filter(function(v) { return v.vote === 'support'; }).length;
    var no = result.filter(function(v) { return v.vote === 'oppose'; }).length;
    var abstain = result.filter(function(v) { return v.vote === 'abstain'; }).length;
    var passed = yes > data.members.length / 2;

    // 每个委员的投票卡
    var voteCards = result.map(function(v) {
      var voteLabel = v.vote === 'support' ? '赞成' : v.vote === 'oppose' ? '反对' : '弃权';
      var voteColor = v.vote === 'support' ? 'var(--accent-green)' : v.vote === 'oppose' ? 'var(--accent-red)' : 'var(--text-muted)';
      return '<div style="display:flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid var(--border-color);border-radius:4px;margin-bottom:2px;font-size:10px;">' +
        '<span style="font-weight:500;width:60px;">' + v.name + '</span>' +
        '<span style="color:var(--text-muted);flex:1;">' + (v.title||'').replace('县委','').replace('县政府','') + '</span>' +
        '<span style="font-weight:600;color:' + voteColor + ';">' + voteLabel + '</span>' +
      '</div>';
    }).join('');

    // 隐藏投票按钮，显示结果
    document.getElementById('btn-start-vote').style.display = 'none';

    var banner = document.getElementById('vote-result-banner');
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = '<div style="padding:8px 12px;border-radius:6px;text-align:center;font-size:13px;font-weight:600;' +
        'background:' + (passed ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)') + ';color:' + (passed ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' +
        (passed ? '✅ 通过！' : '❌ 未通过') + ' ' + yes + '赞成 · ' + no + '反对 · ' + abstain + '弃权</div>';
    }

    var list = document.getElementById('vote-member-list');
    if (list) {
      list.style.display = 'block';
      list.innerHTML = voteCards;
    }

    // 记录结果到人物
    if (passed) {
      o._appointmentStatus = 'completed';
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'success', title: '✅ 任命通过',
        message: o.name + '的任命已在常委会表决通过。',
      });
    } else {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '❌ 任命未通过',
        message: o.name + '的任命未能获得半数以上支持，被暂缓。',
      });
    }
  }

  /** 确认执行任免流程步骤 */
  _confirmStep(officialId, step) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var result = null;
    var logMsg = '';

    switch (step) {
      case 'five_person_group':
        // 推进到流程下一步（常委会表决）
        var flow = personnel.getFlowForOfficial(officialId);
        var currentIdx = flow.indexOf('five_person_group');
        if (currentIdx >= 0 && currentIdx + 1 < flow.length) {
          o._appointmentStatus = flow[currentIdx + 1];
        } else {
          o._appointmentStatus = 'committee_vote';
        }
        this.showToast('五人小组酝酿完成，已记录', 'success');
        break;

      case 'committee_vote':
        result = personnel.holdStandingCommitteeVote(officialId);
        if (result && result.passed) {
          this.showToast('常委会' + result.support + '/' + result.oppose + '/' + result.abstain + ' 通过', 'success');
          logMsg = o.name + '常委会通过' + result.support + '票支持';
        } else if (result) {
          this.showToast('常委会未通过（' + result.support + '票支持）', 'error');
          logMsg = o.name + '常委会未通过';
        }
        break;

      case 'city_report':
        result = personnel.reportToCity(officialId);
        if (result && result.approved) {
          this.showToast('市委批复同意', 'success');
          logMsg = o.name + '市委批复同意';
          if (result.nextStage === 'npc_appointment') {
            this.showToast('还需经县人大常委会任命', 'info');
          }
        } else if (result) {
          this.showToast('市委暂缓审批（获批概率约' + (result.approvalChance || '?') + '%）', 'warning');
          logMsg = o.name + '市委暂缓审批';
        }
        break;

      case 'npc_appointment':
        // 将弹窗中计算的代表投票结果传给 completeNPCAppointment
        result = personnel.completeNPCAppointment(officialId, this._pendingNPCVote);
        this._pendingNPCVote = null; // 用完即清
        if (result && result.success) {
          this.showToast(result.message, 'success');
          logMsg = result.message;
        } else if (result) {
          this.showToast(result.message, 'error');
          logMsg = result.message;
        }
        break;
    }

    if (logMsg) this._addEventLog('important', '人事流程', logMsg);
    document.getElementById('modal-overlay').classList.add('hidden');
    this.refreshAll();
    // 如果还有下一步，重新打开流程面板
    setTimeout(function(self, id) {
      var p = gameEngine.getSystem('personnel');
      if (!p) return;
      var proc = p.getAppointmentProcess(id);
      if (proc && proc.status !== 'completed') {
        self._showAppointmentProcess(id);
      }
    }, 300, this, officialId);
  }

  /** 谈话操作 */
  _factionTalk(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    if (!personnel) return;
    var result = personnel.talk(officialId);
    if (!result) { this.showToast('操作失败', 'error'); return; }
    this.showToast('与' + result.official.name + '谈话，关系+' + result.relationGain, 'success');
    this._addEventLog('info', '干部谈话', '与' + result.official.name + '（' + result.official.title + '）谈话，关系+' + result.relationGain);
    this._showFactionOfficialDetail(officialId);
  }

  /** 提拔操作（含连锁反应显示） */
  _factionPromote(officialId) {
    var factionSys = gameEngine.getSystem('factions');
    if (!factionSys) return;
    var effects = factionSys.onPromote(officialId);
    this._showChainEffects(effects);
    var o = factionSys.engine.getSystem('personnel').get(officialId);
    if (o) {
      this.showToast(o.name + '获得提拔，忠诚+' + 10, 'success');
      this._addEventLog('important', '派系关系', o.name + '获得提拔→朋友圈连锁反应(' + effects.length + '人受影响)');
    }
    this._showFactionOfficialDetail(officialId);
  }

  /** 调任操作（含连锁反应） */
  _factionTransfer(officialId) {
    var personnel = gameEngine.getSystem('personnel');
    var factionSys = gameEngine.getSystem('factions');
    if (!personnel || !factionSys) return;
    var o = personnel.get(officialId);
    if (!o) return;
    var result = personnel.transfer(officialId, '调研员');
    if (result) {
      var effects = factionSys.onTransfer(officialId);
      this._showChainEffects(effects);
      this.showToast(o.name + '已调任为调研员', 'warning');
      this._addEventLog('warning', '人事调动', o.name + '调任调研员，朋友圈' + effects.length + '人受影响');
    }
    this._showFactionOfficialDetail(officialId);
  }

  /** 查处操作（含连锁反应确认） */
  _factionPunish(officialId) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.innerHTML = '<div class="modal-card" style="max-width:400px;"><div class="mc-header"><span class="mc-icon">⚖️</span><span class="mc-title">确认查处</span><button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
      '<div class="mc-body" style="text-align:center;">' +
        '<div style="font-size:14px;margin:16px 0;">确定要查处此干部？</div>' +
        '<div style="font-size:11px;color:var(--accent-red);margin-bottom:16px;">⚠️ 查处会触发朋友圈恐慌，忠诚度大幅下降</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<button class="fd-action-btn danger" onclick="uiManager._confirmPunish(\'' + officialId + '\')">⚖️ 确认查处</button>' +
          '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">取消</button>' +
        '</div>' +
      '</div></div>';
  }

  /** 确认查处 */
  _confirmPunish(officialId) {
    var factionSys = gameEngine.getSystem('factions');
    if (!factionSys) return;
    var effects = factionSys.onPunish(officialId);
    this._showChainEffects(effects);
    var o = factionSys.engine.getSystem('personnel').get(officialId);
    if (o) {
      this.showToast(o.name + '已被查处', 'error');
      this._addEventLog('important', '派系关系', o.name + '被查处→朋友圈恐慌(' + effects.length + '人受影响)');
    }
    this._showFactionOfficialDetail(officialId);
  }

  /** 显示连锁反应效果列表 */
  _showChainEffects(effects) {
    if (!effects || effects.length === 0) return;
    var container = document.getElementById('fd-chain-container');
    if (!container) return;
    container.style.display = 'block';
    var html = '<div class="fd-section-title" style="margin-bottom:4px;">🔄 朋友圈连锁反应</div>';
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      var cls = 'fd-chain-item';
      if (e.change === 'loyalty' && e.delta > 0) cls += ' loyalty-up';
      else if (e.change === 'loyalty' && e.delta < 0) cls += ' loyalty-down';
      else if (e.change === 'ambition' && e.delta > 0) cls += ' ambition-up';
      var deltaStr = (e.delta > 0 ? '+' : '') + e.delta;
      html += '<div class="' + cls + '"><strong>' + e.target + '</strong> · ' + e.change + deltaStr + '<br><span style="font-size:10px;color:var(--text-muted);">' + e.reason + '</span></div>';
    }
    container.innerHTML = html;
  }

  // ════════════════════════════════════════════
  //  上级关系视图
  // ════════════════════════════════════════════

  _renderSuperior(c) {
    try {
      this._renderSuperiorSafe(c);
    } catch (e) {
      console.error('[上级视图] 渲染错误:', e, e.stack);
      c.innerHTML = '<div class="empty-state">⚠️ 上级关系视图渲染失败<br><span style="font-size:11px;color:var(--text-muted);">' + (e.message || '未知错误') + '</span></div>';
    }
  }

  // ══════════════════════════
  //  巡视巡查视图
  // ══════════════════════════

  _renderInspectionView(c) {
    try {
      const insSys = gameEngine.getSystem('inspection');
      if (!insSys || !insSys.getStatusSummary) { c.innerHTML = '<div class="empty-state">⚠️ 巡视系统未就绪</div>'; return; }
      const s = insSys.getStatusSummary();
      if (!s) { c.innerHTML = '<div class="empty-state">⚠️ 巡视系统数据异常</div>'; return; }

      const names = { finance:'财政资金', project:'工程建设', land:'土地出让', personnel:'选人用人',
        partyBuilding:'党的建设', environment:'生态环保', safety:'安全生产', poverty:'乡村振兴' };

      var h = '<div class="view-header"><span class="vh-icon">🔍</span><span class="vh-title">巡视巡查</span></div>';

      // ——— 顶部状态卡 ———
      var bc = s.statusBadge?.color || '#9ca3af';
      var bl = s.statusBadge?.label || '⚪';
      var sd = s.team ? (insSys._getStyleDescription ? insSys._getStyleDescription(s) : (s.team.styleName || '')) : '';
      h += '<div class="sc-card" style="margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div><span style="font-size:24px;">' + bl + '</span> <span style="font-size:14px;font-weight:600;">' + s.statusLabel + '</span></div>' +
          (s.team ? '<div style="font-size:11px;color:var(--text-muted);text-align:right;">组长：' + s.team.leader + '<br>风格：' + sd + '</div>' : '') +
        '</div>' +
      '</div>';

      // ——— 空状态 ———
      if (s.status === 'none') {
        h += '<div class="sc-card" style="padding:20px;text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:12px;">☮️</div>' +
          '<div style="font-size:14px;font-weight:500;color:var(--text-secondary);">当前无巡视任务</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">巡视将在第2月起触发。上级信任度越低、全县腐败指数越高，触发概率越大。后续间隔1-2年随机。</div>' +
          (s.stats?.totalInterviews > 0 ? '<div style="font-size:11px;color:var(--accent-green);margin-top:6px;">📊 已累计完成' + s.stats.totalInterviews + '次巡视</div>' : '') +
        '</div>';
        c.innerHTML = h; return;
      }

      // ——— 巡视组信息 ———
      if (s.team) {
        var fl = (s.team.focus || []).map(function(f){return names[f]||f;}).join('、');
        h += '<div class="sc-card" style="margin-bottom:12px;">' +
          '<div class="sc-card-title">🔍 巡视组信息</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;">' +
            '<div style="flex:1;"><span style="color:var(--text-muted);">组长：</span>' + s.team.leader + '</div>' +
            '<div style="flex:1;"><span style="color:var(--text-muted);">风格：</span>' + sd + '</div>' +
            '<div style="flex:1;"><span style="color:var(--text-muted);">成员：</span>' + (s.team.members || []).join('、') + '</div>' +
            '<div style="flex:1;"><span style="color:var(--text-muted);">重点关注：</span><span style="color:var(--accent-yellow);">' + fl + '</span></div>' +
          '</div>' +
        '</div>';
      }

      // ——— 风险领域 ———
      if (s.riskAreas && s.riskAreas.length > 0 && ['notified','active'].includes(s.status)) {
        h += '<div class="sc-card" style="margin-bottom:12px;"><div class="sc-card-title">📊 风险领域监控</div>';
        var fl2 = (s.team?.focus || []);
        s.riskAreas.forEach(function(r) {
          var pct = r.severity > 0 ? Math.round(r.discovered / r.severity * 100) : 0;
          var sc = r.severity > 60 ? 'var(--accent-red)' : r.severity > 30 ? '#eab308' : '#22c55e';
          var sl = r.severity > 60 ? '高危' : r.severity > 30 ? '中危' : '低危';
          var f = fl2.includes(r.area);
          h += '<div style="padding:6px 0;border-bottom:1px solid var(--border-color);' + (f?'background:rgba(234,179,8,0.08);padding:6px 4px;border-radius:4px;':'') + '">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;">' +
              '<span>' + (f?'🔍 ':'') + (names[r.area]||r.area) + '</span>' +
              '<span style="color:'+sc+';">' + sl + ' ' + r.severity + '</span></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div class="st-track" style="flex:1;height:6px;"><div class="st-fill" style="width:'+pct+'%;background:'+(pct>80?'var(--accent-red)':'#4a9eff')+';height:6px;"></div></div>' +
              '<span style="font-size:10px;color:'+(pct>80?'var(--accent-red)':'var(--text-secondary)')+';">已发现' + pct + '%</span>' +
            '</div>' +
            (r.discovered >= r.severity * 0.8 && r.severity > 40 ? '<div style="font-size:10px;color:var(--accent-red);margin-top:2px;">⚠️ 巡视组已注意到此领域</div>' : '') +
          '</div>';
        });
        h += '</div>';
      }

      // ——— 巡视期操作面板 ———
      if (s.status === 'active') {
        h += '<div class="sc-card" style="margin-bottom:12px;">' +
          '<div class="sc-card-title">🎯 巡视期可执行操作</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">' +
            '<button class="sc-btn" style="padding:6px 12px;font-size:12px;" onclick="uiManager._inspectionQuickAction(\'cooperate\')">🤝 配合巡视</button>' +
            '<button class="sc-btn" style="padding:6px 12px;font-size:12px;" onclick="uiManager._inspectionQuickAction(\'guide\')">🧭 引导方向</button>' +
            '<button class="sc-btn" style="padding:6px 12px;font-size:12px;" onclick="uiManager._inspectionQuickAction(\'obstruct\')">🛑 消极应对</button>' +
            '<button class="sc-btn" style="padding:6px 12px;font-size:12px;" onclick="uiManager._inspectionQuickAction(\'meeting\')">📋 应对会议(-10精力)</button>' +
          '</div>' +
        '</div>';
      }

      // ——— 反馈 ———
      if (['feedback','rectifying'].includes(s.status)) {
        var f = s.findings;
        if (f && f.feedbackLevel) {
          var ll = {general:'一般',serious:'较重',critical:'严重'}[f.feedbackLevel]||'一般';
          var lc = {general:'#22c55e',serious:'#eab308',critical:'#ef4444'}[f.feedbackLevel]||'#9ca3af';
          h += '<div class="sc-card" style="margin-bottom:12px;border-left:3px solid '+lc+';">' +
            '<div class="sc-card-title">📋 巡视反馈（<span style="color:'+lc+';">' + ll + '</span>）</div>' +
            '<div style="font-size:12px;">一般问题'+(f.general?.length||0)+'项 · 较重问题'+(f.serious?.length||0)+'项 · 严重问题'+(f.critical?.length||0)+'项</div>' +
            (f.critical?.length > 0 ? '<div style="font-size:11px;color:var(--accent-red);margin-top:4px;">⚠️ 严重问题已移交纪委</div>' : '') +
          '</div>';
        }

        var rect = s.rectification;
        if (rect && rect.items && rect.items.length > 0) {
          var done = rect.items.filter(function(i){return i.completed;}).length;
          var total = rect.items.length;
          h += '<div class="sc-card" style="margin-bottom:12px;"><div class="sc-card-title">🛠 整改落实 (' + done + '/' + total + ')</div>';
          rect.items.forEach(function(item) {
            var pct = item.effortRequired > 0 ? Math.round(item.effortSpent/item.effortRequired*100) : 0;
            var st = item.completed ? '✅ 已完成' : '⏳ ' + pct + '%';
            var n2 = {finance:'财政',project:'工程',land:'土地',personnel:'人事',partyBuilding:'党建',environment:'环保',safety:'安全',poverty:'乡村振兴'};
            var iname = n2[item.area]||item.area;
            h += '<div style="padding:6px 0;border-bottom:1px solid var(--border-color);">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div><span style="font-size:12px;">' + iname + '：' + item.desc + '</span><div style="font-size:10px;color:var(--text-muted);">需要' + item.effortRequired + '努力值</div></div>' +
                '<span style="font-size:11px;white-space:nowrap;">' + st + '</span></div>' +
              (item.completed ? '' : '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">' +
                '<div class="st-track" style="flex:1;height:4px;"><div class="st-fill" style="width:'+pct+'%;height:4px;background:#4a9eff;"></div></div>' +
                '<button class="sc-btn" style="padding:2px 8px;font-size:10px;" onclick="uiManager._inspectionRectAction(\''+item.id+'\',\'fast\')">⚡精力</button>' +
                '<button class="sc-btn" style="padding:2px 8px;font-size:10px;" onclick="uiManager._inspectionRectAction(\''+item.id+'\',\'invest\')">💰资金</button></div>') +
            '</div>';
          });
          h += '</div>';

          if (!rect.reportSubmitted) {
            h += '<button class="sc-btn" style="width:100%;padding:10px;font-size:14px;font-weight:600;background:var(--accent-blue);color:white;" onclick="uiManager._submitInspectionReport()">📝 提交整改验收报告</button>';
          } else {
            var rc = rect.inspectionResult === 'passed' ? 'var(--accent-green)' : rect.inspectionResult === 'conditional' ? '#eab308' : 'var(--accent-red)';
            h += '<div class="sc-card" style="padding:10px;margin-top:8px;border-left:3px solid '+rc+';">' +
              '<div style="font-size:13px;font-weight:500;">验收结果：<span style="color:'+rc+';">' +
                ({passed:'✅通过',conditional:'⚠️有条件通过',failed:'❌未通过',none:'未验收'}[rect.inspectionResult]||'未验收') + '</span></div>' +
              '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">完成率：' + Math.round(rect.reportQuality * 100) + '%</div>' +
            '</div>';
          }
        }
      }

      // ——— 统计 ———
      if (s.stats && s.status !== 'none') {
        var tc = (s.findings?.general?.length||0)+(s.findings?.serious?.length||0)+(s.findings?.critical?.length||0);
        h += '<div class="sc-card" style="margin-top:12px;"><div class="sc-card-title">📈 巡视统计</div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">' +
            '<div style="cursor:pointer;" onclick="uiManager.showToast(\'共约谈'+s.stats.totalInterviews+'人次干部\',\'info\')">' +
              '<div style="font-size:20px;font-weight:600;">'+s.stats.totalInterviews+'</div><div style="font-size:9px;color:var(--text-muted);">谈话人次</div></div>' +
            '<div style="cursor:pointer;" onclick="uiManager.showToast(\'共发现'+s.stats.cluesDiscovered+'条问题线索\',\'info\')">' +
              '<div style="font-size:20px;font-weight:600;">'+s.stats.cluesDiscovered+'</div><div style="font-size:9px;color:var(--text-muted);">发现线索</div></div>' +
            '<div style="cursor:pointer;" onclick="uiManager.showToast(\'已移交'+s.stats.cluesTransferred+'条严重线索至纪委\',\'info\')">' +
              '<div style="font-size:20px;font-weight:600;">'+s.stats.cluesTransferred+'</div><div style="font-size:9px;color:var(--text-muted);">移交纪委</div></div>' +
            '<div style="cursor:pointer;" onclick="uiManager.showToast(\'共'+s.stats.officialsPunished+'名干部受处分\',\'info\')">' +
              '<div style="font-size:20px;font-weight:600;">'+s.stats.officialsPunished+'</div><div style="font-size:9px;color:var(--text-muted);">处分干部</div></div>' +
          '</div></div>';
      }

      c.innerHTML = h;
    } catch(e) {
      console.error('[巡视视图]', e, e.stack);
      c.innerHTML = '<div class="empty-state">⚠️ 巡视视图渲染失败</div>';
    }
  }

  /** 巡视快速操作 */
  _inspectionQuickAction(action) {
    const insSys = gameEngine.getSystem('inspection');
    if (!insSys) return;
    // 调用后端执行操作
    if (insSys.handleQuickAction) {
      insSys.handleQuickAction(action);
      this.showToast('✅ 操作已执行', 'info');
      this.refreshAll();
    } else {
      this.showToast('⚠️ 巡视系统未响应', 'warning');
    }
  }

  /** 巡视整改单项目操作 */
  _inspectionRectAction(itemId, mode) {
    const insSys = gameEngine.getSystem('inspection');
    if (!insSys) return;
    if (insSys.handleRectItemAction) {
      var result = insSys.handleRectItemAction(itemId, mode);
      if (result && result.error) {
        this.showToast(result.error, 'warning');
      } else {
        this.showToast('✅ ' + result.message, 'success');
        this.refreshAll();
      }
    }
  }

  /** 提交整改报告 */
  _submitInspectionReport() {
    const insSys = gameEngine.getSystem('inspection');
    if (insSys && insSys.submitRectificationReport) {
      if (insSys.submitRectificationReport()) {
        this.showToast('✅ 整改报告已提交', 'success');
        this.refreshAll();
      } else {
        this.showToast('⚠️ 提交失败：巡视未处于整改阶段', 'warning');
      }
    }
  }  _renderSuperiorSafe(c) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!sr || !player) {
      c.innerHTML = '<div class="empty-state">请先进入游戏</div>';
      return;
    }

    const sec = sr.cityLevel.secretary || {};
    const may = sr.cityLevel.mayor || {};
    const org = sr.cityLevel.organizationDept || {};
    const dis = sr.cityLevel.disciplineDept || {};
    const pc = sr.politicalCapital || 100;
    const sat = sr.stats?.superiorSatisfaction || 55;
    const secTrust = sec.trust ?? 55;
    const mayTrust = may.trust ?? 50;
    const weeksGap = this._calcMeetingGap(sec.lastMeeting);

    // 安全辅助：读值
    function clr(v, high=60, mid=40) { return v >= high ? 'var(--accent-green)' : v >= mid ? 'var(--accent-yellow)' : 'var(--accent-red)'; }
    // 反向色标：值越高越差
    function clrInv(v, high=60, mid=30) { return v >= high ? 'var(--accent-red)' : v >= mid ? 'var(--accent-yellow)' : 'var(--accent-green)'; }
    function pct(v) { return Math.round(v ?? 0); }

    c.innerHTML = `
      <div class="view-header">
        <span>⭐ 上级关系</span>
        <span style="font-size:13px;color:var(--text-muted);">${timeSystem?.getTimeString?.() || ''}</span>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">

        <!-- 左列：市级领导 -->
        <div style="flex:1;min-width:280px;">
          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📊 综合态势</div>
            <div style="display:flex;gap:16px;margin-top:8px;">
              <div style="flex:1;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:${clr(sat)};">${pct(sat)}</div>
                <div style="font-size:11px;color:var(--text-muted);">上级满意度</div>
              </div>
              <div style="flex:1;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:${clr(pc, 120, 60)};">${pct(pc)}</div>
                <div style="font-size:11px;color:var(--text-muted);">政治资本</div>
              </div>
              <div style="flex:1;text-align:center;">
                <div style="font-size:28px;font-weight:700;color:${weeksGap > 4 ? 'var(--accent-red)' : 'var(--accent-green)'};">${weeksGap}周</div>
                <div style="font-size:11px;color:var(--text-muted);">距上次见面</div>
              </div>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">🏛 市级领导</div>
            <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:13px;">
              <tr>
                <td style="padding:6px 4px;color:var(--text-secondary);">市委书记</td>
                <td style="padding:6px 4px;"><b style="color:${clr(secTrust)};">${pct(secTrust)}</b></td>
                <td style="padding:6px 4px;font-size:11px;color:var(--text-muted);">${sec.name || '赵建国'} · ${sec.style || 'pragmatic'}</td>
              </tr>
              <tr>
                <td style="padding:6px 4px;color:var(--text-secondary);">市长</td>
                <td style="padding:6px 4px;"><b style="color:${clr(mayTrust)};">${pct(mayTrust)}</b></td>
                <td style="padding:6px 4px;font-size:11px;color:var(--text-muted);">${may.name || '刘国锋'} · ${may.style || 'technocratic'}</td>
              </tr>
              <tr>
                <td style="padding:6px 4px;color:var(--text-secondary);">组织部</td>
                <td style="padding:6px 4px;"><b style="color:${clr(org.impression)};">${pct(org.impression)}</b></td>
                <td style="padding:6px 4px;font-size:11px;color:var(--text-muted);">关注度 ${pct(org.vigilance)}</td>
              </tr>
              <tr>
                <td style="padding:6px 4px;color:var(--text-secondary);">市纪委</td>
                <td style="padding:6px 4px;"><b style="color:${clrInv(dis.vigilance)};">${pct(dis.vigilance)}</b></td>
                <td style="padding:6px 4px;font-size:11px;color:var(--text-muted);">${dis.vigilance > 50 ? '⚠️ 需关注' : dis.vigilance > 30 ? '正常' : '✅ 低关注'}</td>
              </tr>
            </table>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📋 交办事项</div>
            ${this._renderPendingRequests(sec)}
          </div>
        </div>

        <!-- 中列：省厅 + 操作 -->
        <div style="flex:1;min-width:280px;">
          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">🏛 省厅好感度</div>
            ${this._renderProvinceDepts(sr)}
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">⚡ 快速操作</div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
              <button class="sc-btn" onclick="uiManager._showReportPanel()">📋 去市委汇报工作</button>
              <button class="sc-btn" onclick="uiManager._showProvincePanel()">🚄 跑省进厅</button>
              <button class="sc-btn" onclick="uiManager._showInspectionPanel()">🏛 邀请领导调研</button>
              <button class="sc-btn" onclick="uiManager._showFavorPanel()">🤝 人情账本</button>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📊 统计</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
              <div>跑上级总次数：${sr.stats?.totalVisits || 0}</div>
              <div>争取项目成功：${sr.stats?.totalProjectsWon || 0}</div>
              <div>人情往来：${sr.stats?.totalFavors || 0}</div>
            </div>
          </div>
        </div>

        <!-- 右列：靠山 + 政治账本 -->
        <div style="flex:1;min-width:250px;">
          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">🔗 靠山体系</div>
            ${sr.patronChain.patron ? `
            <div style="margin-top:4px;">
              <div style="font-size:14px;font-weight:600;">${sr.patronChain.patron.name || '未知'}</div>
              <div style="font-size:11px;color:var(--text-muted);">${sr.patronChain.patron.role || ''} · 势力 ${pct(sr.patronChain.patronStrength)}</div>
              <div style="margin-top:4px;font-size:11px;color:var(--text-secondary);">
                忠诚度：<span style="color:${clr(sr.patronChain.patronLoyalty)};">${pct(sr.patronChain.patronLoyalty)}</span>
              </div>
            </div>` : `
            <div style="margin-top:8px;padding:12px;background:var(--bg-secondary);border-radius:6px;text-align:center;color:var(--text-muted);font-size:12px;">
              暂无靠山<br><span style="font-size:10px;">在上级系统中经营关系以寻找靠山</span>
            </div>`}
            ${sr.patronChain.rivals?.length > 0 ? `
            <div style="margin-top:8px;font-size:11px;color:var(--accent-red);">
              ⚔️ 政敌：${sr.patronChain.rivals.map(r => r.name).join('、')}
            </div>` : ''}
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📒 政治账本</div>
            <div style="margin-top:4px;">
              <div style="font-size:12px;color:var(--text-secondary);">
                你欠别人：<b style="color:var(--accent-yellow);">${sr.favorAccount?.owes?.filter(o => o.status === 'active').length || 0}</b> 笔
              </div>
              <div style="font-size:12px;color:var(--text-secondary);">
                别人欠你：<b style="color:var(--accent-green);">${sr.favorAccount?.owed?.filter(o => o.status === 'active').length || 0}</b> 笔
              </div>
              <div style="margin-top:8px;">
                ${(sr.favorAccount?.owes || []).filter(o => o.status === 'active').slice(0, 3).map(d => `
                  <div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-color);">
                    <span style="color:var(--accent-yellow);">欠</span> ${d.from === 'citySecretary' ? '市委书记' : d.from === 'cityMayor' ? '市长' : d.from}：${d.desc}
                  </div>
                `).join('')}
                ${((sr.favorAccount?.owes || []).filter(o => o.status === 'active').length) > 3 ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">还有${(sr.favorAccount.owes.filter(o => o.status === 'active').length) - 3}笔...</div>` : ''}
              </div>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">💡 提示</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
              ${weeksGap > 4 ? '⚠️ 建议近期向市委书记汇报工作。' : weeksGap > 8 ? '🔴 已超过两个月未见面，信任正在加速衰减！' : '✅ 近期有过沟通，继续保持。'}
              ${(sec.pendingRequests || []).filter(r => r.status === 'overdue').length > 0 ? '<br>🔴 有交办事项逾期，尽快处理！' : ''}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  /** 计算与领导见面的周数间隔 */
  _calcMeetingGap(lastMeeting) {
    if (!lastMeeting || !timeSystem) return 99;
    const curWeek = Math.ceil((timeSystem.day || 1) / 7);
    const lastWeek = lastMeeting.week || 1;
    const yearOff = ((timeSystem.year || 2026) - (lastMeeting.year || 2026)) * 52;
    return Math.max(0, curWeek - lastWeek + yearOff);
  }

  /** 渲染省厅好感度 */
  _renderProvinceDepts(sr) {
    const depts = sr.provinceLevel?.deptFavors || {};
    const labels = { finance: '省财政厅', agriculture: '省农业厅', transportation: '省交通厅', waterResources: '省水利厅' };
    let html = '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:4px;">';
    Object.keys(labels).forEach(k => {
      const d = depts[k] || {};
      const p = d.favor ?? 30;
      const clr2 = p >= 60 ? 'var(--accent-green)' : p >= 35 ? 'var(--accent-yellow)' : 'var(--accent-red)';
      const pending = (d.projectsSubmitted || []).filter(x => x.status === 'pending').length;
      html += `<tr>
        <td style="padding:4px;color:var(--text-secondary);">${labels[k]}</td>
        <td style="padding:4px;"><b style="color:${clr2};">${Math.round(p ?? 0)}</b></td>
        <td style="padding:4px;font-size:10px;color:var(--text-muted);">${pending > 0 ? `📮 ${pending}个在途` : '—'}</td>
      </tr>`;
    });
    html += '</table>';
    return html;
  }

  /** 渲染交办事项 */
  _renderPendingRequests(leader) {
    const reqs = (leader.pendingRequests || []).filter(r => r.status !== 'completed');
    if (reqs.length === 0) {
      return '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">暂无交办事项</div>';
    }
    return reqs.map(r => {
      const statusColor = r.status === 'overdue' ? 'var(--accent-red)' : 'var(--accent-yellow)';
      const statusLabel = r.status === 'overdue' ? '逾期' : '进行中';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:12px;">
        <span>${r.desc}</span>
        <span style="color:${statusColor};font-size:10px;">${statusLabel}</span>
      </div>`;
    }).join('');
  }

  // ════════════════════════════════════════════
  //  上级操作弹窗
  // ════════════════════════════════════════════

  /** 汇报工作弹窗 */
  _showReportPanel() {
    const topics = [
      { id: 'economy', label: '📈 经济工作', desc: 'GDP增长、产业发展、招商引资' },
      { id: 'partyBuilding', label: '🚩 党建工作', desc: '主题教育、基层党建、意识形态' },
      { id: 'stability', label: '🛡️ 稳定工作', desc: '信访维稳、安全生产、社会治安' },
      { id: 'general', label: '📋 综合汇报', desc: '全面工作概述' }
    ];
    const html = `
      <div class="modal-card" style="width:420px;">
        <div class="mc-header">
          <span>📋 去市委汇报工作</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">选择汇报主题（精力-15，政治资本+2~4）：</div>
          ${topics.map(t => `
            <div class="decision-option" onclick="uiManager._doReport('${t.id}')" style="cursor:pointer;padding:10px 14px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:500;">${t.label}</div>
              <div style="font-size:11px;color:var(--text-muted);">${t.desc}</div>
            </div>
          `).join('')}
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>
        </div>
      </div>`;
    this._showModal(html);
  }

  /** 执行汇报 */
  _doReport(topic) {
    const sys = gameEngine.getSystem('superiorRelations');
    if (!sys) { this.showToast('系统未就绪', 'error'); return; }
    const result = sys.reportToSecretary(topic);
    if (result.success) {
      this.showToast(`汇报完成，信任+${result.trustGain}`, 'success');
    } else {
      this.showToast(result.msg, 'warning');
    }
    this._closeModal();
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
  }

  /** 跑省进厅弹窗 */
  _showProvincePanel() {
    const depts = [
      { key: 'finance', label: '💰 省财政厅', desc: '转移支付、专项资金、债券额度' },
      { key: 'agriculture', label: '🌾 省农业厅', desc: '农田建设、农业产业园、乡村振兴' },
      { key: 'transportation', label: '🚛 省交通厅', desc: '道路升级、农村公路、交通枢纽' },
      { key: 'waterResources', label: '💧 省水利厅', desc: '河道治理、水库加固、饮水工程' }
    ];
    const purposes = [
      { key: 'project', label: '🏗️ 申报项目', desc: '申请项目审批（4-8周结果）' },
      { key: 'funding', label: '💰 争取资金', desc: '争取转移支付和专项资金' },
      { key: 'relationship', label: '🤝 联络感情', desc: '维持关系，不提具体请求' }
    ];
    const html = `
      <div class="modal-card" style="width:500px;">
        <div class="mc-header">
          <span>🚄 跑省进厅</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">选择目标厅局（精力-20，差旅费40万）：</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            ${depts.map(d => `
              <div class="decision-option" onclick="uiManager._selectProvinceDept('${d.key}')" style="cursor:pointer;padding:10px;border:1px solid var(--border-color);border-radius:6px;">
                <div style="font-size:13px;font-weight:500;">${d.label}</div>
                <div style="font-size:10px;color:var(--text-muted);">${d.desc}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
            省厅好感度越高，项目获批概率越大。
          </div>
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>
        </div>
      </div>`;
    // Store selected dept for purpose step
    this._pendingProvinceDept = null;
    this._showModal(html);
  }

  /** 选择省厅后的目的选择 */
  _selectProvinceDept(deptKey) {
    this._pendingProvinceDept = deptKey;
    const labels = { finance: '省财政厅', agriculture: '省农业厅', transportation: '省交通厅', waterResources: '省水利厅' };
    const purposes = [
      { key: 'project', label: '🏗️ 申报项目', desc: '申请项目审批（4-8周）' },
      { key: 'funding', label: '💰 争取资金', desc: '资金额度约500-1200万' },
      { key: 'relationship', label: '🤝 联络感情', desc: '不提交具体项目' }
    ];
    const html = `
      <div class="modal-card" style="width:400px;">
        <div class="mc-header">
          <span>🚄 ${labels[deptKey]}</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">选择目的：</div>
          ${purposes.map(p => `
            <div class="decision-option" onclick="uiManager._doProvinceVisit('${p.key}')" style="cursor:pointer;padding:10px 14px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:500;">${p.label}</div>
              <div style="font-size:11px;color:var(--text-muted);">${p.desc}</div>
            </div>
          `).join('')}
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._showProvincePanel()">← 返回</button>
        </div>
      </div>`;
    this._showModal(html);
  }

  /** 执行跑省进厅 */
  _doProvinceVisit(purpose) {
    const deptKey = this._pendingProvinceDept;
    if (!deptKey) { this.showToast('请选择目标厅局', 'warning'); return; }
    const sys = gameEngine.getSystem('superiorRelations');
    if (!sys) { this.showToast('系统未就绪', 'error'); return; }
    const result = sys.visitProvinceDept(deptKey, purpose);
    if (result.success) {
      this.showToast('跑省进厅完成', 'success');
    } else {
      this.showToast(result.msg, 'warning');
    }
    this._closeModal();
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
  }

  /** 邀请领导调研弹窗 */
  _showInspectionPanel() {
    const leaders = [
      { key: 'secretary', label: '🏛 市委书记', desc: '最有影响力，调研效果好但风险也高' },
      { key: 'mayor', label: '🏛 市长', desc: '行政实权，对项目支持有力' }
    ];
    const spots = [
      { key: 'industrial', label: '🏭 工业园区', desc: '展示经济成果，对口书记/市长关注点' },
      { key: 'rural', label: '🌾 乡村振兴示范点', desc: '展现三农工作，稳妥不出错' },
      { key: 'petition', label: '📋 信访中心', desc: '展现治理能力，但可能暴露矛盾' }
    ];
    const html = `
      <div class="modal-card" style="width:520px;">
        <div class="mc-header">
          <span>🏛 邀请领导调研</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">选择调研领导（精力-10，接待费80万）：</div>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            ${leaders.map(l => `
              <div class="decision-option" onclick="uiManager._selectInspectionLeader('${l.key}')" style="cursor:pointer;padding:10px;border:1px solid var(--border-color);border-radius:6px;flex:1;text-align:center;">
                <div style="font-size:13px;font-weight:500;">${l.label}</div>
                <div style="font-size:10px;color:var(--text-muted);">${l.desc}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);"><b>选择看点</b>（下一页选择）：</div>
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>
        </div>
      </div>`;
    this._pendingInspectionLeader = null;
    this._showModal(html);
  }

  /** 选择调研领导 → 选调研点 */
  _selectInspectionLeader(leaderKey) {
    this._pendingInspectionLeader = leaderKey;
    const leaderLabels = { secretary: '市委书记', mayor: '市长' };
    const spots = [
      { key: 'industrial', label: '🏭 工业园区', desc: '展示经济成果，领导对口加分概率大', risk: '低' },
      { key: 'rural', label: '🌾 乡村振兴示范点', desc: '三农工作平稳展示', risk: '低' },
      { key: 'petition', label: '📋 信访中心', desc: '展现治理能力，但15%概率暴露矛盾', risk: '中' }
    ];
    const html = `
      <div class="modal-card" style="width:480px;">
        <div class="mc-header">
          <span>🏛 选择调研看点 — ${leaderLabels[leaderKey]}</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">选择让领导看什么：</div>
          ${spots.map(s => `
            <div class="decision-option" onclick="uiManager._doInspection('${s.key}')" style="cursor:pointer;padding:10px 14px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="font-size:14px;font-weight:500;">${s.label}</span>
                <span style="font-size:10px;color:${s.risk === '低' ? 'var(--accent-green)' : 'var(--accent-yellow)'};">风险：${s.risk}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);">${s.desc}</div>
            </div>
          `).join('')}
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._showInspectionPanel()">← 返回</button>
        </div>
      </div>`;
    this._showModal(html);
  }

  /** 执行调研 */
  _doInspection(spot) {
    const leaderKey = this._pendingInspectionLeader;
    if (!leaderKey) { this.showToast('请先选择领导', 'warning'); return; }
    const sys = gameEngine.getSystem('superiorRelations');
    if (!sys) { this.showToast('系统未就绪', 'error'); return; }
    const result = sys.inviteInspection(leaderKey, spot);
    if (result.success) {
      const trustLabel = result.trustGain >= 0 ? `信任+${result.trustGain}` : `信任${result.trustGain}`;
      this.showToast(`调研结束，${trustLabel}`, result.exposeRisk ? 'warning' : 'success');
    } else {
      this.showToast(result.msg, 'warning');
    }
    this._closeModal();
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
  }

  /** 人情账本弹窗 */
  _showFavorPanel() {
    const sr = stateManager.get('superiorRelations');
    if (!sr) return;
    const owes = (sr.favorAccount?.owes || []).filter(o => o.status === 'active');
    const owed = (sr.favorAccount?.owed || []).filter(o => o.status === 'active');
    const html = `
      <div class="modal-card" style="width:460px;">
        <div class="mc-header">
          <span>🤝 政治账本</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;max-height:60vh;overflow-y:auto;">
          <div style="font-size:13px;font-weight:600;color:var(--accent-yellow);margin-bottom:8px;">你欠别人的（${owes.length}笔）</div>
          ${owes.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">暂无未还人情</div>' :
            owes.map((o, i) => `
            <div style="padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:8px;">
              <div style="font-size:12px;font-weight:500;">${o.from === 'citySecretary' ? '市委书记' : o.from === 'cityMayor' ? '市长' : o.from}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin:4px 0;">${o.desc}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:10px;color:var(--text-muted);">${o.date || ''}</span>
                <button class="sc-btn" style="padding:4px 10px;font-size:11px;" onclick="uiManager._doRepayFavor(${i})">还人情</button>
              </div>
            </div>`).join('')}

          <div style="font-size:13px;font-weight:600;color:var(--accent-green);margin:12px 0 8px;">别人欠你的（${owed.length}笔）</div>
          ${owed.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);">暂无待收人情</div>' :
            owed.map((o, i) => `
            <div style="padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px;">
              <div style="font-size:12px;font-weight:500;">${o.from}</div>
              <div style="font-size:11px;color:var(--text-secondary);">${o.desc}</div>
            </div>`).join('')}
          <button class="sc-btn" style="margin-top:12px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">关闭</button>
        </div>
      </div>`;
    this._showModal(html);
  }

  /** 还人情 */
  _doRepayFavor(index) {
    const sys = gameEngine.getSystem('superiorRelations');
    if (!sys) return;
    const result = sys.repayFavor(index);
    if (result.success) {
      this.showToast('人情已还', 'success');
    } else {
      this.showToast(result.msg, 'warning');
    }
    this._closeModal();
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
  }

  // ════════════════════════════════════════════
  //  v3：信访详情内联展示（社会视图内切换）
  // ════════════════════════════════════════════

  _togglePetitionDetail() {
    var container = document.getElementById('petition-detail-inline');
    var btn = document.getElementById('btn-petition-detail');
    if (!container) return;

    if (container.style.display === 'none' || container.style.display === '') {
      container.style.display = 'block';
      if (btn) btn.textContent = '收起 ▲';
      this._renderPetitionInline(container);
    } else {
      container.style.display = 'none';
      if (btn) btn.textContent = '查看详情 ▼';
    }
  }

  _renderPetitionInline(c) {
    var state = stateManager.get('petition');
    if (!state) { c.innerHTML = '<div style="padding:12px;color:var(--text-muted);">暂无信访数据</div>'; return; }

    var activeCases = state.cases.filter(function(x) { return x.status !== 'resolved' && x.status !== 'archived'; });
    var pressure = state.stats?.petitionPressure || 30;
    var sensitivity = state.sensitivePeriod?.active;
    var veto = state.oneVoteVeto;

    function clr(v, h, m) { h = h || 60; m = m || 35; return v >= h ? 'var(--accent-green)' : v >= m ? 'var(--accent-yellow)' : 'var(--accent-red)'; }
    function clrInv(v, h, m) { h = h || 60; m = m || 30; return v >= h ? 'var(--accent-red)' : v >= m ? 'var(--accent-yellow)' : 'var(--accent-green)'; }

    var sorted = activeCases.slice().sort(function(a, b) {
      var scoreA = (b.isSupervision ? 100 : 0) + b.difficulty + (b.petitioner.isRepeat ? 20 : 0);
      var scoreB = (a.isSupervision ? 100 : 0) + a.difficulty + (a.petitioner.isRepeat ? 20 : 0);
      return scoreA - scoreB;
    });

    c.innerHTML =
      '<div class="sc-card" style="margin-top:8px;padding:12px;">' +
        '<div style="font-size:12px;font-weight:600;margin-bottom:8px;">📋 在办案件（' + activeCases.length + '件）' +
          (sensitivity ? ' <span style="color:var(--accent-red);font-size:10px;">🔴 敏感期</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<span style="font-size:10px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">压力 ' + Math.round(pressure) + '</span>' +
          '<span style="font-size:10px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">进京 ' + (veto.crossLevelToCentral || 0) + '/' + (veto.threshold?.centralVisit || 3) + '</span>' +
          '<span style="font-size:10px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">赴省 ' + (veto.crossLevelToProvince || 0) + '/' + (veto.threshold?.provinceVisit || 8) + '</span>' +
          (veto.isTriggered ? '<span style="font-size:10px;background:#fce4e4;color:var(--accent-red);padding:2px 6px;border-radius:4px;font-weight:500;">🔴 一票否决</span>' : veto.warningIssued ? '<span style="font-size:10px;background:#fef3c7;color:var(--accent-yellow);padding:2px 6px;border-radius:4px;">⚠️ 已预警</span>' : '') +
        '</div>' +
        (sorted.length === 0 ? '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px;">✅ 暂无待办信访案件</div>' :
          sorted.slice(0, 20).map(function(c) {
            var levelIcon = { county: '', city: '🏙️', province: '🏛️', central: '🚄' }[c.currentLevel] || '';
            var catName = (PETITION_CATEGORIES && PETITION_CATEGORIES[c.category]) ? PETITION_CATEGORIES[c.category].name : c.category;
            return '<div style="padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;margin-bottom:4px;font-size:11px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">' +
              '<div style="flex:1;min-width:150px;">' +
                '<span style="font-weight:500;">' + levelIcon + ' ' + c.demand + '</span>' +
                '<span style="color:var(--text-muted);margin-left:4px;">' + catName + ' · ' + (c.type === 'collective' ? '集体' : '个访') + '</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span style="font-size:10px;color:' + clrInv(c.escalationRisk) + ';">越级' + Math.round(c.escalationRisk) + '</span>' +
                '<span style="font-size:10px;color:' + clr(c.resolveProgress) + ';">化解' + Math.round(c.resolveProgress) + '%</span>' +
                (c.assignedTo ? '<span style="font-size:10px;color:var(--text-muted);">已包案</span>' : '<span style="font-size:10px;color:var(--accent-yellow);">未包案</span>') +
                '<button class="sc-btn" style="padding:2px 6px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionDirective(\'' + c.id + '\')">批示</button>' +
                '<button class="sc-btn" style="padding:2px 6px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionInterview(\'' + c.id + '\')">接访</button>' +
                '<button class="sc-btn" style="padding:2px 6px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionAssign(\'' + c.id + '\')">包案</button>' +
              '</div></div>';
          }).join('')) + '</div>';
  }

  // ════════════════════════════════════════════
  //  信访工作台视图（保留方法，供其他模块调用）
  // ════════════════════════════════════════════

  _renderPetition(c) {
    try {
      this._renderPetitionSafe(c);
    } catch (e) {
      console.error('[信访视图] 渲染错误:', e, e.stack);
      c.innerHTML = '<div class="empty-state">⚠️ 信访工作台渲染失败<br><span style="font-size:11px;color:var(--text-muted);">' + (e.message || '未知错误') + '</span></div>';
    }
  }

  _renderPetitionSafe(c) {
    const state = stateManager.get('petition');
    if (!state) { c.innerHTML = '<div class="empty-state">请先进入游戏</div>'; return; }

    const activeCases = state.cases.filter(x => x.status !== 'resolved' && x.status !== 'archived');
    const pressure = state.stats?.petitionPressure || 30;
    const sensitivity = state.sensitivePeriod?.active;
    const veto = state.oneVoteVeto;

    // v3：从社会系统获取季节和积案信息
    var socialSys = gameEngine.getSystem('social');
    var seasonLabel = '';
    if (socialSys && socialSys._seasonalModifiers) {
      seasonLabel = '<span style="font-size:11px;color:var(--text-muted);margin-left:8px;">🌤️ ' + socialSys._seasonalModifiers.label + '</span>';
    }

    function clr(v, h=60, m=35) { return v >= h ? 'var(--accent-green)' : v >= m ? 'var(--accent-yellow)' : 'var(--accent-red)'; }
    function clrInv(v, h=60, m=30) { return v >= h ? 'var(--accent-red)' : v >= m ? 'var(--accent-yellow)' : 'var(--accent-green)'; }
    function pt(v) { return Math.round(v ?? 0); }

    // 按紧急度排序：督办>高难度>老户>常规
    const sorted = [...activeCases].sort((a, b) => {
      const scoreA = (b.isSupervision ? 100 : 0) + b.difficulty + (b.petitioner.isRepeat ? 20 : 0);
      const scoreB = (a.isSupervision ? 100 : 0) + a.difficulty + (a.petitioner.isRepeat ? 20 : 0);
      return scoreA - scoreB;
    });

    c.innerHTML = `
      <div class="view-header">
        <span>✉️ 信访维稳工作台</span>
        <span style="font-size:13px;color:var(--text-muted);">${timeSystem?.getTimeString?.() || ''}</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px;font-size:11px;">
        <button class="sc-btn" style="padding:2px 8px;font-size:10px;" onclick="uiManager.switchView('social')">← 社会总览</button>
        ${seasonLabel}
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;">

        <!-- 左列：案件列表 -->
        <div style="flex:2;min-width:350px;">
          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📋 待办案件（${activeCases.length}件）
              ${sensitivity ? '<span style="color:var(--accent-red);font-size:11px;margin-left:8px;">🔴 敏感期</span>' : ''}
            </div>
            ${sorted.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">✅ 暂无待办信访案件</div>' :
              sorted.slice(0, 15).map(c => {
                const levelIcon = { county: '', city: '🏙️', province: '🏛️', central: '🚄' }[c.currentLevel] || '';
                const typeLabel = c.type === 'collective' ? '集体' : '个访';
                const catName = PETITION_CATEGORIES[c.category]?.name || '其他';
                const urgency = c.isSupervision ? 3 : c.difficulty > 65 ? 2 : 1;
                const stars = '⭐'.repeat(urgency) + '☆'.repeat(3 - urgency);
                return `<div style="padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px;cursor:pointer;" onclick="uiManager._showPetitionDetail('${c.id}')">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;font-size:13px;">${levelIcon} ${c.demand}</span>
                    <span style="font-size:10px;color:var(--text-muted);">${c.weeksOnFile}周</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
                    ${stars} ${catName} · ${typeLabel} · ${c.petitioner.name}
                    ${c.isSupervision ? '<span style="color:var(--accent-red);font-weight:500;">[督办]</span>' : ''}
                    ${c.currentLevel !== 'county' ? '<span style="color:var(--accent-yellow);">[已越级]</span>' : ''}
                  </div>
                  <div style="display:flex;gap:8px;margin-top:4px;">
                    <span style="font-size:10px;color:${clrInv(c.escalationRisk)};">越级风险 ${Math.round(c.escalationRisk)}</span>
                    <span style="font-size:10px;color:${clr(c.resolveProgress)};">化解 ${Math.round(c.resolveProgress)}%</span>
                    ${c.assignedTo ? '<span style="font-size:10px;color:var(--text-muted);">已包案</span>' : '<span style="font-size:10px;color:var(--accent-yellow);">未包案</span>'}
                  </div>
                  <div style="display:flex;gap:6px;margin-top:4px;">
                    <button class="sc-btn" style="padding:3px 8px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionDirective('${c.id}')">📝 批示</button>
                    <button class="sc-btn" style="padding:3px 8px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionInterview('${c.id}')">🤝 接访</button>
                    <button class="sc-btn" style="padding:3px 8px;font-size:10px;" onclick="event.stopPropagation();uiManager._petitionAssign('${c.id}')">👤 包案</button>
                  </div>
                </div>`;
              }).join('')}
          </div>
        </div>

        <!-- 右列：统计 + 操作 -->
        <div style="flex:1;min-width:250px;">
          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">📊 信访态势</div>
            <div style="display:flex;gap:12px;margin-top:8px;">
              <div style="flex:1;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:${clrInv(pressure)};">${Math.round(pressure)}</div>
                <div style="font-size:10px;color:var(--text-muted);">信访压力</div>
              </div>
              <div style="flex:1;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:${clr(state.stats?.resolvedRate || 0)};">${Math.round(state.stats?.resolvedRate || 0)}%</div>
                <div style="font-size:10px;color:var(--text-muted);">化解率</div>
              </div>
              <div style="flex:1;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:${clrInv(state.stats?.crossLevelRate || 0)};">${Math.round(state.stats?.crossLevelRate || 0)}%</div>
                <div style="font-size:10px;color:var(--text-muted);">越级率</div>
              </div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:var(--text-secondary);">
              <div>活跃案件：${activeCases.length}件</div>
              <div>累计案件：${state.totalCaseCount || 0}件</div>
              <div>月度新收：${state.stats?.monthlyIncoming || 0}件</div>
              <div>救助资金：${state.specialFunds || 0}万元</div>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">🔴 一票否决</div>
            <div style="margin-top:4px;font-size:11px;">
              <div>进京访：<b style="color:${veto.crossLevelToCentral >= veto.threshold?.centralVisit ? 'var(--accent-red)' : 'var(--text-secondary)'};">${veto.crossLevelToCentral || 0}/${veto.threshold?.centralVisit || 3}</b></div>
              <div>赴省访：<b style="color:${veto.crossLevelToProvince >= veto.threshold?.provinceVisit ? 'var(--accent-red)' : 'var(--text-secondary)'};">${veto.crossLevelToProvince || 0}/${veto.threshold?.provinceVisit || 8}</b></div>
              <div style="margin-top:4px;color:${veto.isTriggered ? 'var(--accent-red)' : veto.warningIssued ? 'var(--accent-yellow)' : 'var(--accent-green)'};font-weight:500;">
                ${veto.isTriggered ? '🔴 已触发' : veto.warningIssued ? '⚠️ 已预警' : '✅ 正常'}
              </div>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">🔗 包案制度</div>
            <div style="margin-top:4px;font-size:11px;color:var(--text-secondary);">
              <div>覆盖率：${state.caseResponsibility?.coverage || 0}%</div>
              <div>包案领导：${Object.keys(state.caseResponsibility?.leaderCases || {}).length}人</div>
            </div>
          </div>

          <div class="sc-card" style="margin-bottom:12px;">
            <div class="sc-card-title">💡 提示</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">
              ${sensitivity ? '🔴 当前处于敏感期，越级访风险增加！' : ''}
              ${veto.warningIssued ? '🔴 一票否决已预警，尽快化解信访积案！' : ''}
              ${activeCases.filter(c => !c.assignedTo).length > 0 ? '📋 ' + activeCases.filter(c => !c.assignedTo).length + '件案件尚未指定包案领导。' : ''}
              ${activeCases.filter(c => c.currentLevel !== 'county').length > 0 ? '⚠️ 有案件已越级，上级信任正在扣减。' : ''}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  /** 信访：批示 */
  _petitionDirective(caseId) {
    const sys = gameEngine.getSystem('petition');
    if (!sys) return;
    const r = sys.directive(caseId);
    if (r.success) this.showToast('已批示，化解进度+15%', 'success');
    else this.showToast(r.msg, 'warning');
    this.refreshAll();
  }

  /** 信访：接访 */
  _petitionInterview(caseId) {
    const sys = gameEngine.getSystem('petition');
    if (!sys) return;
    const r = sys.interview(caseId);
    if (r.success) this.showToast('接访完成，化解进度+10%', 'success');
    else this.showToast(r.msg, 'warning');
    this.refreshAll();
  }

  /** 信访：包案（弹出简易干部选择） */
  _petitionAssign(caseId) {
    const personnel = gameEngine.getSystem('personnel');
    const members = personnel?.getCommitteeMembers?.() || [];
    if (members.length === 0) { this.showToast('无可用的包案领导', 'warning'); return; }

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="width:380px;">
        <div class="mc-header">
          <span>👤 选择包案领导</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;max-height:50vh;overflow-y:auto;">
          ${members.map(m => {
            const ability = m.abilities?.stability || 50;
            return `<div class="decision-option" onclick="uiManager._doPetitionAssign('${caseId}','${m.id}')"
              style="cursor:pointer;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px;">
              <div style="font-size:13px;">${m.name}</div>
              <div style="font-size:10px;color:var(--text-muted);">${m.title || ''} · 维稳能力 ${ability}</div>
            </div>`;
          }).join('')}
          <button class="sc-btn" style="margin-top:8px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">取消</button>
        </div>
      </div>`;
  }

  /** 执行包案 */
  _doPetitionAssign(caseId, officialId) {
    const sys = gameEngine.getSystem('petition');
    if (!sys) return;
    const r = sys.assignLeader(caseId, officialId);
    if (r.success) this.showToast('包案领导已指定', 'success');
    else this.showToast(r.msg, 'warning');
    this._closeModal();
    this.refreshAll();
  }

  /** 信访案件详情弹窗 */
  _showPetitionDetail(caseId) {
    const state = stateManager.get('petition');
    const c = state?.cases.find(x => x.id === caseId);
    if (!c) return;
    const catName = PETITION_CATEGORIES[c.category]?.name || '其他';
    const levelName = { county: '县级', city: '市级', province: '省级', central: '进京' }[c.currentLevel] || '县级';
    const history = (c.processHistory || []).slice(-5);

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal-card" style="width:450px;">
        <div class="mc-header">
          <span>📋 案件详情</span>
          <button class="mc-close" onclick="uiManager._closeModal()">✕</button>
        </div>
        <div class="mc-body" style="padding:16px;max-height:60vh;overflow-y:auto;">
          <div style="font-size:14px;font-weight:500;margin-bottom:8px;">${c.demand}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">${c.description}</div>
          <hr style="border:none;border-top:1px solid var(--border-color);margin:8px 0;">
          <table style="font-size:11px;width:100%;border-collapse:collapse;">
            <tr><td style="padding:3px;color:var(--text-muted);">信访人</td><td>${c.petitioner.name}</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">类别</td><td>${catName} · ${c.type === 'collective' ? '集体访' : '个访'}</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">当前层级</td><td>${levelName}</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">合理性</td><td>${Math.round(c.legalMerit)}%</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">化解难度</td><td>${Math.round(c.difficulty)}%</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">越级风险</td><td style="color:${c.escalationRisk > 60 ? 'var(--accent-red)' : c.escalationRisk > 30 ? 'var(--accent-yellow)' : 'var(--accent-green)'};">${Math.round(c.escalationRisk)}%</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">化解进度</td><td>${Math.round(c.resolveProgress)}%</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">老户</td><td>${c.petitioner.isRepeat ? '是（${c.petitioner.repeatYears}年）' : '否'}</td></tr>
            <tr><td style="padding:3px;color:var(--text-muted);">督办</td><td>${c.isSupervision ? '上级督办' : '否'}</td></tr>
          </table>
          ${history.length > 0 ? `
          <hr style="border:none;border-top:1px solid var(--border-color);margin:8px 0;">
          <div style="font-size:11px;font-weight:500;margin-bottom:4px;">处理记录</div>
          ${history.map(h => `<div style="font-size:10px;color:var(--text-secondary);padding:2px 0;">第${h.week}周 · ${h.action} · ${h.result || ''}</div>`).join('')}
          ` : ''}
          <button class="sc-btn" style="margin-top:12px;width:100%;background:var(--bg-secondary);" onclick="uiManager._closeModal()">关闭</button>
        </div>
      </div>`;
  }

  /** 显示模态弹窗 */
  _showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = html;
  }

  /** 关闭模态弹窗 */
  _closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  }


}

const uiManager = new UIManager();
