/**
 * app.js - 游戏启动与初始化（增强版）
 */
(function () {
  'use strict';

  let selectedDifficulty = 'normal';
  let selectedPlayerType = 'balance';
  let selectedStrategy = 'industrial';

  // ===== 主菜单导航 =====
  window._backToMenu = function() {
    document.getElementById('newgame-form').style.display = 'none';
    document.getElementById('loadgame-panel').style.display = 'none';
    document.getElementById('more-panel').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
  };

  window._showNewGame = function() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('newgame-form').style.display = 'block';
    document.getElementById('loadgame-panel').style.display = 'none';
    document.getElementById('more-panel').style.display = 'none';
  };

  window._showLoadGame = function() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('newgame-form').style.display = 'none';
    document.getElementById('loadgame-panel').style.display = 'block';
    document.getElementById('more-panel').style.display = 'none';
    window.renderStartScreenSaves();
  };

  window._showManual = function() {
    showManualModal();
  };

  window._showMore = function() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('newgame-form').style.display = 'none';
    document.getElementById('loadgame-panel').style.display = 'none';
    document.getElementById('more-panel').style.display = 'block';
  };

  // ===== 开始画面交互 =====
  document.addEventListener('DOMContentLoaded', function () {
    const startScreen = document.getElementById('start-screen');
    const appContainer = document.getElementById('app');

    document.querySelectorAll('.diff-card').forEach(card => {
      card.addEventListener('click', function () {
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedDifficulty = this.dataset.diff;
        const config = DIFFICULTY_CONFIG[selectedDifficulty];
        document.getElementById('start-difficulty-desc').textContent = config.description || '';
      });
    });

    document.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', function () {
        document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedPlayerType = this.dataset.type;
      });
    });

    // 渲染特质选择网格
    const traitGrid = document.getElementById('player-trait-options');
    const traitDetail = document.getElementById('trait-detail');
    if (traitGrid) {
      traitGrid.innerHTML = getAllTraits().map(t => `
        <div class="trait-card" data-trait-id="${t.id}">
          <span class="trait-card-icon">${t.icon}</span>
          <span class="trait-card-name">${t.name}</span>
        </div>
      `).join('');

      let selectedTraits = [];
      traitGrid.querySelectorAll('.trait-card').forEach(card => {
        card.addEventListener('click', function () {
          const id = this.dataset.traitId;
          const trait = getTrait(id);
          if (this.classList.contains('selected')) {
            this.classList.remove('selected');
            selectedTraits = selectedTraits.filter(t => t !== id);
          } else if (selectedTraits.length < 2) {
            this.classList.add('selected');
            selectedTraits.push(id);
          }
          // 显示详情
          if (trait) {
            traitDetail.innerHTML = `
              <div class="td-header">${trait.icon} ${trait.name}</div>
              <div class="td-desc">${trait.desc}</div>
              <div class="td-effects">${(trait.effects?.rules || []).map(r => `<div class="td-rule">• ${r}</div>`).join('')}</div>
            `;
          }
        });
      });
    }

    // 策略选择
    document.querySelectorAll('[data-strategy]').forEach(card => {
      card.addEventListener('click', function () {
        document.querySelectorAll('[data-strategy]').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedStrategy = this.dataset.strategy;
      });
    });

    document.getElementById('btn-start-game').addEventListener('click', function () {
      startScreen.style.display = 'none';
      appContainer.style.display = 'flex';
      initGame(selectedDifficulty, selectedPlayerType);
    });

    // 渲染主菜单存档列表
    window.renderStartScreenSaves();

    // 数值百科
    document.getElementById('btn-manual').addEventListener('click', function () {
      showManualModal();
    });
  });

  /** 主菜单显示存档列表 */
  window.renderStartScreenSaves = function() {
    try {
      var area = document.getElementById('save-slots-area');
      if (!area) return;
      var slotKeys = ['xianzhi_save_auto', 'xianzhi_save_1', 'xianzhi_save_2', 'xianzhi_save_3'];
      var slotLabels = ['auto', '1', '2', '3'];
      var names = { auto: '自动存档', 1: '槽位1', 2: '槽位2', 3: '槽位3' };
      var html = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">📂 读取存档：</div>';
      var hasAny = false;

      for (var si = 0; si < slotKeys.length; si++) {
        try {
          var raw = localStorage.getItem(slotKeys[si]);
          if (!raw) continue;
          var d = JSON.parse(raw);
          hasAny = true;
          var timeStr = d.time ? (d.time.year + '年' + (d.time.month||1) + '月') : '';
          var dateStr = d.timestamp ? new Date(d.timestamp).toLocaleString('zh-CN') : '';
          var playerName = d.state?.player?.name || '书记';
          var turnStr = '第' + (d.turnCount||0) + '周';
          var treasury = d.state?.finance?.treasuryBalance || 0;
          var tension = d.state?.county?.socialTension || 0;

          html += '<div class="save-slot-card" onclick="loadFromStartMenu(\'' + slotKeys[si] + '\')" style="padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:4px;cursor:pointer;font-size:11px;">' +
            '<div style="display:flex;justify-content:space-between;">' +
              '<b>' + names[slotLabels[si]] + '</b>' +
              '<span style="color:var(--text-muted);font-size:10px;">' + dateStr + '</span>' +
            '</div>' +
            '<div style="color:var(--text-secondary);font-size:10px;">' + playerName + ' · ' + timeStr + ' · ' + turnStr + '</div>' +
            '<div style="color:var(--text-muted);font-size:9px;">国库' + (Math.round(treasury).toLocaleString()) + '万 · 张力' + tension + '</div>' +
          '</div>';
        } catch(e) {}
      }

      if (!hasAny) {
        html += '<div style="font-size:10px;color:var(--text-muted);padding:4px;">暂无存档</div>';
      }
      area.innerHTML = html;
    } catch(e) { console.error('renderSaves:', e); }
  }

  /** 从主菜单加载存档 */
  window.loadFromStartMenu = function(slotKey) {
    try {
      var raw = localStorage.getItem(slotKey);
      if (!raw) return;
      // 把auto映射到槽位1（游戏内load只认数字槽）
      var slotNum = 1;
      if (slotKey === 'xianzhi_save_1') slotNum = 1;
      else if (slotKey === 'xianzhi_save_2') slotNum = 2;
      else if (slotKey === 'xianzhi_save_3') slotNum = 3;
      else if (slotKey === 'xianzhi_save_auto') {
        // 自动存档→复制到槽位1再加载
        localStorage.setItem('xianzhi_save_1', raw);
        slotNum = 1;
      }
      // 启动游戏并读档
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initGame('normal', 'balance', slotNum);
    } catch(e) { console.error('loadFromMenu:', e); alert('读档失败：' + e.message); }
  }

  /** 显示数值百科弹窗 */
  /** 渲染百科文本为结构化HTML卡片 */
  function renderManualText(text) {
    if (!text) return '';
    var lines = text.split('\n');
    var html = '<div class="mc-content">';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { html += '<div class="mc-spacer"></div>'; continue; }
      if (line.startsWith('╔') || line.startsWith('║') || line.startsWith('╚')) {
        html += '<div class="mc-divider">' + line.replace(/[╔╗╚╝║═]/g, '').trim() + '</div>';
        continue;
      }
      if (line.startsWith('【') && line.indexOf('】') > 0) {
        var title = line.substring(1, line.indexOf('】'));
        var rest = line.substring(line.indexOf('】') + 1);
        html += '<div class="mc-heading"><span class="mc-h-icon">▸</span> ' + title + '</div>';
        if (rest) html += '<div class="mc-line">' + rest + '</div>';
        continue;
      }
      if (line.startsWith('★') || line.startsWith('※')) {
        html += '<div class="mc-star">' + line + '</div>';
        continue;
      }
      if (line.startsWith('  ') && line.indexOf('→') > 0) {
        var parts = line.split('→');
        html += '<div class="mc-kv"><span class="mc-k">' + parts[0].trim() + '</span><span class="mc-arrow">→</span><span class="mc-v">' + (parts[1] || '').trim() + '</span></div>';
        continue;
      }
      if (line.match(/^\d+[\.\)]/) || line.match(/^[-•·]/)) {
        html += '<div class="mc-bullet">' + line + '</div>';
        continue;
      }
      html += '<div class="mc-line">' + line + '</div>';
    }
    html += '</div>';
    return html;
  }

  function showManualModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    // 分类颜色映射
    var catColors = {
      core: '#4a9eff',     // 核心机制 - 蓝
      economy: '#22c55e',  // 经济财政 - 绿
      politics: '#a855f7', // 政治人事 - 紫
      social: '#ec4899',   // 社会民生 - 粉
      player: '#eab308',   // 玩家角色 - 金
      eval: '#f97316',     // 体制考核 - 橙
    };

    // 章节定义：id, 标题, 分类, 数据key
    var sections = [
      // 核心机制
      { id: 'sec-time', title: '⏱ 时间系统', cat: 'core', key: 'timeSystem' },
      { id: 'sec-file', title: '📄 文件批阅', cat: 'core', key: 'fileSystem' },
      { id: 'sec-event', title: '⚠️ 事件系统', cat: 'core', key: 'eventSystem' },
      { id: 'sec-save', title: '💾 存档系统', cat: 'core', key: 'saveLoadSystem' },
      // 经济财政
      { id: 'sec-economy', title: '📈 经济系统', cat: 'economy', key: 'economySystem' },
      { id: 'sec-fiscal', title: '💰 财政系统', cat: 'economy', key: 'fiscalSystem' },
      { id: 'sec-strategy', title: '🎯 年度治理路线', cat: 'economy', key: 'strategySystem' },
      { id: 'sec-focus', title: '🌳 国策树', cat: 'economy', key: 'focusTreeSystem' },
      // 政治人事
      { id: 'sec-faction', title: '🔗 派系关系系统', cat: 'politics', key: 'factionSystem' },
      { id: 'sec-personnel', title: '👥 人事任免', cat: 'politics', key: 'personnelSystem' },
      { id: 'sec-lobby', title: '💬 游说系统', cat: 'politics', key: 'lobbyingSystem' },
      // 社会民生
      { id: 'sec-social', title: '👥 社会系统（v2 三层架构）', cat: 'social', key: 'socialSystem' },
      // 玩家角色
      { id: 'sec-player', title: '👤 县长系统', cat: 'player', key: 'playerSystem' },
      { id: 'sec-trait', title: '🧬 书记特质', cat: 'player', key: 'traitSystem' },
      // 体制考核
      { id: 'sec-institution', title: '🏛 体制系统', cat: 'eval', key: 'institutionSystem' },
      { id: 'sec-eval', title: '🏅 考核与晋升', cat: 'eval', key: 'evaluationSystem' },
    ];

    // 目录HTML
    var catLabels = { core: '⏱ 核心机制', economy: '📈 经济财政', politics: '🏛 政治人事', social: '👥 社会民生', player: '👤 玩家角色', eval: '🏅 体制考核' };
    var tocHtml = '<div class="manual-toc"><div class="manual-toc-title">📖 总目录</div>';
    var currentCat = '';
    for (var si = 0; si < sections.length; si++) {
      var sec = sections[si];
      if (sec.cat !== currentCat) {
        currentCat = sec.cat;
        tocHtml += '<div class="manual-toc-group" style="color:' + catColors[currentCat] + '">' + (catLabels[currentCat] || currentCat) + '</div>';
      }
      tocHtml += '<div class="manual-toc-item" onclick="document.querySelector(\'.' + sec.id + '\').scrollIntoView({behavior:\'smooth\'})">' + sec.title + '</div>';
    }
    tocHtml += '</div>';

    // 内容HTML
    var contentHtml = '';
    for (var sj = 0; sj < sections.length; sj++) {
      var s = sections[sj];
      var manualData = GAME_MANUAL[s.key];
      if (!manualData) continue;
      contentHtml += '<div class="manual-section ' + s.id + '" style="border-left:3px solid ' + catColors[s.cat] + ';">' +
        '<div class="manual-section-title" style="color:' + catColors[s.cat] + ';">' + s.title + '</div>' +
        renderManualText(manualData) + '</div>';
    }

    overlay.innerHTML = '' +
      '<div class="modal-card" style="width:700px;">' +
        '<div class="mc-header">' +
          '<span class="mc-icon">📖</span>' +
          '<span class="mc-title">《青县》数值机制百科</span>' +
          '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button>' +
        '</div>' +
        '<div class="mc-body" style="max-height:75vh;overflow-y:auto;padding:16px;">' +
          tocHtml +
          contentHtml +
        '</div>' +
      '</div>';
  }

  // ===== 游戏初始化 =====
  function initGame(difficulty, playerType, loadFromSave) {
    try {
      const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG['normal'];
      const playerTemplate = PLAYER_TEMPLATES[playerType] || PLAYER_TEMPLATES['balance'];

      // 读取选中的特质
      const selectedTraits = Array.from(document.querySelectorAll('#player-trait-options .trait-card.selected'))
        .map(el => el.dataset.traitId);
      const activeTraits = selectedTraits.length === 2 ? selectedTraits : ['pragmatic', 'delegator'];

      const county = new County(diffConfig.county);
      county.generateTowns(diffConfig.towns);

      const player = new Player({
        name: '陈志远', age: 38,
        abilities: playerTemplate.abilities,
        traits: activeTraits,
      });

      // 应用特质效果到能力
      applyTraitEffects(player, activeTraits);

      stateManager.register('county', county);
      stateManager.register('player', player);

      const socialSystem = new SocialSystem();
      const economicSystem = new EconomicSystem();
      const personnelSystem = new PersonnelSystem();
      const intelSystem = new IntelSystem();
      const evaluationSystem = new EvaluationSystem();
      const policySystem = new PolicySystem();
      const corruptionSystem = new CorruptionSystem();
      const taskSystem = new TaskSystem();
      const popSystem = new PopulationSystem();
      const eventSystem = new EventSystem();
      const factionSystem = new FactionRelationshipSystem();
      const superiorSystem = new SuperiorRelationshipSystem();
      const inspectionSystem = new InspectionSystem();

      gameEngine
        .registerSystem('economy', economicSystem)  // 统一经济系统
        .registerSystem('finance', economicSystem)   // 同一个对象，兼容旧引用
        .registerSystem('social', socialSystem)
        .registerSystem('economy', economicSystem)
        .registerSystem('personnel', personnelSystem)
        .registerSystem('intel', intelSystem)
        .registerSystem('evaluation', evaluationSystem)
        .registerSystem('policy', policySystem)
        .registerSystem('corruption', corruptionSystem)
        .registerSystem('tasks', taskSystem)
        .registerSystem('population', popSystem)
        .registerSystem('event', eventSystem)
        .registerSystem('factions', factionSystem)
        .registerSystem('superiorRelations', superiorSystem)
        .registerSystem('inspection', inspectionSystem);
      // v3：信访系统已集成到社会系统内部
      // 但兼容旧引用：将socialSystem.petition注册为'petition'
      gameEngine.systems['petition'] = socialSystem.petition;
      socialSystem.petition.engine = gameEngine;

      gameEngine.init({
        difficulty: diffConfig,
        time: { year: 2026, month: 1, day: 1 },
      });

      // 同步常委初始关系到Player
      (function syncCommitteeRelations() {
        const members = personnelSystem.getCommitteeMembers();
        for (const m of members) {
          player.relations.committeeMembers[m.id] = m.relations.player || 50;
        }
      })();

      // 注册事件
      for (const evtData of EVENT_LIBRARY) {
        eventSystem.registerEvent(new GameEvent(evtData));
      }

      // 通用日志记录器
      function logEvent(type, title, message) {
        const logs = stateManager.get('events')?.logs || [];
        logs.push({ time: timeSystem.getTimeString(), type, title, message });
        stateManager.set('events', { logs: logs.slice(-200) });
      }

      // 事件监听
      eventBus.on(EVENTS.EVENT_RESOLVE, (data) => {
        logEvent('info', '事件处理', `事件已处理（${data.eventId}）`);
      });

      eventBus.on(EVENTS.FINANCE_WARNING, (data) => {
        if (data.level === '危机') {
          logEvent('warning', '财政预警', data.message || '财政状况危急');
        }
      });

      eventBus.on(EVENTS.MONTH_CHANGE, (data) => {
        logEvent('info', '月度更新', `${data.year}年${data.month}月`);
        // 每月随机触发一个事件
        const pending = eventSystem.getPendingEvents();
        if (pending.length > 0 && Math.random() < 0.3) {
          const evt = pending[Math.floor(Math.random() * pending.length)];
          if (eventSystem._checkTriggers(evt) !== false) {
            setTimeout(() => eventSystem.activateEvent(evt), 500);
          }
        }
      });

      eventBus.on(EVENTS.YEAR_CHANGE, (data) => {
        logEvent('important', '年度更替', `进入${data.year}年（任期内第${data.termYear}年）`);
        // 年度历史事件
        const hist = HISTORICAL_EVENTS[data.year];
        if (hist) {
          logEvent('important', '宏观大事', `${hist.label}：${hist.desc}`);
        }
      });

      eventBus.on(EVENTS.SOCIAL_TENSION, (data) => {
        if (data.delta > 5) logEvent('warning', '社会张力上升', `+${data.delta.toFixed(1)}`);
        if (data.newTension > 70) {
          logEvent('warning', '社会预警', `张力${Math.round(data.newTension)}，注意维稳`);
        }
      });

      eventBus.on(EVENTS.FINANCE_MONTHLY, (data) => {
        const balanceStr = data.balance >= 0 ? `盈余${data.balance}万` : `赤字${Math.abs(data.balance)}万`;
        logEvent('info', '月度财政', `收入${data.income}万 · 支出${data.expense}万 · ${balanceStr}`);
      });

      eventBus.on(EVENTS.COMMITTEE_VOTE, (data) => {
        const r = data.result;
        logEvent('important', '常委会', `投票：${r.support}支持/${r.oppose}反对/${r.abstain}弃权 → ${r.result}`);
      });

      eventBus.on(EVENTS.EVENT_TRIGGER, (data) => {
        logEvent('warning', '新事件', `"${data.event?.name}" 需要您的决策`);
        // 自动切换到办公室视图并刷新
        setTimeout(() => {
          uiManager.switchView('office');
          uiManager.refreshAll();
        }, 300);
      });

      if (loadFromSave) {
        var loadSlot = typeof loadFromSave === 'number' ? loadFromSave : 1;
        gameEngine.load(loadSlot);
      }

      uiManager.init();
      uiManager.refreshAll();
      gameEngine.setStrategy(selectedStrategy); // 设置年度治理路线
      gameEngine.start();

      logEvent('important', '就任', `您正式就任${county.name}县委书记。点击"推进一周"开始您的五年任期。`);

      console.log('[App] Game initialized:', { difficulty, playerType, county: county.name });
    } catch (e) {
      console.error('[App] Init failed:', e);
      document.getElementById('app').innerHTML = `
        <div style="padding:40px;color:#f44336;background:#1a1a2e;height:100vh;">
          <h3>❌ 游戏启动失败</h3>
          <p style="color:#aaa;margin:16px 0;">${e.message}</p>
          <pre style="font-size:12px;color:#666;">${e.stack}</pre>
          <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#4a90d9;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">重新加载</button>
        </div>`;
    }
  }
})();
