/**
 * Enterprise - 企业模型
 * 3.3 企业主体模型
 */
class Enterprise {
  constructor(data = {}) {
    this.id = data.id || `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = data.name || '未命名企业';
    this.type = data.type || 'state';
    this.industry = data.industry || '制造业';

    // 所属地块（与TownSector联动）
    this.townId = data.townId || null;         // 所属乡镇ID
    this.sectorId = data.sectorId || null;     // 所属产业地块ID
    this.sectorName = data.sectorName || '';   // 产业地块名称

    // 基本信息
    this.employees = data.employees || 0;
    this.annualOutput = data.annualOutput || 0;    // 年产值(万元)
    this.annualProfit = data.annualProfit || 0;     // 利润(万元)
    this.annualTax = data.annualTax || 0;           // 税收(万元)
    this.debt = data.debt || 0;                     // 负债(万元)
    this.assets = data.assets || 0;                 // 资产(万元)

    // 状态
    this.stage = data.stage || 'mature'; // startup/growth/mature/decline
    this.pollution = data.pollution || 0;            // 污染程度 0-100
    this.safetyRisk = data.safetyRisk || 0;          // 安全风险 0-100

    // 政治属性
    this.politicalSignificance = data.politicalSignificance || 0; // 政治意义(稳定器)
    this.reformResistance = data.reformResistance || 0;          // 改革阻力 0-100
    this.ownerLevel = data.ownerLevel || null;        // 厂长级别(国企)
    this.governmentRelation = data.governmentRelation || 50;     // 与政府关系 0-100

    // 诉求
    this.demands = data.demands || ['财政补贴', '市场保护'];

    // 外部投资相关
    this.foreignInvestor = data.foreignInvestor || null;
    this.landRequirement = data.landRequirement || 0;   // 要地(亩)
    this.intendedInvestment = data.intendedInvestment || 0; // 意向投资(万元)
    this.policyRequest = data.policyRequest || [];        // 政策诉求
  }

  /** 是否亏损 */
  isLoss() { return this.annualProfit < 0; }

  /** 是否高污染 */
  isHighPollution() { return this.pollution > 60; }

  /** 是否可能倒闭 */
  isNearBankruptcy() { return this.debt > this.assets * 1.5 && this.isLoss(); }

  /** 就业贡献 */
  getEmploymentContribution() { return this.employees; }

  /** 税收贡献 */
  getTaxContribution() { return this.annualTax; }

  /** 毛利率 */
  getProfitMargin() {
    return this.annualOutput > 0 ? (this.annualProfit / this.annualOutput) * 100 : 0;
  }

  /** 负债率 */
  getDebtRatio() {
    return this.assets > 0 ? (this.debt / this.assets) * 100 : 0;
  }

  /** 月度更新 */
  monthlyUpdate(marketFactor = 0, policyFactor = 0) {
    // 基础随机波动
    const volatility = (Math.random() - 0.5) * 0.1;
    this.annualOutput *= (1 + volatility + marketFactor);
    this.annualProfit *= (1 + volatility * 1.5 + policyFactor);

    // 污染变化
    this.pollution = calculator.clamp(
      this.pollution + (Math.random() - 0.5) * 2, 0, 100
    );

    // 生命周期演进
    if (this.stage === 'startup' && Math.random() < 0.02) {
      this.stage = 'growth';
    } else if (this.stage === 'growth' && Math.random() < 0.005) {
      this.stage = 'mature';
    } else if (this.stage === 'mature' && Math.random() < 0.003) {
      this.stage = 'decline';
    }
  }

  toJSON() {
    return {
      id: this.id, name: this.name, type: this.type, industry: this.industry,
      employees: this.employees, annualOutput: this.annualOutput,
      annualProfit: this.annualProfit, annualTax: this.annualTax,
      debt: this.debt, assets: this.assets, stage: this.stage,
      pollution: this.pollution, safetyRisk: this.safetyRisk,
      politicalSignificance: this.politicalSignificance,
      reformResistance: this.reformResistance,
      governmentRelation: this.governmentRelation,
      townId: this.townId, sectorId: this.sectorId, sectorName: this.sectorName,
    };
  }
}
