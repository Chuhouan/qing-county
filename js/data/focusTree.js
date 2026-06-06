/**
 * focusTree.js — 治理路线图（国策树）
 * 仿 HOI4 国策树设计：四条分支，每分支有前置链，选择后数周完成，完成后获得效果
 *
 * 四分支：
 *   经济发展（economy）→ 工业/财政/招商
 *   社会稳定（stability）→ 信访/治安/民生/舆情
 *   党的建设（party）→ 干部/党建/反腐
 *   改革创新（reform）→ 数字政府/土地/营商环境
 */

var FOCUS_TREE = {
  // ===== 经济发展 =====
  economy: {
    name: '经济发展',
    icon: '📈',
    color: '#2563eb',
    focuses: [
      {
        id: 'eco_industrial_park',
        name: '工业园升级改造',
        desc: '对现有工业园区基础设施进行升级，改善投资环境。',
        cost: 500,
        duration: 8,  // 8周完成
        prerequisites: [],
        effects: {
          economicVitality: 5,
          gdpGrowth: 0.01,
          eventText: '工业园升级完成，基础设施焕然一新，已有3家企业表达了入驻意向。',
        },
      },
      {
        id: 'eco_tax_cultivation',
        name: '税源培育计划',
        desc: '优化纳税服务，挖掘新增税源，提高征管效率。',
        cost: 200,
        duration: 6,
        prerequisites: [],
        effects: {
          monthlyIncome: 200,
          fiscalHealth: 3,
          eventText: '税源培育取得成效，新增纳税主体120户，月均税收增加200万元。',
        },
      },
      {
        id: 'eco_fiscal_reform',
        name: '财政体制改革',
        desc: '推进零基预算改革，优化支出结构，提高财政自给率。',
        cost: 100,
        duration: 10,
        prerequisites: ['eco_tax_cultivation'],
        effects: {
          selfSufficiency: 10,
          fiscalHealth: 5,
          eventText: '财政改革落地，支出结构显著优化，自给率提升10个百分点。',
        },
      },
      {
        id: 'eco_investment',
        name: '招商引资攻坚',
        desc: '组建专业招商团队，赴长三角/珠三角开展精准招商。',
        cost: 300,
        duration: 8,
        prerequisites: ['eco_industrial_park'],
        effects: {
          economicVitality: 10,
          gdpGrowth: 0.02,
          eventText: '招商团队带回5个亿元以上项目签约，总投资额超过15亿元。',
        },
      },
      {
        id: 'eco_chain',
        name: '产业链延伸',
        desc: '围绕现有主导产业，引进上下游配套企业，形成产业集群。',
        cost: 400,
        duration: 12,
        prerequisites: ['eco_investment'],
        effects: {
          gdpGrowth: 0.03,
          economicVitality: 8,
          eventText: '产业链初步成形，本地配套率从35%提升至60%，产业韧性显著增强。',
        },
      },
    ],
  },

  // ===== 社会稳定 =====
  stability: {
    name: '社会稳定',
    icon: '🏘',
    color: '#16a34a',
    focuses: [
      {
        id: 'stb_petition',
        name: '信访积案化解',
        desc: '集中力量化解信访积案，建立领导包案制度。',
        cost: 100,
        duration: 6,
        prerequisites: [],
        effects: {
          socialTension: -8,
          satisfaction: 3,
          eventText: '成功化解信访积案47件，越级上访量下降60%。',
        },
      },
      {
        id: 'stb_policing',
        name: '社会治安提升',
        desc: '增配城区监控设备和巡逻力量，提高见警率。',
        cost: 250,
        duration: 6,
        prerequisites: [],
        effects: {
          socialTension: -5,
          crisis: 3,
          eventText: '城区治安案件发生率下降35%，群众安全感显著提升。',
        },
      },
      {
        id: 'stb_livelihood',
        name: '重点民生改善',
        desc: '实施一批群众急难愁盼的民生实事项目。',
        cost: 300,
        duration: 8,
        prerequisites: ['stb_petition'],
        effects: {
          satisfaction: 8,
          socialTension: -5,
          eventText: '完成10项民生实事，包括老旧小区改造、农村饮水安全等。',
        },
      },
      {
        id: 'stb_media',
        name: '舆情管控体系',
        desc: '建立网络舆情监测与快速响应机制。',
        cost: 80,
        duration: 4,
        prerequisites: [],
        effects: {
          superiorTrust: 5,
          eventText: '舆情管控体系建成，负面舆情平均处置时间从48小时缩短至6小时。',
        },
      },
    ],
  },

  // ===== 党的建设 =====
  party: {
    name: '党的建设',
    icon: '🚩',
    color: '#dc2626',
    focuses: [
      {
        id: 'pty_cadre_train',
        name: '干部能力培训',
        desc: '组织全县科级以上干部参加专题培训班。',
        cost: 60,
        duration: 4,
        prerequisites: [],
        effects: {
          cadreAbility: 3,
          politicalCapital: 5,
          eventText: '125名干部完成培训，干部队伍专业能力显著提升。',
        },
      },
      {
        id: 'pty_grassroots',
        name: '基层党建示范',
        desc: '打造一批基层党建示范点，以点带面提升全县党建水平。',
        cost: 80,
        duration: 6,
        prerequisites: [],
        effects: {
          partyBuilding: 5,
          superiorTrust: 3,
          eventText: '建成5个基层党建示范点，获得市委组织部通报表扬。',
        },
      },
      {
        id: 'pty_personnel_reform',
        name: '人事考核改革',
        desc: '优化干部考核评价体系，建立能上能下机制。',
        cost: 50,
        duration: 8,
        prerequisites: ['pty_cadre_train'],
        effects: {
          cadreMgmt: 5,
          politicalCapital: 8,
          eventText: '新考核体系运行良好，2名不作为干部被调整，3名实干型干部获提拔。',
        },
      },
      {
        id: 'pty_anticorruption',
        name: '反腐专项巡察',
        desc: '开展重点领域腐败问题专项巡察，形成震慑。',
        cost: 100,
        duration: 8,
        prerequisites: ['pty_grassroots'],
        effects: {
          corruptionIndex: -10,
          politicalCapital: 10,
          eventText: '巡察发现问题线索32条，立案查处5人，挽回经济损失800万元。',
        },
      },
    ],
  },

  // ===== 改革创新 =====
  reform: {
    name: '改革创新',
    icon: '🚀',
    color: '#d97706',
    focuses: [
      {
        id: 'ref_digital',
        name: '数字政府建设',
        desc: '建设一体化政务服务平台，实现"一网通办"。',
        cost: 350,
        duration: 10,
        prerequisites: [],
        effects: {
          bureaucracyEfficiency: 10,
          satisfaction: 5,
          eventText: '政务服务平台上线运行，群众办事平均跑动次数从4次减少到1次。',
        },
      },
      {
        id: 'ref_land',
        name: '农村土地改革',
        desc: '推进农村承包地"三权分置"改革，激活土地要素。',
        cost: 100,
        duration: 8,
        prerequisites: [],
        effects: {
          agriculturalOutput: 8,
          satisfaction: 3,
          eventText: '土地流转面积增加1.2万亩，农业规模化经营水平显著提升。',
        },
      },
      {
        id: 'ref_business',
        name: '营商环境优化',
        desc: '简化审批流程，推行"容缺受理"和"告知承诺制"。',
        cost: 50,
        duration: 6,
        prerequisites: ['ref_digital'],
        effects: {
          economicVitality: 8,
          investment: 15,
          eventText: '营商环境评价在全省排名提升12位，新增注册企业同比增长40%。',
        },
      },
    ],
  },
};

/** 获取所有国策（扁平数组） */
function getAllFocuses() {
  var all = [];
  for (var branch in FOCUS_TREE) {
    for (var i = 0; i < FOCUS_TREE[branch].focuses.length; i++) {
      var f = FOCUS_TREE[branch].focuses[i];
      // 返回副本而非修改原始对象，避免多次调用时的副作用
      all.push(Object.assign({}, f, { branch: branch }));
    }
  }
  return all;
}
