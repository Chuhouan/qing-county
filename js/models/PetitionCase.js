/**
 * PetitionCase — 信访案件模型
 *
 * 描述：单个信访案件的数据结构，含信访人信息、诉求、状态、化解进度等
 * 设计文档：DESIGN_PHASE1_DETAILED.md 第二篇
 */

class PetitionCase {
  constructor(data = {}) {
    this.id = data.id || 'petition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.type = data.type || 'individual';       // 'individual'|'collective'|'crossLevel'
    this.category = data.category || 'other';    // 见 PETITION_CATEGORIES

    // 信访人
    this.petitioner = {
      name: data.petitioner?.name || '群众',
      group: data.petitioner?.group || 'farmer',
      age: data.petitioner?.age || 45,
      isRepeat: data.petitioner?.isRepeat ?? false,
      repeatYears: data.petitioner?.repeatYears || 0
    };

    // 诉求
    this.demand = data.demand || '';
    this.description = data.description || '';
    this.legalMerit = data.legalMerit ?? 50;      // 合理性 0-100
    this.urgency = data.urgency ?? 50;              // 紧急度 0-100
    this.amount = data.amount || 0;                 // 涉及金额（万元）

    // 状态
    this.status = data.status || 'pending';        // 'pending'|'processing'|'resolved'|'escalated'|'archived'
    this.currentLevel = data.currentLevel || 'county'; // 'county'|'city'|'province'|'central'
    this.escalationRisk = data.escalationRisk ?? 0;    // 越级风险 0-100
    this.weeksOnFile = data.weeksOnFile || 0;

    // 处理记录
    this.assignedTo = data.assignedTo || null;
    this.processHistory = data.processHistory || [];
    this.lastActionWeek = data.lastActionWeek || null;

    // 化解参数
    this.difficulty = data.difficulty ?? 50;       // 化解难度 0-100
    this.resolveProgress = data.resolveProgress || 0;
    this.stubborness = data.stubborness ?? 30;     // 信访人固执度
    this.trustInGov = data.trustInGov ?? 40;

    // 结果
    this.isResolved = data.isResolved ?? false;
    this.satisfaction = {
      petitioner: data.satisfaction?.petitioner ?? 0,
      superior: data.satisfaction?.superior ?? 0
    };
    this.oneVoteVeto = data.oneVoteVeto ?? false;

    // 标签
    this.tags = data.tags || [];
    this.importance = data.importance ?? 1;         // 1-3星
    this.isSupervision = data.isSupervision ?? false; // 上级督办
  }

  /** 获取摘要文本 */
  getSummary() {
    const typeLabel = { individual: '个访', collective: '集体访', crossLevel: '越级访' }[this.type] || '信访';
    const catLabel = {
      landDispute: '征地拆迁', compensation: '补偿纠纷', environmental: '环境污染',
      labor: '劳动社保', corruption: '干部作风', legal: '涉法涉诉', education: '教育医疗', other: '其他'
    }[this.category] || '其他';
    const levelLabel = { county: '县级', city: '市级', province: '省级', central: '进京' }[this.currentLevel] || '县级';
    return `[${levelLabel}] ${typeLabel} · ${catLabel}`;
  }
}

/** 信访案件分类枚举 */
const PETITION_CATEGORIES = {
  landDispute:     { name: '征地拆迁', baseWeight: 0.25, baseDifficulty: 55 },
  compensation:    { name: '补偿纠纷', baseWeight: 0.15, baseDifficulty: 45 },
  environmental:   { name: '环境污染', baseWeight: 0.10, baseDifficulty: 50 },
  labor:           { name: '劳动社保', baseWeight: 0.15, baseDifficulty: 40 },
  corruption:      { name: '干部作风', baseWeight: 0.10, baseDifficulty: 60 },
  legal:           { name: '涉法涉诉', baseWeight: 0.10, baseDifficulty: 70 },
  education:       { name: '教育医疗', baseWeight: 0.08, baseDifficulty: 35 },
  other:           { name: '其他',     baseWeight: 0.07, baseDifficulty: 30 }
};

/** 创建信访系统默认状态 */
function createDefaultPetitionState() {
  return {
    cases: [],
    archivedCases: [],
    totalCaseCount: 0,

    stats: {
      monthlyIncoming: 0,
      monthlyResolved: 0,
      resolvedRate: 0,
      crossLevelRate: 0,
      averageResolveWeeks: 0,
      petitionPressure: 30
    },

    petitionOfficers: 20,
    specialFunds: 200,

    oneVoteVeto: {
      crossLevelToCentral: 0,
      crossLevelToProvince: 0,
      massIncidentTriggered: false,
      threshold: { centralVisit: 3, provinceVisit: 8, massIncident: 1 },
      warningIssued: false,
      isTriggered: false
    },

    sensitivePeriod: {
      active: false,
      type: null,
      name: '',
      endWeek: null,
      multiplier: 1.5
    },

    caseResponsibility: {
      leaderCases: {},
      coverage: 0
    }
  };
}
