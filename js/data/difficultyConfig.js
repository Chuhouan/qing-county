/**
 * 难度配置数据——以正定县2024年真实数据为原型（2026年设定）
 * 来源：正定县2024年国民经济和社会发展统计公报
 */
const DIFFICULTY_CONFIG = {
  easy: {
    id: 'easy', label: '城郊强县',
    description: '历史文化名城，旅游业发达，区位优势明显',
    county: {
      name: '正定县',
      description: '河北省石家庄市辖县，毗邻省会，拥有正定古城、隆兴寺等著名景点，历史文化底蕴深厚。2024年全县生产总值387.7亿元，第三产业占比71.65%。',
      population: { total: 553104, urbanRatio: 0.67, ruralRatio: 0.33, agingCoeff: 0.15, educationIndex: 0.55 },
      economy: { gdp: 3877000, gdpGrowth: 0.056, industrialRatio: 0.1919, agricultureRatio: 0.0916, serviceRatio: 0.7165 },
      institution: { bureaucracyEfficiency: 68, corruptionIndex: 15 },
      superiorTrust: { citySecretary: 55, provincialEval: 60, centralImpression: 50 },
      localPrestige: { officialSupport: 65, publicApproval: 62, entrepreneurConfidence: 58 },
      historicalBurden: { hiddenDebt: 80000 },
      socialTension: 18,
    },
    playerTemplate: 'balance',
    towns: 11,
    term: 5,
    goal: '在现有基础上实现高质量发展',
  },
  normal: {
    id: 'normal', label: '中等发展县',
    description: '有一定工业基础，财政收支基本平衡',
    county: {
      name: '清河县',
      description: '一个典型的北方平原县，制造业和农业并重。2024年GDP约120亿元，城镇化率约45%。',
      population: { total: 500000, urbanRatio: 0.45, ruralRatio: 0.55, agingCoeff: 0.16, educationIndex: 0.35 },
      economy: { gdp: 1200000, gdpGrowth: 0.048, industrialRatio: 0.35, agricultureRatio: 0.30, serviceRatio: 0.35 },
      institution: { bureaucracyEfficiency: 55, corruptionIndex: 22 },
      superiorTrust: { citySecretary: 50, provincialEval: 45, centralImpression: 45 },
      localPrestige: { officialSupport: 55, publicApproval: 55, entrepreneurConfidence: 45 },
      historicalBurden: { hiddenDebt: 60000 },
      socialTension: 25,
    },
    playerTemplate: 'balance',
    towns: 10,
    term: 5,
    goal: '推动产业升级，改善民生',
  },
  hard: {
    id: 'hard', label: '欠发达农业县',
    description: '偏远地区，产业基础薄弱，财政困难',
    county: {
      name: '苍山县',
      description: '位于偏远山区的农业县，交通不便，青壮年劳动力外流严重。2024年GDP约40亿元。',
      population: { total: 350000, urbanRatio: 0.28, ruralRatio: 0.72, agingCoeff: 0.22, educationIndex: 0.20 },
      economy: { gdp: 400000, gdpGrowth: 0.025, industrialRatio: 0.15, agricultureRatio: 0.55, serviceRatio: 0.30 },
      institution: { bureaucracyEfficiency: 40, corruptionIndex: 30 },
      superiorTrust: { citySecretary: 38, provincialEval: 35, centralImpression: 38 },
      localPrestige: { officialSupport: 42, publicApproval: 40, entrepreneurConfidence: 25 },
      historicalBurden: { hiddenDebt: 120000 },
      socialTension: 35,
    },
    playerTemplate: 'economy',
    towns: 8,
    term: 5,
    goal: '巩固脱贫成果，寻找发展突破口',
  },
  hell: {
    id: 'hell', label: '衰退老工业县',
    description: '传统产业没落，转型困难，社会矛盾突出',
    county: {
      name: '铁西县',
      description: '曾经辉煌的老工业基地，随着产业升级步伐滞后，传统制造业大面积亏损，失业率攀升，财政濒临崩溃。',
      population: { total: 650000, urbanRatio: 0.52, ruralRatio: 0.48, agingCoeff: 0.24, educationIndex: 0.30 },
      economy: { gdp: 600000, gdpGrowth: -0.01, industrialRatio: 0.50, agricultureRatio: 0.15, serviceRatio: 0.35 },
      institution: { bureaucracyEfficiency: 32, corruptionIndex: 42 },
      superiorTrust: { citySecretary: 28, provincialEval: 30, centralImpression: 32 },
      localPrestige: { officialSupport: 32, publicApproval: 28, entrepreneurConfidence: 18 },
      historicalBurden: { hiddenDebt: 400000 },
      socialTension: 55,
    },
    playerTemplate: 'stability',
    towns: 12,
    term: 5,
    goal: '防止系统性崩溃，推动转型',
  },
};

/** 玩家属性模板（县委书记版） */
const PLAYER_TEMPLATES = {
  politics: {
    label: '政治型书记',
    abilities: { politics: 78, cadreMgmt: 65, economy: 55, stability: 60, partyBuilding: 72, integrity: 75 },
    desc: '优势：政治把控力强，党建工作扎实；劣势：经济决策偏弱',
  },
  economy: {
    label: '经济型书记',
    abilities: { politics: 62, cadreMgmt: 58, economy: 78, stability: 55, partyBuilding: 50, integrity: 68 },
    desc: '优势：懂经济、会招商；劣势：党建和干部管理偏弱',
  },
  balance: {
    label: '平衡型书记',
    abilities: { politics: 68, cadreMgmt: 65, economy: 62, stability: 62, partyBuilding: 60, integrity: 72 },
    desc: '优势：各项均衡无短板；劣势：无突出亮点',
  },
  cadre: {
    label: '干部型书记',
    abilities: { politics: 70, cadreMgmt: 80, economy: 50, stability: 58, partyBuilding: 68, integrity: 78 },
    desc: '优势：善于用人，干部队伍强；劣势：经济决策依赖县长',
  },
  reform: {
    label: '改革型书记',
    abilities: { politics: 65, cadreMgmt: 60, economy: 68, stability: 48, partyBuilding: 55, integrity: 58 },
    desc: '优势：敢于改革创新；劣势：容易引发矛盾，稳定风险高',
  },
};
