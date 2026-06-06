/**
 * EventSystem - 事件系统（修复版）
 * 事件循环回收 + 触发修复
 */
class EventSystem {
  constructor() {
    this.engine = null;
    this._events = [];
    this._activeEvents = [];
    this._resolvedHistory = [];
  }

  init() {
    // 修复：DAY_CHANGE在周循环中不触发，改为监听每周更新信号
    eventBus.on(EVENTS.MONTH_CHANGE, () => this.generateMonthlyEvents());
    eventBus.on(EVENTS.UI_REFRESH_DASHBOARD, () => {
      // 每次刷新时检查是否有未处理事件需要展示
      if (this._activeEvents.length > 0) return;
      // 如果待处理太少且游戏在运行，检查高张力触发
      const county = stateManager.get('county');
      if (county && county.socialTension > 50 && Math.random() < 0.05) {
        this._triggerRandomEvent();
      }
    });
  }

  registerEvent(event) {
    this._enrichEvent(event);
    this._events.push(event);
  }
  registerEvents(events) { events.forEach(e => this.registerEvent(e)); }

  /** 月度事件生成 + 自动回收 */
  generateMonthlyEvents() {
    const county = stateManager.get('county');
    const tension = county?.socialTension || 0;
    const baseCount = 2 + Math.floor(tension / 30); // 减少生成量，控制节奏
    for (let i = 0; i < baseCount; i++) {
      this._generateEventOfType(this._pickEventType());
    }
  }

  _pickEventType() {
    return calculator.weightedPick(
      ['routine','petition','emergency','superior_task','personnel'],
      [40, 20, 15, 15, 10]
    );
  }

  _triggerRandomEvent() {
    const pool = this._getAvailablePool();
    if (pool.length > 0) {
      this.activateEvent(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  _generateEventOfType(type) {
    const candidates = this._getAvailablePool().filter(e => e.type === type);
    if (candidates.length > 0) {
      const ev = candidates[Math.floor(Math.random() * candidates.length)];
      if (this._checkTriggers(ev)) {
        this.activateEvent(ev);
      }
    }
  }

  /** 获取可用事件池，不够时自动回收 */
  _getAvailablePool() {
    let available = this._events.filter(e => !e.triggered && !e.resolved);
    if (available.length < 3 && this._events.length > 0) {
      // 事件快用完了，回收所有已解决事件
      for (const e of this._events) {
        if (e.resolved) {
          e.triggered = false;
          e.resolved = false;
        }
      }
      available = this._events.filter(e => !e.triggered && !e.resolved);
    }
    return available;
  }

  /** 通过点号/下划线路径获取深层属性值 */
  _getNested(obj, path) {
    if (!obj || !path) return null;
    const keys = path.includes('.') ? path.split('.') : path.split('_');
    let val = obj;
    for (const k of keys) {
      if (val == null || typeof val !== 'object') return null;
      val = val[k];
    }
    return val;
  }

  _checkTriggers(event) {
    if (!event.triggers || event.triggers.length === 0) return true;
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    const player = stateManager.get('player');
    for (const t of event.triggers) {
      const { type, key, operator, value } = t;
      let src = null;
      if (type === 'county' || type === undefined) src = county;
      else if (type === 'finance') src = finance;
      else if (type === 'player') src = player;
      const stateVal = src ? this._getNested(src, key) : null;
      if (stateVal === null) return false;
      if (operator === '>' && !(stateVal > value)) return false;
      if (operator === '<' && !(stateVal < value)) return false;
      if (operator === '>=' && !(stateVal >= value)) return false;
      if (operator === '<=' && !(stateVal <= value)) return false;
      if (operator === '==' && !(stateVal === value)) return false;
    }
    return true;
  }

  activateEvent(event) {
    if (!event.triggered) {
      event.trigger();
      this._activeEvents.push(event);
      eventBus.emit(EVENTS.UI_OPEN_DECISION, { event });
    }
  }

  resolveEvent(eventId, choiceIndex) {
    let event = this._activeEvents.find(e => e.id === eventId);
    if (!event) event = this._events.find(e => e.id === eventId);
    if (!event) return null;
    if (!event.triggered) event.trigger();
    const result = event.resolve(choiceIndex);
    this._activeEvents = this._activeEvents.filter(e => e.id !== eventId);
    // 记录到历史
    this._resolvedHistory.push({ id: eventId, choice: choiceIndex, time: Date.now() });

    // 事件链
    const chainId = event.chainAfter?.[choiceIndex];
    if (chainId) {
      const chainEvent = this._events.find(e => e.id === chainId);
      if (chainEvent && this._checkTriggers(chainEvent)) {
        setTimeout(() => this.activateEvent(chainEvent), 300);
      }
    }
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return result;
  }

  getActiveEvents() { return this._activeEvents; }
  getPendingEvents() { return this._getAvailablePool(); }
  getResolvedCount() { return this._resolvedHistory.length; }

  /** 自动补全事件数据：category、cost、effects */
  _enrichEvent(event) {
    if (!event.category) {
      const typeMap = { emergency: 'socialStability', petition: 'socialStability',
        superior_task: 'partyConstruction', personnel: 'partyConstruction' };
      const text = [event.name, event.description, event.scene].filter(Boolean).join(' ');
      if (/经济|招商|企业|投资|项目|产业|GDP/.test(text)) event.category = 'economicDevelopment';
      else if (/稳定|上访|信访|冲突|聚集|群众|举报/.test(text)) event.category = 'socialStability';
      else if (/民生|教育|医疗|扶贫|社保|养老|低保/.test(text)) event.category = 'peopleLivelihood';
      else if (/党建|干部|巡视|纪检|组织|人事/.test(text)) event.category = 'partyConstruction';
      else event.category = typeMap[event.type] || 'economicDevelopment';
    }
    for (const choice of (event.choices || [])) {
      if (!choice.cost) {
        const cost = {}; const t = [choice.label, choice.desc, choice.description].filter(Boolean).join(' ');
        if (/拨款|补贴|出资|配套|花费|投资/.test(t)) { const m = t.match(/(\d+)\s*万/); cost.money = m ? +m[1] : 300; }
        if (/协调|求人|保干部|得罪|强推|承诺/.test(t)) cost.politicalCapital = 8 + Math.floor(Math.random() * 9);
        if (Object.keys(cost).length > 0) choice.cost = cost;
      }
      if (!choice.effects) {
        const e = {}; const t = [choice.label, choice.desc, choice.description].filter(Boolean).join(' ');
        if (/经济|招商|投资|增长|发展|项目/.test(t)) e.economicVitality = 5 + Math.floor(Math.random() * 8);
        if (/减产|关闭|停工|亏损|倒闭/.test(t)) e.economicVitality = -(5 + Math.floor(Math.random() * 8));
        if (/稳定|安抚|平息|满意|解决|化解/.test(t)) e.stability = 5 + Math.floor(Math.random() * 8);
        if (/激化|得罪|不满|上访|抗议|冲突/.test(t)) e.stability = -(5 + Math.floor(Math.random() * 8));
        if (/上级|汇报|请示|配合|贯彻|落实/.test(t)) e.superiorEvaluation = 3 + Math.floor(Math.random() * 5);
        if (/推掉|不配合|不执行|压住|拖延/.test(t)) e.superiorEvaluation = -(3 + Math.floor(Math.random() * 5));
        if (Object.keys(e).length > 0) choice.effects = e;
      }
      if (!choice.focusBonus) choice.focusBonus = event.category;
    }
  }
}
