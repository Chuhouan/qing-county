/**
 * plotlineEvents.js — 剧情线专属事件模板
 * 当剧情线推进到关键节点时,触发这些事件作为"剧情节点"
 */
var PLOTLINE_EVENTS = [
  // ========== 剧情线1: 龙虎斗专属事件 ==========
  {
    plotlineId: 'plot_power_struggle',
    branchId: 'branch_cooperation',
    momentId: 'power_coop_1',
    title: '县长拜码头',
    description: '县长王立永在第一次正式汇报中态度恭敬,但话里有话。他表示"政府工作请书记多支持"的同时,也暗示自己有独立施政的预期。',
    npcs: {
      magistrate: { stance: '恭敬但保持距离', hint: '王立永正在试探您的管理风格' },
      deputy_secretary: { stance: '提醒', hint: '赵刚私下提醒您:王立永在县长位置上经营多年,不可掉以轻心' },
    },
  },
  {
    plotlineId: 'plot_power_struggle',
    branchId: 'branch_cooperation',
    momentId: 'power_coop_2',
    title: '财政预算案分歧',
    description: '县长提交的年度财政预算中,工业园区扩建占了大头,民生支出被压缩。这是县长的施政重点,但与人代会前的民生承诺有出入。',
  },
  {
    plotlineId: 'plot_power_struggle',
    branchId: 'branch_confrontation',
    momentId: 'power_conf_1',
    title: '县长在拉拢人',
    description: '据可靠消息,县长王立永近期频繁接触本土系干部,在饭局上畅谈"县政府的工作需要大家支持"。统战部长吴德出席了最近的一次聚会。',
  },
  {
    plotlineId: 'plot_power_struggle',
    branchId: 'branch_vacuum',
    momentId: 'power_vac_1',
    title: '权力真空',
    description: '由于书记和县长在多个问题上都没有明确表态,各局办开始自行其是。发改局擅自启动了一个未列入年度计划的项目。',
  },

  // ========== 剧情线2: 套中人专属事件 ==========
  {
    plotlineId: 'plot_corruption_web',
    branchId: 'branch_clean',
    momentId: 'corr_clean_1',
    title: '举报信',
    description: '纪委书记陈洁送来一封匿名举报信,详细列举了住建局长赵铁柱在三个工程项目中的利益输送行为。证据看起来比较扎实。',
    npcs: {
      discipline: { stance: '要求调查', hint: '陈洁希望获得您的授权,正式启动初核程序' },
      housing_bureau: { stance: '否认', hint: '赵铁柱闻讯后主动求见,声称自己"被诬陷"' },
    },
  },
  {
    plotlineId: 'plot_corruption_web',
    branchId: 'branch_selective',
    momentId: 'corr_select_1',
    title: '保护伞条件',
    description: '您庇护的某位干部最近动作太大,引起了纪委的注意。陈洁旁敲侧击地表示:"有些人的问题,恐怕不是压就能压得住的。"',
  },
  {
    plotlineId: 'plot_corruption_web',
    branchId: 'branch_protective',
    momentId: 'corr_protect_1',
    title: '企业主被带走',
    description: '紧急消息:县里最大的建筑商张老板被省纪委从公司带走。他手里握着多个项目的行贿记录。',
  },

  // ========== 剧情线3: 外来者专属事件 ==========
  {
    plotlineId: 'plot_local_vs_appointed',
    branchId: 'branch_centralize',
    momentId: 'local_central_1',
    title: '本土系消极怠工',
    description: '几个本土系的局长最近工作积极性明显下降。交通局的陈德胜局长连续三天"病假",农业农村局的刘丰收局长在推进项目时推三阻四。县委办郑浩汇报了这一情况。',
  },
  {
    plotlineId: 'plot_local_vs_appointed',
    branchId: 'branch_decentralize',
    momentId: 'local_decent_1',
    title: '空降系向上反映',
    description: '纪委书记陈洁这个月第三次去市里"开会"。据市委办的朋友透露,她在汇报中提到了"县里存在地方保护主义倾向"。',
  },

  // ========== 剧情线4: 指挥棒专属事件 ==========
  {
    plotlineId: 'plot_development_path',
    branchId: 'branch_industrial',
    momentId: 'dev_ind_1',
    title: '污染大户敲警钟',
    description: '市环保局通报:县里两家化工企业排放超标,被列入省级重点监控名单。如果整改不达标,可能面临区域限批。',
  },
  {
    plotlineId: 'plot_development_path',
    branchId: 'branch_livelihood',
    momentId: 'dev_live_1',
    title: '民生投入的回报',
    description: '省统计局公布的民生指数中,正定县在教育和医疗方面的进步得到了特别点评。但发改委的同志也提醒:经济增速在全市排名下降了一位。',
  },

  // ========== 剧情线5: 接班人专属事件 ==========
  {
    plotlineId: 'plot_succession_crisis',
    branchId: 'branch_cultivate',
    momentId: 'succ_cult_1',
    title: '组织部长摸底',
    description: '组织部长周明送来一份后备干部名单,上面标着"重点关注"和"可培养"两类。他暗示:书记应该考虑自己的接班人了。',
    npcs: {
      organization: { stance: '试探', hint: '周明想了解您对下一届人事安排的倾向' },
    },
  },
  {
    plotlineId: 'plot_succession_crisis',
    branchId: 'branch_balance',
    momentId: 'succ_bal_1',
    title: '各派系开始站队',
    description: '县长系开始推举常务副县长梁永文作为下一届的"重点培养对象"。本土系也在运作,希望统战部长吴德能在下一届更进一步。',
  },
];

/** 获取所有剧情线事件定义 */
function getAllPlotlineEvents() { return PLOTLINE_EVENTS; }

/** 按剧情线获取事件 */
function getPlotlineEventsByPlotline(plotlineId) {
  return PLOTLINE_EVENTS.filter(e => e.plotlineId === plotlineId);
}

/** 按剧情线和分支获取事件 */
function getPlotlineEventsByBranch(plotlineId, branchId) {
  return PLOTLINE_EVENTS.filter(e => e.plotlineId === plotlineId && e.branchId === branchId);
}
