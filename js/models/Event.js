/**
 * GameEvent - 游戏事件模型
 * 4.5 事件系统
 */
class GameEvent {
  constructor(data = {}) {
    this.id = data.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = data.name || '未命名事件';
    this.type = data.type || 'routine';     // routine/daily/petition/emergency/superior_task/personnel
    this.complexity = data.complexity || 'simple'; // simple/medium/complex/major

    // 触发条件
    this.triggers = data.triggers || [];
    this.triggerYear = data.triggerYear || null;
    this.triggerMonth = data.triggerMonth || null;

    // 描述
    this.description = data.description || '';
    this.background = data.background || '';

    // 现场信息
    this.scene = data.scene || '';

    // 相关方
    this.stakeholders = data.stakeholders || [];

    // 选项
    this.choices = data.choices || [];

    // 时效
    this.deadline = data.deadline || null;     // 必须多少天内处理
    this.urgent = data.urgent || false;         // 是否紧急

    // 事件链
    this.chainAfter = data.chainAfter || {};    // 各选项对应的后续事件
    this.chainConditions = data.chainConditions || {}; // 各选项对应的条件概率修正

    // 状态
    this.triggered = false;
    this.resolved = false;
    this.result = null;
    this.triggerDate = null;
  }

  /** 触发事件 */
  trigger() {
    this.triggered = true;
    this.triggerDate = {
      year: timeSystem.year,
      month: timeSystem.month,
      day: timeSystem.day,
    };
    eventBus.emit(EVENTS.EVENT_TRIGGER, { eventId: this.id, event: this });
  }

  /** 执行选择 */
  resolve(choiceIndex) {
    if (this.resolved) return null;
    const choice = this.choices[choiceIndex];
    if (!choice) return null;

    this.resolved = true;
    this.result = {
      choice: choiceIndex,
      choiceLabel: choice.label,
      effects: choice.effects || [],
      timestamp: { year: timeSystem.year, month: timeSystem.month, day: timeSystem.day },
    };

    // 应用效果
    if (Array.isArray(choice.effects)) {
      for (const effect of choice.effects) {
        this._applyEffect(effect);
      }
    }

    // 触发事件链
    const chainId = this.chainAfter[choiceIndex];
    if (chainId) {
      eventBus.emit(EVENTS.EVENT_CHAIN, { sourceEventId: this.id, targetEventId: chainId });
    }

    eventBus.emit(EVENTS.EVENT_RESOLVE, {
      eventId: this.id,
      choice: choiceIndex,
      result: this.result,
    });

    return this.result;
  }

  /** 应用效果（仅保留有效系统） */
  _applyEffect(effect) {
    const { target, type, value } = effect;
    if (target === 'social_tension') {
      const county = stateManager.get('county');
      if (county) county.modifyTension(value);
    } else if (target === 'county_stat') {
      const county = stateManager.get('county');
      if (county) {
        const path = type.replace(/_/g, '.');
        const keys = path.split('.');
        let obj = county;
        for (let i = 0; i < keys.length - 1; i++) {
          if (obj[keys[i]] === undefined) return;
          obj = obj[keys[i]];
        }
        const lastKey = keys[keys.length - 1];
        if (typeof obj[lastKey] === 'number') {
          obj[lastKey] += value;
        }
      }
    } else if (target === 'finance') {
      const finance = stateManager.get('finance');
      if (finance) {
        const amount = Math.abs(value || 0);
        if (value < 0) {
          if (finance.canApprove(amount)) finance.spend(amount);
        } else {
          finance.monthlyIncome += amount;
        }
      }
    }
    // 旧系统target（player_performance/player_relation/player_ability）已废弃，由_eventSystem自动补全
  }

  toJSON() {
    return {
      id: this.id, name: this.name, type: this.type,
      complexity: this.complexity, description: this.description,
      choices: this.choices, triggered: this.triggered,
      resolved: this.resolved, result: this.result,
    };
  }
}
