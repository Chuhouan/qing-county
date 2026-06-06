# 《青县》Phase 1 系统详细设计

> 版本：v0.2 | 2026-06-05 | 实现级设计文档
> 目标：上级关系系统 + 信访维稳系统，展开到可以直接编码的粒度

---

## 第一篇：上级关系系统 (SuperiorRelationshipSystem)

---

### 一、设计核心理念

**一句话宗旨**：让玩家感觉到头顶有人——市委书记的一个电话、省委组织部的一次考察、省厅的一个项目审批，都比县内任何事情重要。

**设计矛盾**：
- 玩家需要向上级"跑"资源，但跑得太多显得功利、太频繁会消耗精力
- 玩家需要维护多条线（市领导、省厅、组织部），但精力有限
- 上级对你有期望，你不满足会扣分；你满足了，下次期望更高

**玩家在系统中的决策循环**：
```
本周空闲精力 →
  选择：A) 去市委汇报工作  B) 去省厅争取项目  C) 邀请领导来调研  D) 什么都不做
     ↓
  结果：A→ 市委书记信任+3，精力-15，政治资本+2
        B→ 省财政厅好感+2，随机项目到手/落空，精力-20，差旅费30万
        C→ 接待费80万，领导印象+5，但可能暴露问题
        D→ 什么都没发生，但关系自然衰减-1/周
```

---

### 二、完整数据模型

```javascript
// ===== 上级关系状态 (stateManager.get('superiorRelations')) =====
const SUPERIOR_DEFAULT = {
  // ——— 市级领导 ———
  cityLevel: {
    // 市委书记
    secretary: {
      trust: 55,           // 信任度 0-100，最重要的指标
      favor: 10,           // 人情债 0-100，你欠他的/他欠你的
      faction: 'unknown',  // 'a'|'b'|'neutral'|'unknown'，他的派系归属
      style: 'pragmatic',  // 'pragmatic'|'political'|'technocratic'|'aggressive'
      lastMeeting: null,   // 上次汇报/见面时间 {week, month, year}
      meetingCount: 0,     // 本年度见面次数
      keyConcerns: ['economicGrowth', 'stability'], // 当前关注重点
      pendingRequests: [], // 他交办给你但还没做完的事
      evaluation: {        // 他对你的评价（隐藏，不直接显示）
        overall: 55,
        execution: 55,
        loyalty: 55,
        lastUpdated: null
      }
    },
    // 市长
    mayor: {
      trust: 50,
      favor: 0,
      faction: 'unknown',
      style: 'technocratic',
      lastMeeting: null,
      meetingCount: 0,
      keyConcerns: ['fiscalHealth', 'projectProgress'],
      pendingRequests: [],
      evaluation: { overall: 50, execution: 50, loyalty: 50, lastUpdated: null }
    },
    // 市委组织部
    organizationDept: {
      impression: 50,       // 印象分 0-100
      vigilance: 20,        // 警惕度 0-100（调人太多、跑官要官会上升）
      lastEvaluation: null, // 上次考察评价
      evaluationDue: null,  // 下次考察时间
      contactFrequency: 0   // 近期联系频次（太低说明不重视干部工作）
    },
    // 市纪委
    disciplineDept: {
      vigilance: 30,        // 关注度 0-100（太高意味着被盯着）
      pendingCase: null,    // 是否有关于本县的线索
      lastContact: null
    },
    // 其他市领导（统战/政法/宣传等分管领导）
    otherLeaders: {
      // 动态生成，每个有 trust/favor/relation 字段
    },
    // 市直部门好感度（财政、发改、农业、交通等——争取项目用的）
    cityDepts: {
      finance: { favor: 40, lastContact: null },
      development: { favor: 40, lastContact: null },
      agriculture: { favor: 35, lastContact: null },
      transportation: { favor: 30, lastContact: null },
      education: { favor: 35, lastContact: null }
    }
  },

  // ——— 省级层面 ———
  provinceLevel: {
    // 省直厅局（跑项目用的）
    deptFavors: {
      finance: { favor: 30, lastVisit: null, projectsSubmitted: [] },
      agriculture: { favor: 30, lastVisit: null, projectsSubmitted: [] },
      transportation: { favor: 25, lastVisit: null, projectsSubmitted: [] },
      waterResources: { favor: 25, lastVisit: null, projectsSubmitted: [] }
    },
    // 省领导知晓度（越高越容易被省领导点名——好事或坏事）
    provincialAwareness: {
      governor: { awareness: 10, impression: 50 },
      partySecretary: { awareness: 5, impression: 50 }
    }
  },

  // ——— 政治资本与账本 ———
  politicalCapital: 100,       // 0-200，执行重要行动消耗的硬通货
  favorAccount: {
    owes: [],        // 你欠别人的（人情债）
    owed: [],        // 别人欠你的
    // 每个条目：{ from, to, type, description, date, status: 'active'|'repaid'|'forgiven' }
  },

  // ——— 靠山体系 ———
  patronChain: {
    patron: null,            // 你的靠山（市委书记？省领导？）
    patronStrength: 0,       // 靠山势力 0-100
    patronLoyalty: 0,        // 你对靠山的忠诚度 0-100（越高靠山越愿意保你）
    rivals: [],              // 你的政敌（上级关系网中的对手）
    allies: []               // 同盟（同级或下级县委书记等）
  },

  // ——— 系统状态 ———
  stats: {
    totalVisits: 0,           // 跑上级总次数
    totalProjectsWon: 0,      // 争取到的项目数
    totalFavors: 0,           // 人情往来次数
    superiorSatisfaction: 55, // 上级综合满意度 0-100
    lastMonthlyDecay: null    // 上次衰减月份（每月衰减一次）
  }
};
```

---

### 三、游戏循环集成

#### 3.1 每周更新流程

在 `GameEngine._weeklyUpdate()` 中，在 `= 上级信任恢复` 步骤之后插入：

```javascript
// 在 GameEngine._weeklyUpdate() 中新增

// ===== 上级关系系统每周更新 =====
const superiorSys = this.getSystem('superiorRelations');
if (superiorSys) {
  superiorSys.weeklyUpdate();
}
```

**SuperiorRelationshipSystem.weeklyUpdate()** 具体步骤：

```
步骤1: 上级信任自然衰减
  → 每4周（每月）检查一次
  → 如果距上次见面超过4周 → 书记信任 -1
  → 如果距上次见面超过8周 → 书记信任 -2（额外衰减）
  → 如果距上次见面超过12周 → 书记信任 -3 + "被遗忘"事件触发
  → 市长同理，衰减速度为书记的60%

步骤2: 市委书记派系偏好计算
  → 如果书记是'A派'，而你提拔了大量'A派'干部 → 信任每周+0.3
  → 如果你提拔了大量'B派'干部 → 信任每周-0.5
  → 派系偏好权重取决于书记的style：
    - 'political'型：派系权重 0.8（非常看重站队）
    - 'pragmatic'型：派系权重 0.3（更看重实绩）

步骤3: 市长-书记关系联动
  → 市长和市委书记关系好 ↔ 你和市长关系的变化速度加倍
  → 市长和书记关系差 ↔ 你夹在中间，两边关系都难维持

步骤4: 政绩→上级评价传导
  → 经济增速 > 8%时每季：上级信任 +1
  → 稳定出问题（越级访/群体事件）时：上级信任 -3~-8
  → 党建/意识形态被上级表扬：上级信任 +2

步骤5: 政治资本恢复
  → 基础恢复：+1/周（全靠时间）
  → 上级信任 > 70：额外 +0.5/周（上级对你放心，给你更大空间）
  → 有靠山且靠山在位：额外 +0.3/周

步骤6: 运行状态检查
  → @running: 自动触发的事件（上级来文/通知/约谈等）
  → 基于概率和当前数据，判断是否触发"上级动态"事件

步骤7: 同步到 stateManager
  → 更新 stateManager.get('superiorRelations')
  → 如果市级信任后30，触发EVENTS.UI_NOTIFICATION警告
```

#### 3.2 月度更新集成

在 `GameEngine._monthlyUpdate()` 中，在乡镇数据同步后加入：

```javascript
// 上级关系月度结算
if (superiorSys) superiorSys.monthlyUpdate();
```

**SuperiorRelationshipSystem.monthlyUpdate()**：
```
1. 统计本月跑上级次数 → 低于1次触发"缺乏沟通"隐忧
2. 检查上级所有交办事项的完成情况 → 逾期扣信任
3. 综合政绩评分 → 生成月度上级满意度快照
4. 随机触发省厅级事件（项目审批结果/专项检查通知等）
```

#### 3.3 年度考核集成

在 `EvaluationSystem` 的年度考核中新增：

```javascript
// 上级关系综合评分（占考核权重外——作为"软指标"影响晋升）
const superiorScore = superiorSys.getAnnualSuperiorScore();
// 上级满意度 → 影响玩家能否"优秀"、"合格"的定性
// 如果上级满意度 < 40：即使政绩高也最多"合格"
// 如果上级满意度 > 80：政绩"良好"可提升为"优秀"
```

---

### 四、玩家操作界面

#### 4.1 主视图 - 上级关系总览

```
┌──────────────────────────────────────────────────┐
│ ☰ 上级关系                             2026年6月 │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📊 上级综合满意度 58/100    政治资本 100/200      │
│ ┌──────────────────────────────┐                 │
│ │    ████████████░░░░░░ 58     │                 │
│ └──────────────────────────────┘                 │
│                                                  │
│ ┌─────── 市级领导 ──────────────────────────┐    │
│ │ 市委书记   信任 ████████████░ 62  【汇报】【邀约】│    │
│ │    市长    信任 ██████████░░ 48               │    │
│ │    组织部   印象 █████████░░░ 45               │    │
│ │    市纪委   关注 ████░░░░░░░░ 22 ✅ 正常       │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ┌─────── 省厅关系 ──────────────────────────┐    │
│ │ 省财政厅：40/100  ● 在建项目：1个         │    │
│ │ 省农业厅：35/100  ○ 可申报：高标准农田     │    │
│ │ 省交通厅：30/100  ○ 已申报：G107国道扩建   │    │
│ │ [去省厅跑项目]                              │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ┌─────── 政治账本 ──────────────────────────┐    │
│ │ 你欠别人：2笔（市委书记1笔，市长1笔）      │    │
│ │ 别人欠你：1笔（发改委张主任）              │    │
│ │ [查看详情]                                 │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ⏰ 距上次见市委书记：3周（建议每月至少1次）       │
│ 📋 市委书记交办事项：2件进行中，1件逾期 ⚠️       │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### 4.2 操作面板 - 可执行动作

每次玩家点击操作，消耗精力值（10-25不等）和可能的资金/政治资本。

```
可执行动作清单（基于当前周可用）：

┌─ 向上汇报 ──────────────────────────────────┐
│ [📋 去市委汇报工作]    精力-15  信任+2~+5    │
│  （常规操作，可选汇报主题：经济发展/党建/信访）  │
│                                              │
│ [🏛️ 跑省进厅]          精力-20  差旅费40万   │
│  选目标厅局：□财政厅 □农业厅 □交通厅         │
│  目的：□争取资金 □争取项目 □联络感情         │
│                                              │
│ [🤝 邀请领导调研]      精力-10  接待费80万   │
│  选领导：□市委书记 □市长 □分管市领导         │
│  选看点：□工业园区 □乡村振兴示范点 □信访中心  │
│  ⚠️ 可能发现问题的风险 +15%                   │
│                                              │
│ [📞 电话沟通]          精力-5  效果减半       │
│  （本周已出过门时可用，维护关系不掉队）         │
└──────────────────────────────────────────────┘
┌─ 政治操作 ──────────────────────────────────┐
│ [📜 完成交办事项]      精力-10  信任+3       │
│  选一项市委书记交办的工作，汇报完成情况         │
│                                              │
│ [🤝 还人情]            政治资本-5             │
│  选一笔人情债：________________              │
│                                              │
│ [⚖️ 站队表态]          政治资本±20           │
│  在上级派系争端中选边（高风险高回报）           │
└──────────────────────────────────────────────┘
```

#### 4.3 政治账本视图

```
政治账本
┌──────────────────────────────────────────────┐
│ 📝 你欠别人（2笔）                            │
│                                              │
│  ① 市委书记 · 2026年3月                      │
│     事由：帮你把信访积案压了下来               │
│     状态：⏳ 尚未归还（建议3个月内）           │
│     影响：超期未还 → 信任每月-2               │
│                                              │
│  ② 常务副市长 · 2026年4月                    │
│     事由：项目审批时帮你说了话                 │
│     状态：⏳ 尚未归还                         │
│                                              │
│ 📝 别人欠你（1笔）                            │
│                                              │
│  ① 县发改委张主任                             │
│     事由：帮他儿子安排了工作                   │
│     状态：⏳ 未使用                           │
│     提示：适当时候可以"支取"                    │
└──────────────────────────────────────────────┘

政治账本规则：
- 人情债超过6个月不还 → 对方主动"讨债"（提出要求）
- 讨债不还 → 关系破裂，信任-20
- 还人情方式：投票支持/提拔亲信/审批项目/财政支持
```

---

### 五、事件库 (自动触发)

以下事件由系统在每周更新时按概率触发，是玩家的"被动输入"：

#### 5.1 上级主动联系事件（~15%概率/周）

| 事件 | 触发条件 | 内容 | 玩家选择 | 效果 |
|------|---------|------|---------|------|
| **市委书记来电** | 随机，月概率×1 | 询问某项工作进展（视书记关注点而定） | 汇报/敷衍/求指导 | 信任 ±2~3 |
| **市委办通知开会** | 季度内1-2次 | 全市县委书记座谈会/经济分析会 | 参加/请假 | 参加→信任+1, 精力-8 |
| **组织部考察预告** | 任职满2年后概率上升 | 省委组织部近期将进行干部考察 | 准备/不准备 | 准备效果×1.5 |
| **上级督查通知** | 随机 | 某项工作将被专项督查 | 自查/突击/不准备 | 发现问题的概率取决于准备度 |
| **省厅项目批复** | 之前跑过省厅后2-4周 | 项目获批/驳回/需补充材料 | 接受条件/继续争取 | 获批→资金+政绩 |
| **市领导调研意向** | 季度1次 | 某位市领导想到县里看看 | 同意/婉拒/改期 | 见"邀请领导调研" |
| **纪委函询** | 有举报线索时 | 要求就某项问题口头说明 | 解释/糊弄/找关系 | 关注度上升/下降 |

#### 5.2 上级风向事件（~5%概率/周）

| 事件 | 影响 |
|------|------|
| **市领导班子调整传闻** | 派系格局变动前兆，部分关系重新洗牌 |
| **省委巡视工作部署** | 巡视前12-24周信号，提前准备窗口期 |
| **市委书记被省纪委约谈** | 靠山动摇，连带风险上升 |
| **上级考核指标调整** | 考核权重变化，现行策略效果改变 |
| **邻县县委书记被免职** | 政治地震，各级关系紧张度+20% |

---

### 六、平衡参数表

```javascript
// ===== 上级关系系统 - 平衡参数 =====
const SUPERIOR_BALANCE = {
  // ——— 衰减 ———
  trustDecayPerWeek: 0.3,         // 基础衰减/周（约1.2/月）
  trustDecayNoMeetingPenalty: 1,  // 超过1个月没见面的额外衰减
  trustDecayLongAbsence: 2,       // 超过2个月没见的额外衰减
  favorDecayPerMonth: 2,          // 人情债自然淡化
  
  // ——— 收益 ———
  reportTrustGain: [2, 5],        // 汇报工作获信任量（范围）
  projectFavorGain: [3, 8],       // 争取到项目的好感度
  meetingTrustGain: [2, 4],       // 领导调研后的信任变化
  
  // ——— 精力消耗 ———
  reportEnergyCost: 15,
  provinceTripEnergyCost: 20,
  inviteInspectionEnergyCost: 10,
  phoneCallEnergyCost: 5,
  
  // ——— 资金消耗 ———
  provinceTripCost: 40,           // 万元（差旅+人情）
  inspectionReceptionCost: 80,    // 万元（接待）
  
  // ——— 政治资本 ———
  pcBaseRecovery: 1,             // /周
  pcHighTrustBonus: 0.5,         // 信任>70时额外恢复
  pcPatronBonus: 0.3,            // 有靠山且有在位
  
  // ——— 事件概率 ———
  superiorContactChance: 0.15,   // 上级主动联系概率/周
  politicalWindChance: 0.05,     // 政治风向事件概率/周
  projectResultDelay: [2, 4],    // 项目审批周数
  
  // ——— 阈值 ———
  trustAlertLow: 30,             // 低于此值触发警告
  trustCriticalLow: 15,          // 低于此值触发危机
  trustExcellent: 75,            // 高于此值触发表扬
  monthlyMeetingMin: 1,          // 建议每月最低见面次数
  
  // ——— 考核影响 ———
  superiorScoreWeight: 0.15,     // 上级满意度影响晋升权重
  annualDecayRate: 0.7           // 年度重置时保留比例
};
```

---

### 七、与现有系统的集成点

| 现有系统 | 集成方式 |
|---------|---------|
| **Player.relations** | 扩展已有 citySecretary/cityMayor 字段，新增其他市级领导、省厅关系 |
| **Player.politicalCapital** | 复用已有资源，上级关系系统中的操作消耗/产生政治资本 |
| **county.superiorTrust** | 扩展为完整上级关系数据树，现有的一维字段作为快捷引用 |
| **FactionRelationshipSystem** | 上级也有派系归属，跑关系时可能卷入上级派系斗争 |
| **EventSystem** | 上级事件通过 EventBus 触发，复用现有事件UI展示 |
| **FinanceSystem** | 跑上级需要差旅费/接待费，从财政支出 |
| **EvaluationSystem** | 上级满意度影响年度考核结果定档 |
| **TaskSystem** | 上级交办任务作为"特殊任务"出现在任务列表中 |
| **NarrativeSystem** | 重大上级事件（靠山倒台/晋升/处分）触发剧情线 |

---

## 第二篇：信访维稳系统 (PetitionSystem)

---

### 一、设计核心理念

**一句话宗旨**：信访是"送上门来的群众工作"——处理得好是政绩，处理不好是炸弹。

**和现有社会系统的分工**：
- 现有 SocialSystem：管理宏观的**群体情绪**（怨气/动员度/集体行动）
- 新增 PetitionSystem：管理微观的**个案化解**（具体的人、具体的诉求、具体的化解过程）

**两者的关系**：
```
SocialSystem (宏观)
  └─ 群体怨气↑ → 信访案件生成率↑
      └─ PetitionSystem (微观)
           ├─ 合理诉求→化解→怨气↓→反馈SocialSystem
           ├─ 无理诉求→依法处理→可能激化→越级访
           └─ 化解不力→越级访→上级信任↓→SocialSystem联动
```

**玩家在系统中的决策循环**：
```
每周信访工作台 →
  查看新增案件（2-5件/周，数量取决于社会张力）
     ↓
  选择案件处理：
    A) 亲笔批示包案（消耗政治资本）→ 化解概率+30%
    B) 接访（消耗精力）→ 化解概率+15%，可能了解深层问题
    C) 转交分管领导 → 按该领导能力计算化解概率
    D) 搁置 → 案件恶化概率+10%/周
     ↓
  结果：
    ✓ 化解 → 信访压力↓，群众满意度↑，政绩+
    ✗ 越级 → 信访压力↑，上级信任↓，一票否决风险↑
```

---

### 二、完整数据模型

```javascript
// ===== 信访案件模型 =====
class PetitionCase {
  constructor(data = {}) {
    this.id = data.id || 'petition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.type = data.type || 'individual';    // 'individual'|'collective'|'crossLevel'
    this.category = data.category || 'other';  // 见下方分类枚举
    
    // ——— 信访人信息 ———
    this.petitioner = {
      name: data.petitioner?.name || '群众',
      group: data.petitioner?.group || 'farmer',  // 对应社会群体类型
      age: data.petitioner?.age || 45,
      isRepeat: data.petitioner?.isRepeat ?? false, // 是否老户
      repeatYears: data.petitioner?.repeatYears || 0 // 上访年数（老户专用）
    };
    
    // ——— 诉求 ———
    this.demand = data.demand || '';
    this.description = data.description || '';
    this.legalMerit = data.legalMerit ?? 50;     // 诉求合理性 0-100
    this.urgency = data.urgency ?? 50;             // 紧急程度 0-100
    this.amount = data.amount || 0;                // 涉及金额（万元）
    
    // ——— 状态 ———
    this.status = data.status || 'pending';        // 'pending'|'processing'|'resolved'|'escalated'|'archived'
    this.currentLevel = data.currentLevel || 'county'; // 'county'|'city'|'province'|'central'
    this.escalationRisk = data.escalationRisk ?? 0;    // 越级风险 0-100
    this.weeksOnFile = data.weeksOnFile || 0;         // 已存续周数
    
    // ——— 处理记录 ———
    this.assignedTo = data.assignedTo || null;     // 包案领导ID
    this.processHistory = data.processHistory || []; // [{ week, action, by, result }]
    this.lastActionWeek = data.lastActionWeek || null;
    
    // ——— 化解参数 ———
    this.difficulty = data.difficulty ?? 50;       // 化解难度 0-100（越高越难）
    this.resolveProgress = data.resolveProgress || 0; // 化解进度 0-100
    this.stubborness = data.stubborness ?? 30;     // 信访人固执度 0-100
    this.trustInGov = data.trustInGov ?? 40;       // 对政府信任度 0-100
    
    // ——— 结果 ———
    this.isResolved = data.isResolved ?? false;
    this.satisfaction = {                          // 满意度
      petitioner: data.satisfaction?.petitioner ?? 0,
      superior: data.satisfaction?.superior ?? 0
    };
    this.oneVoteVeto = data.oneVoteVeto ?? false;   // 是否触发一票否决
    this.resolvedDate = data.resolvedDate || null;
    
    // ——— 标签 ———
    this.tags = data.tags || [];
    this.importance = data.importance ?? 1;         // 1-3星
    this.isSupervision = data.isSupervision ?? false; // 上级督办件
  }
}

// ===== 信访案件分类枚举 =====
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

// ===== 信访系统整体状态 (stateManager.get('petition')) =====
const PETITION_SYSTEM_DEFAULT = {
  // ——— 案件管理 ———
  cases: [],                         // 所有活跃案件 PetitionCase[]
  archivedCases: [],                 // 已结案归档
  totalCaseCount: 0,                 // 历史累计案件数
  
  // ——— 统计指标 ———
  stats: {
    monthlyIncoming: 0,             // 本月新收件数
    monthlyResolved: 0,             // 本月化解数
    resolvedRate: 0,                // 化解率
    crossLevelRate: 0,              // 越级访率
    averageResolveWeeks: 0,         // 平均化解周期
    petitionPressure: 30,           // 综合信访压力 0-100
    // 压力公式 = 案件总量权重 + 越级率权重 + 集体访权重 + 老户权重
  },
  
  // ——— 资源 ———
  petitionOfficers: 20,             // 信访干部人数
  specialFunds: 200,                // 信访救助专项资金（万元）
  
  // ——— 一票否决 ———
  oneVoteVeto: {
    crossLevelToCentral: 0,         // 进京访次数
    crossLevelToProvince: 0,        // 赴省访次数
    massIncidentTriggered: false,   // 是否引发群体事件
    threshold: {                    // 一票否决阈值
      centralVisit: 3,             // 进京访3次触发警告
      provinceVisit: 8,            // 赴省访8次触发警告
      massIncident: 1              // 群体事件1次触发
    },
    warningIssued: false,           // 是否已发预警
    isTriggered: false              // 是否已触发一票否决
  },
  
  // ——— 敏感期 ———
  sensitivePeriod: {
    active: false,                  // 是否处于敏感期
    type: null,                     // 'twoSessions'|'nationalDay'|'election'|'other'
    name: '',
    endWeek: null,
    multiplier: 1.5                 // 敏感期权重
  },
  
  // ——— 包案制度 ———
  caseResponsibility: {
    leaderCases: {},                // { leaderId: [caseIds] }
    coverage: 0                     // 包案覆盖率
  }
};
```

---

### 三、游戏循环集成

#### 3.1 每周更新流程

在 `GameEngine._weeklyUpdate()` 中，在 SocialSystem 更新之后、派系更新之前插入：

```javascript
// ===== 信访系统每周更新 =====
const petitionSys = this.getSystem('petition');
if (petitionSys) {
  petitionSys.weeklyUpdate();
}
```

**PetitionSystem.weeklyUpdate()** 具体步骤：

```
步骤1: 生成新案件（基于社会张力）
  → 基础生成率 = 社会张力 × 0.08（张力50时约4件/周）
  → 类别分布：按 PETITION_CATEGORIES 权重随机
  → 个别案件类型为"上级交办"（约10%概率）
    └─ 这部分直接进入"督办"状态，逾期处理扣上级信任
  → 老户续访（已有案件中5-10%本周继续上访，案件不新生成但累积）

步骤2: 案件老化处理
  → 所有未结案案件 weeksOnFile + 1
  → 2周无行动 → escalationRisk + 5
  → 4周无行动 → escalationRisk + 10，且可能触发自动越级
  → 6周无行动 → 高风险案件自动越级（跨过县级到市级）

步骤3: 越级风险判定
  → 每个案件计算：
    escalationRisk >= 60 && 随机 < 0.15 → 越级到市
    escalationRisk >= 80 && 随机 < 0.25 → 越级到省
    长期老户（repeatYears > 3）→ 额外 +0.1 越级概率/周
  
  → 越级后果：
    市级上访 → 上级信任 -1，信访压力 +3
    省级上访 → 上级信任 -3，信访压力 +6
    进京上访 → 上级信任 -8，信访压力 +12，一票否决计数 +1

步骤4: 化解进度更新
  → 当前有包案领导/正在处理的案件，按领导能力推进化解：
    progress += 领导化解能力 × 0.03 + 信访干部效率 × 0.01
  → 每季度末，自动化解一部分积案（效率约10-15%）

步骤5: 信访压力综合计算
  petitionPressure = 
    (activeCases.length / 20 * 30)          // 案件数量维度
    + (crossLevelRate * 60)                  // 越级率维度（权重高）
    + (collectiveCaseRatio * 20)             // 集体访维度
    + (repeatPetitionerRatio * 15)           // 老户维度
    + (sensitivePeriod.active ? 15 : 0)      // 敏感期加成
  结果 clamp 到 [0, 100]

步骤6: 一票否决检测
  → 进京访 >= 阈值 或 赴省访 >= 阈值 → 发出警告
  → 警告后3个月内未改善 → 触发一票否决
  → 一票否决效果：年度考核直接"不合格"，晋升概率下降80%

步骤7: 敏感期管理
  → 每年3月（两会），10月（国庆），换届年全年压力×1.5
  → 敏感期系统自动降低越级阈值，增加维稳消耗
```

#### 3.2 月度更新

```javascript
// 信访月度结算
petitionSys.monthlyUpdate();
```

**PetitionSystem.monthlyUpdate()**：
```
1. 统计月度报表（收件/化解/越级/投入资金）
2. 向EVENTS.SOCIAL_TENSION反馈（信访压力→社会张力互传）
3. 特殊救助资金月度分配
4. 产生月度信访简报（UI展示用）
```

---

### 四、玩家操作界面

#### 4.1 主视图 - 信访工作台

```
┌──────────────────────────────────────────────────┐
│ ☰ 信访维稳                           2026年6月 W2 │
├──────────────────────────────────────────────────┤
│ 🔴 信访压力 52/100  ● 本月新收32件  ● 化解率58%    │
│ ⚠️ 距全国两会还有12天（敏感期 ×1.5）               │
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌─── 待办案件（按紧急度排序）─── 共12件 ──────┐   │
│ │                                              │   │
│ │ ⭐⭐⭐ [集体访] 农机厂职工48人 ⚠️ 已升级至市  │   │
│ │  劳动补偿纠纷 逾期7天 包案：常务副县长        │   │
│ │  [批示] [接访] [协调] [上报]                  │   │
│ │                                              │   │
│ │ ⭐⭐⭐ [督办] 市委督办件：环保关停企业补偿 ⏰  │   │
│ │  上级限期5日内回复 · 已过3天                  │   │
│ │  [阅处] [拟办意见] [上报]                     │   │
│ │                                              │   │
│ │ ⭐⭐ [老户] 李xx 土地纠纷 已上访4年           │   │
│ │  历届三任书记未化解 进京3次 ⚠️               │   │
│ │  [批示包案] [接访] [制定方案] [稳控]           │   │
│ │                                              │   │
│ │ ⭐ [个访] 张村灌溉用水纠纷 新件                │   │
│ │  转农业农村局处理中                           │   │
│ │  [阅处] [批示] [转办]                         │   │
│ │                                              │   │
│ │ 📄 还有8件... [查看更多]                      │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──── 信访资源 ───────────────────────────┐       │
│ │ 信访干部：20人  ● 救助资金：200万可用       │       │
│ │ 包案领导覆盖：8/12件                      │       │
│ └──────────────────────────────────────────┘       │
│                                                    │
│ 📊 信访形势分析                                     │
│ ┌──────────────────────────────┐                   │
│ │  ┃                          ┃  │ 月度趋势         │
│ │  ┃     ╱╲                   ┃  │ ─── 新收         │
│ │  ┃    ╱  ╲    ╱╲            ┃  │ ─── 化解         │
│ │  ┃   ╱    ╲  ╱  ╲  ╱╲      ┃  │ ─── 越级         │
│ │  ┃  ╱      ╲╱    ╲╱  ╲     ┃  │                 │
│ │  └──────────────────────────┘  │                 │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ 热点类型：征地拆迁(32%) 劳动社保(25%) 环保(15%)     │
│                                                    │
└──────────────────────────────────────────────────┘
```

#### 4.2 接访操作弹窗

当玩家选择"接访"时，弹出接访界面：

```
┌─────────── 接待信访群众 ───────────────────┐
│                                            │
│ 👤 来访人：王建国（农机厂下岗职工，48岁）    │
│ 📋 诉求：要求解决下岗安置补偿金（约8万元/人）│
│ 🔍 合理性评估：诉求合理 70%                 │
│                                              │
│ ──── 接访选项 ────                          │
│                                            │
│ [🤝 耐心倾听，现场交办] 精力-15 政资-3     │
│   效果：化解进度+25，群众信任+10             │
│                                            │
│ [📋 记录诉求，批转处理] 精力-8              │
│   效果：按包案领导能力化解，常规流程          │
│                                            │
│ [💬 政策解释，劝其息访] 精力-10             │
│   效果：缓解50%，但老户可能不接受            │
│                                            │
│ [🚫 依法告知，引导司法途径] 精力-5          │
│   效果：合理诉求案可能激化，无理案效果好      │
│                                            │
│ ──── 包案领导 ────                         │
│ 当前包案：常务副县长（化解能力65）            │
│ [换人] 可选：副县长A(55) 副县长B(70)        │
│                                            │
│ [确认处理] [暂缓]                           │
└────────────────────────────────────────────┘
```

#### 4.3 信访简报（月度弹出）

```
📋 6月信访工作简报
┌──────────────────────────────────────────┐
│ 本月信访情况                             │
│  新收案件：32件（环比+5%）               │
│  化解：18件（化解率56%）                  │
│  越级：3件（其中省级2件，进京1件）⚠️       │
│                                         │
│ 本月投入：                              │
│  救助资金：48万元                        │
│  领导接访：4次（书记亲自接访2次）          │
│                                         │
│ 重点隐患：                              │
│  ① 农机厂职工集体访（48人，已到市）🎯    │
│  ② 东河村土地纠纷老户（进京3次）         │
│                                         │
│ 上级评价：                              │
│  市信访局：化解力度尚可，越级率偏高        │
└──────────────────────────────────────────┘
```

---

### 五、信访案件生成引擎

#### 5.1 案件生成公式

```javascript
generateNewCase(socialTension, groups, month) {
  // 1. 基础数量
  const baseCount = Math.floor(socialTension * 0.08);  // 张力50→4件/周
  // 张力0→0件, 张力100→8件
  
  // 2. 群体修正（特定群体怨气高时增加对应类型案件）
  const groupBonus = this._calcGroupBonus(groups);
  // 农民怨气>50→土地纠纷+20%, 工人怨气>50→劳动纠纷+15%
  
  // 3. 季节修正
  const seasonBonus = this._calcSeasonBonus(month);
  // 3-5月春耕→土地纠纷+15%, 6-8月汛期→水利纠纷+20%
  
  // 4. 敏感期修正
  const sensitivityMultiplier = this.sensitivePeriod.active ? 1.5 : 1.0;
  
  const totalCount = Math.round((baseCount + groupBonus) * sensitivityMultiplier);
  return Math.min(totalCount, 12); // 每周上限12件
}
```

#### 5.2 案件难度生成

```javascript
calcCaseDifficulty(category, socialTension, repeatYears) {
  const base = PETITION_CATEGORIES[category].baseDifficulty;
  const tensionFactor = (socialTension - 50) * 0.2;  // 张力高→更难
  const repeatFactor = repeatYears * 5;               // 老户每年+5难度
  const randomFactor = (Math.random() - 0.5) * 20;     // ±10随机波动
  
  return calculator.clamp(base + tensionFactor + repeatFactor + randomFactor, 10, 95);
}
```

#### 5.3 化解概率计算

```javascript
calcResolveChance(case, playerAbilities, assignedOfficial) {
  // 基础化解概率
  let baseChance = 0.3;
  
  // 领导能力加成（包案领导或被批示的领导）
  if (assignedOfficial) {
    const officialAbility = assignedOfficial.abilities?.stability || 50;
    baseChance += (officialAbility - 50) * 0.005; // 50→0%, 80→+15%, 30→-10%
  }
  
  // 书记亲自批示加成
  if (case.processHistory.some(h => h.action === '批示' && h.by === 'player')) {
    baseChance += 0.15;
  }
  
  // 书记亲自接访加成
  if (case.processHistory.some(h => h.action === '接访' && h.by === 'player')) {
    baseChance += 0.10;
  }
  
  // 难度扣减
  baseChance -= (case.difficulty - 50) * 0.004; // 50→0%, 80→-12%, 30→+8%
  
  // 资源投入加成
  if (case.specialFunds > 0) {
    baseChance += Math.min(case.specialFunds / 100, 0.2); // 每100万+20%封顶
  }
  
  // 老户罚减
  if (case.petitioner.isRepeat) {
    baseChance -= case.petitioner.repeatYears * 0.04; // 每年-4%
  }
  
  return calculator.clamp(baseChance, 0.05, 0.90);
}
```

---

### 六、事件库

#### 6.1 信访专项事件

| 事件 | 触发条件 | 内容 | 玩家选择 | 效果 |
|------|---------|------|---------|------|
| **集体访预警** | 某群体动员度>40 | 某群体可能组织集体上访 | 提前介入/部署稳控/不作为 | 防止/减轻/放任 |
| **进京访通报** | 一票否决计数+1 | 市信访局通知：你县有人进京上访 | 派人接回/协调化解/冷处理 | 按选择不同结果 |
| **上级交办信访件** | 随机，每月1-2件 | 市信访局转来督办件 | 立即办理/按流程/申请延期 | 按时办结→印象+, 延期→印象- |
| **信访老户极端行为** | 老户+超6周未化解 | 信访人在政府门口拉横幅/自残威胁 | 现场处置/谈判/依法处理 | 控制/激化/舆情 |
| **信访积案攻坚月** | 每年9月 | 市里要求集中化解一批积案 | 投入资源/选择性化解/应付 | 化解率达标→上级表扬 |
| **信访人进京被抓回** | 进京访触发后 | 信访人被劝返/拘留 | 教育疏导/帮扶/依法处理 | 影响后续上访意愿 |
| **信访资金审计** | 年度 | 审计局审查信访救助资金使用 | 规范/补手续/搪塞 | 发现/未发现问题 |

#### 6.2 案件类别的差异化处理效果

不同类别案件对"同一操作"的反应不同：

| 操作 \ 类别 | 征地拆迁 | 劳动社保 | 环境污染 | 干部作风 | 涉法涉诉 |
|------------|---------|---------|---------|---------|---------|
| 资金救助 | 化解+25% | 化解+20% | 化解+5% | 化解+0% ❌ | 化解+0% ❌ |
| 政策解释 | 化解+10% | 化解+10% | 化解+15% | 化解+5% | 化解+20% |
| 行政协调 | 化解+20% | 化解+15% | 化解+30% ✅ | 化解+10% | 化解+0% ❌ |
| 依法处置 | 化解+5% | 化解+5% | 化解+10% | 化解+30% ✅ | 化解+40% ✅ |
| 领导接访 | 化解+15% | 化解+15% | 化解+10% | 化解+20% | 化解+5% |

> 设计意图：强迫玩家针对不同案件类型采取不同策略，避免"一招鲜"。

---

### 七、一票否决机制

#### 7.1 触发条件

```
年度累计触发任意一条即启动一票否决流程：

条件A: 进京访 ≥ 3次                      → 直接触发
条件B: 赴省访 ≥ 8次                      → 直接触发
条件C: 进京访 ≥ 2次 + 赴省访 ≥ 5次        → 叠加触发
条件D: 信访引发群体事件                   → 直接触发
条件E: 中央信访联席办通报批评 ≥ 2次        → 直接触发
```

#### 7.2 一票否决效果

```
一票否决触发后：
1. 年度考核结果强制降为"不合格"
2. 当年所有政绩打折50%
3. 晋升通道关闭（至少18个月不能提拔）
4. 市委书记信任 -30
5. 省委组织部印象 -20
6. 玩家进入"戴帽"状态——之后每次上级会议被点名

但如果玩家在任期内（触发后）成功将信访形势扭转：
→ 可在下一考核周期解除"戴帽"
→ 但一票否决记录仍然保留在档案中
```

#### 7.3 防御措施（玩家可选）

```
在触发一票否决前，玩家可以选择以下行动来降低风险：

[🔥 紧急维稳]   消耗维稳资金200万 + 政治资本20
   效果：本月越级概率-50%，接回所有在外信访人
   风险：可能被审计，且治标不治本

[📋 百日攻坚]   消耗精力40（每周-10，连续4周）
   效果：全部未结案案件化解概率+15%
   风险：其他工作可能被耽误

[🤝 请上级协调]   消耗人情债（"欠"市委书记一个人情）
   效果：本次进京访记录不计入一票否决计数
   代价：政治债务增加

[📝 书面检查]   消耗政治资本30
   效果：向上级提交深刻检查，暂缓一票否决判定
   代价：政治资本大幅下降，被认为能力不足
```

---

### 八、平衡参数表

```javascript
// ===== 信访系统 - 平衡参数 =====
const PETITION_BALANCE = {
  // ——— 案件生成 ———
  baseGenRate: 0.08,           // 社会张力→案件周生成率系数
  maxWeeklyCases: 12,          // 每周最多生成案件数
  supervisorCaseChance: 0.10,  // 上级交办件比例
  
  // ——— 老化 ———
  weeksBeforeEscalationRisk: 2,  // 2周无行动开始累积越级风险
  escalationBaseRisk: 5,         // 每周无行动增加的越级风险
  escalateToCityThreshold: 60,   // 越级风险≥60可能越级到市
  escalateToProvThreshold: 80,   // ≥80可能越级到省
  
  // ——— 越级概率 ———
  escalateToCityChance: 0.15,    // 每周越级判定概率
  escalateToProvChance: 0.25,
  escalateToCentralChance: 0.10, // 省级→进京额外判定
  
  // ——— 信任影响 ———
  cityVisitTrustPenalty: 1,      // 越级到市扣上级信任
  provinceVisitTrustPenalty: 3,
  centralVisitTrustPenalty: 8,
  
  // ——— 化解 ———
  baseResolveChance: 0.30,       // 基础化解概率
  playerDirectiveBonus: 0.15,    // 书记批示加成
  playerInterviewBonus: 0.10,    // 书记接访加成
  fundResolveBonus: 0.20,        // 救助资金最大加成
  repeatYearPenalty: 0.04,       // 每上访一年扣化解概率
  
  // ——— 精力消耗 ———
  interviewEnergyCost: 15,
  directiveEnergyCost: 3,
  reviewEnergyCost: 8,
  
  // ——— 一票否决 ———
  vetoCentralVisitThreshold: 3,
  vetoProvinceVisitThreshold: 8,
  vetoWarningWeeks: 12,          // 警告后12周观察期
  
  // ——— 信访压力 ———
  caseCountWeight: 30,
  crossLevelWeight: 60,
  collectiveWeight: 20,
  repeatWeight: 15,
  sensitiveBonus: 15,
  
  // ——— 年度结转 ———
  annualCarryOverRate: 0.7,      // 未结案70%进入下一年
  annualArchivedRate: 0.1,       // 10%的积案自然消化
};
```

---

### 九、与现有系统的集成点

| 现有系统 | 集成方式 |
|---------|---------|
| **SocialSystem** | 核心输入源：群体怨气→案件生成；案件化解→怨气反馈 |
| **county.socialTension** | 信访压力>60时持续增加社会张力(约+0.5/周) |
| **Player.abilities.stability** | 影响化解概率计算、接访效果 |
| **Player.relations.citySecretary** | 越级访扣减上级信任 |
| **EvaluationSystem** | 信访权重占稳定KPI的40%；一票否决覆盖考核 |
| **FinanceSystem** | 救助资金从财政支出(列支"信访救助")；维稳经费用途 |
| **PersonnelSystem** | 包案领导制：指派干部包案，按能力计算化解效率 |
| **EventSystem** | 重大信访事件通过EventBus触发、UI显示 |
| **FactionRelationshipSystem** | 派系可能利用信访案攻击对手；包案效果与派系忠诚度挂钩 |
| **IntelSystem** | 信访线索可转化为情报(群体动向、干部作风问题) |
| **NarrativeSystem** | 重大信访案(老户/集体访/进京访)可触发剧情线 |

---

## 附录：Phase 1 实施路线图

### 第1周：上级关系系统

| 天 | 任务 | 产出 |
|---|------|------|
| Day 1 | 数据结构 + 默认值 | `js/models/SuperiorRelations.js` |
| Day 2 | 核心逻辑：衰减、收益、事件触发 | `js/systems/SuperiorRelationshipSystem.js` (init + weeklyUpdate) |
| Day 3 | 玩家操作逻辑：汇报/跑省/调研/还人情 | `js/systems/SuperiorRelationshipSystem.js` (actions) |
| Day 4 | 事件库 + 政治账本 | 40+事件模板，数据更新 |
| Day 5 | UI + 集成到GameEngine | 上级关系视图、接入每周循环 |

### 第2周：信访维稳系统

| 天 | 任务 | 产出 |
|---|------|------|
| Day 1 | 数据结构 + PetitionCase类 | `js/models/PetitionCase.js` + 默认状态 |
| Day 2 | 案件生成引擎 + 老化逻辑 | `js/systems/PetitionSystem.js` (weeklyUpdate) |
| Day 3 | 化解逻辑 + 包案制度 + 一票否决 | `js/systems/PetitionSystem.js` (resolve/veto) |
| Day 4 | 事件库 + 敏感期管理 | 30+事件模板，敏感期逻辑 |
| Day 5 | UI + 集成到GameEngine + Social联动 | 信访工作台视图、接入每周循环 |
