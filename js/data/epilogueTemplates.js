/**
 * epilogueTemplates.js — 结局模板数据
 */
var EPILOGUE_TEMPLATES = {
  overall: {
    term_end_excellent: { title: '卓越', template: '{playerName}同志在五年任期内推动{countyName}各项事业取得显著成效。' },
    term_end_good: { title: '良好', template: '{playerName}同志勤勉尽责,较好地完成了各项工作任务。' },
    term_end_average: { title: '合格', template: '{playerName}同志的表现中规中矩,基本称职。' },
    term_end_poor: { title: '不合格', template: '多项发展指标未达预期,社会治理存在明显短板。' },
    corruption: { title: '落马', template: '{playerName}因严重违纪违法被立案审查。' },
    illness: { title: '病故', template: '{playerName}因积劳成疾,倒在了工作岗位上。' },
    dismissed: { title: '免职', template: '{playerName}因重大失职被免去县委书记职务。' },
  },
  plotlines: {
    plot_power_struggle: {
      '双赢合作': '与县长王立永形成了党政合作的典范。',
      '县长调离': '县长王立永被调离,书记权力巩固但留下不和名声。',
      '书记被架空': '权力被架空,县长系实际主导政府工作。',
      '权力制衡': '双方形成脆弱的权力平衡,没有公开冲突。',
    },
    plot_corruption_web: {
      '彻底清肃': '腐败网络被彻底清除,多名干部受到党纪国法严惩。',
      '有限反腐': '部分腐败分子被查处,但腐败土壤未被彻底铲除。',
      '落马入狱': '书记本人深陷腐败泥潭,最终受到法律的严惩。',
      '侥幸过关': '虽然存在诸多问题,但书记最终未受到追究。',
      '主动坦白': '在组织调查前主动交代问题,获得了从轻处理。',
    },
    plot_local_vs_appointed: {
      '空降系完胜': '在书记的支持下,空降系成功主导了县里的政治生态。',
      '本土系妥协': '本土系在压力下做出让步,接受了新的权力格局。',
      '两败俱伤': '空降系和本土系的持续斗争,最终影响了全县的工作效率。',
      '本土系稳固': '本土系根基深厚,在博弈中保住了自己的传统势力范围。',
      '空降系反扑': '空降系通过上级关系反败为胜,本土系受到打压。',
      '中间路线': '书记在双方之间保持平衡,但消耗了大量政治资本。',
    },
    plot_development_path: {
      '成功转型': '产业结构成功优化,实现了从单一到多元的跨越。',
      '环保被问责': '以牺牲环境换取的增长最终还是付出了代价。',
      '坚持民生获表彰': '民生导向的发展道路最终获得了上级和群众的双重认可。',
      '改革成功': "大胆的改革举措取得成效,'正定经验'在全市推广。",
      '半途而废': '改革遭遇阻力后未能坚持到底,前功尽弃。',
    },
    plot_succession_crisis: {
      '顺利接班': '书记培养的接班人顺利接任,政治遗产得以延续。',
      '接班失败': '书记选定的接班人在最后关头被其他派系阻挡。',
      '全身而退': '书记没有强行安排接班人,虽然影响力减弱,但平安过渡。',
      '失去影响力': '对自己的政治遗产未做安排,离任后迅速被遗忘。',
    },
  },
};

/** 获取结局模板 */
function getEpilogueTemplate(category, key) {
  var cat = EPILOGUE_TEMPLATES[category];
  return cat ? (cat[key] || null) : null;
}