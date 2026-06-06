/**
 * Plotline - 剧情线模型
 * 一条政治剧情线的运行时状态
 */
class Plotline {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name || '未命名剧情线';
    this.theme = data.theme || 'general';
    // 'power' | 'corruption' | 'reform' | 'development' | 'succession'

    // 状态: dormant → active → climax → resolved | failed
    this.status = data.status || 'dormant';
    this.progress = data.progress || 0;            // 0-100 总体进展
    this.yearIntroduced = data.yearIntroduced || 0;
    this.yearResolved = data.yearResolved || 0;

    // 关键节点记录 [{week, year, type, title, description, choice, npcReactions}]
    this.keyMoments = data.keyMoments || [];

    // 当前活跃的分支路径ID
    this.activeBranch = data.activeBranch || null;

    // 所有可用分支的定义（引用plotlines.js中的定义）
    this.branches = data.branches || [];

    // 已走完的分支路径
    this.completedBranches = data.completedBranches || [];

    // 相关NPC ID列表
    this.associatedNpcs = data.associatedNpcs || [];

    // 标签
    this.tags = data.tags || [];

    // 最终结局类型
    this.outcome = data.outcome || null;

    // 激活/推进条件（引用plotlines.js）
    this.conditions = data.conditions || {};

    // 触发计时: 上次推进的周数,用于冷却
    this.lastAdvanceWeek = data.lastAdvanceWeek || 0;

    // 叙事描述(用于UI展示)
    this.narrativeDescription = data.narrativeDescription || '';
  }

  /** 判断剧情线是否活跃 */
  isActive() {
    return this.status === 'active' || this.status === 'climax';
  }

  /** 判断是否已结束 */
  isResolved() {
    return this.status === 'resolved' || this.status === 'failed';
  }

  /** 推进到下一个阶段 */
  advance(branchChoice) {
    if (this.isResolved()) return false;

    this.lastAdvanceWeek = timeSystem ? Math.ceil((timeSystem.day || 1) / 7) : 0;
    this.progress = Math.min(100, this.progress + (branchChoice?.progressDelta || 10));

    // 记录关键节点
    if (branchChoice) {
      this.keyMoments.push({
        week: this.lastAdvanceWeek,
        year: timeSystem ? timeSystem.year : 2026,
        type: branchChoice.type || 'branch',
        title: branchChoice.title || this.name,
        description: branchChoice.description || '',
        choice: branchChoice.choice || null,
        npcReactions: branchChoice.npcReactions || {},
      });
    }

    // 检查是否进入高潮或结束
    if (this.progress >= 80 && this.status === 'active') {
      this.status = 'climax';
    } else if (this.progress < 80 && this.status === 'dormant') {
      this.status = 'active';
    }

    return true;
  }

  /** 结束剧情线 */
  resolve(outcome) {
    this.status = outcome === 'failure' ? 'failed' : 'resolved';
    this.outcome = outcome;
    this.yearResolved = timeSystem ? timeSystem.year : 0;
  }

  /** 获取关键节点数量 */
  getMomentCount() {
    return this.keyMoments.length;
  }

  /** 获取当前阶段名称 */
  getPhaseLabel() {
    const labels = {
      dormant: '未激活',
      active: '发展中',
      climax: '高潮',
      resolved: '已解决',
      failed: '失败',
    };
    return labels[this.status] || this.status;
  }

  /** 序列化 */
  toJSON() {
    return {
      id: this.id, name: this.name, theme: this.theme,
      status: this.status, progress: this.progress,
      yearIntroduced: this.yearIntroduced, yearResolved: this.yearResolved,
      keyMoments: this.keyMoments.slice(-10), // 只保留最近10个关键节点
      activeBranch: this.activeBranch,
      completedBranches: this.completedBranches,
      associatedNpcs: this.associatedNpcs,
      tags: this.tags, outcome: this.outcome,
      lastAdvanceWeek: this.lastAdvanceWeek,
      narrativeDescription: this.narrativeDescription,
    };
  }
}
