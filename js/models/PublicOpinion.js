/**
 * PublicOpinion — 公共舆论模型
 * ================================
 * 独立于群体情绪运行的舆论场，管理：
 *   - 舆论热点（Hot Topics）：新闻/事件/政策引发的舆论焦点
 *   - 生命周期：热度上升 → 维持 → 衰减
 *   - 信息操作：宣传/压制/谣言风险
 *   - 与 SocialGroup 联动：热点影响群体 grievance
 */
class PublicOpinion {
  constructor() {
    /** 活跃热点列表 */
    this.topics = [];
    /** 内部计数器 */
    this._nextId = 1;

    /** 宣传效率 0-100（受宣传部长能力、宣传投入影响） */
    this.propagandaPower = 50;
    /** 谣言风险 0-100（信息不透明程度，越高越容易滋生谣言） */
    this.rumorRisk = 30;
    /** 信息透明度 0-100（信息公开程度，降低谣言风险） */
    this.transparency = 40;
  }

  /** ===== 热点管理 ===== */

  /**
   * 添加/触发一个舆论热点
   * @param {string} title - 热点标题
   * @param {number} valence - 情绪倾向 -50~+50（负=负面，正=正面）
   * @param {string} target - 针对对象（'player'/'gov'/'enterprise'/etc）
   * @param {string[]} affectedGroups - 受影响的群体类型列表
   * @param {object} opts - 可选：{ baseHeat, decayRate, severity }
   * @returns {number} 热点id
   */
  addTopic(title, valence, target, affectedGroups, opts) {
    opts = opts || {};
    var topic = {
      id: this._nextId++,
      title: title,
      valence: calculator.clamp(valence, -50, 50),
      target: target || 'general',
      heat: opts.baseHeat || 50,        // 热度 0-100
      maxHeat: opts.baseHeat || 50,      // 记录峰值热度
      decayRate: opts.decayRate || 0.90, // 每周衰减率
      severity: opts.severity || 0.5,    // 事件严重度 0-1
      createdAt: timeSystem ? (timeSystem.year + '-' + timeSystem.month + '-' + timeSystem.week) : 'now',
      lastUpdated: Date.now(),
      affectedGroups: affectedGroups || [],
      // 舆论操作标记
      suppressed: false,      // 是否被压制
      amplified: false,       // 是否被放大
      suppressWeeks: 0,       // 已压制周数
    };

    this.topics.push(topic);
    // 最多保留20个热点
    if (this.topics.length > 20) {
      this.topics.sort(function(a, b) { return b.heat - a.heat; });
      this.topics = this.topics.slice(0, 20);
    }

    return topic.id;
  }

  /** 获取活跃热点（热度 > 5） */
  getActiveTopics() {
    return this.topics.filter(function(t) { return t.heat > 5; });
  }

  /** 按热度排序的热点 */
  getHotTopics(limit) {
    limit = limit || 5;
    return this.topics.slice().sort(function(a, b) { return b.heat - a.heat; }).slice(0, limit);
  }

  /** 获取最高负面热度的热点 */
  getMostNegativeTopic() {
    var worst = null;
    var worstHeat = 0;
    for (var i = 0; i < this.topics.length; i++) {
      var t = this.topics[i];
      if (t.valence < 0 && t.heat > worstHeat) {
        worst = t;
        worstHeat = t.heat;
      }
    }
    return worst;
  }

  /** ===== 每周更新 ===== */

  /**
   * 每周舆论更新
   * @param {number} socialTension - 当前社会张力（影响谣言滋生）
   * @returns {object} 周报摘要
   */
  weeklyUpdate(socialTension) {
    var report = { newRumors: 0, suppressedRecovered: 0 };

    for (var i = this.topics.length - 1; i >= 0; i--) {
      var t = this.topics[i];

      // 热度衰减
      var decay = t.decayRate;
      if (t.suppressed) {
        decay *= 0.7; // 压制状态下衰减更快（叠加在原有衰减上）
        t.suppressWeeks++;
        // 压制超过4周开始有反弹风险
        if (t.suppressWeeks > 4 && Math.random() < 0.1) {
          t.suppressed = false;
          t.heat = Math.min(100, t.heat + 10); // 压制反弹
          report.suppressedRecovered++;
        }
      }
      if (t.amplified) {
        decay *= 1.1; // 放大状态下衰减更慢
      }

      t.heat = Math.max(0, t.heat * decay);
      t.heat = calculator.clamp(t.heat, 0, 100);
    }

    // 移除完全冷却的热点
    this.topics = this.topics.filter(function(t) { return t.heat > 0.5; });

    // 谣言滋生：信息透明度低 + 张力高 = 新谣言
    var rumorChance = (100 - this.transparency) / 200 * (socialTension / 50);
    if (Math.random() < rumorChance) {
      var rumorTopics = ['传言政府要加税', '某领导被调查', '工厂要裁员', 
        '征地补偿风波', '社保要改革', '学校要撤并'];
      var rumor = rumorTopics[Math.floor(Math.random() * rumorTopics.length)];
      var rumorSeverity = Math.random() * 0.5 + 0.3;
      this.addTopic('[传闻]' + rumor, -15 - Math.random() * 20, 'gov',
        ['farmer', 'worker', 'laidoff', 'migrant'],
        { baseHeat: 20 + Math.random() * 20, decayRate: 0.88, severity: rumorSeverity }
      );
      report.newRumors++;
    }

    return report;
  }

  /** ===== 信息操作 ===== */

  /**
   * 进行宣传/舆论引导
   * @param {number} intensity - 投入强度 0-100
   * @param {string} topicId - 可选，针对特定话题
   * @returns {object} 操作结果
   */
  applyPropaganda(intensity, topicId) {
    var effect = {
      heatReduced: 0,
      positivityAdded: 0,
      topicAffected: null,
    };

    // 提升宣传功率（长期效果）
    this.propagandaPower = calculator.clamp(this.propagandaPower + intensity * 0.05, 0, 100);

    // 如果有目标话题，压制/稀释负面热点
    if (topicId) {
      var topic = null;
      for (var i = 0; i < this.topics.length; i++) {
        if (this.topics[i].id === topicId) {
          topic = this.topics[i];
          break;
        }
      }
      if (topic && topic.valence < 0) {
        var reduction = intensity * 0.3 * (this.propagandaPower / 100);
        topic.heat = Math.max(0, topic.heat - reduction);
        effect.heatReduced = Math.round(reduction);
        effect.topicAffected = topic.title;

        // 如果大幅压制，标记为压制状态
        if (reduction > 15) {
          topic.suppressed = true;
        }
      }
    } else {
      // 无目标：普遍性正面宣传（创造正面热点）
      var posHeat = intensity * 0.2;
      this.addTopic('政府工作宣传', 15 + intensity * 0.2, 'player',
        ['farmer', 'worker', 'townsfolk', 'retired'],
        { baseHeat: posHeat, decayRate: 0.92, severity: 0.3 }
      );
      effect.positivityAdded = Math.round(posHeat);
    }

    return effect;
  }

  /**
   * 控制信息（压制报道/限流）
   * @param {number} intensity - 控制力度 0-100
   * @returns {object} 操作结果，含透明度下降和谣言风险上升
   */
  suppressInfo(intensity) {
    // 压制降低透明度，增加谣言风险
    var transDrop = intensity * 0.15;
    this.transparency = Math.max(5, this.transparency - transDrop);
    this.rumorRisk = Math.min(100, this.rumorRisk + intensity * 0.1);

    // 对所有负面热点施加减速
    var suppressedCount = 0;
    for (var i = 0; i < this.topics.length; i++) {
      var t = this.topics[i];
      if (t.valence < 0 && !t.suppressed) {
        t.suppressed = true;
        suppressedCount++;
      }
    }

    return { transparencyDrop: Math.round(transDrop), rumorRiskRise: Math.round(intensity * 0.1), suppressedCount: suppressedCount };
  }

  /** ===== 与SocialGroup联动 ===== */

  /**
   * 计算舆论对群体 grievance 的影响
   * @param {SocialGroup} group - 群体实例
   * @returns {number} 怨气变化量（正=增加）
   */
  calcOpinionImpactOnGroup(group) {
    var totalImpact = 0;
    var activeTopics = this.getActiveTopics();

    for (var i = 0; i < activeTopics.length; i++) {
      var t = activeTopics[i];
      // 检查话题是否影响此群体
      if (t.affectedGroups.length > 0 && t.affectedGroups.indexOf(group.type) === -1) continue;

      // 影响力 = 热度 × 情绪倾向(归一化) × 严重度
      var heatFactor = t.heat / 100;
      var valenceFactor = t.valence / 50; // -1~1
      var severityFactor = t.severity || 0.5;

      // 负面热点增加怨气，正面减少
      if (valenceFactor < 0) {
        totalImpact += heatFactor * Math.abs(valenceFactor) * severityFactor * 2;
      } else {
        totalImpact -= heatFactor * valenceFactor * severityFactor * 1.5;
      }
    }

    return calculator.clamp(totalImpact, -10, 10);
  }

  /** ===== 序列化 ===== */
  toJSON() {
    return {
      topics: this.topics,
      propagandaPower: this.propagandaPower,
      rumorRisk: this.rumorRisk,
      transparency: this.transparency,
    };
  }
}
