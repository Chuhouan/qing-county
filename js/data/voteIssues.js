/**
 * voteIssues.js - 常委会投票议题池
 * 按类别组织，每类2-3个议题，各有不同的factor参数
 * 委员根据自身诉求(demands)对同一议题产生不同投票倾向
 */
const VOTE_ISSUES = [
  {
    category: 'economy',
    name: '经济发展',
    icon: '📈',
    issues: [
      {
        id: 'industrial_park',
        name: '建设城东工业园区',
        desc: '规划占地500亩，引进装备制造和电子信息企业，预计年产值15亿',
        factors: { economicBenefit: 75, environmentalRisk: 70, superiorSupport: 45, fiscalContribution: 55, publicOpposition: 40, pastAccidents: false },
        effects: { pass: 'gdp增速+0.6%，财政月入+80万，环境指数-3，社会张力+2' },
      },
      {
        id: 'new_energy',
        name: '引进新能源汽车项目',
        desc: '引进某新能源车企设立零部件生产基地，总投资8亿，省里重点推荐',
        factors: { economicBenefit: 60, environmentalRisk: 35, superiorSupport: 65, fiscalContribution: 40, publicOpposition: 20, pastAccidents: false },
        effects: { pass: 'gdp增速+0.4%，财政月入+50万，就业岗位+2000' },
      },
      {
        id: 'tourism_dev',
        name: '开发古城旅游区',
        desc: '修缮古城历史街区，打造文旅IP，预计年游客50万人次',
        factors: { economicBenefit: 30, environmentalRisk: 20, superiorSupport: 30, fiscalContribution: -20, publicOpposition: 15, pastAccidents: false },
        effects: { pass: 'gdp增速+0.2%，财政月支出+30万，社会满意度+3' },
      },
    ],
  },
  {
    category: 'finance',
    name: '财政预算',
    icon: '💰',
    issues: [
      {
        id: 'education_budget',
        name: '追加教育经费预算',
        desc: '将教育经费从占比15%提升至20%，主要用于乡村学校改造和教师待遇',
        factors: { economicBenefit: 40, environmentalRisk: 10, superiorSupport: 25, fiscalContribution: -40, publicOpposition: 10, pastAccidents: false },
        effects: { pass: '财政月支出+120万，社会满意度+5，长期人力资本提升' },
      },
      {
        id: 'road_bond',
        name: '发行专项债修路',
        desc: '申请发行2亿元专项债券，用于县域骨干道路升级改造',
        factors: { economicBenefit: 65, environmentalRisk: 30, superiorSupport: 55, fiscalContribution: -30, publicOpposition: 25, pastAccidents: false },
        effects: { pass: '基础设施+10，债务率+8%，交通物流成本下降' },
      },
      {
        id: 'austerity',
        name: '压缩三公经费',
        desc: '将全县三公经费压缩20%，节省资金用于民生项目',
        factors: { economicBenefit: 10, environmentalRisk: 5, superiorSupport: 40, fiscalContribution: 30, publicOpposition: -20, pastAccidents: false },
        effects: { pass: '财政月支出-50万，社会满意度+2，干部士气-3' },
      },
    ],
  },
  {
    category: 'personnel',
    name: '人事任免',
    icon: '👥',
    issues: [
      {
        id: 'finance_chief',
        name: '提名新任财政局长',
        desc: '现任局长李为民即将退休，组织部推荐两名候选人：A.张建国（发改局长）B.赵志远（人社局长）请常委会审议',
        factors: { economicBenefit: 25, environmentalRisk: 15, superiorSupport: 50, fiscalContribution: 30, publicOpposition: 20, pastAccidents: false },
        effects: { pass: '人事调整完成，各部门配合度重新洗牌' },
      },
      {
        id: 'town_mayor',
        name: '调整三个乡镇长人选',
        desc: '根据考核结果，拟对正定镇、新城铺镇、南牛乡三个乡镇的行政主官进行轮岗交流',
        factors: { economicBenefit: 20, environmentalRisk: 10, superiorSupport: 35, fiscalContribution: 10, publicOpposition: 40, pastAccidents: false },
        effects: { pass: '基层执行力+5，干部满意度-2，短期稳定度-2' },
      },
    ],
  },
  {
    category: 'social',
    name: '社会管理',
    icon: '🏘️',
    issues: [
      {
        id: 'land_acquisition',
        name: '城北片区征地拆迁方案',
        desc: '城北新区建设涉及3个村280户征迁，补偿方案总预算1.2亿',
        factors: { economicBenefit: 45, environmentalRisk: 25, superiorSupport: 40, fiscalContribution: 35, publicOpposition: 75, pastAccidents: true },
        effects: { pass: '城市发展空间打开，社会张力+8，财政支出+300万' },
      },
      {
        id: 'safety_crackdown',
        name: '安全生产大整治行动',
        desc: '针对近期周边县市事故频发，开展为期三个月的全县安全生产隐患大排查',
        factors: { economicBenefit: 15, environmentalRisk: 10, superiorSupport: 60, fiscalContribution: -15, publicOpposition: 10, pastAccidents: true },
        effects: { pass: '安全事故概率-30%，短期企业停产损失，社会满意度+2' },
      },
    ],
  },
  {
    category: 'reform',
    name: '改革试点',
    icon: '🔄',
    issues: [
      {
        id: 'land_reform',
        name: '申报农村土地改革试点',
        desc: '争取省级农村集体经营性建设用地入市改革试点，盘活农村闲置土地资源',
        factors: { economicBenefit: 50, environmentalRisk: 20, superiorSupport: 45, fiscalContribution: 25, publicOpposition: 45, pastAccidents: false },
        effects: { pass: '农村土地价值释放，财政长期+，社会稳定风险中期+3' },
      },
      {
        id: 'digital_gov',
        name: '数字政府建设方案',
        desc: '推进"一网通办"和政务数据共享，预计建设期1年，投入2000万',
        factors: { economicBenefit: 30, environmentalRisk: 5, superiorSupport: 55, fiscalContribution: -10, publicOpposition: 15, pastAccidents: false },
        effects: { pass: '行政效率+10%，企业满意度+5，财政支出-100万/年（长期节约）' },
      },
    ],
  },
  {
    category: 'party',
    name: '党建纪检',
    icon: '🔨',
    issues: [
      {
        id: 'corruption_crackdown',
        name: '干部作风专项整治',
        desc: '落实省委巡视整改要求，开展为期半年的"四风"问题专项整治',
        factors: { economicBenefit: 10, environmentalRisk: 45, superiorSupport: 60, fiscalContribution: 5, publicOpposition: 25, pastAccidents: false },
        effects: { pass: '廉政指数+5，腐败风险-10%，干部士气-3，上级信任+5' },
      },
      {
        id: 'inspection_reform',
        name: '巡视整改方案落实',
        desc: '省委巡视组反馈意见整改方案，涉及4大类12项具体问题整改',
        factors: { economicBenefit: 5, environmentalRisk: 60, superiorSupport: 65, fiscalContribution: 10, publicOpposition: 20, pastAccidents: false },
        effects: { pass: '上级信任+8，廉政指数+3，行政效率短期-5%' },
      },
    ],
  },
];
