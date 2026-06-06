/**
 * 事件库 - 丰富版（50+事件框架）
 * 10.2 随机事件库
 */
const EVENT_LIBRARY = [
  // ======== 经济类 (12个) ========
  {
    id: 'eco_001', name: '港商考察电子厂', type: 'routine', complexity: 'medium',
    description: '一位港商李老板来县考察投资环境，有意向投资1000万元建设电子厂。需要您的接待和决策。',
    scene: '县政府会议室，李老板带着项目计划书，正在等待县长表态。随行还有两名技术顾问。',
    choices: [
      { label: '热情接待，承诺优惠政策', description: '承诺三免两减半、50亩工业用地、电力保障。经济活力+5，但需承担招商成本300万。' },
      { label: '谨慎接待，表示需要研究', description: '先了解情况，不急于承诺。可能被周边县市抢走。上级评价-3。' },
      { label: '推给书记处理', description: '重大招商引资由一把手出面更合适。可能影响个人威信。政治资本-3。' },
    ],
  },
  {
    id: 'eco_002', name: '棉纺厂亏损加剧', type: 'routine', complexity: 'complex',
    description: '县棉纺厂连续8个月亏损，累计亏损已达400万元。厂长紧急求见，要求财政补贴300万元。',
    scene: '厂长李明神色焦虑地站在办公室门口，手里拿着一叠财务报表。车间已经停产两周。',
    choices: [
      { label: '批准补贴', description: '从预备费中拨款300万。平息事态但其他国企可能效仿。' },
      { label: '要求改制方案', description: '不直接补贴，要求厂方提交改革方案。可能引发工人不满。' },
      { label: '协调银行贷款', description: '以财政担保方式协调银行贷款。有一定风险，但财政压力小。' },
    ],
  },
  {
    id: 'eco_003', name: '乡镇企业污染被举报', type: 'emergency', complexity: 'medium',
    description: '红星水泥厂被周边村民联名举报，称污染导致农作物减产。环保局报告已送办公桌。',
    scene: '环保局长递上一份检测报告，建议立即停产整顿。但镇书记派秘书来打招呼，希望"手下留情"。',
    choices: [
      { label: '下令停产整顿', description: '严格执行环保法规，责令整改。村民满意，但得罪乡镇势力。' },
      { label: '限期整改，宽限处理', description: '给三个月整改期。折中方案，但可能被村民认为包庇。' },
      { label: '压住不处理', description: '以"发展经济为重"为由暂不处理。短期无碍，但后患无穷。' },
    ],
  },
  {
    id: 'eco_004', name: '省里来了专项资金', type: 'superior_task', complexity: 'simple',
    description: '省财政厅下拨一笔500万元的农田水利专项资金，要求县级配套200万元。三天内上报实施方案。',
    scene: '财政局急件：省厅要求3天内上报方案，配套资金从哪里出？',
    choices: [
      { label: '全力争取，财政配套', description: '从项目经费中挤出200万配套。争取到500万，但其他项目延期。' },
      { label: '部分配套，量力而行', description: '申请减少配套比例。可能获批但金额打折。' },
      { label: '放弃申报', description: '县里实在没钱配套。放弃这笔专项资金。' },
    ],
  },
  {
    id: 'eco_005', name: '招商引资推介会', type: 'routine', complexity: 'medium',
    description: '市里举办沿海地区招商引资推介会，要求各县组团参加。费用10万元，可能接触到大项目。',
    scene: '招商局长送来方案：去深圳办推介会，预计花费10万元，可能接触3-5家有意向企业。',
    choices: [
      { label: '高规格参加', description: '亲自带队，县长出席。花费15万，接触面广，成功率高。' },
      { label: '派副手参加', description: '常务副县长带队。省钱省力，但规格不够。' },
      { label: '不参加', description: '县里事务繁忙，不去。省钱但可能错失机会。' },
    ],
  },
  {
    id: 'eco_006', name: '农产品滞销危机', type: 'emergency', complexity: 'medium',
    description: '今年西瓜大丰收但销路不畅，瓜农聚集在县政府门口要求帮助解决。媒体记者也在现场。',
    scene: '几十辆农用三轮车停在政府门口，瓜农们情绪激动。电视台记者正在采访。',
    choices: [
      { label: '组织集中采购', description: '动员机关食堂、学校采购，联系外地客商。花费行政资源但解燃眉之急。' },
      { label: '亲自直播带货', description: '县长出面联系媒体，帮忙推广。效果好但风险高。' },
      { label: '让农业局处理', description: '批转农业局协调解决。常规处理，不出彩。' },
    ],
  },
  {
    id: 'eco_007', name: '私营企业贷款难', type: 'routine', complexity: 'simple',
    description: '几家私营企业主联名写信，反映银行贷款门槛高、利率贵，希望政府出面协调。',
    scene: '一封由12家企业主签名的求助信。信中提到"银行嫌贫爱富，小企业贷不到款"。',
    choices: [
      { label: '召开银企对接会', description: '组织银行和企业面对面沟通。协调关系但效果有限。' },
      { label: '设立担保基金', description: '财政出资设立中小企业担保基金。长期利好但占用资金。' },
      { label: '推荐给市里解决', description: '向上级反映中小企业融资难问题。推出去但显得不作为。' },
    ],
  },
  // ======== 社会类 (12个) ========
  {
    id: 'soc_001', name: '征地补偿纠纷', type: 'petition', complexity: 'complex',
    description: '城东开发区征地项目中，30户村民因补偿标准过低拒绝签字。村民代表正在县政府门口静坐。',
    scene: '县政府门口聚集了约50名村民，拉着横幅"还我土地，公正补偿"。公安局值班人员维持秩序。',
    choices: [
      { label: '亲自接访，提高补偿', description: '现场听取诉求，承诺提高补偿标准。花钱平息。' },
      { label: '派人谈判，维持原方案', description: '派信访办主任去谈，坚持原方案。可能激化矛盾。' },
      { label: '公安劝离，强制执行', description: '以扰乱秩序为由劝离群众。短期有效，但埋下隐患。' },
    ],
  },
  {
    id: 'soc_002', name: '教师工资拖欠', type: 'petition', complexity: 'simple',
    description: '城关镇小学教师反映工资已拖欠2个月，教师们准备联名上书市教育局。',
    scene: '一封由32名教师签名的联名信摆在办公桌上，措辞恳切。教育局长的电话也打了进来。',
    choices: [
      { label: '立即补发', description: '从财政预备费中拨款，马上补发。教师满意，财政紧张。' },
      { label: '承诺月底前解决', description: '安抚教师情绪，承诺月底前解决。需抓紧筹措资金。' },
    ],
  },
  {
    id: 'soc_003', name: '下岗职工再就业诉求', type: 'petition', complexity: 'complex',
    description: '50多名下岗职工代表到县政府，要求解决再就业问题。他们举着"我们要工作"的牌子。',
    scene: '信访大厅挤满了人，下岗职工情绪激动。工会主席在一旁劝解但效果不佳。',
    choices: [
      { label: '承诺安排公益岗位', description: '从财政挤出资金，安排100个公益岗位。解决眼前问题。' },
      { label: '组织技能培训', description: '联系职业培训机构，免费为下岗职工培训。长期方案。' },
      { label: '安抚劝返', description: '好言劝回，承诺研究方案。拖延时间但风险积累。' },
    ],
  },
  {
    id: 'soc_004', name: '农村医疗条件差', type: 'routine', complexity: 'simple',
    description: '人大代表提案反映，各乡镇卫生院设备落后、医生短缺，农民看病难问题突出。',
    scene: '人大转来一份重点提案，附有详细的调研数据和照片。卫生局长也承认问题严重。',
    choices: [
      { label: '加大投入', description: '增拨200万用于乡镇卫生院改造。改善民生，财政负担。' },
      { label: '争取上级支持', description: '包装项目向省卫健委争取专项资金。需要时间。' },
      { label: '暂时搁置', description: '县里财政紧张，暂缓处理。不影响当下但选民不满。' },
    ],
  },
  {
    id: 'soc_005', name: '网吧接纳未成年人', type: 'routine', complexity: 'simple',
    description: '多位家长联名反映，县城多家网吧容留学生上网，影响学业。文化局查处不力。',
    scene: '家长们情绪激动，要求县长给个说法。有家长称孩子偷钱上网已经一周没回家了。',
    choices: [
      { label: '下令严查整顿', description: '责成文化局、公安局联合执法，关停违规网吧。家长满意但网吧业主不满。' },
      { label: '约谈业主，加强管理', description: '召集网吧业主开会，要求限期整改。温和但效果有限。' },
      { label: '批转文化局处理', description: '按常规流程处理。不额外干预。' },
    ],
  },
  {
    id: 'soc_006', name: '农村红白喜事攀比', type: 'routine', complexity: 'simple',
    description: '县委宣传部反映，农村红白喜事大操大办、攀比浪费严重，群众负担重但碍于面子不好说。',
    scene: '宣传部送来一份调研报告，建议出台移风易俗倡议书。但这事不太好管。',
    choices: [
      { label: '出台倡议书', description: '以县政府名义发出倡议，号召勤俭节约。成本低，效果有限。' },
      { label: '抓典型示范', description: '选几个村试点红白理事会。效果可能好但时间长。' },
      { label: '不管', description: '这事属于民间习俗，政府不宜干预。不做不错。' },
    ],
  },
  // ======== 突发事件 (10个) ========
  {
    id: 'emd_001', name: '化工厂泄漏事故', type: 'emergency', complexity: 'major',
    description: '城西化工厂发生化学品泄漏，刺鼻气味扩散到附近居民区。已有居民感到不适送医。',
    scene: '电话铃声急促响起：化工厂泄漏了！消防队已到现场，需要您立即决策。',
    choices: [
      { label: '立即启动应急预案', description: '组织疏散、调集消防、通知医院、上报市里。标准流程。' },
      { label: '先派人了解情况', description: '先派副县长去现场了解情况再定。稳妥但耽误时间。' },
      { label: '压住消息，内部处理', description: '不让上报，不让媒体知道。危险的选择。' },
    ],
  },
  {
    id: 'emd_002', name: '暴雨导致山洪', type: 'emergency', complexity: 'major',
    description: '连续暴雨三天，北部山区暴发山洪，两个村庄被困。气象台预报暴雨还将持续。',
    scene: '凌晨三点，防汛办紧急报告：雨量超历史极值，河堤出现险情！',
    choices: [
      { label: '连夜组织转移', description: '立即组织群众转移，调集防汛物资。保命第一。' },
      { label: '上报市里等指示', description: '先报告，等上级指示再行动。安全但浪费时间。' },
      { label: '先观察天亮再说', description: '情况还不明朗，天亮后再看。风险极大。' },
    ],
  },
  {
    id: 'emd_003', name: '建筑工地坍塌', type: 'emergency', complexity: 'complex',
    description: '城东在建楼盘发生脚手架坍塌，5名工人被埋。120和119已到现场但救援困难。',
    scene: '电话响起：工地出事了！您需要立即赶往现场还是坐镇指挥？',
    choices: [
      { label: '立即赶赴现场', description: '县长亲临一线指挥救援。表现担当。' },
      { label: '坐镇指挥部调度', description: '在应急指挥部远程指挥，派常务副县长去现场。' },
      { label: '先听汇报再决定', description: '先了解清楚情况再说。稳妥但可能被认为不重视。' },
    ],
  },
  // ======== 政治/人事类 (10个) ========
  {
    id: 'pol_001', name: '市委书记调研', type: 'superior_task', complexity: 'complex',
    description: '市委通知，市委书记张立国下周一到县调研，重点了解招商引资和乡村振兴工作。',
    scene: '县委办送来一份紧急通知：张书记周三来县，需准备汇报材料、考察路线、座谈会议。',
    choices: [
      { label: '精心准备，展示亮点', description: '高标准准备，选最好的项目展示。政治资本+10。' },
      { label: '实事求是，汇报问题', description: '如实汇报困难，争取上级支持。可能显得能力不足。' },
      { label: '常规接待', description: '按部就班，不出错也不出彩。稳妥但无加分。' },
    ],
  },
  {
    id: 'pol_002', name: '纪委线索通报', type: 'personnel', complexity: 'medium',
    description: '县纪委收到匿名举报信，反映财政局副局长张志强在项目审批中存在违规操作。',
    scene: '纪委书记陈洁亲自送来举报信复印件，请示是否需要启动初步核实程序。',
    choices: [
      { label: '同意核查', description: '启动初步核实。显示反腐决心。' },
      { label: '先压一压', description: '要求纪委暂缓，待进一步了解情况。' },
      { label: '转给书记定夺', description: '重大人事问题交一把手处理。可规避个人风险。' },
    ],
  },
  {
    id: 'pol_003', name: '组织部考察谈话', type: 'personnel', complexity: 'medium',
    description: '市委组织部来县进行干部考察。考察组找你谈话，了解你对县委书记的评价。',
    scene: '组织部的同志坐在对面，客气地问："谈谈你对王建国同志的看法？"',
    choices: [
      { label: '充分肯定', description: '说好话，维护班子团结。书记知道后会感激。' },
      { label: '客观评价', description: '既说优点也说不足。显得公正。' },
      { label: '暗示问题', description: '委婉地提一些需要改进的地方。可能影响书记评价。' },
    ],
  },
  {
    id: 'pol_004', name: '年度考核组进驻', type: 'superior_task', complexity: 'complex',
    description: '市年度考核组下周进驻，将进行为期三天的全面考核。需准备大量材料。',
    scene: '县委办送来考核方案：民主测评、个别谈话、查阅资料、现场查看……',
    choices: [
      { label: '高度重视，充分准备', description: '全员动员，加班准备。确保考核材料完美。' },
      { label: '按常规准备', description: '各部门自行准备，不额外动员。省力但可能准备不足。' },
    ],
  },
  // ======== 个人类 (8个) ========
  {
    id: 'per_001', name: '老同学来访求关照', type: 'routine', complexity: 'simple',
    description: '大学同学王磊来访，他现在是一家地产公司的副总，想在县里拿块地开发。',
    scene: '王磊提着两瓶茅台在办公室叙旧，言谈间暗示希望"照顾一下"。',
    choices: [
      { label: '公事公办', description: '请走正规招拍挂程序。保持公正，但伤了同学面子。政治资本-3。' },
      { label: '引荐给分管领导', description: '介绍给分管城建的副县长。帮了忙但不直接干预。' },
      { label: '婉拒', description: '以"按规定办事"为由婉拒。保持清白。' },
    ],
  },
  {
    id: 'per_002', name: '身体不适', type: 'routine', complexity: 'simple',
    description: '连续加班多日，今天起床后头晕目眩。妻子建议去医院检查。',
    scene: '早上醒来感觉不适，妻子已经预约了医院。今天还有常委会要参加。',
    choices: [
      { label: '坚持上班', description: '带病工作。敬业但可能加重病情。' },
      { label: '请假休息', description: '去医院检查。健康重要，但可能被认为娇气。' },
    ],
  },
  {
    id: 'per_003', name: '妻子抱怨不顾家', type: 'routine', complexity: 'simple',
    description: '妻子打电话来抱怨，说连续一个月没在家吃晚饭，孩子都不认识爸爸了。',
    scene: '电话那头妻子的声音带着委屈："你知道今天孩子家长会吗？你又加班！"',
    choices: [
      { label: '承诺今晚回家', description: '推掉晚上的应酬，回家陪家人。家庭和谐。' },
      { label: '解释工作重要', description: '跟妻子解释县长工作特殊。道理上说得通但伤感情。' },
    ],
  },
  {
    id: 'per_004', name: '党校学习机会', type: 'routine', complexity: 'simple',
    description: '省委党校发来通知，有一期县长培训班，为期两个月。机会难得但手头工作放不下。',
    scene: '组织部长送来省委党校的培训通知，询问是否参加。',
    choices: [
      { label: '报名参加', description: '脱产学习两个月。提升能力、扩展人脉，但工作可能会受影响。' },
      { label: '工作太忙，下次再去', description: '以工作为重放弃培训。务实但失去提升机会。' },
    ],
  },
  // ======== 乡情/基层特色 (8个) ========
  {
    id: 'vil_001', name: '村霸欺压村民', type: 'petition', complexity: 'medium',
    description: '清河村多名村民联名举报，村委会主任仗势欺人、侵占集体资产。公安局长请示是否立案。',
    scene: '公安局长压低声音说："这个村主任的侄子在市里当科长，背景复杂。"',
    choices: [
      { label: '坚决查处', description: '要求公安局依法立案。为民除害但得罪地方势力。' },
      { label: '先调查核实', description: '先秘密调查，掌握证据再行动。稳妥做法。' },
      { label: '批转乡镇处理', description: '属地管理，让乡镇去处理。推出去。' },
    ],
  },
  {
    id: 'vil_002', name: '古村落保护争议', type: 'routine', complexity: 'medium',
    description: '一批文物专家联名呼吁保护县内一座明清古村落，但开发商想拆了建旅游小镇。',
    scene: '专家报告和开发商方案同时摆上桌面。文化局长倾向保护，招商局长倾向开发。',
    choices: [
      { label: '支持保护', description: '叫停开发，申请文保单位。保护文化遗产但失去投资。' },
      { label: '支持开发', description: '引进开发商建旅游小镇。带动经济但可能破坏文物。' },
      { label: '折中方案', description: '保留核心区，外围适度开发。平衡方案。' },
    ],
  },
  {
    id: 'vil_003', name: '农村土地流转纠纷', type: 'petition', complexity: 'medium',
    description: '一家农业公司流转了300亩土地种果树，但两年没付租金，农民要求政府出面。',
    scene: '几十个农民堵在农业公司门口，公司负责人已经跑路。农业局长一筹莫展。',
    choices: [
      { label: '先垫付租金', description: '财政先行垫付部分租金，安抚农民。然后追究公司责任。' },
      { label: '引导农民起诉', description: '建议农民走法律途径。公正但周期长。' },
      { label: '重新招商接手', description: '寻找新的经营者接盘。解决根本问题但需要时间。' },
    ],
  },
  {
    id: 'vil_004', name: '清明节森林防火', type: 'routine', complexity: 'simple',
    description: '清明节临近，森林防火形势严峻。去年邻县刚出过山火，市里专门发了通知。',
    scene: '林业局长送来防火方案，建议增设临时检查站。需要动用乡镇干部轮班值守。',
    choices: [
      { label: '全面部署严防', description: '动员全县干部，设卡检查、巡逻、宣传。安全第一。' },
      { label: '常规部署', description: '按往年惯例操作。不出问题就没事。' },
    ],
  },
  // ======== 腐败/廉政类 (6个) ========
  {
    id: 'corr_001', name: '企业主送红包', type: 'routine', complexity: 'medium',
    description: '一位本地企业家深夜到访，留下一个信封，里面是一张5万元的银行卡。希望您在土地审批上"关照"。',
    scene: '信封放在桌上，企业家已经离开。外面下着雨，没有人看到。',
    triggers: [{ type: 'player', key: 'corruption.level', operator: '<', value: 20 }],
    choices: [
      { label: '坚决退回', description: '第二天让秘书退回，并严肃警告。上级评价+3，政治资本-3。' },
      { label: '收下但留情面', description: '收下但批示"按规定办理"。不违规但也不帮忙。稳定-3。' },
      { label: '收下并帮忙', description: '在土地审批中给予便利。拿了钱就要办事。上级评价-5，政治资本-5。' },
    ],
  },
  {
    id: 'corr_002', name: '招投标暗箱操作', type: 'routine', complexity: 'complex',
    description: '交通局长私下汇报，这次道路工程招投标，有几家关系户想"内定"。暗示可以从中获取"好处费"。',
    scene: '交通局长递上一份名单，上面标注了哪些是"自己人"。',
    choices: [
      { label: '严令公开招标', description: '要求严格按照招投标法执行，杜绝暗箱操作。上级评价+5，稳定+3' },
      { label: '睁一只眼闭一只眼', description: '不干涉也不支持，让交通局长自己把握。社会稳定-3' },
      { label: '默许内定', description: '让交通局长操作，但要求分一杯羹给县财政。财政+200万，上级评价-8，政治资本-10' },
    ],
  },
  {
    id: 'corr_003', name: '纪委书记预警', type: 'personnel', complexity: 'major',
    description: '纪委书记私下提醒：市纪委最近收到几封匿名信，举报城建系统的工程腐败问题。虽然没有直接点名您，但火烧到了家门口。',
    scene: '纪委书记压低声音："书记，这次来头不小，您心里要有数。"',
    choices: [
      { label: '主动配合自查', description: '要求纪委主动开展自查，展现姿态。上级评价+5，稳定+3' },
      { label: '找人疏通关系', description: '通过关系打听举报内容和调查方向。消耗政治资本8。' },
      { label: '按兵不动', description: '该干嘛干嘛，不相信会查到书记头上。稳定-3' },
    ],
  },
  {
    id: 'corr_004', name: '审计组进驻', type: 'superior_task', complexity: 'complex',
    description: '市审计局工作组下周进驻，专项审计近三年土地出让和工程招投标情况。财政局长紧张地来汇报。',
    scene: '财政局长满头大汗："书记，有几笔账做得不太干净，审计怕是过不了关。"',
    choices: [
      { label: '全面自查整改', description: '连夜自查，能补的补上。争取审计过关。上级评价+3，财政-100万' },
      { label: '找关系打点', description: '通过私人关系和审计组组长"沟通"。政治资本-10' },
      { label: '做好表面文章', description: '把账目做得好看些，能糊弄过去就行。稳定-5' },
    ],
  },
  {
    id: 'corr_005', name: '行贿者被查', type: 'emergency', complexity: 'major',
    description: '重要消息：曾给您送过礼的某企业主因其他案件被省纪委带走。他可能会交代出行贿记录。',
    scene: '消息来得突然。办公室里的电话响个不停。纪委书记要求紧急会面。',
    choices: [
      { label: '主动向组织说明', description: '向上级纪委主动说明情况。争取宽大处理。上级评价-5，政治资本-5。' },
      { label: '找人顶包', description: '让财政局某个科长出面"扛下来"。保护自己但伤了别人。政治资本-8。' },
      { label: '销毁证据', description: '赶紧处理掉一切可能牵连的东西。稳定-5' },
      { label: '动用保护伞', description: '请上面的"靠山"出面压住这件事。政治资本-10' },
    ],
  },
  {
    id: 'corr_006', name: '廉政谈话', type: 'superior_task', complexity: 'medium',
    description: '市委组织部约您进行例行廉政谈话。书记旁敲侧击地提到"最近有些反映"。这是组织的提醒。',
    scene: '书记办公室里，茶冒着热气。书记看着你说："县长同志，有则改之，无则加勉。"',
    choices: [
      { label: '表态自查', description: '表示一定严格要求自己，配合组织调查。姿态正确。上级评价+3。' },
      { label: '转移话题谈成绩', description: '把话题引向经济工作成绩，回避廉政话题。上级评价-3。' },
      { label: '主动交代轻微问题', description: '主动交代一些不痛不痒的小问题。态度诚恳。上级评价+5。' },
    ],
  },
];

/** 事件类型中文映射 */
const EVENT_TYPE_LABELS = {
  routine: '日常事务', petition: '群众诉求', emergency: '突发事件',
  superior_task: '上级任务', personnel: '干部人事',
};

const EVENT_COMPLEXITY_LABELS = {
  simple: '简单', medium: '中等', complex: '复杂', major: '重大',
};

/** 年度历史事件（外部时间线 — 2026版） */
const HISTORICAL_EVENTS = {
  2026: { label: '十五五规划开局之年', desc: '各地贯彻落实十五五规划，县域经济发展迎来新机遇' },
  2027: { label: '乡村振兴深化', desc: '乡村振兴战略进入关键阶段，农业农村现代化加速' },
  2028: { label: '数字经济浪潮', desc: '数字经济蓬勃发展，传统产业数字化转型加速' },
  2029: { label: '新型城镇化推进', desc: '新型城镇化建设深入推进，城乡融合发展' },
  2030: { label: '碳达峰关键期', desc: '碳达峰目标临近，产业结构调整压力增大' },
};
