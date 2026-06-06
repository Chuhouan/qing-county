/**
 * PopulationSystem - 人口系统
 * =============================
 * 月度人口更新 + 就业联动 + 数据聚合
 * 负责连接产业地块就业与人口模型
 */
class PopulationSystem {
  constructor() { this.engine = null; this.pop = null; }

  init(config) {
    this.pop = new PopulationData(config.population || {});
    stateManager.register('population', this.pop);
    eventBus.on(EVENTS.MONTH_CHANGE, () => this.monthlyUpdate());
  }

  /** 月度人口更新 */
  monthlyUpdate() {
    const county = stateManager.get('county');
    const ecoSys = this.engine?.getSystem?.('economy');
    if (!county) return;

    // 从产业地块汇总就业
    const sectors = county.towns?.flatMap(t => t.sectors || []) || [];
    const sectorEmployment = {
      agriculture: sectors.filter(s => s.type === 'agriculture').reduce((s, sec) => s + sec.employees, 0),
      industry:    sectors.filter(s => s.type === 'industry').reduce((s, sec) => s + sec.employees, 0),
      services:    sectors.filter(s => s.type === 'service' || s.type === 'tourism').reduce((s, sec) => s + sec.employees, 0),
      government:  13000,
      other:       15000,
    };

    const params = {
      sectorEmployment,
      gdpGrowth: county.economy?.gdpGrowth || 0.05,
      policyFactor: 0,
    };

    const result = this.pop.monthlyUpdate(params);

    // 同步到County
    const pop = this.pop;
    county.population.total = pop.total;
    county.population.urbanRatio = pop.urbanRatio;
    county.population.ruralRatio = 1 - pop.urbanRatio;

    // 就业率影响社会张力
    if (pop.unemploymentRate > 0.10) {
      county.modifyTension((pop.unemploymentRate - 0.10) * 0.5);
    }

    return result;
  }

  /** 获取人口摘要 */
  getSummary() {
    if (!this.pop) return null;
    return {
      total: this.pop.total,
      ageGroups: this.pop.ageGroups,
      laborForce: this.pop.laborForce,
      employed: this.pop.employed,
      unemployed: this.pop.unemployed,
      unemploymentRate: this.pop.unemploymentRate,
      employmentBySector: this.pop.employmentBySector,
      income: this.pop.income,
      urbanizationRate: this.pop.urbanizationRate,
      agingCoefficient: this.pop.agingCoefficient,
      dependencyRatio: this.pop.dependencyRatio,
    };
  }
}
