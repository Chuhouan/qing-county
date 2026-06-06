/**
 * TaskSystem - 任务/目标系统
 * 解决"玩家不知道下一步该干什么"的问题
 * 提供季度任务、年度KPI、里程碑解锁、现时目标
 */
class TaskSystem {
  constructor() { this.engine = null; this.tasks = []; this.completed = []; this.milestones = []; this._focusState = null; this._activeMatters = []; this._matterHistory = []; }

  init(config) {
    stateManager.register('tasks', { active: [], completed: [], milestones: [], focusState: null });
    // 季度开始时生成任务
    eventBus.on(EVENTS.MONTH_CHANGE, (d) => {
      this._checkGenerate(d);
      this._checkTaskCompletion(); // 每月自动检查任务完成
    });
  }

  /** 每月检测是否需要生成新任务 */
  _checkGenerate(data) {
    const month = data?.month || timeSystem?.month || 1;
    const year = timeSystem?.year || 2026;
    // 季度初（1,4,7,10月）生成季度任务
    if ([1, 4, 7, 10].includes(month)) {
      this._generateQuarterlyTasks(year, month);
    }
    // 年初（1月）生成年度KPI
    if (month === 1) {
      this._generateAnnualKPI(year);
    }
    // 清理过期任务
    this._cleanupExpired();
  }

  /** 生成季度任务（3条） */
  _generateQuarterlyTasks(year, month) {
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    const finance = stateManager.get('finance');
    if (!county) return;

    const tasks = [];
    const quarter = Math.ceil(month / 3);
    const deadline = { year, month: month + 2 }; // 本季度末

    // 任务池：按当前状态从中选取3条
    const pool = [
      // 财政类
      { id: `q_${year}_${quarter}_fiscal`, title: '改善财政状况',
        desc: `将国库余额提升至5,000万元以上（当前${Math.round((finance?.treasuryBalance || 0) / 10000 * 10) / 10}万）`,
        type: 'fiscal', condition: () => (stateManager.get('finance')?.treasuryBalance || 0) >= 5000,
        reward: { performance: { type: 'economy', value: 5 }, politicalCapital: 5 },
        penalty: { performance: { type: 'economy', value: -3 } },
        difficulty: finance?.treasuryBalance < 5000 ? 'hard' : 'auto', deadline },
      { id: `q_${year}_${quarter}_debt`, title: '控制债务风险',
        desc: '将债务率降低5个百分点',
        type: 'fiscal', condition: () => (stateManager.get('finance')?.debtRate || 100) <= 90,
        reward: { performance: { type: 'economy', value: 3 }, politicalCapital: 3 } },
      // 经济类
      { id: `q_${year}_${quarter}_gdp`, title: '保持经济增长',
        desc: '将GDP增速维持在5%以上',
        type: 'economy', condition: () => (county?.economy?.gdpGrowth || 0) >= 0.05,
        reward: { performance: { type: 'economy', value: 5 } } },
      // 社会类
      { id: `q_${year}_${quarter}_tension`, title: '维护社会稳定',
        desc: '将社会张力控制在50以下',
        type: 'social', condition: () => (county?.socialTension || 100) <= 50,
        reward: { performance: { type: 'stability', value: 5 } } },
      { id: `q_${year}_${quarter}_satisfaction`, title: '提升群众满意度',
        desc: '将群众满意度提升至70以上',
        type: 'social', condition: () => (stateManager.get('social')?.satisfaction || 0) >= 70,
        reward: { performance: { type: 'livelihood', value: 5 } } },
      // 党建类
      { id: `q_${year}_${quarter}_party`, title: '推进党建工作',
        desc: '完成一次干部谈话或组织党建活动',
        type: 'party', condition: () => player?.abilities?.partyBuilding > (player?._lastPartyBuilding || 0),
        reward: { performance: { type: 'partyBuilding', value: 5 } } },
      // 人事类
      { id: `q_${year}_${quarter}_cadre`, title: '考察干部队伍',
        desc: '与至少2名干部进行谈话',
        type: 'personnel', condition: () => false, // 手动标记
        reward: { performance: { type: 'partyBuilding', value: 3 }, politicalCapital: 3 } },
      // 投资类
      { id: `q_${year}_${quarter}_invest`, title: '推进招商引资',
        desc: '完成至少1个投资项目落地',
        type: 'economy', condition: () => false,
        reward: { performance: { type: 'economy', value: 8 }, politicalCapital: 5 } },
      // 民生类
      { id: `q_${year}_${quarter}_health`, title: '改善医疗卫生',
        desc: '通过至少1个民生类文件批示',
        type: 'livelihood', condition: () => false,
        reward: { performance: { type: 'livelihood', value: 5 } } },
    ];

    // 根据当前情况智能选择3条
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      const t = shuffled[i];
      t.created = { year, month };
      t.status = 'active';
      tasks.push(t);
    }

    this.tasks = tasks;
    stateManager.set('tasks', {
      active: tasks, completed: this.completed,
      milestones: this.milestones,
      quarter,
    });
  }

  /** 生成年度KPI（与季度任务独立） */
  _generateAnnualKPI(year) {
    const kpis = [
      { id: `kpi_${year}_gdp`, title: '年度GDP增速≥5%', type: 'economy',
        condition: () => (stateManager.get('county')?.economy?.gdpGrowth || 0) >= 0.05,
        reward: { performance: { type: 'economy', value: 10 }, politicalCapital: 10 } },
      { id: `kpi_${year}_fiscal`, title: '年度财政自给率≥50%', type: 'fiscal',
        condition: () => (stateManager.get('finance')?.selfSufficiency || 0) >= 50,
        reward: { performance: { type: 'economy', value: 8 } } },
      { id: `kpi_${year}_social`, title: '全年无重大群体事件', type: 'social',
        condition: () => (stateManager.get('county')?.socialTension || 100) < 70,
        reward: { performance: { type: 'stability', value: 10 } } },
    ];
    this.tasks.push(...kpis.map(k => ({ ...k, created: { year, month: 1 }, deadline: { year: year + 1, month: 1 }, status: 'active' })));
    stateManager.get('tasks').active = this.tasks;
  }

  /** 完成任务 */
  completeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done') return false;
    task.status = 'done';
    this.completed.push(task);
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    // 发放奖励
    const player = stateManager.get('player');
    if (task.reward) {
      if (task.reward.performance) {
        // performance: { type: 'economy', value: 5 }
        var perf = task.reward.performance;
        var bonusVal = typeof perf.value === 'number' ? perf.value : 2;
        // 奖励政资
        if (player) {
          player.politicalCapital = Math.min(200, (player.politicalCapital || 20) + bonusVal);
        }
      }
      if (task.reward.politicalCapital && player) {
        player.politicalCapital = calculator.clamp(
          (player.politicalCapital || 0) + (task.reward.politicalCapital || 0), 0, 500
        );
      }
    }
    stateManager.get('tasks').active = this.tasks;
    stateManager.get('tasks').completed = this.completed;
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '✅ 任务完成',
      message: `"${task.title}" 已完成！`,
      persistent: true,
    });
    return true;
  }

  /** 清理过期未完成任务（给予惩罚） */
  _cleanupExpired() {
    const now = { year: timeSystem?.year || 2026, month: timeSystem?.month || 1 };
    const expired = this.tasks.filter(t => t.deadline && (
      t.deadline.year < now.year || (t.deadline.year === now.year && t.deadline.month < now.month)
    ));
    for (const task of expired) {
      task.status = 'failed';
      if (task.penalty?.performance) {
        const player = stateManager.get('player');
        if (player) {
          for (const [k, v] of Object.entries(task.penalty.performance)) {
            // 应用实际的惩罚值（v为负数表示扣分），而非固定+2
            const penaltyVal = typeof v === 'number' ? v : -2;
            player.politicalCapital = Math.max(0, (player.politicalCapital || 20) + penaltyVal);
          }
        }
      }
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '⏰ 任务过期',
        message: `"${task.title}" 未在期限内完成`,
      });
    }
    this.tasks = this.tasks.filter(t => !expired.includes(t));
  }

  /** 计算当前周数（替代不存在的 timeSystem.week） */
  _currentWeek() {
    return timeSystem ? Math.ceil((timeSystem.day || 1) / 7) : 0;
  }

  getActiveTasks() { return this.tasks.filter(t => t.status === 'active'); }
  getCompletedTasks() { return this.completed; }

  /** 每月自动检查任务完成条件 */
  _checkTaskCompletion() {
    var active = this.getActiveTasks();
    for (var i = 0; i < active.length; i++) {
      var task = active[i];
      if (task.condition && typeof task.condition === 'function') {
        try {
          if (task.condition()) {
            this.completeTask(task.id);
          }
        } catch (e) {
          // 条件函数执行失败，跳过
        }
      }
    }
  }

  // ====== 新增：向干部指派任务 ======

  /** 将季度任务分派给干部负责 */
  delegateQuarterlyTask(taskId, officialId) {
    var task = this.tasks.find(function(t) { return t.id === taskId; });
    if (!task) return false;

    var personnel = this.engine?.getSystem('personnel');
    var official = personnel?.get(officialId);
    if (!official) return false;

    task.assignee = officialId;
    task.assigneeName = official.name;

    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('info', '任务分派', '将"' + task.title + '"分派给了' + official.name);
      uiManager.showToast('已分派给' + official.name, 'success');
    }
    return true;
  }

  /** 向指定干部指派任务 */
  assignTask(officialId, taskConfig) {
    var personnel = this.engine?.getSystem?.('personnel');
    if (!personnel) return null;
    var official = personnel.get(officialId);
    if (!official) return null;

    var id = 'assign_' + officialId + '_' + Date.now();
    var task = {
      id: id,
      title: taskConfig.title || '指派任务',
      desc: taskConfig.desc || '',
      type: taskConfig.type || 'assigned',
      assignee: officialId,
      assigneeName: official.name,
      progress: 0,
      status: 'active',
      created: { year: timeSystem?.year||2026, month: timeSystem?.month||1, week: this._currentWeek() },
      deadline: taskConfig.deadline || null,
      condition: taskConfig.condition || function() { return false; },
      reward: taskConfig.reward || { politicalCapital: 3 },
      autoComplete: taskConfig.autoComplete || false,
    };

    this.tasks.push(task);
    official.assignTask(id);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 任务已指派',
      message: '已向' + official.name + '分派任务："' + task.title + '"',
    });
    return task;
  }

  /** 检查指派任务完成状态 */
  checkAssignedTasks() {
    var personnel = this.engine?.getSystem?.('personnel');
    if (!personnel) return;
    for (var i = this.tasks.length - 1; i >= 0; i--) {
      var t = this.tasks[i];
      if (t.assignee && t.status === 'active') {
        var isDone = false;
        if (t.autoComplete) {
          // 自动完成：根据关系、能力、时间综合判定
          var off = personnel.get(t.assignee);
          if (off) {
            var rel = off.relations?.player || 50;
            var exec = off.abilities?.execution || 50;
            var elapsed = (this._currentWeek()) - (t.created?.week || 0);
            // 概率完成：每周根据执行能力和关系判定
            var chance = (exec / 100) * 0.3 + (rel / 100) * 0.2 + elapsed * 0.1;
            if (Math.random() < chance) isDone = true;
            t.progress = Math.min(100, t.progress + Math.round((exec/100)*15 + (rel/100)*5));
          }
        } else {
          isDone = t.condition ? t.condition() : false;
        }
        if (isDone) {
          this.completeTask(t.id);
          // 完成任务后改善关系（仅一次，移除冗余的setTimeout分支）
          var off = personnel.get(t.assignee);
          if (off) {
            off.modifyRelation('player', 3);
            off._addPerformanceLog('任务完成', '完成指派任务：' + t.title);
          }
        }
      }
    }
  }

  // ====== 治理路线图（国策树）系统 ======

  /** 获取国策树状态 */
  getFocusState() {
    if (!this._focusState) this._initFocusState();
    return this._focusState;
  }

  /** 初始化国策树状态 */
  _initFocusState() {
    this._focusState = {
      completed: [],
      inProgress: null,
      progress: 0,
      startedWeek: 0,
      assignee: null,      // 负责干部ID
      assigneeName: '',    // 负责干部名字
    };
  }

  /** 开始执行一个国策（可选指定负责干部） */
  startFocus(focusId, assigneeId) {
    var state = this.getFocusState();
    if (state.inProgress) return { error: '已有进行中的国策' };

    var allFocuses = getAllFocuses();
    var focus = null;
    for (var i = 0; i < allFocuses.length; i++) {
      if (allFocuses[i].id === focusId) { focus = allFocuses[i]; break; }
    }
    if (!focus) return { error: '国策不存在' };

    // 检查前置
    for (var pi = 0; pi < (focus.prerequisites || []).length; pi++) {
      if (state.completed.indexOf(focus.prerequisites[pi]) === -1) {
        return { error: '前置国策未完成' };
      }
    }

    // 检查财政
    var finance = stateManager.get('finance');
    if (focus.cost > 0 && (finance?.treasuryBalance || 0) < focus.cost) {
      return { error: '财政资金不足，需要' + focus.cost + '万' };
    }

    // 扣除费用
    if (focus.cost > 0 && finance) {
      finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - focus.cost);
    }

    // 验证并记录负责干部
    var personnel = this.engine?.getSystem('personnel');
    if (assigneeId && personnel) {
      var off = personnel.get(assigneeId);
      if (off) {
        state.assignee = assigneeId;
        state.assigneeName = off.name;
      }
    }

    state.inProgress = focusId;
    state.progress = 0;
    state.startedWeek = this._currentWeek();

    if (typeof uiManager !== 'undefined') {
      var info = '启动"' + focus.name + '"（预计' + focus.duration + '周）';
      if (state.assigneeName) info += ' — 由' + state.assigneeName + '负责';
      uiManager._addEventLog('important', '治理路线图', info);
    }
    return { success: true };
  }

  /** 每周推进国策进度（由GameEngine调用） */
  advanceFocus() {
    var state = this.getFocusState();
    if (!state.inProgress) return;
    var allFocuses = getAllFocuses();
    var focus = null;
    for (var i = 0; i < allFocuses.length; i++) {
      if (allFocuses[i].id === state.inProgress) { focus = allFocuses[i]; break; }
    }
    if (!focus) { state.inProgress = null; return; }

    // 每周推进 100/duration %
    var weeklyProgress = 100 / (focus.duration || 8);

    // 有负责干部 → 能力影响速度
    if (state.assignee) {
      var personnel = this.engine?.getSystem('personnel');
      var off = personnel ? personnel.get(state.assignee) : null;
      if (off) {
        var prof = off.abilities?.profession || 50;
        var exec = off.abilities?.execution || 50;
        var speedMod = 0.6 + (prof + exec) / 200; // 0.6~1.6 倍速
        weeklyProgress *= speedMod;
      }
    }

    state.progress = Math.min(100, (state.progress || 0) + weeklyProgress);

    // 完成
    if (state.progress >= 100) {
      this._completeFocus(focus);
    }
  }

  /** 完成国策 */
  _completeFocus(focus) {
    var state = this.getFocusState();
    state.completed.push(focus.id);
    state.inProgress = null;
    state.progress = 0;

    // 负责干部获得政绩和能力提升
    if (state.assignee) {
      var off2 = this.engine?.getSystem('personnel')?.get(state.assignee);
      if (off2) {
        off2._loyalty = Math.min(100, (off2._loyalty || 50) + 3);
        off2._ambition = Math.min(100, (off2._ambition || 50) + 2);
        var assignedName = state.assigneeName || off2.name;
        if (typeof uiManager !== 'undefined') {
          uiManager._addEventLog('success', '治理路线图', assignedName + '因推进国策有功，忠诚+3');
        }
      }
      state.assignee = null;
      state.assigneeName = '';
    }

    // 应用效果
    var county = stateManager.get('county');
    var player = stateManager.get('player');
    var finance = stateManager.get('finance');
    var social = stateManager.get('social');

    if (focus.effects) {
      var ef = focus.effects;

      if (ef.economicVitality && county && county.economy) {
        county.economy.economicVitality = calculator.clamp(
          (county.economy.economicVitality || 50) + ef.economicVitality, 0, 100
        );
      }
      if (ef.gdpGrowth && county && county.economy) {
        county.economy.gdpGrowth = (county.economy.gdpGrowth || 0.03) + ef.gdpGrowth;
      }
      if (ef.monthlyIncome && finance) {
        finance.monthlyIncome = (finance.monthlyIncome || 0) + ef.monthlyIncome;
      }
      if (ef.fiscalHealth && finance) {
        finance.fiscalHealth = calculator.clamp((finance.fiscalHealth || 50) + ef.fiscalHealth, 0, 100);
      }
      if (ef.selfSufficiency && finance) {
        finance.selfSufficiency = calculator.clamp((finance.selfSufficiency || 50) + ef.selfSufficiency, 20, 100);
      }
      if (ef.socialTension && county) {
        county.modifyTension(ef.socialTension); // 负值=减张力
      }
      if (ef.satisfaction && social) {
        social.satisfaction = calculator.clamp((social.satisfaction || 60) + ef.satisfaction, 0, 100);
      }
      if (ef.superiorTrust && county && county.superiorTrust) {
        county.superiorTrust.citySecretary = calculator.clamp(
          (county.superiorTrust.citySecretary || 50) + ef.superiorTrust, 0, 100
        );
      }
      if (ef.politicalCapital && player) {
        player.politicalCapital = Math.min(200, (player.politicalCapital || 20) + ef.politicalCapital);
      }
      if (ef.corruptionIndex && county && county.institution) {
        county.institution.corruptionIndex = calculator.clamp(
          (county.institution.corruptionIndex || 20) + ef.corruptionIndex, 0, 100
        );
      }
      if (ef.bureaucracyEfficiency && county && county.institution) {
        county.institution.bureaucracyEfficiency = calculator.clamp(
          (county.institution.bureaucracyEfficiency || 60) + ef.bureaucracyEfficiency, 30, 90
        );
      }

      // 社会系统联动：国策效果差异化反馈到各群体
      var socialSys2 = this.engine ? this.engine.getSystem('social') : null;
      if (socialSys2 && socialSys2.applyPolicyToGroups) {
        // 根据国策所属分支确定政策域
        var branchDomainMap = { economy: 'economy', stability: 'stability', party: 'party', reform: 'economy' };
        var domain = branchDomainMap[focus.branch] || 'general';
        // 计算政策强度：基于效果的总和
        var totalEffect = 0;
        if (ef.economicVitality) totalEffect += ef.economicVitality;
        if (ef.socialTension) totalEffect -= ef.socialTension; // 减张力=正面
        if (ef.satisfaction) totalEffect += ef.satisfaction * 0.5;
        if (ef.monthlyIncome) totalEffect += ef.monthlyIncome * 0.01;
        var intensity = calculator.clamp(totalEffect / 20, -1, 1);
        if (Math.abs(intensity) > 0.1) {
          socialSys2.applyPolicyToGroups(domain, intensity);
        }
      }
    }

    // 通知
    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('important', '治理路线图', '✅ "' + focus.name + '" 完成！' + (focus.effects?.eventText || ''));
      uiManager.showToast('✅ "' + focus.name + '" 完成！', 'success');
    }
  }

  /** 检查是否能开始某国策 */
  canStartFocus(focusId) {
    var state = this.getFocusState();
    if (state.inProgress) return false;
    var allFocuses = getAllFocuses();
    for (var i = 0; i < allFocuses.length; i++) {
      if (allFocuses[i].id === focusId) {
        var f = allFocuses[i];
        for (var pi = 0; pi < (f.prerequisites || []).length; pi++) {
          if (state.completed.indexOf(f.prerequisites[pi]) === -1) return false;
        }
        return true;
      }
    }
    return false;
  }

  // ====== 当务之急系统 ======

  /** 获取所有活跃的当务之急 */
  getActiveMatters() { return this._activeMatters || []; }

  /** 尝试触发新的当务之急（由GameEngine每周调用） */
  tryTriggerMatters() {
    if (this._activeMatters.length >= 2) return; // 最多2个同时进行
    var templates = getAllPressingMatters();
    if (!templates) return;

    var shuffled = templates.slice().sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < shuffled.length; i++) {
      var tpl = shuffled[i];
      if (!tpl.trigger || typeof tpl.trigger !== 'function') continue;

      // 检查是否已激活过（短时间内不重复）
      var alreadyActive = this._activeMatters.some(function(am) { return am.templateId === tpl.id; });
      if (alreadyActive) continue;

      // 执行触发条件
      try {
        if (tpl.trigger()) {
          this._activateMatter(tpl);
          break; // 一次只触发一个
        }
      } catch (_) {}
    }
  }

  /** 激活一个当务之急 */
  _activateMatter(template) {
    var matter = {
      templateId: template.id,
      name: template.name,
      desc: template.desc,
      category: template.category,
      options: template.options,
      deadline: this._currentWeek() + (template.deadline || 4),
      createdWeek: this._currentWeek(),
      status: 'active',
    };
    this._activeMatters.push(matter);

    // 通知玩家
    if (typeof uiManager !== 'undefined') {
      var catIcons = { crisis: '🚨', superior: '📡', faction: '🤝', opportunity: '🎯', people: '👥' };
      uiManager._addEventLog('important', '当务之急', (catIcons[template.category] || '📋') + ' ' + template.name);
      uiManager.showToast('⚠️ 当务之急：' + template.name, 'warning');
    }
  }

  /** 处理当务之急的决策 */
  resolveMatter(templateId, optionIndex) {
    var idx = -1;
    for (var i = 0; i < this._activeMatters.length; i++) {
      if (this._activeMatters[i].templateId === templateId) { idx = i; break; }
    }
    if (idx === -1) return false;

    var matter = this._activeMatters[idx];
    var option = matter.options[optionIndex];
    if (!option) return false;

    // 应用选项效果
    this._applyMatterEffects(option);
    // 应用剧情线影响
    if (option.plotlineImpact && this.engine) {
      var narrativeSys = this.engine.getSystem('narrative');
      if (narrativeSys) {
        narrativeSys.applyPlotlineImpact(option.plotlineImpact);
        if (typeof uiManager !== 'undefined') {
          uiManager._addEventLog('info', '剧情线', '决策影响了剧情线发展');
        }
      }
    }
    matter.resolvedWith = optionIndex;
    matter.resolvedWeek = this._currentWeek();
    this._matterHistory.push(matter);
    this._activeMatters.splice(idx, 1);

    // 记录日志
    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('important', '当务之急决策', '📋 "' + matter.name + '" → ' + (option.label || '已处理'));
    }
    return true;
  }

  /** 检查当务之急是否过期 */
  checkMatterDeadlines() {
    var week = this._currentWeek();
    for (var i = this._activeMatters.length - 1; i >= 0; i--) {
      var matter = this._activeMatters[i];
      if (week > matter.deadline) {
        // 取出惩罚选项（index 4-通常是最后一个）
        var penalties = matter.options.filter(function(o) { return o.effects && o.effects.logDesc; });
        var penaltyOpt = penalties[penalties.length - 1]; // 最后一个选项通常是消极处理
        if (penaltyOpt && penaltyOpt.effects) {
          this._applyMatterEffects(penaltyOpt);
        }
        matter.status = 'expired';
        this._matterHistory.push(matter);
        this._activeMatters.splice(i, 1);

        if (typeof uiManager !== 'undefined') {
          uiManager._addEventLog('warning', '当务之急', '⏰ "' + matter.name + '" 已超期！被动后果已生效');
        }
      }
    }
  }

  /** 应用选项效果到游戏状态 */
  _applyMatterEffects(option) {
    if (!option.effects) return;
    var ef = option.effects;
    var county = stateManager.get('county');
    var finance = stateManager.get('finance');
    var player = stateManager.get('player');

    if (ef.tension && county) county.modifyTension(ef.tension);
    if (ef.satisfaction && stateManager.get('social')) {
      var s = stateManager.get('social');
      s.satisfaction = calculator.clamp((s.satisfaction || 60) + (ef.satisfaction || 0), 0, 100);
    }
    if (ef.economicVitality && county?.economy) {
      county.economy.economicVitality = calculator.clamp(
        (county.economy.economicVitality || 50) + ef.economicVitality, 0, 100
      );
    }
    if (ef.corruptionIndex && county?.institution) {
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 20) + ef.corruptionIndex, 0, 100
      );
    }
    if (ef.bureaucracyEfficiency && county?.institution) {
      county.institution.bureaucracyEfficiency = calculator.clamp(
        (county.institution.bureaucracyEfficiency || 60) + ef.bureaucracyEfficiency, 30, 90
      );
    }
    if (ef.superiorTrust && county?.superiorTrust) {
      county.superiorTrust.citySecretary = calculator.clamp(
        (county.superiorTrust.citySecretary || 50) + ef.superiorTrust, 0, 100
      );
    }
    if (ef.politicalCapital && player) {
      player.politicalCapital = Math.min(200, Math.max(0, (player.politicalCapital || 20) + ef.politicalCapital));
    }
    // 派系关系
    if (ef.factionDelta) {
      var factionSys = this.engine?.getSystem('factions');
      if (factionSys) {
        for (var fId in ef.factionDelta) {
          factionSys.modifyRelation(fId, 'secretary', ef.factionDelta[fId]);
        }
      }
    }
    // 财政扣款
    if (option.cost && option.cost.money && finance) {
      finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - option.cost.money);
    }
    if (option.cost && option.cost.politicalCapital != null && player) {
      player.politicalCapital = Math.min(200, Math.max(0, (player.politicalCapital || 20) - (option.cost.politicalCapital || 0)));
    }

    // 社会系统联动：当务之急效果差异化分发到各群体
    if (ef.tension || ef.satisfaction) {
      var socialSys3 = this.engine ? this.engine.getSystem('social') : null;
      if (socialSys3 && socialSys3.applyPolicyToGroups) {
        var matterDomain = 'general';
        if (this._activeMatters.length > 0) {
          var lastMatter = this._activeMatters[this._activeMatters.length - 1];
          var catDomainMap = { people: 'livelihood', crisis: 'stability', superior: 'party', faction: 'general', opportunity: 'economy' };
          matterDomain = catDomainMap[lastMatter.category] || 'general';
        }
        var mIntensity = (ef.tension ? -ef.tension * 0.3 : 0) + (ef.satisfaction ? ef.satisfaction * 0.05 : 0);
        mIntensity = calculator.clamp(mIntensity, -1, 1);
        if (Math.abs(mIntensity) > 0.1) {
          socialSys3.applyPolicyToGroups(matterDomain, mIntensity);
        }
      }
    }
  }
}
