/**
 * NarrativeMemoryEntry - 叙事记忆条目模型
 * 记录玩家做出的有意义的决策和关键事件,供NPC回忆和结局生成使用
 */
class NarrativeMemoryEntry {
  constructor(data = {}) {
    this.id = data.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.week = data.week || (timeSystem ? Math.ceil((timeSystem.day || 1) / 7) : 0);
    this.year = data.year || (timeSystem ? timeSystem.year : 2026);
    this.month = data.month || (timeSystem ? timeSystem.month : 1);

    // 分类
    this.category = data.category || 'decision';
    // 'decision' | 'matter' | 'plotline_branch' | 'faction_event' | 'personnel_change' | 'crisis'

    this.type = data.type || 'general';
    this.title = data.title || '未命名事件';
    this.description = data.description || '';

    // 标签系统,用于查询
    this.tags = data.tags || [];

    // 涉及的人物/派系ID
    this.actors = data.actors || [];

    // 量化的影响
    this.impact = {
      faction: data.impact?.faction || {},   // { factionId: delta }
      social: data.impact?.social || 0,
      economy: data.impact?.economy || 0,
      superior: data.impact?.superior || 0,
      politicalCapital: data.impact?.politicalCapital || 0,
    };

    // 选择信息
    this.chosenOption = data.chosenOption;    // 选项索引
    this.choiceLabel = data.choiceLabel || ''; // 选项文本
    this.totalOptions = data.totalOptions || 0; // 可选总数

    // 关联的剧情线
    this.plotlineId = data.plotlineId || null;
    this.plotlineEffect = data.plotlineEffect || null;

    // 后续触发的后果ID列表
    this.consequences = data.consequences || [];

    // 严重程度（供结局加权）
    this.severity = data.severity || 1; // 1-5
  }

  /** 获取格式化的时间标签 */
  getTimeLabel() {
    const monthNames = ['','一月','二月','三月','四月','五月','六月',
                        '七月','八月','九月','十月','十一月','十二月'];
    return `${this.year}年${monthNames[this.month]}`;
  }

  /** 获取简短描述（用于列表展示） */
  getSummary() {
    return `${this.getTimeLabel()} · ${this.title}`;
  }

  /** 判断是否与某actor有关 */
  involvesActor(actorId) {
    return this.actors.indexOf(actorId) !== -1;
  }

  /** 判断是否有某标签 */
  hasTag(tag) {
    return this.tags.indexOf(tag) !== -1;
  }

  /** 序列化 */
  toJSON() {
    return {
      id: this.id, week: this.week, year: this.year, month: this.month,
      category: this.category, type: this.type,
      title: this.title, description: this.description,
      tags: this.tags, actors: this.actors,
      impact: this.impact,
      chosenOption: this.chosenOption, choiceLabel: this.choiceLabel,
      totalOptions: this.totalOptions,
      plotlineId: this.plotlineId, plotlineEffect: this.plotlineEffect,
      consequences: this.consequences, severity: this.severity,
    };
  }
}
