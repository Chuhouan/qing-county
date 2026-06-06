/**
 * PetitionSystem — 信访维稳系统
 *
 * 描述：信访案件生成、化解、越级、一票否决全流程模拟。
 * 与 SocialSystem 的分工：SocialSystem=宏观群体情绪，PetitionSystem=微观个案化解。
 *
 * 设计文档：DESIGN_PHASE1_DETAILED.md 第二篇
 * 数据模型：PetitionCase / createDefaultPetitionState (js/models/PetitionCase.js)
 */

class PetitionSystem {
  constructor() {
    this.engine = null;
    this._initialized = false;
  }

  init(config) {
    const existing = stateManager.get('petition');
    if (!existing || Object.keys(existing).length === 0) {
      stateManager.register('petition', createDefaultPetitionState());
    }
    this._initialized = true;
    console.log('[Petition] 信访维稳系统初始化完成');
  }

  // ════════════════════════════════════════════
  //  每周更新（由 GameEngine._weeklyUpdate 调用）
  // ════════════════════════════════════════════

  weeklyUpdate() {
    const state = stateManager.get('petition');
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    if (!state || !county) return;

    // 0. 敏感期检测
    this._updateSensitivePeriod(state);

    // 1. 生成新案件
    this._generateNewCases(state, county);

    // 2. 案件老化
    this._ageCases(state, county);

    // 3. 越级风险判定
    this._checkEscalation(state, county, player);

    // 4. 化解进度推进
    this._advanceResolve(state);

    // 5. 信访压力计算
    this._calcPressure(state);

    // 6. 一票否决检测
    this._checkOneVoteVeto(state, county, player);
  }

  /** 月度更新 */
  monthlyUpdate(year, month) {
    const state = stateManager.get('petition');
    if (!state) return;

    // 统计月度化解率
    const resolved = state.stats.monthlyResolved || 0;
    const incoming = state.stats.monthlyIncoming || 0;
    state.stats.resolvedRate = incoming > 0 ? Math.round(resolved / incoming * 100) : 0;

    // 发送月度信访简报
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 信访月报',
      message: `本月新收${incoming}件，化解${resolved}件，化解率${state.stats.resolvedRate}%，越级率${state.stats.crossLevelRate}%。`
    });

    // 重置月度统计
    state.stats.monthlyIncoming = 0;
    state.stats.monthlyResolved = 0;
  }

  // ════════════════════════════════════════════
  //  案件生成
  // ════════════════════════════════════════════

  _generateNewCases(state, county) {
    const tension = county.socialTension || 0;
    // 基础生成概率：张力50时约每周25%概率生成1件
    let chance = Math.min(0.6, tension * 0.005);
    // 敏感期加成
    if (state.sensitivePeriod.active) chance *= state.sensitivePeriod.multiplier;

    // v3：群体怨气高推高案件生成概率
    const tempParams = stateManager.get('petitionTempParams');
    if (tempParams && tempParams.avgGrievance > 0) {
      chance = chance * (1 + Math.min(1.0, tempParams.avgGrievance / 100));
    }
    // v3：矛盾排查降低生成概率
    const res = stateManager.get('stabilityResources');
    if (res && res.allocated && res.allocated.conflictInvestigation > 0) {
      chance = chance * Math.max(0.5, 1 - res.allocated.conflictInvestigation / 200);
    }

    // 判定是否生成新案
    let count = Math.random() < chance ? 1 : 0;
    // v3：群体怨气高时多案概率上升
    var multiChance = 0.03;
    if (tempParams && tempParams.highGrievanceCount >= 3) multiChance = 0.08;
    if (count > 0 && Math.random() < multiChance) count = 2;
    // 极端情况下可能3件
    if (count > 0 && tempParams && tempParams.highGrievanceCount >= 5 && Math.random() < 0.02) count = 3;

    if (count === 0) return;

    // 上级督办件概率（群体怨气高时上升）
    let supervisorChance = 0.15;
    if (tempParams && tempParams.mobilizationPeak > 60) supervisorChance = 0.25;

    // v3：季节性分类权重调整
    var seasonCatBoost = null;
    if (tempParams && tempParams.seasonalModifiers) {
      var sm = tempParams.seasonalModifiers;
      if (sm.type === 'school_season') seasonCatBoost = 'education';
      else if (sm.type === 'year_end') seasonCatBoost = 'labor';
    }

    for (let i = 0; i < count; i++) {
      // v3：季节性分类偏向
      const category = seasonCatBoost && Math.random() < 0.5 ? seasonCatBoost : this._weightedCategory();
      const difficulty = this._calcDifficulty(category, tension, 0);
      const isSupervision = Math.random() < supervisorChance;

      // v3：集体访概率受群体动员度影响
      var collectiveChance = 0.15;
      if (tempParams && tempParams.mobilizationPeak > 50) collectiveChance = 0.30;

      // v3：群体优先匹配——高怨气群体优先
      var targetGroup = 'farmer';
      if (tempParams && tempParams.topGrievanceTypes && tempParams.topGrievanceTypes.length > 0) {
        targetGroup = tempParams.topGrievanceTypes[0];
        // 有一定概率匹配到第二高怨气群体
        if (tempParams.topGrievanceTypes.length > 1 && Math.random() < 0.3) {
          targetGroup = tempParams.topGrievanceTypes[1];
        }
      } else {
        targetGroup = this._getGrievanceGroup();
      }

      const caseData = {
        type: Math.random() < collectiveChance ? 'collective' : 'individual',
        category: category,
        demand: this._generateDemand(category),
        description: this._generateDesc(category),
        difficulty: difficulty,
        legalMerit: 30 + Math.floor(Math.random() * 50),
        urgency: 20 + Math.floor(Math.random() * 60),
        isSupervision: isSupervision,
        importance: isSupervision ? 3 : (difficulty > 65 ? 2 : 1),
        // 联动 SocialSystem：群体怨气高→案件集体访概率上升
        petitioner: {
          group: targetGroup,
          name: this._randomName(),
        },
        // v3：群体满意度低→固执度上升
        stubborness: 30,
        trustInGov: 40,
      };

      // v3：追加固执度修正（来自群体满意度）
      var socialState = stateManager.get('social');
      if (socialState && socialState.groups) {
        var groupInfo = socialState.groups.find(function(g) { return g.id === targetGroup || g.type === targetGroup; });
        if (groupInfo && groupInfo.satisfaction !== undefined && groupInfo.satisfaction < 40) {
          caseData.stubborness += 15;
          caseData.trustInGov = Math.max(10, caseData.trustInGov - 10);
        }
      }

      const petitionCase = new PetitionCase(caseData);
      state.cases.push(petitionCase);
      state.totalCaseCount++;
      state.stats.monthlyIncoming = (state.stats.monthlyIncoming || 0) + 1;
    }
  }

  /** 按权重随机选择分类 */
  _weightedCategory() {
    const entries = Object.entries(PETITION_CATEGORIES);
    const totalWeight = entries.reduce((s, [, v]) => s + v.baseWeight, 0);
    let r = Math.random() * totalWeight;
    for (const [key, val] of entries) {
      r -= val.baseWeight;
      if (r <= 0) return key;
    }
    return 'other';
  }

  /** 计算案件难度 */
  _calcDifficulty(category, tension, repeatYears) {
    const base = PETITION_CATEGORIES[category]?.baseDifficulty || 30;
    const tensionFactor = (tension - 50) * 0.2;
    const repeatFactor = repeatYears * 5;
    const randomFactor = (Math.random() - 0.5) * 20;
    return Math.max(10, Math.min(95, Math.round(base + tensionFactor + repeatFactor + randomFactor)));
  }

  /** 生成诉求描述 */
  _generateDemand(category) {
    const demands = {
      landDispute: '征地补偿款未到位',
      compensation: '拆迁安置补偿不合理',
      environmental: '企业排污影响生活',
      labor: '拖欠工资/社保未缴纳',
      corruption: '举报村干部贪占集体资产',
      legal: '法院判决执行难',
      education: '子女入学难/学区划分不合理',
      other: '反映民生问题'
    };
    return demands[category] || '其他诉求';
  }

  /** 生成详情描述 */
  _generateDesc(category) {
    const descs = {
      landDispute: '反映征地补偿款拖欠11个月，多次催要无果，群众情绪激动。',
      compensation: '安置房质量存在问题，补偿标准与周边县市差距较大。',
      environmental: '附近化工厂夜间排放刺鼻气体，村民多次投诉未得到有效处理。',
      labor: '所在企业连续数月拖欠工资，社保也未按时缴纳，职工生活困难。',
      corruption: '怀疑村支书在集体资产处置中存在暗箱操作，要求上级彻查。',
      legal: '案件胜诉后执行庭迟迟未采取强制措施，申请人多次催促无果。',
      education: '适龄儿童被划分到距离较远的学校，要求就近入学。',
      other: '反映生产生活中遇到的实际困难，请求政府帮助解决。'
    };
    return descs[category] || '反映问题，请求政府帮助解决。';
  }

  // ════════════════════════════════════════════
  //  敏感期检测
  // ════════════════════════════════════════════

  _updateSensitivePeriod(state) {
    if (!timeSystem) return;
    const month = timeSystem.month || 1;
    const week = Math.ceil((timeSystem.day || 1) / 7);

    // 全国两会：3月上旬
    if (month === 3 && week <= 3) {
      if (!state.sensitivePeriod.active || state.sensitivePeriod.type !== 'twoSessions') {
        state.sensitivePeriod.active = true;
        state.sensitivePeriod.type = 'twoSessions';
        state.sensitivePeriod.name = '全国两会';
        state.sensitivePeriod.multiplier = 1.5;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '⚠️ 敏感期预警',
          message: '全国两会召开在即，信访工作进入敏感期。请做好稳控工作，防止进京访。'
        });
      }
    }
    // 国庆：10月前两周
    else if (month === 10 && week <= 2) {
      if (!state.sensitivePeriod.active || state.sensitivePeriod.type !== 'nationalDay') {
        state.sensitivePeriod.active = true;
        state.sensitivePeriod.type = 'nationalDay';
        state.sensitivePeriod.name = '国庆';
        state.sensitivePeriod.multiplier = 1.5;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '⚠️ 敏感期预警',
          message: '国庆节临近，信访敏感期启动。进京访风险上升。'
        });
      }
    }
    // 非敏感期
    else {
      if (state.sensitivePeriod.active) {
        state.sensitivePeriod.active = false;
        state.sensitivePeriod.type = null;
        state.sensitivePeriod.name = '';
        state.sensitivePeriod.multiplier = 1.0;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'info', title: '✅ 敏感期结束',
          message: '信访敏感期已结束，恢复正常工作节奏。'
        });
      }
    }
  }

  // ════════════════════════════════════════════
  //  案件老化
  // ════════════════════════════════════════════

  _ageCases(state, county) {
    state.cases.forEach(c => {
      if (c.status === 'resolved' || c.status === 'archived') return;
      c.weeksOnFile++;

      // 长期无行动增加越级风险
      if (c.lastActionWeek === null) {
        c.escalationRisk = Math.min(100, c.escalationRisk + 5);
      } else {
        const weeksIdle = (c.weeksOnFile - (c.lastActionWeek || 0));
        if (weeksIdle > 2) c.escalationRisk = Math.min(100, c.escalationRisk + 5);
        if (weeksIdle > 4) c.escalationRisk = Math.min(100, c.escalationRisk + 10);
      }

      // 老户加成
      if (c.petitioner.isRepeat) {
        c.escalationRisk = Math.min(100, c.escalationRisk + 3);
      }
    });
  }

  // ════════════════════════════════════════════
  //  越级判定
  // ════════════════════════════════════════════

  _checkEscalation(state, county, player) {
    for (let i = state.cases.length - 1; i >= 0; i--) {
      const c = state.cases[i];
      if (c.status === 'resolved' || c.status === 'archived') continue;

      let escalated = false;
      // 越级到市
      if (c.currentLevel === 'county' && c.escalationRisk >= 60 && Math.random() < 0.15) {
        c.currentLevel = 'city';
        c.status = 'escalated';
        escalated = true;
        this._onEscalation(state, county, player, c, 'city');
      }
      // 越级到省
      if (c.currentLevel === 'city' && c.escalationRisk >= 80 && Math.random() < 0.25) {
        c.currentLevel = 'province';
        c.status = 'escalated';
        escalated = true;
        this._onEscalation(state, county, player, c, 'province');
      }
      // 进京
      if (c.currentLevel === 'province' && c.escalationRisk >= 90 && Math.random() < 0.10) {
        c.currentLevel = 'central';
        c.status = 'escalated';
        escalated = true;
        this._onEscalation(state, county, player, c, 'central');
      }

      if (escalated) {
        c.processHistory.push({
          week: Math.ceil((timeSystem?.day || 1) / 7),
          action: 'escalated',
          result: `越级到${c.currentLevel === 'city' ? '市' : c.currentLevel === 'province' ? '省' : '中央'}`,
          timestamp: Date.now()
        });
      }
    }
  }

  /** 越级后果处理（v3：增加群体联动） */
  _onEscalation(state, county, player, c, level) {
    const penaltyMap = { city: 1, province: 3, central: 8 };
    const pressureMap = { city: 3, province: 6, central: 12 };
    const mobMap = { city: 2, province: 4, central: 8 }; // v3：动员度加成
    const penalty = penaltyMap[level] || 1;
    const pressure = pressureMap[level] || 3;

    // 扣上级信任
    if (player && player.relations) {
      player.relations.citySecretary = Math.max(-50, (player.relations.citySecretary || 0) - penalty);
    }

    // 增加信访压力
    state.stats.petitionPressure = Math.min(100, (state.stats.petitionPressure || 30) + pressure);

    // 一票否决计数
    if (level === 'central') {
      state.oneVoteVeto.crossLevelToCentral = (state.oneVoteVeto.crossLevelToCentral || 0) + 1;
    } else if (level === 'province') {
      state.oneVoteVeto.crossLevelToProvince = (state.oneVoteVeto.crossLevelToProvince || 0) + 1;
    }

    // v3：越级事件广播到EventBus（SocialSystem通过监听此类事件实现群体反馈）
    eventBus.emit('petition:escalated', {
      caseId: c.id,
      groupType: c.petitioner && c.petitioner.group ? c.petitioner.group : null,
      level: level,
      mobilizationBoost: mobMap[level] || 0,
      pressure: pressure,
    });

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'warning', title: '⚠️ 越级访' + (level === 'central' ? '·进京' : ''),
      message: `信访案件「${c.demand}」已越级至${level === 'city' ? '市' : level === 'province' ? '省' : '中央'}级。上级信任-${penalty}。`
    });
  }

  // ════════════════════════════════════════════
  //  化解推进
  // ════════════════════════════════════════════

  _advanceResolve(state) {
    // v3：读取维稳资源中的信访化解投入
    var resolveBoost = 1.0;
    var res = stateManager.get('stabilityResources');
    if (res && res.allocated && res.allocated.petitionResolve > 0) {
      resolveBoost = 1 + Math.min(1.0, res.allocated.petitionResolve / 50);
    }

    // v3：联席会议临时加成
    var mtgBoost = stateManager.get('tempMeetingBoost');
    if (mtgBoost && mtgBoost.active && mtgBoost.resolveBoost) {
      resolveBoost = resolveBoost * mtgBoost.resolveBoost;
    }

    state.cases.forEach(c => {
      if (c.status !== 'processing' && c.status !== 'pending') return;
      // 如果有包案领导，自动推进
      if (c.assignedTo) {
        const personnel = this.engine?.getSystem?.('personnel');
        const official = personnel?.get?.(c.assignedTo);
        const ability = official?.abilities?.stability || 50;
        c.resolveProgress = Math.min(100, c.resolveProgress + ability * 0.03 * resolveBoost);
      } else {
        // 无包案领导，缓慢推进（受资源分配影响）
        c.resolveProgress = Math.min(100, c.resolveProgress + 0.5 * resolveBoost);
      }

      // 化解完成
      if (c.resolveProgress >= 100) {
        this._resolveCase(state, c);
      }
    });
  }

  /** 化解案件（v3：张力降低幅度增加 + 群体反馈） */
  _resolveCase(state, c) {
    c.status = 'resolved';
    c.isResolved = true;
    c.satisfaction.petitioner = c.legalMerit > 50 ? 70 : 40;
    c.satisfaction.superior = 60;
    state.stats.monthlyResolved = (state.stats.monthlyResolved || 0) + 1;
    // 从活跃案件移到归档
    state.archivedCases.push(c);

    // v3：联动 SocialSystem——化解案件降低社会张力，幅度加大
    const county = stateManager.get('county');
    if (county && county.socialTension !== undefined) {
      // 按案件严重性差异化降低张力
      var tensionDrop = 1;
      if (c.type === 'collective') {
        tensionDrop = 5 + Math.round(c.difficulty / 20); // 5~9
      } else if (c.importance >= 3 || c.isSupervision) {
        tensionDrop = 3; // 督办件
      } else if (c.difficulty > 65) {
        tensionDrop = 2; // 高难度案件
      }
      county.socialTension = Math.max(0, county.socialTension - tensionDrop);
    }

    // v3：化解案件 → 对应群体怨气缓解
    if (c.petitioner && c.petitioner.group) {
      var socialSys = stateManager.get('social');
      // 通过stateManager找群体数据——实际由SocialSystem的周循环处理
      eventBus.emit('petition:resolved', {
        caseId: c.id,
        groupType: c.petitioner.group,
        reliefAmount: c.type === 'collective' ? 8 : 3,
      });
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '✅ 信访案件化解',
      message: `案件「${c.demand}」已成功化解。`
    });
  }

  // ════════════════════════════════════════════
  //  信访压力计算
  // ════════════════════════════════════════════

  _calcPressure(state) {
    const active = state.cases.filter(c => c.status !== 'resolved' && c.status !== 'archived');
    const activeCount = active.length;
    const crossLevel = active.filter(c => c.currentLevel !== 'county').length;
    const collective = active.filter(c => c.type === 'collective').length;
    const repeat = active.filter(c => c.petitioner.isRepeat).length;

    const pressure = Math.min(100,
      (activeCount / 20 * 30)       // 案件数量维度
      + (crossLevel / Math.max(1, activeCount) * 60) // 越级率维度
      + (collective / Math.max(1, activeCount) * 20)
      + (repeat / Math.max(1, activeCount) * 15)
      + (state.sensitivePeriod.active ? 15 : 0)
    );
    state.stats.petitionPressure = Math.round(pressure);

    // 计算越级率
    const totalEscalated = state.oneVoteVeto.crossLevelToCentral + state.oneVoteVeto.crossLevelToProvince;
    state.stats.crossLevelRate = Math.round(totalEscalated / Math.max(1, state.totalCaseCount) * 100);
  }

  // ════════════════════════════════════════════
  //  一票否决
  // ════════════════════════════════════════════

  _checkOneVoteVeto(state, county, player) {
    const v = state.oneVoteVeto;
    if (v.isTriggered) return;

    const triggered =
      v.crossLevelToCentral >= v.threshold.centralVisit ||
      v.crossLevelToProvince >= v.threshold.provinceVisit ||
      v.massIncidentTriggered;

    if (triggered && !v.warningIssued) {
      v.warningIssued = true;
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'error', title: '🔴 一票否决预警',
        message: `信访形势严峻！进京访${v.crossLevelToCentral}次/赴省访${v.crossLevelToProvince}次，已达到一票否决阈值。如三个月内未改善，年度考核直接不合格！`
      });
    }

    // 警告后12周观察期
    if (v.warningIssued && !v.isTriggered) {
      // 如果后续缓解，取消预警
      const recentEscalations = v.crossLevelToCentral + v.crossLevelToProvince;
      if (recentEscalations < v.threshold.centralVisit + v.threshold.provinceVisit - 2) {
        v.warningIssued = false;
      } else {
        v.isTriggered = true;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'error', title: '🔴 一票否决！',
          message: '因信访问题突出，年度考核被一票否决。晋升通道关闭（至少18个月）。'
        });
      }
    }
  }

  // ════════════════════════════════════════════
  //  玩家操作
  // ════════════════════════════════════════════

  /**
   * 批示案件
   * @param {string} caseId - 案件ID
   */
  directive(caseId) {
    const state = stateManager.get('petition');
    const player = stateManager.get('player');
    if (!state || !player) return { success: false, msg: '系统未就绪' };

    const c = state.cases.find(x => x.id === caseId);
    if (!c) return { success: false, msg: '案件不存在' };

    if (!player.consumeEnergy || !player.consumeEnergy(5)) {
      return { success: false, msg: '精力不足' };
    }

    // 书记批示：化解进度+15%，包案领导效果加成
    c.resolveProgress = Math.min(100, c.resolveProgress + 15);
    if (c.assignedTo) {
      c.resolveProgress = Math.min(100, c.resolveProgress + 5);
    }
    c.lastActionWeek = Math.ceil((timeSystem?.day || 1) / 7);
    c.processHistory.push({ week: c.lastActionWeek, action: 'directive', by: 'player', result: '批示交办' });

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 书记批示',
      message: `您已批示案件「${c.demand}」，化解进度+15%。`
    });
    return { success: true };
  }

  /**
   * 接访
   * @param {string} caseId - 案件ID
   */
  interview(caseId) {
    const state = stateManager.get('petition');
    const player = stateManager.get('player');
    if (!state || !player) return { success: false, msg: '系统未就绪' };

    const c = state.cases.find(x => x.id === caseId);
    if (!c) return { success: false, msg: '案件不存在' };

    if (!player.consumeEnergy || !player.consumeEnergy(15)) {
      return { success: false, msg: '精力不足（需要15）' };
    }

    // 接访效果：化解进度+10%，群众信任+10，降低固执度
    c.resolveProgress = Math.min(100, c.resolveProgress + 10);
    c.trustInGov = Math.min(100, c.trustInGov + 10);
    c.stubborness = Math.max(0, c.stubborness - 5);
    c.lastActionWeek = Math.ceil((timeSystem?.day || 1) / 7);
    c.processHistory.push({ week: c.lastActionWeek, action: 'interview', by: 'player', result: '书记接访' });

    // 降低越级风险
    c.escalationRisk = Math.max(0, c.escalationRisk - 10);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🤝 书记接访',
      message: `您接待了信访人「${c.petitioner.name}」，耐心听取了诉求。案件化解推进。`
    });
    return { success: true };
  }

  /**
   * 指定包案领导
   * @param {string} caseId - 案件ID
   * @param {string} officialId - 干部ID
   */
  assignLeader(caseId, officialId) {
    const state = stateManager.get('petition');
    if (!state) return { success: false, msg: '系统未就绪' };

    const c = state.cases.find(x => x.id === caseId);
    if (!c) return { success: false, msg: '案件不存在' };

    c.assignedTo = officialId;
    c.status = 'processing';
    c.lastActionWeek = Math.ceil((timeSystem?.day || 1) / 7);
    c.processHistory.push({ week: c.lastActionWeek, action: 'assign', by: 'player', result: '指派包案领导:' + officialId });

    // 记录包案覆盖率
    state.caseResponsibility.leaderCases[officialId] = state.caseResponsibility.leaderCases[officialId] || [];
    state.caseResponsibility.leaderCases[officialId].push(caseId);
    state.caseResponsibility.coverage = Math.round(
      Object.keys(state.caseResponsibility.leaderCases).length / Math.max(1, state.cases.length) * 100
    );

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '👤 包案领导',
      message: `已指定包案领导，案件进入处理流程。`
    });
    return { success: true };
  }

  // ════════════════════════════════════════════
  //  便捷方法
  // ════════════════════════════════════════════

  /** 获取活跃案件列表 */
  getActiveCases() {
    const state = stateManager.get('petition');
    if (!state) return [];
    return state.cases.filter(c => c.status !== 'resolved' && c.status !== 'archived');
  }

  /** v3：按群体获取活跃案件统计 */
  getActiveCasesByGroup() {
    const state = stateManager.get('petition');
    if (!state || !state.cases) return {};
    var result = {};
    for (var i = 0; i < state.cases.length; i++) {
      var c = state.cases[i];
      if (c.status === 'resolved' || c.status === 'archived') continue;
      var groupType = c.petitioner && c.petitioner.group ? c.petitioner.group : c.category;
      if (!result[groupType]) result[groupType] = { cases: [], count: 0, totalProgress: 0 };
      result[groupType].cases.push(c);
      result[groupType].count++;
      result[groupType].totalProgress += c.resolveProgress || 0;
    }
    // 计算平均化解进度
    for (var gt in result) {
      result[gt].avgProgress = Math.round(result[gt].totalProgress / result[gt].count);
    }
    return result;
  }

  /** 获取信访压力 */
  getPetitionPressure() {
    return stateManager.get('petition')?.stats?.petitionPressure || 30;
  }

  /** 取怨气最高的群体（联动 SocialSystem） */
  _getGrievanceGroup() {
    const social = stateManager.get('social');
    if (social && social.groups && social.groups.length > 0) {
      const sorted = [...social.groups].sort((a, b) => (b.grievance || 0) - (a.grievance || 0));
      return sorted[0]?.id || 'farmer';
    }
    const groups = ['farmer','worker','teacher','merchant','entrepreneur','retired','laidoff','student','migrant','township'];
    return groups[Math.floor(Math.random() * groups.length)];
  }

  /** 随机姓名 */
  _randomName() {
    const surnames = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐丘骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公仉督晋楚闫法汝鄢涂钦归海帅缑亢况后有琴梁丘左丘东门西门商牟佘佴伯赏南宫墨哈谯笪年爱阳佟言福';
    const given = '建国国强志明志强建华建平建华志强志明国强建国国强志明志强建华建平志明国强建国明辉明杰永强永刚永华春生春林春海国庆国平国华国良国强志远志诚志刚志宏志强';
    const sur = surnames[Math.floor(Math.random() * surnames.length)] + surnames[Math.floor(Math.random() * surnames.length)];
    return sur + given[Math.floor(Math.random() * given.length)] + given[Math.floor(Math.random() * given.length)];
  }

  /** 序列化 */
  toJSON() { return stateManager.get('petition'); }

  fromJSON(data) { if (data) stateManager.set('petition', data); }
}
