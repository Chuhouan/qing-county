/**
 * Finance - 财政模型 v5（重构版）
 * ===============================
 * 变更：
 *   - 删除 budget / transferPayment / extraBudget 三套死数据
 *   - 删除 canApprove / spend 的混乱逻辑
 *   - 修复 debtInterest 运算符优先级 bug
 *   - 修复 fiscalHealth 硬编码 35 与公式不一致
 *   - 修复 yearlySettlement 数据清零丢失
 *   - 所有初始值由 FinanceSystem 从 difficultyConfig 推导传入
 *   - incomeBreakdown / expenseBreakdown 为唯一数据源
 * 单位：万元
 */
class Finance {
  constructor(data = {}) {
    // ——— 国库余额 ———
    this.treasuryBalance = data.treasuryBalance ?? 0;

    // ——— 月度流水（每次结算重算） ———
    this.monthlyIncome = 0;
    this.monthlyExpense = 0;
    this.monthlyBalance = 0;

    // ——— 年度累计（月度累加，年末存档后重置） ———
    this.yearlyTotalIncome = 0;
    this.yearlyTotalExpense = 0;
    this.lastYearIncome = data.lastYearIncome || 0;
    this.lastYearExpense = data.lastYearExpense || 0;

    // ——— 征收率（玩家可调 30%-100%） ———
    this.collectRate = data.collectRate ?? 0.75;

    // ============= 收入明细（EU4式收支树） =============
    this.incomeBreakdown = {
      tax: {
        label: '税收收入', total: 0,
        sub: {
          vat:         { label: '增值税',         value: 0 },
          corpTax:     { label: '企业所得税',     value: 0 },
          serviceTax:  { label: '服务业营业税',   value: 0 },
          personalTax: { label: '个人所得税',     value: 0 },
        },
      },
      transfer: {
        label: '转移支付', total: 0,
        sub: {
          general:   { label: '一般性转移', value: 0 },
          special:   { label: '专项转移',   value: 0 },
          taxReturn: { label: '税收返还',   value: 0 },
        },
      },
      nonTax: {
        label: '非税收入', total: 0,
        sub: {
          adminFees:   { label: '行政收费',     value: 0 },
          fines:       { label: '罚没收入',     value: 0 },
          land:        { label: '土地出让',     value: 0 },
          stateProfit: { label: '国企利润上缴', value: 0 },
        },
      },
    };

    // ============= 支出明细 =============
    this.expenseBreakdown = {
      personnel: {
        label: '人员经费', total: 0,
        sub: {
          salary: { label: '在编工资',     value: 0 },
          social: { label: '社保公积金',   value: 0 },
        },
      },
      operating:     { label: '公用经费',   total: 0 },
      project:       { label: '项目支出',   total: 0 },
      debtInterest:  { label: '债务利息',   total: 0 },
    };

    // ——— 年度预算（人大审议用，与月度支出计算解耦） ———
    this.budget = {
      personnel: data.budget?.personnel  ?? 85800,  // 年度人员预算
      operating: data.budget?.operating  ?? 14400,  // 年度公用预算
      project:   data.budget?.project    ?? 48000,  // 年度项目预算
      reserve:   data.budget?.reserve    ?? 5000,   // 预备费
    };
    this.budgetApproved = data.budgetApproved !== false;

    // ——— 转移支付年度额度（由 FinanceSystem 推导，计算时 ÷12） ———
    this.transferAnnual = {
      general:   data.transferAnnual?.general   ?? 60000,
      special:   data.transferAnnual?.special   ?? 18000,
      taxReturn: data.transferAnnual?.taxReturn ?? 6000,
    };

    // ——— 非税年度额度 ———
    this.nonTaxAnnual = {
      adminFees:   data.nonTaxAnnual?.adminFees   ?? 2400,
      fines:       data.nonTaxAnnual?.fines       ?? 1200,
      stateProfit: data.nonTaxAnnual?.stateProfit ?? 2400,
    };

    // ——— 债务 ———
    this.publicDebt  = data.publicDebt  ?? 250000;  // 显性债务
    this.hiddenDebt  = data.hiddenDebt  ?? 60000;   // 隐性债务
    this.debtRate    = data.debtRate    ?? 85;       // 债务率 %
    this.interestRate = data.interestRate ?? 0.045;  // 年利率 4.5%
    this.arrearsMonths = data.arrearsMonths || 0;    // 欠薪月数

    // ——— 衍生指标（首次结算后重算） ———
    this.fiscalHealth     = data.fiscalHealth     ?? 100;
    this.selfSufficiency  = data.selfSufficiency  ?? 50;
    this.cumulativeDeficit = data.cumulativeDeficit || 0;

    // ——— 玩家杠杆状态 ———
    this.austerityLevel = data.austerityLevel ?? 0;
    this.lobbyBoostMonths = data.lobbyBoostMonths || 0;
  }

  /** 计算月收入——从税基明细逐项填入 */
  calcMonthlyIncome(taxBase) {
    const tb = taxBase || { industrialSales: 0, serviceRevenue: 0, corporateProfit: 0 };
    const cr = this.collectRate;

    // 税收（税率县里不能动，征收率可以调）
    const vat         = Math.round((tb.industrialSales || 0) * 0.13 * cr);
    const corpTax     = Math.round((tb.corporateProfit || 0) * 0.25 * cr);
    const serviceTax  = Math.round((tb.serviceRevenue || 0) * 0.06 * cr);

    // 个人所得税：只有高收入群体实际缴纳，用有效税率 1.2%
    const popData = stateManager.get('population');
    const employed = popData?.employed || 265000;
    const avgIncome = popData?.income?.average || 3800;
    const personalTax = Math.round(employed * avgIncome * 0.012 * cr);

    const taxTotal = vat + corpTax + serviceTax + personalTax;

    // 转移支付（月均 = 年度÷12）
    const transGen = Math.round((this.transferAnnual.general || 60000) / 12);
    const transSpec = Math.round((this.transferAnnual.special || 18000) / 12);
    const transRet = Math.round((this.transferAnnual.taxReturn || 6000) / 12);
    const transferTotal = transGen + transSpec + transRet;

    // 非税收入
    const adminFees   = Math.round((this.nonTaxAnnual.adminFees || 2400) / 12);
    const fines       = Math.round((this.nonTaxAnnual.fines || 1200) / 12);
    const landIncome  = 0; // 由事件触发，不在常规月度计算中
    const stateProfit = Math.round((this.nonTaxAnnual.stateProfit || 2400) / 12);
    const nonTaxTotal = adminFees + fines + landIncome + stateProfit;

    // ——— 填入收入明细 ———
    this.incomeBreakdown.tax.sub.vat.value         = vat;
    this.incomeBreakdown.tax.sub.corpTax.value     = corpTax;
    this.incomeBreakdown.tax.sub.serviceTax.value  = serviceTax;
    this.incomeBreakdown.tax.sub.personalTax.value = personalTax;
    this.incomeBreakdown.tax.total = taxTotal;

    this.incomeBreakdown.transfer.sub.general.value   = transGen;
    this.incomeBreakdown.transfer.sub.special.value   = transSpec;
    this.incomeBreakdown.transfer.sub.taxReturn.value = transRet;
    this.incomeBreakdown.transfer.total = transferTotal;

    this.incomeBreakdown.nonTax.sub.adminFees.value   = adminFees;
    this.incomeBreakdown.nonTax.sub.fines.value       = fines;
    this.incomeBreakdown.nonTax.sub.land.value        = landIncome;
    this.incomeBreakdown.nonTax.sub.stateProfit.value = stateProfit;
    this.incomeBreakdown.nonTax.total = nonTaxTotal;

    this.monthlyIncome = taxTotal + transferTotal + nonTaxTotal;
    this.yearlyTotalIncome += this.monthlyIncome;
    return this.monthlyIncome;
  }

  /** 计算月支出——参数由 FinanceSystem 从游戏状态传入 */
  calcMonthlyExpense(params) {
    const {
      staffCount = 12000,    // 在编人数
      avgSalaryWan = 7.2,    // 人均年工资（万元）
      operatingBase = 12000, // 公用经费年预算（万元）
      projectBase = 35000,   // 项目支出年预算（万元）
      projectProgress = 0.6, // 项目进度系数
    } = params || {};

    // 人员经费
    const salary = Math.round(staffCount * avgSalaryWan / 12);
    const social = Math.round(staffCount * avgSalaryWan * 0.4 / 12);
    const personnelTotal = salary + social;

    // 公用经费
    const operatingTotal = Math.round((operatingBase || 12000) / 12);

    // 项目支出（受进度影响）
    const projectTotal = Math.round((projectBase || 35000) * projectProgress / 12);

    // 债务利息（修复：totalDebt 不再用错误优先级）
    const totalDebt = (this.publicDebt || 0) + (this.hiddenDebt || 0);
    const debtInterest = Math.round(totalDebt * (this.interestRate || 0.045) / 12);

    // ——— 填入支出明细 ———
    this.expenseBreakdown.personnel.sub.salary.value = salary;
    this.expenseBreakdown.personnel.sub.social.value = social;
    this.expenseBreakdown.personnel.total = personnelTotal;
    this.expenseBreakdown.operating.total = operatingTotal;
    this.expenseBreakdown.project.total = projectTotal;
    this.expenseBreakdown.debtInterest.total = debtInterest;

    this.monthlyExpense = personnelTotal + operatingTotal + projectTotal + debtInterest;
    this.yearlyTotalExpense += this.monthlyExpense;
    return this.monthlyExpense;
  }

  /** 月度结算——更新国库、债务、指标 */
  monthlySettlement() {
    this.monthlyBalance = this.monthlyIncome - this.monthlyExpense;
    this.treasuryBalance = Math.round(this.treasuryBalance + this.monthlyBalance);

    // 国库为负 → 欠薪累计
    if (this.treasuryBalance < 0) {
      this.arrearsMonths += 1;
      this.cumulativeDeficit += Math.abs(this.monthlyBalance);
      this.debtRate = calculator.clamp(this.debtRate + 0.5, 0, 150);
    } else if (this.cumulativeDeficit > 0) {
      // 有盈余时逐步还旧账
      this.cumulativeDeficit = Math.max(0, this.cumulativeDeficit - this.monthlyBalance);
    }

    // 自给率 = 收入/支出
    this.selfSufficiency = this.monthlyExpense > 0
      ? Math.round((this.monthlyIncome / this.monthlyExpense) * 100)
      : 50;

    // 财政健康度（拆除硬编码 35，公式计算）
    this.fiscalHealth = this._calcFiscalHealth();

    return {
      income: this.monthlyIncome,
      expense: this.monthlyExpense,
      balance: this.monthlyBalance,
      treasury: this.treasuryBalance,
      health: this.fiscalHealth,
      deficit: this.cumulativeDeficit,
      collectRate: this.collectRate,
      selfSufficiency: this.selfSufficiency,
      arrears: this.arrearsMonths,
    };
  }

  /** 计算财政健康度（独立方法） */
  _calcFiscalHealth() {
    const debtPenalty = Math.min(40, Math.max(0, (this.debtRate - 60) * 0.8));
    const arrearsPenalty = Math.min(30, this.arrearsMonths * 3);
    const treasuryPenalty = this.treasuryBalance < 0
      ? Math.min(30, Math.abs(this.treasuryBalance) / 200)
      : 0;
    return calculator.clamp(100 - debtPenalty - arrearsPenalty - treasuryPenalty, 0, 100);
  }

  /** 拨付审批（替代旧的 canApprove + spend） */
  canApprove(amount, category) {
    if (amount <= 0) return false;
    // 小额动用预备费概念：国库余额+3000万可覆盖小额支出
    if (amount <= 500) return this.treasuryBalance + 3000 >= amount;
    // 中额
    if (amount <= 5000) return this.treasuryBalance >= amount * 0.3;
    // 大额（>5000万）
    return this.treasuryBalance >= amount * 0.5;
  }

  /** 支出拨款——直接减国库余额，不再从两处扣钱 */
  spend(amount) {
    if (!this.canApprove(amount)) return false;
    this.treasuryBalance = Math.round(this.treasuryBalance - amount);
    return true;
  }

  /** 年度结算——存档去年数据后重置累计值 */
  yearlySettlement() {
    this.lastYearIncome = this.yearlyTotalIncome;
    this.lastYearExpense = this.yearlyTotalExpense;
    this.yearlyTotalIncome = 0;
    this.yearlyTotalExpense = 0;
  }

  toJSON() {
    return {
      treasuryBalance: this.treasuryBalance,
      monthlyIncome: this.monthlyIncome,
      monthlyExpense: this.monthlyExpense,
      monthlyBalance: this.monthlyBalance,
      incomeBreakdown: this.incomeBreakdown,
      expenseBreakdown: this.expenseBreakdown,
      collectRate: this.collectRate,
      budget: this.budget,
      budgetApproved: this.budgetApproved,
      transferAnnual: this.transferAnnual,
      nonTaxAnnual: this.nonTaxAnnual,
      publicDebt: this.publicDebt,
      hiddenDebt: this.hiddenDebt,
      debtRate: this.debtRate,
      interestRate: this.interestRate,
      fiscalHealth: this.fiscalHealth,
      selfSufficiency: this.selfSufficiency,
      cumulativeDeficit: this.cumulativeDeficit,
      arrearsMonths: this.arrearsMonths,
      yearlyTotalIncome: this.yearlyTotalIncome,
      yearlyTotalExpense: this.yearlyTotalExpense,
      lastYearIncome: this.lastYearIncome,
      lastYearExpense: this.lastYearExpense,
      austerityLevel: this.austerityLevel,
      lobbyBoostMonths: this.lobbyBoostMonths,
    };
  }
}
