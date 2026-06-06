/**
 * plotlines.js — 5条政治剧情线定义数据
 * 每条剧情线包含: 分支定义、激活条件、关键节点、NPC关联
 *
 * 设计原则:
 * - 不是固定剧本,是"可能性空间"
 * - 每个分支节点有触发条件和多种走向
 * - 玩家的选择决定剧情演化方向
 */

var PLOTLINE_DEFS = {
  // =========================================================
  // 剧情线1: 「龙虎斗」—— 书记县长权力博弈
  // =========================================================
  plot_power_struggle: {
    id: 'plot_power_struggle',
    name: '龙虎斗',
    subtitle: '书记与县长的权力边界',
    theme: 'power',
    description: '县长王立永是经验丰富的政府一把手。作为县委书记,您需要不断处理党政"双首长制"下的权力边界问题——是合作、对抗还是架空?',
    autoActivate: true,
    activateYear: 1,
    activateWeek: 1,
    associatedNpcs: ['magistrate', 'deputy_magistrate', 'deputy_secretary', 'office_director'],
    tags: ['power', 'faction', 'leadership'],
    branches: [
      {
        id: 'branch_cooperation',   // 合作共治
        name: '合作共治',
        triggerCondition: { type: 'faction_relation', faction: 'magistrate', min: 5 },
        progressDelta: 15,
        events: [
          { type: 'choice', title: '县长拜码头', description: '新任县长王立永第一次正式汇报工作,态度恭敬但话里有话。他表示政府工作请书记多支持。' },
          { type: 'choice', title: '县长提出财政预算方案', description: '县长提交年度财政预算报告,其中包含工业园区扩建的大额支出。' },
          { type: 'choice', title: '市长询问班子配合情况', description: '市委张书记在电话中旁敲侧击询问您和县长的配合情况。' },
        ],
        progressToClimax: 70,
        climaxEvent: {
          title: '合作考验',
          description: '县长系和书记系在重大人事问题上出现分歧。合作还是对抗,在此一举。'
        },
        possibleOutcomes: ['双赢合作', '一方主导', '表面和睦'],
      },
      {
        id: 'branch_confrontation',  // 暗中对抗
        name: '暗中对抗',
        triggerCondition: { type: 'faction_relation', faction: 'magistrate', max: -5 },
        progressDelta: 20,
        events: [
          { type: 'choice', title: '县长开始拉拢本土系', description: '王立永在私下接触本土系干部,试图建立自己的权力基础。' },
          { type: 'choice', title: '常委会投票分歧', description: '县长在常委会上公开反对您提出的人事调整方案。' },
          { type: 'choice', title: '县长向市委汇报', description: '县长单独向市委领导汇报工作,汇报内容未与您事先沟通。' },
        ],
        progressToClimax: 75,
        climaxEvent: {
          title: '摊牌时刻',
          description: '党政矛盾公开化。市委可能介入调解,也可能让一方调离。'
        },
        possibleOutcomes: ['县长调离', '书记被架空', '党政分家', '市委调解'],
      },
      {
        id: 'branch_vacuum',         // 权力真空
        name: '权力真空',
        triggerCondition: { type: 'default' },
        progressDelta: 8,
        events: [
          { type: 'choice', title: '县长自行其是', description: '在您没有明确表态的领域,县长开始自行决策。' },
          { type: 'choice', title: '各派系争夺权力', description: '由于书记和县长都没有明确掌控局面,各派系开始自行其是。' },
        ],
        progressToClimax: 65,
        climaxEvent: {
          title: '权力重组',
          description: '书记和县长必须重新确立权威,否则将被边缘化。'
        },
        possibleOutcomes: ['重新集权', '被边缘化', '派系自治'],
      },
    ],
  },

  // =========================================================
  // 剧情线2: 「套中人」—— 腐败与廉政调查
  // =========================================================
  plot_corruption_web: {
    id: 'plot_corruption_web',
    name: '套中人',
    subtitle: '腐败、调查与保护伞',
    theme: 'corruption',
    description: '县内腐败网络逐渐浮现。纪委书记陈洁(空降系)持续施压要求调查。您可能成为清廉斗士,也可能深陷其中。',
    autoActivate: false,
    activateCondition: { type: 'threshold', key: 'corruptionIndex', min: 25 },
    activateYear: 1,
    activateWeekMin: 10,
    activateWeekMax: 15,
    associatedNpcs: ['discipline', 'housing_bureau', 'audit_bureau', 'finance_bureau'],
    tags: ['corruption', 'investigation', 'integrity'],
    branches: [
      {
        id: 'branch_clean',          // 清廉路线
        name: '清廉路线',
        triggerCondition: { type: 'decision', eventType: 'investigation', stance: 'support' },
        progressDelta: 18,
        events: [
          { type: 'choice', title: '审计发现异常', description: '审计局长陈公正提交报告:住建局多个工程项目存在利益输送嫌疑。' },
          { type: 'choice', title: '赵铁柱案', description: '住建局长赵铁柱(本土系)被纪委约谈。调查可能指向更高层。' },
          { type: 'choice', title: '调查遇上阻力', description: '有人通过中间人传话,希望"高抬贵手"。来自哪个派系?威胁还是请求?', hasPlotlineImpact: true },
          { type: 'choice', title: '上级关注', description: '市纪委过问案件进展。' },
        ],
        progressToClimax: 80,
        climaxEvent: {
          title: '风暴或收网',
          description: '腐败网络的核心浮出水面。是扩大调查还是就此止步?'
        },
        possibleOutcomes: ['彻底清肃', '有限反腐', '被反扑'],
      },
      {
        id: 'branch_selective',      // 选择性反腐
        name: '选择性反腐',
        triggerCondition: { type: 'decision', eventType: 'investigation', stance: 'limited' },
        progressDelta: 12,
        events: [
          { type: 'choice', title: '只打小不打大', description: '处理几个科级干部,但不动核心人物。空降系不满,本土系松口气。' },
          { type: 'choice', title: '保护伞的代价', description: '您庇护的干部出了新问题,牵连风险上升。' },
          { type: 'choice', title: '省巡视组进驻', description: '省纪委巡视组不期而至,气氛紧张。' },
        ],
        progressToClimax: 70,
        climaxEvent: {
          title: '巡视风暴',
          description: '巡视组发现了端倪。必须做最后的抉择。'
        },
        possibleOutcomes: ['过关', '被牵连', '丢卒保车'],
      },
      {
        id: 'branch_protective',     // 保护伞路线
        name: '同流合污',
        triggerCondition: { type: 'decision', eventType: 'investigation', stance: 'suppress' },
        progressDelta: 15,
        events: [
          { type: 'choice', title: '压住举报信', description: '几封举报信到了您的案头。您决定压下。' },
          { type: 'choice', title: '腐败网络扩大', description: '越来越多的干部开始"上供"。腐败指数上升,但干部忠诚度扭曲。' },
          { type: 'choice', title: '企业主被查', description: '一位行贿者在外地被捕,可能供出本地关系网。' },
          { type: 'choice', title: '省纪委盯上', description: '可靠消息:您的名字出现在省纪委的关注名单上。' },
        ],
        progressToClimax: 82,
        climaxEvent: {
          title: '清算日',
          description: '省纪委工作组正式进驻。毁灭证据、找人顶罪、争取宽大——选择不多了。'
        },
        possibleOutcomes: ['落马入狱', '侥幸过关', '主动坦白'],
      },
    ],
  },

  // =========================================================
  // 剧情线3: 「外来者」—— 空降系与本土地缘冲突
  // =========================================================
  plot_local_vs_appointed: {
    id: 'plot_local_vs_appointed',
    name: '外来者',
    subtitle: '空降系与本土系的地缘冲突',
    theme: 'reform',
    description: '空降系干部(陈洁、王小明等)与本土系(吴德、赵铁柱等)持续冲突。上级意志与地方利益之间的张力贯穿您整个任期。',
    autoActivate: false,
    activateCondition: { type: 'threshold', key: 'faction_tension', min: 10 },
    activateYear: 1,
    activateWeekMin: 5,
    activateWeekMax: 8,
    associatedNpcs: ['united_front', 'discipline', 'tech_bureau', 'civil_affairs', 'housing_bureau', 'health_bureau'],
    tags: ['faction', 'local', 'appointed', 'reform'],
    branches: [
      {
        id: 'branch_centralize',     // 中央集权
        name: '中央集权',
        triggerCondition: { type: 'faction_relation', faction: 'appointed', min: 10 },
        progressDelta: 15,
        events: [
          { type: 'choice', title: '支持空降系提议', description: '陈洁提出的廉政教育中心方案得到您的支持。本土系不满。' },
          { type: 'choice', title: '本土系消极抵抗', description: '本土系干部开始消极怠工,基层政策执行出现困难。' },
          { type: 'choice', title: '上级认可', description: '市委表扬了县里的"政治意识"。空降系地位上升。' },
          { type: 'choice', title: '本土系反击', description: '本土系通过人脉关系在市级层面活动,试图扭转局面。' },
        ],
        progressToClimax: 72,
        climaxEvent: {
          title: '地头蛇的反扑',
          description: '本土系联合县级老干部向市委告状。空降系和本土系的冲突到了必须解决的时候。'
        },
        possibleOutcomes: ['空降系完胜', '本土系妥协', '两败俱伤'],
      },
      {
        id: 'branch_decentralize',   // 地方自治
        name: '地方自治',
        triggerCondition: { type: 'faction_relation', faction: 'local', min: 10 },
        progressDelta: 15,
        events: [
          { type: 'choice', title: '照顾本土利益', description: '在人事任命上优先考虑本地干部。本土系满意,空降系不满。' },
          { type: 'choice', title: '空降系向上反映', description: '陈洁在向市纪委汇报工作时提到了"地方保护主义倾向"。' },
          { type: 'choice', title: '市里过问', description: '市委组织部来了解班子运行情况。' },
        ],
        progressToClimax: 70,
        climaxEvent: {
          title: '调查组来了',
          description: '市级调查组进驻,了解"干部使用情况"。本土系的保护伞能否顶住?'
        },
        possibleOutcomes: ['本土系稳固', '空降系反扑', '中间路线'],
      },
      {
        id: 'branch_balance',        // 平衡路线
        name: '平衡路线',
        triggerCondition: { type: 'default' },
        progressDelta: 10,
        events: [
          { type: 'choice', title: '分配双方利益', description: '在重要职位和项目上平衡分配。双方都不满意,但谁也不公开反对。' },
          { type: 'choice', title: '消耗政治资本', description: '维持平衡需要消耗大量的政治资本和人脉资源。' },
          { type: 'choice', title: '平衡被打破', description: '某一方通过外部力量获得优势。脆弱的平衡难以为继。' },
        ],
        progressToClimax: 65,
        climaxEvent: {
          title: '倒向一边',
          description: '长期平衡终于被打破。您被迫做出最终选择。'
        },
        possibleOutcomes: ['偏向上级', '偏向地方', '持续消耗'],
      },
    ],
  },

  // =========================================================
  // 剧情线4: 「指挥棒」—— 政绩与发展路径之争
  // =========================================================
  plot_development_path: {
    id: 'plot_development_path',
    name: '指挥棒',
    subtitle: '政绩指挥棒下的发展道路抉择',
    theme: 'development',
    description: '选择年度治理路线决定了县的命运。工业、民生、生态、改革——每条路都有收益和代价。这是您施政纲领的体现。',
    autoActivate: true,
    activateYear: 1,
    activateWeek: 1,
    associatedNpcs: ['magistrate', 'dev_reform', 'finance_bureau', 'tech_bureau'],
    tags: ['economy', 'development', 'strategy'],
    branches: [
      {
        id: 'branch_industrial',     // 工业强县
        name: '工业强县',
        triggerCondition: { type: 'strategy', strategy: 'industrial' },
        progressDelta: 14,
        events: [
          { type: 'choice', title: '招商引资大会战', description: '工业园区新增3家企业,GDP增速亮眼但能耗指标承压。' },
          { type: 'choice', title: '环保问责', description: '省环保督查组发现工业园污染问题,要求限期整改。' },
          { type: 'choice', title: '产能过剩', description: '全国性产能过剩波及本县,部分企业开始减产。' },
        ],
        progressToClimax: 75,
        climaxEvent: {
          title: '路径依赖',
          description: '产业单一化的风险暴露。转型升级需要巨大投入,维持现状面临环保问责。'
        },
        possibleOutcomes: ['成功转型', '环保被问责', 'GDP牺牲环保', '平稳过渡'],
      },
      {
        id: 'branch_livelihood',     // 民生为本
        name: '民生为本',
        triggerCondition: { type: 'strategy', strategy: 'people' },
        progressDelta: 12,
        events: [
          { type: 'choice', title: '民生投入见效', description: '教育、医疗、社保投入增加,群众满意度上升。' },
          { type: 'choice', title: '上级施压', description: '市委要求加快经济增长速度,民生路线受到质疑。' },
          { type: 'choice', title: '财政压力', description: '民生支出刚性强,财政收入增速跟不上。' },
        ],
        progressToClimax: 68,
        climaxEvent: {
          title: '民生与增长的两难',
          description: '省级考核指标偏重经济增长。继续民生路线还是转向?'
        },
        possibleOutcomes: ['坚持民生获表彰', '被迫转向经济', '财政危机'],
      },
      {
        id: 'branch_ecology',        // 生态立县
        name: '生态立县',
        triggerCondition: { type: 'strategy', strategy: 'ecology' },
        progressDelta: 12,
        events: [
          { type: 'choice', title: '生态项目获表彰', description: '生态修复项目获得省级表彰,环保考核加分。' },
          { type: 'choice', title: '经济滞后', description: 'GDP增速全市垫底,被质疑"不作为"。' },
          { type: 'choice', title: '生态红利初现', description: '良好的生态环境开始吸引绿色产业和康养项目。' },
        ],
        progressToClimax: 70,
        climaxEvent: {
          title: '短期政绩vs长期价值',
          description: '任期过半,政绩考核压力巨大。生态路线开始见效了吗?'
        },
        possibleOutcomes: ['生态经济双赢', '政绩不达标', '中途转向'],
      },
      {
        id: 'branch_reform',         // 改革先锋
        name: '改革先锋',
        triggerCondition: { type: 'strategy', strategy: 'reform' },
        progressDelta: 16,
        events: [
          { type: 'choice', title: '改革遭遇抵制', description: '行政审批改革触动部门利益,官僚系和本土系联合抵制。' },
          { type: 'choice', title: '改革初见成效', description: '营商环境和行政效率明显提升,获得企业好评。' },
          { type: 'choice', title: '触动利益集团', description: '改革触及深层利益,反对声浪升级。' },
        ],
        progressToClimax: 78,
        climaxEvent: {
          title: '改革者VS既得利益',
          description: '改革进入深水区。退一步前功尽弃,进一步可能引发动荡。'
        },
        possibleOutcomes: ['改革成功', '半途而废', '引发动荡', '被调离'],
      },
    ],
  },

  // =========================================================
  // 剧情线5: 「接班人」—— 派系重组与继任危机
  // =========================================================
  plot_succession_crisis: {
    id: 'plot_succession_crisis',
    name: '接班人',
    subtitle: '派系重组、干部培养与权力交接',
    theme: 'succession',
    description: '任期过半,各派系开始为下一届权力布局。培养谁做接班人?自己的政治遗产是什么?',
    autoActivate: false,
    activateYear: 2,
    activateWeekMin: 40,
    activateWeekMax: 52,
    associatedNpcs: ['organization', 'deputy_secretary', 'deputy_magistrate', 'united_front', 'propaganda'],
    tags: ['succession', 'personnel', 'legacy'],
    branches: [
      {
        id: 'branch_cultivate',      // 培养接班人
        name: '培养接班人',
        triggerCondition: { type: 'default' },
        progressDelta: 14,
        events: [
          { type: 'choice', title: '组织部长汇报', description: '周明汇报:多名干部有"进步意愿"。县里需要确定后备人选。' },
          { type: 'choice', title: '选定培养对象', description: '您决定重点培养某位干部,这引起了其他派系的关注。' },
          { type: 'choice', title: '派系站队', description: '各派系围绕候选人展开博弈。谁将接班是最大的不确定性。' },
          { type: 'choice', title: '培养成果检验', description: '被培养的干部承担重要任务。表现如何将决定一切。' },
        ],
        progressToClimax: 72,
        climaxEvent: {
          title: '权力交接',
          description: '任期将满。您的接班人能顺利接棒吗?政治遗产能否延续?'
        },
        possibleOutcomes: ['顺利接班', '接班失败', '遗产延续', '被清算'],
      },
      {
        id: 'branch_balance',
        name: '平衡布局',
        triggerCondition: { type: 'default', exclusive: true },
        progressDelta: 10,
        events: [
          { type: 'choice', title: '平衡各派利益', description: '在接班人问题上不表态,让各派系自行竞争。' },
          { type: 'choice', title: '派系角力加剧', description: '没有明确的接班人信号,各派系斗争更为激烈。' },
        ],
        progressToClimax: 65,
        climaxEvent: {
          title: '换届前夜',
          description: '各派系都已布局完毕。您的去向将成为决定因素。'
        },
        possibleOutcomes: ['全身而退', '被边缘化', '延续影响力'],
      },
      {
        id: 'branch_ignore',         // 不刻意培养
        name: '顺其自然',
        triggerCondition: { type: 'default', exclusive: true },
        progressDelta: 6,
        events: [
          { type: 'choice', title: '组织部长暗示', description: '周明含蓄地提醒:书记应该考虑后路了。但您没有在意。' },
          { type: 'choice', title: '各派系自行布局', description: '没有您的指引,各派系开始自行其是。' },
        ],
        progressToClimax: 55,
        climaxEvent: {
          title: '失控',
          description: '换届临近,局面超出控制。您的影响力所剩无几。'
        },
        possibleOutcomes: ['失去影响力', '被架空', '突然调用'],
      },
    ],
  },
};

/** 获取所有剧情线定义 */
function getAllPlotlineDefs() { return PLOTLINE_DEFS; }

/** 获取单条剧情线定义 */
function getPlotlineDef(id) { return PLOTLINE_DEFS[id] || null; }

/** 获取指定主题的所有剧情线 */
function getPlotlinesByTheme(theme) {
  var result = [];
  for (var id in PLOTLINE_DEFS) {
    if (PLOTLINE_DEFS[id].theme === theme) result.push(PLOTLINE_DEFS[id]);
  }
  return result;
}
