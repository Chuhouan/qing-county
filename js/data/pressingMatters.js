/**
 * pressingMatters.js — 当务之急模板数据
 * 游戏世界主动产生的事务来找县委书记
 *
 * 五类：🚨危机 / 📡上级交办 / 🤝派系博弈 / 🎯机遇窗口 / 👥群众诉求
 * 每个模板含触发条件、4个选项、干部立场表态、期限
 */

var PRESSING_MATTERS = [
  // ========== 🚨 危机 ==========
  {
    id: 'crisis_land_protest',
    category: 'crisis',
    name: '柳河镇征地补偿群众聚集',
    desc: '柳河镇因工业园区征地补偿款已拖欠11个月，约200名群众在镇政府门前聚集，打出横幅"还我地款"。镇长来电请示处置意见。',
    trigger: function() {
      var t = (stateManager.get('county')?.socialTension || 0);
      var s = stateManager.get('social');
      var sat = s ? s.satisfaction || 60 : 60;
      return t > 55 && sat < 65 && Math.random() < 0.12;
    },
    deadline: 3,
    options: [
      { label: '💰 拨付补偿款', desc: '从县财政拨付300万专项补偿款', cost: { money: 300 }, effects: { tension: -12, satisfaction: 8, logDesc: '拨付了征地补偿款' },
        stances: '政法委马洪涛："这才是解决问题的态度"\n县长王立永："该给的钱拖太久了"\n本土系吴德："群众利益无小事，拖不得"' },
      { label: '🤝 分期拨付', desc: '先拨付150万，剩余分期', cost: { money: 150 }, effects: { tension: -6, satisfaction: 3, logDesc: '分期拨付了部分补偿款' },
        stances: '财政局李为民："分期拨付能缓解财政压力"\n马洪涛："拖字诀，群众还是不满意的"' },
      { label: '👥 派工作组安抚', desc: '由县委办牵头，组织工作组下乡做群众工作', cost: { politicalCapital: 3 }, effects: { tension: -4, satisfaction: 1, mayRecur: true, logDesc: '派出工作组进行安抚' },
        stances: '县委办郑浩："我愿意带队下去"\n王立永："治标不治本，钱还是要给的"' },
      { label: '⛔ 强硬处置', desc: '公安介入维持秩序，按"扰乱社会秩序"定性处理', cost: { politicalCapital: -5 }, effects: { tension: 15, satisfaction: -15, logDesc: '采取强硬手段处置了群众聚集' },
        stances: '公安局长张铁军："坚决完成任务"\n纪委书记陈洁（空降系）："我会向市里如实反映" ⚠️', risk: '上级可能过问' },
      { label: '📅 推迟处理', desc: '暂不表态，告知乡镇自行消化', effects: { tension: 8, satisfaction: -8, logDesc: '推迟了对事件的回应' } },
    ],
  },
  {
    id: 'crisis_safety_accident',
    category: 'crisis',
    name: '东风镇化工厂泄漏事故',
    desc: '东风化工园区发生管道泄漏，幸无人员伤亡，但周边村庄空气中检测到有害气体超标。环保局已到现场。',
    trigger: function() {
      var county = stateManager.get('county');
      if (!county) return false;
      var indRatio = county.economy?.industrialRatio || 0.35;
      var growth = county.economy?.gdpGrowth || 0.05;
      var avgHealth = 70 + (growth - 0.05) * 500; // 增长好→产业健康，增长差→下滑
      return avgHealth < 55 && Math.random() < 0.1;
    },
    deadline: 2,
    options: [
      { label: '🔧 责令停产整顿', desc: '立即停产，限期整改', cost: { politicalCapital: 2 }, effects: { tension: -5, gdpPenalty: -0.5, logDesc: '责令企业停产整顿' },
        stances: '纪委书记陈洁："安全生产绝不容马虎"\n县长王立永："停产影响太大了，限期整改就好"' },
      { label: '📋 限期整改不关停', desc: '企业继续生产，但限期整改', effects: { tension: -2, mayRecur: true, logDesc: '要求企业限期整改但不关停' },
        stances: '王立永："保生产底线，同时对群众有个交代"\n环保局："治标有余，治本不足"' },
      { label: '💰 罚款了事', desc: '对企业罚款100万，不作停业处理', cost: { income: 100 }, effects: { tension: 5, logDesc: '对企业进行了罚款' },
        stances: '本土系："企业的损失我们本地承担，罚款也是肉烂在锅里"\n空降系陈洁："这样处置市里知道了会问责的" ⚠️' },
      { label: '🤫 低调处理', desc: '压制舆情，只做内部通报', cost: { politicalCapital: -3 }, effects: { tension: 3, corruptionIndex: 5, logDesc: '低调处理了泄漏事故' },
        risk: '隐瞒不报风险极大', stances: '陈洁："如果有后果，我的调查报告会如实记录"' },
    ],
  },
  {
    id: 'crisis_media_crisis',
    category: 'crisis',
    name: '网络负面舆情爆发',
    desc: '一篇题为"某县领导干部的奢靡日常"的帖子在微博和贴吧迅速传播，阅读量已突破50万。虽然内容证据不足，但评论区群情激愤。',
    trigger: function() {
      var sat = stateManager.get('social')?.satisfaction || 60;
      var corr = stateManager.get('county')?.institution?.corruptionIndex || 20;
      return sat < 60 && corr > 30 && Math.random() < 0.1;
    },
    deadline: 2,
    options: [
      { label: '📢 公开回应澄清', desc: '由县委宣传部发布会，澄清事实，公布调查结果', cost: { politicalCapital: 2 }, effects: { tension: -5, satisfaction: 2, logDesc: '召开新闻发布会澄清事实' },
        stances: '宣传部长孙丽："交给我来处理，48小时内开新闻发布会"\n本土系吴德："最好低调处理，越回应越发酵"' },
      { label: '🔍 快速自查', desc: '成立内部调查组，找出问题并整改，同时回应', cost: { politicalCapital: 3 }, effects: { tension: -8, satisfaction: 5, logDesc: '成立内部调查组' },
        stances: '纪委书记陈洁："我可以牵头调查，但要给我实权"\n副书记赵刚："自查自纠是个好姿态"' },
      { label: '🤫 删帖压热度', desc: '联系网信部门删帖，同时找人放几条正面新闻对冲', cost: { money: 50 }, effects: { tension: 2, satisfaction: -3, logDesc: '试图控制舆情传播' },
        risk: '删帖行为可能引发更激烈的舆论反弹', stances: '孙丽："不建议删帖，容易被截图取证，反而更糟"' },
      { label: '📵 不予回应', desc: '冷处理，期望热度自行消退', effects: { tension: 5, satisfaction: -5, logDesc: '对舆情不作回应' },
        stances: '县长王立永："不回应就是默认，不能这么干"', risk: '舆情可能升级' },
    ],
  },
  {
    id: 'crisis_health_alert',
    category: 'crisis',
    name: '区域传染病预警',
    desc: '邻近县市出现不明原因发热病例，省卫健委已发布二级预警。正定县作为交通枢纽，需要立即启动应急预案。',
    trigger: function() { return Math.random() < 0.04; },
    deadline: 1,
    options: [
      { label: '🚑 全面防控', desc: '启动应急预案，拨款300万采购防护物资', cost: { money: 300 }, effects: { tension: -5, satisfaction: 10, economicVitality: -3, logDesc: '启动了全面疫情防控' },
        stances: '卫健局长刘伟（空降系）："必须严阵以待，宁可十防九空"\n财政局李为民："防疫资金必须到位"', politicalCapital: 5 },
      { label: '📋 常规应对', desc: '按预案执行但不额外拨款，依靠现有物资储备', effects: { tension: -2, satisfaction: 2, logDesc: '按常规预案应对疫情' },
        stances: '刘伟："物资储备不一定够，万一暴发就晚了"\n县长系："不能过度反应，影响经济运行"' },
      { label: '⏸ 观望等待', desc: '暂不采取特别措施，等待省里进一步指令', effects: { tension: 3, logDesc: '选择观望等待' },
        risk: '如果疫情扩散将非常被动', stances: '本土系："没有病例就先自乱阵脚，不合算"' },
    ],
  },
  {
    id: 'crisis_fiscal_gap',
    category: 'crisis',
    name: '公务员薪资缺口',
    desc: '由于上月税收未达预期，本月全县公务员和事业编人员工资出现500万的资金缺口。财政局紧急报告：如果不采取措施，工资将延迟发放。',
    trigger: function() {
      var fin = stateManager.get('finance');
      var bal = fin?.treasuryBalance || 5000;
      var income = fin?.monthlyIncome || 800;
      return bal < income * 2 && Math.random() < 0.1;
    },
    deadline: 2,
    options: [
      { label: '📊 启用储备金', desc: '动用县级财政储备金填补缺口', cost: { politicalCapital: -2 }, effects: { tension: -8, logDesc: '动用储备金填补工资缺口' },
        stances: '财政局李为民："储备金就是备不时之需的"\n县长王立永："也只能这样了，不能不发工资"' },
      { label: '💰 申请市级借款', desc: '向市财政局申请短期借款', cost: { politicalCapital: -5 }, effects: { tension: -8, debt: 500, logDesc: '向市财政申请了借款' },
        stances: '空降系陈洁："向上面伸手总归不好看"\n副书记赵刚："救急不救穷，先把工资发了"' },
      { label: '📉 压缩开支', desc: '短期内压缩其他支出，优先保障工资', effects: { tension: -3, govEfficiency: -3, logDesc: '压缩其他开支保障工资发放' },
        stances: '各部门："我们的项目经费被砍了？"\n县委办郑浩："特殊时期特殊办法"' },
      { label: '⏰ 延迟发放', desc: '告知干部职工，本月工资暂缓7-10天发放', effects: { tension: 12, satisfaction: -10, logDesc: '通知干部职工工资延迟发放' },
        risk: '将严重损害书记的公信力', stances: '本土系："谁能接受不发工资？这是要出大事的"' },
    ],
  },

  // ========== 📡 上级交办 ==========
  {
    id: 'superior_environmental',
    category: 'superior',
    name: '省环保督察组要求限期整改',
    desc: '省环保督察组在正定县督察期间，发现县污水处理厂排放连续三个月不达标、红旗建材工业园扬尘问题严重。要求三个月内完成整改并上报。',
    trigger: function() {
      return timeSystem && timeSystem.month === 3 && Math.random() < 0.5;
    },
    deadline: 12,
    options: [
      { label: '⚡ 全面整改', desc: '拨款500万启动污水处理厂升级和建材园降尘改造', cost: { money: 500 }, effects: { pollutionDown: 30, superiorTrust: 8, logDesc: '全面启动了环保整改工程' },
        stances: '县长王立永："环保是硬约束，绕不开"\n科工局（空降系）："我们愿意配合整改"', politicalCapital: 5 },
      { label: '📋 表面整改', desc: '做表面文章应付检查，实际投入200万', cost: { money: 200 }, effects: { pollutionDown: 8, superiorTrust: -3, logDesc: '进行了有限的环保整改' },
        risk: '省督察组复查时会发现问题', stances: '本土系："应付过去就行，真花钱不值当"\n空降系陈洁："弄虚作假是政治问题"' },
      { label: '📞 找关系疏通', desc: '动用私人关系，尝试让督察组从轻处理', cost: { politicalCapital: -8 }, effects: { superiorTrust: -5, corruptionIndex: 8, logDesc: '尝试疏通督察组' },
        risk: '如果失败后果更严重', stances: '空降系："这是拿自己的政治生命赌博"' },
      { label: '⏸ 暂不理会', desc: '以财政困难为由暂不处理', effects: { superiorTrust: -12, tension: 5, logDesc: '暂不处理环保整改要求' },
        risk: '可能被公开通报批评', stances: '县长系："不能跟上面对着干"' },
    ],
  },
  {
    id: 'superior_inspection',
    category: 'superior',
    name: '市委巡视组反馈意见',
    desc: '市委巡视组在上轮巡视中向正定县提出6条反馈意见，包括干部作风、工程领域监管等问题。市纪委要求三个月内提交整改报告。',
    trigger: function() {
      return timeSystem && timeSystem.month === 6 && Math.random() < 0.4;
    },
    deadline: 12,
    options: [
      { label: '📝 严肃整改', desc: '成立整改工作领导小组，逐条对照整改', cost: { politicalCapital: 2 }, effects: { corruptionIndex: -10, superiorTrust: 8, logDesc: '逐条对照巡视意见进行整改' },
        stances: '纪委书记陈洁："我来牵头整改，保证逐条销号"\n副书记赵刚："巡视整改是政治任务，马虎不得"', politicalCapital: 5 },
      { label: '📋 选择性整改', desc: '重点整改一两条，其余用文字材料应付', cost: { politicalCapital: 1 }, effects: { corruptionIndex: -3, superiorTrust: -3, logDesc: '选择了部分问题进行整改' },
        risk: '巡视回头看时会被发现', stances: '本土系："全部整改工作量太大，选重点就好"' },
      { label: '⏸ 拖延观望', desc: '等上级催了再动', effects: { superiorTrust: -8, logDesc: '对巡视整改采取拖延态度' },
        risk: '被列为"巡视整改不力"典型', stances: '县长王立永："拖是最笨的办法" ⚠️' },
    ],
  },
  {
    id: 'superior_investment_target',
    category: 'superior',
    name: '市级招商引资考核',
    desc: '市政府下发文件，要求各县在下半年前完成至少10亿元的招商引资签约任务，纳入年度考核一票否决项。',
    trigger: function() {
      return timeSystem && timeSystem.month === 5 && Math.random() < 0.4;
    },
    deadline: 16,
    options: [
      { label: '🎯 全力攻坚', desc: '组建招商专班，赴长三角开展精准招商', cost: { money: 200, politicalCapital: 3 }, effects: { economicVitality: 10, investment: 12, superiorTrust: 8, logDesc: '全力推进招商引资' },
        stances: '发改局长张建国："我带招商组出去跑"\n县长系："这个是硬指标，必须全力以赴"', politicalCapital: 8 },
      { label: '📊 适度推进', desc: '按常规节奏招商，不额外投入', cost: { money: 50 }, effects: { economicVitality: 3, investment: 3, superiorTrust: -2, logDesc: '按常规节奏推进招商' },
        stances: '财政局李为民："不是所有县都能完成10亿的"' },
      { label: '📝 注水凑数', desc: '在签约额上做文章，实际到位资金可能打折扣', effects: { investment: 1, corruptionIndex: 5, risk: true, logDesc: '对签约数据进行了一定的粉饰' },
        risk: '年度审计时可能暴露', stances: '空降系陈洁："数字造假是严重的纪律问题" ⚠️' },
    ],
  },
  {
    id: 'superior_poverty_check',
    category: 'superior',
    name: '脱贫攻坚成果"回头看"',
    desc: '国务院扶贫办部署脱贫攻坚成果"回头看"专项检查。省里要求各县在两个月内完成自查，防止规模性返贫。',
    trigger: function() {
      return timeSystem && timeSystem.month % 4 === 0 && Math.random() < 0.3;
    },
    deadline: 8,
    options: [
      { label: '🔍 认真排查', desc: '组织全县范围的防返贫排查，拨款100万用于帮扶', cost: { money: 100 }, effects: { satisfaction: 8, superiorTrust: 5, logDesc: '认真开展了防返贫排查' },
        stances: '农业农村局局长："我们最了解基层情况"\n本土系："这是本分事，要实实在在地做"', politicalCapital: 5 },
      { label: '📋 表格迎检', desc: '让乡镇填表汇总，不作实地核查', effects: { satisfaction: 1, logDesc: '通过表格完成了自查' },
        risk: '检查组如果抽查乡镇会发现造假', stances: '本土系："上面千条线，下面一根针，基层干部填表都填不过来"' },
    ],
  },
  {
    id: 'superior_security_month',
    category: 'superior',
    name: '安全生产月专项活动',
    desc: '市安监局通知：6月为全国"安全生产月"，要求各县组织大检查、应急演练和宣传教育。完成情况将列入年度安全考核。',
    trigger: function() {
      return timeSystem && timeSystem.month === 6 && Math.random() < 0.6;
    },
    deadline: 4,
    options: [
      { label: '🏗 扎实开展', desc: '组织全县安全生产大检查，拨款50万用于宣传教育', cost: { money: 50 }, effects: { socialTension: -3, superiorTrust: 3, logDesc: '扎实开展了安全生产月活动' },
        stances: '政法委马洪涛："安全生产，预防为主"\n县长系："安全第一，不能走过场"', politicalCapital: 3 },
      { label: '📋 走个过场', desc: '发发通知、挂挂横幅应付了事', effects: { superiorTrust: -2, logDesc: '简单应付了安全生产月' },
        stances: '本土系："年年搞这些形式主义，有什么用"' },
    ],
  },

  // ========== 🤝 派系博弈 ==========
  {
    id: 'faction_local_personnel',
    category: 'faction',
    name: '本土系提出乡镇班子调整',
    desc: '统战部长吴德（本土系）在常委会前找到你，反映乡镇班子中有几位年轻干部"水土不服"，建议调整为本地成长的老同志。他暗示这关系到"干部队伍的稳定性"。',
    trigger: function() {
      var all = getAllFocuses ? getAllFocuses() : [];
      return timeSystem && timeSystem.week > 4 && Math.random() < 0.12;
    },
    deadline: 4,
    options: [
      { label: '✅ 支持本土系提议', desc: '同意在下周常委会上讨论乡镇班子调整方案', effects: { factionRelation: { secretary: 'local', delta: 10 }, logDesc: '支持了本土系的人事提议' },
        stances: '吴德："书记体谅我们本地干部的难处"\n组织部长周明（书记系）："人事问题还是要通盘考虑"\n空降系陈洁："这不是搞「小山头」吗？" ⚠️', factionDelta: { local: 10, appointed: -5 },
        plotlineImpact: { plotlineId: 'plot_local_vs_appointed', effect: 'push_to_local', delta: 12 } },
      { label: '🔄 折中方案', desc: '同意讨论，但要求组织部拿出综合方案，不搞"一言堂"', cost: { politicalCapital: 1 }, effects: { factionRelation: { secretary: 'local', delta: 3 }, logDesc: '提出折中方案回应本土系' },
        stances: '周明（书记系）："通盘考虑是对的"\n吴德："书记不信任我们？" 本土系：轻微不满', factionDelta: { local: 2, secretary: 3 },
        plotlineImpact: { plotlineId: 'plot_local_vs_appointed', effect: 'push_to_balance', delta: 5 } },
      { label: '❌ 明确拒绝', desc: '人事调整应该由组织部门按程序进行，不能由某个派系主导', effects: { factionRelation: { secretary: 'local', delta: -8 }, logDesc: '拒绝了本土系的人事提议' },
        stances: '陈洁："坚决支持书记的立场"\n吴德："书记既然不信任我们，那以后我们也不多嘴了" 本土系关系大降', factionDelta: { local: -8, appointed: 5 },
        plotlineImpact: { plotlineId: 'plot_local_vs_appointed', effect: 'push_to_appointed', delta: 12 } },
      { label: '⏸ 暂不表态', desc: '告诉吴德"研究研究"，把事情拖过去', effects: { factionRelation: { secretary: 'local', delta: -3 }, logDesc: '对本土系的提议暂不表态' },
        stances: '吴德："研究研究就是没下文了"', factionDelta: { local: -3 } },
    ],
  },
  {
    id: 'faction_magistrate_budget',
    category: 'faction',
    name: '县长系要求追加基础设施预算',
    desc: '县长王立永和常务副县长梁永文联名提出：工业园区二期供水管网急需500万，否则影响企业入驻。他们强调"这是政府工作报告中承诺过的项目"。',
    trigger: function() {
      return timeSystem && timeSystem.week > 8 && Math.random() < 0.1;
    },
    deadline: 3,
    options: [
      { label: '💰 全额拨付', desc: '从财政预备费中拨付500万', cost: { money: 500 }, effects: { economicVitality: 5, logDesc: '全额拨付了工业园区管网建设费' },
        stances: '王立永："感谢书记支持政府工作"\n财政局李为民："预备费是备不时之需的..." 县长系关系+8', factionDelta: { magistrate: 8 }, politicalCapital: 3,
        plotlineImpact: { plotlineId: 'plot_power_struggle', effect: 'push_to_cooperation', delta: 15 } },
      { label: '💰 部分拨付', desc: '拨付300万，剩余由工业园区自筹', cost: { money: 300 }, effects: { economicVitality: 2, logDesc: '部分拨付了管网建设费' },
        stances: '王立永："聊胜于无，我们会想办法"\n县长系：轻微满意', factionDelta: { magistrate: 3 } },
      { label: '📞 让他们自己想办法', desc: '建议县长系通过其他渠道筹措资金', effects: { economicVitality: -1, logDesc: '未拨付管网建设费' },
        stances: '梁永文："书记不支持政府工作"\n县长系关系-5', factionDelta: { magistrate: -5 },
        plotlineImpact: { plotlineId: 'plot_power_struggle', effect: 'push_to_confrontation', delta: 15 } },
      { label: '💡 向上争取', desc: '建议向市里申请专项资金，县里只配套100万', cost: { money: 100 }, effects: { economicVitality: 1, logDesc: '建议向上申请专项资金' },
        stances: '王立永："向上申请可以，但流程慢，可能来不及"\n空降系："向上争取是对的，但也暴露了我们财政困难"' },
    ],
  },
  {
    id: 'faction_appointed_investigate',
    category: 'faction',
    name: '空降系推动查处住建局长',
    desc: '纪委书记陈洁（空降系）提交了一份初步调查报告，指出住建局局长赵铁柱（本土系）在多个工程项目中存在利益输送嫌疑。她希望获得常委会授权，正式立案调查。',
    trigger: function() {
      var corr = stateManager.get('county')?.institution?.corruptionIndex || 20;
      return corr > 25 && timeSystem && timeSystem.week > 6 && Math.random() < 0.08;
    },
    deadline: 2,
    options: [
      { label: '⚖️ 授权立案', desc: '同意纪委调查，给陈洁正式授权', effects: { corruptionIndex: -8, logDesc: '授权纪委立案调查赵铁柱' },
        stances: '陈洁："谢谢书记的信任，我保证一查到底"\n本土系吴德："这是打击报复！赵铁柱是我们的人" ⚠️ 本土系-10', factionDelta: { appointed: 8, local: -10 }, politicalCapital: 5,
        plotlineImpact: { plotlineId: 'plot_corruption_web', effect: 'push_to_clean', delta: 18 } },
      { label: '🔍 悄悄调查', desc: '让纪委先做初步调查，暂不立案，也不公开', effects: { corruptionIndex: -3, logDesc: '让纪委进行秘密初查' },
        stances: '陈洁："权力有限，查不了太深"\n本土系没有察觉', factionDelta: { appointed: 2 },
        plotlineImpact: { plotlineId: 'plot_corruption_web', effect: 'push_to_selective', delta: 8 } },
      { label: '❌ 压下来', desc: '告诉陈洁证据不足，暂不调查', effects: { corruptionIndex: 3, logDesc: '压下了对赵铁柱的调查' },
        stances: '陈洁："书记，如果出事了，不要怪我没提醒"\n空降系-8', factionDelta: { appointed: -8 }, risk: '如果赵铁柱确实有问题，将来可能牵连到您',
        plotlineImpact: { plotlineId: 'plot_corruption_web', effect: 'push_to_protective', delta: 18 } },
      { label: '💬 先找赵铁柱谈话', desc: '先找赵铁柱本人了解情况，再做决定', effects: { logDesc: '找赵铁柱进行了谈话' },
        stances: '赵铁柱（本土系）："我是清白的，这是空降系诬陷"\n本土系：观望态度' },
    ],
  },
  {
    id: 'faction_bureaucrat_dispute',
    category: 'faction',
    name: '官僚系请求增加编制',
    desc: '政法委书记马洪涛（官僚系）和公安局长张铁军反映：现有警力严重不足，城区巡逻覆盖不足40%，需要增加50个辅警编制。',
    trigger: function() {
      return timeSystem && timeSystem.week > 10 && Math.random() < 0.1;
    },
    deadline: 4,
    options: [
      { label: '✅ 批准增编', desc: '同意增加50个辅警编制，财政每年新增支出约200万', cost: { money: 0, annualCost: 200 }, effects: { socialTension: -5, satisfaction: 3, logDesc: '批准了公安系统增加编制' },
        stances: '马洪涛："这样一来，城区的治安巡逻就能全面覆盖了"\n财政局李为民："每年200万，长期账"', factionDelta: { bureaucrat: 8 }, politicalCapital: 3 },
      { label: '📋 批准部分', desc: '同意增加25个编制，经费减半', cost: { annualCost: 100 }, effects: { socialTension: -2, satisfaction: 1, logDesc: '部分批准了增编请求' },
        stances: '马洪涛："聊胜于无"\n官僚系：基本满意', factionDelta: { bureaucrat: 3 } },
      { label: '🔄 内部调剂', desc: '建议公安局内部优化调配，不增加编制', effects: { logDesc: '建议公安内部优化调配' },
        stances: '张铁军："帽子再大也不可能挤出50个人来"\n官僚系：失望', factionDelta: { bureaucrat: -3 } },
    ],
  },
  {
    id: 'faction_nonaligned_plea',
    category: 'faction',
    name: '无派系干部的晋升请求',
    desc: '文旅局长周文化（无派系）私下找到书记，表达了自己多年来勤勤恳恳工作的态度，委婉提到如果有提拔机会，希望书记能考虑他。他的诉求很直接："只求一个机会"。',
    trigger: function() {
      var p = stateManager.get('player');
      var all = p?.relations?.committeeMembers || {};
      return timeSystem && timeSystem.week > 12 && Math.random() < 0.08 && Object.keys(all).some(function(k) { return all[k] < 55; });
    },
    deadline: 6,
    options: [
      { label: '🌟 列入后备', desc: '将周文化列入下一批后备干部名单', effects: { logDesc: '将周文化列入后备干部名单' },
        stances: '周文化："谢谢书记给我机会！"\n无派系统统感恩', factionDelta: { nonaligned: 10 }, politicalCapital: -2 },
      { label: '📝 考察中', desc: '表示会关注，但暂时没有提拔名额', effects: { logDesc: '对周文化表示会关注' },
        stances: '周文化："有书记这句话我就安心了"\n无派系：中立', factionDelta: { nonaligned: 2 } },
      { label: '💬 敷衍过去', desc: '客套几句，不表态', effects: { logDesc: '敷衍了周文化的请求' },
        stances: '周文化（私下）："嘴上说得好听，就是不办实事"\n无派系：轻微不满', factionDelta: { nonaligned: -3 } },
    ],
  },

  // ========== 🎯 机遇窗口 ==========
  {
    id: 'opp_special_fund',
    category: 'opportunity',
    name: '省级乡村振兴专项资金',
    desc: '省财政厅发文：设立乡村振兴专项资金，每个项目最高可申请2000万元。申请截止日期为30天后，需要提交实施方案。农业农村局建议申报现代农业产业园项目。',
    trigger: function() {
      return timeSystem && timeSystem.week > 4 && Math.random() < 0.08;
    },
    deadline: 4,
    options: [
      { label: '📝 全力申报', desc: '组织专班编写申请书，争取拿到最高额度', cost: { money: 80, politicalCapital: 3 }, effects: { investment: 8, economicVitality: 5, satisfaction: 5, logDesc: '全力申报了省级专项资金' },
        stances: '农业农村局："书记放心，我们有信心拿下"\n发改局："这个项目对农业现代化很关键"', politicalCapital: 5 },
      { label: '📋 例行申报', desc: '让农业农村局自己写材料，不额外投入', effects: { investment: 2, satisfaction: 1, logDesc: '进行了例行资金申报' },
        stances: '农业农村局："没有领导支持，申请我们也不敢写大数"' },
      { label: '⏭ 放弃', desc: '以"县里项目储备不足"为由放弃', effects: { logDesc: '放弃了省级专项资金申请' },
        stances: '县长王立永："放弃太可惜了，这可是白送的钱"' },
    ],
  },
  {
    id: 'opp_enterprise_invest',
    category: 'opportunity',
    name: '央企考察团来访',
    desc: '工信部组织央企考察团到各县考察投资环境。中国建材集团对正定县的建材产业有浓厚兴趣，考察团计划停留两天。',
    trigger: function() {
      return timeSystem && timeSystem.week > 8 && Math.random() < 0.06;
    },
    deadline: 1,
    options: [
      { label: '🎯 高规格接待', desc: '你亲自陪同考察，安排最好的条件展示', cost: { money: 150, politicalCapital: 2 }, effects: { economicVitality: 10, investment: 15, logDesc: '高规格接待了央企考察团' },
        stances: '发改局长张建国："这个机会千载难逢"\n县长系："如果能引来央企，我县工业水平上一个台阶"', politicalCapital: 8 },
      { label: '📋 常规接待', desc: '由副县长和发改局接待，你不亲自出面', effects: { economicVitality: 3, investment: 3, logDesc: '由副县长接待了考察团' },
        stances: '张建国："书记不亲自出面，显得不够重视"' },
      { label: '⏭ 不重视', desc: '以日程繁忙为由，不安排接待', effects: { logDesc: '婉拒了考察团的来访' },
        stances: '县长王立永："太可惜了，一错过可能就没了"' },
    ],
  },
  {
    id: 'opp_university_partnership',
    category: 'opportunity',
    name: '省属重点大学合作办学',
    desc: '河北某重点大学正在全省选择合作县市建立实训基地。如果合作成功，大学将在正定县设立分校，每年招录数百名学生，带来自巨大的经济红利。需在一周内答复是否愿意配套500万资金。',
    trigger: function() {
      return timeSystem && timeSystem.week > 16 && Math.random() < 0.05;
    },
    deadline: 1,
    options: [
      { label: '🎓 积极争取', desc: '配套500万资金并亲自赴大学谈判', cost: { money: 500, politicalCapital: 3 }, effects: { economicVitality: 8, satisfaction: 10, logDesc: '积极争取了大学合作办学项目' },
        stances: '教育局长李志强："这对我县教育是天大的好事"\n财政局李为民："500万是有点多，但是值得"', politicalCapital: 10 },
      { label: '📋 表态兴趣', desc: '致信表达合作意向，但不承诺配套资金', effects: { economicVitality: 1, logDesc: '向大学表达了合作意向' },
        stances: '李志强："不承诺配套资金，大学那边很难定下来"' },
      { label: '⏭ 婉拒', desc: '以财政困难为由婉拒合作', effects: { logDesc: '婉拒了大学合作' },
        stances: '县长系："错过这个村就没这个店了，财政可以想办法"', risk: '可能若干年后被评价为"贻误发展机遇"' },
    ],
  },
  {
    id: 'opp_pilot_program',
    category: 'opportunity',
    name: '国家级农村集体产权改革试点',
    desc: '农业农村部正在遴选全国50个县开展农村集体产权制度改革试点。入选者将获得专项资金支持和政策优惠。省委建议正定县申报。',
    trigger: function() {
      return timeSystem && timeSystem.week > 12 && Math.random() < 0.06;
    },
    deadline: 6,
    options: [
      { label: '🚀 全力争取', desc: '组织最强的申报团队，倾力争取', cost: { money: 100, politicalCapital: 2 }, effects: { agriculturalOutput: 8, satisfaction: 8, superiorTrust: 5, logDesc: '全力争取国家级改革试点' },
        stances: '农业农村局长："我们有基础，成功率很高"\n空降系："如果能入选，对书记的政绩是重大加分"', politicalCapital: 8 },
      { label: '📋 参与申报', desc: '按流程申报但不额外投入资源', effects: { logDesc: '参与了试点申报' },
        stances: '县长系："竞争这么激烈，不投入很难拿到"' },
      { label: '⏭ 不申报', desc: '觉得县里不具备申报条件', effects: { logDesc: '放弃了试点申报机会' },
        stances: '县委副书记赵刚："稳是稳了，但也错失了机遇"' },
    ],
  },
  {
    id: 'opp_railway_route',
    category: 'opportunity',
    name: '高铁新线选址博弈',
    desc: '国家铁路局正在规划一条新的高铁线路，经过正定县附近。隔壁县正在全力游说争取在县域内设站。如果正定县不积极争取，高铁站可能设在邻县。',
    trigger: function() {
      return timeSystem && timeSystem.week > 20 && Math.random() < 0.04;
    },
    deadline: 4,
    options: [
      { label: '🚄 全力游说', desc: '你亲自带队赴北京和石家庄游说，同时承诺配套500亩土地', cost: { money: 300, politicalCapital: 5 }, effects: { economicVitality: 15, investment: 20, logDesc: '全力争取高铁站选址' },
        stances: '发改局："高铁站一旦设在我县，经济辐射效应不可估量"\n县长系："这是影响我县未来几十年的大事"', politicalCapital: 12 },
      { label: '📞 致函争取', desc: '通过正规渠道致函交通厅和国家铁路局', effects: { economicVitality: 3, logDesc: '致函争取了高铁站选址' },
        stances: '本土系："光发函有什么用，人家隔壁县县长都住在北京了"' },
      { label: '⏭ 不刻意争取', desc: '觉得高铁站设哪都一样', effects: { logDesc: '未积极争取高铁站选址' },
        risk: '可能错失重大发展机遇', stances: '县长王立永："设站这种事，一旦错过了，十年二十年都补不回来" ⚠️' },
    ],
  },

  // ========== 👥 群众诉求 ==========
  {
    id: 'people_net_post',
    category: 'people',
    name: '网民反映公交线路不合理',
    desc: '百度贴吧正定吧中，一篇"正定公交绕死你"的帖子引发热议，网友反映县城公交线路规划混乱、发车间隔太长，要求整改。',
    trigger: function() {
      var sat = stateManager.get('social')?.satisfaction || 60;
      return sat < 65 && Math.random() < 0.1;
    },
    deadline: 4,
    options: [
      { label: '🚌 责成整改', desc: '要求交通局一周内拿出优化方案，拨款20万用于调研', cost: { money: 20 }, effects: { satisfaction: 5, tension: -2, logDesc: '责成交通局优化公交线路' },
        stances: '交通局陈德胜："有些线路确实需要调整，我们尽快"\n群众：点赞', politicalCapital: 2 },
      { label: '📝 调研再说', desc: '让交通局先做个调研报告再定', effects: { satisfaction: 1, logDesc: '要求交通局先调研' },
        stances: '陈德胜："半年后交报告"' },
      { label: '📵 不予回应', desc: '不认为这是重要问题', effects: { satisfaction: -3, tension: 1, logDesc: '对网民反映不回应' },
        stances: '网友："我们说的话领导当耳旁风"' },
    ],
  },
  {
    id: 'people_npc_proposal',
    category: 'people',
    name: '人大代表联名提案',
    desc: '两位县人大代表联名提交议案：建议在城关镇新建一所公立幼儿园，解决城区学龄前儿童入园难问题。他们附上了3000余签名。',
    trigger: function() {
      return timeSystem && timeSystem.week > 8 && Math.random() < 0.12;
    },
    deadline: 8,
    options: [
      { label: '🏫 采纳并推进', desc: '纳入年度民生实事，拨款200万启动建设', cost: { money: 200 }, effects: { satisfaction: 8, logDesc: '采纳了人大代表建议，启动幼儿园建设' },
        stances: '教育局长李志强："早就该建了，城区幼儿园严重短缺"\n群众："书记办实事"', politicalCapital: 5 },
      { label: '📝 列入计划', desc: '同意纳入下一年度的建设计划', effects: { satisfaction: 2, logDesc: '将幼儿园建设纳入下一年度计划' },
        stances: '人大代表："明年复明年，还要拖多久"' },
      { label: '❌ 不予采纳', desc: '以财政紧张为由拒绝', effects: { satisfaction: -5, logDesc: '拒绝了人大代表提案' },
        stances: '人大代表："争取了三年，还是回到原点"' },
    ],
  },
  {
    id: 'people_migrant_wages',
    category: 'people',
    name: '农民工欠薪聚集上访',
    desc: '约60名农民工到县政府上访，反映县城某楼盘项目拖欠工资逾300万元，涉及农民工120余人。包工头已失联。',
    trigger: function() {
      return timeSystem && timeSystem.week > 6 && Math.random() < 0.1;
    },
    deadline: 3,
    options: [
      { label: '💰 垫付工资', desc: '先由县财政垫付200万，再依法追讨', cost: { money: 200 }, effects: { tension: -8, satisfaction: 5, logDesc: '由财政垫付了农民工工资' },
        stances: '人社局："保障农民工工资是政治任务"\n财政局："垫付容易，追讨难...但也没有别的办法"', politicalCapital: 5 },
      { label: '🔍 走司法程序', desc: '引导农民工通过劳动仲裁和法律途径解决', effects: { tension: 2, satisfaction: -2, logDesc: '引导通过法律途径解决欠薪' },
        stances: '政法委："法律途径确实慢，但是依法办事"\n农民工："我们等不起法律程序"', risk: '问题可能升级' },
      { label: '📞 协调开发商', desc: '约谈开发商和承建方，施压要求尽快兑付', effects: { tension: -2, satisfaction: 1, logDesc: '约谈了开发商要求兑付工资' },
        stances: '住建局："开发商也不容易，资金链紧张"', mayRecur: true },
      { label: '⏸ 观望', desc: '等事态自己平息', effects: { tension: 10, satisfaction: -10, logDesc: '对农民工欠薪事件不作为' },
        risk: '严重事件，可能引发群体事件', stances: '政法委马洪涛："这种事件不能拖，要出事的" ⚠️' },
    ],
  },
  {
    id: 'people_healthcare_request',
    category: 'people',
    name: '县医院设备老旧引发投诉',
    desc: '县医院CT机频繁故障，患者需前往市级医院就诊。本院医护人员联名向卫健局递交了设备更新的请求。近期因设备问题已发生两起医患纠纷。',
    trigger: function() {
      return timeSystem && timeSystem.week > 10 && Math.random() < 0.1;
    },
    deadline: 6,
    options: [
      { label: '🏥 拨付更新经费', desc: '从县级财政拨款250万更新CT设备', cost: { money: 250 }, effects: { satisfaction: 8, tension: -2, logDesc: '拨款更新了县医院CT设备' },
        stances: '卫健局局长："设备问题困扰我们很久了"\n财政局李为民："医疗设备的钱该花"', politicalCapital: 5 },
      { label: '🔄 招标分期购买', desc: '通过融资租赁方式购买，首付100万', cost: { money: 100 }, effects: { satisfaction: 4, logDesc: '通过融资租赁购买了CT设备' },
        stances: '财政局："分期是个折中方案，长期来说是划得来的"' },
      { label: '📋 列入明年预算', desc: '承诺明年纳入预算，今年先维修用着', effects: { satisfaction: -2, logDesc: '承诺明年纳入预算' },
        stances: '医院："又是明年，明天一年后再说"...' },
    ],
  },
  {
    id: 'people_enterprise_complaint',
    category: 'people',
    name: '企业联名反映审批太慢',
    desc: '15家中小企业在工商联座谈会上联名反映：建设工程审批涉及7个部门、20余个章，平均耗时67天。一个老板直言"等证下来了，订单也黄了"。',
    trigger: function() {
      return timeSystem && timeSystem.week > 4 && Math.random() < 0.12;
    },
    deadline: 8,
    options: [
      { label: '⚡ 优化审批流程', desc: '启动"最多跑一次"改革，将审批时限压缩到30天内', cost: { politicalCapital: 3 }, effects: { economicVitality: 5, satisfaction: 5, bureaucracyEfficiency: 8, logDesc: '启动了行政审批改革' },
        stances: '发改局："审批改革是营商环境的核心"\n住建局："简化流程是可以的，但要保证安全底线"', politicalCapital: 5 },
      { label: '📋 象征性简化', desc: '合并一两个环节，减少几个章', effects: { economicVitality: 1, satisfaction: 1, logDesc: '象征性地简化了审批流程' },
        stances: '企业："换汤不换药，还是那么多部门要跑"' },
      { label: '⏸ 维持现状', desc: '认为现行流程合理', effects: { economicVitality: -2, satisfaction: -3, logDesc: '维持现行审批流程不变' },
        stances: '企业（私下）："营商环境不改善，企业迟早跑光"' },
    ],
  },
];

/** 获取所有当务之急模板 */
function getAllPressingMatters() { return PRESSING_MATTERS; }
