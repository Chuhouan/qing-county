/**
 * 机制名词辞典——悬浮定义数据源（完整版）
 * 涵盖所有 UI 界面上出现的名词
 */
const TERM_DEFS = {
  // ===== 财政 =====
  fiscalHealth: {
    name: '财政健康度',
    icon: '💰',
    def: '反映县财政状况的综合指标，0-100%。越高越好。',
    affects: '低于20%无法批准任何财政支出；低于40%进入预警状态。月度结算后自动更新。',
    affectedBy: '月度收支平衡（盈余→上升，赤字→下降）、文件批示拨款、累计赤字规模。',
    formula: '= 100 - 赤字惩罚 - 债务惩罚 - 拖欠惩罚 - 累计赤字附加惩罚',
  },
  monthlyIncome: {
    name: '月收入（万元）',
    icon: '📥',
    def: '县财政每月各项收入总和，基于税基逐项计算。',
    affects: '直接影响月度结余和财政健康度。收入越高，财政活动空间越大。',
    affectedBy: '税收（工业销售额×税率×征收率）、上级转移支付、非税收入（行政收费+罚没）、土地出让金。月度经济系统从底至上计算后得出。',
  },
  monthlyExpense: {
    name: '月支出（万元）',
    icon: '📤',
    def: '县财政每月各项支出总和，含刚性支出和弹性支出。',
    affects: '支出超出收入将导致赤字累积、债务率上升、财政健康度下降。',
    affectedBy: '人员工资（编制数×人均年薪×1.4系数÷12）、公用经费、项目支出、债务利息。',
  },
  monthlyBalance: {
    name: '月结余（万元）',
    icon: '⚖️',
    def: '月收入减去月支出。正数表示盈余，负数表示赤字。',
    affects: '连续赤字→累计赤字增长→债务率上升→财政健康度下降。盈余可偿还历史赤字。',
    affectedBy: '月收入与月支出的相对变化。',
  },
  cumulativeDeficit: {
    name: '累计赤字（万元）',
    icon: '📉',
    def: '历史上所有月度赤字的累积总和。每1000万赤字从健康度中额外扣减。',
    affects: '超过10000万时，所有财政支出被冻结。越长治理成本越高。',
    affectedBy: '月度收支平衡。盈余会自动偿还赤字。文件批示中的拨款也会增加赤字。',
  },
  debtRate: {
    name: '债务率',
    icon: '🏦',
    def: '县债务总额与综合财力的比值。超过60%开始产生债务惩罚。',
    affects: '债务惩罚 = max(0, 债务率-60)×0.5，直接从健康度中扣除。超过120%系统危机。',
    affectedBy: '新增借款、赤字累积、经济总量变化。',
  },
  selfSufficiency: {
    name: '财政自给率',
    icon: '🔄',
    def: '月收入占月支出的百分比。反映地方财政对上级转移支付的依赖程度。',
    affects: '低于50%表示严重依赖上级转移支付，抗风险能力差。高于80%财政健康。',
    affectedBy: '月收入与月支出的比值。每周按(收入/支出-1)×1.5微调。',
  },
  fiscalStatus: {
    name: '财政状态等级',
    icon: '💰',
    def: '基于财政健康度的定性分级：充裕(>80)、平衡(60-80)、紧张(40-60)、危机(<40)。',
    affects: '危机状态下无法批准新增支出，需优先解决财政问题。',
    affectedBy: '财政健康度的变化。',
  },

  // ===== 社会 =====
  socialTension: {
    name: '社会张力',
    icon: '🌡',
    def: '衡量社会不稳定程度的隐藏指标，0-100。越高越危险。',
    affects: '>50群体事件风险上升；>70可能大规模事件；>90系统性风险。高张力增加事件触发概率。',
    affectedBy: '服务业就业比例（比例低→失业高→张力升）、CPI通胀（超过102开始加压）、县长维稳能力（能力高→张力自然衰减）。',
    formula: '周变化 = -0.25(自然衰减) + 失业因子 + 通胀因子 - 维稳×0.02 ± 随机',
  },
  satisfaction: {
    name: '群众满意度',
    icon: '😊',
    def: '各群体（农民/工人/教师/企业主等）满意度的加权平均值。',
    affects: '>70和谐；50-70稳定；30-50紧张；<30动荡。直接影响社会稳定等级。',
    affectedBy: '各群体的基础需求满足度、发展需求满足度、公平感知度。政治权重：工人×1.5、企业主×1.4、农民×0.8。',
  },
  socialStatus: {
    name: '社会状态等级',
    icon: '👥',
    def: '基于群众满意度的定性分级：和谐(>70)、稳定(50-70)、紧张(30-50)、动荡(<30)。',
    affects: '动荡状态下群体事件概率大幅上升，可能需要上级干预。',
    affectedBy: '群众满意度的变化。',
  },
  grievance: {
    name: '群体怨气',
    icon: '😤',
    def: '各社会群体（农民/工人/下岗职工等）积累的不满情绪值，0-100。怨气是信访案件和集体行动的底层驱动。',
    affects: '怨气>40→信访案件生成概率上升；>50→动员度加速累积；>70→极易触发集体行动。积压案件会反哺怨气，形成正反馈环。',
    affectedBy: '每周自然衰减×0.90；政策伤害（民生政策负效果加怨气）；舆论负面热点推高怨气；群体间怨气传染（高怨气群体向关系密切群体传播）；信访积案反哺。',
    formula: '周变化 = -当前值×0.10(衰减) + 政策影响 + 舆论影响 + 传染增量 + 积案反哺',
  },
  mobilization: {
    name: '群体动员度',
    icon: '⬆',
    def: '社会群体采取集体行动的准备程度，0-100。动员度超过对应阈值就会触发相应级别的行动。',
    affects: '>20→来信来访；>40→集体上访；>60→罢工罢市；>75→堵路集会；>90→群体事件。',
    affectedBy: '怨气是动员度的主要驱动源（目标值≈怨气）；每周向目标值调整15%；信访越级事件会大幅提振对应群体的动员度（榜样效应）。',
    formula: '向目标值(怨气)靠拢15%/周；受越级事件、集体访案件额外加成',
  },
  petitionPressure: {
    name: '信访压力',
    icon: '✉️',
    def: '衡量当前信访工作压力的综合指标，0-100。越高表示信访形势越严峻。',
    affects: '压力>60时越级风险上升；>80时极易触发一票否决预警。高压力降低上级信任。',
    affectedBy: '在办案数量（每20件贡献30点）、越级率（越级/活跃案件×60）、集体访占比（×20）、敏感期（两会/国庆+15）。',
    formula: '= 案件量维度 + 越级率维度 + 集体访维度 + 敏感期加成',
  },
  propagandaPower: {
    name: '宣传力',
    icon: '📢',
    def: '县政府组织正面宣传报道的能力，0-100。越高越能压制负面舆论热点。',
    affects: '宣传力高→负面热点衰减加速→群体怨气受舆论影响减小。宣传力低→舆论失控风险上升。',
    affectedBy: '执行宣传引导操作可临时提升；长期不操作会缓慢衰减。',
  },
  rumorRisk: {
    name: '谣言风险',
    icon: '📰',
    def: '社会谣言滋生和传播的风险等级，0-100。越高越容易产生负面谣言热点。',
    affects: '>50有概率每周自动产生谣言热点；>70谣言传播速度翻倍。谣言热点负面推高群体怨气。',
    affectedBy: '信息压制操作会推高谣言风险（压制越频繁风险越高）；透明度高可降低谣言风险。',
  },
  transparency: {
    name: '舆情透明度',
    icon: '🔍',
    def: '政府舆情信息的公开透明程度，0-100。透明度高→谣言空间小；透明度过低→谣言横行。',
    affects: '>60谣言生成概率减半；<30谣言生成概率翻倍。透明度也是上级考核参考指标。',
    affectedBy: '信息压制操作降低透明度；舆情监控资源分配可提升透明度。',
  },
  petitionResolve: {
    name: '信访化解',
    icon: '✉️',
    def: '维稳资源分配项之一。投入信访案件化解的人力和财力，提高案件化解速度。',
    affects: '每分配10点→化解速度×1.2；分配越高，信访积案减少越快，群体怨气反哺越小。',
    affectedBy: '每周可用资源受财政和人力情况影响。资源分配在每周结算时生效。',
  },
  patrolDeter: {
    name: '巡逻防控',
    icon: '🚔',
    def: '维稳资源分配项之一。加强社会面巡逻和治安管控，降低集体行动触发概率。',
    affects: '每分配20点→行动触发概率×0.9；最高50%减免。同时小幅降低社会张力。',
    affectedBy: '每周可用资源受财政和人力情况影响。资源分配在每周结算时生效。',
  },
  conflictInvestigation: {
    name: '矛盾排查',
    icon: '🔍',
    def: '维稳资源分配项之一。主动排查社会矛盾，在矛盾激化为信访案件前提前发现并处理。',
    affects: '每分配10点→信访案件生成概率×0.95（最高减免50%）。提前发现的案件难度大幅降低。',
    affectedBy: '每周可用资源受财政和人力情况影响。资源分配在每周结算时生效。',
  },
  opinionMonitoring: {
    name: '舆情监控',
    icon: '📡',
    def: '维稳资源分配项之一。加强网络舆情监控和预警能力，提升信息透明度。',
    affects: '每分配10点→每周透明度+0.5。高透明度可降低谣言风险，减少负面舆论。',
    affectedBy: '每周可用资源受财政和人力情况影响。资源分配在每周结算时生效。',
  },
  proactiveInvestigate: {
    name: '下访调研',
    icon: '👣',
    def: '主动管理操作之一。书记亲自深入基层群体走访调研，发现隐藏的信访矛盾。',
    affects: '精力-15。发现一起潜在信访案件（难度×0.7），对应群体怨气-5。下访发现的案件初始化解进度较高，越级风险极低。',
    affectedBy: '选择怨气较高的群体收益最大。精力不足时无法执行。',
  },
  proactiveSweep: {
    name: '排查专项行动',
    icon: '🔍',
    def: '主动管理操作之一。启动全县性的矛盾排查专项行动，对所有在办案件施加降难度效果。',
    affects: '精力-20，政治资本-8。所有在办案件难度×0.85，越级风险-10，效果持续4周。',
    affectedBy: '在办案件较多时性价比最高。可作为应对积案预警的紧急手段。',
  },
  proactiveMeeting: {
    name: '联席会议',
    icon: '🤝',
    def: '主动管理操作之一。召开信访联席会议，协调各部门联合化解信访难题。',
    affects: '精力-10。所有在办案件越级风险-10；包案领导化解效率临时+20%（1周）。',
    affectedBy: '有已越级案件时效果最显著。精力消耗低，可频繁使用。',
  },
  proactiveLivelihood: {
    name: '民生微工程',
    icon: '🏗️',
    def: '主动管理操作之一。定向投入财政资金解决某群体最关心的民生问题，快速缓解怨气。',
    affects: '财政支出（自定金额50~500万），对应群体怨气-15，满意度+8/5（基础/发展）。精���-5。',
    affectedBy: '资金投入越大效果越好但受国库余额限制。选择怨气最高且人口权重大的群体收益最大。',
  },

  // ===== 经济 =====
  gdpTotal: {
    name: 'GDP总量（亿元）',
    icon: '📊',
    def: '县内生产总值，三次产业增加值之和。单位：亿元。反映县域经济总规模。',
    affects: 'GDP增长→税收增加→财政改善；GDP下降→企业困难→就业减少。',
    affectedBy: '一产(农业)增加值 + 二产(工业+建筑业)增加值 + 三产(服务业)增加值。每月由EconomicSystem从底至上重新计算。',
    formula: 'GDP = 一产增加值 + 二产增加值 + 三产增加值',
  },
  gdpGrowth: {
    name: 'GDP增速（年化）',
    icon: '📈',
    def: '国内生产总值年度增长率，小数转百分比显示。',
    affects: '>8%繁荣；5-8%正常；0-5%低迷；<0%危机。增速快→税收增加→财政改善；增速过快→通胀→张力上升。',
    affectedBy: '各产业增速的加权平均：工业×0.4 + 服务业×0.3 + 农业×0.1 + 基础趋势2%。',
    formula: '≈ 工业增加值增速×0.4 + 服务业增速×0.3 + 农业增速×0.1 + 0.02',
  },
  industrialRatio: {
    name: '工业占比',
    icon: '🏭',
    def: '工业增加值占GDP的百分比。',
    affects: '工业占比高→GDP增长快、税收多、就业机会多。但污染风险和工人维权需求上升。',
    affectedBy: '由IndustrySector各子行业产值加总计算。每月随企业经营状况变化。',
  },
  agricultureRatio: {
    name: '一产占比',
    icon: '🌾',
    def: '农业（农林牧渔业）增加值占GDP的百分比。',
    affects: '农业占比高→县域经济传统、人均收入偏低、受天气影响大。',
    affectedBy: '粮食/蔬菜产量×价格 + 畜牧业产值。每月按季节波动。',
  },
  serviceRatio: {
    name: '三产占比',
    icon: '💼',
    def: '服务业增加值占GDP的百分比。越高说明经济越现代。',
    affects: '三产占比高→就业灵活、社会稳定、经济抗风险能力强。发达县三产占比通常>60%。',
    affectedBy: '商贸零售+旅游+金融+通信等行业的增长。',
  },
  industryStructure: {
    name: '三产结构',
    icon: '📊',
    def: '一产(农业)/二产(工业+建筑)/三产(服务业)占GDP的比例。三数字之和为100%。',
    affects: '典型结构：发达县≈5%/25%/70%；农业县≈30%/35%/35%；工业县≈10%/55%/35%。',
    affectedBy: '各产业增加值的相对变化速度。',
  },
  cpi: {
    name: '消费者价格指数(CPI)',
    icon: '🏷',
    def: '居民消费价格指数，反映物价总体水平。100=持平，>100=上涨。',
    affects: 'CPI>103→通胀压力→社会张力上升。CPI<98→通缩→企业利润下降。',
    affectedBy: '经济增速、货币环境、市场供需。每月随机漂移±0.2。',
  },
  fixedInvestment: {
    name: '固定资产投资（万元）',
    icon: '🏗',
    def: '全县固定资产投资总额，含一产/二产/三产投资。反映经济发展后劲。',
    affects: '投资增长→基础设施建设→长期经济增长。投资下降→建筑行业就业减少。',
    affectedBy: '经济增速、政策导向、招商引资成果。',
  },
  retailTotal: {
    name: '社会消费品零售总额（万元）',
    icon: '🛒',
    def: '全县居民和社会集团消费品零售总额。反映消费市场规模。',
    affects: '零售增长→服务业扩张→就业增加→财政收入上升。',
    affectedBy: '居民收入增长、消费信心、旅游带动。',
  },
  tourismRevenue: {
    name: '旅游总收入（万元）',
    icon: '🧳',
    def: '全县旅游行业总收入。受季节、政策、宣传影响波动大。',
    affects: '旅游收入可占三产很大比例（正定县2024年旅游收入291亿占GDP的75%）。',
    affectedBy: '旅游设施、宣传投入、季节性波动、大型活动。每月波动±3%。',
  },
  employment: {
    name: '就业人口',
    icon: '👷',
    def: '全县三次产业的从业人员总数。含一产(农业)、二产(工业+建筑)、三产(服务)就业。',
    affects: '就业增长→居民收入→消费→经济正循环。就业减少→失业→社会张力上升。',
    affectedBy: '各产业产值变化→带动就业增减。工业产值每增长1%→就业增长约0.3%。',
  },
  subIndustry: {
    name: '工业细分行业',
    icon: '🏭',
    def: '制造业内部的细化分类。7个子行业：农副食品加工、纺织服装、化工、机械制造、建材、电子信息、其他制造。',
    affects: '每个行业贡献不同的产值、就业、税收和污染。行业结构决定经济质量和转型方向。',
    affectedBy: '行业自身增长率+政策因素+市场冲击+随机波动。',
  },
  economyStatus: {
    name: '经济状态等级',
    icon: '📈',
    def: '基于GDP增速的定性分级：繁荣(>8%)、正常(5-8%)、低迷(0-5%)、危机(<0%)。',
    affects: '繁荣→税收增长快；危机→企业倒闭、失业增加、社会动荡。',
    affectedBy: 'GDP增速变化。',
  },

  // ===== 县长(玩家) =====
  energy: {
    name: '县长精力',
    icon: '⚡',
    def: '县长处理政务的可用精力，0-100。每周自然恢复。精力不足时无法执行操作。',
    affects: '低于30时决策质量下降。精力不足时快速操作被阻止并提示"精力不足"。',
    affectedBy: '每周自然恢复+15。快速操作消耗：会议-15、批文-10、调研-20、谈话-12。',
  },
  health: {
    name: '县长健康',
    icon: '❤️',
    def: '县长身体状况，0-100。初始100。',
    affects: '低于30工作效率减半。低于10可能病倒提前结束任期。',
    affectedBy: '压力>60时每周-1；压力40-60时每周-0.3；精力<20时每周额外-0.8。',
  },
  stress: {
    name: '县长压力',
    icon: '🔥',
    def: '县长工作压力指数，0-100。越高越危险。',
    affects: '>60→健康每周-1；>40→健康每周-0.3。高压力可能导致决策失误。',
    affectedBy: '自然积累每周+0.8；社会张力每1%→压力+0.02；维稳能力缓冲(-维稳×0.008/周)。',
    formula: '周变化 = +0.8 + 张力×0.02 - 维稳×0.008',
  },
  advanceWeek: {
    name: '推进一周',
    icon: '⏩',
    def: '游戏核心操作按钮。点击后时间前进一周（7天），触发周循环更新。',
    affects: '每周更新：社会张力微调、玩家状态变化、体制指标漂移、上级信任变化、随机事件触发。每月触发：三产经济模拟、财政收支结算、月度事件。',
    affectedBy: '非玩家控制参数，每周固定推进。',
  },
  turnCount: {
    name: '游戏周数',
    icon: '📅',
    def: '从任期开始到现在的累计周数。5年任期≈260周。',
    affects: '每周推进时各类数值更新。周数接近260时任期将结束。',
    affectedBy: '每次点击"推进一周"增加1。',
  },

  // ===== 能力和操作 =====
  ability_economy: {
    name: '经济治理能力',
    icon: '📊',
    def: '影响GDP增长速度、招商引资成功率。0-100。',
    affects: '每10点→GDP增速+0.1个百分点/年。',
    affectedBy: '处理经济事务、学习培训。',
  },
  ability_livelihood: {
    name: '民生服务能力',
    icon: '🏥',
    def: '影响群众满意度、民生政策效果。',
    affects: '民生政策效果提升。下乡调研每次+0.5。',
    affectedBy: '处理民生问题、下乡调研。',
  },
  ability_stability: {
    name: '稳定维护能力',
    icon: '🛡',
    def: '影响社会张力下降速度、群体事件处理效果。',
    affects: '每1点→每周压低社会张力0.02、降低压力积累0.008。',
    affectedBy: '处理突发事件、政法工作。',
  },
  ability_governance: {
    name: '吏治驾驭能力',
    icon: '👥',
    def: '影响干部执行力、政策落地效果、官僚效率。',
    affects: '每高于50的1点→官僚效率每周+0.002。干部谈话每次+0.3。',
    affectedBy: '人事调整、干部谈话。',
  },
  ability_innovation: {
    name: '改革创新能力',
    icon: '💡',
    def: '影响政策突破、试点成功率。',
    affects: '试点成功率=20%+创新力×0.5%。高创新能力→更容易争取改革试点。',
    affectedBy: '试点工作、考察学习。',
  },
  ability_integrity: {
    name: '廉洁自律能力',
    icon: '✨',
    def: '影响腐败风险、上级廉政评价。',
    affects: '每高于70的1点→腐败指数每周-0.003。低于70→腐败指数上升。',
    affectedBy: '拒腐行为、家庭管理。',
  },
  actionMeeting: {
    name: '召开会议',
    icon: '🏛',
    def: '快速操作之一。消耗精力召开工作会议，部署工作。',
    affects: '精力-15，压力+3，社会张力-0.5（工作部署见效），民生政绩+0.5。',
    affectedBy: '仅限精力充足时执行。',
  },
  actionFiles: {
    name: '批阅文件',
    icon: '📄',
    def: '快速操作之一。处理日常公文，了解各方面工作。',
    affects: '精力-10，压力+1，社会张力-0.3（问题通过批文解决）。',
    affectedBy: '仅限精力充足时执行。',
  },
  actionInspect: {
    name: '下乡调研',
    icon: '🚗',
    def: '快速操作之一。深入基层了解实际情况，接触群众。',
    affects: '精力-20，压力-3（身心舒畅），社会张力-1（解决问题），民生政绩+1，民生能力+0.5。最有效的基层工作方式。',
    affectedBy: '仅限精力充足时执行。',
  },
  actionTalk: {
    name: '干部谈话',
    icon: '💬',
    def: '快速操作之一。与干部个别谈话，了解思想动态，建立关系。',
    affects: '精力-12，压力+2，吏治驾驭能力+0.3。15%概率随机提升干部一项能力。',
    affectedBy: '仅限精力充足时执行。',
  },
  actionSuperior: {
    name: '跑上级',
    icon: '⭐',
    def: '快速操作之一。前往市委或省厅汇报工作、争取资源、维护关系。',
    affects: '精力消耗按具体行动类型决定（汇报-15、跑省-20、调研-10、电话-5）。上级信任回升，政治资本+2。',
    affectedBy: '每周自然衰减会降低上级信任，需要定期维护。',
  },
  actionPetition: {
    name: '信访',
    icon: '✉️',
    def: '快速操作之一。进入信访工作台，查看待办信访案件并进行处理。',
    affects: '不消耗精力。可批示（+15%化解）、接访（+10%化解+降越级风险）、指派包案领导（自动推进化解）。',
    affectedBy: '信访压力、在办案件数、群体怨气水平。',
  },

  // ===== 上级 =====
  citySecretary: {
    name: '市委书记信任',
    icon: '🏛',
    def: '市委书记对县委书记的信任程度。-50~+50。',
    affects: '信任>30→审批成本打85折；信任<-10→成本涨20%。直接影响晋升。',
    affectedBy: '任务完成质量、政绩表现、私人关系。',
  },
  superiorTrust: {
    name: '上级评价体系',
    icon: '🏛',
    def: '包括市委书记信任、省厅评价、中央印象三个维度的综合上级评价。',
    affects: '影响晋升概率、争取资源能力、政策空间。',
    affectedBy: '任务完成情况、汇报质量、个人关系、政绩表现。',
  },

  // ===== 体制 =====
  bureaucracyEfficiency: {
    name: '官僚效率',
    icon: '⚙',
    def: '政府机构的办事效率，30-90。越高政策落地越快。',
    affects: '影响政策执行效果（公式预留）。效率低→政策打折扣→群众不满。',
    affectedBy: '县长吏治驾驭能力（每点+0.002/周）、腐败指数（腐败高→效率低）。',
    formula: '周变化 = (吏治-50)×0.002 ± 随机0.2',
  },
  corruptionIndex: {
    name: '腐败指数',
    icon: '🕵',
    def: '县政府的腐败程度，0-100。越高越严重。',
    affects: '腐败高→信息失真度上升、基层数据水分大、政策执行打折扣、群众不满。',
    affectedBy: '县长廉洁自律能力（高于70→腐败下降，低于70→腐败上升）。',
    formula: '周变化 = (廉洁-70)×(-0.003) ± 随机0.15',
  },

  // ===== 政绩 =====
  performance_economy: {
    name: '经济发展分',
    icon: '📈',
    def: '上级对县长经济工作的评价，0-100。权重30%。',
    affects: 'GDP增速快、财政收入高→分数高。影响晋升评价。',
    affectedBy: '文件批示、事件处理结果。',
  },
  performance_stability: {
    name: '社会稳定分',
    icon: '🛡',
    def: '上级对社会治理的评价，0-100。权重20%。',
    affects: '社会张力低、群体事件少→分数高。',
    affectedBy: '文件批示、事件处理结果。',
  },
  performance_livelihood: {
    name: '民生改善分',
    icon: '🏥',
    def: '对教育、医疗、社保投入的评价，0-100。权重25%。',
    affects: '惠民投入、下乡调研→分数高。',
    affectedBy: '文件批示、下乡调研、事件处理。',
  },
  performance_innovation: {
    name: '改革创新分',
    icon: '💡',
    def: '试点成果、经验推广的评价。权重5%。',
    affects: '试点成功、经验被推广→分数高。',
    affectedBy: '改革创新能力的应用。',
  },
  performance_ecology: {
    name: '生态保护分',
    icon: '🌳',
    def: '污染治理、耕地保护评价。权重10%。',
    affects: '环保投入、污染治理→分数高。上马高污染项目→分数下降。',
    affectedBy: '文件批示、项目决策。',
  },
  performance_integrity: {
    name: '廉洁自律分',
    icon: '✨',
    def: '审计结果、举报情况的评价。权重5%。',
    affects: '廉洁度高、无违规记录→分数高。',
    affectedBy: '腐败指数、审计结果。',
  },
  promotionChance: {
    name: '晋升概率',
    icon: '📊',
    def: '任期结束时计算，决定县长未来去向。',
    affects: '基础20%+优秀年×10%+书记支持20%+重大政绩15%-竞争对手10%-年龄5%-失误10%-无推荐20%。限制在0-100%之间。',
    affectedBy: '各年度考核结果、上级关系、突出政绩、竞争态势。',
  },

  // ===== 政治体系 =====
  committee: {
    name: '县委常委会',
    icon: '🏛',
    def: '县级最高决策机构，通常9-11人。县委书记2票、县长1.5票、其他各1票。通过率>50%决议通过。',
    affects: '重大决策（如引进化工项目）需常委会投票。委员的态度受派系、个人利益、分管领域影响。',
    affectedBy: '委员个人属性（派系、能力、性格）、议题因素、玩家关系。',
  },
  faction: {
    name: '干部派系',
    icon: '🔵',
    def: '干部在县委内部的派系归属。常见的派系有：书记系、本地系、上级空降等。',
    affects: '派系归属影响投票倾向和决策偏好。书记系通常支持书记意见，中立派系可争取。',
    affectedBy: '人事调动、利益分配、个人关系。',
  },
  officialTrait: {
    name: '干部性格特质',
    icon: '🧬',
    def: '影响干部行为方式的固定属性。如：谨慎、敢闯、守成、正直、圆滑等。',
    affects: '性格影响投票倾向、工作方式和改革意愿。谨慎型反对高风险决策，敢闯型支持创新。',
    affectedBy: '固定属性，一般不随游戏进程变化。',
  },
  voteWeight: {
    name: '投票权重',
    icon: '⚖',
    def: '常委会投票中各职务的票数权重。书记2票、县长1.5票、其他人各1票。',
    affects: '决定决议是否通过。县长需争取至少50%支持权重才能推动决策。',
    affectedBy: '固定规则，不变化。',
  },
  officialRelation: {
    name: '干部关系',
    icon: '🤝',
    def: '干部与县长的私人关系。影响干部对县长决策的支持度。',
    affects: '关系越高→干部越可能支持县长的提案。干部谈话可提升关系。',
    affectedBy: '谈话(+3~8)、利益分配、人事调动。',
  },
  politicalCapital: {
    name: '政治资本',
    icon: '💎',
    def: '县长积累的政治资源。可用于争取上级资源、保护干部、化解危机。',
    affects: '重大政绩+10~50，上级表扬+5~20。消耗：争取资源-20~100，保干部-30~80。',
    affectedBy: '政绩表现、上级关系、危机处理。',
  },
  reputation: {
    name: '信誉值',
    icon: '⭐',
    def: '县长对群众、干部、上级承诺的兑现程度。0-100。',
    affects: '信誉高→干部信任、群众配合、上级放心。信誉低→承诺不被相信、工作推进困难。',
    affectedBy: '对承诺的兑现度。说话算数→上升，食言→下降。',
  },

  // ===== 乡镇 =====
  town: {
    name: '乡镇',
    icon: '🏘',
    def: '县下辖的乡镇行政单位。每个乡镇有独立的人口、GDP、稳定度和满意度数据。各镇数据之和等于全县数据。',
    affects: '乡镇稳定度影响全县社会张力。满意度低的乡镇可能爆发群体事件。',
    affectedBy: '乡镇经济发展、政策执行、干部表现。',
  },
  townStability: {
    name: '乡镇稳定度',
    icon: '🛡',
    def: '各乡镇的社会稳定水平，0-100。越高越稳定。',
    affects: '低于50可能爆发群体事件。低于30需要重点关注。',
    affectedBy: '乡镇经济发展水平、干部能力、县政府政策。',
  },

  // ===== 企业 =====
  stateEnterprise: {
    name: '国有企业',
    icon: '🏭',
    def: '由县/市政府控股的企业。就业人数多、政治意义大、但可能亏损。',
    affects: '国企亏损→财政补贴压力大，但大规模裁员→社会动荡。改革阻力大。',
    affectedBy: '企业经营状况、行业景气度、改革政策。',
  },
  townshipEnterprise: {
    name: '乡镇企业',
    icon: '🏘',
    def: '乡镇或村集体兴办的企业。规模小、机制灵活、与镇政府关系紧密。',
    affects: '乡镇企业是县域经济的重要支柱。通常污染较大、安全风险较高。',
    affectedBy: '地方保护、环保政策、市场环境。',
  },
  privateEnterprise: {
    name: '私营企业',
    icon: '💼',
    def: '私人投资经营的企业。数量多、规模小、增长潜力大。',
    affects: '私营经济活跃→就业增加→税收增长。但需要公平的营商环境。',
    affectedBy: '政策稳定性、融资环境、市场准入。',
  },
  foreignEnterprise: {
    name: '外资企业',
    icon: '🌐',
    def: '来自外部的投资者（包括港资、台资）。通常带资金、技术和市场渠道。',
    affects: '外资投资→就业增加、税收增长、技术溢出。但可能转移利润或突然撤资。',
    affectedBy: '优惠政策、土地供应、营商环境。',
  },
  enterpriseStage: {
    name: '企业生命周期',
    icon: '🔄',
    def: '企业发展的四个阶段：初创期(startup)、成长期(growth)、成熟期(mature)、衰退期(decline)。',
    affects: '初创期→需要扶持但高风险；成长期→快速扩张；成熟期→稳定但创新不足；衰退期→可能倒闭，需产业升级。',
    affectedBy: '企业经营年限、市场变化、技术创新。',
  },
  enterprisePollution: {
    name: '企业污染程度',
    icon: '💨',
    def: '企业对环境的污染程度，0-100。化工、建材等行业污染高。',
    affects: '污染>60→高污染，群众投诉、环保处罚。长期高污染→环境欠账累积。',
    affectedBy: '企业类型（化工/建材污染高）、环保投入决策。',
  },
  enterpriseTax: {
    name: '税收贡献（万元/年）',
    icon: '💰',
    def: '企业每年缴纳的各项税收。是县财政收入的主要来源之一。',
    affects: '税收贡献直接影响财政月收入。企业亏损→税收减少。',
    affectedBy: '企业产值、利润、税率、征收率。',
  },

  // ===== 文件批示 =====
  fileAgree: {
    name: '同意批示',
    icon: '✅',
    def: '批准文件申请事项，财政拨款解决问题。最直接有效的处理方式。',
    affects: '消耗财政资源（健康度-3~-10），解决社会问题（张力-2~-8），增加政绩（+2~+6）。适合财政充裕时使用。',
  },
  fileRevise: {
    name: '改后再呈批示',
    icon: '📝',
    def: '退回拟稿单位修改。要求更高标准，但问题被延迟。',
    affects: '消耗少量财政（-0~-3），政绩微降（-1~-2，显犹豫），张力不受影响（问题未解决但也未被恶化）。适合需要更多信息时使用。',
  },
  fileTransfer: {
    name: '批转部门批示',
    icon: '↩️',
    def: '转交分管部门办理。部门在自己的预算和职权范围内处理，是正常行政分权。但欠了部门的人情。',
    affects: '消耗政治资本（-2~-5，欠人情），张力不变或微降（部门在处理）。财政不受影响（部门预算消化）。适合信任部门能力、想节省精力时使用。',
  },
  fileHold: {
    name: '暂留存批示',
    icon: '📁',
    def: '暂时搁置不处理。什么都不花——不花钱、不欠人情、不损政绩。但问题拖着，民怨缓慢积累。',
    affects: '财政不受影响，政治资本不受影响，政绩不受影响。但张力缓慢上升（+1~+6，视问题紧迫程度）。适合财政吃紧、政治资本不足、但又不需要立即决策时暂缓。风险是问题可能升级。',
  },
};

/** 获取某个术语的定义HTML（支持中英文key） */
function getTermTooltip(key) {
  const t = TERM_DEFS[key];
  if (!t) return null;
  return `
    <div class="tooltip-content">
      <div class="tt-header">${t.icon || '📌'} ${t.name}</div>
      <div class="tt-section">
        <div class="tt-section-title">📖 是什么</div>
        <div class="tt-text">${t.def}</div>
      </div>
      <div class="tt-section">
        <div class="tt-section-title">📌 受什么影响</div>
        <div class="tt-text">${t.affectedBy || '—'}</div>
      </div>
      <div class="tt-section">
        <div class="tt-section-title">⚡ 影响什么</div>
        <div class="tt-text">${t.affects || '—'}</div>
      </div>
      ${t.formula ? `<div class="tt-section"><div class="tt-section-title">🧮 公式</div><div class="tt-text tt-formula">${t.formula}</div></div>` : ''}
    </div>
  `;
}

/**
 * EU4风数值来源动态明细
 * 读取当前游戏状态，显示每个数值的实际计算链条
 */
function getDynamicBreakdown(key) {
  const county = stateManager?.get('county');
  const eco = stateManager?.get('economicData');
  const fin = stateManager?.get('finance');
  const player = stateManager?.get('player');
  const soc = stateManager?.get('social');

  // 辅助：画占比条
  const bar = (val, max, color) => {
    const pct = max > 0 ? (val / max * 100).toFixed(0) : 0;
    return `<div class="db-bar-bg"><div class="db-bar-fill" style="width:${Math.min(100, pct)}%;background:${color || 'var(--accent-blue)'}"></div></div>`;
  };

  // 辅助：子行缩进
  const sub = (label, value, extra = '') =>
    `<div class="db-breakdown-row sub"><span>${label}</span><span>${value}</span>${extra ? `<span class="db-note">${extra}</span>` : ''}</div>`;
  const main = (label, value, extra = '') =>
    `<div class="db-breakdown-row main"><span>${label}</span><span class="db-val">${value}</span>${extra ? `<span class="db-note">${extra}</span>` : ''}</div>`;
  const header = (label) =>
    `<div class="db-breakdown-header">${label}</div>`;

  switch (key) {
    // ==========================================================
    // GDP 总量：三产增加值从底至上加总
    // ==========================================================
    case 'gdpTotal': {
      const gdp = eco?.getGDPReport?.() || {};
      const total = gdp.total || county?.economy?.gdp || 3877000;
      const ag = gdp.agriculture || 388700;
      const ind = gdp.industry || (744000 + 208000);
      const sv = gdp.services || 2778000;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📊 GDP总量 = ${(total / 10000).toFixed(1)}亿元</div>
          <div class="db-section">${header('GDP = 一产 + 二产 + 三产')}</div>
          ${main('一产（农林牧渔业）', (ag / 10000).toFixed(1) + '亿元', '占' + ((ag / total) * 100).toFixed(1) + '%')}
          ${main('二产（工业+建筑业）', (ind / 10000).toFixed(1) + '亿元', '占' + ((ind / total) * 100).toFixed(1) + '%')}
          ${sub('其中：规上工业', (eco?.industry?.totalOutput / 10000 || 0).toFixed(1) + '亿')}
          ${sub('其中：建筑业', (eco?.industry?.constructionValue / 10000 || 20.8).toFixed(1) + '亿')}
          ${main('三产（服务业）', (sv / 10000).toFixed(1) + '亿元', '占' + ((sv / total) * 100).toFixed(1) + '%')}
          ${sub('其中：社消零售', (eco?.services?.retailTotal / 10000 || 100.2).toFixed(1) + '亿')}
          ${sub('其中：旅游收入', (eco?.services?.tourismRevenue / 10000 || 291.1).toFixed(1) + '亿')}
          ${sub('其中：金融（存贷）', ((eco?.services?.deposits + eco?.services?.loans) / 10000 / 100 || 0).toFixed(1) + '亿')}
          <div class="db-section">${header('📈 同比增速 ' + ((gdp.growthRate || 0.056) * 100).toFixed(1) + '%')}</div>
          ${main('工业增速贡献', ((eco?.industry?.scaleAboveGrowth || 0.091) * 0.4 * 100).toFixed(1) + '%', '工业增速×0.4')}
          ${main('服务业增速贡献', ((eco?.services?.retailGrowth || 0.055) * 0.3 * 100).toFixed(1) + '%', '零售增速×0.3')}
          ${main('农业增速贡献', ((eco?.agriculture?.addedValueGrowth || 0.019) * 0.1 * 100).toFixed(1) + '%', '农业增速×0.1')}
          ${main('基础趋势', '2.0%', '常数项')}
        </div>`;
    }

    // ==========================================================
    // EU4式财政月收入：逐项精确计算
    // ==========================================================
    case 'monthlyIncome': {
      const inc = fin?.incomeBreakdown;
      const total = fin?.monthlyIncome || 0;
      const taxTotal = inc?.tax?.total || 0;
      const trTotal = inc?.transfer?.total || 0;
      const ntTotal = inc?.nonTax?.total || 0;
      const cr = fin?.collectRate || 0.75;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📥 月收入 = ${total.toLocaleString()}万元</div>
          <div class="db-section">${header('征收率 ' + (cr * 100).toFixed(0) + '% （可调整）')}</div>
          ${main('💰 税收收入', taxTotal.toLocaleString() + '万', (total > 0 ? (taxTotal / total * 100).toFixed(0) + '%' : ''))}
          ${sub('增值税（工业销售×13%×征收率）', (inc?.tax?.sub?.vat?.value || 0).toLocaleString() + '万')}
          ${sub('企业所得税（利润×25%×征收率）', (inc?.tax?.sub?.corpTax?.value || 0).toLocaleString() + '万')}
          ${sub('服务业营业税（营收×6%×征收率）', (inc?.tax?.sub?.serviceTax?.value || 0).toLocaleString() + '万')}
          ${sub('个人所得税（就业×平均工资×3%×征收率）', (inc?.tax?.sub?.personalTax?.value || 0).toLocaleString() + '万')}
          ${main('📨 转移支付', trTotal.toLocaleString() + '万', (total > 0 ? (trTotal / total * 100).toFixed(0) + '%' : ''))}
          ${sub('一般性转移（保工资）', (inc?.transfer?.sub?.general?.value || 0).toLocaleString() + '万/月')}
          ${sub('专项转移（需争取）', (inc?.transfer?.sub?.special?.value || 0).toLocaleString() + '万/月')}
          ${sub('税收返还', (inc?.transfer?.sub?.taxReturn?.value || 0).toLocaleString() + '万/月')}
          ${main('📋 非税收入', ntTotal.toLocaleString() + '万', (total > 0 ? (ntTotal / total * 100).toFixed(0) + '%' : ''))}
          ${sub('行政事业性收费', (inc?.nonTax?.sub?.adminFees?.value || 0).toLocaleString() + '万')}
          ${sub('罚没收入', (inc?.nonTax?.sub?.fines?.value || 0).toLocaleString() + '万')}
          ${sub('土地出让金', (inc?.nonTax?.sub?.land?.value || 0).toLocaleString() + '万')}
          ${sub('国企利润上缴', (inc?.nonTax?.sub?.stateProfit?.value || 0).toLocaleString() + '万')}
          <div class="db-section">${header('⚖️ 自给率 ' + (fin?.selfSufficiency || 0) + '%' + (fin?.selfSufficiency < 50 ? ' ⚠️ 严重依赖转移支付' : ''))}</div>
        </div>`;
    }

    // ==========================================================
    // EU4式财政月支出：逐项精确计算
    // ==========================================================
    case 'monthlyExpense': {
      const exp = fin?.expenseBreakdown;
      const total = fin?.monthlyExpense || 1;
      const perTotal = exp?.personnel?.total || 0;
      const opTotal = exp?.operating?.total || 0;
      const pjTotal = exp?.project?.total || 0;
      const dbTotal = exp?.debtInterest?.total || 0;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📤 月支出 = ${total.toLocaleString()}万元</div>
          <div class="db-section">${header('支出 = 人员 + 公用 + 项目 + 利息')}</div>
          ${main('👥 人员经费', perTotal.toLocaleString() + '万', (perTotal / total * 100).toFixed(0) + '%')}
          ${sub('在编人员工资', (exp?.personnel?.sub?.salary?.value || 0).toLocaleString() + '万')}
          ${sub('社保公积金', (exp?.personnel?.sub?.social?.value || 0).toLocaleString() + '万')}
          ${main('📎 公用经费', opTotal.toLocaleString() + '万', (opTotal / total * 100).toFixed(0) + '%')}
          ${main('🏗 项目支出', pjTotal.toLocaleString() + '万', (pjTotal / total * 100).toFixed(0) + '%')}
          ${main('🏦 债务利息', dbTotal.toLocaleString() + '万', (dbTotal / total * 100).toFixed(0) + '%')}
          ${sub('显性债务', (fin?.publicDebt || 0).toLocaleString() + '万 × 4.5% ÷ 12')}
          ${sub('隐性债务(含)', ((fin?.hiddenDebt || 0) * 0.3).toLocaleString() + '万 × 4.5% ÷ 12')}
          <div class="db-section">${header(exp?.reserve?.total > 0 ? '📦 预备费余额 ' + (exp?.reserve?.total || 0).toLocaleString() + '万' : '📦 预备费 0 万')}</div>
        </div>`;
    }

    // ==========================================================
    // 社会张力：周变化来源
    // ==========================================================
    case 'socialTension': {
      const tension = county?.socialTension || 0;
      const emp = eco?.getEmploymentReport?.();
      const svRatio = emp?.total > 0 ? (emp.services / emp.total) : 0.2;
      const unempFactor = Math.max(0, (0.35 - svRatio) * 0.5);
      const cpi = eco?.cpi || 100.5;
      const inflFactor = Math.max(0, (cpi - 102) * 0.02);
      const stability = player?.abilities?.stability || 50;
      const stabilityBuff = -stability * 0.02;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">🌡 社会张力 = ${Math.round(tension)} / 100</div>
          <div class="db-section">${header('每周变化来源')}</div>
          ${main('自然衰减', '-0.25/周', '基础回归')}
          ${main('失业因子', '+' + unempFactor.toFixed(2) + '/周', '服务业就业比' + (svRatio * 100).toFixed(0) + '%')}
          ${sub('三产就业', (emp?.services || 110000).toLocaleString() + '人 / 总就业' + (emp?.total || 553104).toLocaleString() + '人')}
          ${main('通胀因子', '+' + inflFactor.toFixed(2) + '/周', 'CPI ' + cpi.toFixed(1))}
          ${main('维稳缓冲', stabilityBuff.toFixed(2) + '/周', '维稳能力 ' + stability)}
          ${main('随机扰动', '±0.5/周', '不可预测')}
          <div class="db-section">${header('📊 月均变化趋势')}</div>
          ${sub('上个月变化', ((eco?.industry?.scaleAboveGrowth || 0.05) * 10).toFixed(1) + '（工业景气指数）')}
          ${sub('警报阈值', tension > 50 ? '⚠️ >50 群体事件风险上升' : '✅ <50 正常范围')}
        </div>`;
    }

    // ==========================================================
    // 财政信用评级（衍生指标，原"健康度"）
    // ==========================================================
    case 'fiscalHealth': {
      const health = fin?.fiscalHealth || 65;
      const treasury = fin?.treasuryBalance || 0;
      const debtRate = fin?.debtRate || 45;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📊 财政信用评级 = ${Math.round(health)}%</div>
          <div class="db-section">${header('衍生指标，不做开关，仅做参考')}</div>
          ${main('国库余额', treasury.toLocaleString() + '万', treasury >= 0 ? '正' : '亏空')}
          ${main('债务率', Math.round(debtRate) + '%', debtRate > 60 ? '⚠️ 超警戒' : '正常')}
          ${main('评级', Math.round(health) + '%', health > 80 ? '优' : health > 60 ? '良' : health > 40 ? '中' : '差')}
          <div class="db-section">${header('⚠️ 注意：').replace('⚠️ 注意', '⚠️ 注意')}</div>
          <div class="db-text" style="font-size:11px;color:var(--text-muted);">批准支出的唯一条件是国库余额充足，与信用评级无关。</div>
        </div>`;
    }

    // ==========================================================
    // GDP增速
    // ==========================================================
    case 'gdpGrowth': {
      const growth = county?.economy?.gdpGrowth || 0.056;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📈 GDP增速 = ${(growth * 100).toFixed(1)}%</div>
          <div class="db-section">${header('年化增长率（权重加权）')}</div>
          ${main('工业增速贡献', ((eco?.industry?.scaleAboveGrowth || 0.091) * 0.4 * 100).toFixed(1) + '%', '工业×0.4')}
          ${sub('规上工业增速', ((eco?.industry?.scaleAboveGrowth || 0.091) * 100).toFixed(1) + '%')}
          ${main('零售增速贡献', ((eco?.services?.retailGrowth || 0.055) * 0.3 * 100).toFixed(1) + '%', '服务业×0.3')}
          ${main('农业增速贡献', ((eco?.agriculture?.addedValueGrowth || 0.019) * 0.1 * 100).toFixed(1) + '%', '农业×0.1')}
          ${main('基础趋势', '2.0%', '常数项')}
          <div class="db-section">${header('📊 经济状态')}</div>
          ${sub('CPI', (eco?.cpi || 100.5).toFixed(1) + (eco?.cpi > 103 ? ' ⚠️通胀' : ''))}
          ${sub('固定资产投资', ((eco?.fixedInvestment || 1800000) / 10000).toFixed(1) + '亿元')}
          ${sub('对外进出口', ((eco?.foreignTrade?.total || 118600) / 10000).toFixed(1) + '亿元')}
        </div>`;
    }

    // ==========================================================
    // 三产比例
    // ==========================================================
    case 'industryStructure': {
      const gdp = eco?.getGDPReport?.() || {};
      const agR = parseFloat(gdp.agRatio || '9.2');
      const indR = parseFloat(gdp.indRatio || '19.2');
      const svR = parseFloat(gdp.svRatio || '71.6');
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📊 三产结构</div>
          <div class="db-section">
            ${main('一产（农业）', agR.toFixed(1) + '%')}${bar(agR, 100, '#4caf50')}
            ${main('二产（工业+建筑）', indR.toFixed(1) + '%')}${bar(indR, 100, '#2196f3')}
            ${main('三产（服务业）', svR.toFixed(1) + '%')}${bar(svR, 100, '#9c27b0')}
          </div>
          <div class="db-section">${header('对比参照')}</div>
          ${sub('正定县2024实际', '9.2% / 19.2% / 71.7%')}
          ${sub('全国县域平均', '~15% / ~35% / ~50%')}
          ${sub('发达县典型', '5% / 25% / 70%')}
        </div>`;
    }

    // ==========================================================
    // 就业人口
    // ==========================================================
    case 'employment': {
      const emp = eco?.getEmploymentReport?.() || { total: 553104, agriculture: 85000, industry: 42000, services: 110000 };
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">👷 就业人口 = ${emp.total.toLocaleString()}人</div>
          <div class="db-section">${header('按产业分')}</div>
          ${main('一产（农业）', emp.agriculture.toLocaleString() + '人', ((emp.agriculture / emp.total) * 100).toFixed(0) + '%')}
          ${main('二产（工业+建筑）', emp.industry.toLocaleString() + '人', ((emp.industry / emp.total) * 100).toFixed(0) + '%')}
          ${sub('其中：制造业', (eco?.industry?.totalEmployees || 8000).toLocaleString() + '人')}
          ${sub('其中：建筑业', (eco?.industry?.constructionEmployment || 12000).toLocaleString() + '人')}
          ${main('三产（服务业）', emp.services.toLocaleString() + '人', ((emp.services / emp.total) * 100).toFixed(0) + '%')}
        </div>`;
    }

    // ==========================================================
    // 累计赤字
    // ==========================================================
    case 'cumulativeDeficit': {
      const def = fin?.cumulativeDeficit || 0;
      const monthlyDef = fin?.monthlyBalance || 0;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">📉 累计赤字 = ${def.toLocaleString()}万元</div>
          <div class="db-section">${header('本月收支 ' + (monthlyDef >= 0 ? '盈余' : '赤字') + ' ' + Math.abs(monthlyDef).toLocaleString() + '万')}</div>
          ${main('累计赤字总额', def.toLocaleString() + '万')}
          ${sub('健康度影响', '-' + Math.min(20, def / 1000 * 2).toFixed(1) + '%（每1000万扣2%）')}
          ${def > 10000 ? '<div class="db-alert">⚠️ 累计赤字超1000万，支出受限</div>' : ''}
        </div>`;
    }

    // ==========================================================
    // 债务率
    // ==========================================================
    case 'debtRate': {
      const rate = fin?.debtRate || 45;
      const debt = fin?.publicDebt || 200000;
      const gdp = county?.economy?.gdp || 3877000;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">🏦 债务率 = ${Math.round(rate)}%</div>
          <div class="db-section">${header('债务率 = 债务余额 / GDP')}</div>
          ${main('债务余额', debt.toLocaleString() + '万元')}
          ${main('GDP总量', (gdp / 10000).toFixed(1) + '亿元')}
          ${sub('实际比值', (debt / gdp * 100).toFixed(1) + '%')}
          ${rate > 60 ? '<div class="db-alert">⚠️ 超60%警戒线，产生债务惩罚</div>' : '✅ 在安全线内'}        
        </div>`;
    }

    // ==========================================================
    // 县长精力/健康/压力
    // ==========================================================
    case 'energy': {
      const e = player?.status?.energy || 100;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">⚡ 精力 = ${Math.round(e)} / 100</div>
          <div class="db-section">${header('周收支明细')}</div>
          ${main('每周基础恢复', '+15')}
          ${main('会议消耗', e < 15 ? '❌ 不足' : '-15（已执行）')}
          ${main('批文消耗', e < 10 ? '❌ 不足' : '-10（已执行）')}
          <div class="db-section">${header('当前状态')}</div>
          ${e > 60 ? '✅ 精力充沛' : e > 30 ? '⚠️ 有些疲惫' : '❌ 精力不足，无法执行快速操作'}
        </div>`;
    }
    case 'health': {
      const h = player?.status?.health || 100;
      const stressVal = player?.status?.stress || 20;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">❤️ 健康 = ${Math.round(h)} / 100</div>
          <div class="db-section">${header('每周损耗')}</div>
          ${stressVal > 60 ? main('高压耗损', '-1/周', '压力>' + Math.round(stressVal)) : ''}
          ${stressVal > 40 && stressVal <= 60 ? main('中压耗损', '-0.3/周', '压力>' + Math.round(stressVal)) : ''}
          ${(player?.status?.energy || 100) < 20 ? main('精力枯竭损耗', '-0.8/周', '精力<20') : ''}
          <div class="db-section">${header('当前状态')}</div>
          ${h > 60 ? '✅ 身体健康' : h > 30 ? '⚠️ 需要注意休息' : h > 10 ? '❌ 严重透支' : '🔴 病危！'}
        </div>`;
    }
    case 'stress': {
      const s = player?.status?.stress || 20;
      const tension = county?.socialTension || 0;
      const stability = player?.abilities?.stability || 50;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">🔥 压力 = ${Math.round(s)} / 100</div>
          <div class="db-section">${header('周变化 = +0.8 + 张力×0.02 - 维稳×0.008')}</div>
          ${main('自然积累', '+0.8/周')}
          ${main('社会张力影响', '+' + (tension * 0.02).toFixed(2) + '/周', '张力' + Math.round(tension) + '×0.02')}
          ${main('维稳能力缓冲', '-' + (stability * 0.008).toFixed(2) + '/周', '维稳' + Math.round(stability) + '×0.008')}
          <div class="db-section">${header('影响')}</div>
          ${s > 60 ? '🔴 高压→健康每周-1' : s > 40 ? '⚠️ 中压→健康每周-0.3' : '✅ 压力可控'}
        </div>`;
    }

    default:
      return null; // 没有动态明细，回退到静态定义

    // ==========================================================
    // 国库余额
    // ==========================================================
    case 'treasuryBalance': {
      const bal = fin?.treasuryBalance ?? 0;
      const inc = fin?.monthlyIncome ?? 0;
      const exp = fin?.monthlyExpense ?? 0;
      const def = fin?.publicDebt ?? 200000;
      const hdef = fin?.hiddenDebt ?? 250000;
      const health = fin?.fiscalHealth ?? 35;
      const ib = fin?.incomeBreakdown;
      const eb = fin?.expenseBreakdown;
      const cr = fin?.collectRate ?? 0.75;
      return `
        <div class="tooltip-content breakdown">
          <div class="tt-header">💰 国库余额 = ${bal.toLocaleString()}万元</div>
          <div class="db-section">${header('📥 月收入 ' + inc.toLocaleString() + '万 （征收率' + (cr * 100).toFixed(0) + '%）')}</div>
          ${main('税收收入', (ib?.tax?.total || 0).toLocaleString() + '万')}
          ${sub('增值税', (ib?.tax?.sub?.vat?.value || 0).toLocaleString() + '万')}
          ${sub('企业所得税', (ib?.tax?.sub?.corpTax?.value || 0).toLocaleString() + '万')}
          ${sub('服务业营业税', (ib?.tax?.sub?.serviceTax?.value || 0).toLocaleString() + '万')}
          ${main('转移支付', (ib?.transfer?.total || 0).toLocaleString() + '万')}
          ${main('非税收入', (ib?.nonTax?.total || 0).toLocaleString() + '万')}
          <div class="db-section">${header('📤 月支出 ' + exp.toLocaleString() + '万')}</div>
          ${main('人员经费', (eb?.personnel?.total || 0).toLocaleString() + '万', (eb?.personnel?.rate * 100).toFixed(0) + '%')}
          ${main('公用经费', (eb?.operating?.total || 0).toLocaleString() + '万')}
          ${main('项目支出', (eb?.project?.total || 0).toLocaleString() + '万')}
          ${main('债务利息', (eb?.debtInterest?.total || 0).toLocaleString() + '万')}
          <div class="db-section">${header('📊 月结余 ' + (inc - exp >= 0 ? '+' : '') + (inc - exp).toLocaleString() + '万')}</div>
          ${main('显性债务', def.toLocaleString() + '万')}
          ${main('隐性债务', hdef.toLocaleString() + '万')}
          ${main('信用评级', Math.round(health) + '%')}
          ${bal < 0 ? '<div class="db-alert">🔴 国库亏空！已出现拖欠</div>' : bal < 10000 ? '<div class="db-alert">⚠️ 余额不足1亿</div>' : ''}
        </div>`;
    }
  }
}
