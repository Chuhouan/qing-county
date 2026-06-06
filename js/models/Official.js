/**
 * Official - 干部模型（含常委会成员）
 * 3.1 县委常委会 / 4.3 干部属性卡
 */
class Official {
  constructor(data = {}) {
    this.id = data.id || `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = data.name || '未命名';
    this.title = data.title || '科员';         // 职务
    this.rank = data.rank || '副科';
    this.age = data.age || 35;

    // 派系
    this.faction = data.faction || '中立';

    // 3.1.1 能力值 (0-100)
    this.abilities = {
      politics: data.abilities?.politics ?? 60,       // 政治把控
      economy: data.abilities?.economy ?? 50,          // 经济理解
      personnel: data.abilities?.personnel ?? 50,      // 用人识人
      crisis: data.abilities?.crisis ?? 50,            // 危机处置
      integrity: data.abilities?.integrity ?? 70,      // 廉洁自律
      profession: data.abilities?.profession ?? 55,    // 专业能力
      execution: data.abilities?.execution ?? 60,      // 执行能力
      coordination: data.abilities?.coordination ?? 50,// 协调能力
      innovation: data.abilities?.innovation ?? 40,    // 创新能力
    };

    // 性格特质
    this.traits = data.traits || ['谨慎']; // 谨慎/激进/守成/圆滑/正直/善交际

    // 投票权重（常委会用）
    this.voteWeight = data.voteWeight || 1;

    // 核心诉求权重
    this.demands = data.demands || {
      taskCompletion: 0.4,    // 完成上级任务
      socialStability: 0.3,   // 社会稳定
      fiscalSafety: 0.2,      // 财政风险
      promotion: 0.1,         // 个人晋升
    };

    // 人际关系
    this.relations = {
      player: data.relations?.player ?? 50,       // 与玩家 0-100
      secretary: data.relations?.secretary ?? 50,  // 与书记 0-100
      boss: data.relations?.boss ?? 50,            // 与分管领导
      staffTrust: data.relations?.staffTrust ?? 60, // 局内威信
      publicEval: data.relations?.publicEval ?? 50, // 基层评价
    };

    // 工作状态
    this.workStatus = {
      satisfaction: data.workStatus?.satisfaction ?? 70, // 工作满意度
      health: data.workStatus?.health ?? 80,             // 健康
      performance: data.workStatus?.performance ?? '良好', // 近期表现
      complaints: data.workStatus?.complaints ?? 0,      // 群众投诉
    };

    // 可调整项
    this.adjustable = {
      matchRate: data.adjustable?.matchRate ?? 80,       // 岗位匹配度
      promotionExpect: data.adjustable?.promotionExpect, // 晋升期望
      potentialIssues: data.adjustable?.potentialIssues || [], // 潜在问题
    };

    // 决策倾向配置
    this.voteProfile = data.voteProfile || null; // 有则直接返回票型

    // ====== 新增：组织处分系统 ======
    this._disciplineStatus = data._disciplineStatus || 'normal';
    // 取值: normal(正常) / admonition(诫勉谈话) / criticism(通报批评) / suspension(停职检查) / transfer(岗位调整)

    // ====== 新增：已指派的任务 ======
    this._assignedTasks = data._assignedTasks || [];

    // ====== 新增：履职记录 ======
    this._performanceLog = data._performanceLog || [];

    // ====== 人事权v2：管理层级 ======
    // 'city' = 市管干部（副处级以上，含常委+县长+副县长等）
    // 'county' = 县管干部（正科级及以下，各局局长等）
    this._managementTier = data._managementTier || 'county';

    // 职务类型：'party'（党内职务）/ 'gov'（政府职务，需人大任命）
    this._appointmentType = data._appointmentType || 'party';

    // 任免流程状态
    // null / 'initiated' / 'five_person_group' / 'committee_vote' / 'city_report' / 'npc_appointment' / 'completed'
    this._appointmentStatus = data._appointmentStatus || null;

    // 任免流程步骤（时间线记录）
    this._appointmentLog = data._appointmentLog || [];

    // 五人小组态度（酝酿过程中修改）
    // { secretary: 0~100, magistrate: 0~100, deputy_secretary: 0~100, discipline: 0~100, organization: 0~100 }
    this._fivePersonSupport = data._fivePersonSupport || {};

    // 程序合规记录（用于责任倒查）
    this._proceduralRecord = {
      hasMotion: data._proceduralRecord?.hasMotion || false,       // 是否经过动议
      hasRecommendation: data._proceduralRecord?.hasRecommendation || false, // 是否经过民主推荐
      hasAssessment: data._proceduralRecord?.hasAssessment || false,   // 是否经过考察
      hasFivePersonGroup: data._proceduralRecord?.hasFivePersonGroup || false, // 是否经过五人小组
      hasCommitteeVote: data._proceduralRecord?.hasCommitteeVote || false,  // 是否经过常委会投票
      hasCityReport: data._proceduralRecord?.hasCityReport || false,    // 市管干部是否报市委
      hasNPCRecognition: data._proceduralRecord?.hasNPCRecognition || false, // 政府职务是否经人大任命
      irregularities: data._proceduralRecord?.irregularities || [],     // 程序违规记录
    };

    // ====== 派系关系系统字段 ======
    this._ability = data._ability ?? Math.round(
      ((this.abilities.profession || 0) + (this.abilities.execution || 0) +
       (this.abilities.coordination || 0) + (this.abilities.innovation || 0)) / 4
    );                              // 综合能力 0-100（从子能力自动计算）
    this._ambition = data._ambition ?? 50;          // 野心 0-100
    this._network = data._network ?? 0;             // 关系网规模（人）
    this._friends = data._friends || [];            // 朋友圈（官员ID列表）
    this._background = data._background || [];      // 履历背景标签
    this._domain = data._domain || 'general';       // 分管领域: economy/stability/livelihood/party/general
    this._reportsTo = data._reportsTo || null;      // 直接上级ID
    this._factionId = data._factionId || null;      // 隐藏：山头归属ID（系统自动计算）

    // ====== 派系流动机制字段（v0.XXX 新增） ======
    this._factionAffinities = data._factionAffinities || null;
    // 对各派系的亲和度 0-100，null 表示待初始化
    this._lockedFactions = data._lockedFactions || {};
    // 锁定倒计时: { secretary: 48, ... }，归零自动删除

    // ====== 干部关系深化字段 ======
    this._loyalty = data._loyalty ?? Math.round((this.relations.player || 50) * 0.7 + 15);           // 忠诚度 0-100（从与书记关系换算）
    this._leverage = data._leverage ?? 0;          // 把柄等级 0-100（越高越听你的）
    this._promisedPromotion = data._promisedPromotion || false; // 是否许诺过升迁
    this._promiseDeadline = data._promiseDeadline || null;       // 许诺兑现期限
    this._protected = data._protected || false;    // 容错免责保护状态
    this._factionGroup = data._factionGroup || null; // 利益小圈子ID
    this._bribeLevel = data._bribeLevel ?? 0;      // 利益输送累计值
    this._corruptionRisk = data._corruptionRisk ?? 0; // 被纪委盯上的风险
    this._militaryOrder = data._militaryOrder || null; // 军令状任务
  }

  /** 获取处分状态文本 */
  getDisciplineLabel() {
    var labels = {
      normal: '正常',
      admonition: '诫勉谈话',
      criticism: '通报批评',
      suspension: '停职检查',
      transfer: '岗位调整',
    };
    return labels[this._disciplineStatus] || '正常';
  }

  /** 设置处分状态 */
  setDiscipline(status) {
    if (['normal','admonition','criticism','suspension','transfer'].indexOf(status) === -1) return;
    var oldStatus = this._disciplineStatus;
    // 先获取旧标签
    var labels = { normal:'正常', admonition:'诫勉谈话', criticism:'通报批评', suspension:'停职检查', transfer:'岗位调整' };
    var oldLabel = labels[oldStatus] || '正常';
    this._disciplineStatus = status;
    var newLabel = labels[status] || '正常';
    // 停职/调整期间投票权重归零
    if (status === 'suspension' || status === 'transfer') {
      this._savedVoteWeight = this.voteWeight;
      this.voteWeight = 0;
    } else if (oldStatus === 'suspension' || oldStatus === 'transfer') {
      // 恢复职务
      if (this._savedVoteWeight) this.voteWeight = this._savedVoteWeight;
    }
    // 记录处分日志
    this._addPerformanceLog('处分', '处分状态从' + oldLabel + '变更为' + newLabel);
  }

  /** 添加履职记录 */
  _addPerformanceLog(type, detail) {
    var entry = {
      time: timeSystem ? (timeSystem.year+'-'+timeSystem.month+'-'+timeSystem.week) : '?',
      type: type || '记录',
      detail: detail || '',
    };
    this._performanceLog.push(entry);
    if (this._performanceLog.length > 50) this._performanceLog.shift();
  }

  /** 指派任务到此干部 */
  assignTask(taskId) {
    if (!taskId) return;
    if (this._assignedTasks.indexOf(taskId) === -1) {
      this._assignedTasks.push(taskId);
    }
  }

  /** 完成任务（从指派列表移除） */
  completeTask(taskId) {
    var idx = this._assignedTasks.indexOf(taskId);
    if (idx !== -1) {
      this._assignedTasks.splice(idx, 1);
      this._addPerformanceLog('任务完成', '完成任务：' + taskId);
      return true;
    }
    return false;
  }

  /** 获取能力值 */
  getAbility(name) {
    return this.abilities[name] ?? 0;
  }

  /** 判断性格特征 */
  hasTrait(trait) {
    return this.traits.includes(trait);
  }

  /** 性格对决策的影响系数 */
  getRiskModifier() {
    if (this.hasTrait('激进')) return -0.2;
    if (this.hasTrait('谨慎')) return 0.3;
    if (this.hasTrait('守成')) return 0.2;
    if (this.hasTrait('务实')) return -0.1;
    if (this.hasTrait('稳健')) return 0.15;
    return 0;
  }

  /**
   * 计算对议题的投票倾向
   * 不同委员因诉求权重(demands)不同而产生差异化投票
   */
  calcVote(issueFactors = {}) {
    if (this.voteProfile) return this.voteProfile;

    // 投票前游说锁定票型
    if (this._lobbyVote) return this._lobbyVote;

    // 停职/岗位调整期间禁止投票
    if (this._disciplineStatus === 'suspension' || this._disciplineStatus === 'transfer') return 'abstain';

    const d = this.demands || {};
    let supportScore = 0;
    let totalWeight = 0.01;

    // 经济收益 — 诉求 economicGrowth 越高越看重
    if (issueFactors.economicBenefit !== undefined) {
      const demMod = 1 + (d.economicGrowth || 0) * 2; // 1.0~1.6
      const abilMod = this.abilities.economy / 100;
      supportScore += issueFactors.economicBenefit * abilMod * demMod;
      totalWeight += 1;
    }

    // 环保/廉政风险 — 诉求 antiCorruption/discipline 越高越在意
    if (issueFactors.environmentalRisk !== undefined) {
      const demMod = 1 + ((d.antiCorruption || 0) + (d.discipline || 0)) * 1.2;
      const traitW = this.hasTrait('正直') ? 1.5 : 1;
      supportScore -= issueFactors.environmentalRisk * traitW * demMod;
      totalWeight += 1;
    }

    // 上级态度 — 派系不同权重不同
    if (issueFactors.superiorSupport !== undefined) {
      var factionMod = 1.1;
      if (this._factionId === 'secretary') factionMod = 1.4;
      else if (this._factionId === 'appointed') factionMod = 1.3;
      supportScore += issueFactors.superiorSupport * factionMod;
      totalWeight += factionMod;
    }

    // 财政贡献 — 诉求 fiscalSafety 越高越看重
    if (issueFactors.fiscalContribution !== undefined) {
      const demMod = 1 + (d.fiscalSafety || 0) * 2;
      const abilMod = this.abilities.economy / 100;
      supportScore += issueFactors.fiscalContribution * abilMod * demMod;
      totalWeight += 1;
    }

    // 群众反对 — 诉求 stability/socialStability 越高越在意
    if (issueFactors.publicOpposition !== undefined) {
      const demMod = 1 + ((d.stability || 0) + (d.socialStability || 0)) * 1.5;
      supportScore -= issueFactors.publicOpposition * demMod;
      totalWeight += 1;
    }

    // 历史事故 — 重大否决因素
    if (issueFactors.pastAccidents) {
      supportScore -= 30;
      totalWeight += 0.5;
    }

    // 派系权力影响 — 权力大的山头更有底气反对书记的意见
    try {
      var factionSys = typeof gameEngine !== 'undefined' ? gameEngine.getSystem('factions') : null;
      if (factionSys && this._factionId) {
        var allFactions = factionSys.getAllFactions();
        if (allFactions && allFactions[this._factionId]) {
          var fPower = allFactions[this._factionId].power || 50;
          // 权力每高于基准10点，书记意见对投票的加成减少1%
          var powerInfluence = (fPower - 50) * 0.02;
          supportScore -= powerInfluence * 3;
        }
      }
    } catch (_) {}

    // 性格修正（保守者更反对风险，激进者更支持）
    supportScore *= (1 + this.getRiskModifier());

    // 与书记关系修正（书记系更忠诚）
    const secRelW = this._factionId === 'secretary' ? 0.6 : 0.4;
    supportScore += (this.relations.secretary - 50) * secRelW;

    // 与玩家关系修正
    supportScore += (this.relations.player - 50) * 0.3;

    // 互动效果修正（拉拢/打压/忠诚等）
    const finalScore = totalWeight > 0.01 ? supportScore / totalWeight : 0;

    // 忠诚成员：只要不是极度反对就支持
    if (this._loyal && finalScore > -1) return 'support';

    // 拉拢效果：支持分提升
    const boosted = finalScore + (this._voteBoost || 0) * 5;

    // 打压效果：反对倾向减弱  
    const suppressed = boosted + (this._voteSuppress || 0) * 3;

    // 弃权几率
    if (this._abstainChance && Math.random() < this._abstainChance) return 'abstain';

    // 阈值: >3 支持, <-3 反对, 其余弃权
    if (suppressed > 3) return 'support';
    if (suppressed < -3) return 'oppose';
    return 'abstain';
  }

  /** 根据信息更新关系 */
  modifyRelation(target, delta) {
    const rangeMap = { player: 100, secretary: 100, boss: 100, staffTrust: 100, publicEval: 100 };
    const range = rangeMap[target] || 100;
    if (this.relations[target] !== undefined) {
      this.relations[target] = calculator.clamp(this.relations[target] + delta, 0, range);
    }
  }

  /** 获得某个维度的培养加成 */
  train(abilityName, amount) {
    if (this.abilities[abilityName] !== undefined) {
      this.abilities[abilityName] = calculator.clamp(
        this.abilities[abilityName] + amount, 0, 100
      );
    }
  }

  /** 转为纯对象 */
  toJSON() {
    return {
      id: this.id, name: this.name, title: this.title, rank: this.rank,
      age: this.age, faction: this.faction,
      abilities: this.abilities, traits: this.traits,
      voteWeight: this.voteWeight, demands: this.demands,
      relations: this.relations, workStatus: this.workStatus,
      _disciplineStatus: this._disciplineStatus,
      _assignedTasks: this._assignedTasks,
      _performanceLog: this._performanceLog,
      // 派系关系系统字段
      _ability: this._ability,
      _ambition: this._ambition,
      _network: this._network,
      _friends: this._friends,
      _background: this._background,
      _domain: this._domain,
      _reportsTo: this._reportsTo,
      _factionId: this._factionId,
      _factionAffinities: this._factionAffinities,
      _lockedFactions: this._lockedFactions,
    };
  }
}
