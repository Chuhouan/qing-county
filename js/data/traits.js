/**
 * TRAITS - 角色特质系统
 * 每个特质都深刻影响游戏机制：
 *   - abilities: ↑↓ 能力修正
 *   - effects: 特殊效果
 *   - eventOptions: 解锁/锁定事件选项
 *   - relations: 关系变化修正
 *   - dialogue: 独有对话
 * 玩家开局选2个，游戏过程中可能获得/失去
 */
const TRAITS = [
  // ========== 性格特质 ==========
  {
    id: 'bold',
    name: '敢闯敢干',
    icon: '🔥',
    desc: '你是一个敢于冒险的人。喜欢突破常规，勇于尝试新事物。',
    effects: {
      // 能力修正
      abilities: { economy: 8, innovation: 10, stability: -5 },
      // 常规效果
      rules: [
        '经济决策类事件中，"激进"选项成功率+20%',
        '社会稳定类事件中，"保守"选项不可用',
        '常委会：与激进特质常委谈话效果+30%',
        '改革创新类事件效果+15%（特质加成）',
        '社会稳定类事件效果+10%（特质加成）',
      ],
      // 数值修正
      modifiers: {
        gdpGrowth: 0.003,        // 经济活力周增长提升（特质加成）
      },
    },
  },
  {
    id: 'cautious',
    name: '稳健审慎',
    icon: '🛡',
    desc: '你是一个谨慎的人。谋定而后动，追求稳中求进。',
    effects: {
      abilities: { stability: 8, integrity: 5, innovation: -8 },
      rules: [
        '社会稳定类事件中，风险选项成功率+15%',
        '经济决策类事件中，"冒险"选项不可用',
        '常委会：与谨慎特质常委谈话效果+30%',
        '社会稳定类事件效果+15%（特质加成）',
        '改革创新类事件效果+15%（特质加成）',
      ],
      modifiers: {
        tensionResistance: 3,
        gdpGrowth: -0.002,
      },
    },
  },
  {
    id: 'righteous',
    name: '刚正不阿',
    icon: '⚖',
    desc: '你是一个正直的人。原则性强，不受外界干扰。',
    effects: {
      abilities: { integrity: 12, partyBuilding: 5, economy: -3 },
      rules: [
        '腐败类事件中，"收受贿赂"选项不可用',
        '廉政类事件效果+30%',
        '与腐败指数高的常委关系更难提升',
        '廉洁事件效果+15% （特质加成）',
        '企业家关系更难提升（被认为不好说话）',
      ],
      modifiers: {
        corruptionImmunity: 0.5,   // 腐败风险减半
        investigationRisk: -2,      // 被查风险每周-2
      },
    },
  },
  {
    id: 'pragmatic',
    name: '实用主义',
    icon: '🔧',
    desc: '你讲究实际效果。不管黑猫白猫，抓到老鼠就是好猫。',
    effects: {
      abilities: { economy: 5, innovation: 5, integrity: -8 },
      rules: [
        '所有事件中，"实用主义"选项效果+25%',
        '腐败容忍度更高（高腐败操作不触发内心谴责事件）',
        '与各派系关系平均提升更快',
        '廉洁事件效果+15% （特质加成）',
      ],
      modifiers: {
        gdpGrowth: 0.002,
        investigationRisk: 1,
      },
    },
  },

  // ========== 行事风格 ==========
  {
    id: 'hands_on',
    name: '事必躬亲',
    icon: '📋',
    desc: '你喜欢亲自过问每一件事。不放心让下属全权处理。',
    effects: {
      abilities: { cadreMgmt: -5, governance: 5, energy: -10 },
      rules: [
        '快速操作（会议/调研/谈话）效果+30%',
        '每周精力消耗增加10点',
        '干部工作满意度-10%（被认为不信任下属）',
        '乡镇调研获得的信息质量更高',
      ],
      modifiers: {
        energyCost: 1.3,
        infoQuality: 0.3,
      },
    },
  },
  {
    id: 'delegator',
    name: '用人不疑',
    icon: '🤝',
    desc: '你擅长授权给下属。选对人后充分放权。',
    effects: {
      abilities: { cadreMgmt: 8, economy: -3, energy: 10 },
      rules: [
        '批转部门文件效果+50%（部门执行力更强）',
        '每周精力消耗减少10点',
        '干部工作满意度+10%',
        '信息失真度+5%（下属报喜不报忧）',
      ],
      modifiers: {
        energyCost: 0.7,
        infoDistortion: 0.05,
        transferEfficiency: 0.5,
      },
    },
  },
  {
    id: 'diplomatic',
    name: '长袖善舞',
    icon: '🎭',
    desc: '你善于处理人际关系。在各方之间游刃有余。',
    effects: {
      abilities: { politics: 5, stability: 3, integrity: -5 },
      rules: [
        '通过谈话改善关系的效果+50%',
        '上级关系改善速度+20%',
        '常委会"弃权"票更多（被认为过于圆滑）',
        '腐败类事件中，被发现概率降低（更会掩饰）',
      ],
      modifiers: {
        relationSpeed: 0.2,
        talkEffectiveness: 0.5,
      },
    },
  },
  {
    id: 'straightforward',
    name: '直来直去',
    icon: '🗣',
    desc: '你说话直接，不喜欢拐弯抹角。做事雷厉风行。',
    effects: {
      abilities: { execution: 8, stability: -3, coordination: -5 },
      rules: [
        '快速操作（会议/调研/谈话）效果+20%',
        '常委会"弃权"票减少（态度鲜明）',
        '与"圆滑"特质常委关系更难提升',
        '与正直特质常委关系自然增长',
        '干部谈话时，直言不讳可能伤感情',
      ],
      modifiers: {
        fileSpeed: 0.2,
      },
    },
  },

  // ========== 施政理念 ==========
  {
    id: 'developmentalist',
    name: '发展至上',
    icon: '📈',
    desc: '你坚信发展才是硬道理。一切工作围绕经济建设展开。',
    effects: {
      abilities: { economy: 10, livelihood: -5, ecology: -8 },
      rules: [
        '经济发展类事件效果+15% （特质加成）',
        '民生类/生态类事件效果+15%（特质加成）',
        '高污染工业项目审批成功率+20%',
        '环保类事件中，严格治理选项效果减半',
        '企业家关系提升速度+30%',
      ],
      modifiers: {
        gdpGrowth: 0.005,
        pollutionTolerance: 10,
      },
    },
  },
  {
    id: 'green',
    name: '生态优先',
    icon: '🌿',
    desc: '你高度重视生态环境。绿水青山就是金山银山。',
    effects: {
      abilities: { ecology: 12, economy: -8, innovation: 3 },
      rules: [
        '生态保护事件效果+15%（特质加成）',
        '经济发展事件效果+15% （特质加成）',
        '高污染项目审批难度+30%',
        '环保类事件效果+40%',
        '与工业企业家关系更难提升',
      ],
      modifiers: {
        pollutionTolerance: -20,
        gdpGrowth: -0.003,
      },
    },
  },
  {
    id: 'people_first',
    name: '民生为本',
    icon: '🏥',
    desc: '你始终把群众冷暖放在第一位。民生无小事。',
    effects: {
      abilities: { livelihood: 10, economy: -5, stability: 5 },
      rules: [
        '民生类事件效果+15%（特质加成）',
        '经济类事件效果+15% （特质加成）',
        '民生文件批示效果+30%',
        '群众满意度下降速度减半',
        '群众满意度提升速度加倍',
      ],
      modifiers: {
        satisfactionRecovery: 0.5,
      },
    },
  },

  // ========== 个人品质 ==========
  {
    id: 'frugal',
    name: '勤俭节约',
    icon: '💰',
    desc: '你生活简朴，对财政支出精打细算。',
    effects: {
      abilities: { integrity: 5, economy: 3, innovation: -3 },
      rules: [
        '所有财政支出类选项消耗减少20%',
        '预备费余额回复速度+20%（自然增长）',
        '"同意批示"时额外节省10%资金',
        '干部工作满意度-5%（被认为小气）',
      ],
      modifiers: {
        fiscalCost: 0.8,
      },
    },
  },
  {
    id: 'generous',
    name: '慷慨大方',
    icon: '🎁',
    desc: '你出手大方，舍得投入。认为花钱才能办成事。',
    effects: {
      abilities: { coordination: 5, economy: -3, integrity: -5 },
      rules: [
        '所有财政支出类选项消耗增加15%',
        '关系改善类效果+20%（被认为大方）',
        '干部工作满意度+5%',
        '政治资本获取速度+15%',
      ],
      modifiers: {
        fiscalCost: 1.15,
        relationBonus: 0.2,
      },
    },
  },
];

/** 获取所有特质列表 */
function getAllTraits() { return TRAITS; }

/** 按ID获取特质 */
function getTrait(id) { return TRAITS.find(t => t.id === id); }

/** 应用特质效果到Player */
function applyTraitEffects(player, traitIds) {
  if (!player) return;
  const traits = traitIds.map(id => getTrait(id)).filter(Boolean);
  for (const t of traits) {
    const fx = t.effects;
    // 能力修正
    if (fx.abilities) {
      for (const [k, v] of Object.entries(fx.abilities)) {
        player.abilities[k] = calculator.clamp((player.abilities[k] || 50) + v, 0, 100);
      }
    }
  }
}

/** 检查是否拥有某特质 */
function hasTrait(traitId, player) {
  return player?.traits?.includes(traitId);
}

/** 获取特质影响的事件选项修正——按选项索引返回锁定/加成 */
function getTraitEventModifiers(player, eventChoices) {
  const result = { locked: [], unlocked: [], boosted: [] };
  if (!player?.traits || !eventChoices) return result;

  const traitMap = {
    bold: { lockWords: ['保守','谨慎','暂缓','搁置'], boostWords: ['激进','大胆','突破','创新'] },
    cautious: { lockWords: ['激进','冒险','突破','大胆'], boostWords: ['保守','谨慎','稳步'] },
    righteous: { lockWords: ['暗箱','内定','包庇','压住'], boostWords: ['严查','公开','透明'] },
    pragmatic: { lockWords: ['形式主义','走过场','面子工程'], boostWords: ['务实','实际','可行'] },
    hands_on: { lockWords: ['敷衍','推出去','不管'], boostWords: ['细节','深入','亲自'] },
    delegator: { lockWords: ['不信任','撤换','查办'], boostWords: ['放权','信任','授权'] },
    diplomatic: { lockWords: ['强硬','撕破脸','得罪'], boostWords: ['协调','斡旋','关系'] },
    straightforward: { lockWords: ['绕弯子','打太极'], boostWords: ['直说','直接','当面'] },
    developmentalist: { lockWords: ['环保优先','关停'], boostWords: ['招商','发展','项目'] },
    green: { lockWords: ['大开发','工业园'], boostWords: ['环保','生态','绿色'] },
    people_first: { lockWords: ['形象工程','大项目'], boostWords: ['民生','教育','医疗'] },
    frugal: { lockWords: ['大投入','豪华'], boostWords: ['节约','省钱','精简'] },
    generous: { lockWords: ['抠门','不给'], boostWords: ['奖励','拨款','补助'] },
  };

  for (let i = 0; i < eventChoices.length; i++) {
    const txt = [eventChoices[i].label, eventChoices[i].desc, eventChoices[i].description].filter(Boolean).join(' ');
    for (const tId of player.traits) {
      const cfg = traitMap[tId];
      if (!cfg) continue;
      if (cfg.lockWords.some(w => txt.includes(w))) result.locked.push(i);
      if (cfg.boostWords.some(w => txt.includes(w))) result.boosted.push(i);
    }
  }
  // 去重
  result.locked = [...new Set(result.locked)];
  result.boosted = [...new Set(result.boosted)];
  return result;
}
