/**
 * PopulationData - 人口数据模型（Paradox式完整人口系统）
 * =====================================================
 * 年龄结构：少年(0-17) / 青年(18-35) / 中年(36-60) / 老年(60+)
 * 劳动力 = 青年 + 中年(扣除脱产)
 * 就业=按产业，失业=剩余劳动力
 * 收入=按群体分层
 *
 * 所有单位：人
 */
class PopulationData {
  constructor(data = {}) {
    // ——— 年龄金字塔 ———
    this.ageGroups = {
      youth:       data.ageGroups?.youth ?? 75000,       // 0-17岁
      youngAdult:  data.ageGroups?.youngAdult ?? 155000,  // 18-35岁 劳动力主力
      middleAge:   data.ageGroups?.middleAge ?? 185000,   // 36-60岁 劳动力
      elderly:     data.ageGroups?.elderly ?? 85000,      // 60+岁
    };

    // ——— 劳动力 ———
    this.laborForce = data.laborForce ?? 300000;   // 经济活动人口（就业+失业）
    this.employed = data.employed ?? 265000;        // 就业人口
    this.unemployed = data.unemployed ?? 35000;     // 失业人口
    this.outOfLaborForce = data.outOfLaborForce ?? 105000; // 非劳动力（学生/家务/退休/残疾）

    // ——— 就业产业结构（从产业地块汇总的镜像） ———
    this.employmentBySector = {
      agriculture: data.employmentBySector?.agriculture ?? 85000,
      industry:    data.employmentBySector?.industry ?? 42000,
      services:    data.employmentBySector?.services ?? 110000,
      government:  data.employmentBySector?.government ?? 13000,
      other:       data.employmentBySector?.other ?? 15000,
    };

    // ——— 收入（元/月） ———
    this.income = {
      average:   data.income?.average ?? 4200,
      median:    data.income?.median ?? 3500,
      perGroup: { ...{ farmers: 2800, workers: 4500, civilServants: 6200,
                       teachers: 4800, merchants: 5500, entrepreneurs: 12000,
                       retired: 2800, unemployed: 800 }, ...data.income?.perGroup },
    };

    // ——— 人口素质 ———
    this.educationRate = data.educationRate ?? 0.65;    // 高中以上受教育率
    this.urbanRatio = data.urbanRatio ?? 0.55;            // 城镇人口比例
    this.dependencyRatio = data.dependencyRatio ?? 0.53;  // 抚养比

    // ——— 自然变动 ———
    this.birthRate = data.birthRate ?? 0.008;    // 年出生率
    this.deathRate = data.deathRate ?? 0.007;    // 年死亡率
    this.netMigration = data.netMigration ?? 0;   // 月净迁入（人）

    // ——— 消费行为 ———
    this.consumption = {
      marginalPropensity: data.consumption?.marginalPropensity ?? 0.6, // 边际消费倾向
      savingsRate: data.consumption?.savingsRate ?? 0.3,
      structure: { ...{ food: 0.30, housing: 0.25, transport: 0.15,
                       education: 0.10, healthcare: 0.08, other: 0.12 },
                   ...data.consumption?.structure },
    };
  }

  /** 总人口 */
  get total() {
    return this.ageGroups.youth + this.ageGroups.youngAdult
         + this.ageGroups.middleAge + this.ageGroups.elderly;
  }

  /** 失业率 */
  get unemploymentRate() {
    return this.laborForce > 0 ? this.unemployed / this.laborForce : 0;
  }

  /** 城镇化率 */
  get urbanizationRate() {
    return this.urbanRatio;
  }

  /** 老龄化系数 */
  get agingCoefficient() {
    return this.total > 0 ? this.ageGroups.elderly / this.total : 0;
  }

  /** 劳动力占比 */
  get laborParticipationRate() {
    return this.total > 0 ? this.laborForce / this.total : 0;
  }

  /** 月度更新——人口自然变动 + 就业联动 */
  monthlyUpdate(params = {}) {
    const { sectorEmployment, gdpGrowth, policyFactor } = params;

    // 1. 年龄结构演进（简单模型：每年将部分青年升入中年，中年升入老年）
    // 每年1月执行一次年龄推移
    if (timeSystem?.month === 1) {
      const newYouth = Math.round(this.total * this.birthRate); // 新生儿≈出生率×总人口
      const agingYoung = Math.round(this.ageGroups.youngAdult * 0.02);  // 2%青年升中年
      const agingMid = Math.round(this.ageGroups.middleAge * 0.025);    // 2.5%中年升老年
      const deathElderly = Math.round(this.ageGroups.elderly * this.deathRate * 2); // 老年死亡率更高

      this.ageGroups.youth = Math.max(0, this.ageGroups.youth - agingYoung * 0.3 + newYouth);
      this.ageGroups.youngAdult = Math.max(0, this.ageGroups.youngAdult - agingYoung + agingYoung);
      this.ageGroups.middleAge = Math.max(0, this.ageGroups.middleAge + agingYoung - agingMid);
      this.ageGroups.elderly = Math.max(0, this.ageGroups.elderly + agingMid - deathElderly);
    }

    // 2. 就业同步：从产业地块汇总
    if (sectorEmployment) {
      this.employmentBySector = { ...sectorEmployment };
    }
    const totalSectorEmp = Object.values(this.employmentBySector).reduce((a, b) => a + b, 0);
    this.employed = Math.max(totalSectorEmp, 10000);

    // 3. 劳动力 = 青年 + 中年(扣除脱产)
    const potentialWorkforce = this.ageGroups.youngAdult + this.ageGroups.middleAge;
    // 脱产率（学生+家务+残疾），经济越差脱产越少（需找工作）
    const outRate = 0.08 + (1 - (gdpGrowth || 0.05)) * 0.05;
    this.outOfLaborForce = Math.round(potentialWorkforce * Math.min(0.25, outRate));
    this.laborForce = potentialWorkforce - this.outOfLaborForce;

    // 4. 失业 = 劳动力 - 已就业
    this.unemployed = Math.max(0, this.laborForce - this.employed);

    // 5. 人口自然增减（月度）
    const naturalChange = Math.round(this.total * (this.birthRate - this.deathRate) / 12);
    const migration = this.netMigration;

    // 按年龄比例分配新增人口
    const change = naturalChange + migration;
    if (change > 0) {
      this.ageGroups.youth += Math.round(change * 0.15);
      this.ageGroups.youngAdult += Math.round(change * 0.45);
      this.ageGroups.middleAge += Math.round(change * 0.30);
      this.ageGroups.elderly += Math.round(change * 0.10);
    } else if (change < 0) {
      // 减少按比例
      const absC = Math.abs(change);
      this.ageGroups.youth = Math.max(0, this.ageGroups.youth - Math.round(absC * 0.15));
      this.ageGroups.youngAdult = Math.max(0, this.ageGroups.youngAdult - Math.round(absC * 0.45));
      this.ageGroups.middleAge = Math.max(0, this.ageGroups.middleAge - Math.round(absC * 0.30));
      this.ageGroups.elderly = Math.max(0, this.ageGroups.elderly - Math.round(absC * 0.10));
    }

    // 6. 收入随GDP增长
    const incomeGrowth = (gdpGrowth || 0.05) * 0.5;
    for (const k of Object.keys(this.income.perGroup)) {
      this.income.perGroup[k] = Math.round(this.income.perGroup[k] * (1 + incomeGrowth));
    }
    this.income.average = Math.round(Object.values(this.income.perGroup).reduce((a, b) => a + b, 0) / Object.keys(this.income.perGroup).length);
    this.income.median = Math.round(this.income.average * 0.82);

    // 7. 抚养比
    const dependents = this.ageGroups.youth + this.ageGroups.elderly;
    const workers = this.ageGroups.youngAdult + this.ageGroups.middleAge;
    this.dependencyRatio = workers > 0 ? dependents / workers : 1;

    return {
      total: this.total,
      laborForce: this.laborForce,
      employed: this.employed,
      unemployed: this.unemployed,
      unemploymentRate: this.unemploymentRate,
    };
  }

  /** 计算居民消费总额（万元/月）——三驾马车中的C */
  calcTotalConsumption() {
    // 消费 = 就业人口 × 月均收入 × 边际消费倾向 / 10000（转换为万元）
    const totalIncome = this.employed * (this.income.average || 4200);
    return Math.round(totalIncome * this.consumption.marginalPropensity / 10000);
  }

  /** 计算居民储蓄总额（万元/月） */
  calcTotalSavings() {
    const totalIncome = this.employed * (this.income.average || 4200);
    return Math.round(totalIncome * this.consumption.savingsRate / 10000);
  }

  toJSON() {
    return {
      ageGroups: this.ageGroups,
      laborForce: this.laborForce, employed: this.employed,
      unemployed: this.unemployed, outOfLaborForce: this.outOfLaborForce,
      employmentBySector: this.employmentBySector,
      income: this.income,
      educationRate: this.educationRate,
      urbanRatio: this.urbanRatio, dependencyRatio: this.dependencyRatio,
      birthRate: this.birthRate, deathRate: this.deathRate,
      netMigration: this.netMigration,
    };
  }
}
