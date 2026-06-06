/**
 * EconomicSector - 产业经济数据模型
 * 基于正定县2024年统计公报，2026年启动数据
 * 分三产建立细分行业模型，支持从底至上GDP计算
 */
class AgricultureSector {
  /**
   * @param {Object} data - 农业数据
   *   grainArea: 粮食播种面积(万亩)
   *   grainYield: 粮食总产量(万吨)
   *   cashCropArea: 经济作物面积(万亩)
   *   vegArea: 蔬菜面积(万亩)
   *   vegYield: 蔬菜产量(万吨)
   *   livestock: { pigs, poultry, cattle } 存栏(万头/万只)
   *   slaughter: { pigs, poultry, cattle } 出栏
   *   meatOutput: 肉类总产(万吨)
   *   eggOutput: 禽蛋(万吨)
   *   milkOutput: 奶类(万吨)
   *   totalValue: 农林牧渔业总产值(万元)
   *   addedValue: 农林牧渔业增加值(万元)
   *   industrialRate: 产业化经营率
   */
  constructor(data = {}) {
    // ——— 种植业 ———
    this.grain = {
      area: data.grainArea || 62.54,        // 万亩
      yield: data.grainYield || 29.12,      // 万吨
      unitPrice: data.grainPrice || 2400,   // 元/吨（市场价）
    };
    this.cashCrops = {
      area: data.cashCropArea || 3.37,
      yield: data.cashCropYield || 0,
      unitPrice: data.cashCropPrice || 5000,
    };
    this.vegetables = {
      area: data.vegArea || 13.79,
      yield: data.vegYield || 65.43,
      unitPrice: data.vegPrice || 3000,
    };

    // ——— 畜牧业 ———
    this.livestock = {
      pigs: { stock: data.livestock?.pigs?.stock ?? 10.86,  unit: '万头' },
      poultry: { stock: data.livestock?.poultry?.stock ?? 808.45, unit: '万只' },
      cattle: { stock: data.livestock?.cattle?.stock ?? 6.89, unit: '万头' },
    };
    this.slaughter = {
      pigs: data.slaughter?.pigs || 41.83,
      poultry: data.slaughter?.poultry || 1054.53,
      cattle: data.slaughter?.cattle || 5.12,
    };
    this.meatOutput = data.meatOutput || 5.66;     // 万吨
    this.eggOutput = data.eggOutput || 9.24;
    this.milkOutput = data.milkOutput || 9.37;

    // ——— 经济总量 ———
    this.totalValue = data.totalValue || 577700;    // 总产值(万元) 57.77亿
    this.addedValue = data.addedValue || 388700;    // 增加值(万元) 38.87亿
    this.addedValueGrowth = data.addedValueGrowth || 0.019; // 增加值同比增速
    this.industrialRate = data.industrialRate || 0.4898;    // 产业化经营率
    this.fertilizerUse = data.fertilizerUse || 3.22; // 化肥施用量(折纯万吨)

    // ——— 从业人员（估算） ———
    this.employment = data.employment || 85000;     // 农业从业人员基数
  }

  /** 计算农业总产值（万元） */
  calcTotalOutput() {
    const grainValue = this.grain.yield * this.grain.unitPrice / 10000;
    const vegValue = this.vegetables.yield * this.vegetables.unitPrice / 10000;
    const cashValue = this.cashCrops.yield * this.cashCrops.unitPrice / 10000;
    const meatValue = this.meatOutput * 18000;       // 均价1.8万/吨
    const eggValue = this.eggOutput * 15000;
    const milkValue = this.milkOutput * 5000;
    const other = this.totalValue - (grainValue + vegValue + cashValue + meatValue + eggValue + milkValue);
    return {
      grain: grainValue, vegetables: vegValue, cashCrops: cashValue,
      meat: meatValue, eggs: eggValue, milk: milkValue, other: Math.max(0, other),
      total: this.totalValue,
    };
  }

  /** 月度更新：农业生产受季节/政策/灾害影响 */
  monthlyUpdate(month, policyFactor = 0, disaster = 0) {
    // 季节波动（春夏秋冬）
    const seasonFactor = [0.02, 0.03, 0.05, 0.08, 0.12, 0.15,
                          0.18, 0.20, 0.12, 0.03, 0.01, 0.01];
    const sf = (seasonFactor[month - 1] || 0.05) - 0.08; // 月度贡献
    // 自然生长（年化约2% spread over 12 months）
    const growth = 0.0015 + sf * 0.01 + policyFactor * 0.002;
    const disasterEffect = -disaster * 0.01;
    const drift = growth + disasterEffect + (Math.random() - 0.5) * 0.002;
    this.addedValue = Math.max(350000, this.addedValue * (1 + drift));
    this.totalValue = Math.max(520000, this.totalValue * (1 + drift * 0.8));
    // 粮食产量微调
    this.grain.yield *= (1 + (Math.random() - 0.5) * 0.001);
    return drift;
  }

  toJSON() {
    return {
      grain: this.grain, cashCrops: this.cashCrops, vegetables: this.vegetables,
      livestock: this.livestock, slaughter: this.slaughter,
      meatOutput: this.meatOutput, eggOutput: this.eggOutput, milkOutput: this.milkOutput,
      totalValue: this.totalValue, addedValue: this.addedValue,
      addedValueGrowth: this.addedValueGrowth, industrialRate: this.industrialRate,
      employment: this.employment, fertilizerUse: this.fertilizerUse,
    };
  }
}

class IndustrySector {
  /**
   * @param {Object} data
   *   scaleAboveGrowth: 规上工业增加值增速
   *   constructionValue: 建筑业增加值(万元)
   *   subSectors: [{name, output, employees, profit, tax, pollution}]
   *   totalOutput: 工业总产值(万元)
   *   addedValue: 工业增加值(万元)
   */
  constructor(data = {}) {
    // 总体指标
    this.scaleAboveGrowth = data.scaleAboveGrowth || 0.091;  // 规上工业增速
    this.constructionValue = data.constructionValue || 208000; // 建筑业增加值(万元)
    this.constructionGrowth = data.constructionGrowth || -0.112; // 建筑业增速

    // 细分行业（以正定/类似县为模板）
    this.subSectors = data.subSectors || [
      { id: 'ind_food',    name: '农副食品加工',  output: 85000,  employees: 1200, profit: 4200,  tax: 2100,  pollution: 20, growth: 0.07 },
      { id: 'ind_textile', name: '纺织服装',       output: 62000,  employees: 1800, profit: 2800,  tax: 1500,  pollution: 35, growth: 0.03 },
      { id: 'ind_chem',    name: '化工制品',       output: 48000,  employees: 800,  profit: 3200,  tax: 2000,  pollution: 55, growth: 0.01 },
      { id: 'ind_machine', name: '机械设备制造',   output: 72000,  employees: 1500, profit: 5100,  tax: 2800,  pollution: 25, growth: 0.09 },
      { id: 'ind_building',name: '建材生产',       output: 55000,  employees: 1000, profit: 2500,  tax: 1600,  pollution: 60, growth: -0.02 },
      { id: 'ind_electron',name: '电子信息',       output: 38000,  employees: 600,  profit: 2800,  tax: 1200,  pollution: 10, growth: 0.15 },
      { id: 'ind_other',   name: '其他制造业',     output: 40000,  employees: 500,  profit: 2000,  tax: 1000,  pollution: 15, growth: 0.04 },
    ];

    // 统计汇总
    this.totalOutput = data.totalOutput || this.subSectors.reduce((s, s2) => s + s2.output, 0);
    this.addedValue = data.addedValue || Math.round(this.totalOutput * 0.30);  // 增加值率约30%
    this.totalEmployees = data.totalEmployees || this.subSectors.reduce((s, s2) => s + s2.employees, 0);

    // 建筑业
    this.constructionEmployment = data.constructionEmployment || 12000;
  }

  /** 计算工业总产值（万元） */
  calcTotalOutput() {
    return {
      manufacturing: this.totalOutput,
      construction: this.constructionValue,
      total: this.totalOutput + this.constructionValue,
      subSectors: this.subSectors.map(s => ({ name: s.name, output: s.output, growth: s.growth })),
    };
  }

  /** 计算税收贡献（万元/月） */
  calcTaxBase() {
    let vatBase = 0;    // 增值税
    let profitBase = 0; // 利润总额
    for (const s of this.subSectors) {
      vatBase += s.output;
      profitBase += s.profit;
    }
    // 增值税 ≈ 销售×征收率
    const vat = vatBase * 0.13 * 0.80;
    // 所得税 ≈ 利润×税率
    const incomeTax = profitBase * 0.25 * 0.85;
    return { monthlyVatBase: vatBase, monthlyProfitBase: profitBase, vat, incomeTax, total: vat + incomeTax };
  }

  /** 月度更新 */
  monthlyUpdate(economyPolicy = 0, marketShock = 0) {
    // 每个子行业独立波动
    let totalOutput = 0;
    for (const s of this.subSectors) {
      const baseGrowth = s.growth / 12;                            // 年度增速/12
      const policy = economyPolicy * 0.01;
      const shock = marketShock * 0.005;
      const random = (Math.random() - 0.5) * 0.015;
      const monthlyChange = baseGrowth + policy + shock + random;
      s.output = Math.max(2000, s.output * (1 + monthlyChange));
      // 就业跟随产出
      const empDrift = monthlyChange * 0.3;
      s.employees = Math.max(50, Math.round(s.employees * (1 + empDrift)));
      totalOutput += s.output;
    }
    // 建筑业受房地产政策影响更大
    const constrGrowth = -0.112 / 12 + economyPolicy * 0.003 + (Math.random() - 0.5) * 0.01;
    this.constructionValue = Math.max(150000, this.constructionValue * (1 + constrGrowth));

    this.totalOutput = totalOutput;
    this.addedValue = Math.round(this.totalOutput * 0.30);
    this.totalEmployees = this.subSectors.reduce((s, s2) => s + s2.employees, 0);
  }

  toJSON() {
    return {
      scaleAboveGrowth: this.scaleAboveGrowth,
      constructionValue: this.constructionValue,
      constructionGrowth: this.constructionGrowth,
      subSectors: this.subSectors,
      totalOutput: this.totalOutput, addedValue: this.addedValue,
      totalEmployees: this.totalEmployees,
      constructionEmployment: this.constructionEmployment,
    };
  }
}

class ServiceSector {
  /**
   * @param {Object} data
   *   retailTotal: 社会消费品零售总额(万元)
   *   retailGrowth: 零售增速
   *   tourismRevenue: 旅游总收入(万元)
   *   tourismVisitors: 游客人次(万人)
   *   tourismGrowth: 旅游增速
   *   transportRevenue: 交通运输邮政收入(万元)
   *   financialDeposits: 存款余额(万元)
   *   financialLoans: 贷款余额(万元)
   *   telecomRevenue: 通信业务收入(万元)
   *   employment: 三产从业人员
   */
  constructor(data = {}) {
    // 商贸
    this.retailTotal = data.retailTotal || 1002000;           // 社消零(万元) 100.2亿
    this.retailGrowth = data.retailGrowth || 0.055;
    this.limitsAboveGrowth = data.limitsAboveGrowth || 0.108; // 限额以上增速
    this.bazaarTrade = data.bazaarTrade || 1162000;           // 亿元市场交易额

    // 旅游
    this.tourismRevenue = data.tourismRevenue || 2910800;     // 旅游收入(万元) 291.08亿
    this.tourismVisitors = data.tourismVisitors || 5790.76;   // 游客(万人次)
    this.tourismGrowth = data.tourismGrowth || 1.5422;

    // 交通/通信
    this.highwayMileage = data.highwayMileage || 1033.838;    // 公路里程(公里)
    this.postalRevenue = data.postalRevenue || 1149.2;        // 邮政业务(万元)
    this.telecomRevenue = data.telecomRevenue || 45000;       // 通信业务收入(万元估算)
    this.mobileUsers = data.mobileUsers || 73.58;             // 移动用户(万)
    this.internetUsers = data.internetUsers || 25.82;         // 互联网用户(万)

    // 金融
    this.deposits = data.deposits || 9841906;                 // 存款余额(万元)
    this.depositGrowth = data.depositGrowth || 0.029;
    this.loans = data.loans || 6688377;                       // 贷款余额(万元)
    this.loanGrowth = data.loanGrowth || 0.116;
    this.householdDeposits = data.householdDeposits || 8047327; // 住户存款

    // 房地产
    this.realEstateInvestment = data.realEstateInvestment || 350000; // 房地产业投资(万元估算)
    this.housingArea = data.housingArea || 180;               // 住宅销售面积(万㎡估算)

    // 估算增加值
    this.addedValue = data.addedValue || Math.round(this.retailTotal * 0.55
      + this.tourismRevenue * 0.40 + this.postalRevenue * 0.60
      + this.telecomRevenue * 0.50);
    this.employment = data.employment || 110000;
  }

  /** 月度更新：服务业的弹性更强 */
  monthlyUpdate(incomeGrowth = 0, policyFactor = 0) {
    // 商贸随收入增长
    const retailMonth = this.retailGrowth / 12 + incomeGrowth * 0.003 + (Math.random() - 0.5) * 0.01;
    this.retailTotal = Math.max(800000, this.retailTotal * (1 + retailMonth));

    // 旅游受季节和政策影响大
    const tourismMonth = this.tourismGrowth / 12 + policyFactor * 0.01 + (Math.random() - 0.5) * 0.03;
    this.tourismRevenue = Math.max(1000000, this.tourismRevenue * (1 + tourismMonth));

    // 金融缓慢扩张
    this.deposits *= (1 + this.depositGrowth / 12 + (Math.random() - 0.5) * 0.002);
    this.loans *= (1 + this.loanGrowth / 12 + (Math.random() - 0.5) * 0.003);

    // 通信基本稳定
    this.mobileUsers *= (1 + (Math.random() - 0.5) * 0.001);
    this.internetUsers *= (1 + (Math.random() - 0.5) * 0.002);
    this.telecomRevenue *= (1 + (Math.random() - 0.5) * 0.005);

    // 重新估算三产增加值
    this.addedValue = Math.round(this.retailTotal * 0.55 + this.tourismRevenue * 0.40 + this.telecomRevenue * 0.50);
    this.employment = Math.round(this.employment * (1 + (this.retailTotal / 1002000 - 1) * 0.2));
  }

  /** 计算服务业税收贡献 */
  calcTaxBase() {
    // 营业税/增值税：零售 + 旅游 + 通信
    const serviceVat = (this.retailTotal * 0.06 + this.tourismRevenue * 0.03 + this.telecomRevenue * 0.06) / 12;
    return { monthlyServiceRevenue: Math.round((this.retailTotal + this.tourismRevenue) / 12), serviceVat: Math.round(serviceVat) };
  }

  toJSON() {
    return {
      retailTotal: this.retailTotal, retailGrowth: this.retailGrowth,
      tourismRevenue: this.tourismRevenue, tourismVisitors: this.tourismVisitors,
      tourismGrowth: this.tourismGrowth,
      postalRevenue: this.postalRevenue, telecomRevenue: this.telecomRevenue,
      mobileUsers: this.mobileUsers, internetUsers: this.internetUsers,
      deposits: this.deposits, loans: this.loans,
      addedValue: this.addedValue, employment: this.employment,
    };
  }
}

/**
 * EconomicData - 县域经济数据总模型
 * 聚合三次产业，提供完整的经济全景
 */
class EconomicData {
  constructor(data = {}) {
    this.agriculture = new AgricultureSector(data.agriculture || {});
    this.industry = new IndustrySector(data.industry || {});
    this.services = new ServiceSector(data.services || {});

    // 固定资产投资
    this.fixedInvestment = data.fixedInvestment || 1800000;     // 固定资产投资(万元)
    this.fixedInvestmentGrowth = data.fixedInvestmentGrowth || 0.093;
    this.investmentBySector = data.investmentBySector || {
      primary: 0.551, secondary: -0.16, tertiary: 0.148,
    };

    // 对外经济
    this.foreignTrade = data.foreignTrade || {
      total: 118600,     // 进出口总额(万元)
      export: 113900,    // 出口
      import: 4700,      // 进口
      growth: 0.7213,    // 进出口增速
    };
    this.actualFDI = data.actualFDI || 66; // 实际利用外资(万美元)

    // 消费价格
    this.cpi = data.cpi || 100.5;     // CPI 同比
    this.ppi = data.ppi || 99.8;      // PPI 同比（工业品出厂价格）

    // ——— GDP 聚合 ———
    this._calcGDP();
  }

  /** 从三产数据计算GDP */
  _calcGDP() {
    const agAdded = this.agriculture.addedValue;
    const indAdded = this.industry.addedValue + this.industry.constructionValue;
    // 三产增加值需要合理估算：基于retail/mix
    const retailContrib = this.services.retailTotal * 0.40;
    const tourismContrib = this.services.tourismRevenue * 0.25;
    const financeContrib = (this.services.deposits + this.services.loans) * 0.015;
    const transportContrib = 50000;
    const svAdded = retailContrib + tourismContrib + financeContrib + transportContrib;

    this.gdp = {
      total: agAdded + indAdded + svAdded,
      agriculture: agAdded,
      industry: indAdded,
      services: svAdded,
      // 比例
      agRatio: 0, indRatio: 0, svRatio: 0,
    };
    if (this.gdp.total > 0) {
      this.gdp.agRatio = this.gdp.agriculture / this.gdp.total;
      this.gdp.indRatio = this.gdp.industry / this.gdp.total;
      this.gdp.svRatio = this.gdp.services / this.gdp.total;
    }
  }

  /** 月度更新：所有产业同步推进 */
  monthlyUpdate(params = {}) {
    const { month, economyPolicy, marketShock, disaster, incomeGrowth } = params;
    this.agriculture.monthlyUpdate(month || 1, economyPolicy || 0, disaster || 0);
    this.industry.monthlyUpdate(economyPolicy || 0, marketShock || 0);
    this.services.monthlyUpdate(incomeGrowth || 0, economyPolicy || 0);

    // 固定资产投资随经济周期波动
    const fiGrowth = this.fixedInvestmentGrowth / 12 + (economyPolicy || 0) * 0.005 + (Math.random() - 0.5) * 0.01;
    this.fixedInvestment = Math.max(800000, this.fixedInvestment * (1 + fiGrowth));

    // CPI/PPI缓慢漂移
    this.cpi += (Math.random() - 0.5) * 0.2;
    this.ppi += (Math.random() - 0.5) * 0.15;

    // 重新计算GDP
    this._calcGDP();

    // 返回经济摘要用于税收计算
    return this.getTaxBase();
  }

  /** 获取用于财政系统的税基数据 */
  getTaxBase() {
    const indTax = this.industry.calcTaxBase();
    const svTax = this.services.calcTaxBase();
    return {
      // 增值税税基
      industrialSales: Math.round(indTax.monthlyVatBase),
      serviceRevenue: Math.round(svTax.monthlyServiceRevenue),
      // 企业所得税税基
      corporateProfit: Math.round(indTax.monthlyProfitBase),
      // 土地相关
      landTransactionValue: Math.round(this.fixedInvestment * 0.15 / 12), // 土地出让月均估算
      // 综合
      totalTaxBase: Math.round(indTax.monthlyVatBase + svTax.monthlyServiceRevenue),
    };
  }

  /** 获取GDP简报 */
  getGDPReport() {
    this._calcGDP();
    const g = this.gdp;
    // 计算同比增速（简化为月度环比年化）
    const growthRate = this.industry.scaleAboveGrowth * 0.4
      + this.services.retailGrowth * 0.3
      + this.agriculture.addedValueGrowth * 0.1
      + 0.02;
    return {
      total: g.total,
      agriculture: g.agriculture,
      industry: g.industry,
      services: g.services,
      agRatio: (g.agRatio * 100).toFixed(1),
      indRatio: (g.indRatio * 100).toFixed(1),
      svRatio: (g.svRatio * 100).toFixed(1),
      growthRate: growthRate,
      fixedInvestment: this.fixedInvestment,
      retailTotal: this.services.retailTotal,
      tourismRevenue: this.services.tourismRevenue,
      foreignTrade: this.foreignTrade.total,
    };
  }

  /** 获取就业数据 */
  getEmploymentReport() {
    return {
      agriculture: this.agriculture.employment,
      industry: this.industry.totalEmployees + this.industry.constructionEmployment,
      services: this.services.employment,
      total: this.agriculture.employment + this.industry.totalEmployees
        + this.industry.constructionEmployment + this.services.employment,
    };
  }

  toJSON() {
    this._calcGDP();
    return {
      agriculture: this.agriculture.toJSON(),
      industry: this.industry.toJSON(),
      services: this.services.toJSON(),
      gdp: this.gdp,
      fixedInvestment: this.fixedInvestment,
      fixedInvestmentGrowth: this.fixedInvestmentGrowth,
      foreignTrade: this.foreignTrade,
      actualFDI: this.actualFDI,
      cpi: this.cpi, ppi: this.ppi,
    };
  }
}
