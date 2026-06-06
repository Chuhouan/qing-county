/**
 * Calculator - 数值计算工具集
 * 封装所有核心计算公式，方便后续调参
 */
class Calculator {
  // ============ 内置公式 ============

  /** 截断到范围 */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** 随机整数 [min, max] */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** 加权随机选择 */
  weightedPick(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** 百分比概率判定 */
  chance(percent) {
    return Math.random() * 100 < percent;
  }

  /** 百分比加成计算: base * (1 + bonus%) */
  applyBonus(base, bonusPercent) {
    return base * (1 + bonusPercent / 100);
  }

  /** 递减加成（边际效应） */
  diminishingBonus(base, add, factor = 0.5) {
    // 每加1单位，效果递减
    return base + add / (1 + factor * base / 100);
  }

  // ============ 游戏核心公式 ============

  /** 财政健康度 */
  calcFiscalHealth(deficitRate, debtRate, arrearsMonths) {
    const deficitPenalty = Math.min(50, deficitRate * 100);
    const debtPenalty = Math.min(30, Math.max(0, (debtRate - 60) * 0.5));
    const arrearsPenalty = Math.min(20, arrearsMonths * 2);
    return this.clamp(100 - deficitPenalty - debtPenalty - arrearsPenalty, 0, 100);
  }

  /** 社会张力变化（月度） */
  calcSocialTensionDelta(params) {
    let delta = 0;
    if (params.unemploymentRate > 0) delta += params.unemploymentRate * 0.3;
    if (params.inflationRate > 0) delta += params.inflationRate * 0.2;
    if (params.giniChange) delta += params.giniChange * 0.5;
    if (params.groupEvents) delta += params.groupEvents * 5;
    if (params.negativeNews) delta += params.negativeNews * 2;
    // 衰减
    if (params.economicGrowth > 0) delta -= params.economicGrowth * 0.1;
    if (params.newJobs) delta -= params.newJobs / 100 * 0.2;
    if (params.welfareSpending) delta -= params.welfareSpending * 0.05;
    return delta;
  }

  /** 政策实际效果 */
  calcPolicyEffect(design, efficiency, targetMatch, resourceRate, resistance) {
    return design * (efficiency / 100) * (targetMatch / 100) *
           (resourceRate / 100) * (1 - resistance / 100);
  }

  /** 月度税收收入 */
  calcTaxRevenue(industrialSales, serviceRevenue, profit, collectRate) {
    const vat = industrialSales * 0.13 * collectRate;
    const businessTax = serviceRevenue * 0.05 * collectRate;
    const incomeTax = profit * 0.33 * collectRate;
    return vat + businessTax + incomeTax;
  }

  /** 社会总满意度 */
  calcTotalSatisfaction(groups) {
    let total = 0;
    let weightSum = 0;
    for (const g of groups) {
      const popWeight = g.populationWeight ?? 0;
      const polWeight = g.politicalWeight ?? 1;
      const w = popWeight * polWeight;
      total += (g.satisfaction || 0) * w;
      weightSum += w;
    }
    return weightSum > 0 ? total / weightSum : 0;
  }

  /** 常委会投票结果计算 */
  calcCommitteeVote(members, issueFactors) {
    let support = 0, oppose = 0, abstain = 0;
    let supportWeight = 0, totalWeight = 0;

    for (const m of members) {
      if (typeof m.calcVote !== 'function') continue; // 跳过无投票方法的成员
      const decision = m.calcVote(issueFactors);
      const voteWt = m.voteWeight ?? 1;
      totalWeight += voteWt;
      if (decision === 'support') {
        support++;
        supportWeight += voteWt;
      } else if (decision === 'oppose') {
        oppose++;
      } else {
        abstain++;
      }
    }

    const passRate = totalWeight > 0 ? supportWeight / totalWeight : 0;
    return {
      support, oppose, abstain,
      supportWeight, passRate,
      passed: passRate > 0.5,
      result: passRate > 0.5 ? '通过' : '未通过',
    };
  }

  /** 信息可信度修正 */
  calcInfoReliability(baseCredibility, verifyLevel) {
    const verifyMap = { 0: 0, 1: 0.2, 2: 0.5, 3: 0.9 };
    const bonus = verifyMap[verifyLevel] || 0;
    return this.clamp(baseCredibility + bonus, 0, 1);
  }

  /** 精力消耗 */
  calcEnergyCost(activity, duration) {
    const costMap = {
      'approve_file': 2,    // 批阅文件
      'meeting': 3,         // 参加会议
      'inspect': 4,         // 下乡调研
      'talk': 2.5,          // 谈话
      'study': 2,           // 学习
      'social': 3.5,        // 应酬
    };
    return (costMap[activity] || 2) * duration;
  }

  /** 晋升概率计算 */
  calcPromotionChance(params) {
    let chance = 20; // 基础20%
    chance += (params.excellentEvaluations || 0) * 10;
    chance += (params.secretarySupport || 0) * 20;
    chance += (params.provinceConnections || 0) * 15;
    chance += (params.majorAchievements || 0) * 15;
    chance -= (params.competitors || 0) * 10;
    if (params.age > 50) chance -= 5;
    if (params.mistakes) chance -= 10;
    if (!params.recommendation) chance -= 20;
    return this.clamp(chance, 0, 100);
  }
}

const calculator = new Calculator();
