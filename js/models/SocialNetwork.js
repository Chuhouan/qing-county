/**
 * SocialNetwork — 社会群体关系网络
 * ================================
 * 管理社会群体间的：
 *   - 关系矩阵（同理心/敌视程度）
 *   - 怨气传染（从高怨气群体到其他群体）
 *   - 共鸣计算（事件对多群体的影响放大）
 *
 * 用法：SocialSystem 持有 SocialNetwork 实例，每周调用 propagate()
 */
class SocialNetwork {
  constructor() {
    /** 群体间关系矩阵: { groupA: { groupB: 0.3, ... }, ... }
     *  正值=同情/共鸣（怨气容易传染）
     *  负值=敌视/疏远（怨气传染受阻）
     *  范围 -1.0 ~ 1.0 */
    this.relations = {};

    // 初始化默认关系矩阵
    this._initDefaultRelations();
  }

  /** 初始化默认群体间关系 */
  _initDefaultRelations() {
    var r = this.relations;

    // 农民
    r.farmer = { worker: 0.3, teacher: 0.2, merchant: 0.1, entrepreneur: -0.1,
      retired: 0.1, laidoff: 0.4, student: 0.1, migrant: 0.5, townsfolk: 0.3 };

    // 工人
    r.worker = { farmer: 0.3, teacher: 0.3, merchant: 0.1, entrepreneur: -0.3,
      retired: 0.2, laidoff: 0.7, student: 0.3, migrant: 0.4, townsfolk: 0.2 };

    // 教师医生
    r.teacher = { farmer: 0.2, worker: 0.3, merchant: 0.2, entrepreneur: 0.1,
      retired: 0.4, laidoff: 0.3, student: 0.6, migrant: 0.2, townsfolk: 0.2 };

    // 个体商户
    r.merchant = { farmer: 0.1, worker: 0.1, teacher: 0.2, entrepreneur: 0.4,
      retired: 0.2, laidoff: -0.1, student: 0.1, migrant: -0.1, townsfolk: 0.3 };

    // 企业主
    r.entrepreneur = { farmer: -0.1, worker: -0.3, teacher: 0.1, merchant: 0.4,
      retired: 0.2, laidoff: -0.3, student: -0.1, migrant: -0.2, townsfolk: 0.1 };

    // 退休干部
    r.retired = { farmer: 0.1, worker: 0.2, teacher: 0.4, merchant: 0.2,
      entrepreneur: 0.2, laidoff: 0.1, student: 0.2, migrant: 0.0, townsfolk: 0.2 };

    // 下岗职工
    r.laidoff = { farmer: 0.4, worker: 0.7, teacher: 0.3, merchant: -0.1,
      entrepreneur: -0.3, retired: 0.1, student: 0.2, migrant: 0.3, townsfolk: 0.1 };

    // 大学生
    r.student = { farmer: 0.1, worker: 0.3, teacher: 0.6, merchant: 0.1,
      entrepreneur: -0.1, retired: 0.2, laidoff: 0.2, migrant: 0.2, townsfolk: 0.1 };

    // 外来务工人员
    r.migrant = { farmer: 0.5, worker: 0.4, teacher: 0.2, merchant: -0.1,
      entrepreneur: -0.2, retired: 0.0, laidoff: 0.3, student: 0.2, townsfolk: 0.1 };

    // 乡镇居民
    r.townsfolk = { farmer: 0.3, worker: 0.2, teacher: 0.2, merchant: 0.3,
      entrepreneur: 0.1, retired: 0.2, laidoff: 0.1, student: 0.1, migrant: 0.1 };
  }

  /** 获取两个群体间的关系值 */
  getRelation(typeA, typeB) {
    if (this.relations[typeA] && this.relations[typeA][typeB] !== undefined) {
      return this.relations[typeA][typeB];
    }
    return 0;
  }

  /** ===== 怨气传染 ===== */

  /**
   * 传播怨气——某群体怨气增加时，通过关系网传导到其他群体
   * @param {object} groups - 所有群体的映射 { type: SocialGroup }
   * @param {string} sourceType - 怨气来源群体类型
   * @param {number} grievanceDelta - 原始怨气增量
   * @param {number} tension - 当前社会张力（放大因子）
   * @returns {object} { 受影响群体: 传染量 }
   */
  propagateGrievance(groups, sourceType, grievanceDelta, tension) {
    var effects = {};
    if (!groups[sourceType]) return effects;

    var baseContagion = grievanceDelta * 0.15; // 基础传染比例
    var tensionMultiplier = 1 + (tension - 50) * 0.01; // 张力>50放大，<50缩小
    var sourceGroup = groups[sourceType];
    var weights = sourceGroup.contagionWeights || {};
    var sourceMob = sourceGroup.mobilization || 0;

    // 如果有动员行动，传染更快
    var mobMultiplier = 1 + sourceMob * 0.005;

    for (var targetType in groups) {
      if (targetType === sourceType) continue;
      var targetGroup = groups[targetType];
      if (!targetGroup) continue;

      // 传染量 = 基础传染 × 关系值(归一化) × 传染权重 × 张力乘数 × 动员乘数
      var relation = this.getRelation(sourceType, targetType);
      var weight = weights[targetType] || 0.1;
      var contagion = baseContagion * (relation > 0 ? relation * 0.5 + 0.5 : 0.5) * weight * tensionMultiplier * mobMultiplier;

      if (contagion > 0.5) {
        targetGroup.addGrievance(contagion);
        effects[targetType] = Math.round(contagion * 10) / 10;
      }
    }

    return effects;
  }

  /** ===== 共鸣效果 ===== */

  /** 获取完整的网络数据（用于UI） */
  getNetworkData(groups) {
    var nodes = [];
    var edges = [];

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      nodes.push({
        id: g.type,
        label: g.label,
        satisfaction: g.getOverallSatisfaction(),
        grievance: Math.round(g.grievance),
        mobilization: Math.round(g.mobilization),
        actionLevel: g.getActionLevel(),
      });
    }

    for (var a in this.relations) {
      for (var b in this.relations[a]) {
        var val = this.relations[a][b];
        if (Math.abs(val) > 0.1) {
          edges.push({
            source: a, target: b,
            weight: Math.abs(val),
            type: val > 0 ? 'positive' : 'negative',
          });
        }
      }
    }

    return { nodes: nodes, edges: edges };
  }
}
