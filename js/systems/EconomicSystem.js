/**
 * EconomicSystem - 统一经济系统
 * =====================================
 * 整合原 EconomicSystem（GDP/税基/增长）+ FinanceSystem（财政/杠杆）
 * 简化：一个系统，两个注册名（economy / finance），一套数据流
 *
 * 数据模型：
 *   - County.economy — GDP/三产比例/活力
 *   - Finance (stateManager: 'finance') — 国库/收支/预算/债务
 *   - EconomicData (stateManager: 'economicData') — CPI/PPI/外贸
 */
class EconomicSystem {
  constructor() {
    this.engine = null;
    this.economy = null;
  }

  init(config) {
    const diff = config.difficulty || {};

    // ——— 建立 Finance 数据模型 ———
    const finance = new Finance(this._deriveFinanceConfig(diff));
    stateManager.register('finance', finance);

    // ——— 建立 EconomicData ———
    this.economy = new EconomicData(diff.economy || {});
    stateManager.register('economicData', this.economy);

    this._initEnterprises();
    this._logGDPReport('初始');

    // 年度监听
    eventBus.on(EVENTS.YEAR_CHANGE, () => {
      const fin = stateManager.get('finance');
      if (fin) fin.yearlySettlement();
      eventBus.emit(EVENTS.FINANCE_YEARLY, { year: timeSystem?.year || 2026 });
    });
  }

  // =====================================================================
  //  经济核心
  // =====================================================================

  /**
   * 月度经济更新——从年度GDP推导月度值
   * 只在月边界调用一次
   */
  monthlyUpdate(month) {
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    if (!county || !player) return null;

    const economyPolicy = ((player.abilities?.economy ?? 50) - 50) / 50;
    const growthRate = county.economy.gdpGrowth || 0.05;

    const agRatio  = county.economy.agricultureRatio ?? 0.30;
    const indRatio = county.economy.industrialRatio ?? 0.35;
    const svRatio  = county.economy.serviceRatio ?? 0.35;

    const annualGDP = county.economy.gdp || 1200000;
    const baseGdpMonthly = annualGDP / 12;
    const baseAg  = baseGdpMonthly * agRatio;
    const baseInd = baseGdpMonthly * indRatio;
    const baseSv  = baseGdpMonthly * svRatio;

    const policyMod = 1 + economyPolicy * 0.1;
    const growthMod = 1 + growthRate;
    const marketShock = 1 + (Math.random() - 0.5) * 0.1;
    const disaster = county.socialTension > 70 ? 0.15 : 0;
    const mod = policyMod * growthMod * marketShock * (1 - disaster);

    const agOutput  = Math.round(baseAg * mod);
    const indOutput = Math.round(baseInd * mod);
    const svOutput  = Math.round(baseSv * mod);
    const totalOutput = agOutput + indOutput + svOutput;

    // GDP核算：三驾马车 Y = C + I + G + NX
    const popData = stateManager.get('population');
    const consumptionC = popData && typeof popData.calcTotalConsumption === 'function'
      ? popData.calcTotalConsumption()
      : Math.round(totalOutput * 0.35);

    const totalProfit = Math.round(indOutput * 0.20 + svOutput * 0.25);
    const reinvestRate = 0.4 + growthRate * 0.5;
    const enterpriseInvestment = Math.round(totalProfit * reinvestRate);
    const fin = stateManager.get('finance');
    const govInfrastructure = fin
      ? Math.round((fin.monthlyExpense || 0) * 0.20) : 5000;
    const investmentI = enterpriseInvestment + govInfrastructure;
    const govExpenseG = fin ? Math.round((fin.monthlyExpense || 0) * 0.6) : 10000;
    const tradeData = this.economy?.foreignTrade || { total: 118600, export: 113900, import: 4700 };
    const netExportNX = Math.round(((tradeData.export || 0) - (tradeData.import || 0)) / 12);
    const gdpCIGNX = consumptionC + investmentI + govExpenseG + netExportNX;

    // 税基
    const taxBase = {
      industrialSales: Math.round(indOutput),
      serviceRevenue: Math.round(svOutput * 0.6),
      corporateProfit: Math.round(indOutput * 0.15 + svOutput * 0.10),
      totalTaxBase: Math.round(indOutput + svOutput * 0.6),
    };

    // 同步到County（保留年值）
    const monthlyGrowthRate = (gdpCIGNX - baseGdpMonthly) / (baseGdpMonthly || 1);
    const annualizedGrowth = monthlyGrowthRate * 12;
    const smoothedGrowth = calculator.clamp(growthRate * 0.7 + annualizedGrowth * 0.3, -0.05, 0.15);
    county.economy.gdpGrowth = smoothedGrowth;
    county.economy.gdp = Math.round(annualGDP * (1 + smoothedGrowth / 12));
    county.economy._monthlyGDP = gdpCIGNX;
    county.economy.industrialRatio = indRatio;
    county.economy.agricultureRatio = agRatio;
    county.economy.serviceRatio = svRatio;

    for (const town of county.towns) {
      town.gdp = Math.round(gdpCIGNX / county.towns.length);
    }

    // 就业
    const totalEmp = 250000;
    if (county.population) {
      county.population.employmentRate = calculator.clamp(
        totalEmp / Math.max(1, (county.population.total || 500000) * 0.6), 0, 1);
      county.population.urbanRatio = svRatio * 0.6 + indRatio * 0.3;
      county.population.ruralRatio = 1 - county.population.urbanRatio;
    }

    // CPI
    if (this.economy) {
      const annualGrowth = county.economy.gdpGrowth || 0.05;
      const cpiDrift = (annualGrowth - 0.05) * 0.2;
      this.economy.cpi += (Math.random() - 0.5) * 0.05 + cpiDrift;
      this.economy.cpi = calculator.clamp(this.economy.cpi, 97, 106);
    }

    if (county.economy.gdpGrowth < 0.01) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '📉 经济增长放缓',
        message: `GDP增速仅${(county.economy.gdpGrowth * 100).toFixed(1)}%，建议出台刺激措施`,
      });
    }

    return taxBase;
  }

  /**
   * 每周经济微调
   */
  weeklyTick() {
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    if (!county?.economy) return;

    // GDP小噪音
    const noise = 1 + (Math.random() - 0.5) * 0.001;
    county.economy.gdp = Math.round((county.economy.gdp || 1200000) * noise);

    // 经济活力
    county.economy.economicVitality = calculator.clamp(
      (county.economy.economicVitality || 50) + (Math.random() - 0.5) * 0.3, 0, 100
    );

    // 企业微调
    if (this.enterprises) {
      for (const ent of this.enterprises) {
        if (ent.annualOutput) {
          ent.annualOutput = Math.round(ent.annualOutput * (1 + (Math.random() - 0.5) * 0.002));
        }
      }
    }

    // 征收率张力
    if (finance?.collectRate > 0.9) {
      county.modifyTension?.(0.075);
    }
  }

  // =====================================================================
  //  财政核心
  // =====================================================================

  /** 月度财政结算 */
  monthlySettlement() {
    const finance = stateManager.get('finance');
    const county = stateManager.get('county');
    if (!finance || !county) return;

    const taxBase = this.getTaxBaseForFinance();

    finance.calcMonthlyIncome(taxBase);
    const expParams = this._getExpenseParams(county);
    finance.calcMonthlyExpense(expParams);

    // 转移支付加成递减
    if (finance.lobbyBoostMonths > 0) {
      finance.lobbyBoostMonths--;
      if (finance.lobbyBoostMonths === 0) {
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'info', title: '📉 转移支付加成到期', message: '争取到的追加拨款已执行完毕',
        });
      }
    }

    const result = finance.monthlySettlement();

    if (finance.fiscalHealth < 40) {
      eventBus.emit(EVENTS.FINANCE_WARNING, {
        level: '危机', health: finance.fiscalHealth,
        message: '财政状况危急，可能无法按时发工资',
      });
    }

    eventBus.emit(EVENTS.FINANCE_MONTHLY, result);
    return result;
  }

  _getExpenseParams(county) {
    const finance = stateManager.get('finance');
    const pop = county.population || {};
    const eco = county.economy || {};
    const totalPop = pop.total || 500000;
    const staffCount = 7000 + Math.round(totalPop / 100000) * 200;
    const gdpGrowth = eco.gdpGrowth || 0.05;
    const avgSalaryWan = 6.5 + gdpGrowth * 2;

    const austerityLevel = finance?.austerityLevel || 0;
    const austerityMult = [1.0, 0.85, 0.70][austerityLevel] || 1.0;
    const operatingBase = Math.round(staffCount * 1.2 * austerityMult);
    const budgetProject = finance?.budget?.project || Math.round(eco.gdp * 0.04);
    const projectBaseAnnual = budgetProject;
    const projectProgress = Math.min(1, 0.5 + (county.socialTension < 50 ? 0.1 : -0.1));

    return { staffCount, avgSalaryWan, operatingBase, projectBase: projectBaseAnnual, projectProgress };
  }

  /** 获取税基 */
  getTaxBaseForFinance() {
    const county = stateManager.get('county');
    if (!county) return this.economy?.getTaxBase() || null;

    const baseGdpMonthly = (county.economy.gdp || 1200000) / 12;
    const indRatio = county.economy.industrialRatio ?? 0.35;
    const svRatio = county.economy.serviceRatio ?? 0.35;
    const indOut = baseGdpMonthly * indRatio;
    const svRev = baseGdpMonthly * svRatio;

    return {
      industrialSales: Math.round(indOut),
      serviceRevenue: Math.round(svRev * 0.6),
      corporateProfit: Math.round(indOut * 0.15 + svRev * 0.10),
      totalTaxBase: Math.round(indOut + svRev * 0.6),
    };
  }

  // =====================================================================
  //  财政杠杆（玩家操作）
  // =====================================================================

  /** 征收率滑块 */
  setCollectRate(rate) {
    const finance = stateManager.get('finance');
    if (!finance) return false;
    finance.collectRate = calculator.clamp(rate || 0.75, 0.3, 1.0);
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return true;
  }

  /** 预算科目调剂 */
  reallocateBudget(fromKey, toKey, pct) {
    const finance = stateManager.get('finance');
    const county = stateManager.get('county');
    if (!finance || !county) return { ok: false, msg: '数据异常' };
    if (!finance.budget[fromKey] || !finance.budget[toKey]) return { ok: false, msg: '无效科目' };
    if (pct <= 0 || pct > 50) return { ok: false, msg: '调剂比例需在1-50%之间' };

    const amount = Math.round(finance.budget[fromKey] * pct / 100);
    if (amount <= 0) return { ok: false, msg: '金额太小' };
    if (amount > finance.budget[fromKey] * 0.5) return { ok: false, msg: '单次调出不得超过原预算50%' };

    finance.budget[fromKey] -= amount;
    finance.budget[toKey] += amount;

    var labelMap = { personnel: '人员经费', operating: '公用经费', project: '项目支出', reserve: '预备费' };
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '✏ 预算调剂',
      message: labelMap[fromKey] + '→' + labelMap[toKey] + '：' + amount.toLocaleString() + '万',
    });

    if (fromKey === 'operating' && county.institution) {
      county.institution.bureaucracyEfficiency = Math.max(20,
        (county.institution.bureaucracyEfficiency || 55) - Math.round(pct * 0.3));
    }

    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return { ok: true, msg: labelMap[fromKey] + '调出' + amount.toLocaleString() + '万→' + labelMap[toKey] };
  }

  /** 节俭令 */
  toggleAusterity() {
    const finance = stateManager.get('finance');
    if (!finance) return false;
    finance.austerityLevel = ((finance.austerityLevel || 0) + 1) % 3;
    var labels = ['正常', '紧缩', '极简'];
    var label = labels[finance.austerityLevel] || '正常';
    var descs = ['恢复正常支出', '公用经费-15%', '公用经费-30%（官僚效率下降）'];

    if (finance.austerityLevel >= 1) {
      var county = stateManager.get('county');
      if (county?.institution) {
        county.institution.bureaucracyEfficiency = Math.max(20,
          (county.institution.bureaucracyEfficiency || 55) - 5);
      }
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 节俭令：' + label,
      message: descs[finance.austerityLevel] || '',
    });
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return { level: finance.austerityLevel, label: label };
  }

  /** 跑部钱进 */
  lobbyForTransfer() {
    const finance = stateManager.get('finance');
    const county = stateManager.get('county');
    if (!finance || !county) return { ok: false, msg: '数据异常' };
    if (finance.lobbyBoostMonths > 0) return { ok: false, msg: '已有争取到的转移支付在执行中' };

    var supTrust = county.superiorTrust?.citySecretary || 50;
    if (supTrust < 30) return { ok: false, msg: '上级信任度太低（<30），跑部也没用' };

    var boost = 0.3;
    finance.transferAnnual.general = Math.round(finance.transferAnnual.general * (1 + boost));
    finance.lobbyBoostMonths = 6;
    county.superiorTrust.citySecretary = Math.max(10, supTrust - 15);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🏃 跑部钱进成功',
      message: '转移支付+30%，持续6个月（上级信任-15）',
    });
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return { ok: true, msg: '争取到转移支付+30%，持续6个月' };
  }

  /** 土地出让 */
  sellLand(plotId) {
    const finance = stateManager.get('finance');
    const county = stateManager.get('county');
    if (!finance || !county) return { ok: false, msg: '数据异常' };

    var plots = county.resources?.land?.developablePlots || [];
    var idx = plots.findIndex(function(p) { return p.id === plotId; });
    if (idx === -1) return { ok: false, msg: '该地块不存在或已出让' };

    var plot = plots[idx];
    var price = plot.size * 30 + Math.floor(Math.random() * 20) * plot.size;
    finance.treasuryBalance += price;

    plots.splice(idx, 1);

    finance.hiddenDebt = (finance.hiddenDebt || 0) + Math.round(price * 0.2);
    const totalDebt = (finance.publicDebt || 0) + (finance.hiddenDebt || 60000);
    const gdp = county.economy?.gdp || 1200000;
    finance.debtRate = Math.round(totalDebt / gdp * 100);

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🏗 土地出让',
      message: plot.location + plot.type + '用地 ' + plot.size + ' 公顷，收入' + price.toLocaleString() + '万（隐性债务+' + Math.round(price * 0.2).toLocaleString() + '万）',
    });
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    return { ok: true, msg: '土地出让收入' + price.toLocaleString() + '万' };
  }

  // =====================================================================
  //  查询接口
  // =====================================================================

  getMonthlyReport() {
    const county = stateManager.get('county');
    if (!county) return this.economy?.getGDPReport() ? {
      ...this.economy.getGDPReport(),
      employment: 500000, cpi: this.economy.cpi, ppi: this.economy.ppi,
      fixedInvestmentGrowth: 0.05, foreignTradeGrowth: 0.03, totalTax: 0,
    } : null;

    const gdp = county.economy.gdp || 1200000;
    const indR = county.economy.industrialRatio || 0.35;
    const agR = county.economy.agricultureRatio || 0.30;
    const svR = county.economy.serviceRatio || 0.35;
    const fiGrowth = (county.economy.gdpGrowth || 0.05) * 0.6;
    const ftGrowth = fiGrowth * 0.5 + (Math.random() - 0.5) * 0.03;

    return {
      total: gdp, agriculture: Math.round(gdp * agR), industry: Math.round(gdp * indR),
      services: Math.round(gdp * svR), agRatio: (agR * 100).toFixed(1),
      indRatio: (indR * 100).toFixed(1), svRatio: (svR * 100).toFixed(1),
      growthRate: county.economy.gdpGrowth || 0.05, employment: 250000,
      employmentBySector: { agriculture: 120000, industry: 80000, services: 50000, total: 250000 },
      cpi: this.economy?.cpi || 100.5, ppi: this.economy?.ppi || 99.8,
      fixedInvestmentGrowth: fiGrowth, foreignTradeGrowth: ftGrowth, totalTax: 0,
    };
  }

  getSummary() {
    const r = this.getMonthlyReport();
    if (!r) return null;
    return {
      gdp: r.total, gdpGrowth: r.growthRate,
      industrialRatio: parseFloat(r.indRatio) / 100,
      agricultureRatio: parseFloat(r.agRatio) / 100,
      serviceRatio: parseFloat(r.svRatio) / 100,
      status: r.growthRate > 0.08 ? '繁荣' : r.growthRate > 0.05 ? '正常' : r.growthRate > 0 ? '低迷' : '危机',
      enterpriseCount: this.enterprises.length,
      totalEmployment: r.employment, totalTax: r.totalTax || 0,
    };
  }

  getFinanceSummary() {
    const finance = stateManager.get('finance');
    if (!finance) return null;
    return {
      income: finance.monthlyIncome, expense: finance.monthlyExpense,
      balance: finance.monthlyBalance, treasury: finance.treasuryBalance,
      health: finance.fiscalHealth, debtRate: finance.debtRate,
      selfSufficiency: finance.selfSufficiency, collectRate: finance.collectRate,
      arrears: finance.arrearsMonths,
      austerityLevel: finance.austerityLevel || 0,
      lobbyBoostMonths: finance.lobbyBoostMonths || 0,
      status: finance.fiscalHealth > 80 ? '充裕' : finance.fiscalHealth > 60 ? '平衡' : finance.fiscalHealth > 40 ? '紧张' : '危机',
    };
  }

  getGDPDetail() { return this.getMonthlyReport(); }
  getEnterprises() { return this.enterprises; }
  getEnterprisesByType(type) { return this.enterprises.filter(e => e.type === type); }

  // =====================================================================
  //  内部
  // =====================================================================

  _deriveFinanceConfig(diff) {
    const countyCfg = diff.county || {};
    const economy = countyCfg.economy || { gdp: 1200000 };
    const popData = countyCfg.population || { total: 500000 };
    const burden = countyCfg.historicalBurden || {};
    const gdp = economy.gdp || 1200000;

    const treasuryBalance = Math.round(gdp * 0.007);
    const publicDebt = Math.round(gdp * 0.25);
    const hiddenDebt = burden.hiddenDebt || 60000;
    const transferAnnual = {
      general: Math.round(gdp * 0.05), special: Math.round(gdp * 0.015), taxReturn: Math.round(gdp * 0.005),
    };
    const nonTaxAnnual = {
      adminFees: Math.round(gdp * 0.002), fines: Math.round(gdp * 0.001), stateProfit: Math.round(gdp * 0.002),
    };
    const staffCount = 7000 + Math.round((popData.total || 500000) / 100000) * 200;
    const avgSalaryWan = 6.5;
    const personnelBudget = Math.round(staffCount * avgSalaryWan * 1.4);
    const operatingBudget = Math.round(staffCount * 1.2);
    const projectBudget = Math.round(gdp * 0.04);
    const reserveBudget = Math.round((personnelBudget + operatingBudget + projectBudget) * 0.04);

    return {
      treasuryBalance, publicDebt, hiddenDebt,
      transferAnnual, nonTaxAnnual,
      budget: { personnel: personnelBudget, operating: operatingBudget, project: projectBudget, reserve: reserveBudget },
      collectRate: 0.75, interestRate: 0.045,
      debtRate: Math.round((publicDebt + hiddenDebt) / gdp * 100),
      fiscalHealth: 100, austerityLevel: 0, lobbyBoostMonths: 0, activeProjects: [],
    };
  }

  _initEnterprises() {
    const entData = [
      { name: '正定农副食品加工厂', type: 'private', industry: '农副食品加工',
        employees: 1200, annualOutput: 85000, annualProfit: 4200, annualTax: 2100,
        debt: 3000, assets: 15000, stage: 'mature', pollution: 20, safetyRisk: 15,
        governmentRelation: 60, demands: ['融资支持', '市场开拓'] },
      { name: '正定纺织集团', type: 'state', industry: '纺织服装',
        employees: 1800, annualOutput: 62000, annualProfit: 2800, annualTax: 1500,
        debt: 8000, assets: 20000, stage: 'mature', pollution: 35, safetyRisk: 20,
        politicalSignificance: 70, reformResistance: 50, demands: ['设备更新补贴', '稳定用工'] },
      { name: '正定化工有限公司', type: 'private', industry: '化工制品',
        employees: 800, annualOutput: 48000, annualProfit: 3200, annualTax: 2000,
        debt: 5000, assets: 12000, stage: 'mature', pollution: 55, safetyRisk: 40,
        governmentRelation: 50, demands: ['环保指标放宽', '税收减免'] },
      { name: '正定机械制造厂', type: 'township', industry: '机械设备制造',
        employees: 1500, annualOutput: 72000, annualProfit: 5100, annualTax: 2800,
        debt: 4000, assets: 18000, stage: 'growth', pollution: 25, safetyRisk: 25,
        governmentRelation: 65, demands: ['技改资金', '人才引进'] },
      { name: '正定建材公司', type: 'private', industry: '建材生产',
        employees: 1000, annualOutput: 55000, annualProfit: 2500, annualTax: 1600,
        debt: 6000, assets: 10000, stage: 'decline', pollution: 60, safetyRisk: 50,
        governmentRelation: 45, demands: ['转型扶持', '环保宽松'] },
      { name: '正定电子科技', type: 'private', industry: '电子信息',
        employees: 600, annualOutput: 38000, annualProfit: 2800, annualTax: 1200,
        debt: 1500, assets: 8000, stage: 'growth', pollution: 10, safetyRisk: 8,
        governmentRelation: 70, demands: ['高新技术认证', '科研补贴'] },
    ];
    this.enterprises = entData.map(d => new Enterprise(d));
    stateManager.set('enterprises', this.enterprises.map(e => e.toJSON()));
  }

  _logGDPReport(label) {
    const r = this.getMonthlyReport();
    if (!r) return;
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: `📊 经济概况（${label}）`,
      message: `GDP:${(r.total / 10000).toFixed(1)}亿 | 三产:${r.agRatio}%/${r.indRatio}%/${r.svRatio}% | 增速:${(r.growthRate * 100).toFixed(1)}%`,
    });
  }
}
