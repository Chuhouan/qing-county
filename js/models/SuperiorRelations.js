/**
 * SuperiorRelations — 上级关系模型
 *
 * 描述县委书记的省、市两级上级关系网络
 * 包括：市级领导（书记/市长/组织部/纪委/市直部门）、省厅关系、政治资本、人情账本、靠山体系
 *
 * 设计文档：DESIGN_PHASE1_DETAILED.md 第一篇
 */

/** 创建上级关系默认状态 */
function createDefaultSuperiorRelations() {
  return {
    // ========== 市级层面 ==========
    cityLevel: {
      // 市委书记
      secretary: {
        trust: 55,           // 信任度 0-100
        favor: 10,           // 人情债 0-100
        faction: 'unknown',  // 'a'|'b'|'neutral'|'unknown'
        style: 'pragmatic',  // 'pragmatic'|'political'|'technocratic'|'aggressive'
        lastMeeting: null,   // { week, month, year }
        meetingCount: 0,     // 本年度见面次数
        keyConcerns: ['economicGrowth', 'stability'],
        pendingRequests: [], // 交办事项 [{ id, desc, deadline, status }]
        evaluation: {
          overall: 55, execution: 55, loyalty: 55, lastUpdated: null
        }
      },
      // 市长
      mayor: {
        trust: 50, favor: 0, faction: 'unknown',
        style: 'technocratic',
        lastMeeting: null, meetingCount: 0,
        keyConcerns: ['fiscalHealth', 'projectProgress'],
        pendingRequests: [],
        evaluation: { overall: 50, execution: 50, loyalty: 50, lastUpdated: null }
      },
      // 市委组织部
      organizationDept: {
        impression: 50,       // 印象分 0-100
        vigilance: 20,        // 警惕度（调人太多上升）
        lastEvaluation: null,
        evaluationDue: null,
        contactFrequency: 0
      },
      // 市纪委
      disciplineDept: {
        vigilance: 30,        // 关注度（越高越被盯着）
        pendingCase: null,
        lastContact: null
      },
      // 其他市领导（统战/政法/宣传——动态生成）
      otherLeaders: {},
      // 市直部门好感度（争取项目用的）
      cityDepts: {
        finance:     { favor: 40, lastContact: null },
        development: { favor: 40, lastContact: null },
        agriculture: { favor: 35, lastContact: null },
        transportation: { favor: 30, lastContact: null },
        education:  { favor: 35, lastContact: null }
      }
    },

    // ========== 省级层面 ==========
    provinceLevel: {
      // 省直厅局好感度
      deptFavors: {
        finance:      { favor: 30, lastVisit: null, projectsSubmitted: [] },
        agriculture:  { favor: 30, lastVisit: null, projectsSubmitted: [] },
        transportation: { favor: 25, lastVisit: null, projectsSubmitted: [] },
        waterResources: { favor: 25, lastVisit: null, projectsSubmitted: [] }
      },
      // 省领导知晓度
      provincialAwareness: {
        governor:      { awareness: 10, impression: 50 },
        partySecretary: { awareness: 5,  impression: 50 }
      }
    },

    // ========== 政治资本与账本 ==========
    politicalCapital: 100,   // 0-200
    favorAccount: {
      owes: [],   // 你欠别人的 [{ from, type, desc, date, status: 'active'|'repaid'|'forgiven' }]
      owed: [],   // 别人欠你的
    },

    // ========== 靠山体系 ==========
    patronChain: {
      patron: null,         // 靠山 { id, name, role, power }
      patronStrength: 0,    // 靠山势力 0-100
      patronLoyalty: 0,     // 你对靠山的忠诚度 0-100
      rivals: [],           // 政敌
      allies: []            // 同盟
    },

    // ========== 系统统计 ==========
    stats: {
      totalVisits: 0,
      totalProjectsWon: 0,
      totalFavors: 0,
      superiorSatisfaction: 55, // 综合满意度 0-100
      lastMonthlyDecay: null
    }
  };
}

/** 创建默认市委领导配置（基于游戏难度/风格初始化） */
function createDefaultCityLeadership(style) {
  const styles = {
    pragmatic: {
      secretary: { name: '赵建国', trust: 55, style: 'pragmatic', concerns: ['economicGrowth', 'stability'] },
      mayor:     { name: '刘国锋', trust: 50, style: 'technocratic', concerns: ['fiscalHealth'] }
    },
    political: {
      secretary: { name: '周明远', trust: 50, style: 'political', concerns: ['partyBuilding', 'loyalty'] },
      mayor:     { name: '孙立群', trust: 45, style: 'pragmatic', concerns: ['economicGrowth'] }
    },
    aggressive: {
      secretary: { name: '吴铁军', trust: 45, style: 'aggressive', concerns: ['innovation', 'performance'] },
      mayor:     { name: '陈和平', trust: 50, style: 'technocratic', concerns: ['fiscalHealth', 'stability'] }
    }
  };
  return styles[style] || styles.pragmatic;
}
