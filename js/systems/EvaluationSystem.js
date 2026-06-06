/**
 * EvaluationSystem - 考核评价系统（三状态版）
 * 基于：稳定(stability) + 经济(economicVitality) + 上级评价(superiorEvaluation)
 */
class EvaluationSystem {
  constructor() { this.engine = null; }

  init() {
    stateManager.register('evaluation', {
      scores: { stability: 0, economy: 0, superior: 0 },
      total: 0, rank: '待考核', annualHistory: [],
    });
  }

  /** 年度考核 */
  annualReview() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!player || !county) return;

    // 三个核心状态分
    const stability = Math.max(0, 100 - (county.socialTension || 0));
    const ecoVital = county.economy?.economicVitality ?? 50;
    const superior = county.superiorTrust?.citySecretary || 50;

    // 治理路线加成
    const strategy = gameEngine.focusAreas?.[0] || 'economicDevelopment';
    const routeBonus = {
      economicDevelopment: { economy: 0.15, stability: 0, superior: 0 },
      socialStability: { stability: 0.15, economy: 0, superior: 0 },
      peopleLivelihood: { stability: 0.10, economy: 0, superior: 0.05 },
      partyConstruction: { superior: 0.15, stability: 0, economy: 0 },
    };
    const bonus = routeBonus[strategy] || { economy: 0, stability: 0, superior: 0 };

    // 评分 = 状态值 × 权重 + 路线加成
    const scores = {
      stability: Math.round(stability * 0.35 * (1 + bonus.stability)),
      economy: Math.round(ecoVital * 0.40 * (1 + bonus.economy)),
      superior: Math.round(superior * 0.25 * (1 + bonus.superior)),
    };

    const total = scores.stability + scores.economy + scores.superior;
    const rank = total >= 85 ? '优秀' : total >= 70 ? '良好' : total >= 55 ? '合格' : '不合格';

    stateManager.set('evaluation', {
      scores, total, rank,
      history: [...(stateManager.get('evaluation')?.annualHistory || []), {
        year: timeSystem.year, scores, total, rank,
      }],
    });

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important',
      title: '年度考核',
      message: `${timeSystem.year}年度考核结果：${rank}（${Math.round(total)}分）`,
    });

    if (rank === '优秀') player.politicalCapital += 15;
    return { scores, total, rank };
  }

  /** 晋升概率计算 */
  calcPromotion() {
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    if (!county || !player) return null;

    const evalData = stateManager.get('evaluation');
    const history = evalData?.history || [];
    const avgScore = history.length > 0
      ? history.reduce((s, h) => s + h.total, 0) / history.length : 50;

    const superior = county.superiorTrust?.citySecretary || 50;
    let chance = 20; // 基础概率

    history.forEach(h => { if (h.rank === '优秀') chance += 10; });
    if (superior > 60) chance += 20;
    if (player.politicalCapital > 100) chance += 10;
    if (player.age > 50) chance -= 5;
    if (superior < 20) chance -= 20;
    if (avgScore < 55) chance -= 10;
    if (county.socialTension > 80) chance -= 10;

    const result = {
      chance: Math.max(0, Math.min(100, chance)),
      promoted: Math.random() * 100 < chance,
      avgScore, history,
      factors: {
        base: 20,
        excellentYears: history.filter(h => h.rank === '优秀').length * 10,
        superiorSupport: superior > 60 ? 20 : superior < 20 ? -20 : 0,
        capitalBonus: player.politicalCapital > 100 ? 10 : 0,
        agePenalty: player.age > 50 ? -5 : 0,
        stabilityPenalty: county.socialTension > 80 ? -10 : 0,
      },
    };
    return result;
  }

  /** 获取当前总评分 */
  getTotalScore() {
    const county = stateManager.get('county');
    if (!county) return 50;
    const stability = Math.max(0, 100 - (county.socialTension || 0));
    const ecoVital = county.economy?.economicVitality ?? 50;
    const superior = county.superiorTrust?.citySecretary || 50;
    return Math.round(stability * 0.35 + ecoVital * 0.40 + superior * 0.25);
  }
}
