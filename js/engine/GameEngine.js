/**
 * GameEngine - 游戏主引擎（修复版）
 * 一回合 = 一周
 * 修复：GDP公式、财政收支、张力调参、月触发、精力消耗
 */
class GameEngine {
  constructor() {
    this.initialized = false;
    this.running = false;
    this.turnCount = 0;
    this.systems = {};
    this._lastMonth = null;
    this._lastYear = null;
    this._lastSupervisionQuarter = null;
    this._filePool = [];

    // ——— 每周决策流状态 ———
    this._weeklyPhase = 'idle';
    this.focusAreas = [];
    this.weeklyEvents = [];
    this._currentEventIdx = 0;

    // ——— 年度治理路线 ———
    this.currentStrategy = null;

    // ——— 特质修饰器缓存 ———
    this._traitModifiers = {};
    this.SAVE_SLOTS = 3;
  }

  static STRATEGIES = {
    industrial: {
      name: '工业强县', icon: '🏭',
      desc: '经济活力增长+30%，社会稳定-10%，污染事件概率+20%',
      effects: { ecoBoost: 0.30, stbPenalty: -0.10, pollutionChance: 0.20 },
    },
    people: {
      name: '民生为本', icon: '🏥',
      desc: '社会稳定+25%，财政压力+15%，上级评价增长较慢',
      effects: { stbBoost: 0.25, fiscalPressure: 0.15, superiorGrowth: -0.10 },
    },
    ecology: {
      name: '生态立县', icon: '🌳',
      desc: '长期经济潜力+，短期财政-20%，环保考核加分',
      effects: { fiscalPenalty: -0.20, longTermEco: 0.15, superiorBoost: 0.10 },
    },
    reform: {
      name: '改革先锋', icon: '🚩',
      desc: '政治资本获取+25%，风险事件概率+30%，可能触动利益',
      effects: { pcapBoost: 0.25, riskChance: 0.30, stbPenalty: -0.05 },
    },
  };

  registerSystem(name, system) {
    this.systems[name] = system;
    system.engine = this;
    return this;
  }

  getSystem(name) { return this.systems[name]; }

  init(config = {}) {
    const defaultNamespaces = ['county', 'player', 'committee', 'population',
      'enterprises', 'finance', 'events', 'evaluation',
      'social', 'intel', 'policies', 'personnel', 'economic', 'weeklyBrief', 'corruption',
      'publicOpinion', 'socialMobilization', 'narrative', 'superiorRelations', 'petition'];
    for (const ns of defaultNamespaces) {
      if (!stateManager.has(ns)) stateManager.register(ns, {});
    }
    Object.values(this.systems).forEach(sys => { if (sys.init) sys.init(config); });
    // 注册并初始化叙事系统
    if (!this.getSystem('narrative')) {
      const ns = new NarrativeSystem();
      ns.engine = this;
      this.registerSystem('narrative', ns);
      ns.init(config);
    }
    timeSystem.init(config.time || {});
    // 初始化月/年标记
    this._lastMonth = timeSystem.month;
    this._lastYear = timeSystem.year;
    this._setupListeners();
    this.initialized = true;
    eventBus.emit(EVENTS.GAME_INIT, { config });
    return this;
  }

  start() {
    if (!this.initialized) return;
    this.running = true;
    // 首次进入——先做一周决策
    this._weeklyPhase = 'idle';
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '📖 欢迎就任',
      message: `您就任县委书记。\n点击"推进一周"开始您的第一周工作——先选择本周关注领域，再处理本周事务。`,
      persistent: true,
    });
  }

  pause() { this.running = false; timeSystem.pause(); }

  /** 进入新的一周 */
  _enterWeek() {
    if (!this.running) return;
    this.turnCount++;

    // 检测月度更新：触发月度事件（经济/财政已周结）
    if (timeSystem.month !== this._lastMonth) {
      this._lastMonth = timeSystem.month;
      this._monthlyUpdate();
    }
    // 检测年度更新
    if (timeSystem.year !== this._lastYear) {
      this._lastYear = timeSystem.year;
      this._yearlyUpdate();
    }

    this._weeklyUpdate();
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    // 每周刷新文件池
    const evtSys = this.getSystem('event');
    if (evtSys) {
      const pending = evtSys.getPendingEvents();
      if (pending.length <= 5) {
        // 每周补充文件
        this._filePool = []; // 清空，下次请求时会重新生成
      }
    }
  }

  /** 安全修改张力的辅助方法（v3：添加地板10，不会归零） */
  _modifyTension(county, delta) {
    if (!county) return 0;
    var current = county.socialTension || 0;
    var newVal = current + delta;
    // 地板10：张力不会完全归零
    if (newVal < 10 && delta < 0) newVal = 10;
    newVal = Math.min(100, Math.max(0, newVal));
    county.socialTension = newVal;
    return newVal;
  }

  /** 安全初始化对象嵌套属性 */
  _ensureObj(obj, path) {
    if (!obj || !path) return obj;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    return current;
  }

  /** 每周数值更新（GDP由EconomicSystem月度从底至上计算，此处只做张力/玩家状态/体制日常变化） */
  _weeklyUpdate() {
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    const finance = stateManager.get('finance');
    const ecoData = stateManager.get('economicData');
    if (!county || !player) return;

    // ===== 安全初始化嵌套属性 =====
    if (!county.economy) county.economy = {};
    if (!county.superiorTrust) county.superiorTrust = {};
    if (!county.localPrestige) county.localPrestige = {};
    if (!player.abilities) player.abilities = {};
    if (!player.status) player.status = {};
    if (!player.relations) player.relations = {};

    // ===== 社会张力：基于真实失业率（来自人口系统） =====
    const popSys = this.getSystem('population');
    const popData = popSys?.pop || stateManager.get('population');
    const unemploymentRate = popData?.unemploymentRate ?? 0.10;
    // 失业因子 = 失业率每超过5%，额外加压
    const unempFactor = Math.max(0, (unemploymentRate - 0.05) * 2);
    // 通胀因子：基于CPI
    const cpi = ecoData?.cpi || 100.5;
    const inflFactor = Math.max(0, (cpi - 102) * 0.02);
    // 维稳能力衰减
    const stabilityBuff = -(player.abilities.stability || 50) * 0.02;
    const naturalDecay = -0.10; // v3: 从-0.25改为-0.10
    const tensionRand = (Math.random() - 0.5) * 1.0;
    const tensionDelta = naturalDecay + unempFactor + inflFactor + stabilityBuff + tensionRand;
    this._modifyTension(county, tensionDelta);

    // ===== 社会系统v3（一体化：含群体 + 信访 + 舆论） =====
    var socialSys = this.getSystem('social');
    if (socialSys && socialSys.weeklyUpdate) {
      socialSys.weeklyUpdate();
    }

    // ===== 上级关系系统每周更新 =====
    var superiorSys = this.getSystem('superiorRelations');
    if (superiorSys && superiorSys.weeklyUpdate) {
      superiorSys.weeklyUpdate();
    }

    // ===== 巡视巡查系统 =====
    var inspectionSys = this.getSystem('inspection');
    if (inspectionSys && inspectionSys.weeklyUpdate) {
      inspectionSys.weeklyUpdate();
    }

    // ===== 经济活力（核心状态之二） =====
    const baseVitality = 40; // 基准值
    const gdpBoost = ((county.economy.gdpGrowth || 0.05) - 0.03) * 300; // GDP每高3%→+9活力
    const unempPenalty = unemploymentRate > 0.08 ? -(unemploymentRate - 0.08) * 200 : 0;
    const investmentBoost = (stateManager.get('finance')?.monthlyIncome || 17000) > 17000 ? 5 : 0;
    county.economy.economicVitality = calculator.clamp(
      baseVitality + gdpBoost + unempPenalty + investmentBoost,
      0, 100
    );

    // ===== 三状态相互影响 =====
    const ecoVital = county.economy?.economicVitality ?? 50;
    const stability = 100 - (county.socialTension || 0);
    const superior = county.superiorTrust?.citySecretary || 50;
    if (stability < 30) county.economy.economicVitality = Math.max(0, ecoVital - 3);
    else if (stability > 70) county.economy.economicVitality = Math.min(100, ecoVital + 1);
    if (ecoVital < 20) this._modifyTension(county, 1.5);
    else if (ecoVital > 80) this._modifyTension(county, -0.5);
    if (superior > 70) player.politicalCapital = Math.min(200, (player.politicalCapital || 20) + 0.5);
    if (superior < 30) player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 0.5);

    // ===== 治理路线月度修正 =====
    const strMods = this.getStrategyModifiers();
    if (strMods.economicVitality) {
      county.economy.economicVitality = calculator.clamp(
        (county.economy.economicVitality || 50) * (1 + strMods.economicVitality), 0, 100);
    }
    if (strMods.stabilityShift) {
      this._modifyTension(county, -strMods.stabilityShift * 2);
    }
    if (strMods.politicalCapitalBoost && Math.random() < 0.3) {
      player.politicalCapital = Math.min(200, (player.politicalCapital || 20) + 0.5);
    }
    if (strMods.superiorBoost && Math.random() < 0.3) {
      county.superiorTrust.citySecretary = calculator.clamp(
        (county.superiorTrust.citySecretary || 50) + 0.5, 0, 100);
    }

    // ===== 特质修饰器每周生效 =====
    const playerTraits = (player.traits || []).map(id => (typeof getTrait === 'function' ? getTrait(id) : null)).filter(Boolean);
    const traitMods = {};
    for (const t of playerTraits) {
      const mods = t.effects?.modifiers;
      if (!mods) continue;
      // 合并同类型的修饰器（累加）
      for (const [k, v] of Object.entries(mods)) {
        traitMods[k] = (traitMods[k] || 0) + (typeof v === 'number' ? v : 0);
      }
    }
    // gdpGrowth → 经济活力
    if (traitMods.gdpGrowth && county.economy) {
      county.economy.economicVitality = calculator.clamp(
        (county.economy.economicVitality || 50) + traitMods.gdpGrowth * 100, 0, 100);
    }
    // tensionResistance → 张力修正（正数=张力衰减更快=更稳定）
    if (traitMods.tensionResistance) {
      this._modifyTension(county, -traitMods.tensionResistance * 0.3);
    }
    // satisfactionRecovery → 稳定度额外恢复
    if (traitMods.satisfactionRecovery) {
      this._modifyTension(county, -traitMods.satisfactionRecovery * 0.5);
    }
    // corruptionImmunity → 腐败指数自然下降
    if (traitMods.corruptionImmunity && county.institution) {
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 20) - traitMods.corruptionImmunity, 0, 100);
    }
    // investigationRisk → 被查风险每季下降
    if (traitMods.investigationRisk && player) {
      if (!player.corruption) player.corruption = {};
      player.corruption.investigationRisk = calculator.clamp(
        (player.corruption?.investigationRisk || 0) - traitMods.investigationRisk * 0.5, 0, 100);
    }
    // pollutionTolerance → 污染对张力的影响修正
    if (traitMods.pollutionTolerance) {
      // 正数=容忍污染，张力因污染而上升更慢
      this._modifyTension(county, -traitMods.pollutionTolerance * 0.02);
    }
    // transferEfficiency → 转移支付效率提升
    if (traitMods.transferEfficiency) {
      const fin = stateManager.get('finance');
      if (fin) {
        fin.selfSufficiency = calculator.clamp(
          (fin.selfSufficiency || 50) + traitMods.transferEfficiency, 20, 100);
      }
    }
    // 保存到全局供外部方法读取
    this._traitModifiers = traitMods;

    // ===== 玩家状态（后台追踪，UI不再展示） =====
    // 压力
    const tensionStress = (county.socialTension || 0) * 0.02;
    const naturalStress = 0.8;
    const stressBuff = -(player.abilities.stability || 50) * 0.008;
    if (typeof player.modifyStatus === 'function') {
      player.modifyStatus('stress', tensionStress + naturalStress + stressBuff);
    } else if (player.status) {
      // 兼容：如果是普通对象
      player.status.stress = calculator.clamp((player.status.stress || 0) + tensionStress + naturalStress + stressBuff, 0, 100);
    }

    if (player.status.stress > 60) {
      if (typeof player.modifyStatus === 'function') {
        player.modifyStatus('health', -1);
      } else if (player.status) {
        player.status.health = (player.status.health || 100) - 1;
      }
    } else if (player.status.stress > 40) {
      if (typeof player.modifyStatus === 'function') {
        player.modifyStatus('health', -0.3);
      } else if (player.status) {
        player.status.health = (player.status.health || 100) - 0.3;
      }
    }
    // 精力：基础恢复 - 基础消耗
    if (typeof player.modifyStatus === 'function') {
      player.modifyStatus('energy', 15);
    } else if (player.status) {
      player.status.energy = Math.min(100, (player.status.energy || 50) + 15);
    }

    // ===== 体制指标 =====
    if (county.institution) {
      const govDrift = ((player.abilities.cadreMgmt || 50) - 50) * 0.002;
      county.institution.bureaucracyEfficiency = calculator.clamp(
        (county.institution.bureaucracyEfficiency || 60) + govDrift + (Math.random() - 0.5) * 0.2,
        30, 90
      );
      const corrDrift = ((player.abilities.integrity || 70) - 70) * -0.003;
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 20) + (Math.random() - 0.5) * 0.15 + corrDrift,
        0, 100
      );
    }

    // ===== 上级信任 =====
    const perfScore = typeof player.getTotalPerformance === 'function' ? player.getTotalPerformance() : 0;
    const trustDrift = (perfScore - 50) * 0.005;
    county.superiorTrust.citySecretary = calculator.clamp(
      (county.superiorTrust.citySecretary || 50) + trustDrift + (Math.random() - 0.5) * 0.3,
      0, 100
    );

    // ===== 地方威望 =====
    const sat = stateManager.get('social')?.satisfaction || 60;
    county.localPrestige.publicApproval = calculator.clamp(
      (county.localPrestige.publicApproval || 50) * 0.95 + sat * 0.05,
      0, 100
    );

    // ===== 随机事件 =====
    const eventChance = (county.socialTension || 0) > 60 ? 0.3 : 0.2;
    if (Math.random() < eventChance) {
      const evtSys = this.getSystem('event');
      const pending = evtSys?.getPendingEvents() || [];
      if (pending.length > 0) {
        const evt = pending[Math.floor(Math.random() * pending.length)];
        evtSys.activateEvent(evt);
      }
    }

    // ===== 提前出局检测 =====
    // 1. 病故检测：健康归零
    if ((player.status?.health ?? 100) <= 0) {
      this._endGame({ reason: 'illness', description: '因长期劳累过度，突发疾病抢救无效。' });
      return;
    }
    // 2. 事故检测（极小概率，约0.1%/周≈5%/年）
    if (Math.random() < 0.001) {
      const accidentTypes = [
        { type: '车祸', desc: '下乡调研途中遭遇交通事故。', survivalRate: 0.6 },
        { type: '坍塌', desc: '视察工地时发生坍塌事故。', survivalRate: 0.7 },
        { type: '食物中毒', desc: '公务接待中发生集体食物中毒。', survivalRate: 0.85 },
      ];
      const accident = accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
      if (Math.random() > accident.survivalRate) {
        this._endGame({ reason: 'accident', description: accident.desc });
        return;
      }
    }
    // 3. 免职检测：社会动荡+上级极度不信任
    if (county.socialTension > 90 && (county.superiorTrust?.citySecretary ?? 0) < -30) {
      if (Math.random() < 0.05) {
        this._endGame({ reason: 'dismissed', description: '因社会动荡和上级不信任，被免去县长职务。' });
        return;
      }
    }

    // ===== 腐败调查检测 =====
    this._checkCorruptionInvestigation();

    // ===== 派系关系系统每周更新 =====
    this._weeklyFactionUpdate();

    // ===== 官员能力值驱动系统 =====
    this._applyOfficialAbilities();

    // ===== 派系提案事件（随机几周触发一次） =====
    this._checkFactionProposal();

    // ===== 治理路线图（国策树）每周推进 =====
    var taskSys = this.getSystem('tasks');
    if (taskSys && taskSys.advanceFocus) taskSys.advanceFocus();

    // ===== 当务之急：随机触发 + 过期检查 =====
    if (taskSys) {
      taskSys.tryTriggerMatters();
      taskSys.checkMatterDeadlines();
    }

    // ===== 叙事系统每周更新 =====
    const narrativeSys = this.getSystem('narrative');
    if (narrativeSys) {
      narrativeSys.weeklyUpdate();
    }

    this._generateWeeklyBrief();

    // ===== 每周经济/财政微调（不触发全量月度结算） =====
    const ecoSys = this.getSystem('economy');
    if (ecoSys?.weeklyTick) ecoSys.weeklyTick();
  }

  /** 派系关系系统每周更新 */
  _weeklyFactionUpdate() {
    var factionSys = this.getSystem('factions');
    if (!factionSys) return;
    // 每周调用派系系统的更新，获取周报
    var report = factionSys.weeklyUpdate();
    // 每月同步成员归属（用月/周转算取代不存在的 timeSystem.week）
    var weekNum = timeSystem ? Math.ceil((timeSystem.day || 1) / 7) : 0;
    if (weekNum > 0 && weekNum % 4 === 1) {
      factionSys._syncMembers();
      // 记录派系周报
      eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
      if (typeof uiManager !== 'undefined') {
        uiManager._addEventLog('info', '派系动态', report);
      }
    }
  }

  /** 官员能力值驱动系统 — 让官员的9项子能力真正影响游戏数值 */
  _applyOfficialAbilities() {
    var personnel = this.getSystem('personnel');
    if (!personnel) return;
    var county = stateManager.get('county');
    var finance = stateManager.get('finance');
    if (!county || !finance) return;

    // 工具：读取官员能力值
    function getAbility(id, name) {
      var off = personnel.get(id);
      return off && off.abilities ? (off.abilities[name] || 50) : 50;
    }

    // 1. 财政局长 economy → 财政自给率修正
    var financeEco = getAbility('finance_bureau', 'economy');
    var financeMod = (financeEco - 50) * 0.002; // 50=0, 88=+0.076, 30=-0.04
    finance.selfSufficiency = calculator.clamp(
      (finance.selfSufficiency || 50) + financeMod, 20, 100
    );

    // 2. 公安局长 crisis → 社会张力衰减加成
    var policeCrisis = getAbility('public_security', 'crisis');
    var policeMod = (policeCrisis - 50) * 0.008; // 50=0, 85=+0.28, 30=-0.16
    if (policeMod > 0) {
      this._modifyTension(county, -policeMod);
    }

    // 3. 教育局长 profession → 社会满意度微弱加成
    var eduProf = getAbility('edu_bureau', 'profession');
    var social = stateManager.get('social');
    if (social && eduProf > 50) {
      social.satisfaction = calculator.clamp(
        (social.satisfaction || 60) + (eduProf - 50) * 0.02, 0, 100
      );
    }

    // 4. 纪委书记 integrity → 腐败指数抑制
    var disIntegrity = getAbility('discipline', 'integrity');
    if (county.institution && disIntegrity > 50) {
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 20) - (disIntegrity - 50) * 0.02, 0, 100
      );
    }

    // 5. 经济口官员（发改/财政/科工）平均 economy → GDP活力微调
    var ecoOffs = ['dev_reform', 'finance_bureau', 'tech_bureau'];
    var ecoSum = 0;
    for (var ei = 0; ei < ecoOffs.length; ei++) {
      ecoSum += getAbility(ecoOffs[ei], 'economy');
    }
    var ecoAvg = ecoSum / ecoOffs.length;
    var ecoMod = (ecoAvg - 50) * 0.02; // 50=0, 80=+0.6
    if (county.economy) {
      county.economy.economicVitality = calculator.clamp(
        (county.economy.economicVitality || 50) + ecoMod, 0, 100
      );
    }

    // 6. 发改局长 execution → 官僚效率修正
    var devExec = getAbility('dev_reform', 'execution');
    if (county.institution) {
      var execMod = (devExec - 50) * 0.01;
      county.institution.bureaucracyEfficiency = calculator.clamp(
        (county.institution.bureaucracyEfficiency || 60) + execMod, 30, 90
      );
    }

    // 7. 审计局长 integrity + 纪委书记 integrity → 联合反腐
    var auditInt = getAbility('audit_bureau', 'integrity');
    var avgInt = (disIntegrity + auditInt) / 2;
    if (county.institution && avgInt > 50) {
      county.institution.corruptionIndex = calculator.clamp(
        (county.institution.corruptionIndex || 20) - (avgInt - 50) * 0.015, 0, 100
      );
    }
  }

  _checkCorruptionInvestigation() {
    const player = stateManager.get('player');
    if (!player || !player.corruption) return;
    var c = player.corruption;
    c.investigationState = c.investigationState || 'none';
    c.investigationWeeks = c.investigationWeeks || 0;

    // 腐败值每周自然衰减（有上限）
    if (c.level > 0 && c.investigationState === 'none') {
      c.level = Math.max(0, c.level - 0.3);
    }

    // 触发调查
    var shouldInvestigate = false;
    if (c.level >= 70 && c.investigationState === 'none') shouldInvestigate = true;
    if (c.level >= 50 && c.investigationState === 'none' && Math.random() < 0.15) shouldInvestigate = true;
    if (c.whistleblower && c.investigationState === 'none') shouldInvestigate = true;

    if (shouldInvestigate) {
      c.investigationState = 'undercurrent';
      c.investigationWeeks = 0;
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'important', title: '⚠️ 纪委动态',
        message: '据可靠消息，县纪委近期收到关于您的举报材料。',
      });
    }

    // 调查阶段推进
    if (c.investigationState !== 'none') {
      c.investigationWeeks++;

      // 阶段转换
      if (c.investigationState === 'undercurrent' && c.investigationWeeks >= 4) {
        if (c.level >= 55 || Math.random() < 0.4) {
          c.investigationState = 'preliminary';
          eventBus.emit(EVENTS.UI_NOTIFICATION, {
            type: 'important', title: '🔍 纪委函询',
            message: '县纪委向您发出函询通知，要求就近期有关事项作出书面说明。',
          });
        }
      }
      if (c.investigationState === 'preliminary' && c.investigationWeeks >= 8) {
        if (c.level >= 65 || Math.random() < 0.5) {
          c.investigationState = 'formal';
          eventBus.emit(EVENTS.UI_NOTIFICATION, {
            type: 'error', title: '🔴 正式立案',
            message: '市纪委决定对您正式立案审查。部分职权已被限制。',
          });
        }
      }
      if (c.investigationState === 'formal' && c.investigationWeeks >= 12) {
        this._endGame({ reason: 'corruption', description: '经纪委调查核实，您因严重违纪被开除党籍和公职，移送司法机关处理。' });
      }
    }
  }

  /** 月度更新 — 经济/财政月度结算 + 事件触发 + 人大监督 + 乡镇同步 */
  _monthlyUpdate() {
    // ===== 月度经济结算（全量，只在本月首次推进时执行一次） =====
    const ecoSys = this.getSystem('economy');
    const taxBase = ecoSys ? ecoSys.monthlyUpdate(timeSystem?.month || 1) : null;

    if (ecoSys) ecoSys.monthlySettlement();

    // 月度记录历史数据（图表用）
    if (window.historyRecorder) historyRecorder.record();

    const evtSys = this.getSystem('event');
    const pending = evtSys?.getPendingEvents() || [];
    for (let i = 0; i < Math.min(2, pending.length); i++) {
      if (Math.random() < 0.4) {
        const evt = pending[Math.floor(Math.random() * pending.length)];
        evtSys.activateEvent(evt);
      }
    }

    const ecoReport = this.getSystem('economy')?.getMonthlyReport?.();
    const finState = stateManager.get('finance');
    eventBus.emit(EVENTS.FINANCE_MONTHLY, {
      month: timeSystem.month, year: timeSystem.year,
      income: finState?.monthlyIncome || 0,
      expense: finState?.monthlyExpense || 0,
      balance: (finState?.monthlyIncome || 0) - (finState?.monthlyExpense || 0),
      gdp: ecoReport?.total || 0,
      gdpGrowth: ecoReport?.growthRate || 0,
    });

    // 季度监督触发（3/6/9/12月）
    if (timeSystem && timeSystem.month % 3 === 0 && this.turnCount > 0) {
      var supervisionQuarter = Math.ceil(timeSystem.month / 3);
      // 避免重复触发（每个月只触发一次，季度末的月份）
      if (this._lastSupervisionQuarter !== supervisionQuarter) {
        this._lastSupervisionQuarter = supervisionQuarter;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'info', title: '📋 人大监督',
          message: '本季度人大监督活动已启动（第' + supervisionQuarter + '季度）',
        });
      }
    }

    // ===== 乡镇数据月度同步（让静态数据活起来） =====
    this._syncTownData();

    // ===== 社会系统v3月度更新（含信访月报） =====
    var socialSys = this.getSystem('social');
    if (socialSys && socialSys.petition && socialSys.petition.monthlyUpdate) {
      socialSys.petition.monthlyUpdate(timeSystem.month, timeSystem.year);
    }

    // ===== 上级关系系统月度更新 =====
    var superiorSys = this.getSystem('superiorRelations');
    if (superiorSys && superiorSys.monthlyUpdate) {
      superiorSys.monthlyUpdate(timeSystem.month, timeSystem.year);
    }
  }

  /** 同步乡镇数据：将死数据连接到活的游戏系统 */
  _syncTownData() {
    var county = stateManager.get('county');
    var towns = county?.towns || [];
    var finance = stateManager.get('finance');
    var social = stateManager.get('social');
    if (towns.length === 0) return;

    var countyTension = county.socialTension || 0;

    for (var ti = 0; ti < towns.length; ti++) {
      var t = towns[ti];
      var sectors = t.sectors || [];

      // GDP 由 EconomicSystem.monthlyUpdate 已经同步了，勿重复

      // 稳定度 = 70% 经济健康 + 30% 社会张力逆指标
      var localEcoHealth = Math.max(20, 100 - (county.socialTension || 0) * 0.5 + ((county.economy.gdpGrowth || 0) * 100));
      var newStability = Math.round(localEcoHealth * 0.7 + (100 - countyTension) * 0.3);
      t.stability = calculator.clamp(newStability, 10, 100);

      // 满意度 = 50% 经济健康 + 30% 就业率 + 20% 基础
      var employRate = county.population?.employmentRate || 0.6;
      var newSat = Math.round(localEcoHealth * 0.5 + employRate * 100 * 0.3 + 20);
      t.satisfaction = calculator.clamp(newSat, 10, 100);
    }
  }

  // ========== 派系提案事件系统 ==========

  /** 提案池：各派系因具体事情找书记要钱 */
  get PROPOSAL_POOL() {
    return [
      { faction: 'local', name: '乡镇道路修缮', desc: '本土系提出：赵家庄等三个村的通村公路路面破损严重，雨季无法通车，群众意见很大。', cost: 280, domain: 'livelihood' },
      { faction: 'local', name: '农田水利维修', desc: '农业农村局报告：两个乡镇的灌溉渠年久失修，影响春耕灌溉。', cost: 180, domain: 'livelihood' },
      { faction: 'local', name: '老旧小区改造', desc: '住建局提出：县城三个老旧小区的水电管网需更新，居民多次上访。', cost: 350, domain: 'livelihood' },
      { faction: 'magistrate', name: '工业园区扩容', desc: '县长提出：目前工业园区入驻率已达90%，需要扩建二期，吸引更多企业。', cost: 600, domain: 'economy' },
      { faction: 'magistrate', name: '招商引资经费', desc: '常务副县长报告：下半年有两次省级招商会，需要专项经费。', cost: 200, domain: 'economy' },
      { faction: 'magistrate', name: '县城主干道翻修', desc: '交通局提出：县城迎宾大道投入使用已10年，路面开裂需要大修。', cost: 500, domain: 'economy' },
      { faction: 'appointed', name: '廉政教育中心', desc: '纪委提出：省市要求各县建设标准化廉政教育基地，限期半年内完成。', cost: 150, domain: 'party' },
      { faction: 'appointed', name: '审计信息化平台', desc: '审计局报告：省审计厅要求2026年底前完成县级审计信息化建设。', cost: 120, domain: 'party' },
      { faction: 'appointed', name: '环保督察整改', desc: '市环保督察组反馈：县污水处理厂排放不达标，限期三个月内整改。', cost: 400, domain: 'economy' },
      { faction: 'bureaucrat', name: '智慧警务升级', desc: '公安局提出：现有监控系统覆盖不足，盗窃案件破案率偏低，需要增补设备。', cost: 250, domain: 'stability' },
      { faction: 'bureaucrat', name: '学校危房改造', desc: '教育局报告：两所乡镇小学的教学楼经鉴定为C级危房，需要加固或重建。', cost: 300, domain: 'livelihood' },
      { faction: 'bureaucrat', name: '信访接待中心', desc: '信访局提出：现有接待场所狭小，群体访时秩序混乱，需要扩建。', cost: 160, domain: 'stability' },
      { faction: 'secretary', name: '党建示范点建设', desc: '组织部提出：市委要求每个县打造2-3个基层党建示范点，需要配套资金。', cost: 100, domain: 'party' },
      { faction: 'secretary', name: '党校信息化改造', desc: '县委办提出：党校多媒体教室设备老化，无法承接市级培训任务。', cost: 80, domain: 'party' },
    ];
  }

  /** 每周随机检查是否触发派系提案 */
  _checkFactionProposal() {
    // 已有待处理的提案，不重复触发
    if (this._pendingProposal) return;
    // 国库余额太低时不触发
    var finance = stateManager.get('finance');
    if (!finance || (finance.treasuryBalance || 0) < 300) return;
    // 约5%概率/周（≈平均每20周触发一次≈每季度一次）
    if (Math.random() > 0.05) return;

    // 随机选取一个提案
    var pool = this.PROPOSAL_POOL;
    var proposal = pool[Math.floor(Math.random() * pool.length)];
    var factionSys = this.getSystem('factions');
    if (!factionSys) return;
    var factions = factionSys.getAllFactions();
    var propFaction = factions[proposal.faction];
    if (!propFaction || !propFaction.members || propFaction.members.length === 0) return;

    // 随机选该派系的一位成员作为提出者
    var personnel = this.getSystem('personnel');
    var proposerId = propFaction.members[Math.floor(Math.random() * propFaction.members.length)];
    var proposer = personnel ? personnel.get(proposerId) : null;
    var proposerName = proposer ? proposer.name : propFaction.name;

    this._pendingProposal = {
      faction: proposal.faction,
      factionName: propFaction.name,
      factionColor: propFaction.color,
      name: proposal.name,
      desc: proposal.desc,
      cost: proposal.cost,
      domain: proposal.domain,
      proposer: proposerName,
    };

    // 弹出决策弹窗
    this._showProposalModal();
  }

  /** 显示提案决策弹窗（含拖动条） */
  _showProposalModal() {
    if (!this._pendingProposal) return;
    var pp = this._pendingProposal;
    var finance = stateManager.get('finance');
    var available = finance ? Math.round((finance.treasuryBalance || 0) * 0.05) : 500;
    var max = Math.min(pp.cost, available);
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.innerHTML = '<div class="modal-card" style="max-width:500px;"><div class="mc-header"><span class="mc-icon">📋</span><span class="mc-title">' + pp.name + '</span><button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\');gameEngine._pendingProposal=null">✕</button></div>' +
      '<div class="mc-body">' +
        // 谁提出的
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:11px;">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + (pp.factionColor || '#999') + ';"></span>' +
          '<span style="color:var(--text-secondary);">' + pp.proposer + '（' + pp.factionName + '）提出</span>' +
        '</div>' +
        // 描述
        '<div style="font-size:12px;color:var(--text-primary);margin-bottom:12px;padding:8px;background:var(--bg-secondary);border-radius:6px;">' + pp.desc + '</div>' +
        // 金额信息
        '<div style="font-size:12px;margin-bottom:6px;">申请金额：<strong>' + pp.cost + '万</strong></div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">国库余额：' + (finance ? finance.treasuryBalance.toFixed(0) : '?') + '万 · 可支配：' + available + '万</div>' +
        // 拖动条
        '<div style="margin-bottom:6px;">' +
          '<input type="range" id="prop-slider" min="0" max="' + max + '" value="' + Math.round(max * 0.5) + '" style="width:100%;"' +
          ' oninput="document.getElementById(\'prop-val\').textContent=this.value+\'万\'">' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<span style="font-size:11px;color:var(--text-muted);">0万</span>' +
          '<span id="prop-val" style="font-size:18px;font-weight:600;color:var(--accent-blue);">' + Math.round(max * 0.5) + '万</span>' +
          '<span style="font-size:11px;color:var(--text-muted);">' + max + '万</span>' +
        '</div>' +
        // 操作按钮
        '<div style="display:flex;gap:8px;">' +
          '<button class="fd-action-btn" onclick="gameEngine._applyProposal()" style="flex:2;background:var(--accent-blue);color:#fff;border-color:var(--accent-blue);">✅ 批准拨款</button>' +
          '<button class="fd-action-btn" onclick="gameEngine._rejectProposal()" style="flex:1;border-color:var(--accent-red);color:var(--accent-red);">❌ 否决</button>' +
        '</div>' +
      '</div></div>';
  }

  /** 执行提案拨款 */
  _applyProposal() {
    var pp = this._pendingProposal;
    if (!pp) return;
    this._pendingProposal = null;

    var slider = document.getElementById('prop-slider');
    var amount = slider ? parseInt(slider.value) || 0 : 0;
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    var finance = stateManager.get('finance');
    if (!finance) return;

    // 扣钱
    var actualAmount = Math.min(amount, finance.treasuryBalance || 0);
    finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - actualAmount);

    // 计算满足比例
    var ratio = pp.cost > 0 ? actualAmount / pp.cost : 0;

    // 派系反应
    var factionSys = this.getSystem('factions');
    var personnel = this.getSystem('personnel');
    if (factionSys) {
      if (ratio >= 0.9) {
        factionSys.modifyRelation(pp.faction, 'secretary', 5);
        // 全派系忠诚上升
        var f = factionSys.getAllFactions()[pp.faction];
        if (f && personnel) {
          for (var mi = 0; mi < (f.members || []).length; mi++) {
            var off = personnel.get(f.members[mi]);
            if (off) off._loyalty = Math.min(100, (off._loyalty || 50) + 2);
          }
        }
      } else if (ratio >= 0.5) {
        factionSys.modifyRelation(pp.faction, 'secretary', 2);
      } else if (ratio > 0) {
        factionSys.modifyRelation(pp.faction, 'secretary', -2);
      } else {
        factionSys.modifyRelation(pp.faction, 'secretary', -5); // 否决
      }
    }

    // 社会效果
    var county = stateManager.get('county');
    if (county) {
      if (pp.domain === 'livelihood' && ratio > 0.5) {
        this._modifyTension(county, -ratio * 3);
      } else if (pp.domain === 'stability' && ratio > 0.5) {
        this._modifyTension(county, -ratio * 2);
      } else if (pp.domain === 'economy' && county.economy) {
        county.economy.economicVitality = (county.economy.economicVitality || 50) + ratio * 2;
      }
    }

    var ratioLabel = ratio >= 0.9 ? '全额满足' : ratio >= 0.5 ? '部分满足' : ratio > 0 ? '勉强' : '否决';
    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('important', '派系提案', pp.proposer + '提出"' + pp.name + '"（申请' + pp.cost + '万）→ ' + ratioLabel + '（实拨' + actualAmount + '万）');
      uiManager.showToast(ratioLabel + '：' + pp.name + '（' + actualAmount + '万）', ratio >= 0.5 ? 'success' : 'warning');
    }
  }

  /** 否决提案 */
  _rejectProposal() {
    var pp = this._pendingProposal;
    if (!pp) return;
    // 把金额设为0来调用apply
    this._pendingProposal = pp;
    // 临时设置slider值为0触发否决流程
    var slider = document.getElementById('prop-slider');
    if (slider) slider.value = '0';
    this._applyProposal();
  }

  /** 年度更新 */
  _yearlyUpdate() {
    const evaluation = this.getSystem('evaluation');
    if (evaluation) evaluation.annualReview();

    // 年度叙事检查
    const narrativeSys = this.getSystem('narrative');
    if (narrativeSys) {
      narrativeSys.yearlyUpdate();
    }

    // 每年1月触发预算审议
    if (timeSystem.month === 1) {
      const finance = stateManager.get('finance');
      if (finance) {
        finance.budgetApproved = false; // 每年初重置预算状态
        eventBus.emit(EVENTS.BUDGET_REVIEW, { year: timeSystem.year });
      }
    }

    if (timeSystem.termYear > 5) {
      this._endGame({ reason: 'term_end', description: '五年任期已满，上级组织部门启动换届程序。' });
      return;
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '年度更替',
      message: `进入${timeSystem.year}年（任内第${timeSystem.termYear}年）`,
    });
  }

  _generateWeeklyBrief() {
    const monthNames = ['','一月','二月','三月','四月','五月','六月',
                        '七月','八月','九月','十月','十一月','十二月'];
    const brief = {
      date: `${timeSystem.year}年${monthNames[timeSystem.month]}第${Math.ceil(timeSystem.day/7)}周`,
      turn: this.turnCount,
      weather: ['晴','多云','阴','小雨','中雨','大风'][Math.floor(Math.random() * 6)],
      gdpGrowth: stateManager.get('county')?.economy?.gdpGrowth || 0,
      socialTension: stateManager.get('county')?.socialTension || 0,
      fiscalHealth: stateManager.get('finance')?.fiscalHealth || 0,
      playerEnergy: stateManager.get('player')?.status?.energy || 0,
      playerStress: stateManager.get('player')?.status?.stress || 0,
    };
    stateManager.set('weeklyBrief', brief);
  }

  /** 推进一周 —— 回合制：收集事件→处理→结算 */
  advance() {
    if (!this.running) return;

    if (this._weeklyPhase === 'idle') {
      // 准备本周事件，但不强制弹窗处理——转入办公室页面
      this._prepareWeeklyEvents();
      // 直接推进（事件留在active列表中，从办公室页面处理）
      this._doAdvance();
      return;
    }

    if (this._weeklyPhase === 'events') {
      // 处理完当前事件，看还有没有下一个
      this._currentEventIdx++;
      if (this._currentEventIdx < this.weeklyEvents.length) {
        eventBus.emit(EVENTS.WEEKLY_EVENTS, {
          events: this.weeklyEvents,
          index: this._currentEventIdx,
          focus: this.focusAreas,
        });
      } else {
        // 所有事件处理完毕 → 推进
        this._doAdvance();
      }
      return;
    }

    // fallback：如果状态异常，强行推进
    this._doAdvance();
  }

  /** 设置本周关注领域（由UIManager在选择后调用） */
  setFocus(areas) {
    this.focusAreas = areas;
    this._weeklyPhase = 'focus';
    // 记录日志
    const labels = { economicDevelopment: '经济发展', socialStability: '社会稳定',
      peopleLivelihood: '民生建设', partyConstruction: '党的建设' };
    const labelStr = areas.map(a => labels[a] || a).join('、');
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '本周关注',
      message: `本周重点关注：${labelStr}`,
    });
  }

  /** 确认当前事件已处理，推进到下一步 */
  confirmEvent() {
    if (this._weeklyPhase === 'events') {
      this._currentEventIdx++;
      if (this._currentEventIdx < this.weeklyEvents.length) {
        eventBus.emit(EVENTS.WEEKLY_EVENTS, {
          events: this.weeklyEvents,
          index: this._currentEventIdx,
          focus: this.focusAreas,
        });
      } else {
        this._weeklyPhase = 'done';
        eventBus.emit(EVENTS.WEEKLY_ADVANCE, {});
      }
    }
  }

  /** 准备本周待处理事件——暂冻结 */
  _prepareWeeklyEvents() {
    this.weeklyEvents = [];
    this._filePool = [];
  }

  /** 实际推进时间 */
  _doAdvance() {
    this._weeklyPhase = 'idle';
    this.focusAreas = [];
    this.weeklyEvents = [];
    this._currentEventIdx = 0;

    timeSystem.skipDays(7);
    this._enterWeek();

    // 自动存档（存入auto槽）
    try { localStorage.setItem('xianzhi_save_auto', JSON.stringify({
      timestamp: Date.now(), version: '0.17.1', time: timeSystem.serialize(),
      turnCount: this.turnCount,
      state: stateManager.snapshot(),
      social: this.getSystem('social') ? this.getSystem('social').serialize() : null,
      _extra: { filePool: this._filePool },
    })); } catch(e) {/* ignore auto-save failure */}

    // 推进后如果还有事件，留在面板中显示
    const evtSys = this.getSystem('event');
    const active = evtSys?.getActiveEvents?.() || [];
    if (active.length > 0) {
      // 不要直接弹，让UI更新后展示
    }
  }

  getFocusOptions() {
    return ['economicDevelopment', 'socialStability', 'peopleLivelihood', 'partyConstruction'];
  }

  _getFocusOptions() {
    return this.getFocusOptions();
  }

  /** 设置年度治理路线 */
  setStrategy(strategy) {
    if (GameEngine.STRATEGIES[strategy]) {
      this.currentStrategy = strategy;
      const s = GameEngine.STRATEGIES[strategy];
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'important', title: '年度路线',
        message: `确定治理路线：${s.icon} ${s.name} — ${s.desc}`,
      });
    }
  }

  /** 获取路线对状态的月度修正 */
  getStrategyModifiers() {
    if (!this.currentStrategy) return {};
    const s = GameEngine.STRATEGIES[this.currentStrategy];
    if (!s) return {};
    const mods = {};
    if (s.effects.ecoBoost) mods.economicVitality = s.effects.ecoBoost;
    if (s.effects.stbPenalty) mods.stabilityShift = s.effects.stbPenalty;
    if (s.effects.stbBoost) mods.stabilityShift = s.effects.stbBoost;
    if (s.effects.fiscalPressure) mods.fiscalPressure = s.effects.fiscalPressure;
    if (s.effects.fiscalPenalty) mods.fiscalPenalty = s.effects.fiscalPenalty;
    if (s.effects.longTermEco) mods.economicVitality = (mods.economicVitality || 0) + s.effects.longTermEco;
    if (s.effects.pcapBoost) mods.politicalCapitalBoost = s.effects.pcapBoost;
    if (s.effects.superiorBoost) mods.superiorBoost = s.effects.superiorBoost;
    if (s.effects.superiorGrowth) mods.superiorGrowth = s.effects.superiorGrowth;
    return mods;
  }

  // ========== 存档/读档（v2：多槽+SocialSystem序列化+自动存档） ==========

  save(slot) {
    slot = slot || 1;
    if (slot < 1 || slot > this.SAVE_SLOTS) return false;
    try {
      var saveData = {
        timestamp: Date.now(),
        version: '0.17.1',
        time: timeSystem.serialize(),
        turnCount: this.turnCount,
        state: stateManager.snapshot(),
        // SocialSystem 完整状态
        social: this.getSystem('social') ? this.getSystem('social').serialize() : null,
        // 叙事系统状态
        narrative: this.getSystem('narrative') ? this.getSystem('narrative').serialize() : null,
        _extra: { filePool: this._filePool },
      };
      localStorage.setItem('xianzhi_save_' + slot, JSON.stringify(saveData));
      return true;
    } catch (e) { console.error('[Save] failed:', e); return false; }
  }

  /** 获取所有存档信息（用于UI展示） */
  getSaveInfo() {
    var result = [];
    for (var s = 1; s <= this.SAVE_SLOTS; s++) {
      try {
        var raw = localStorage.getItem('xianzhi_save_' + s);
        if (!raw) { result.push({ slot: s, exists: false }); continue; }
        var data = JSON.parse(raw);
        var timeStr = '';
        if (data.time) timeStr = data.time.year + '年' + (data.time.month || 1) + '月';
        var state = data.state || {};
        var county = state.county || {};
        var player = state.player || {};
        var finance = state.finance || {};
        result.push({
          slot: s, exists: true,
          timestamp: data.timestamp,
          timeStr: timeStr,
          turnCount: data.turnCount || 0,
          version: data.version || '?',
          gdp: county.economy ? (county.economy.gdpGrowth || 0) : 0,
          tension: county.socialTension || 0,
          treasury: finance ? (finance.treasuryBalance || 0) : 0,
          playerName: player.name || '书记',
          playerAge: player.age || 0,
        });
      } catch(e) { result.push({ slot: s, exists: false }); }
    }
    return result;
  }

  /** 删除存档 */
  deleteSave(slot) {
    localStorage.removeItem('xianzhi_save_' + slot);
  }

  load(slot) {
    slot = slot || 1;
    try {
      var raw = localStorage.getItem('xianzhi_save_' + slot);
      if (!raw) return false;
      var data = JSON.parse(raw);
      timeSystem.deserialize(data.time);
      this.turnCount = data.turnCount || 0;
      this._lastMonth = data.time.month;
      this._lastYear = data.time.year;

      // 加载纯数据到 state
      stateManager.load(data.state);

      // 手动恢复关键类实例
      var countyData = stateManager.get('county');
      var playerData = stateManager.get('player');
      var financeData = stateManager.get('finance');
      if (countyData && countyData.constructor !== County) {
        var newCounty = new County(countyData);
        Object.assign(newCounty, countyData);
        stateManager._state['county'] = newCounty;
      }
      if (playerData && playerData.constructor !== Player) {
        var newPlayer = new Player(playerData);
        Object.assign(newPlayer, playerData);
        stateManager._state['player'] = newPlayer;
      }
      if (financeData && financeData.constructor !== Finance) {
        var newFinance = new Finance(financeData);
        Object.assign(newFinance, financeData);
        stateManager._state['finance'] = newFinance;
      }

      // 恢复经济数据
      const ecoData = stateManager.get('economicData');
      if (ecoData && ecoData.constructor !== EconomicData) {
        const newEco = new EconomicData(ecoData);
        Object.assign(newEco, ecoData);
        stateManager._state['economicData'] = newEco;
      }

      // 恢复干部
      const personnelSys = this.getSystem('personnel');
      if (personnelSys) {
        personnelSys.restoreFromState(stateManager.get('personnel'));
      }

      // 恢复派系关系系统
      const factionSys = this.getSystem('factions');
      if (factionSys) {
        factionSys.restoreFromState(stateManager.get('factions'));
        factionSys._syncMembers(); // 基于恢复后的干部数据同步成员
      }

      // 恢复社会系统（群体grievance/mobilization + 舆论）
      const socialSys = this.getSystem('social');
      if (socialSys && data.social) {
        socialSys.deserialize(data.social);
        socialSys._syncState(); // 同步到stateManager
      }

      // 同步常委关系到Player（读档后重新对齐）
      const player = stateManager.get('player');
      if (player && personnelSys) {
        const members = personnelSys.getCommitteeMembers();
        for (const m of members) {
          if (!player.relations.committeeMembers) player.relations.committeeMembers = {};
          player.relations.committeeMembers[m.id] = m.relations.player || 50;
        }
      }

      // 恢复文件池
      this._filePool = data._extra?.filePool || [];

      // 恢复叙事系统
      const narrativeSys = this.getSystem('narrative');
      if (narrativeSys && data.narrative) {
        narrativeSys.deserialize(data.narrative);
      }

      return true;
    } catch (e) {
      console.error('[GameEngine] Load failed:', e);
      return false;
    }
  }

  _setupListeners() {
    // 清除旧监听器防重复注册
    if (this._cleanupListener) this._cleanupListener();
    this._cleanupListener = eventBus.on(EVENTS.YEAR_CHANGE, (data) => {
      if (data.termYear > 5) this._endGame({ reason: 'term_end' });
    });
  }

  _endGame(data) {
    this.running = false;
    const reason = data?.reason || 'term_end';
    const description = data?.description || '';

    // 计算晋升结果（正常结束才有效）
    const evalSys = this.getSystem('evaluation');
    const promotion = (reason === 'term_end' && evalSys) ? evalSys.calcPromotion() : null;

    // 生成叙事结局
    const narrativeSys = this.getSystem('narrative');
    const epilogue = narrativeSys ? narrativeSys.generateEpilogue() : null;

    eventBus.emit(EVENTS.GAME_OVER, {
      reason,
      description,
      evaluation: stateManager.get('evaluation'),
      promotion,
      player: stateManager.get('player'),
      county: stateManager.get('county'),
      turn: this.turnCount,
      epilogue,  // 新增: 叙事结局数据
    });
  }
}

// 全局历史记录器（记录每月关键指标用于图表展示）
const historyRecorder = new HistoryRecorder();
window.historyRecorder = historyRecorder; // 暴露给UI图表

const gameEngine = new GameEngine();
