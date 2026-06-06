/**
 * Player - 玩家（县委书记）模型
 * 县委书记的核心能力：政治把控、干部管理、宏观决策
 * 与县长的区别：书记管人、县长管事；书记拥有常委会主导权、一票否决权
 */
class Player {
  constructor(data = {}) {
    this.name = data.name || '玩家';
    this.role = '县委书记';
    this.age = data.age || 45;
    this.gender = data.gender || '男';
    this.education = data.education || '省委党校研究生';
    this.politicalStanding = data.politicalStanding || '党员（25年党龄）';

    // 能力维度 (0-100) — 书记版
    // 书记不直接管经济，管的是"人"和"方向"
    this.abilities = {
      politics: data.abilities?.politics || 65,          // 政治把控：把握方向、贯彻上级精神
      cadreMgmt: data.abilities?.cadreMgmt || 55,        // 干部管理：用人识人、人事调配
      economy: data.abilities?.economy || 50,             // 经济决策：宏观判断（靠县长执行）
      stability: data.abilities?.stability || 60,         // 稳定维护：信访维稳、安全生产
      partyBuilding: data.abilities?.partyBuilding || 55, // 党的建设：党建考核、意识形态
      integrity: data.abilities?.integrity || 70,         // 廉洁自律
    };

    // 关系网络（书记版）
    this.relations = {
      citySecretary: data.relations?.citySecretary || 0,   // 市委书记 -50~+50（最重要）
      cityMayor: data.relations?.cityMayor || 0,            // 市长 -30~+30
      countyMagistrate: data.relations?.countyMagistrate || 0, // 县长（搭班子，-50~+50）
      committeeMembers: data.relations?.committeeMembers || {}, // 各常委 -50~+50
      provincialDepts: data.relations?.provincialDepts || {},   // 省委组织部/纪委
      veterans: data.relations?.veterans || 0,                  // 老干部 -20~+20
      media: data.relations?.media || 0,                        // 媒体 -20~+20
    };

    // 个人状态
    this.status = {
      health: data.status?.health ?? 100,
      energy: data.status?.energy ?? 100,
      stress: data.status?.stress ?? 20,
    };

    // 知识储备（书记版）
    this.knowledge = {
      policy: data.knowledge?.policy || 50,        // 政策理论
      cadreWork: data.knowledge?.cadreWork || 40,  // 干部工作
      economy: data.knowledge?.economy || 35,       // 经济知识
      law: data.knowledge?.law || 40,               // 法律知识
    };

    // 政绩评价（书记版权重）
    this.performance = {
      economy: data.performance?.economy || 0,         // 经济发展权重25%
      stability: data.performance?.stability || 0,     // 社会稳定权重20%
      livelihood: data.performance?.livelihood || 0,   // 民生改善权重15%
      partyBuilding: data.performance?.partyBuilding || 0, // 党的建设权重20%
      innovation: data.performance?.innovation || 0,   // 改革创新权重10%
      integrity: data.performance?.integrity || 0,     // 廉洁自律权重10%
    };

    // 特殊资源
    this.traits = data.traits || [];                     // 性格特质（开局选2个）
    this.politicalCapital = data.politicalCapital ?? 100;
    this.reputation = {
      toPublic: data.reputation?.toPublic || 50,
      toOfficials: data.reputation?.toOfficials || 50,
      toSuperiors: data.reputation?.toSuperiors || 50,
    };
    this.favorAccount = data.favorAccount || [];

    // 腐败追踪
    this.corruption = {
      level: data.corruption?.level ?? 0,
      totalBribes: data.corruption?.totalBribes ?? 0,
      favorsGiven: data.corruption?.favorsGiven ?? 0,
      investigationRisk: data.corruption?.investigationRisk ?? 0,
      auditCount: data.corruption?.auditCount ?? 0,
      protectiveUmbrella: data.corruption?.protectiveUmbrella ?? 0,
      records: data.corruption?.records || [],
      whistleblower: data.corruption?.whistleblower ?? false,
    };
  }

  getAbility(name) { return this.abilities[name] || 0; }

  modifyRelation(target, delta) {
    const rangeMap = {
      citySecretary: 50, cityMayor: 30,
      countyMagistrate: 50, veterans: 20, media: 20,
    };
    if (typeof target === 'string' && this.relations[target] !== undefined) {
      const range = rangeMap[target] || 20;
      this.relations[target] = calculator.clamp(this.relations[target] + delta, -range, range);
    } else if (typeof target === 'object' && target.type === 'committee') {
      const key = target.id;
      if (!this.relations.committeeMembers[key]) this.relations.committeeMembers[key] = 0;
      this.relations.committeeMembers[key] = calculator.clamp(
        this.relations.committeeMembers[key] + delta, -50, 50
      );
    }
  }

  modifyStatus(name, delta) {
    const old = this.status[name];
    if (this.status[name] !== undefined) {
      this.status[name] = calculator.clamp(this.status[name] + delta, 0, 100);
      eventBus.emit(EVENTS.PLAYER_STAT_CHANGE, {
        type: 'status', name, oldValue: old, newValue: this.status[name]
      });
    }
  }

  modifyKnowledge(name, delta) {
    if (this.knowledge[name] !== undefined) {
      this.knowledge[name] = calculator.clamp(this.knowledge[name] + delta, 0, 100);
    }
  }

  consumeEnergy(amount) {
    this.modifyStatus('energy', -amount);
    return this.status.energy > 0;
  }

  /** 书记版总政绩 */
  getTotalPerformance() {
    const weights = {
      economy: 0.25, stability: 0.20, livelihood: 0.15,
      partyBuilding: 0.20, innovation: 0.10, integrity: 0.10,
    };
    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      total += (this.performance[key] || 0) * weight;
    }
    return total;
  }

  getPerformanceRank() {
    const score = this.getTotalPerformance();
    if (score >= 85) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 55) return '合格';
    return '不合格';
  }

  // 腐败相关方法
  addCorruptionRecord(type, amount, target) {
    this.corruption.level = calculator.clamp(this.corruption.level + 2, 0, 100);
    this.corruption.totalBribes += amount || 0;
    this.corruption.favorsGiven++;
    this.corruption.records.push({
      type, amount: amount || 0, target: target || '未知',
      month: timeSystem?.month, year: timeSystem?.year,
      timestamp: Date.now(),
    });
    if (this.corruption.records.length > 5) this.corruption.records.shift();
    this.corruption.investigationRisk = calculator.clamp(
      this.corruption.investigationRisk + 3 + (amount || 0) / 100, 0, 100
    );
  }

  executeCorruptAction(action) {
    const { type, benefit, cost, riskIncrease } = action;
    if (benefit.energy) this.modifyStatus('energy', -benefit.energy);
    if (benefit.money) {
      const fin = stateManager.get('finance');
      if (fin && fin.canApprove(benefit.money)) fin.spend(benefit.money);
    }
    if (benefit.relation) {
      for (const [k, v] of Object.entries(benefit.relation)) {
        this.modifyRelation(k, v);
      }
    }
    if (benefit.politicalCapital) this.politicalCapital += benefit.politicalCapital;
    // benefit.performance（旧政绩系统）已移除
    this.addCorruptionRecord(type, cost?.bribe || 0, cost?.target);
    const riskBoost = riskIncrease || 5;
    this.corruption.investigationRisk = calculator.clamp(
      this.corruption.investigationRisk + riskBoost, 0, 100
    );
    if (this.corruption.protectiveUmbrella > 0) {
      const offset = this.corruption.protectiveUmbrella * 0.3;
      this.corruption.investigationRisk = calculator.clamp(
        this.corruption.investigationRisk - offset, 0, 100
      );
    }
    this.reputation.toPublic = calculator.clamp(this.reputation.toPublic - 2, 0, 100);
    this.reputation.toOfficials = calculator.clamp(this.reputation.toOfficials - 1, 0, 100);
    return { benefit, risk: riskBoost };
  }

  toJSON() {
    return {
      name: this.name, role: this.role, age: this.age,
      abilities: this.abilities,
      relations: this.relations,
      status: this.status,
      knowledge: this.knowledge,
      performance: this.performance,
      traits: this.traits,
      politicalCapital: this.politicalCapital,
      reputation: this.reputation,
      corruption: this.corruption,
    };
  }
}
