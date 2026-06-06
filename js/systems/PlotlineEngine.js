/**
 * PlotlineEngine - 剧情线引擎
 * 驱动5条政治剧情线的推进、分支和关键事件触发
 *
 * 职责:
 *   1. 根据游戏状态检查剧情线的激活/推进条件
 *   2. 管理剧情线的状态和分支演化
 *   3. 触发剧情线关键事件（通过EventBus）
 *   4. 向NarrativeMemory记录剧情线进展
 */
class PlotlineEngine {
  constructor() {
    this.plotlines = {};         // key: plotlineId, value: Plotline 实例
    this.engine = null;
    this._weeklyCleanup = null;
    this._coolDownWeeks = 4;     // 同一剧情线两次推进之间的冷却周数
  }

  init(config) {
    // 从数据定义加载所有剧情线
    this._loadPlotlines();
    // 注册到StateManager
    const narrativeState = stateManager.get('narrative');
    if (narrativeState) {
      narrativeState.plotlines = this._serializeAll();
    }
  }

  /** 从PLOTLINE_DEFS加载所有剧情线 */
  _loadPlotlines() {
    const defs = getAllPlotlineDefs ? getAllPlotlineDefs() : {};
    for (const [id, def] of Object.entries(defs)) {
      const plotline = new Plotline({
        id: def.id,
        name: def.name,
        theme: def.theme,
        branches: def.branches || [],
        associatedNpcs: def.associatedNpcs || [],
        tags: def.tags || [],
        conditions: {
          autoActivate: def.autoActivate || false,
          activateYear: def.activateYear || 1,
          activateCondition: def.activateCondition || null,
        },
        narrativeDescription: def.description || '',
      });
      this.plotlines[id] = plotline;
    }
  }

  /** 由NarrativeSystem每周调用 */
  tick() {
    const currentYear = timeSystem ? timeSystem.year : 2026;
    const currentWeek = timeSystem ? Math.ceil((timeSystem.day || 1) / 7) : 0;
    const termYear = timeSystem ? timeSystem.termYear : 1;

    // 1. 检查未激活的剧情线是否可以激活
    this._checkActivations(termYear, currentWeek);

    // 2. 推进活跃的剧情线
    for (const [id, plotline] of Object.entries(this.plotlines)) {
      if (!plotline.isActive()) continue;
      this._tryAdvancePlotline(plotline, currentWeek);
    }

    // 3. 同步到StateManager
    this._syncToState();
  }

  /** 年度检查（由NarrativeSystem调用） */
  yearlyCheck() {
    const currentYear = timeSystem ? timeSystem.year : 2026;
    const termYear = timeSystem ? timeSystem.termYear : 1;

    // 每年的叙事节奏
    for (const [id, plotline] of Object.entries(this.plotlines)) {
      if (plotline.isResolved()) continue;

      // 每年检查剧情线是否需要进入高潮
      if (plotline.status === 'active' && plotline.progress >= 60) {
        // 在合适的年份强制进入高潮
        if (termYear >= 4) {
          plotline.status = 'climax';
          this._notifyPlotlineChange(plotline, '进入高潮阶段');
        }
      }
    }
  }

  /**
   * 检查剧情节是否可以激活
   */
  _checkActivations(termYear, currentWeek) {
    for (const [id, plotline] of Object.entries(this.plotlines)) {
      if (plotline.status !== 'dormant') continue;

      const def = PLOTLINE_DEFS ? PLOTLINE_DEFS[id] : null;
      if (!def) continue;

      // 自动激活
      if (def.autoActivate && termYear >= (def.activateYear || 1)) {
        plotline.yearIntroduced = timeSystem ? timeSystem.year : 2026;
        plotline.status = 'active';
        plotline.lastAdvanceWeek = currentWeek;
        this._notifyPlotlineChange(plotline, '剧情线已激活');
        continue;
      }

      // 条件激活
      if (def.activateCondition) {
        const cond = def.activateCondition;
        if (termYear >= (def.activateYear || 1) &&
            currentWeek >= (def.activateWeekMin || 0) &&
            this._checkCondition(cond)) {
          plotline.yearIntroduced = timeSystem ? timeSystem.year : 2026;
          plotline.status = 'active';
          plotline.lastAdvanceWeek = currentWeek;
          this._notifyPlotlineChange(plotline, '剧情线已条件激活');
        }
      }
    }
  }

  /**
   * 检查并推进一条剧情线
   */
  _tryAdvancePlotline(plotline, currentWeek) {
    // 冷却检查
    if (currentWeek - plotline.lastAdvanceWeek < this._coolDownWeeks) return;

    // 随机推进概率（每4周约30%概率推进一次）
    if (Math.random() > 0.3) return;

    // 选择分支
    const branch = this._selectBranch(plotline);
    if (!branch) return;

    // 检查是否已经有剧情线事件在进行中
    const narrativeState = stateManager.get('narrative');
    if (narrativeState && narrativeState._pendingPlotlineEvent) return;

    // 推进剧情线
    plotline.advance(branch);

    // 触发剧情线事件
    const eventData = this._generatePlotlineEvent(plotline, branch);
    if (eventData) {
      this._triggerPlotlineEvent(eventData);
    }

    // 如果到达高潮,标记
    if (plotline.progress >= (branch.progressToClimax || 70) && plotline.status === 'active') {
      plotline.status = 'climax';
      this._notifyPlotlineChange(plotline, '进入高潮阶段');
    }
  }

  /**
   * 根据条件选择当前应该走的分支
   */
  _selectBranch(plotline) {
    // 如果已经有活跃分支,继续走该分支
    if (plotline.activeBranch) {
      const branch = plotline.branches.find(b => b.id === plotline.activeBranch);
      if (branch) return branch;
    }

    // 否则根据条件选择分支
    const def = PLOTLINE_DEFS ? PLOTLINE_DEFS[plotline.id] : null;
    if (!def) return null;

    // 检查每个分支的触发条件
    const availableBranches = def.branches.filter(b => {
      // 已走完的分支不再走
      if (plotline.completedBranches.indexOf(b.id) !== -1) return false;
      return this._checkBranchCondition(b.triggerCondition);
    });

    if (availableBranches.length === 0) {
      // 没有可用分支,走默认分支
      const defaultBranch = def.branches.find(b => b.triggerCondition.type === 'default');
      return defaultBranch || null;
    }

    // 权重随机选取
    const weights = availableBranches.map(b => {
      const branchDef = this._getBranchDef(plotline.id, b.id);
      return branchDef ? (branchDef.weight || 1) : 1;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < availableBranches.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        plotline.activeBranch = availableBranches[i].id;
        return availableBranches[i];
      }
    }
    return availableBranches[0];
  }

  /**
   * 生成剧情线事件数据
   */
  _generatePlotlineEvent(plotline, branch) {
    const branchEvents = branch.events || [];
    const completedCount = plotline.keyMoments.length;
    // 按进度分配事件
    const eventIndex = Math.min(
      Math.floor((plotline.progress / 100) * branchEvents.length),
      branchEvents.length - 1
    );
    const eventDef = branchEvents[eventIndex];
    if (!eventDef) return null;

    return {
      plotlineId: plotline.id,
      plotlineName: plotline.name,
      branchId: branch.id,
      branchName: branch.name,
      type: eventDef.type || 'choice',
      title: eventDef.title || plotline.name,
      description: eventDef.description || '',
      hasPlotlineImpact: eventDef.hasPlotlineImpact || false,
      npcReactions: eventDef.npcReactions || {},
      isClimax: plotline.status === 'climax',
    };
  }

  /**
   * 触发一个剧情线事件（通过EventBus发到UI）
   */
  _triggerPlotlineEvent(eventData) {
    // 暂存到stateManager,UI会读取并展示
    const narrativeState = stateManager.get('narrative');
    if (narrativeState) {
      narrativeState._pendingPlotlineEvent = eventData;
    }

    // 发送UI通知
    const prefix = eventData.isClimax ? '🔴 ' : '📜 ';
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important',
      title: prefix + '剧情进展: ' + eventData.plotlineName,
      message: eventData.title + '——' + eventData.description.substring(0, 60) + '...',
      persistent: eventData.isClimax,
    });

    // 记录到叙事记忆
    const narrativeSys = this.engine ? this.engine.getSystem('narrative') : null;
    if (narrativeSys && narrativeSys.memory) {
      narrativeSys.memory.record({
        category: 'plotline_branch',
        type: eventData.type,
        title: eventData.plotlineName + ': ' + eventData.title,
        description: eventData.description,
        tags: ['plotline', eventData.plotlineId, eventData.branchId],
        actors: [],
        plotlineId: eventData.plotlineId,
        plotlineEffect: eventData.branchId,
        severity: eventData.isClimax ? 5 : 3,
      });
    }
  }

  /**
   * 处理剧情线抉择结果
   * 由外部（如当务之急）调用,告知剧情线的分支选择结果
   */
  handlePlotlineChoice(plotlineId, choiceData) {
    const plotline = this.plotlines[plotlineId];
    if (!plotline) return;

    const branch = plotline.branches.find(b => b.id === plotline.activeBranch);
    if (!branch) return;

    // 记录分支选择
    plotline.completedBranches.push(plotline.activeBranch);

    // 根据选择,决定下一步
    if (choiceData.outcome) {
      plotline.resolve(choiceData.outcome);
      this._notifyPlotlineChange(plotline, '剧情线结束');
    }
  }

  // ==================== 查询API ====================

  /** 获取所有剧情线状态 */
  getAllPlotlines() {
    return Object.values(this.plotlines);
  }

  /** 获取活跃剧情线 */
  getActivePlotlines() {
    return Object.values(this.plotlines).filter(p => p.isActive());
  }

  /** 获取已解决剧情线 */
  getResolvedPlotlines() {
    return Object.values(this.plotlines).filter(p => p.isResolved());
  }

  /** 获取单条剧情线 */
  getPlotline(id) {
    return this.plotlines[id] || null;
  }

  /** 获取当前待处理的剧情线事件 */
  getPendingPlotlineEvent() {
    const narrativeState = stateManager.get('narrative');
    return narrativeState ? narrativeState._pendingPlotlineEvent : null;
  }

  /** 标记剧情线事件已处理 */
  acknowledgePlotlineEvent() {
    const narrativeState = stateManager.get('narrative');
    if (narrativeState) {
      narrativeState._pendingPlotlineEvent = null;
    }
  }

  /** 获取所有剧情线的摘要（给结局生成器用） */
  getAllPlotlinesSummary() {
    return Object.values(this.plotlines).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      outcome: p.outcome,
      keyMomentCount: p.keyMoments.length,
      phaseLabel: p.getPhaseLabel(),
    }));
  }

  // ==================== 内部方法 ====================

  /** 通知剧情线变化 */
  _notifyPlotlineChange(plotline, message) {
    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('important', '剧情线', plotline.name + ': ' + message);
    }
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important',
      title: '📜 ' + plotline.name,
      message: message,
    });
  }

  /** 检查条件是否满足 */
  _checkCondition(cond) {
    if (!cond) return true;
    switch (cond.type) {
      case 'threshold': {
        const state = this._getStateValue(cond.key);
        return state >= (cond.min || 0);
      }
      case 'faction_relation': {
        const factionSys = this.engine ? this.engine.getSystem('factions') : null;
        if (!factionSys) return false;
        const rel = factionSys.getRelation(cond.faction, 'secretary');
        if (cond.min !== undefined) return rel >= cond.min;
        if (cond.max !== undefined) return rel <= cond.max;
        return true;
      }
      case 'strategy': {
        return gameEngine && gameEngine.currentStrategy === cond.strategy;
      }
      case 'decision': {
        const narrativeSys = this.engine ? this.engine.getSystem('narrative') : null;
        if (!narrativeSys || !narrativeSys.memory) return false;
        // 检查是否有相关决策记录
        return narrativeSys.memory.hasMadeSignificantDecision(cond.eventType);
      }
      default:
        return true;
    }
  }

  /** 检查分支条件 */
  _checkBranchCondition(triggerCondition) {
    if (!triggerCondition) return true;
    if (triggerCondition.type === 'default') {
      // 默认分支: 其他所有条件都不满足时才选它
      // 注意: 外部的 _selectBranch 已经在没有其他可用分支时才选默认
      return true;
    }
    return this._checkCondition(triggerCondition);
  }

  /** 获取分支定义 */
  _getBranchDef(plotlineId, branchId) {
    const def = PLOTLINE_DEFS ? PLOTLINE_DEFS[plotlineId] : null;
    if (!def || !def.branches) return null;
    return def.branches.find(b => b.id === branchId) || null;
  }

  /** 获取状态值 */
  _getStateValue(key) {
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    const social = stateManager.get('social');
    const player = stateManager.get('player');

    switch (key) {
      case 'corruptionIndex': return county && county.institution ? county.institution.corruptionIndex : 0;
      case 'socialTension': return county ? county.socialTension : 0;
      case 'economicVitality': return county && county.economy ? county.economy.economicVitality : 50;
      case 'faction_tension': {
        const factionSys = this.engine ? this.engine.getSystem('factions') : null;
        if (!factionSys) return 0;
        const factions = factionSys.getAllFactions();
        let tension = 0;
        for (const fId in factions) {
          for (const otherId in factions) {
            if (fId < otherId) {
              const rel = factions[fId].relations[otherId] || 0;
              tension += Math.max(0, -rel);
            }
          }
        }
        return tension;
      }
      default: return 0;
    }
  }

  /** 同步到StateManager */
  _syncToState() {
    const narrativeState = stateManager.get('narrative');
    if (narrativeState) {
      narrativeState.plotlines = this._serializeAll();
    }
  }

  /** 序列化所有剧情线 */
  _serializeAll() {
    const result = {};
    for (const [id, plotline] of Object.entries(this.plotlines)) {
      result[id] = plotline.toJSON();
    }
    return result;
  }

  /** 从存档恢复 */
  deserialize(data) {
    if (!data) return;
    for (const [id, plotlineData] of Object.entries(data)) {
      if (this.plotlines[id]) {
        const existing = this.plotlines[id];
        existing.status = plotlineData.status || existing.status;
        existing.progress = plotlineData.progress || 0;
        existing.yearIntroduced = plotlineData.yearIntroduced || 0;
        existing.yearResolved = plotlineData.yearResolved || 0;
        existing.keyMoments = plotlineData.keyMoments || [];
        existing.activeBranch = plotlineData.activeBranch || null;
        existing.completedBranches = plotlineData.completedBranches || [];
        existing.outcome = plotlineData.outcome || null;
        existing.lastAdvanceWeek = plotlineData.lastAdvanceWeek || 0;
        existing.narrativeDescription = plotlineData.narrativeDescription || '';
      }
    }
    this._syncToState();
  }
}
