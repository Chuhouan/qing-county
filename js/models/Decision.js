/**
 * Decision - 决策树节点模型
 * 4.1 决策机制树
 */
class Decision {
  constructor(data = {}) {
    this.id = data.id || `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = data.name || '未命名决策';
    this.level = data.level || 'minor'; // minor/major/committee
    this.trigger = data.trigger || '';

    // 前置条件
    this.prerequisites = data.prerequisites || [];
    this.resourceRequirements = data.resourceRequirements || {};

    // 决策流程
    this.process = data.process || [];

    // 选项
    this.options = data.options || [];

    // 状态
    this.resolved = false;
    this.selectedOption = null;
    this.result = null;
  }

  /** 检查是否满足前置条件 */
  checkPrerequisites(state) {
    for (const prereq of this.prerequisites) {
      const { type, key, value } = prereq;
      if (type === 'resource' && state[key] < value) return false;
      if (type === 'time' && timeSystem.year < value) return false;
      if (type === 'condition' && !eval(prereq.expression)) return false;
    }
    return true;
  }

  /** 执行决策 */
  select(optionIndex) {
    const option = this.options[optionIndex];
    if (!option) return null;

    this.resolved = true;
    this.selectedOption = optionIndex;

    // 应用即时效果
    if (option.immediateEffects) {
      for (const effect of option.immediateEffects) {
        this._applyEffect(effect);
      }
    }

    this.result = {
      option: optionIndex,
      label: option.label,
      timestamp: { year: timeSystem.year, month: timeSystem.month, day: timeSystem.day },
    };

    eventBus.emit(EVENTS.DECISION_MAKE, {
      decisionId: this.id,
      option: optionIndex,
      result: this.result,
    });

    return this.result;
  }

  /** 应用效果 */
  _applyEffect(effect) {
    const { target, type, value } = effect;
    if (target === 'finance') {
      eventBus.emit(EVENTS.FINANCE_WARNING, { type, value });
    } else if (target === 'county') {
      const county = stateManager.get('county');
      if (county && county.economy) {
        county.economy[type] = (county.economy[type] || 0) + value;
      }
    } else if (target === 'player') {
      const player = stateManager.get('player');
      if (player) {
        // addPerformance已移除
        if (type === 'politicalCapital') player.politicalCapital += value;
      }
    } else if (target === 'social') {
      const county = stateManager.get('county');
      if (county) county.modifyTension(value);
    }
  }

  /** 获取推荐选项 */
  getRecommendedOption(stakeholders) {
    // 根据各相关方推荐，返回最推荐的选项
    const scores = this.options.map(() => 0);
    for (const s of stakeholders) {
      const rec = s.recommend;
      if (rec !== undefined && rec >= 0 && rec < this.options.length) {
        scores[rec] += s.weight || 1;
      }
    }
    const maxScore = Math.max(...scores);
    return maxScore > 0 ? scores.indexOf(maxScore) : -1;
  }

  toJSON() {
    return {
      id: this.id, name: this.name, level: this.level,
      options: this.options, resolved: this.resolved,
      selectedOption: this.selectedOption, result: this.result,
    };
  }
}
