/**
 * IntelSystem - 情报信息系统
 * 4.6 信息渠道、验证、简报
 */
class IntelSystem {
  constructor() { this.engine = null; }

  init() {
    stateManager.register('intel', { channels: this._initChannels(), brief: null });
  }

  _initChannels() {
    return [
      { id: 'statistics', name: '统计局报表', credibility: 0.7, timeliness: '月度', cost: 0,
        type: 'economic', bias: '报喜不报忧', enabled: true },
      { id: 'private_talk', name: '私下交谈', credibility: 0.85, timeliness: '随时', cost: '人情',
        type: 'official_opinion', bias: '个人立场', enabled: true },
      { id: 'inspection', name: '下乡暗访', credibility: 0.95, timeliness: '需时间', cost: '2-3天',
        type: 'real_situation', bias: '抽样误差', enabled: true },
      { id: 'petition', name: '群众来信', credibility: 0.6, timeliness: '延迟', cost: '信访处理',
        type: 'complaints', bias: '夸大个别', enabled: true },
    ];
  }

  /** 获取信息 */
  getReport(channelId) {
    const channel = stateManager.getValue('intel', 'channels').find(c => c.id === channelId);
    if (!channel) return null;
    return {
      channel: channel.name,
      credibility: channel.credibility,
      bias: channel.bias,
      data: this._generateDummyData(channel.type),
    };
  }

  _generateDummyData(type) {
    const data = {
      economic: {
        gdpGrowth: (Math.random() * 10 + 2).toFixed(1) + '%',
        fiscalRevenue: (Math.random() * 1000 + 500).toFixed(0) + '万',
        investment: (Math.random() * 500 + 100).toFixed(0) + '万',
      },
      official_opinion: {
        sentiment: Math.random() > 0.5 ? '正面' : '中立',
        concern: ['预算紧张', '人事变动', '上级检查'][Math.floor(Math.random() * 3)],
      },
      real_situation: {
        summary: Math.random() > 0.6 ? '发现若干问题' : '一切正常',
        issues: Math.random() > 0.7 ? ['道路破损', '学校设施差'] : [],
      },
      complaints: {
        count: Math.floor(Math.random() * 20),
        topIssues: ['住房', '医疗', '教育'].slice(0, Math.floor(Math.random() * 3 + 1)),
      },
    };
    return data[type] || { message: '无数据' };
  }

  /** 信息验证 */
  verifyInfo(channelId, level) {
    const channel = stateManager.getValue('intel', 'channels').find(c => c.id === channelId);
    if (!channel) return null;
    const newCredibility = calculator.calcInfoReliability(channel.credibility, level);
    const result = Math.random();
    const outcomes = ['属实', '部分属实', '不属实但有问题', '完全错误'];
    const probabilities = [0.4, 0.3, 0.2, 0.1];
    let cumulative = 0;
    let outcome = outcomes[0];
    for (let i = 0; i < outcomes.length; i++) {
      cumulative += probabilities[i];
      if (result < cumulative) { outcome = outcomes[i]; break; }
    }
    return {
      channel: channel.name,
      originalCredibility: channel.credibility,
      newCredibility,
      verificationLevel: level,
      outcome,
      suggestion: this._getVerifySuggestion(outcome),
    };
  }

  _getVerifySuggestion(outcome) {
    const map = {
      '属实': '建议按规定处理',
      '部分属实': '提出警告，要求整改',
      '不属实但有问题': '批评举报人，但深挖其他问题',
      '完全错误': '可能是诬告，需谨慎处理',
    };
    return map[outcome] || '需进一步调查';
  }

  /** 生成本日简报 */
  generateDailyBrief() {
    const brief = {
      date: timeSystem.getTimeString(),
      weather: ['晴', '多云', '阴', '小雨'][Math.floor(Math.random() * 4)],
      yesterdayHighlights: this._generateHighlights(3),
      todaySchedule: this._generateSchedule(),
      pendingFiles: Math.floor(Math.random() * 5) + 3,
      urgentFiles: Math.floor(Math.random() * 3),
      superiorDirectives: Math.random() > 0.6 ? ['市里要求加快招商引资进度'] : [],
      publicSentiment: this._generateSentiment(),
    };
    stateManager.set('intel', { ...stateManager.get('intel'), brief });
    return brief;
  }

  _generateHighlights(count) {
    const pool = [
      { event: '财政局完成月度报表', status: '完成' },
      { event: '信访办接访5人次', status: '已处理' },
      { event: '城关镇道路改造进展顺利', status: '进行中' },
      { event: '省环保督查组即将到访', status: '需关注' },
      { event: '棉纺厂职工反映工资拖欠', status: '待处理' },
    ];
    return pool.slice(0, count);
  }

  _generateSchedule() {
    const wd = timeSystem.weekDay;
    const schedule = [];
    schedule.push({ time: '08:00', activity: '到达办公室批阅文件' });
    if (wd === 1) schedule.push({ time: '09:00', activity: '参加县委常委会' });
    else if (wd === 2) schedule.push({ time: '09:00', activity: '召开县长办公会' });
    else schedule.push({ time: '09:00', activity: '听取部门汇报' });
    schedule.push({ time: '14:00', activity: Math.random() > 0.5 ? '下乡调研' : '处理专项工作' });
    schedule.push({ time: '20:00', activity: Math.random() > 0.7 ? '接待应酬' : '学习思考' });
    return schedule;
  }

  _generateSentiment() {
    const topics = [
      { topic: '粮价波动', intensity: Math.random(), sentiment: Math.random() > 0.5 ? '不满' : '关注' },
      { topic: '新项目征地', intensity: Math.random(), sentiment: Math.random() > 0.7 ? '反对' : '观望' },
    ];
    return topics.filter(t => t.intensity > 0.4);
  }
}
