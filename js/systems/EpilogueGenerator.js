/**
 * EpilogueGenerator - 结局生成器
 * 在游戏结束时,根据NarrativeMemory和PlotlineEngine的数据,生成叙事性结局
 */
class EpilogueGenerator {
  constructor() {
    this.engine = null;
  }

  init() {
    // 不需要特殊初始化
  }

  /** 主入口: 生成完整结局数据 */
  generate() {
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    const evalData = stateManager.get('evaluation');
    const narrativeSys = this.engine ? this.engine.getSystem('narrative') : null;

    if (!player || !county) return null;

    // 1. 评估总体表现
    const overall = this._assessOverall(player, county, evalData);

    // 2. 获取各剧情线结局
    const plotlineResults = this._getPlotlineOutcomes(narrativeSys);

    // 3. 关键人物命运
    const characterFates = this._generateCharacterFates(player, county);

    // 4. 政治遗产评估
    const legacy = this._assessLegacy(player, county);

    // 5. 叙事性结局文本
    const narrative = this._composeNarrative(overall, plotlineResults, characterFates, legacy);

    // 6. 历史评价
    const historicalRanking = this._calculateHistoricalRanking(player, county, evalData);

    // 7. 结尾寄语
    const postscript = this._generatePostscript(historicalRanking, player);

    return {
      overall,
      plotlineResults,
      characterFates,
      legacy,
      narrative,
      historicalRanking,
      postscript,
    };
  }

  /** 评估总体表现 */
  _assessOverall(player, county, evalData) {
    const totalPerf = typeof player.getTotalPerformance === 'function' ? player.getTotalPerformance() : 0;
    const tension = county.socialTension || 0;
    const eco = county.economy ? county.economy.economicVitality : 50;
    const superior = county.superiorTrust ? county.superiorTrust.citySecretary : 50;

    let grade = 'term_end_average';
    let score = 0;

    if (evalData && evalData.rank) {
      score = evalData.total || 0;
      if (evalData.rank === '优秀') grade = 'term_end_excellent';
      else if (evalData.rank === '良好') grade = 'term_end_good';
      else if (evalData.rank === '不合格') grade = 'term_end_poor';
    } else {
      // 手动计算
      score = Math.round(totalPerf);
      if (score >= 80) grade = 'term_end_excellent';
      else if (score >= 60) grade = 'term_end_good';
      else if (score >= 40) grade = 'term_end_average';
      else grade = 'term_end_poor';
    }

    const template = EPILOGUE_TEMPLATES.overall[grade] || EPILOGUE_TEMPLATES.overall.term_end_average;

    return {
      grade: grade,
      title: template.title,
      score: score,
      stability: Math.round(Math.max(0, 100 - tension)),
      economy: Math.round(eco),
      superior: Math.round(superior),
    };
  }

  /** 获取各剧情线结局 */
  _getPlotlineOutcomes(narrativeSys) {
    const results = [];
    if (!narrativeSys || !narrativeSys.plotlines) return results;

    const plotlines = narrativeSys.plotlines.getAllPlotlines();
    for (const p of plotlines) {
      const outcome = p.outcome || (p.status === 'resolved' ? '正常结束' : (p.isResolved() ? '未完成' : '进行中'));
      const templates = EPILOGUE_TEMPLATES.plotlines[p.id] || {};
      const description = templates[outcome] || p.narrativeDescription || '';

      results.push({
        id: p.id,
        name: p.name,
        status: p.status,
        outcome: outcome,
        description: description,
        progress: p.progress,
        phaseLabel: p.getPhaseLabel(),
      });
    }
    return results;
  }

  /** 生成关键人物命运 */
  _generateCharacterFates(player, county) {
    const fates = [];
    const personnelSys = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnelSys) return fates;

    // 关键人物
    const keyIds = ['magistrate', 'deputy_secretary', 'discipline', 'organization',
                    'united_front', 'finance_bureau', 'politics_law', 'deputy_magistrate'];
    const narrativeSys = this.engine ? this.engine.getSystem('narrative') : null;

    for (const id of keyIds) {
      const official = personnelSys.get(id);
      if (!official) continue;

      const playerRel = official.relations ? official.relations.player || 50 : 50;
      const loyalty = official._loyalty || 50;
      const ability = official._ability || 50;

      let fate = '';
      if (playerRel >= 70 && loyalty >= 60) {
        fate = '与书记关系融洽,在您的推荐下获得了更好的发展。';
      } else if (playerRel <= 30) {
        fate = '与书记关系较为紧张,任期内影响力受到一定限制。';
      } else {
        fate = '继续在现岗位上履职。';
      }

      // 是否有关于此人的记忆
      let memoryNote = '';
      if (narrativeSys && narrativeSys.memory) {
        const lastDec = narrativeSys.memory.getLastDecisionAbout(official.id);
        if (lastDec) {
          memoryNote = '人们还记得' + lastDec.getTimeLabel() + '的"' + lastDec.title + '"。';
        }
      }

      fates.push({
        id: official.id,
        name: official.name,
        title: official.title,
        faction: official._factionName || official._factionId || '',
        fate: fate,
        memoryNote: memoryNote,
        relationToPlayer: playerRel,
      });
    }

    return fates;
  }

  /** 评估政治遗产 */
  _assessLegacy(player, county) {
    const ecoGrowth = county.economy ? county.economy.gdpGrowth || 0 : 0;
    const employment = county.population ? county.population.employmentRate || 0 : 0;
    const corruptionIdx = county.institution ? county.institution.corruptionIndex || 20 : 20;
    const bureaucracyEff = county.institution ? county.institution.bureaucracyEfficiency || 60 : 60;

    const narrativeSys = this.engine ? this.engine.getSystem('narrative') : null;
    const memCount = narrativeSys && narrativeSys.memory ? narrativeSys.memory.entries.length : 0;

    return {
      economy: { growth: (ecoGrowth * 100).toFixed(1) + '%', assessment: ecoGrowth >= 0.05 ? '经济增长较快' : '经济增长乏力' },
      employment: { rate: (employment * 100).toFixed(0) + '%', assessment: employment >= 0.7 ? '就业形势良好' : '就业压力较大' },
      antiCorruption: { index: Math.round(corruptionIdx), assessment: corruptionIdx <= 20 ? '廉洁程度较高' : corruptionIdx <= 40 ? '基本廉洁' : '腐败问题较为突出' },
      governance: { efficiency: Math.round(bureaucracyEff), assessment: bureaucracyEff >= 70 ? '行政效率较高' : '行政效率有待提升' },
      decisionCount: memCount,
    };
  }

  /** 撰写叙事性结局文本 */
  _composeNarrative(overall, plotlineResults, characterFates, legacy) {
    const parts = [];

    // 总体评价
    const template = EPILOGUE_TEMPLATES.overall[overall.grade];
    if (template) {
      parts.push(template.template
        .replace('{playerName}', stateManager.get('player')?.name || '书记')
        .replace('{countyName}', '正定')
        .replace('{severityDesc}', '涉案金额巨大,情节严重')
        .replace('{dismissReason}', '社会动荡和上级不信任')
      );
    }

    // 经济发展
    parts.push('在经济方面,' + legacy.economy.assessment + '（年均增速' + legacy.economy.growth + '）。' + legacy.employment.assessment + '（就业率' + legacy.employment.rate + '）。');

    // 廉政
    parts.push('在廉政建设方面,' + legacy.antiCorruption.assessment + '（腐败指数' + legacy.antiCorruption.index + '）。');

    // 剧情线
    for (const p of plotlineResults) {
      if (p.description) {
        parts.push('[' + p.name + '] ' + p.description);
      }
    }

    // 人物命运(选最重要的2-3个)
    const topFates = characterFates.slice(0, 3);
    for (const f of topFates) {
      parts.push(f.name + '（' + (f.faction || f.title) + '）:' + f.fate + (f.memoryNote ? f.memoryNote : ''));
    }

    return parts.join('\n\n');
  }

  /** 计算历史评价等级 */
  _calculateHistoricalRanking(player, county, evalData) {
    const totalPerf = typeof player.getTotalPerformance === 'function' ? player.getTotalPerformance() : 0;
    const tension = county.socialTension || 0;
    const superior = county.superiorTrust ? county.superiorTrust.citySecretary : 50;
    const corruption = county.institution ? county.institution.corruptionIndex : 20;

    let rank = '合格';
    if (totalPerf >= 80 && tension < 30 && superior > 70 && corruption < 20) rank = '优秀';
    else if (totalPerf >= 60 && tension < 50) rank = '良好';
    else if (totalPerf < 40 || tension > 80) rank = '不合格';

    return rank;
  }

  /** 生成结尾寄语 */
  _generatePostscript(ranking, player) {
    const quotes = {
      '优秀': '政声人去后,民意闲谈中。多年以后,{countyName}的百姓依然会记得这位书记。',
      '良好': '治理不是在干净整洁的棋盘上移动棋子,而是在泥泞中前行,在黑暗中摸索,在压力下抉择。',
      '合格': '历史的评价,往往需要更长的时间来沉淀。',
      '不合格': '这是一个值得深刻反思的案例。权力是一把双刃剑,敬畏之心不可忘。',
    };
    return (quotes[ranking] || '任期已满,继往开来。').replace('{countyName}', '正定');
  }

  /** 从存档恢复 */
  deserialize(data) {
    // 不需要特殊恢复
  }
}
