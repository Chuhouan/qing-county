/**
 * CorruptionSystem - 腐败系统
 * 双刃剑：违规操作可快速推进项目/获得资源，但累积被查风险
 * 联动：财政(挪用/贪污)、经济(企业行贿)、社会(民怨)、个人(廉洁能力/保护伞)
 */
class CorruptionSystem {
  constructor() { this.engine = null; }

  init(config) {
    stateManager.register('corruption', {
      auditAlerts: [],
      investigationActive: false,
      caseSeverity: 0,
    });
    // 注册月度检查
    eventBus.on(EVENTS.MONTH_CHANGE, () => this._monthlyCheck());
  }

  /** 提供腐败操作选项给UI */
  getCorruptActions() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!player) return [];

    // 根据腐败参与度解锁更多操作
    const level = player.corruption.level;
    const actions = [];

    // 基础操作（随时可用）
    actions.push({
      id: 'speed_up_approval',
      name: '加速审批',
      desc: '向审批部门打招呼，加快项目审批进度。轻微违规。',
      icon: '⚡',
      levelRequired: 0,
      benefit: {
        energy: -5,
        performance: { economy: 1 },
        politicalCapital: 2,
      },
      cost: { bribe: 0, target: '审批部门' },
      riskIncrease: 3,
    });

    // 低级别腐败
    if (level >= 10) {
      actions.push({
        id: 'tax_break',
        name: '违规减免税收',
        desc: '给特定企业税收优惠，换取政治支持或"咨询费"。高风险高回报。',
        icon: '💰',
        levelRequired: 10,
        benefit: {
          energy: -8,
          relation: { entrepreneurs: 5 },
          politicalCapital: 5,
        },
        cost: { bribe: 50, target: '企业主' },
        riskIncrease: 8,
      });
    }

    if (level >= 20) {
      actions.push({
        id: 'land_deal',
        name: '土地违规出让',
        desc: '低于市场价向关系户出让土地，获取巨额回扣。严重违法。',
        icon: '🏗',
        levelRequired: 20,
        benefit: {
          energy: -10,
          relation: { entrepreneurs: 8, committeeMembers: 3 },
          politicalCapital: 10,
        },
        cost: { bribe: 200, target: '地产商' },
        riskIncrease: 15,
      });
    }

    if (level >= 30 && county?.politicalResources?.mediaRelation > 30) {
      actions.push({
        id: 'media_control',
        name: '压制负面报道',
        desc: '通过关系压制记者的负面调查报道。维护形象但增加风险。',
        icon: '📰',
        levelRequired: 30,
        benefit: {
          energy: -6,
          relation: { media: -5 },
          politicalCapital: 3,
        },
        cost: { bribe: 30, target: '媒体' },
        riskIncrease: 7,
      });
    }

    // 高级腐败
    if (level >= 40 && county?.institution?.corruptionIndex > 30) {
      actions.push({
        id: 'embezzle_funds',
        name: '挪用专项资金',
        desc: '将上级专项拨款挪作他用。短期解决资金缺口但极危险。',
        icon: '💸',
        levelRequired: 40,
        benefit: {
          energy: -15,
          money: 500,
          politicalCapital: -5,
        },
        cost: { bribe: 100, target: '财政局' },
        riskIncrease: 20,
      });
    }

    if (level >= 50) {
      actions.push({
        id: 'sell_position',
        name: '卖官鬻爵',
        desc: '收受贿赂后提拔特定干部。严重破坏政治生态。',
        icon: '👑',
        levelRequired: 50,
        benefit: {
          energy: -12,
          relation: { citySecretary: -5 },
          politicalCapital: 8,
        },
        cost: { bribe: 300, target: '求官者' },
        riskIncrease: 18,
      });
    }

    if (level >= 60 && county?.historicalBurden?.hiddenDebt > 20000) {
      actions.push({
        id: 'fake_project',
        name: '虚报项目套取资金',
        desc: '虚构工程项目，套取上级专项转移支付。触犯刑法。',
        icon: '📄',
        levelRequired: 60,
        benefit: {
          energy: -20,
          money: 1000,
          politicalCapital: -10,
        },
        cost: { bribe: 200, target: '上级部门' },
        riskIncrease: 25,
      });
    }

    return actions;
  }

  /** 月度腐败检查 - 审计/举报/调查 */
  _monthlyCheck() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!player || !county) return;

    const corr = player.corruption;
    const integrity = player.abilities.integrity;
    const countyCorr = county.institution.corruptionIndex;

    // 1. 腐败指数与县长廉洁的联动
    // 县长腐败→全县腐败指数上升
    if (corr.level > 10) {
      const countyDrift = (corr.level - 10) * 0.02;
      county.institution.corruptionIndex = calculator.clamp(
        countyCorr + countyDrift, 0, 100
      );
    }

    // 2. 被查风险自然变化
    // 廉洁能力高→风险自然下降（嗅觉灵敏及时止损）
    const integrityBuff = -(integrity - 50) * 0.1;
    // 保护伞衰减（随时间减弱）
    const umbrellaDecay = -corr.protectiveUmbrella * 0.01;
    // 如果已被举报，风险加速上升
    const whistleBlowBoost = corr.whistleblower ? 2 : 0;
    // 对手/媒体关系差→风险上升
    const mediaRisk = (stateManager.get('player')?.relations?.media || 0) < -10 ? 1 : 0;

    corr.investigationRisk = calculator.clamp(
      corr.investigationRisk + integrityBuff + umbrellaDecay + whistleBlowBoost + mediaRisk + (Math.random() - 0.5) * 0.5,
      0, 100
    );

    // 3. 检查是否需要触发调查
    if (corr.investigationRisk > 60 && !corr.whistleblower && Math.random() < 0.15) {
      // 被举报（匿名信/上访）
      corr.whistleblower = true;
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '⚠️ 举报信',
        message: '纪委收到匿名举报信，提及您涉嫌违纪。需要谨慎应对。',
        persistent: true,
      });
      this._addCorruptionEvent('举报');
    }

    // 4. 调查启动
    if (corr.investigationRisk > 80 && Math.random() < 0.1) {
      this._startInvestigation(player);
    }

    // 5. 保护伞磨损
    if (corr.protectiveUmbrella > 0) {
      corr.protectiveUmbrella = calculator.clamp(
        corr.protectiveUmbrella - (Math.random() * 2 + 0.5), 0, 100
      );
    }
  }

  /** 启动调查 */
  _startInvestigation(player) {
    const severity = Math.min(
      Math.ceil(player.corruption.level / 10),
      10
    );

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'warning', title: '🔍 纪委调查',
      message: `纪委工作组进驻本县，开展${severity > 5 ? '专项' : '例行'}调查。涉案金额约${player.corruption.totalBribes}万元。`,
      persistent: true,
    });

    // 根据保护伞和上级关系决定能否压下
    const umbrella = player.corruption.protectiveUmbrella;
    const secretaryRel = player.relations.citySecretary;
    const surviveChance = umbrella * 0.3 + (secretaryRel > 0 ? secretaryRel * 0.3 : 0);
    const roll = Math.random() * 100;

    if (roll < surviveChance) {
      // 压下来了
      player.corruption.investigationRisk = calculator.clamp(
        player.corruption.investigationRisk - 30, 0, 100
      );
      player.corruption.protectiveUmbrella = calculator.clamp(
        umbrella - 20, 0, 100
      );
      this._addCorruptionEvent('调查被压下');
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: '🛡 风平浪静',
        message: '经过运作，调查组未发现实质性问题，已撤离。',
      });
    } else {
      // 被查实
      this._endByCorruption(player, severity);
    }
  }

  /** 腐败出局 */
  _endByCorruption(player, severity) {
    const gameOverData = {
      reason: 'corruption',
      severity: severity,
      description: severity > 7
        ? `因严重违纪违法被立案审查。涉案金额${player.corruption.totalBribes}万元，违规操作${player.corruption.favorsGiven}次。`
        : `因违纪问题被组织调查，受到${severity > 4 ? '撤职' : '党内警告'}处分。`,
      bribeAmount: player.corruption.totalBribes,
      favorCount: player.corruption.favorsGiven,
    };

    if (this.engine) this.engine.running = false;
    eventBus.emit(EVENTS.GAME_OVER, gameOverData);
  }

  /** 处理腐败相关事件选择 */
  handleEventChoice(eventId, choiceIndex) {
    // 由事件系统回调，处理腐败类事件的特殊后果
    const player = stateManager.get('player');
    if (!player) return;
    if (!player.corruption) player.corruption = { level: 0, investigationRisk: 0, protectiveUmbrella: 0, totalBribes: 0, favorsGiven: 0, records: [] };

    // 根据选择索引和事件ID分发处理
    if (eventId === 'corruption_tip_off') {
      // 举报信事件
      if (choiceIndex === 0) {
        // 选择"压下" - 风险上升
        player.corruption.investigationRisk = calculator.clamp(
          (player.corruption.investigationRisk || 0) + 10, 0, 100
        );
      } else if (choiceIndex === 1) {
        // 选择"主动汇报" - 风险降低但政治资本受损
        player.corruption.investigationRisk = Math.max(0, (player.corruption.investigationRisk || 0) - 15);
        player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 10);
      }
    } else if (eventId === 'corruption_investigation') {
      // 调查事件
      if (choiceIndex === 0) {
        // 配合调查 - 风险降低
        player.corruption.investigationRisk = Math.max(0, (player.corruption.investigationRisk || 0) - 20);
      } else if (choiceIndex === 1) {
        // 利用保护伞 - 消耗保护伞资源
        player.corruption.protectiveUmbrella = Math.max(0, (player.corruption.protectiveUmbrella || 0) - 15);
        player.corruption.investigationRisk = Math.max(0, (player.corruption.investigationRisk || 0) - 5);
      }
    }

    // 记录日志
    this._addCorruptionEvent('处理：' + eventId + ' 选项' + choiceIndex);
  }

  /** 添加腐败事件到UI */
  _addCorruptionEvent(type) {
    const log = stateManager.get('events');
    if (Array.isArray(log)) {
      log.push({
        time: timeSystem?.getTimeString?.() || '',
        type: 'corruption',
        title: type === '举报' ? '举报信' : '调查动态',
        message: type,
      });
    }
  }

  /** 获取腐败数据（给巡视系统用） */
  getCorruptionData() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!player || !county) return null;
    return {
      level: player.corruption?.level || 0,
      totalBribes: player.corruption?.totalBribes || 0,
      investigationRisk: player.corruption?.investigationRisk || 0,
      protectiveUmbrella: player.corruption?.protectiveUmbrella || 0,
      countyIndex: county.institution?.corruptionIndex || 0,
      whistleblower: player.corruption?.whistleblower || false,
      favorsGiven: player.corruption?.favorsGiven || 0,
    };
  }

  /** 接收巡视移交的线索 */
  receiveInspectionClue(clue) {
    const player = stateManager.get('player');
    if (!player) return;
    if (!player.corruption) {
      player.corruption = {
        level: 0, investigationRisk: 0, protectiveUmbrella: 0,
        totalBribes: 0, favorsGiven: 0, records: [],
      };
    }
    const severityFactor = (clue.severity || 50) / 100;
    player.corruption.investigationRisk = calculator.clamp(
      (player.corruption.investigationRisk || 0) + severityFactor * 30,
      0, 100
    );
    const county = stateManager.get('county');
    if (county?.institution) {
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 0) + severityFactor * 10,
        0, 100
      );
    }
    this._addCorruptionEvent('巡视移交线索：' + (clue.description || '未知'));
    if (player.corruption.investigationRisk > 75 && !player.corruption.whistleblower) {
      player.corruption.whistleblower = true;
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '🔍 纪委调查',
        message: '巡视组移交线索后，市纪委决定启动初步核实。',
        persistent: true,
      });
    }
  }

  /** 获取玩家腐败状态摘要 */
  getSummary() {
    const player = stateManager.get('player');
    if (!player) return null;
    const c = player.corruption;
    const riskLevel = c.investigationRisk > 80 ? '极高'
                    : c.investigationRisk > 60 ? '高'
                    : c.investigationRisk > 40 ? '中'
                    : c.investigationRisk > 20 ? '低' : '安全';
    return {
      level: c.level,
      totalBribes: c.totalBribes,
      favorsGiven: c.favorsGiven,
      investigationRisk: c.investigationRisk,
      riskLevel,
      whistleblower: c.whistleblower,
      protectiveUmbrella: c.protectiveUmbrella,
      records: c.records,
      actionsAvailable: this.getCorruptActions().length,
    };
  }
}
