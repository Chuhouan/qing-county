/**
 * SocialGroup (enhanced PopulationGroup) — 社会群体模型 v2
 * 每个群体是一个独立的行为体，有满意度/怨气/动员度/政策响应/传染权重
 */

class PopulationGroup {
  constructor(data = {}) {
    this.id = data.id || 'pop_' + (data.type || 'general');
    this.type = data.type || 'general';
    this.label = data.label || '一般群众';
    this.ratio = data.ratio || 0.1;
    this.subgroups = data.subgroups || [];

    // 满意度（保持原有三维度）
    this.satisfaction = {
      basicNeeds: data.satisfaction?.basicNeeds ?? 65,
      development: data.satisfaction?.development ?? 50,
      fairness: data.satisfaction?.fairness ?? 55,
    };

    // ===== 怨气与动员度（v3 - 衰减大幅削弱） =====
    this.grievance = data.grievance ?? 20;             // 0-100，累积型不满
    this.mobilization = data.mobilization ?? 0;         // 0-100，行动准备度
    // 默认衰减率：v3从0.92/0.95改为0.97/0.98——怨气下去的极慢
    this.grievanceDecayRate = data.grievanceDecayRate ?? 0.97;
    this.mobilizationDecayRate = data.mobilizationDecayRate ?? 0.98;

    // 行动阈值（分5级）
    this.thresholdPetition = data.thresholdPetition ?? 20;
    this.thresholdCollective = data.thresholdCollective ?? 40;
    this.thresholdStrike = data.thresholdStrike ?? 60;
    this.thresholdBlockade = data.thresholdBlockade ?? 75;
    this.thresholdRiot = data.thresholdRiot ?? 90;

    // 核心关切
    this.concerns = data.concerns || ['收入', '就业'];

    // 行动属性（保持原有）
    this.organizationLevel = data.organizationLevel ?? 0.5;
    this.actionCapability = data.actionCapability ?? 0.5;
    this.actionThreshold = data.actionThreshold ?? 60;

    // ===== 政策响应矩阵（NEW） =====
    // 每种政策类型对群体的影响乘数（0~2）
    this.policySensitivity = Object.assign({
      economy: 0.3,
      stability: 0.2,
      livelihood: 0.5,
      party: 0.1,
    }, data.policySensitivity || {});

    // ===== 群体间传染权重（NEW） =====
    // 表示这个群体对其他群体的动员影响力
    this.contagionWeights = Object.assign({}, data.contagionWeights || {});

    // 政治权重 + 人口权重（保持原有）
    this.politicalWeight = data.politicalWeight || 1.0;
    this.populationWeight = data.populationWeight || 1.0;
  }

  /** 获取总满意度（加权平均） */
  getOverallSatisfaction() {
    return (
      this.satisfaction.basicNeeds * 0.4 +
      this.satisfaction.development * 0.35 +
      this.satisfaction.fairness * 0.25
    );
  }

  /** 获取当前最高行动等级 0-5 */
  getActionLevel() {
    if (this.mobilization >= this.thresholdRiot) return 5;
    if (this.mobilization >= this.thresholdBlockade) return 4;
    if (this.mobilization >= this.thresholdStrike) return 3;
    if (this.mobilization >= this.thresholdCollective) return 2;
    if (this.mobilization >= this.thresholdPetition) return 1;
    return 0;
  }

  /** 获取行动描述文本 */
  getActionDescription() {
    var level = this.getActionLevel();
    switch (level) {
      case 0: return '稳定';
      case 1: return '来信来访增多';
      case 2: return '可能集体上访';
      case 3: return this.organizationLevel > 0.6 ? '可能组织罢工' : '个体闹事';
      case 4: return this.organizationLevel > 0.6 ? '堵路风险' : '集会风险';
      case 5: return '群体事件高风险';
    }
  }

  /** 判断是否有行动风险（保持原有兼容） */
  getActionRisk() {
    var sat = this.getOverallSatisfaction();
    if (sat < 30) return 'high';
    if (sat < 50) return 'medium';
    if (sat < 70) return 'low';
    return 'stable';
  }

  /** 修改满意度 */
  modifySatisfaction(dimension, delta) {
    if (this.satisfaction[dimension] !== undefined) {
      this.satisfaction[dimension] = calculator.clamp(
        this.satisfaction[dimension] + delta, 0, 100
      );
    }
  }

  /** ===== 怨气相关（NEW） ===== */

  /** 添加怨气（驱动因素：失业、物价、不公、事件等） */
  addGrievance(delta) {
    this.grievance = calculator.clamp(this.grievance + delta, 0, 100);
  }

  /** 释放怨气（政府回应、安抚等积极行动） */
  relieveGrievance(delta) {
    var actual = Math.min(delta, this.grievance);
    this.grievance = Math.max(0, this.grievance - actual);
    // 释放怨气也会降低动员度
    this.mobilization = Math.max(0, this.mobilization - actual * 0.3);
    return actual;
  }

  /** 每周怨气衰减（v3：加衰减地板 + 永久创伤） */
  decayGrievance() {
    // 自然衰减：向 0 靠拢（但留地板）
    var oldGrievance = this.grievance;
    this.grievance = Math.max(0, this.grievance * this.grievanceDecayRate);
    // v3：怨气地板——如果曾超过50，不低于5（不会完全平息）
    if (this.grievanceMax === undefined) this.grievanceMax = this.grievance;
    this.grievanceMax = Math.max(this.grievanceMax, oldGrievance);
    if (this.grievanceMax > 50) {
      this.grievance = Math.max(5, this.grievance);
    }

    // v3：永久创伤——怨气曾超过70的群体，满意度永久受损
    if (oldGrievance > 70 && !this._scarApplied) {
      this._scarApplied = true;
      this.satisfaction.basicNeeds = Math.max(0, this.satisfaction.basicNeeds - 5);
      this.satisfaction.fairness = Math.max(0, this.satisfaction.fairness - 3);
    }

    // 如果怨气低于行动阈值，动员度也自然回落
    if (this.grievance < this.thresholdPetition) {
      this.mobilization = Math.max(0, this.mobilization * this.mobilizationDecayRate);
    }
  }

  /** 更新动员度 */
  updateMobilization() {
    // 动员度由怨气驱动
    // 只在怨气超过最低阈值时才上升
    if (this.grievance > this.thresholdPetition) {
      var targetMob = Math.min(this.grievance, 
        this.getOverallSatisfaction() < 50 ? this.grievance * 1.2 : this.grievance * 0.8);
      // 向目标靠拢（每周调整10%）
      this.mobilization += (targetMob - this.mobilization) * 0.1;
      this.mobilization = calculator.clamp(this.mobilization, 0, 100);
    }
  }

  /** ===== 政策响应（NEW） ===== */

  /** 应用政策效果（返回产生的怨气量） */
  applyPolicyEffect(policyType, intensity) {
    // intensity: -1~1（负=伤害，正=受益）
    var sensitivity = this.policySensitivity[policyType] || 0.3;
    var satDelta = intensity * sensitivity * 10;

    // 影响满意度
    this.modifySatisfaction('basicNeeds', satDelta * 0.5);
    this.modifySatisfaction('development', satDelta * 0.3);
    this.modifySatisfaction('fairness', satDelta * 0.2);

    // 负面政策产生怨气
    if (intensity < 0) {
      this.addGrievance(Math.abs(intensity) * sensitivity * 5);
    }
    return Math.abs(intensity) * sensitivity * 5;
  }

  /** ===== 序列化 ===== */
  toJSON() {
    return {
      id: this.id, type: this.type, label: this.label, ratio: this.ratio,
      satisfaction: this.satisfaction, concerns: this.concerns,
      organizationLevel: this.organizationLevel,
      actionCapability: this.actionCapability,
      politicalWeight: this.politicalWeight,
      grievance: this.grievance,
      mobilization: this.mobilization,
      policySensitivity: this.policySensitivity,
      thresholdPetition: this.thresholdPetition,
      thresholdCollective: this.thresholdCollective,
      thresholdStrike: this.thresholdStrike,
      thresholdBlockade: this.thresholdBlockade,
      thresholdRiot: this.thresholdRiot,
    };
  }
}


/**
 * GroupManager — 群体管理器 v2
 * 生成和管理所有社会群体
 */
class PopulationManager {
  constructor() {
    this.groups = [];
  }

  /** 初始化默认群体（9个群体，对齐文档） */
  initDefault() {
    // 1. 农民 (45%)
    this.groups.push(new PopulationGroup({
      type: 'farmer', label: '农民群体', ratio: 0.45,
      politicalWeight: 0.8, populationWeight: 0.45,
      organizationLevel: 0.3, actionCapability: 0.4, actionThreshold: 70,
      satisfaction: { basicNeeds: 60, development: 40, fairness: 50 },
      concerns: ['粮价', '农资成本', '基础设施', '医疗'],
      grievance: 25, mobilization: 5,
      thresholdPetition: 25, thresholdCollective: 45, thresholdStrike: 70,
      thresholdBlockade: 85, thresholdRiot: 95,
      policySensitivity: { economy: 0.2, stability: 0.1, livelihood: 0.7, party: 0.05 },
      contagionWeights: { worker: 0.1, laidoff: 0.2 },
      subgroups: [
        { label: '种粮户', ratio: 0.4 },
        { label: '经作户', ratio: 0.3 },
        { label: '失地农民', ratio: 0.1 },
        { label: '外出务工家属', ratio: 0.2 },
      ],
    }));

    // 2. 工人 (18%)
    this.groups.push(new PopulationGroup({
      type: 'worker', label: '工人群体', ratio: 0.18,
      politicalWeight: 1.5, populationWeight: 0.18,
      organizationLevel: 0.7, actionCapability: 0.8, actionThreshold: 50,
      satisfaction: { basicNeeds: 60, development: 50, fairness: 55 },
      concerns: ['工资', '工作稳定', '社保', '劳动条件'],
      grievance: 30, mobilization: 8,
      thresholdPetition: 18, thresholdCollective: 35, thresholdStrike: 55,
      thresholdBlockade: 72, thresholdRiot: 88,
      policySensitivity: { economy: 0.6, stability: 0.3, livelihood: 0.4, party: 0.1 },
      contagionWeights: { farmer: 0.15, student: 0.2, laidoff: 0.3 },
      subgroups: [
        { label: '国企工人', ratio: 0.5 },
        { label: '集体企业工人', ratio: 0.3 },
        { label: '私企工人', ratio: 0.2 },
      ],
    }));

    // 3. 教师医生 (5%)
    this.groups.push(new PopulationGroup({
      type: 'teacher', label: '教师医生', ratio: 0.05,
      politicalWeight: 1.3, populationWeight: 0.05,
      organizationLevel: 0.5, actionCapability: 0.6, actionThreshold: 50,
      concerns: ['工资', '尊重', '教育资源'],
      satisfaction: { basicNeeds: 55, development: 50, fairness: 60 },
      grievance: 15, mobilization: 2,
      policySensitivity: { economy: 0.1, stability: 0.1, livelihood: 0.6, party: 0.2 },
      contagionWeights: { student: 0.3, retired: 0.2 },
    }));

    // 4. 个体商户 (7%)
    this.groups.push(new PopulationGroup({
      type: 'merchant', label: '个体商户', ratio: 0.07,
      politicalWeight: 1.0, populationWeight: 0.07,
      organizationLevel: 0.3, actionCapability: 0.4, actionThreshold: 60,
      concerns: ['税费', '监管', '客流'],
      satisfaction: { basicNeeds: 60, development: 55, fairness: 50 },
      grievance: 20, mobilization: 3,
      policySensitivity: { economy: 0.5, stability: 0.2, livelihood: 0.3, party: 0.05 },
      contagionWeights: { entrepreneur: 0.2, worker: 0.1 },
    }));

    // 5. 企业主 (2%)
    this.groups.push(new PopulationGroup({
      type: 'entrepreneur', label: '企业主', ratio: 0.02,
      politicalWeight: 1.4, populationWeight: 0.02,
      organizationLevel: 0.2, actionCapability: 0.6, actionThreshold: 40,
      concerns: ['政策', '融资', '成本'],
      satisfaction: { basicNeeds: 70, development: 60, fairness: 55 },
      grievance: 10, mobilization: 1,
      policySensitivity: { economy: 0.8, stability: 0.1, livelihood: 0.2, party: 0.05 },
      contagionWeights: { merchant: 0.2, bureaucrat_faction: 0.3 },
    }));

    // 6. 退休干部 (3%)
    this.groups.push(new PopulationGroup({
      type: 'retired', label: '退休干部', ratio: 0.03,
      politicalWeight: 1.2, populationWeight: 0.03,
      organizationLevel: 0.6, actionCapability: 0.5, actionThreshold: 40,
      concerns: ['待遇', '尊重', '影响力'],
      satisfaction: { basicNeeds: 65, development: 45, fairness: 60 },
      grievance: 15, mobilization: 4,
      policySensitivity: { economy: 0.1, stability: 0.3, livelihood: 0.3, party: 0.5 },
      contagionWeights: { teacher: 0.15, bureaucrat_faction: 0.4 },
    }));

    // 7. 下岗职工 (5%)
    this.groups.push(new PopulationGroup({
      type: 'laidoff', label: '下岗职工', ratio: 0.05,
      politicalWeight: 1.3, populationWeight: 0.05,
      organizationLevel: 0.6, actionCapability: 0.7, actionThreshold: 50,
      concerns: ['保障', '再就业'],
      satisfaction: { basicNeeds: 35, development: 25, fairness: 30 },
      grievance: 55, mobilization: 25,
      thresholdPetition: 15, thresholdCollective: 30, thresholdStrike: 50,
      thresholdBlockade: 65, thresholdRiot: 80,
      policySensitivity: { economy: 0.4, stability: 0.4, livelihood: 0.5, party: 0.05 },
      contagionWeights: { worker: 0.35, farmer: 0.15 },
    }));

    // 8. 大学生 (2%)
    this.groups.push(new PopulationGroup({
      type: 'student', label: '大学生', ratio: 0.02,
      politicalWeight: 0.8, populationWeight: 0.02,
      organizationLevel: 0.5, actionCapability: 0.6, actionThreshold: 50,
      concerns: ['就业', '公平'],
      satisfaction: { basicNeeds: 50, development: 40, fairness: 45 },
      grievance: 25, mobilization: 5,
      thresholdPetition: 15, thresholdCollective: 30,
      policySensitivity: { economy: 0.2, stability: 0.5, livelihood: 0.2, party: 0.3 },
      contagionWeights: { teacher: 0.3, worker: 0.15 },
    }));

    // 9. 外来务工人员 (3%) — 新增群体，对齐文档9群体
    this.groups.push(new PopulationGroup({
      type: 'migrant', label: '外来务工人员', ratio: 0.03,
      politicalWeight: 0.6, populationWeight: 0.03,
      organizationLevel: 0.2, actionCapability: 0.3, actionThreshold: 60,
      concerns: ['欠薪', '居住', '子女教育'],
      satisfaction: { basicNeeds: 40, development: 30, fairness: 35 },
      grievance: 45, mobilization: 12,
      thresholdPetition: 18, thresholdCollective: 35,
      policySensitivity: { economy: 0.3, stability: 0.3, livelihood: 0.5, party: 0.05 },
      contagionWeights: { laidoff: 0.25, worker: 0.2 },
    }));

    // 10. 乡镇居民 (10%) — 新增，补齐文档中提到的群体
    this.groups.push(new PopulationGroup({
      type: 'townsfolk', label: '乡镇居民', ratio: 0.10,
      politicalWeight: 0.7, populationWeight: 0.10,
      organizationLevel: 0.3, actionCapability: 0.3, actionThreshold: 65,
      concerns: ['基础设施', '公共服务', '环境'],
      satisfaction: { basicNeeds: 55, development: 45, fairness: 50 },
      grievance: 20, mobilization: 3,
      policySensitivity: { economy: 0.2, stability: 0.2, livelihood: 0.6, party: 0.1 },
      contagionWeights: { farmer: 0.2, merchant: 0.15 },
    }));

    return this.groups;
  }

  /** 计算社会总满意度 */
  calcTotalSatisfaction() {
    return calculator.calcTotalSatisfaction(
      this.groups.map(function(g) { return {
        populationWeight: g.populationWeight,
        politicalWeight: g.politicalWeight,
        satisfaction: g.getOverallSatisfaction(),
      };})
    );
  }

  /** 获取某个群体 */
  getGroup(type) {
    for (var i = 0; i < this.groups.length; i++) {
      if (this.groups[i].type === type) return this.groups[i];
    }
    return null;
  }

  /** 检查是否有群体处于高风险状态 */
  getHighRiskGroups() {
    var result = [];
    for (var i = 0; i < this.groups.length; i++) {
      if (this.groups[i].getActionRisk() === 'high') {
        result.push(this.groups[i]);
      }
    }
    return result;
  }

  /** 获取所有在行动中的群体（mobilization >= thresholdPetition） */
  getActiveGroups() {
    var result = [];
    for (var i = 0; i < this.groups.length; i++) {
      if (this.groups[i].mobilization >= this.groups[i].thresholdPetition) {
        result.push(this.groups[i]);
      }
    }
    return result;
  }

  /** 获取所有群体的状态摘要 */
  getSummary() {
    return this.groups.map(function(g) { return {
      id: g.id,
      type: g.type,
      label: g.label,
      ratio: g.ratio,
      satisfaction: g.getOverallSatisfaction(),
      grievance: Math.round(g.grievance),
      mobilization: Math.round(g.mobilization),
      actionLevel: g.getActionLevel(),
      risk: g.getActionRisk(),
      action: g.getActionDescription(),
    };});
  }

  /** 每周群体更新 */
  weeklyUpdate() {
    for (var i = 0; i < this.groups.length; i++) {
      var g = this.groups[i];
      g.decayGrievance();
      g.updateMobilization();
    }
  }
}
