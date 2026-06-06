/**
 * SocialSystem — 社会模拟系统 v3 (社会-信访一体化)
 * ================================
 * v3 变更：集成 PetitionSystem 为内部子系统，实现双向驱动
 *   群体情绪（宏观）↔ 信访个案（微观）相互反馈
 *
 * 集成架构：
 *   1. SocialGroup（群体状态机）
 *   2. SocialNetwork（群体关系 + 怨气传染）
 *   3. PublicOpinion（公共舆论层）
 *   4. Petition（信访子系统）— 内部集成
 *   5. StabilityResources（维稳资源分配）
 */
class SocialSystem {
  constructor() {
    this.engine = null;
    this.populationManager = new PopulationManager();
    this.socialNetwork = new SocialNetwork();
    this.publicOpinion = new PublicOpinion();
    /** 待处理的行动事件队列 */
    this._pendingActions = [];

    // v3：内部集成信访子系统
    this.petition = new PetitionSystem();

    // v3：维稳资源分配池
    this.stabilityResources = {
      total: 100,               // 每周可用资源（受财政/人力影响）
      allocated: {
        petitionResolve: 0,     // 信访化解 — 每10点→化解速度×1.2
        patrolDeter: 0,         // 巡逻防控 — 降低行动触发概率
        conflictInvestigation: 0, // 矛盾排查 — 提前生成低难度案件
        opinionMonitoring: 0,   // 舆情监控 — 提升舆论透明度
      },
    };
  }

  init(config) {
    this.populationManager.initDefault();
    stateManager.register('social', {
      tension: config.socialTension ?? 20,
      groups: this.populationManager.getSummary(),
      satisfaction: this.populationManager.calcTotalSatisfaction(),
    });
    // 注册舆论状态
    stateManager.register('publicOpinion', {
      topics: [],
      propagandaPower: 50,
      rumorRisk: 30,
      transparency: 40,
    });
    // 注册群体动员摘要
    stateManager.register('socialMobilization', {
      activeGroups: [],
      pendingActions: [],
    });

    // v3：内部信访子系统初始化（传递engine引用）
    this.petition.engine = this.engine;
    this.petition.init(config);

    // v3：注册维稳资源分配状态
    stateManager.register('stabilityResources', this.stabilityResources);

    // v3：监听信访事件实现双向反馈
    this._setupPetitionListeners();
  }

  /** v3：注册信访事件监听 */
  _setupPetitionListeners() {
    var self = this;

    // 越级事件 → 对应群体动员度上升
    eventBus.on('petition:escalated', function(data) {
      if (!data || !data.groupType) return;
      var group = self.populationManager.getGroup(data.groupType);
      if (group) {
        group.mobilization = Math.min(100, group.mobilization + (data.mobilizationBoost || 2));
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '📢 群体共鸣',
          message: group.label + '因信访越级事件而群情激愤，动员度+' + (data.mobilizationBoost || 2) + '。',
        });
      }
    });

    // 化解事件 → 对应群体怨气缓解
    eventBus.on('petition:resolved', function(data) {
      if (!data || !data.groupType) return;
      var group = self.populationManager.getGroup(data.groupType);
      if (group && data.reliefAmount) {
        group.relieveGrievance(data.reliefAmount);
      }
    });
  }

  /** ===== 每周更新 ===== */

  /**
   * 每周社会系统更新 v3（社会-信访一体化）
   * 完整周期：
   *   季节性检测 → 群体衰减 → 信访更新（含双向驱动） → 舆论 → 怨气传染 →
   *   行动检测 → 派系联动 → 状态同步
   */
  weeklyUpdate() {
    var county = stateManager.get('county');
    if (!county) return;

    // 0. 季节性事件检测（v3）
    this._applySeasonalEffects();

    // 0.5 v3：排查专项行动剩余周
    if (this._sweepActive) {
      this._sweepWeeksLeft = (this._sweepWeeksLeft || 0) - 1;
      if (this._sweepWeeksLeft <= 0) {
        this._sweepActive = false;
        this._sweepWeeksLeft = 0;
      }
    }
    // 联席会议标记（仅持续1周，自动过期）
    this._meetingBoost = false;
    stateManager.set('tempMeetingBoost', null);

    // 1. 群体内部更新（怨气衰减 + 动员度重算）
    this.populationManager.weeklyUpdate();

    // 1.5 v3：历史积怨追踪 — 每月末检查
    if (timeSystem) {
      // 初始化或追踪月内最低怨气
      if (!this._monthGrievanceMin) this._monthGrievanceMin = {};
      var groups = this.populationManager.groups;
      for (var mi = 0; mi < groups.length; mi++) {
        var g = groups[mi];
        if (this._monthGrievanceMin[g.type] === undefined) {
          this._monthGrievanceMin[g.type] = g.grievance;
        } else {
          this._monthGrievanceMin[g.type] = Math.min(this._monthGrievanceMin[g.type], g.grievance);
        }
      }
      // 检测月份变化（月首重置）
      if (timeSystem.day <= 7) {
        // 上月末的检查：如果有群体整月怨气未低于30，则额外加怨气
        var countHistory = 0;
        for (var gt in this._monthGrievanceMin) {
          if (this._monthGrievanceMin[gt] >= 30) {
            var histGroup = this.populationManager.getGroup(gt);
            if (histGroup) {
              histGroup.addGrievance(5);
              countHistory++;
            }
          }
        }
        if (countHistory > 0) {
          eventBus.emit(EVENTS.UI_NOTIFICATION, {
            type: 'warning', title: '📈 历史积怨',
            message: countHistory + '个群体整月怨气未缓解，积累怨气+5。',
          });
        }
        // 重置月内最低记录
        this._monthGrievanceMin = {};
      }
    }

    // 2. 舆论热度衰减
    var rumorReport = this.publicOpinion.weeklyUpdate(county.socialTension || 0);

    // === v3：信访子系统更新 + 双向驱动（群体→信访） ===

    // 2.5a 方向A：群体怨气/动员度影响信访生成参数
    this._applyGroupPressureToPetition();

    // 2.5b 方向B：信访积压反馈到群体
    this._applyPetitionBackpressureToGroups();

    // 2.5c 内部信访子系统每周更新
    this.petition.weeklyUpdate();

    // 2.5d 维稳资源效果应用
    this._applyStabilityResources();

    // 3. 舆论对群体情绪影响（含积案热点放大）
    this._applyOpinionToGroups();

    // 4. 怨气传染（基于当前张力 + 积案放大）
    this._propagateGrievances(county.socialTension || 0);

    // 5. 检测集体行动（受资源分配影响）
    this._checkCollectiveAction();

    // 5.5 v3：积案连锁反应 + 群体间共鸣检测 + 张力后果
    this._checkBacklogChainReaction();
    this._checkGroupResonance();
    this._applyTensionConsequences();

    // 6. 派系联动：群体满意度影响派系权力
    this.applyGroupSatisfactionToFactions();

    // 7. 同步到 StateManager
    this._syncState();

    return {
      rumorReport: rumorReport,
      activeGroups: this.populationManager.getActiveGroups().length,
      pendingActions: this._pendingActions.length,
    };
  }

  /** ===== v3：季节性事件 ===== */

  /** 季节性效果应用（基于当前月份） */
  _applySeasonalEffects() {
    if (!timeSystem) return;
    var month = timeSystem.month || 1;
    var groups = this.populationManager.groups;

    // 清除上一周的临时修饰器
    this._seasonalModifiers = null;

    // 2-3月：春耕
    if (month === 2 || month === 3) {
      var farmer = this.populationManager.getGroup('farmer');
      if (farmer) {
        farmer.grievanceDecayRate = 0.85; // 怨气衰减更慢
        // 额外：春耕农资成本推高怨气
        farmer.addGrievance(2);
      }
      this._seasonalModifiers = { type: 'spring_farming', label: '春耕季节' };
    }
    // 7-8月：防汛
    else if (month === 7 || month === 8) {
      var townsfolk = this.populationManager.getGroup('townsfolk');
      var farmer2 = this.populationManager.getGroup('farmer');
      var county = stateManager.get('county');
      // 基础设施差，灾害影响大
      var infraLevel = (county && county.institution && county.institution.infrastructure) || 40;
      var severity = Math.max(0, (60 - infraLevel) * 0.15);
      if (farmer2) farmer2.addGrievance(severity);
      if (townsfolk) townsfolk.addGrievance(severity);
      this._seasonalModifiers = { type: 'flood_season', label: '防汛季节', severity: Math.round(severity) };
    }
    // 9月：开学季
    else if (month === 9) {
      // 教育医疗类信访权重上升通过petition内部处理
      this._seasonalModifiers = { type: 'school_season', label: '开学季节' };
    }
    // 12-1月：年底欠薪高发
    else if (month === 12 || month === 1) {
      var worker = this.populationManager.getGroup('worker');
      var migrant = this.populationManager.getGroup('migrant');
      if (worker) worker.addGrievance(8);
      if (migrant) migrant.addGrievance(10);
      this._seasonalModifiers = { type: 'year_end', label: '年底欠薪高发' };
    }
    // 其他月份：恢复默认
    else {
      var allGroups = groups;
      for (var i = 0; i < allGroups.length; i++) {
        allGroups[i].grievanceDecayRate = 0.97; // 恢复默认值(v3: 0.97)
      }
    }
  }

  /** ===== v3：双向驱动 — 方向A：群体→信访 ===== */

  /** 群体压力传导至信访系统（影响案件生成参数） */
  _applyGroupPressureToPetition() {
    var groups = this.populationManager.groups;
    var county = stateManager.get('county');
    if (!county) return;

    // 计算群体怨气集中度
    var highGrievanceCount = 0;
    var totalGrievance = 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      totalGrievance += g.grievance * g.populationWeight;
      if (g.grievance > 40) highGrievanceCount++;
    }
    var avgGrievance = totalGrievance; // 加权平均

    // 取最高怨气群体列表（用于petition的group bias）
    var sortedGroups = groups.slice().sort(function(a, b) { return b.grievance - a.grievance; });
    var topGrievanceTypes = sortedGroups.slice(0, 3).map(function(g) { return g.type; });

    // 注入到petition的临时参数（petition内部 _generateNewCases 读取）
    stateManager.set('petitionTempParams', {
      avgGrievance: avgGrievance,
      highGrievanceCount: highGrievanceCount,
      topGrievanceTypes: topGrievanceTypes,
      mobilizationPeak: Math.max.apply(null, groups.map(function(g) { return g.mobilization; })),
      // 季节性修饰
      seasonalModifiers: this._seasonalModifiers,
    });
  }

  /** ===== v3：双向驱动 — 方向B：信访→群体 ===== */

  /** 信访积压对群体的反作用力 */
  _applyPetitionBackpressureToGroups() {
    var petitionState = stateManager.get('petition');
    if (!petitionState || !petitionState.cases) return;

    // 按群体统计积压案件
    var pendingByGroup = {};
    for (var i = 0; i < petitionState.cases.length; i++) {
      var c = petitionState.cases[i];
      if (c.status === 'resolved' || c.status === 'archived') continue;
      var groupType = c.petitioner && c.petitioner.group ? c.petitioner.group : c.category;
      if (!pendingByGroup[groupType]) pendingByGroup[groupType] = { cases: [], count: 0, escalatedCount: 0 };
      pendingByGroup[groupType].cases.push(c);
      pendingByGroup[groupType].count++;
      if (c.currentLevel !== 'county') pendingByGroup[groupType].escalatedCount++;
    }

    var groups = this.populationManager.groups;
    for (var j = 0; j < groups.length; j++) {
      var g = groups[j];
      var info = pendingByGroup[g.type];
      if (!info || info.count === 0) continue;

      // 积压案件 → 增加怨气
      if (info.count >= 3) {
        var backpressure = info.count * 0.3; // 每个积案每周+0.3怨气
        g.addGrievance(backpressure);
      }

      // 越级案件 → 增加动员度（榜样效应）
      if (info.escalatedCount > 0) {
        g.mobilization = Math.min(100, g.mobilization + info.escalatedCount * 2);
      }

      // 查询是否有本周新生成的集体访案件
      var hasCollective = false;
      for (var k = 0; k < info.cases.length; k++) {
        if (info.cases[k].type === 'collective' && info.cases[k].weeksOnFile <= 1) {
          hasCollective = true;
          break;
        }
      }
      if (hasCollective) {
        g.mobilization = Math.min(100, g.mobilization + 5);
        g.addGrievance(3);
      }
    }

    // 清除临时参数
    stateManager.set('petitionTempParams', null);
  }

  /** ===== v3：维稳资源分配效果 ===== */

  /** 维稳资源分配的各维度效果 */
  _applyStabilityResources() {
    var res = this.stabilityResources;
    if (!res) return;

    var patrol = res.allocated.patrolDeter || 0;
    var monitor = res.allocated.opinionMonitoring || 0;

    // 巡逻防控：降低行动触发概率（临时标记，_checkCollectiveAction中读取）
    this._patrolDeterRate = Math.min(0.5, patrol / 200);

    // 舆情监控：提升透明度
    if (monitor > 0) {
      this.publicOpinion.transparency = Math.min(100, this.publicOpinion.transparency + monitor * 0.05);
    }

    // v3：联席会议标记 → 临时提高化解效率
    if (this._meetingBoost) {
      // 通过stateManager给petition系统传递临时加成
      stateManager.set('tempMeetingBoost', {
        active: true,
        resolveBoost: 1.2, // +20%化解速度
        escalationReduction: 10,
      });
    }
  }

  /** ===== v3：玩家主动管理操作 ===== */

  /**
   * 下访调研 — 主动深入某群体发现隐藏问题
   * @param {string} groupType - 群体类型
   * @returns {object} 结果
   */
  proactiveInvestigate(groupType) {
    var player = stateManager.get('player');
    if (player && !player.consumeEnergy(15)) return { success: false, msg: '精力不足（需要15）' };

    var group = this.populationManager.getGroup(groupType);
    if (!group) return { success: false, msg: '群体不存在' };

    // 发现隐藏案件：生成一个难度降低的案件
    var petitionState = stateManager.get('petition');
    if (petitionState) {
      // 手动生成一个低难度案件
      var categoryKeys = Object.keys(PETITION_CATEGORIES);
      var cat = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
      var caseData = {
        type: 'individual',
        category: cat,
        difficulty: Math.max(10, Math.round((PETITION_CATEGORIES[cat] ? PETITION_CATEGORIES[cat].baseDifficulty : 50) * 0.7)),
        legalMerit: 40 + Math.floor(Math.random() * 40),
        urgency: 30 + Math.floor(Math.random() * 40),
        importance: 1,
        petitioner: { group: groupType, name: this.petition._randomName() },
        description: '书记下访中了解到的问题',
        demand: '反映民生诉求',
        tags: ['proactive_discovery'],
        // 提前发现，初始化解进度较高
        resolveProgress: 15,
        trustInGov: 50,
        escalationRisk: 5,
      };
      var newCase = new PetitionCase(caseData);
      petitionState.cases.push(newCase);
      petitionState.totalCaseCount++;
      petitionState.stats.monthlyIncoming = (petitionState.stats.monthlyIncoming || 0) + 1;
    }

    // 怨气降低
    group.relieveGrievance(5);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '👣 下访调研',
      message: '您深入' + group.label + '走访调研，发现并提前介入了一起潜在矛盾。怨气-5。',
    });

    return { success: true, group: groupType, grievanceRelief: 5 };
  }

  /**
   * 矛盾排查专项行动
   * @param {object} opts - 可选参数
   */
  proactiveSweep(opts) {
    var player = stateManager.get('player');
    var county = stateManager.get('county');
    if (player && !player.consumeEnergy(20)) return { success: false, msg: '精力不足（需要20）' };
    player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 8);

    // 所有活跃案件难度×0.85
    var petitionState = stateManager.get('petition');
    if (petitionState && petitionState.cases) {
      var count = 0;
      for (var i = 0; i < petitionState.cases.length; i++) {
        var c = petitionState.cases[i];
        if (c.status === 'resolved' || c.status === 'archived') continue;
        c.difficulty = Math.max(10, Math.round(c.difficulty * 0.85));
        c.escalationRisk = Math.max(0, c.escalationRisk - 10);
        count++;
      }

      // 标记排查效果持续4周
      this._sweepActive = true;
      this._sweepWeeksLeft = 4;

      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: '🔍 排查专项行动',
        message: '启动矛盾排查专项行动，' + count + '件在办案件难度降低，越级风险-10。效果持续4周。',
      });
      return { success: true, affectedCases: count };
    }
    return { success: false, msg: '信访系统未就绪' };
  }

  /**
   * 召开联席会议
   * @param {string} caseId - 可选，指定重点案件
   */
  proactiveJointMeeting(caseId) {
    var player = stateManager.get('player');
    if (player && !player.consumeEnergy(10)) return { success: false, msg: '精力不足（需要10）' };

    var petitionState = stateManager.get('petition');
    if (!petitionState) return { success: false, msg: '信访系统未就绪' };

    // 所有在办案件越级风险-10
    var count = 0;
    for (var i = 0; i < petitionState.cases.length; i++) {
      var c = petitionState.cases[i];
      if (c.status === 'resolved' || c.status === 'archived') continue;
      c.escalationRisk = Math.max(0, c.escalationRisk - 10);
      count++;
    }

    // 如果有指定案件，额外加快化解
    if (caseId) {
      var target = petitionState.cases.find(function(x) { return x.id === caseId; });
      if (target && target.status !== 'resolved') {
        target.resolveProgress = Math.min(100, target.resolveProgress + 20);
      }
    }

    // 标记包案效率提升（1周）
    this._meetingBoost = true;

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '🤝 联席会议',
      message: '召开信访联席会议，' + count + '件案件越级风险-10。',
    });
    return { success: true, affectedCases: count };
  }

  /**
   * 民生微工程 — 定向解决某群体核心关切
   * @param {string} groupType - 群体类型
   * @param {number} cost - 财政投入（万元）
   */
  proactiveLivelihoodProject(groupType, cost) {
    var finance = stateManager.get('finance');
    if (!finance || (finance.treasuryBalance || 0) < cost) {
      return { success: false, msg: '财政资金不足' };
    }
    var player = stateManager.get('player');
    if (player && !player.consumeEnergy(5)) return { success: false, msg: '精力不足（需要5）' };

    finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - cost);

    var group = this.populationManager.getGroup(groupType);
    if (!group) return { success: false, msg: '群体不存在' };

    var relief = Math.min(15, Math.round(cost / 15));
    group.relieveGrievance(relief);
    group.modifySatisfaction('basicNeeds', 8);
    group.modifySatisfaction('development', 5);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🏗️ 民生微工程',
      message: '投入' + cost + '万元实施民生工程，' + group.label + '怨气-' + relief + '，满意度提升。',
    });
    return { success: true, group: groupType, cost: cost, grievanceRelief: relief };
  }

  /** 舆论对群体的情绪影响 */
  _applyOpinionToGroups() {
    var groups = this.populationManager.groups;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var impact = this.publicOpinion.calcOpinionImpactOnGroup(g);
      if (Math.abs(impact) > 0.5) {
        g.addGrievance(impact);
      }
    }
  }

  /** 群体间怨气传染 */
  _propagateGrievances(tension) {
    var groups = this.populationManager.groups;
    // 构建 type → group 映射
    var groupMap = {};
    for (var i = 0; i < groups.length; i++) {
      groupMap[groups[i].type] = groups[i];
    }

    // 对每个 high-grievance 群体，传播怨气
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.grievance > g.thresholdCollective) {
        // 高怨气群体向外传染
        var delta = (g.grievance - g.thresholdCollective) * 0.08;
        this.socialNetwork.propagateGrievance(groupMap, g.type, delta, tension);
      }
    }
  }

  /** ===== 集体行动系统 ===== */

  /** 集体行动配置（5级递进） */
  static ACTION_TEMPLATES = [
    null, // 0 = 无行动
    {
      level: 1, name: '来信来访', icon: '✉️',
      desc: '个别群众通过信访渠道表达诉求',
      grievanceCost: 5, // 触发后消耗的怨气量
      effects: { tension: 2, superior: -1 },
      responseOptions: [
        { label: '批转处理', cost: { energy: 5 }, effects: { grievanceRelief: 8, satisfaction: 2 } },
        { label: '亲自接访', cost: { energy: 15, politicalCapital: 5 }, effects: { grievanceRelief: 15, satisfaction: 5, superior: 1 } },
        { label: '搁置不理', cost: {}, effects: { grievanceRise: 5, mobilizationRise: 3 } },
      ],
    },
    {
      level: 2, name: '集体上访', icon: '📋',
      desc: '有组织的群众到县政府或上级部门集体上访',
      grievanceCost: 10,
      effects: { tension: 5, superior: -3 },
      responseOptions: [
        { label: '接待疏导', cost: { energy: 10, politicalCapital: 3 }, effects: { grievanceRelief: 20, satisfaction: 3, tension: -2 } },
        { label: '承诺解决问题', cost: { treasury: 100, politicalCapital: 5 }, effects: { grievanceRelief: 30, satisfaction: 8, tension: -5 } },
        { label: '公安维持秩序', cost: { politicalCapital: 8 }, effects: { grievanceRise: 10, mobilizationRise: 5, tension: -1 } },
        { label: '回避不见', cost: { energy: -5 }, effects: { grievanceRise: 8, mobilizationRise: 8, superior: -3 } },
      ],
    },
    {
      level: 3, name: '罢工/罢市', icon: '⚡',
      desc: '工人罢工或商户罢市，经济受到影响',
      grievanceCost: 15,
      effects: { tension: 8, economicVitality: -10, taxIncome: -0.15 },
      responseOptions: [
        { label: '对话谈判', cost: { energy: 20, politicalCapital: 10 }, effects: { grievanceRelief: 30, satisfaction: 5, tension: -5 } },
        { label: '紧急安抚（出钱）', cost: { treasury: 300, politicalCapital: 5 }, effects: { grievanceRelief: 45, satisfaction: 10, tension: -8 } },
        { label: '依法处置', cost: { politicalCapital: 5 }, effects: { grievanceRise: 15, mobilizationRise: 10, tension: 3 } },
      ],
    },
    {
      level: 4, name: '堵路/集会', icon: '🚧',
      desc: '群众堵塞交通或在公共场所集会',
      grievanceCost: 25,
      effects: { tension: 15, economicVitality: -20, superior: -8 },
      responseOptions: [
        { label: '启动应急预案', cost: { energy: 25, politicalCapital: 15, treasury: 200 }, effects: { grievanceRelief: 35, tension: -10 } },
        { label: '出动警力驱散', cost: { politicalCapital: 20 }, effects: { grievanceRise: 20, mobilizationRise: 15, superior: -3 } },
        { label: '上级介入调解', cost: { politicalCapital: 30, superior: -5 }, effects: { grievanceRelief: 40, tension: -12, satisfaction: 3 } },
      ],
    },
    {
      level: 5, name: '群体事件', icon: '🔥',
      desc: '大规模群体事件，秩序受到严重冲击',
      grievanceCost: 35,
      effects: { tension: 25, economicVitality: -30, superior: -15 },
      responseOptions: [
        { label: '全力安抚', cost: { treasury: 500, politicalCapital: 30, energy: 30 }, effects: { grievanceRelief: 50, tension: -15, satisfaction: 5 } },
        { label: '请求上级支援', cost: { superior: -10, politicalCapital: 25 }, effects: { grievanceRelief: 30, tension: -10, superior: -3 } },
        { label: '铁腕处置', cost: { politicalCapital: 30, integrity: -10 }, effects: { grievanceRise: 15, tension: -5, superior: -8 } },
      ],
    },
  ];

  /** 检测是否触发集体行动事件 */
  _checkCollectiveAction() {
    var groups = this.populationManager.groups;
    var county = stateManager.get('county');
    if (!county) return;

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var actionLevel = g.getActionLevel();
      if (actionLevel === 0) continue;

      // 已经在该群体有此级别的待处理行动
      if (this._hasPendingActionForGroup(g.type, actionLevel)) continue;

      // 触发概率：动员度越高越容易触发
      var chance = (g.mobilization - g.thresholdPetition) / 100;
      // 张力放大
      var tensionFactor = (county.socialTension || 0) / 100;
      chance = chance * (1 + tensionFactor);

      // v3：巡逻防控降低触发概率
      if (this._patrolDeterRate) {
        chance = chance * (1 - this._patrolDeterRate);
      }

      // v3：排查专项行动期间触发概率降低
      if (this._sweepActive) {
        chance = chance * 0.7;
      }

      // v3：触发基础概率从0.2提升至0.5（更刺激）
      if (Math.random() < chance * 0.5) {
        this._createActionEvent(g, actionLevel);
      }
    }
  }

  /** 检查是否有该群体同级别的待处理行动 */
  _hasPendingActionForGroup(groupType, level) {
    for (var i = 0; i < this._pendingActions.length; i++) {
      var a = this._pendingActions[i];
      if (a.groupType === groupType && a.level === level) return true;
    }
    return false;
  }

  /** 创建一个行动事件 */
  _createActionEvent(group, level) {
    var template = SocialSystem.ACTION_TEMPLATES[level];
    if (!template) return;

    var actionEvent = {
      id: 'action_' + group.type + '_' + level + '_' + Date.now(),
      groupType: group.type,
      groupLabel: group.label,
      level: level,
      name: template.name,
      icon: template.icon,
      desc: group.label + '：' + template.desc,
      grievanceCost: template.grievanceCost,
      effects: Object.assign({}, template.effects),
      responseOptions: template.responseOptions.map(function(o) { return Object.assign({}, o); }),
      createdAt: timeSystem ? (timeSystem.year + '-' + timeSystem.month + '-' + timeSystem.week) : 'now',
      resolved: false,
    };

    // 消耗群体怨气
    group.grievance = Math.max(0, group.grievance - template.grievanceCost);
    // 动员度部分释放
    group.mobilization = Math.max(0, group.mobilization - template.grievanceCost * 0.5);

    this._pendingActions.push(actionEvent);

    // 触发舆论热点
    var valence = -(level * 8);
    var affected = [group.type];
    // 通过socialNetwork找同情的群体
    for (var otherType in (group.contagionWeights || {})) {
      if (group.contagionWeights[otherType] > 0.15) {
        affected.push(otherType);
      }
    }
    this.publicOpinion.addTopic(
      group.label + template.name,
      valence, 'player', affected,
      { baseHeat: 30 + level * 10, decayRate: 0.88, severity: level * 0.2 }
    );

    // 派系联动：群体行动影响相关派系
    this._applyFactionEffectsOnAction(group.type, level, false, null);

    // 发出事件
    eventBus.emit(EVENTS.SOCIAL_PROTEST, {
      action: actionEvent,
      group: group.type,
      level: level,
    });

    // UI通知
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: level >= 4 ? 'error' : (level >= 3 ? 'warning' : 'info'),
      title: template.icon + ' ' + group.label + template.name,
      message: template.desc + (level >= 4 ? '【严重】' : ''),
      actionId: actionEvent.id,
    });
  }

  /** ===== 派系↔社会联动 ===== */

  /** 社会群体→派系映射（群体行动影响的派系） */
  static GROUP_FACTION_MAP = {
    farmer: 'local',        // 农民→本土系（地头蛇的地盘）
    worker: 'magistrate',   // 工人→县长系（行政责任）
    teacher: 'bureaucrat',  // 教师→官僚系（办事的专业人士）
    merchant: 'local',      // 商户→本土系
    entrepreneur: 'magistrate', // 企业主→县长系（经济口）
    retired: 'secretary',   // 退休干部→书记系（体制内）
    laidoff: 'appointed',   // 下岗职工→空降系（上级压力传导）
    student: 'nonaligned',  // 学生→无派系
    migrant: 'local',       // 外来务工→本土系（地缘影响）
    townsfolk: 'local',     // 乡镇居民→本土系
  };

  /** 群体行动发生时的影响派系 */
  _applyFactionEffectsOnAction(groupType, level, isResolution, resolutionType) {
    var factionSys = this.engine ? this.engine.getSystem('factions') : null;
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!factionSys || !personnel) return;

    var targetFaction = SocialSystem.GROUP_FACTION_MAP[groupType];
    if (!targetFaction || !factionSys.factions[targetFaction]) return;
    var f = factionSys.factions[targetFaction];

    if (isResolution) {
      // 行动处置后的派系反应
      switch (resolutionType) {
        case 'dialogue':    // 对话→派系认可
          factionSys.modifyRelation(targetFaction, 'secretary', 3);
          break;
        case 'appease':     // 安抚（花钱）→派系高兴
          factionSys.modifyRelation(targetFaction, 'secretary', 5);
          // 全派系忠诚小幅上升
          for (var mi = 0; mi < (f.members || []).length; mi++) {
            var off = personnel.get(f.members[mi]);
            if (off) off._loyalty = Math.min(100, (off._loyalty || 50) + 1);
          }
          break;
        case 'suppress':    // 压制→派系反感（本土系尤其）
          factionSys.modifyRelation(targetFaction, 'secretary', -8);
          for (var mj = 0; mj < (f.members || []).length; mj++) {
            var off2 = personnel.get(f.members[mj]);
            if (off2) off2._loyalty = Math.max(0, (off2._loyalty || 50) - 3);
          }
          break;
        case 'superior':    // 上级介入→派系复杂
          factionSys.modifyRelation(targetFaction, 'secretary', -2);
          break;
      }
    } else {
      // 行动触发时的派系惊讶（士气影响）
      var triggerImpact = -level * 0.5;
      for (var mk = 0; mk < (f.members || []).length; mk++) {
        var off3 = personnel.get(f.members[mk]);
        if (off3) {
          off3._loyalty = Math.max(0, (off3._loyalty || 50) + triggerImpact);
        }
      }
    }

    // 派系权力重算
    factionSys._recalcAllPower();
  }

  /** ===== v3：积案连锁反应 ===== */

  /** 信访积案连锁反应检测 */
  _checkBacklogChainReaction() {
    var backlogs = this.getBacklogStats();
    if (backlogs.length === 0) return;

    var county = stateManager.get('county');
    if (!county) return;

    for (var i = 0; i < backlogs.length; i++) {
      var bl = backlogs[i];
      var group = this.populationManager.getGroup(bl.groupType);
      if (!group) continue;

      // 积案（count>=3）但 avgProgress<30 → 产生舆论热点
      var topicExists = false;
      var topics = this.publicOpinion.topics;
      for (var t = 0; t < topics.length; t++) {
        if (topics[t].title && topics[t].title.indexOf(bl.groupType + '_backlog') >= 0) {
          topicExists = true;
          break;
        }
      }

      if (!topicExists) {
        this.publicOpinion.addTopic(
          bl.groupType + '_backlog',
          -(10 + bl.count * 2),
          'system', [bl.groupType],
          { baseHeat: 30 + bl.count * 5, decayRate: 0.90, severity: 0.5 }
        );
      }

      // 临界积案（count>=5 且 avgProgress<30）→ 社会张力上升
      if (bl.critical) {
        county.socialTension = Math.min(100, (county.socialTension || 0) + 2);
        group.addGrievance(3);

        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '⚠️ 积案预警',
          message: group.label + '积案' + bl.count + '件且平均化解进度仅' + bl.avgProgress + '%，社会张力+2。',
        });
      }
    }
  }

  /** ===== v3：群体间连锁共鸣 ===== */

  /** 群体间共鸣效应：A群体行动→B群体受感染 */
  _checkGroupResonance() {
    var groups = this.populationManager.groups;
    var county = stateManager.get('county');
    if (!county) return;

    // 检查哪些群体处于高行动状态（actionLevel >= 3）
    var activeHighLevel = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.getActionLevel() >= 3) {
        activeHighLevel.push(g);
      }
    }
    if (activeHighLevel.length === 0) return;

    var groupMap = {};
    for (var k = 0; k < groups.length; k++) {
      groupMap[groups[k].type] = groups[k];
    }

    // 对每个高行动群体，向关系密切的群体传播共鸣
    for (var j = 0; j < activeHighLevel.length; j++) {
      var source = activeHighLevel[j];
      var contagion = source.contagionWeights || {};

      for (var targetType in contagion) {
        if (contagion[targetType] <= 0) continue;
        var target = groupMap[targetType];
        if (!target) continue;

        // 通过SocialNetwork检查关系值
        var relation = this.socialNetwork.getRelation(source.type, targetType);
        if (relation < 0.3) continue; // 关系不够近的不产生共鸣

        // 共鸣效应：目标群体获得怨气 + 动员度
        var resonanceGrievance = contagion[targetType] * 2;
        var resonanceMob = contagion[targetType] * 1.5;

        target.addGrievance(resonanceGrievance);
        target.mobilization = Math.min(100, target.mobilization + resonanceMob);
      }
    }

    // 三个及以上群体活跃 → 全局张力加速 + 全面打击
    if (activeHighLevel.length >= 3) {
      county.socialTension = Math.min(100, (county.socialTension || 0) + 3);
      // 经济损伤
      if (county.economy) {
        var dmg = activeHighLevel.length * 2;
        county.economy.economicVitality = Math.max(0, (county.economy.economicVitality || 50) - dmg);
        county.economy.gdpGrowth = Math.max(-0.05, (county.economy.gdpGrowth || 0.05) - 0.01 * activeHighLevel.length);
      }
      // 上级信任受损
      if (county.superiorTrust) {
        county.superiorTrust.citySecretary = Math.max(0, (county.superiorTrust.citySecretary || 50) - 2);
      }
      // 国库直接损失——闹事要花钱维稳（治安费/赔偿/加班）
      var finance = stateManager.get('finance');
      if (finance) {
        var unrestCost = activeHighLevel.length * 50;
        finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - unrestCost);
      }
      // 干部集体离心——社会动荡让所有干部对书记的评价下降
      var personnel = this.engine ? this.engine.getSystem('personnel') : null;
      if (personnel && personnel.getAll) {
        var allOfficials = personnel.getAll();
        if (allOfficials && allOfficials.length > 0) {
          for (var oi = 0; oi < allOfficials.length; oi++) {
            var off = allOfficials[oi];
            if (off.relations && off.relations.player !== undefined) {
              off.relations.player = Math.max(0, off.relations.player - 1);
            }
          }
        }
      }
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'error', title: '🔥 社会动荡',
        message: activeHighLevel.length + '个群体同时处于高行动状态！国库-' + (activeHighLevel.length * 50) + '万，全体干部忠诚-1，经济活力-' + Math.round(activeHighLevel.length * 2) + '。',
      });
    }
  }

  /** v3：高压社会的一揽子后果——每周根据张力水平触发 */
  _applyTensionConsequences() {
    var county = stateManager.get('county');
    if (!county) return;
    var tension = county.socialTension || 0;
    if (tension < 40) return;

    var finance = stateManager.get('finance');
    var player = stateManager.get('player');

    // 张力>50：国库漏财（维稳追加支出）
    if (tension > 50 && finance && Math.random() < 0.4) {
      var leak = Math.round((tension - 50) * 3);
      finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - leak);
    }

    // 张力>60：企业恐慌——随机一家企业收缩或外迁
    if (tension > 60 && county.economy && county.towns && Math.random() < 0.15) {
      for (var ti = 0; ti < county.towns.length; ti++) {
        var town = county.towns[ti];
        if (town.enterprises && town.enterprises.length > 0) {
          var victims = town.enterprises.filter(function(e) { return e.employeeCount && e.employeeCount > 10; });
          if (victims.length > 0) {
            var victim = victims[Math.floor(Math.random() * victims.length)];
            var shrink = Math.round(victim.employeeCount * 0.3);
            victim.employeeCount = Math.max(5, victim.employeeCount - shrink);
            victim.output = Math.round((victim.output || 100) * 0.75);
            eventBus.emit(EVENTS.UI_NOTIFICATION, {
              type: 'warning', title: '🏭 企业收缩',
              message: victim.name + '因社会动荡裁员' + shrink + '人，产能缩减。',
            });
            break;
          }
        }
      }
    }

    // 张力>70：人口外流
    if (tension > 70 && Math.random() < 0.2) {
      if (county.population) {
        var outflow = Math.round((county.population.total || 200000) * 0.005);
        county.population.total = Math.max(100000, (county.population.total || 200000) - outflow);
        county.population.urban = Math.max(0, (county.population.urban || 0) - Math.round(outflow * 0.6));
        county.population.rural = Math.max(0, (county.population.rural || 0) - Math.round(outflow * 0.4));
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '🚶 人口流失',
          message: '因社会动荡，本月约' + outflow + '人迁出本县。',
        });
      }
    }

    // 张力>80持续4周以上：启动问责调查
    if (tension > 80) {
      this._tensionHighWeeks = (this._tensionHighWeeks || 0) + 1;
      if (this._tensionHighWeeks >= 4 && player) {
        county.superiorTrust.citySecretary = Math.max(0, (county.superiorTrust.citySecretary || 50) - 10);
        player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 15);
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'error', title: '🔴 上级问责',
          message: '社会持续动荡引发上级关注，市委对您的执政能力提出质疑。政治资本-15，上级信任-10。',
        });
        this._tensionHighWeeks = 0; // 防止重复触发
      }
    } else {
      this._tensionHighWeeks = 0;
    }
  }

  /** 根据群体满意度调整相关派系力量 */
  applyGroupSatisfactionToFactions() {
    var factionSys = this.engine ? this.engine.getSystem('factions') : null;
    if (!factionSys) return;
    var groups = this.populationManager.groups;

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var targetFaction = SocialSystem.GROUP_FACTION_MAP[g.type];
      if (!targetFaction || !factionSys.factions[targetFaction]) continue;
      var f = factionSys.factions[targetFaction];

      // 满意度低→派系权势受损（因为群众基础弱了）
      var sat = g.getOverallSatisfaction();
      var powerMod = (sat - 50) * 0.05;
      if (Math.abs(powerMod) > 0.5) {
        f.power = calculator.clamp(f.power + powerMod, 0, 100);
      }
    }
  }

  /** 玩家响应当前行动事件 */
  resolveAction(actionId, optionIndex) {
    for (var i = 0; i < this._pendingActions.length; i++) {
      var action = this._pendingActions[i];
      if (action.id !== actionId) continue;
      if (action.resolved) return { error: 'already_resolved' };

      var option = action.responseOptions[optionIndex];
      if (!option) return { error: 'invalid_option' };

      var player = stateManager.get('player');
      var county = stateManager.get('county');
      var finance = stateManager.get('finance');
      var group = this.populationManager.getGroup(action.groupType);

      // 扣除成本
      if (option.cost.energy && player) player.modifyStatus('energy', -option.cost.energy);
      if (option.cost.politicalCapital && player) {
        player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - option.cost.politicalCapital);
      }
      if (option.cost.treasury && finance) {
        finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - option.cost.treasury);
      }
      if (option.cost.integrity && player) {
        // 确保 player.corruption 存在，修改才能持久化
        if (!player.corruption) player.corruption = { level: 0 };
        player.corruption.level = Math.min(100, player.corruption.level + (option.cost.integrity || 0));
      }

      // 应用效果
      if (option.effects.grievanceRelief && group) {
        group.relieveGrievance(option.effects.grievanceRelief);
      }
      if (option.effects.grievanceRise && group) {
        group.addGrievance(option.effects.grievanceRise);
      }
      if (option.effects.mobilizationRise) {
        group.mobilization = calculator.clamp(group.mobilization + option.effects.mobilizationRise, 0, 100);
      }
      if (option.effects.tension && county) {
        county.modifyTension(option.effects.tension);
      }
      if (option.effects.satisfaction && group) {
        group.modifySatisfaction('basicNeeds', option.effects.satisfaction * 0.5);
        group.modifySatisfaction('development', option.effects.satisfaction * 0.3);
        group.modifySatisfaction('fairness', option.effects.satisfaction * 0.2);
      }
      if (option.effects.economicVitality && county && county.economy) {
        county.economy.economicVitality = calculator.clamp(
          (county.economy.economicVitality || 50) + option.effects.economicVitality, 0, 100);
      }
      if (option.effects.taxIncome && finance) {
        // 下月收入折扣
        finance._incomePenalty = (finance._incomePenalty || 0) + Math.abs(option.effects.taxIncome);
      }
      if (option.effects.superior && county && county.superiorTrust) {
        county.superiorTrust.citySecretary = calculator.clamp(
          (county.superiorTrust.citySecretary || 50) + option.effects.superior, 0, 100);
      }

      // 派系联动：处置结果影响相关派系
      var factionResType = 'dialogue';
      var optLabel = option.label || '';
      if (optLabel.indexOf('安抚') >= 0 || optLabel.indexOf('承诺') >= 0 || (option.cost.treasury && option.cost.treasury > 100)) {
        factionResType = 'appease';
      } else if (optLabel.indexOf('驱散') >= 0 || optLabel.indexOf('处置') >= 0 || optLabel.indexOf('秩序') >= 0 || option.cost.integrity) {
        factionResType = 'suppress';
      } else if (optLabel.indexOf('上级') >= 0 || optLabel.indexOf('支援') >= 0) {
        factionResType = 'superior';
      }
      this._applyFactionEffectsOnAction(action.groupType, action.level, true, factionResType);

      action.resolved = true;

      // 舆论效果
      this.publicOpinion.addTopic(
        '处置' + group.label + action.name,
        option.effects.grievanceRelief ? 10 : -10,
        'player', [action.groupType],
        { baseHeat: 20, decayRate: 0.93, severity: 0.4 }
      );

      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: '行动处置',
        message: group.label + action.name + ' → ' + option.label + '（已处理）',
      });

      this._syncState();
      return { success: true, action: action, option: option };
    }
    return { error: 'not_found' };
  }

  /** 获取所有待处理行动事件 */
  getPendingActions() {
    return this._pendingActions.filter(function(a) { return !a.resolved; });
  }

  /** ===== 月度更新 ===== */

  /** 月度张力更新（保持原有接口兼容） */
  updateTension() {
    var county = stateManager.get('county');
    if (!county) return;

    // 从人口系统获取真实失业率
    var popSys = this.engine ? this.engine.getSystem('population') : null;
    var popData = popSys ? popSys.pop : null;
    var unemploymentRate = popData ? (popData.unemploymentRate || 0.10) : 0.10;

    // 计算张力变化（增强版：考虑群体 grievance + 舆论）
    var baseDelta = calculator.calcSocialTensionDelta({
      unemploymentRate: unemploymentRate,
      inflationRate: Math.random() * 0.02,
      giniChange: (Math.random() - 0.5) * 0.005,
      economicGrowth: county.economy ? county.economy.gdpGrowth || 0.05 : 0.05,
      groupEvents: Math.random() < 0.1 ? 1 : 0,
    });

    // 加入群体 grievance 的影响（v3：系数从0.003提升至0.005）
    var grievancePressure = 0;
    var groups = this.populationManager.groups;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      grievancePressure += (g.grievance - 30) * 0.005 * g.populationWeight;
    }

    // 加入舆论热点的放大
    var negativeTopics = this.publicOpinion.getMostNegativeTopic();
    var opinionPressure = negativeTopics ? negativeTopics.heat * 0.02 : 0;

    var delta = baseDelta + grievancePressure + opinionPressure;
    var newTension = county.modifyTension(delta);

    var sat = this.populationManager.calcTotalSatisfaction();

    stateManager.set('social', {
      tension: newTension,
      groups: this.populationManager.getSummary(),
      satisfaction: sat,
    });

    eventBus.emit(EVENTS.SOCIAL_TENSION, {
      delta: delta, newTension: newTension, satisfaction: sat,
      grievancePressure: Math.round(grievancePressure * 100) / 100,
      opinionPressure: Math.round(opinionPressure * 100) / 100,
    });

    if (newTension > 70) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '社会预警',
        message: '社会张力已达' + Math.round(newTension) + '，存在大规模群体事件风险',
      });
    }
  }

  /** ===== 政策效果分发 ===== */

  /**
   * 将政策效果差异化分发到各群体
   * @param {string} policyDomain - 政策领域: economy/stability/livelihood/party
   * @param {number} intensity - 强度 -1~1（负=伤害，正=受益）
   * @param {object} opts - 可选：{ affectedGroups, avoidGroups }
   * @returns {object} 各群体受影响摘要
   */
  applyPolicyToGroups(policyDomain, intensity, opts) {
    opts = opts || {};
    var results = {};
    var groups = this.populationManager.groups;

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      // 排除特定群体
      if (opts.avoidGroups && opts.avoidGroups.indexOf(g.type) !== -1) continue;
      // 仅影响特定群体（如果指定）
      if (opts.affectedGroups && opts.affectedGroups.indexOf(g.type) === -1) continue;

      var result = g.applyPolicyEffect(policyDomain, intensity);
      results[g.label] = Math.round(result * 10) / 10;
    }

    // 非良性政策效果产生舆论热点
    if (intensity < 0 && Math.abs(intensity) > 0.3) {
      var affectedList = opts.affectedGroups || groups.map(function(g) { return g.type; });
      this.publicOpinion.addTopic(
        '政策影响', intensity * 15, 'player', affectedList,
        { baseHeat: Math.abs(intensity) * 30, decayRate: 0.90, severity: Math.abs(intensity) }
      );
    }

    return results;
  }

  /** ===== 对外接口 ===== */

  /** 获取群体详情 */
  getGroupDetails() { return this.populationManager.groups; }

  /** 修改某个群体的满意度 */
  modifyGroupSatisfaction(type, dim, delta) {
    var group = this.populationManager.getGroup(type);
    if (group) group.modifySatisfaction(dim, delta);
  }

  /** 获取高风险群体 */
  getHighRiskGroups() { return this.populationManager.getHighRiskGroups(); }

  /** 获取群体摘要 */
  getGroupSummary() { return this.populationManager.getSummary(); }

  /** 获取社会网络数据 */
  getSocialNetworkData() {
    return this.socialNetwork.getNetworkData(this.populationManager.groups);
  }

  /** 获取舆论数据 */
  getPublicOpinionData() {
    return {
      topics: this.publicOpinion.getActiveTopics(),
      propagandaPower: this.publicOpinion.propagandaPower,
      rumorRisk: this.publicOpinion.rumorRisk,
      transparency: this.publicOpinion.transparency,
    };
  }

  /** ===== v3：维稳资源分配接口 ===== */

  /**
   * 设置维稳资源分配（由UI调用）
   * @param {object} alloc - { petitionResolve, patrolDeter, conflictInvestigation, opinionMonitoring }
   *    各项值范围0-100，总和不应超过total
   */
  setAllocation(alloc) {
    if (!alloc) return;
    var total = this.stabilityResources.total;
    var used = 0;
    for (var key in this.stabilityResources.allocated) {
      if (alloc[key] !== undefined) {
        this.stabilityResources.allocated[key] = Math.max(0, Math.min(100, alloc[key]));
      }
      used += this.stabilityResources.allocated[key];
    }
    // 如果超出总量，等比例缩减
    if (used > total && total > 0) {
      var ratio = total / used;
      for (var k in this.stabilityResources.allocated) {
        this.stabilityResources.allocated[k] = Math.round(this.stabilityResources.allocated[k] * ratio);
      }
    }
    stateManager.set('stabilityResources', this.stabilityResources);
  }

  /** 获取当前资源分配 */
  getAllocation() {
    return {
      total: this.stabilityResources.total,
      allocated: Object.assign({}, this.stabilityResources.allocated),
      used: Object.values(this.stabilityResources.allocated).reduce(function(a, b) { return a + b; }, 0),
    };
  }

  /** v3：获取信访积案统计数据（连锁反应检测用） */
  getBacklogStats() {
    var byGroup = this.petition.getActiveCasesByGroup();
    var result = [];
    for (var groupType in byGroup) {
      var info = byGroup[groupType];
      if (info.count >= 3 && info.avgProgress < 30) {
        result.push({
          groupType: groupType,
          count: info.count,
          avgProgress: info.avgProgress,
          critical: info.count >= 5,
        });
      }
    }
    return result;
  }

  /** ===== 内部方法 ===== */

  /** 同步到StateManager */
  _syncState() {
    stateManager.set('social', {
      tension: stateManager.get('county') ? (stateManager.get('county').socialTension || 0) : 0,
      groups: this.populationManager.getSummary(),
      satisfaction: this.populationManager.calcTotalSatisfaction(),
      // v3：信访摘要
      petitionPressure: this.petition.getPetitionPressure(),
      pendingCaseCount: this.petition.getActiveCases ? this.petition.getActiveCases().length : 0,
      seasonalModifier: this._seasonalModifiers || null,
    });
    stateManager.set('publicOpinion', this.publicOpinion.toJSON());
    stateManager.set('socialMobilization', {
      activeGroups: this.populationManager.getActiveGroups().map(function(g) { return {
        type: g.type, label: g.label, mobilization: Math.round(g.mobilization),
        grievance: Math.round(g.grievance), actionLevel: g.getActionLevel(),
        actionDesc: g.getActionDescription(),
      };}),
      pendingActions: this._pendingActions.filter(function(a) { return !a.resolved; }),
    });
    // v3：同步维稳资源
    stateManager.set('stabilityResources', this.stabilityResources);
  }

  /** 序列化完整状态（v3：含信访子系统 + 维稳资源） */
  serialize() {
    return {
      groups: this.populationManager.groups.map(function(g) { return g.toJSON(); }),
      opinion: this.publicOpinion.toJSON(),
      pendingActions: this._pendingActions,
      petition: this.petition.toJSON ? this.petition.toJSON() : null,
      stabilityResources: this.stabilityResources,
    };
  }

  /** 从存档恢复（v3：含信访子系统 + 维稳资源） */
  deserialize(data) {
    if (!data) return;
    // 重建群体（不是patch，是完全替换）
    if (data.groups && data.groups.length > 0) {
      this.populationManager.groups = [];
      for (var i = 0; i < data.groups.length; i++) {
        this.populationManager.groups.push(new PopulationGroup(data.groups[i]));
      }
    }
    // 恢复舆论（重建PublicOpinion）
    if (data.opinion) {
      this.publicOpinion = new PublicOpinion();
      if (data.opinion.topics) this.publicOpinion.topics = data.opinion.topics;
      this.publicOpinion.propagandaPower = data.opinion.propagandaPower || 50;
      this.publicOpinion.rumorRisk = data.opinion.rumorRisk || 30;
      this.publicOpinion.transparency = data.opinion.transparency || 40;
    }
    // 恢复待处理行动
    if (data.pendingActions) {
      this._pendingActions = data.pendingActions;
    }
    // v3：恢复信访子系统
    if (data.petition) {
      this.petition.fromJSON(data.petition);
    }
    // v3：恢复维稳资源
    if (data.stabilityResources) {
      this.stabilityResources = data.stabilityResources;
    }
  }
}
