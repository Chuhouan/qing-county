/**
 * NarrativeMemory - 叙事记忆引擎
 * 记录玩家做出的"有意义的选择",让其他系统可以查询和引用
 *
 * 这是一个纯记录+查询系统,不修改任何游戏状态。
 * 所有集成通过 EventBus 监听实现,不需要修改现有系统的调用代码。
 */
class NarrativeMemory {
  constructor() {
    this.entries = [];
    this._maxEntries = 200;
    this._cleanupFn = null;
  }

  init() {
    // 注册到 StateManager
    if (!stateManager.has('narrative')) {
      stateManager.register('narrative', {
        memories: [],
        plotlines: {},
        currentPhase: 'introduction',
        phaseChanged: false,
      });
    }
    // 设置事件监听
    this._setupListeners();
  }

  /** 设置事件总线监听——自动记录有意义的事件 */
  _setupListeners() {
    const cleanup = [];

    // 事件抉择记录
    cleanup.push(eventBus.on(EVENTS.EVENT_RESOLVE, (data) => {
      this._onEventResolved(data);
    }));

    // 当务之急解决记录（监听UI日志添加时的广播）
    cleanup.push(eventBus.on(EVENTS.UI_NOTIFICATION, (data) => {
      if (data.type === 'important' && data.message) {
        // 只记录"important"级别的通知——不包括普通提示
        this._onImportantNotification(data);
      }
    }));

    // 人员变动记录
    cleanup.push(eventBus.on(EVENTS.PERSONNEL_CHANGE, (data) => {
      this._onPersonnelChange(data);
    }));

    // 游戏结束记录
    cleanup.push(eventBus.on(EVENTS.GAME_OVER, (data) => {
      this.record({
        category: 'decision',
        type: 'game_over',
        title: `游戏结束: ${data.reason}`,
        description: data.description || '',
        tags: ['game_over', data.reason],
        severity: 5,
      });
    }));

    // 委员会投票记录
    cleanup.push(eventBus.on(EVENTS.COMMITTEE_VOTE, (data) => {
      if (data.issue && data.result) {
        this.record({
          category: 'decision',
          type: 'committee_vote',
          title: `常委会表决: ${data.issue.name || '未知议题'}`,
          description: `${data.result.support}票支持 / ${data.result.oppose}票反对 / ${data.result.abstain}票弃权`,
          tags: ['committee', 'vote'],
          severity: 3,
        });
      }
    }));

    this._cleanupFn = () => cleanup.forEach(fn => fn());
  }

  // ==================== 事件监听处理 ====================

  /** 当事件被解决时 */
  _onEventResolved(data) {
    if (!data || !data.eventId) return;
    // 从EventSystem获取事件详情
    const eventSys = gameEngine ? gameEngine.getSystem('event') : null;
    if (!eventSys) return;

    // 查找事件对象
    const evt = eventSys._events ? eventSys._events.find(e => e.id === data.eventId) : null;
    if (!evt) return;

    const choiceIndex = data.choice;
    const choice = evt.choices && evt.choices[choiceIndex];
    if (!choice) return;

    // 提取actors
    const actors = [];
    if (evt.stakeholders) {
      evt.stakeholders.forEach(s => {
        if (typeof s === 'string') actors.push(s);
        else if (s.id) actors.push(s.id);
      });
    }

    this.record({
      category: 'decision',
      type: evt.type || 'event',
      title: evt.name || '事件抉择',
      description: choice.label || '',
      tags: ['event', evt.type || 'routine', evt.category || 'general'],
      actors: actors,
      chosenOption: choiceIndex,
      choiceLabel: choice.label || '',
      totalOptions: evt.choices ? evt.choices.length : 0,
      severity: evt.complexity === 'major' ? 4 : evt.complexity === 'complex' ? 3 : 2,
    });
  }

  /** 当重要通知被发出时 */
  _onImportantNotification(data) {
    if (!data || !data.title) return;
    // 过滤掉太普通的通知
    const skipPhrases = ['年度更替', '派系动态', '本周关注', '推进一周'];
    for (const p of skipPhrases) {
      if (data.title.indexOf(p) !== -1) return;
    }

    // 识别通知类型
    let category = 'decision';
    let tags = ['notification'];
    if (data.title.indexOf('当务之急') !== -1) {
      category = 'matter';
      tags.push('matter');
    }
    if (data.title.indexOf('纪委') !== -1 || data.title.indexOf('巡视') !== -1) {
      tags.push('corruption');
    }
    if (data.title.indexOf('派系') !== -1) {
      tags.push('faction');
    }

    this.record({
      category: category,
      type: 'notification',
      title: data.title,
      description: data.message || '',
      tags: tags,
      severity: 2,
    });
  }

  /** 当人员变动时 */
  _onPersonnelChange(data) {
    if (!data || !data.name) return;
    this.record({
      category: 'personnel_change',
      type: 'transfer',
      title: `人事调整: ${data.name}`,
      description: `${data.from || '原职'} → ${data.to || '新职'}`,
      tags: ['personnel', 'transfer'],
      actors: [data.officialId].filter(Boolean),
      severity: 3,
    });
  }

  // ==================== 核心API ====================

  /** 记录一个叙事事件 */
  record(entryData) {
    const entry = new NarrativeMemoryEntry(entryData);
    this.entries.push(entry);

    // 限制条目数量
    if (this.entries.length > this._maxEntries) {
      this.entries = this.entries.slice(-this._maxEntries);
    }

    // 同步到StateManager
    this._syncToState();
    return entry;
  }

  /** 批量记录 */
  recordBatch(entriesData) {
    const results = [];
    for (const data of entriesData) {
      results.push(this.record(data));
    }
    return results;
  }

  // ==================== 查询API ====================

  /** 按标签查询记忆 */
  findByTag(tag) {
    return this.entries.filter(e => e.hasTag(tag));
  }

  /** 按分类查询 */
  findByCategory(category) {
    return this.entries.filter(e => e.category === category);
  }

  /** 按角色查询与之相关的记忆 */
  findByActor(actorId) {
    return this.entries.filter(e => e.involvesActor(actorId));
  }

  /** 按剧情线查询 */
  findByPlotline(plotlineId) {
    return this.entries.filter(e => e.plotlineId === plotlineId);
  }

  /** 查询玩家对某派系/人物做过的最后一个关键决策 */
  getLastDecisionAbout(actorId) {
    const relevant = this.entries
      .filter(e => e.involvesActor(actorId) && e.category === 'decision')
      .sort((a, b) => (b.week + b.year * 52) - (a.week + a.year * 52));
    return relevant.length > 0 ? relevant[0] : null;
  }

  /** 统计某类事件的发生次数 */
  countByType(type) {
    return this.entries.filter(e => e.type === type).length;
  }

  /** 获取最近的N条记忆 */
  getRecent(count = 10) {
    return this.entries.slice(-count).reverse();
  }

  /** 获取所有记忆 */
  getAll() {
    return this.entries;
  }

  /** 统计对某派系支持/反对的次数 */
  countFactionStance(factionId, stanceType) {
    return this.entries.filter(e => {
      if (!e.impact.faction || e.impact.faction[factionId] === undefined) return false;
      const delta = e.impact.faction[factionId];
      if (stanceType === 'support') return delta > 0;
      if (stanceType === 'oppose') return delta < 0;
      return delta === 0;
    }).length;
  }

  /** 检查玩家是否做过某个特定类型的重要决策 */
  hasMadeSignificantDecision(type) {
    return this.entries.some(e => e.type === type && e.severity >= 3);
  }

  /** 获取一个决策的后续影响链 */
  getConsequencesOf(entryId) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return [];
    return entry.consequences
      .map(id => this.entries.find(e => e.id === id))
      .filter(Boolean);
  }

  /** 获取关键叙事摘要（用于结局生成） */
  generateSummary() {
    return {
      majorDecisions: this.entries.filter(e => e.severity >= 3),
      factionHistory: this._generateFactionHistory(),
      crisisMoments: this.entries.filter(e => e.hasTag('crisis')),
      timeline: this._generateTimeline(),
      decisionCount: this.entries.length,
    };
  }

  /** 生成派系关系变化历史 */
  _generateFactionHistory() {
    const factions = {};
    const relevantEntries = this.entries.filter(e =>
      e.category === 'decision' || e.category === 'matter'
    );
    for (const e of relevantEntries) {
      if (!e.impact.faction) continue;
      for (const [factionId, delta] of Object.entries(e.impact.faction)) {
        if (!factions[factionId]) factions[factionId] = { totalDelta: 0, events: [] };
        factions[factionId].totalDelta += delta;
        factions[factionId].events.push({
          title: e.title,
          delta: delta,
          time: e.getTimeLabel(),
        });
      }
    }
    return factions;
  }

  /** 生成时间线 */
  _generateTimeline() {
    return this.entries
      .filter(e => e.severity >= 2)
      .sort((a, b) => (a.year * 52 + a.week) - (b.year * 52 + b.week))
      .slice(-30) // 最多30条关键事件
      .map(e => ({
        time: e.getTimeLabel(),
        title: e.title,
        category: e.category,
        severity: e.severity,
      }));
  }

  // ==================== 内部方法 ====================

  /** 同步到StateManager */
  _syncToState() {
    const narrativeState = stateManager.get('narrative');
    if (narrativeState) {
      narrativeState.memories = this.entries.map(e => e.toJSON()).slice(-this._maxEntries);
    }
  }

  /** 从存档恢复 */
  deserialize(data) {
    if (!data || !data.memories) return;
    this.entries = data.memories.map(m => new NarrativeMemoryEntry(m));
    this._syncToState();
  }

  /** 序列化 */
  serialize() {
    return {
      memories: this.entries.map(e => e.toJSON()),
    };
  }

  /** 清理监听器 */
  destroy() {
    if (this._cleanupFn) {
      this._cleanupFn();
      this._cleanupFn = null;
    }
  }
}
