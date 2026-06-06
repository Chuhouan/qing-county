# 青縣 · Qing County

> 中国县域治理模拟游戏 · County Governance Simulation

**文件已发送至：** `npm start`

---

## 简介

《青縣》是一款以真实中国县域治理为背景的文字策略模拟游戏。玩家以县委书记的身份，治理一座虚构但数据基于正定县的北方县城——**青县**。

这不仅仅是一个数字游戏。你需要在**经济发展、社会稳定、财政平衡、人事布局、上级关系、党建意识形态**等多重维度之间权衡取舍。每一个决策都有代价，每一次提拔都有连锁反应。

> "郡县治，天下安。"

---

## 游戏特色

| 系统 | 说明 |
|------|------|
| 🏛️ **经济系统** | 八大产业（农业/工业/服务业等），GDP、税收、就业动态模拟 |
| 💰 **财政系统** | 财政收入/支出、预算调整、专项债、转移支付 |
| 👥 **人口系统** | 12个群体分类（农民/工人/干部/企业家等）的动态满意度与诉求 |
| 👔 **人事系统** | 60+可任免的县级官员，四维属性（能力/忠诚/野心/关系网） |
| 🔗 **派系系统** | 六大派系（书记系/县长系/本土系/空降系/官僚系/无派系），官员可自动流动 |
| 📢 **人大系统** | 35名常委会 + 243名人代会代表，可以否决提案、罢免官员 |
| 💸 **贪腐系统** | 腐败滋生、巡查、查处，廉洁度影响民心与上级评价 |
| 📰 **舆论系统** | 舆情热点、新闻事件、社会动员度与群体行动 |
| 🛂 **信访系统** | 信访案件生成、化解、越级访，与社会张力双向驱动 |
| 📋 **巡视巡查系统** | 上级巡视组不定期空降，随机抽查领域 |
| 🏭 **安全生产系统** | 企业安全事故风险，季度巡查与责任制 |
| ⚑ **党建系统** | 民主生活会、基层党建、理论学习中心组 |
| 🔺 **上级关系系统** | 市委评价、排名竞争、资源争取 |
| 🤖 **AI秘书** | 一个有性格的AI秘书（陈守义），提供叙事、决策建议、月度简报 |
| 📜 **叙事引擎** | 关键事件自动生成叙事文本，跑马灯+浮动面板沉浸体验 |

---

## 快速开始

### 0. 前置条件

- Node.js >= 18

### 1. 安装依赖

```bash
cd xianzhi
npm install
```

### 2. 配置 AI 秘书（可选）

创建 `.env` 文件：

```env
AI_API_KEY=sk-your-api-key-here
AI_API_BASE=https://openrouter.ai/api/v1
AI_MODEL=deepseek/deepseek-chat
```

不配置也不影响游戏运行，只是AI秘书功能降级为规则模板。

### 3. 启动游戏

```bash
node server.js
```

浏览器打开 `http://localhost:3000` 即可游玩。

---

## 游戏截图

<sup>（终端游戏，无图形资源，纯HTML/CSS/JS渲染）</sup>

---

## 项目结构

```
xianzhi/
├── index.html              # 主入口
├── app.js                  # 全局初始化/启动流程
├── server.js               # Node.js 服务端（静态文件 + AI代理）
├── package.json
├── css/
│   └── style.css           # 样式（暗色主题，仿政务系统UI）
├── js/
│   ├── engine/             # 游戏引擎
│   │   ├── GameEngine.js   # 核心循环（周/月/年推进）
│   │   ├── Calculator.js   # 数值计算器
│   │   ├── StateManager.js # 状态管理（可持久化）
│   │   ├── EventBus.js     # 事件总线
│   │   └── TimeSystem.js   # 时间系统
│   ├── models/             # 数据模型
│   │   ├── County.js       # 县情数据
│   │   ├── Official.js     # 官员模型（含派系亲和度）
│   │   ├── Finance.js      # 财政模型
│   │   ├── PopulationGroup.js  # 人口群体
│   │   ├── PetitionCase.js # 信访案件
│   │   └── ...
│   ├── systems/            # 子系统
│   │   ├── FactionRelationshipSystem.js  # 派系关系
│   │   ├── SocialSystem.js    # 社会系统（含信访一体化）
│   │   ├── PersonnelSystem.js # 人事系统
│   │   ├── EconomicSystem.js  # 经济系统
│   │   ├── SuperiorRelationshipSystem.js # 上级关系
│   │   ├── CorruptionSystem.js # 贪腐系统
│   │   └── ...
│   ├── data/               # 游戏数据
│   │   ├── eventLibrary.js # 50+ 事件库
│   │   ├── changelog.js    # 更新日志
│   │   ├── npcMotions.js   # 副手行为
│   │   └── ...
│   └── ui/                 # 用户界面
│       ├── UIManager.js    # UI总管
│       ├── AISecretary.js  # AI秘书（叙事+决策引擎）
│       └── ChartHelper.js  # 图表辅助
└── DESIGN_PHASE1_DETAILED.md   # 系统设计文档
```

---

## 数据来源

游戏基础经济/人口/产业结构数据取自 **正定县**（河北省石家庄市辖县）公开统计数据，并进行了适当简化与泛化处理。

---

## 技术栈

- **纯前端**：HTML5 + CSS3 + Vanilla JavaScript（无框架依赖）
- **后端**：Node.js + Express（静态服务 + AI API 代理）
- **AI 集成**：OpenAI 兼容接口（可接入任意大模型）
- **存储**：localStorage（游戏存档）

---

## 版本号

当前版本：**v0.24.0**（永远保持 v0.xxx 格式）

完整更新日志见游戏内"更多→更新日志"或 `js/data/changelog.js`。

---

## 开发说明

本项目是单页应用，所有游戏逻辑在浏览器端运行，服务器仅提供静态文件和AI API代理。

```
npm start    # 启动服务器
```

本地开发时修改 `js/` 下的文件，刷新浏览器即可看到效果。

---

## 许可

ISC License
