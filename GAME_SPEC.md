# 《县治》（Xianzhi）— 完整游戏描述

> 最后更新：2026-06-02 | 基于 v0.16.0 开发状态
> 用途：供其他AI理解该游戏的完整系统、功能和设定

---

## 一、游戏概述

**《县治》**是一款基于真实县城数据的中国县域治理模拟游戏。玩家扮演县委书记，在五年任期内通过人事管理、财政分配、派系博弈、经济发展等手段完成治理目标。

- **数据基础**：正定县真实财政/经济/人口数据（财政以万元为单位）
- **目标**：在任期内提升经济、维护稳定、完成上级KPI、管理派系、避免腐败调查，争取晋升或善终
- **核心循环**：每周选择关注领域 → 处理事件 → 推进一周 → 月度经济/财政结算 → 季度任务检查 → 年度考核
- **技术架构**：纯前端JS（无框架），4层分层架构 + EventBus + StateManager

---

## 二、技术架构

### 2.1 文件结构

```
index.html              # 入口，加载所有JS文件
app.js                  # 游戏启动入口
server.js               # Node.js 服务器（端口3000）
js/
├── engine/             # 引擎层（5文件）
│   ├── EventBus.js     # 全局事件总线
│   ├── StateManager.js # 全局状态管理器
│   ├── TimeSystem.js   # 时间管理系统
│   ├── Calculator.js   # 数值计算工具
│   └── GameEngine.js   # 游戏主引擎
├── models/             # 数据模型层（11文件）
│   ├── Player.js       # 县委书记
│   ├── Official.js     # 干部
│   ├── County.js       # 县域
│   ├── Finance.js      # 财政（EU4式收支树）
│   ├── Enterprise.js   # 企业
│   ├── Event.js        # 事件
│   ├── Decision.js     # 决策
│   ├── PopulationGroup.js  # 群众群体
│   ├── EconomicSector.js   # 三次产业
│   ├── TownSector.js       # 乡镇产业地块
│   └── PopulationData.js   # 人口数据
├── systems/            # 系统层（12文件）
│   ├── EventSystem.js  # 事件系统
│   ├── FinanceSystem.js  # 财政系统
│   ├── SocialSystem.js  # 社会模拟系统
│   ├── EconomicSystem.js  # 经济系统（供应链版）
│   ├── PersonnelSystem.js  # 人事系统
│   ├── FactionRelationshipSystem.js  # 派系关系系统
│   ├── IntelSystem.js  # 情报信息
│   ├── EvaluationSystem.js  # 考核评价
│   ├── PolicySystem.js  # 政策系统
│   ├── CorruptionSystem.js  # 腐败系统
│   ├── TaskSystem.js  # 任务系统（含国策+当务之急）
│   └── PopulationSystem.js  # 人口系统
├── data/               # 配置数据层（10文件）
│   ├── difficultyConfig.js   # 难度/角色配置
│   ├── eventLibrary.js       # 事件库（50+）
│   ├── gameManual.js         # 游戏百科
│   ├── coreStats.js          # 核心数值定义
│   ├── termDefinitions.js    # 术语词典
│   ├── changelog.js          # 更新历史
│   ├── traits.js             # 14种特质
│   ├── focusTree.js          # 国策树
│   ├── pressingMatters.js    # 当务之急（25模板）
│   └── voteIssues.js         # 投票议题池
└── ui/                 # UI层（3文件）
    ├── UIManager.js    # UI总管理器
    ├── ChartHelper.js  # 图表工具+历史记录器
    └── AISecretary.js  # AI秘书
```

### 2.2 加载顺序

引擎层 → 模型层 → 系统层 → 数据层 → UI层 → GameEngine → app.js

### 2.3 全局单例

| 变量 | 来源 | 用途 |
|------|------|------|
| `eventBus` | EventBus.js | 全局事件总线 |
| `EVENTS` | EventBus.js | 事件名称常量（40+） |
| `stateManager` | StateManager.js | 全局状态管理器 |
| `timeSystem` | TimeSystem.js | 时间系统 |
| `calculator` | Calculator.js | 数值计算工具 |
| `gameEngine` | GameEngine.js | 游戏主引擎 |

### 2.4 状态管理器注册的命名空间

| 命名空间 | 注册方 |
|---------|--------|
| `county` | GameEngine.init |
| `player` | GameEngine.init |
| `finance` | GameEngine.init |
| `factions` | FactionRelationshipSystem.init |
| `tasks` | TaskSystem.init |
| `events` | UIManager |
| `ai` | AISecretary |

---

## 三、时间系统

### 3.1 时间单位

| 单位 | 关系 | 说明 |
|------|------|------|
| 时间槽（Slot） | 半天 | 0.5天 |
| 天 | 2 Slot |  |
| 周 | 7天 | 核心循环单位 |
| 月 | 4周 | 经济结算单位 |
| 季度 | 3个月 | 任务生成周期 |
| 年 | 12个月 | 考核周期 |
| 任期 | 5年 | 游戏期限 |

### 3.2 每周循环（GameEngine._weeklyUpdate）

顺序执行：
1. 张力月度更新
2. 经济活力月度更新
3. 三状态联动（稳定/经济/上级互相影响）
4. 治理路线月度修正
5. 玩家状态恢复（精力/健康/压力）
6. 体制指标结算（腐败/官僚效率/负担）
7. 上级信任恢复
8. 地方威望更新
9. 财政自给率更新
10. 随机事件（约40%）
11. 出局检测（病故/事故/免职/落马）
12. 腐败调查检测
13. 派系系统更新（权力重算/凝聚力/关系回归）
14. 官员能力值驱动经济系统
15. 派系提案检查
16. 国策推进
17. 当务之急触发+过期检查

### 3.3 月度更新（_monthlyUpdate）

1. 经济系统月度模拟（地块→供应链→GDP+税基）
2. 财政系统月度结算（收入→支出→自给率）
3. 社会张力更新
4. 月度事件（随机2个）
5. 历史记录快照
6. 乡镇数据同步（稳定度/满意度/产业健康/设备老化）

### 3.4 年度更新

1. 考核系统年度审查
2. 任期结束检测（第5年）
3. 年度更替通知

---

## 四、核心数值体系

### 4.1 玩家（县委书记）属性

**6维能力**（0-100）：
| 能力 | 英文 | 作用 |
|------|------|------|
| 政治把控 | politics | 影响上级信任恢复速度 |
| 干部管理 | cadreMgmt | 影响人事操作效果 |
| 经济决策 | economy | 影响政策执行效率 |
| 稳定维护 | stability | 影响张力控制 |
| 党的建设 | partyBuilding | 影响党派凝聚力 |
| 廉洁自律 | integrity | 影响腐败风险 |

**关系网络**：
- `citySecretary` 市委书记信任（最重要）
- `cityMayor` 市长关系
- `countyMagistrate` 县长关系
- `committeeMembers[9]` 各常委关系
- `provincialDepts` 省厅关系
- `veterans` 老干部关系

**状态**：`health`/`energy`/`stress`

**政治资本**（0-200）：执行重要行动消耗的硬通货

**政绩六维**（考核权重）：经济25% / 稳定20% / 党建20% / 民生15% / 改革10% / 廉洁10%

### 4.2 干部（Official）属性

**9项能力**：politics/economy/personnel/crisis/integrity/profession/execution/coordination/innovation

**四属性（派系系统）**：
- `_ability` 综合能力（0-100）
- `_loyalty` 忠诚度（0-100）
- `_ambition` 野心（0-100）
- `_network` 关系网规模（朋友数量）
- `_friends` 朋友圈（2-5个密友）

**派系字段**：`_factionId` 归属派系

**关系**：player/secretary/boss/staffTrust/publicEval

**其他**：disciplineStatus（处分状态）, assignedTasks, performanceLog

### 4.3 县域属性

**人口**：total, urbanRatio, ruralRatio, agingCoeff, growthRate
**经济**：gdp, gdpGrowth, 三产比例
**体制**：bureaucracyEfficiency, corruptionIndex
**上级信任**：citySecretary, provincialEval, centralImpression
**地方威望**：officialSupport, publicApproval, entrepreneurConfidence
**历史负担**：hiddenDebt, excessCapacity, environmentalDebt, socialConflicts
**社会张力**：socialTension（核心指标，0-100，影响稳定性）
**乡镇**：towns[15]

### 4.4 财政模型（EU4风格）

| 指标 | 说明 |
|------|------|
| treasuryBalance | 国库余额（万元） |
| monthlyIncome | 月收入 |
| monthlyExpense | 月支出 |
| fiscalHealth | 财政信用（0-100） |
| selfSufficiency | 自给率 |
| debtRate | 债务率 |
| collectRate | 征收率（玩家可调30-100%） |

**收入三分支**：tax（增值税/企税/营业税/个税）+ transfer（转移支付/专项/返还）+ nonTax（收费/罚没/出让/利润）
**支出四分**：personnel（工资/社保）+ operating + project + debtInterest
**隐性债务**：hiddenDebt（约25亿，不直接显示）

### 4.5 社会系统（v2 三层架构）

**版本说明**：v0.16.0 重写为三层架构

#### 4.5.1 三层模型
```
┌─────────────────────────────────────────┐
│  第三层：集体行动（Collective Action）      │  ← 5级递进行动事件
│  petition → collective → strike →       │
│  blockade → riot                        │
├─────────────────────────────────────────┤
│  第二层：公共舆论（PublicOpinion）          │  ← 热点新闻生命周期
│  热点: heat↑→维持→decay  | 宣传/压制     │
├─────────────────────────────────────────┤
│  第一层：群体动态（SocialGroup）           │  ← 10个群体状态机
│  grievance→mobilization→actionThreshold │
└─────────────────────────────────────────┘
```

#### 4.5.2 10个社会群体（新增至10个，对齐文档）

| 群体 | 占比 | 关键关切 | 组织化程度 | 初始怨气 |
|------|------|---------|-----------|---------|
| 农民 | 45% | 粮价、农资、基础设施 | 0.3 | 25 |
| 工人 | 18% | 工资、就业稳定、社保 | 0.7 | 30 |
| 教师医生 | 5% | 工资、尊重、教育资源 | 0.5 | 15 |
| 个体商户 | 7% | 税费、监管、客流 | 0.3 | 20 |
| 企业主 | 2% | 政策、融资、成本 | 0.2 | 10 |
| 退休干部 | 3% | 待遇、尊重、影响力 | 0.6 | 15 |
| 下岗职工 | 5% | 保障、再就业 | 0.6 | 55 ⚠️ |
| 大学生 | 2% | 就业、公平 | 0.5 | 25 |
| 外来务工人员 | 3% | 欠薪、居住、子女教育 | 0.2 | 45 |
| 乡镇居民 | 10% | 基础设施、公共服务 | 0.3 | 20 |

#### 4.5.3 群体状态机

每个群体持有两个核心动态指标：

- **怨气（grievance 0-100）**：累积型不满，由失业/物价/不公事件/负面舆论驱动
  - 每周自然衰减（衰减率~92%，即每周保留92%）
  - 政府回应/安抚可以主动释放怨气
  - 群体间可通过 SocialNetwork 传染（怨气高的群体影响有共情的群体）

- **动员度（mobilization 0-100）**：从不满到准备行动的过渡指标
  - 由怨气驱动：grievance > thresholdPetition 时动员度上升
  - 怨气下降后动员度自然回落
  - 超过不同阈值触发不同等级行动

**行动阈值（5级递进）**：

| 等级 | 行动 | 动员度阈值 | 影响 |
|------|------|-----------|------|
| 1 | 来信来访 | ≥20 | 张力+2，上访记录 |
| 2 | 集体上访 | ≥40 | 张力+5，上级印象-3 |
| 3 | 罢工/罢市 | ≥60 | 经济活力-10，本月税收-15% |
| 4 | 堵路/集会 | ≥75 | 经济活力-20，上级印象-8 |
| 5 | 群体事件 | ≥90 | 张力+25，可能直接免职风险 |

#### 4.5.4 公共舆论层（PublicOpinion）

- **舆论热点**：每个新闻/事件可以产生舆论热点，有 heat(热度)/valence(情绪倾向)/target(针对对象)
  - 热度每周衰减（自然衰减率~90%/周）
  - 可被压制/放大
  - 热点影响群体 grievance（负面热点增加怨气，正面热点减少）
  - 信息透明度低+张力高 → 滋生谣言热点

- **信息操作**：
  - 宣传引导：消耗政资/精力，降低负面热点热度，创造正面热点
  - 压制信息：降低透明度，增加谣言风险，暂时压制负面热点
  - 压制超过4周有反弹风险（10%/周）

#### 4.5.5 怨气传染（SocialNetwork）

群体间通过社会关系网络传播怨气：
- 关系矩阵（-1~1），正=同情/共鸣，负=敌视/疏远
- 传染量 = 基础怨气×关系值×传染权重×张力放大系数×动员放大系数
- 核心传染链：下岗职工↔工人↔农民↔外来务工（互相共鸣度高）
- 企业主↔工人天然对立（负值）

#### 4.5.6 集体行动响应

玩家对集体行动事件的响应选项：
- **对话**（消耗精力+政资，持续降低 grievance）
- **安抚**（花钱，满意度回升但鼓励下一次）
- **压制**（消耗政资/廉洁度，短期平息但怨气不消）
- **上级介入**（消耗上级信任换取平息）

每种响应有差异化效果：cost（政资/国库/精力/廉洁）× effects（怨气释放/张力/满意度/经济活力）

#### 4.5.7 传统指标（保持兼容）

| 指标 | 说明 |
|------|------|
| socialTension | 社会张力（0-100），>60危险，>80出局风险 |
| satisfaction | 群众满意度（10个群体加权平均） |
| unemploymentRate | 失业率 |
| grievancePressure | 群体怨气对张力的月度贡献（新） |
| opinionPressure | 舆论热点对张力的月度贡献（新） |

---

## 五、六大派系系统

### 5.1 派系定义

| 派系ID | 名称 | 标签 | 领袖 | 颜色 | 成员数 |
|--------|------|------|------|------|--------|
| secretary | 书记系 | 自己人 | 副书记赵刚 | #7c3aed | 5人 |
| magistrate | 县长系 | 搭档/对手 | 县长王立永 | #2563eb | 6人 |
| local | 本土系 | 地头蛇 | 统战部长吴德 | #16a34a | 7人 |
| appointed | 空降系 | 带天线 | 纪委书记陈洁 | #dc2626 | 4人 |
| bureaucrat | 官僚系 | 办事的 | 政法委马洪涛 | #d97706 | 3人 |
| nonaligned | 无派系 | 风向标 | — | #9ca3af | 2人 |

### 5.2 派系关系矩阵（默认）

| | 书记系 | 县长系 | 本土系 | 空降系 | 官僚系 | 无派系 |
|--|--------|--------|--------|--------|--------|--------|
| 书记系 | — | -10 | +5 | +15 | +10 | +20 |
| 县长系 | -10 | — | +15 | -20 | +20 | +10 |
| 本土系 | +5 | +15 | — | -30 | 0 | +10 |
| 空降系 | +15 | -20 | -30 | — | 0 | +5 |
| 官僚系 | +10 | +20 | 0 | 0 | — | +15 |

### 5.3 派系动态

- **每周**：权力重算（基于成员能力+职务权重）+ 凝聚力漂移（趋中）+ 关系向默认值回归
- **每4周**：忠诚度自然衰减（忠诚<50且与书记关系<40→-2）
- **每4周**：派系事件（凝聚力低→内讧/权力高→施压/随机→丑闻）
- **派系权力公式**：`avg(成员能力×0.3 + 关系网×0.2 + 票权×15×0.3 + 凝聚力×0.2)`

### 5.4 连锁反应

- **提拔干部**：本人忠诚+10 → 朋友圈忠诚+3 → 同派系欣慰+2 → 敌对派系忌惮-2
- **查处干部**：本人忠诚-30 → 朋友圈恐慌-8 → 同派系恐惧-3凝聚力-5 → 敌对派系窃喜+1
- **调任干部**：本人忠诚-5，玩家关系-8，朋友不安-2

---

## 六、28名干部详情

### 6.1 县委常委（9人）

| ID | 姓名 | 职务 | 派系 | 能力特点 |
|----|------|------|------|---------|
| magistrate | 王立永 | 县长 | 县长系(领袖) | economy80/execution82 |
| deputy_secretary | 赵刚 | 副书记(专职) | 书记系(领袖) | politics80/personnel75 |
| deputy_magistrate | 梁永文 | 常务副县长 | 县长系 | economy82/profession80 |
| discipline | 陈洁 | 纪委书记 | 空降系(领袖) | integrity95/politics88 |
| organization | 周明 | 组织部长 | 书记系 | personnel88 |
| propaganda | 孙丽 | 宣传部长 | 书记系 | coordination82 |
| politics_law | 马洪涛 | 政法委书记 | 官僚系(领袖) | crisis88 |
| united_front | 吴德 | 统战部长 | 本土系(领袖) | coordination85 |
| office_director | 郑浩 | 县委办主任 | 书记系 | execution82 |

### 6.2 局长（19人）

| ID | 姓名 | 部门 | 派系 | 领域 |
|----|------|------|------|------|
| dev_reform | 张建国 | 发改局 | 县长系 | economy |
| edu_bureau | 李志强 | 教育局 | 官僚系 | livelihood |
| tech_bureau | 王小明 | 科工局 | 空降系 | economy |
| public_security | 张铁军 | 公安局 | 官僚系 | stability |
| civil_affairs | 刘爱民 | 民政局 | 本土系 | livelihood |
| finance_bureau | 李为民 | 财政局 | 县长系 | economy |
| hr_bureau | 赵志远 | 人社局 | 书记系 | livelihood |
| natural_resources | 孙大伟 | 自然资源局 | 县长系 | economy |
| housing_bureau | 赵铁柱 | 住建局 | 本土系 | livelihood |
| urban_admin | 王勇 | 城管局 | 本土系 | stability |
| transport_bureau | 陈德胜 | 交通局 | 本土系 | livelihood |
| agriculture_bureau | 刘丰收 | 农业农村局 | 本土系 | livelihood |
| water_bureau | 张水利 | 水利局 | 本土系 | livelihood |
| culture_tourism | 周文化 | 文旅局 | 无派系 | livelihood |
| health_bureau | 刘伟 | 卫健局 | 空降系 | livelihood |
| audit_bureau | 陈公正 | 审计局 | 空降系 | party |
| market_bureau | 孙市场 | 市场监管局 | 无派系 | economy |
| statistics_bureau | 郑数字 | 统计局 | 县长系 | economy |

---

## 七、乡镇系统

### 7.1 15个乡镇

| 索引 | 名称 | 类型 | 产业画像 | 定位 |
|------|------|------|---------|------|
| 0 | 城关镇 | 镇 | urban | 县城中心，商业+电子+旅游 |
| 1 | 红旗镇 | 镇 | industrial | 东侧工业园，机械+建材+物流 |
| 2 | 丰收镇 | 镇 | agricultural | 南部农业区，粮食+畜牧+加工 |
| 3 | 东风镇 | 镇 | industrial | 东部化工区，化工+纺织 |
| 4 | 新民镇 | 镇 | mixed | 南综合，粮食+制造+商贸 |
| 5 | 柳河镇 | 镇 | agricultural | 南沿河，蔬菜+养殖 |
| 6 | 双桥镇 | 镇 | mixed | 东南，电子+商贸+粮食 |
| 7 | 杨树镇 | 镇 | agricultural | 西，粮食+经济作物 |
| 8 | 青石镇 | 镇 | industrial | 最东建材，建材+机械 |
| 9 | 河口乡 | 乡 | agricultural | 最南，粮食+水产 |
| 10 | 松岭乡 | 乡 | tourism | 北山区，生态旅游+山地农业 |
| 11 | 龙湾乡 | 乡 | agricultural | 西，畜牧+粮食 |
| 12 | 白云乡 | 乡 | tourism | 西北，古镇文旅+中药材 |
| 13 | 曙光乡 | 乡 | mixed | 中西，商贸+粮食+加工 |
| 14 | 前进乡 | 乡 | agricultural | 最西，粮食+蔬菜 |

### 7.2 乡镇数据结构

每个乡镇：`{ id, name, type, profile, population, gdp, stability, satisfaction, sectors[] }`

`sectors[]` 每个产业地块：`{ id, type, subType, name, output, capacity, capacityUtilization, employees, basePrice, currentPrice, priceElasticity, profit, tax, level, stage, equipmentAge, enterpriseHealth, pollution, upstream[], downstream[] }`

### 7.3 数据活化（月度同步）

| 字段 | 计算方式 | 状态 |
|------|---------|------|
| gdp | 每月从各产业calcEffectiveOutput汇总 | ✅ 实时 |
| stability | 本地产业健康×70% + (100-张力)×30% | ✅ 实时 |
| satisfaction | 经济健康×50% + 就业率×30% + 20 | ✅ 实时 |
| equipmentAge | 每季度+0.5年 | ✅ 实时 |
| enterpriseHealth | 随产能利用率漂移(利用率-0.7)×2 | ✅ 实时 |
| population | 开局分配后不变 | ⚪ 静态 |

---

## 八、经济系统（EU4式供应链）

### 8.1 三层架构

1. **产业地块（TownSector）**：每个乡镇2-3个，有独立产能/价格/健康
2. **企业（Enterprise）**：部分地块关联企业，6家预设企业
3. **三驾马车GDP**：Y = C(消费) + I(投资) + G(政府支出) + NX(净出口)

### 8.2 供应链传导

```
农业 → 工业 → 服务业
  ↓       ↓
上游产能不足 → 下游capacityUtilization受限
```

### 8.3 月度经济循环

1. 各地块 `monthlyUpdate`（产能利用率/设备老化/成本变动）
2. 供应链传导：检查各 sector 的上游供应
3. GDP核算（三驾马车模式）
4. 供需→价格：总需求/总产出比值驱动所有产品价格波动
5. 税基计算 → 财政系统

### 8.4 6家预设企业

| 企业名 | 类型 | 所在镇 |
|--------|------|--------|
| 正定县农资公司 | 农业/服务 | 城关镇 |
| 正定县机械厂 | 工业 | 红旗镇 |
| 正定县纺织厂 | 工业 | 东风镇 |
| 正定县建材厂 | 工业 | 青石镇 |
| 正定县商贸公司 | 服务 | 城关镇 |
| 正定县文旅集团 | 旅游 | 城关镇 |

---

## 九、财政系统（EU4式收支树）

### 9.1 月收入计算

```
totalIncome = industrialTax + enterpriseIncomeTax + serviceTax + personalTax +
              generalTransfer + specialTransfer + taxReturn +
              adminFees + fines + landTransfer + stateProfit
```

受 `collectRate`（征收率 30-100%）影响。

### 9.2 月支出计算

```
totalExpense = personnelStaffWages + personnelSocialInsurance + 
               officeOperating + projectExpense + debtInterest
```

### 9.3 月度结算

- 结余 = 收入 - 支出 → treasuryBalance 增减
- selfSufficiency = min(100, monthlyIncome / monthlyExpense × 50)
- debtRate = (publicDebt + hiddenDebt) / annualIncome
- fiscalHealth = (100 - deficitRate×1.5) × (1 - debtRate/100) × (1 - arrearsMonths×0.1)

---

## 十、社会系统（v2）

> ⚠️ **社会系统已于 v0.16.0 升级为三层架构（三层架构详见 §4.5）。此处仅保留历史参考。**

### 10.1 旧版9群体（已升级为10群体）

~~旧版9个群体已扩展为10群体（新增"外来务工人员"和"乡镇居民"），详见 §4.5.2。~~

### 10.2 张力与满意度（已整合进群体状态机）

~~旧版张力计算仅考虑失业率/上访/事件等外部因素，v2 版本新增：~~
- ~~群体 grievance → 张力月度贡献（grievancePressure）~~
- ~~舆论热点 → 张力月度贡献（opinionPressure）~~
- ~~详见 §4.5.7~~

| 指标 | 说明 |
|------|------|
| socialTension | 社会张力（0-100），>60危险，>80出局风险 |
| satisfaction | 群众满意度（10个群体加权平均） |
| grievancePressure | 群体怨气对张力的月度贡献（v2新增） |
| opinionPressure | 舆论热点对张力的月度贡献（v2新增） |

---

## 十一、常委会与投票系统

### 11.1 常委会组成

9名常委，每人有投票权重（1-1.5）和核心诉求（demands）。

### 11.2 投票计算

`calcVote(issueFactors)` 逻辑：
1. 逐项计算因素得分（经济收益/环保风险/上级态度/财政贡献/群众反对/历史事故）
2. 性格修正（保守者风险厌恶）
3. 派系影响（书记系更重视上级态度，空降系次之）
4. 与书记关系修正
5. 派系权力影响（权力大的山头更有底气反对）
6. 最终判定：>3支持 / <-3反对 / 其余弃权
7. 一票否决：消耗政治资本10点，全员关系-2

### 11.3 6类16个投票议题

经济发展3 / 财政预算3 / 人事任免2 / 社会管理2 / 改革试点2 / 党建纪检2

### 11.4 人大系统

- 243名人大代表（扇形点阵展示）
- 三类议案（通过人才池弹窗内嵌完成）
- 罢免案（可罢免20名官员，排除县长和党内职务）
- 游说偏差累积制（随机30-50人施加lobbyBias，投票后清零）
- 人才池50名候选人，可提名替代政府官员

---

## 十二、任务系统

### 12.1 三层架构

| 层级 | 名称 | 内容 |
|------|------|------|
| 战略层 | 施政纲领 | 国策树，4分支16项国策 |
| 动态层 | 当务之急 | 25个触发式事件模板 |
| 常规层 | 季度任务 | 自动生成的财政/经济/社会/党建任务 |

### 12.2 国策树（Focus Tree — 仿HOI4）

**四分支**：

| 分支 | 图标 | 项数 | 顶级解锁 |
|------|------|------|---------|
| 经济发展 | 📈 | 5 | 产业链延伸 |
| 社会稳定 | 🏘 | 4 | 重点民生改善 |
| 党的建设 | 🚩 | 4 | 反腐专项巡察 |
| 改革创新 | 🚀 | 3 | 营商环境优化 |

**国策结构**：`{ id, name, desc, cost(万), duration(周), prerequisites[], effects{...} }`

**交互流程**：
1. 点击「▶ 可开始」→ 弹窗选负责干部（可选）
2. 扣除财政费用 → 每周自动推进（进度 100/duration %/周）
3. 有负责干部时速度修正：`0.6 + (profession+execution)/200` 倍
4. 完成时触发效果通知 + 该干部忠诚+3、野心+2

**国策效果类型**：economicVitality / gdpGrowth / monthlyIncome / selfSufficiency / socialTension / satisfaction / superiorTrust / politicalCapital / corruptionIndex / bureaucracyEfficiency

### 12.3 当务之急（Pressing Matters — 动态系统）

**5类25个模板**：🚨危机5 / 📡上级交办5 / 🤝派系博弈5 / 🎯机遇窗口5 / 👥群众诉求5

**触发机制**：每周 `tryTriggerMatters()` → 遍历模板执行 `trigger()` 条件函数 → 满足则激活（最多2个同时）

**决策流程**：
1. 当务之急出现在任务视图顶部（红色卡片+剩余周数）
2. 点击 → 弹窗显示：描述 + 时限 + 4-5个选项
3. 每个选项含：标签 + 描述 + 成本（财政/政资）+ 干部立场表态 + 风险警告
4. 点击选项 → 即时扣除成本 + 应用效果 + 记录日志
5. 过期（剩余0周）→ 自动施加惩罚

**干部表态示例**：
```
马洪涛："这才是解决问题的态度"
王立永："该给的钱拖太久了"
陈洁（空降系）："我会向市里如实反映" ⚠️
```

### 12.4 季度任务

- 每季度（1/4/7/10月）自动生成3条
- 每年初额外生成年度KPI（3条）
- 每月自动检查 `condition()` 完成条件
- 可点击"分派人"按钮指派给下属
- 过期未完成→惩罚

---

## 十三、派系提案系统

**触发**：每周随机约5%概率，触发一个派系的具体项目提案。

**提案池14个**：乡镇道路修缮/工业园区扩容/廉政教育中心/智慧警务升级等

**交互**：
1. 弹窗显示：提案描述 + 申请金额
2. 拖动条选择拨款比例（0~满额）
3. 确定 → 扣款 + 按比例计算效果
   - ≥90%：派系关系+5，全派系忠诚+2
   - ≥50%：派系关系+2
   - >0%：派系关系-2
   - 否决(0)：派系关系-5
4. 民生类项目减社会张力，经济类项目增经济活力

---

## 十四、腐败系统

### 14.1 7种腐败操作

按level解锁：加速审批/违规免税/土地出让/压制报道/挪用资金/卖官鬻爵/虚报项目

### 14.2 四阶段调查

```
暗流 → 初查 → 立案 → 处分
```

- `corruptionIndex > 50` → 纪委函询
- `corruptionIndex > 70` → 正式立案
- 应对选项：收手/销毁证据/找替罪羊/坦白/潜逃

### 14.3 出局机制

| 方式 | 条件 |
|------|------|
| 病故 | 健康归零 |
| 因公殉职 | 事故概率 |
| 免职 | 社会动荡+上级不信任 |
| 落马 | 腐败调查失败 |

---

## 十五、14种角色特质

| 特质 | 核心理念 |
|------|---------|
| 敢闯敢干 | 高风险高回报 |
| 稳健审慎 | 保守但稳妥 |
| 刚正不阿 | 清廉但缺乏弹性 |
| 实用主义 | 灵活务实 |
| 事必躬亲 | 亲力亲为 |
| 用人不疑 | 信任下属 |
| 长袖善舞 | 关系型 |
| 直来直去 | 坦诚但容易得罪人 |
| 发展至上 | 经济增长高于一切 |
| 生态优先 | 环保不可妥协 |
| 民生为本 | 群众利益优先 |
| 勤俭节约 | 精打细算 |
| 慷慨大方 | 舍得花钱 |

每位玩家开局选2个特质，影响能力值+事件选项+关系修正+腐败风险。

---

## 十六、UI视图

### 16.1 导航按钮

| 视图 | 功能 |
|------|------|
| 🏛 办公室 | 主仪表盘，KPI指标+本周关注+待处理 |
| 🗳 常委会 | 投票议题+人大系统 |
| 🗺 地图 | 县域地图（手绘式15乡镇+道路+地形+河流） |
| 👥 人事 | 28名干部管理+关系网络图 |
| 🔗 关系 | 派系关系网络图+干部列表 |
| 🎯 任务 | 国策树+当务之急+季度任务+干部圈动态 |
| 📊 数据 | 经济/人口/财政/考核数据面板 |
| 📜 日志 | 事件日志 |
| 📖 百科 | 游戏机制说明 |

### 16.2 地图视图特性

- 手绘式县域示意图（非真实地图）
- 15乡镇按地理逻辑布局
- 国道G107（金色）/省道（橙色）/县道（绿色虚线）
- 柳河河流，地形分区（北部山区/农业平原/工业走廊）
- 乡镇节点：产业图标+名称+人口+GDP+稳定色
- 右下角图例
- 支持暗色/亮色双模式切换

### 16.3 两色模式

右上角 🌙/☀️ 按钮一键切换，localStorage 持久化偏好。

---

## 十七、事件系统

### 17.1 事件库

50+事件框架，分类：
- 经济类12个：企业偷排/招商引资/优惠政策/产业变革/农业科技/电商/物价/失业/土地改革/开发区/金融风险/减税
- 社会类12个：上访/劳资纠纷/医疗/教育/食品安全/交通/宗教/土地纠纷/养老/治安/精神文建/环境
- 突发类10个：洪灾/疫情/重污天气/塌方/火灾/爆炸/群体/省通报/上级暗访/舆论
- 政治人事类10个：省组考察/递话/跑官/空降/巡视/异动/纪委函询/班子磨合/民主生活/书记述职
- 个人类8个：生病/家庭/老上级/人情/新技能/招商偶遇/党校/体检
- 基层特色8个：村村通/改厕/网格/合作社/换届/返乡/驻村/农合
- 腐败廉政6个：红包/暗箱/预警/审计进驻/行贿者被查/廉政谈话

### 17.2 年度历史事件

2026-2030 每年预设有特定事件。

---

## 十八、存档系统

- `gameEngine.save(slot)` → 序列化 County/Player/Finance/Faction/Task 到 localStorage
- `gameEngine.load(slot)` → 反序列化重建所有类实例
- 存档键：`xianzhi_save_1` / `xianzhi_save_2`

---

## 十九、AI秘书

- 全局单例 `AISecretary`（js/ui/AISecretary.js）
- 通过 server.js 的 `/api/chat` 调用后端 AI API
- 上下文携带完整游戏状态

---

## 二十、快速参考

### 游戏启动流程

```
app.js: DOMContentLoaded
  → 显示开始画面（难度选择/书记类型/2个特质选择/年度策略）
  → 点击"开始游戏"
  → initGame() 
    → 创建 County/Player/所有System
    → gameEngine.init() + start()
  → UIManager 绑定视图
```

### 核心循环

```
玩家点击"推进一周"
  → 选关注领域（2个）
  → 处理随机事件（3-5个待处理）
  → 确认后 GameEngine._doAdvance()
    → TimeSystem.advanceDay() x7
    → _weeklyUpdate()
    → 月/季度/年特殊更新
  → UI 刷新
```

### 关键常量

| 常量 | 值 |
|------|-----|
| 书记初始政资 | 100 |
| 国库起始 | 3500万 |
| 债务率起始 | 95% |
| 自给率起始 | 45% |
| 隐性债务 | 25亿 |
| 任期 | 5年 |
| 常委人数 | 9人 |
| 干部总数 | 28人 |
| 乡镇数 | 15 |
| 人大代��� | 243人 |
| 人才池 | 50人 |
| 派系 | 6个 |
| 国策数 | 16项 |
| 当务之急 | 25个 |
| 当务之急同时上限 | 2个 |

---

*文档完 — 所有描述基于项目 v0.16.0 实际代码状态*
