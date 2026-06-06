/**
 * npcMotions.js - 人大代表议案库
 * 三类议案：legislation（法规类）/ decision（决定类）/ resolution（决议类）
 * 分为 player 发起（玩家主动推进政策）和 delegate 发起（代表联名施压）两种触发方式
 */
const NPC_MOTIONS = [
  // ======================================================================
  // 法规类 legislation：制定/修改规范性文件，效果最重，通过难度最高
  // ======================================================================
  {
    id: 'motion_land_transfer',
    type: 'legislation',
    title: '农村土地流转管理暂行规定',
    desc: '规范全县农村土地经营权流转程序，防止耕地"非粮化"，建立流转备案审查制度。',
    initiator: 'delegate',  // 代表发起
    triggerYear: 1,         // 第1年起可触发
    triggerCondition: () => {
      const c = stateManager.get('county');
      return c && c.economy && c.economy.agricultureRatio > 0.30;
    },
    passageDifficulty: 0.55, // 基础通过率
    effects: {
      socialTension: 2,
      agricultureOutput: 0.04,
      logDesc: '通过土地流转管理规定，农业用地得到规范管理'
    },
  },
  {
    id: 'motion_environment',
    type: 'legislation',
    title: '工业园区环境保护条例',
    desc: '提高工业园区排污标准，要求重点企业安装在线监测设备，违规企业按日计罚。',
    initiator: 'delegate',
    triggerYear: 2,
    triggerCondition: () => {
      const c = stateManager.get('county');
      return c && c.institution && c.institution.corruptionIndex > 35;
    },
    passageDifficulty: 0.50,
    effects: {
      economicVitality: -5,
      corruptionIndex: -5,
      socialTension: -3,
      logDesc: '环保条例出台，污染企业受到限制，但经济活力略有下降'
    },
  },
  {
    id: 'motion_education_fund',
    type: 'legislation',
    title: '教育经费保障办法',
    desc: '规定县财政教育支出占比不低于15%，设立专项资金支持农村学校建设。',
    initiator: 'player',    // 玩家可发起
    triggerYear: 1,
    triggerCondition: () => true,
    passageDifficulty: 0.60,
    effects: {
      fiscalHealth: -3,
      socialTension: -4,
      logDesc: '教育经费保障办法实施，群众满意度上升，财政压力增加'
    },
  },

  // ======================================================================
  // 决定类 decision：就重大事项作出决定
  // ======================================================================
  {
    id: 'motion_health_invest',
    type: 'decision',
    title: '乡镇卫生院提质工程',
    desc: '县财政连续三年每年增拨800万元用于乡镇卫生院设备更新和全科医生引进。',
    initiator: 'player',
    triggerYear: 2,
    triggerCondition: () => true,
    passageDifficulty: 0.65,
    effects: {
      fiscalHealth: -4,
      socialTension: -5,
      logDesc: '乡镇卫生院改造项目启动，基层医疗条件得到改善'
    },
  },
  {
    id: 'motion_tourism_dev',
    type: 'decision',
    title: '古城文旅融合发展方案',
    desc: '以正定古城为核心，整合隆兴寺、开元寺等资源，创建国家5A级旅游景区。',
    initiator: 'player',
    triggerYear: 3,
    triggerCondition: () => {
      const ts = timeSystem;
      return ts && ts.year >= 1990;
    },
    passageDifficulty: 0.55,
    effects: {
      economicVitality: 6,
      fiscalHealth: -2,
      logDesc: '古城文旅融合方案通过，旅游业成为新的增长点'
    },
  },
  {
    id: 'motion_traffic',
    type: 'decision',
    title: '城乡交通一体化规划',
    desc: '新建3条乡镇公路，改造县城主干道，开通县城至各乡镇公交线路。',
    initiator: 'player',
    triggerYear: 2,
    triggerCondition: () => true,
    passageDifficulty: 0.60,
    effects: {
      fiscalHealth: -5,
      socialTension: -6,
      economicVitality: 3,
      logDesc: '交通规划实施后，城乡联系更加紧密'
    },
  },
  {
    id: 'motion_tech_park',
    type: 'decision',
    title: '高新技术产业孵化器建设',
    desc: '在工业园区内设立科技企业孵化器，提供租金减免和税收优惠吸引创新企业。',
    initiator: 'player',
    triggerYear: 3,
    triggerCondition: () => true,
    passageDifficulty: 0.50,
    effects: {
      economicVitality: 8,
      fiscalHealth: -3,
      logDesc: '孵化器建成，吸引了多家科技企业入驻'
    },
  },

  // ======================================================================
  // 决议类 resolution：审议报告/预算等常规事务
  // ======================================================================
  {
    id: 'motion_gov_report',
    type: 'resolution',
    title: '政府工作报告',
    desc: '审议并批准本年度政府工作报告，总结过去一年施政成果并规划下年工作。',
    initiator: 'government', // 政府固定发起
    triggerYear: 1,
    triggerCondition: () => {
      const ts = timeSystem;
      return ts && ts.month === 3; // 每年3月
    },
    passageDifficulty: 0.75, // 政府报告通过率基准较高
    effects: {
      logDesc: '政府工作报告获人大代表审议通过'
    },
    // 特殊：通过率与玩家政绩挂钩
    dynamicDifficulty: function() {
      const evalSys = gameEngine.getSystem('evaluation');
      const evalData = stateManager.get('evaluation');
      const total = evalData ? (evalData.total || 60) : 60;
      // 考核分每高10分，通过率+8%
      return 0.50 + (total / 100) * 0.40; // 50%~90%
    },
  },
  {
    id: 'motion_budget',
    type: 'resolution',
    title: '年度财政预算草案',
    desc: '审议并批准下一年度财政预算草案，明确各项收支安排。',
    initiator: 'government',
    triggerYear: 1,
    triggerCondition: () => {
      const ts = timeSystem;
      return ts && ts.month === 1; // 每年1月
    },
    passageDifficulty: 0.65,
    effects: {
      logDesc: '财政预算草案经人大审议通过'
    },
    // 预算审议有专门的 UI（见预算审议模块），此处只做基础数据
  },
  {
    id: 'motion_audit',
    type: 'resolution',
    title: '上年度财政决算报告',
    desc: '审议上年度财政收支决算情况，审计部门报告预算执行审计结果。',
    initiator: 'government',
    triggerYear: 2,
    triggerCondition: () => {
      const ts = timeSystem;
      return ts && ts.month === 6; // 每年6月
    },
    passageDifficulty: 0.65,
    effects: {
      logDesc: '上年度财政决算获人大批准'
    },
  },
];

/** 获取当前可触发的议案列表 */
function getActiveMotions() {
  const ts = timeSystem;
  const currentYear = ts ? ts.termYear : 1;
  return NPC_MOTIONS.filter(function(m) {
    if (!m.triggerCondition()) return false;
    if (m.triggerYear > currentYear) return false;
    return true;
  });
}

/** 获取某个议案的动态通过率 */
function getMotionPassRate(motion) {
  if (typeof motion.dynamicDifficulty === 'function') {
    return motion.dynamicDifficulty();
  }
  return motion.passageDifficulty;
}
