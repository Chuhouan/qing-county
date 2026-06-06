/**
 * PolicySystem - 政策系统
 * 4.4 政策制定、执行、冲突检测
 */
class PolicySystem {
  constructor() { this.engine = null; this.policies = []; }

  init() {
    stateManager.register('policies', { active: [], history: [] });
    // 初始政策
    this._addDefaultPolicy();
  }

  _addDefaultPolicy() {
    this.policies.push({
      id: 'policy_default_01', name: '国企优先政策',
      type: 'economic', status: 'active',
      design: 50, effect: 0.5,
      startYear: 1988,
      targets: ['国企扶持'],
    });
  }

  /** 制定新政策 */
  createPolicy(data) {
    const policy = {
      id: `policy_${Date.now()}`,
      name: data.name,
      type: data.type || 'economic',   // economic/social/agricultural/admin
      status: 'draft',
      design: data.design || 50,
      executionEfficiency: data.execution || 50,
      targetMatch: data.targetMatch || 50,
      resourceRate: data.resourceRate || 50,
      resistance: data.resistance || 10,
      startDate: { year: timeSystem.year, month: timeSystem.month },
      duration: data.duration || 12,
      description: data.description || '',
    };
    this.policies.push(policy);
    return policy;
  }

  /** 实施政策 */
  implementPolicy(policyId) {
    const policy = this.policies.find(p => p.id === policyId);
    if (!policy) return null;
    policy.status = 'active';

    // 计算实际效果
    const effect = calculator.calcPolicyEffect(
      policy.design, policy.executionEfficiency,
      policy.targetMatch, policy.resourceRate, policy.resistance
    );
    policy.effect = effect;

    // 检测冲突
    const conflicts = this.detectConflicts(policy);

    stateManager.set('policies', {
      active: this.policies.filter(p => p.status === 'active'),
      history: this.policies,
    });

    return { policy, effect, conflicts };
  }

  /** 政策冲突检测 */
  detectConflicts(newPolicy) {
    const conflicts = [];
    for (const existing of this.policies) {
      if (existing.id === newPolicy.id || existing.status !== 'active') continue;
      if (this._isConflicting(newPolicy, existing)) {
        conflicts.push({
          with: existing.name,
          level: this._conflictLevel(newPolicy, existing),
          description: `${newPolicy.name} 与 ${existing.name} 存在冲突`,
        });
      }
    }
    return conflicts;
  }

  _isConflicting(a, b) {
    return a.type === b.type && a.status !== 'draft' && b.status !== 'draft';
  }

  _conflictLevel(a, b) {
    const overlap = Math.abs(a.design - b.design);
    return overlap < 20 ? '高' : overlap < 40 ? '中' : '低';
  }

  /** 获取政策生命周期描述 */
  getLifecycleStage(policy) {
    if (policy.status === 'draft') return '制定阶段';
    if (policy.status === 'active') {
      const monthsActive = (timeSystem.year - policy.startDate.year) * 12 +
        (timeSystem.month - policy.startDate.month);
      if (monthsActive < 1) return '宣传动员';
      if (monthsActive < 3) return '试点阶段';
      if (monthsActive < 12) return '全面推开';
      return '常态化';
    }
    return '已终止';
  }
}
