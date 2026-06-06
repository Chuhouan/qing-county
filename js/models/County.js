/**
 * County - 县域模型
 * 管理县域整体状态、社会基本面、历史包袱等
 */
class County {
  constructor(data = {}) {
    this.name = data.name || '清河县';
    this.description = data.description || '一个典型的北方平原农业县';
    this.difficulty = data.difficulty || 'normal'; // easy/normal/hard/hell
    this.region = data.region || '华北';

    // 1.1.1 社会基本面
    this.population = {
      total: data.population?.total || 500000,
      urbanRatio: data.population?.urbanRatio || 0.25,     // 城镇人口比例
      ruralRatio: data.population?.ruralRatio || 0.75,     // 农村人口比例
      agingCoeff: data.population?.agingCoeff || 0.12,     // 老龄化系数
      educationIndex: data.population?.educationIndex || 0.3, // 受教育指数
      growthRate: data.population?.growthRate || 0.005,    // 年增长率
    };

    // 经济
    this.economy = {
      gdp: data.economy?.gdp || 150000,
      gdpGrowth: data.economy?.gdpGrowth || 0.05,
      industrialRatio: data.economy?.industrialRatio || 0.3,
      agricultureRatio: data.economy?.agricultureRatio || 0.5,
      serviceRatio: data.economy?.serviceRatio || 0.2,
      economicVitality: data.economy?.economicVitality ?? 50,
    };

    // 1.1.3 体制健康度
    this.institution = {
      bureaucracyEfficiency: data.institution?.bureaucracyEfficiency || 60,
      corruptionIndex: data.institution?.corruptionIndex || 20,
    };

    // 1.1.4 上级信任度
    this.superiorTrust = {
      citySecretary: data.superiorTrust?.citySecretary || 50,  // 市委书记信任
      provincialEval: data.superiorTrust?.provincialEval || 50,  // 省厅评价
      centralImpression: data.superiorTrust?.centralImpression || 50, // 中央印象
    };

    // 1.1.5 地方威望
    this.localPrestige = {
      officialSupport: data.localPrestige?.officialSupport || 60,   // 干部拥护度
      publicApproval: data.localPrestige?.publicApproval || 60,     // 群众认可度
      entrepreneurConfidence: data.localPrestige?.entrepreneurConfidence || 50, // 企业家信心
    };

    // 1.1.6 历史包袱
    this.historicalBurden = {
      hiddenDebt: data.historicalBurden?.hiddenDebt || 50000,    // 隐性债务 万元
      excessCapacity: data.historicalBurden?.excessCapacity || 30, // 过剩产能 0-100
      environmentalDebt: data.historicalBurden?.environmentalDebt || 40, // 环境欠账 0-100
      socialConflicts: data.historicalBurden?.socialConflicts || 15, // 社会矛盾积案 0-50
    };

    // 1.1.2 社会张力
    this.socialTension = data.socialTension ?? 20; // 0-100

    // 资源
    this.resources = {
      land: {
        constructionQuota: data.resources?.land?.constructionQuota || 100,
        farmlandArea: data.resources?.land?.farmlandArea || 80000,
        developablePlots: data.resources?.land?.developablePlots || [
          { id: 'plot_001', type: '工业', size: 100, location: '城东', difficulty: '低' },
        ],
      },
      socialCapital: {
        publicTrust: data.resources?.socialCapital?.publicTrust ?? 60,
        entrepreneurConfidence: data.resources?.socialCapital?.entrepreneurConfidence ?? 50,
        eliteSupport: data.resources?.socialCapital?.eliteSupport ?? 50,
        externalRelations: data.resources?.socialCapital?.externalRelations || {
          universities: [], institutes: [], banks: [],
        },
      },
    };

    this.politicalResources = {
      superiorSupport: data.politicalResources?.superiorSupport || 50,
      policySpace: data.politicalResources?.policySpace || 30,
      mediaRelation: data.politicalResources?.mediaRelation || 40,
    };

    this.towns = data.towns || [];
  }

  getUrbanPopulation() { return Math.round(this.population.total * this.population.urbanRatio); }
  getRuralPopulation() { return Math.round(this.population.total * this.population.ruralRatio); }

  getOverallSatisfaction() {
    return this.localPrestige.publicApproval;
  }

  getEconomyLevel() {
    const gdp = this.economy.gdp;
    if (gdp >= 300000) return '发达';
    if (gdp >= 150000) return '中等';
    if (gdp >= 80000) return '偏低';
    return '落后';
  }

  modifyTension(delta) {
    this.socialTension = calculator.clamp(this.socialTension + delta, 0, 100);
    return this.socialTension;
  }

  getEconomyStatus() {
    const growth = this.economy.gdpGrowth;
    if (growth > 0.08) return '繁荣';
    if (growth > 0.05) return '正常';
    if (growth > 0) return '低迷';
    return '危机';
  }

  /**
   * 各乡镇产业画像定义
   * 城关镇→商贸中心  工业镇→制造基地  农业镇→产粮  旅游镇→文旅
   * 产业地块仅保留命名空间，不含模拟字段
   */
  static TOWN_PROFILES = [
    { name: '城关镇', type: '镇', profile: 'urban', sectors: [
      { type: 'service', subType: 'retail', name: '县城商业中心' },
      { type: 'industry', subType: '电子信息', name: '城关电子产业园' },
      { type: 'tourism', subType: 'cultural', name: '古城文化旅游区' },
    ]},
    { name: '红旗镇', type: '镇', profile: 'industrial', sectors: [
      { type: 'industry', subType: '机械设备制造', name: '红旗机械制造基地' },
      { type: 'industry', subType: '建材生产', name: '红旗建材工业园' },
      { type: 'service', subType: 'logistics', name: '红旗物流中心' },
    ]},
    { name: '丰收镇', type: '镇', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'grain', name: '丰收粮食主产区' },
      { type: 'agriculture', subType: 'livestock', name: '丰收畜牧养殖基地' },
      { type: 'industry', subType: '农副食品加工', name: '丰收农产品加工园' },
    ]},
    { name: '东风镇', type: '镇', profile: 'industrial', sectors: [
      { type: 'industry', subType: '化工制品', name: '东风化工园区' },
      { type: 'industry', subType: '纺织服装', name: '东风纺织工业园' },
    ]},
    { name: '新民镇', type: '镇', profile: 'mixed', sectors: [
      { type: 'agriculture', subType: 'grain', name: '新民粮食产区' },
      { type: 'industry', subType: '其他制造业', name: '新民综合工业区' },
      { type: 'service', subType: 'retail', name: '新民商贸街' },
    ]},
    { name: '柳河镇', type: '镇', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'vegetables', name: '柳河蔬菜基地' },
      { type: 'agriculture', subType: 'livestock', name: '柳河畜禽养殖' },
    ]},
    { name: '双桥镇', type: '镇', profile: 'mixed', sectors: [
      { type: 'industry', subType: '电子信息', name: '双桥电子元件厂' },
      { type: 'service', subType: 'retail', name: '双桥农贸市场' },
      { type: 'agriculture', subType: 'grain', name: '双桥粮食产区' },
    ]},
    { name: '杨树镇', type: '镇', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'grain', name: '杨树优质粮田' },
      { type: 'agriculture', subType: 'cashCrops', name: '杨树经济作物园' },
    ]},
    { name: '青石镇', type: '镇', profile: 'industrial', sectors: [
      { type: 'industry', subType: '建材生产', name: '青石建材厂' },
      { type: 'industry', subType: '机械设备制造', name: '青石机械修造' },
    ]},
    { name: '河口乡', type: '乡', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'grain', name: '河口粮食产区' },
      { type: 'agriculture', subType: 'fishery', name: '河口水产养殖' },
    ]},
    { name: '松岭乡', type: '乡', profile: 'tourism', sectors: [
      { type: 'tourism', subType: 'eco', name: '松岭生态旅游区' },
      { type: 'agriculture', subType: 'grain', name: '松岭山地农业' },
    ]},
    { name: '龙湾乡', type: '乡', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'livestock', name: '龙湾畜牧养殖' },
      { type: 'agriculture', subType: 'grain', name: '龙湾粮食产区' },
    ]},
    { name: '白云乡', type: '乡', profile: 'tourism', sectors: [
      { type: 'tourism', subType: 'cultural', name: '白云古镇文旅' },
      { type: 'agriculture', subType: 'cashCrops', name: '白云中药材基地' },
    ]},
    { name: '曙光乡', type: '乡', profile: 'mixed', sectors: [
      { type: 'service', subType: 'retail', name: '曙光集贸市场' },
      { type: 'agriculture', subType: 'grain', name: '曙光粮食产区' },
      { type: 'industry', subType: '农副食品加工', name: '曙光食品加工' },
    ]},
    { name: '前进乡', type: '乡', profile: 'agricultural', sectors: [
      { type: 'agriculture', subType: 'grain', name: '前进粮食基地' },
      { type: 'agriculture', subType: 'vegetables', name: '前进大棚蔬菜' },
    ]},
  ];

  /** 生成乡镇数据——各镇等分全县人口和GDP，地块仅作命名 */
  generateTowns(numTowns) {
    const profiles = County.TOWN_PROFILES;
    this.towns = profiles.slice(0, numTowns).map((p, i) => {
      const share = 1 / numTowns;
      const pop = Math.round(this.population.total * share);
      const gdp = Math.round(this.economy.gdp * share);
      const sectors = p.sectors.map(s => new TownSector({
        ...s,
        townId: `town_${i + 1}`,
      }));
      return {
        id: `town_${i + 1}`,
        name: p.name,
        type: p.type,
        profile: p.profile,
        population: pop,
        gdp: gdp,
        stability: 70,
        satisfaction: 65,
        special: null,
        sectors: sectors,
      };
    });
    return this.towns;
  }

  toJSON() {
    return {
      name: this.name, description: this.description,
      difficulty: this.difficulty, region: this.region,
      population: this.population, economy: this.economy,
      institution: this.institution, superiorTrust: this.superiorTrust,
      localPrestige: this.localPrestige, historicalBurden: this.historicalBurden,
      socialTension: this.socialTension, resources: this.resources,
      politicalResources: this.politicalResources, towns: this.towns,
    };
  }
}
