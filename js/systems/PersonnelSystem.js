/**
 * PersonnelSystem - 人事管理系统（正定县真实版）
 * 4.3 干部管理、调整、培养
 * 基于正定县人民政府实际部委办局设置
 */
class PersonnelSystem {
  constructor() { this.engine = null; this.officials = []; }

  init(config) {
    this._initOfficials();
    stateManager.register('personnel', {
      officials: this.officials.map(o => o.toJSON()),
      morale: 60,
    });
  }

  _initOfficials() {
    // ===== 县委常委会（9人） =====
    // 书记（玩家）
    // 常委按真实正定县设置
    const committee = [
      { id: 'magistrate', name: '王立永', title: '县长', rank: '正处', age: 50,
        faction: '县长系', voteWeight: 1.5, _managementTier: 'city', _appointmentType: 'gov',
        abilities: { politics: 70, economy: 80, personnel: 65, crisis: 68, integrity: 75,
                     profession: 78, execution: 82, coordination: 70, innovation: 55 },
        traits: ['务实', '执行力强'],
        relations: { player: 55, secretary: 55, staffTrust: 72 },
        demands: { taskCompletion: 0.3, fiscalSafety: 0.25, economicGrowth: 0.3, stability: 0.15 },
        desc: '政府一把手，负责全县经济和社会发展。书记管方向，县长管执行。',
        _ambition: 65, _background: ['发改出身', '乡镇任职'], _domain: 'general', _reportsTo: null,
        _factionId: 'magistrate' },
      { id: 'deputy_secretary', name: '赵刚', title: '县委副书记（专职）', rank: '副处', age: 47,
        faction: '书记系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 80, economy: 60, personnel: 75, crisis: 65, integrity: 82,
                     profession: 68, execution: 72, coordination: 78, innovation: 45 },
        traits: ['善协调', '稳健'],
        relations: { player: 60, secretary: 75, staffTrust: 68 },
        demands: { partyBuilding: 0.35, cadreMgmt: 0.3, stability: 0.2, agriculture: 0.15 },
        desc: '协助书记处理日常事务，分管农业农村、群团、党校等工作。',
        _ambition: 55, _background: ['两办出身', '稳健'], _domain: 'general', _reportsTo: null,
        _factionId: 'secretary' },
      { id: 'deputy_magistrate', name: '梁永文', title: '常务副县长', rank: '副处', age: 46,
        faction: '县长系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'gov',
        abilities: { politics: 68, economy: 82, personnel: 62, crisis: 70, integrity: 72,
                     profession: 80, execution: 78, coordination: 72, innovation: 52 },
        traits: ['专业', '务实'],
        relations: { player: 50, secretary: 55, staffTrust: 70 },
        demands: { fiscalSafety: 0.35, economicGrowth: 0.3, projectMgmt: 0.2, reform: 0.15 },
        desc: '协助县长负责县政府常务工作，分管财政、发改、统计、审计。',
        _ambition: 62, _background: ['财政出身', '专业'], _domain: 'economy', _reportsTo: 'magistrate',
        _factionId: 'magistrate' },
      { id: 'discipline', name: '陈洁', title: '纪委书记/监委主任', rank: '副处', age: 49,
        faction: '空降系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 88, economy: 50, personnel: 72, crisis: 78, integrity: 95,
                     profession: 85, execution: 80, coordination: 60, innovation: 40 },
        traits: ['正直', '原则性强', '铁面'],
        relations: { player: 45, secretary: 55, staffTrust: 65 },
        demands: { antiCorruption: 0.5, discipline: 0.3, audit: 0.2 },
        desc: '负责全县党的纪律检查、监察和反腐败工作。独立性强，不受书记直接指挥。',
        _ambition: 35, _background: ['纪检出身', '省厅空降'], _domain: 'party', _reportsTo: null,
        _factionId: 'appointed' },
      { id: 'organization', name: '周明', title: '组织部长', rank: '副处', age: 44,
        faction: '书记系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 78, economy: 55, personnel: 88, crisis: 60, integrity: 80,
                     profession: 82, execution: 75, coordination: 76, innovation: 48 },
        traits: ['谨慎', '识人'],
        relations: { player: 65, secretary: 80, staffTrust: 75 },
        demands: { cadreMgmt: 0.4, partyBuilding: 0.25, cadreTraining: 0.2, inspection: 0.15 },
        desc: '负责全县干部选拔任用、考核管理、基层党组织建设。书记的人事臂膀。',
        _ambition: 48, _background: ['两办出身', '识人'], _domain: 'party', _reportsTo: 'deputy_secretary',
        _factionId: 'secretary' },
      { id: 'propaganda', name: '孙丽', title: '宣传部长', rank: '副处', age: 42,
        faction: '书记系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 75, economy: 50, personnel: 60, crisis: 68, integrity: 78,
                     profession: 80, execution: 70, coordination: 82, innovation: 65 },
        traits: ['善交际', '口才好'],
        relations: { player: 55, secretary: 60, staffTrust: 68 },
        demands: { ideology: 0.35, media: 0.3, culture: 0.2, networkSecurity: 0.15 },
        desc: '负责意识形态、新闻宣传、精神文明建设、舆情管控。',
        _ambition: 58, _background: ['两办出身', '乡镇任职'], _domain: 'party', _reportsTo: null,
        _factionId: 'secretary' },
      { id: 'politics_law', name: '马洪涛', title: '政法委书记', rank: '副处', age: 48,
        faction: '官僚系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 76, economy: 45, personnel: 65, crisis: 88, integrity: 82,
                     profession: 78, execution: 76, coordination: 70, innovation: 40 },
        traits: ['谨慎', '威严'],
        relations: { player: 50, secretary: 55, staffTrust: 72 },
        demands: { socialStability: 0.4, legalSystem: 0.25, publicSecurity: 0.2, antiEvil: 0.15 },
        desc: '负责全县政法系统（公安/法院/检察院/司法）的协调领导。',
        _ambition: 42, _background: ['政法口', '公安出身'], _domain: 'stability', _reportsTo: null,
        _factionId: 'bureaucrat' },
      { id: 'united_front', name: '吴德', title: '统战部长', rank: '副处', age: 45,
        faction: '本土系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 68, economy: 50, personnel: 55, crisis: 55, integrity: 75,
                     profession: 60, execution: 62, coordination: 85, innovation: 50 },
        traits: ['圆滑', '人脉广'],
        relations: { player: 50, secretary: 50, staffTrust: 65 },
        demands: { unitedFront: 0.3, ethnicReligion: 0.25, nonPublicEconomy: 0.25, overseas: 0.2 },
        desc: '负责统一战线工作，联系民主党派、工商联、无党派人士、民族宗教。',
        _ambition: 52, _background: ['乡镇任职', '本地籍'], _domain: 'party', _reportsTo: null,
        _factionId: 'local' },
      { id: 'office_director', name: '郑浩', title: '县委办主任', rank: '副处', age: 43,
        faction: '书记系', voteWeight: 1, _managementTier: 'city', _appointmentType: 'party',
        abilities: { politics: 72, economy: 55, personnel: 60, crisis: 65, integrity: 80,
                     profession: 70, execution: 82, coordination: 80, innovation: 45 },
        traits: ['忠诚', '执行力强'],
        relations: { player: 70, secretary: 85, staffTrust: 78 },
        demands: { serviceGuarantee: 0.35, coordination: 0.3, confidentiality: 0.2, inspection: 0.15 },
        desc: '负责县委机关日常运转、文电处理、会议组织、督查督办。书记的"大管家"。',
        _ambition: 45, _background: ['两办出身', '秘书'], _domain: 'party', _reportsTo: 'deputy_secretary',
        _factionId: 'secretary' },
    ];

    for (const m of committee) {
      this.officials.push(new Official(m));
    }

    // ===== 县政府工作部门局长（正定县真实设置） =====
    const bureauChiefs = [
      { id: 'dev_reform', name: '张建国', title: '发改局局长', rank: '正科', age: 47, faction: '县长系',
        abilities: { politics: 65, economy: 78, personnel: 60, crisis: 55, integrity: 75, profession: 78, execution: 72, coordination: 68, innovation: 55 },
        traits: ['稳健', '懂经济'], relations: { player: 55, secretary: 55, staffTrust: 68 },
        _ambition: 60, _background: ['发改出身', '本县成长'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'magistrate' },
      { id: 'edu_bureau', name: '李志强', title: '教育局局长', rank: '正科', age: 50, faction: '官僚系',
        abilities: { politics: 72, economy: 50, personnel: 65, crisis: 50, integrity: 82, profession: 82, execution: 70, coordination: 65, innovation: 45 },
        traits: ['严谨', '守成'], relations: { player: 50, secretary: 50, staffTrust: 72 },
        _ambition: 40, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'propaganda', _factionId: 'bureaucrat' },
      { id: 'tech_bureau', name: '王小明', title: '科工局局长', rank: '正科', age: 44, faction: '空降系',
        abilities: { politics: 55, economy: 75, personnel: 55, crisis: 50, integrity: 70, profession: 75, execution: 68, coordination: 72, innovation: 68 },
        traits: ['创新', '懂技术'], relations: { player: 55, secretary: 50, staffTrust: 62 },
        _ambition: 65, _background: ['发改出身', '省厅空降'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'appointed' },
      { id: 'public_security', name: '张铁军', title: '公安局局长', rank: '正科', age: 46, faction: '官僚系',
        abilities: { politics: 70, economy: 45, personnel: 55, crisis: 85, integrity: 78, profession: 80, execution: 85, coordination: 65, innovation: 40 },
        traits: ['威严', '果断'], relations: { player: 50, secretary: 55, staffTrust: 75 },
        _ambition: 48, _background: ['公安出身', '政法口'], _domain: 'stability', _reportsTo: 'politics_law', _factionId: 'bureaucrat' },
      { id: 'civil_affairs', name: '刘爱民', title: '民政局局长', rank: '正科', age: 49, faction: '本土系',
        abilities: { politics: 60, economy: 50, personnel: 70, crisis: 55, integrity: 80, profession: 72, execution: 68, coordination: 70, innovation: 40 },
        traits: ['踏实', '老好人'], relations: { player: 55, secretary: 50, staffTrust: 70 },
        _ambition: 35, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'finance_bureau', name: '李为民', title: '财政局局长', rank: '正科', age: 48, faction: '县长系',
        abilities: { politics: 62, economy: 88, personnel: 55, crisis: 60, integrity: 90, profession: 88, execution: 75, coordination: 62, innovation: 42 },
        traits: ['谨慎', '守财'], relations: { player: 55, secretary: 60, staffTrust: 75 },
        _ambition: 50, _background: ['财政出身', '本县成长'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'magistrate' },
      { id: 'hr_bureau', name: '赵志远', title: '人社局局长', rank: '正科', age: 46, faction: '书记系',
        abilities: { politics: 68, economy: 55, personnel: 75, crisis: 50, integrity: 78, profession: 74, execution: 70, coordination: 68, innovation: 45 },
        traits: ['圆滑', '谨慎'], relations: { player: 60, secretary: 65, staffTrust: 68 },
        _ambition: 55, _background: ['两办出身', '本县成长'], _domain: 'livelihood', _reportsTo: 'organization', _factionId: 'secretary' },
      { id: 'natural_resources', name: '孙大伟', title: '自然资源局局长', rank: '正科', age: 47, faction: '县长系',
        abilities: { politics: 55, economy: 70, personnel: 50, crisis: 50, integrity: 72, profession: 76, execution: 72, coordination: 65, innovation: 45 },
        traits: ['务实', '懂土地'], relations: { player: 50, secretary: 50, staffTrust: 65 },
        _ambition: 52, _background: ['本县成长', '乡镇任职'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'magistrate' },
      { id: 'housing_bureau', name: '赵铁柱', title: '住建局局长', rank: '正科', age: 45, faction: '本土系',
        abilities: { politics: 50, economy: 60, personnel: 50, crisis: 55, integrity: 68, profession: 78, execution: 76, coordination: 63, innovation: 50 },
        traits: ['实干', '粗放'], relations: { player: 48, secretary: 50, staffTrust: 62 },
        _ambition: 58, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'urban_admin', name: '王 勇', title: '城管局局长', rank: '正科', age: 43, faction: '本土系',
        abilities: { politics: 55, economy: 50, personnel: 45, crisis: 75, integrity: 65, profession: 72, execution: 80, coordination: 60, innovation: 38 },
        traits: ['敢干', '争议大'], relations: { player: 45, secretary: 45, staffTrust: 55 },
        _ambition: 68, _background: ['乡镇任职', '本县成长'], _domain: 'stability', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'transport_bureau', name: '陈德胜', title: '交通局局长', rank: '正科', age: 49, faction: '本土系',
        abilities: { politics: 55, economy: 60, personnel: 50, crisis: 55, integrity: 74, profession: 76, execution: 72, coordination: 70, innovation: 45 },
        traits: ['稳健', '实干'], relations: { player: 52, secretary: 50, staffTrust: 68 },
        _ambition: 45, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'agriculture_bureau', name: '刘丰收', title: '农业农村局局长', rank: '正科', age: 50, faction: '本土系',
        abilities: { politics: 58, economy: 55, personnel: 55, crisis: 50, integrity: 82, profession: 80, execution: 72, coordination: 68, innovation: 42 },
        traits: ['懂农', '朴实'], relations: { player: 55, secretary: 52, staffTrust: 72 },
        _ambition: 38, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'water_bureau', name: '张水利', title: '水利局局长', rank: '正科', age: 48, faction: '本土系',
        abilities: { politics: 50, economy: 55, personnel: 50, crisis: 55, integrity: 76, profession: 74, execution: 70, coordination: 65, innovation: 40 },
        traits: ['技术型', '谨慎'], relations: { player: 50, secretary: 48, staffTrust: 65 },
        _ambition: 42, _background: ['本县成长', '乡镇任职'], _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'culture_tourism', name: '周文化', title: '文旅局局长', rank: '正科', age: 44, faction: '无派系',
        abilities: { politics: 65, economy: 50, personnel: 55, crisis: 45, integrity: 70, profession: 72, execution: 65, coordination: 78, innovation: 60 },
        traits: ['有创意', '点子多'], relations: { player: 55, secretary: 55, staffTrust: 62 },
        _ambition: 60, _background: ['本县成长', '两办出身'], _domain: 'livelihood', _reportsTo: 'propaganda', _factionId: 'nonaligned' },
      { id: 'health_bureau', name: '刘 伟', title: '卫健局局长', rank: '正科', age: 46, faction: '空降系',
        abilities: { politics: 60, economy: 50, personnel: 60, crisis: 65, integrity: 80, profession: 78, execution: 68, coordination: 66, innovation: 48 },
        traits: ['专业', '稳健'], relations: { player: 50, secretary: 50, staffTrust: 68 },
        _ambition: 45, _background: ['省厅空降', '专业'], _domain: 'livelihood', _reportsTo: 'propaganda', _factionId: 'appointed' },
      { id: 'audit_bureau', name: '陈公正', title: '审计局局长', rank: '正科', age: 47, faction: '空降系',
        abilities: { politics: 75, economy: 60, personnel: 65, crisis: 55, integrity: 92, profession: 85, execution: 75, coordination: 58, innovation: 35 },
        traits: ['铁面', '严谨'], relations: { player: 45, secretary: 45, staffTrust: 65 },
        _ambition: 30, _background: ['省厅空降', '纪检出身'], _domain: 'party', _reportsTo: 'discipline', _factionId: 'appointed' },
      { id: 'market_bureau', name: '孙市场', title: '市场监管局局长', rank: '正科', age: 45, faction: '无派系',
        abilities: { politics: 55, economy: 65, personnel: 50, crisis: 50, integrity: 72, profession: 74, execution: 70, coordination: 68, innovation: 48 },
        traits: ['务实', '灵活'], relations: { player: 50, secretary: 48, staffTrust: 62 },
        _ambition: 55, _background: ['本县成长', '乡镇任职'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'nonaligned' },
      { id: 'statistics_bureau', name: '郑数字', title: '统计局局长', rank: '正科', age: 52, faction: '县长系',
        abilities: { politics: 55, economy: 70, personnel: 50, crisis: 45, integrity: 80, profession: 78, execution: 65, coordination: 60, innovation: 35 },
        traits: ['老成', '谨慎'], relations: { player: 52, secretary: 50, staffTrust: 65 },
        _ambition: 40, _background: ['发改出身', '本县成长'], _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'magistrate' },
    ];

    for (const b of bureauChiefs) {
      this.officials.push(new Official({
        ...b,
        rank: b.rank || '正科',
        _managementTier: 'county',
        _appointmentType: 'gov', // 政府组成部门负责人均为政府职务
        abilities: b.abilities || { profession: 70, execution: 65, coordination: 60, innovation: 45, integrity: 75 },
        demands: { taskCompletion: 0.4, bureauManagement: 0.3, innovation: 0.15, promotion: 0.15 },
        workStatus: { satisfaction: 65, health: 80 + Math.floor(Math.random() * 15), performance: '良好', complaints: 0 },
        adjustable: { matchRate: 75 + Math.floor(Math.random() * 15), promotionExpect: '副处', potentialIssues: null },
      }));
    }

    // ===== 党委工作部门负责人（新增） =====
    const partyDeptHeads = [
      { id: 'discipline_deputy', name: '王振宇', title: '纪委副书记/监委副主任', rank: '正科', faction: '空降系',
        abilities: { politics: 80, economy: 45, personnel: 60, crisis: 70, integrity: 90, profession: 78, execution: 72, coordination: 55, innovation: 35 },
        _domain: 'party', _reportsTo: 'discipline', _factionId: 'appointed' },
      { id: 'party_office_deputy', name: '李文华', title: '县委办副主任(保密机要局)', rank: '正科', faction: '书记系',
        abilities: { politics: 70, economy: 50, personnel: 55, crisis: 60, integrity: 80, profession: 68, execution: 75, coordination: 78, innovation: 40 },
        _domain: 'party', _reportsTo: 'office_director', _factionId: 'secretary' },
      { id: 'organization_deputy', name: '赵晓东', title: '组织部副部长(公务员局)', rank: '正科', faction: '书记系',
        abilities: { politics: 75, economy: 50, personnel: 82, crisis: 55, integrity: 78, profession: 75, execution: 70, coordination: 72, innovation: 42 },
        _domain: 'party', _reportsTo: 'organization', _factionId: 'secretary' },
      { id: 'propaganda_deputy', name: '陈思远', title: '宣传部副部长(精神文明办)', rank: '正科', faction: '书记系',
        abilities: { politics: 72, economy: 45, personnel: 55, crisis: 62, integrity: 76, profession: 74, execution: 65, coordination: 80, innovation: 60 },
        _domain: 'party', _reportsTo: 'propaganda', _factionId: 'secretary' },
      { id: 'united_front_deputy', name: '杨晓燕', title: '统战部副部长(民宗局)', rank: '正科', faction: '本土系',
        abilities: { politics: 65, economy: 45, personnel: 50, crisis: 50, integrity: 72, profession: 58, execution: 60, coordination: 82, innovation: 45 },
        _domain: 'party', _reportsTo: 'united_front', _factionId: 'local' },
      { id: 'cyberspace_head', name: '刘思远', title: '网信办主任(互联网信息办)', rank: '正科', faction: '空降系',
        abilities: { politics: 68, economy: 55, personnel: 50, crisis: 60, integrity: 74, profession: 72, execution: 68, coordination: 70, innovation: 72 },
        _domain: 'party', _reportsTo: 'propaganda', _factionId: 'appointed' },
      { id: 'institutional_compile_head', name: '张守正', title: '编办主任', rank: '正科', faction: '官僚系',
        abilities: { politics: 62, economy: 50, personnel: 65, crisis: 45, integrity: 78, profession: 70, execution: 68, coordination: 65, innovation: 35 },
        _domain: 'party', _reportsTo: 'organization', _factionId: 'bureaucrat' },
      { id: 'direct_work_head', name: '马建国', title: '县直机关工委书记', rank: '正科', faction: '书记系',
        abilities: { politics: 74, economy: 45, personnel: 60, crisis: 50, integrity: 80, profession: 65, execution: 72, coordination: 75, innovation: 38 },
        _domain: 'party', _reportsTo: 'organization', _factionId: 'secretary' },
      { id: 'inspection_office_head', name: '赵清廉', title: '巡察办主任', rank: '正科', faction: '空降系',
        abilities: { politics: 82, economy: 40, personnel: 55, crisis: 72, integrity: 92, profession: 76, execution: 74, coordination: 58, innovation: 32 },
        _domain: 'party', _reportsTo: 'discipline', _factionId: 'appointed' },
      { id: 'petition_bureau_head', name: '黄为民', title: '信访局局长', rank: '正科', faction: '本土系',
        abilities: { politics: 60, economy: 45, personnel: 55, crisis: 75, integrity: 78, profession: 68, execution: 70, coordination: 80, innovation: 40 },
        _domain: 'stability', _reportsTo: 'politics_law', _factionId: 'local' },
      { id: 'retired_cadre_head', name: '周国栋', title: '老干部局局长', rank: '正科', faction: '无派系',
        abilities: { politics: 65, economy: 40, personnel: 60, crisis: 40, integrity: 76, profession: 55, execution: 62, coordination: 78, innovation: 30 },
        _domain: 'party', _reportsTo: 'organization', _factionId: 'nonaligned' },
    ];

    for (const p of partyDeptHeads) {
      this.officials.push(new Official({
        ...p,
        rank: p.rank || '正科',
        _managementTier: 'county',
        _appointmentType: 'party',
        abilities: p.abilities || { profession: 65, execution: 65, coordination: 65, innovation: 40, integrity: 75 },
        demands: { taskCompletion: 0.4, bureauManagement: 0.3, innovation: 0.15, promotion: 0.15 },
        workStatus: { satisfaction: 65, health: 80 + Math.floor(Math.random() * 15), performance: '良好', complaints: 0 },
        adjustable: { matchRate: 75 + Math.floor(Math.random() * 15), promotionExpect: '副处', potentialIssues: null },
        traits: p.traits || ['本县成长'],
        relations: p.relations || { player: 50, secretary: 50, staffTrust: 60 },
        _background: p._background || ['本县成长'],
      }));
    }

    // ===== 政府组成部门负责人补充（新增科室） =====
    const govDeptHeads = [
      { id: 'gov_office_head', name: '陈志国', title: '县政府办主任(人防办)', rank: '正科', faction: '县长系',
        abilities: { politics: 65, economy: 65, personnel: 60, crisis: 60, integrity: 76, profession: 72, execution: 78, coordination: 82, innovation: 45 },
        _domain: 'general', _reportsTo: 'magistrate', _factionId: 'magistrate' },
      { id: 'justice_head', name: '徐明理', title: '司法局局长', rank: '正科', faction: '官僚系',
        abilities: { politics: 68, economy: 45, personnel: 55, crisis: 60, integrity: 85, profession: 80, execution: 72, coordination: 65, innovation: 38 },
        _domain: 'stability', _reportsTo: 'politics_law', _factionId: 'bureaucrat' },
      { id: 'human_resources_head', name: '宋长河', title: '人社局局长', rank: '正科', faction: '县长系',
        abilities: { politics: 60, economy: 60, personnel: 72, crisis: 55, integrity: 78, profession: 74, execution: 70, coordination: 72, innovation: 42 },
        _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'magistrate' },
      { id: 'natural_resources_head', name: '韩志远', title: '自然资源和规划局局长', rank: '正科', faction: '本土系',
        abilities: { politics: 55, economy: 65, personnel: 55, crisis: 50, integrity: 72, profession: 76, execution: 74, coordination: 68, innovation: 45 },
        _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'housing_head', name: '田建平', title: '住建局局长', rank: '正科', faction: '本土系',
        abilities: { politics: 55, economy: 62, personnel: 55, crisis: 55, integrity: 70, profession: 75, execution: 72, coordination: 70, innovation: 42 },
        _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'urban_management_head', name: '刘振国', title: '城管局局长(园林局)', rank: '正科', faction: '官僚系',
        abilities: { politics: 50, economy: 50, personnel: 55, crisis: 65, integrity: 72, profession: 70, execution: 76, coordination: 68, innovation: 38 },
        _domain: 'stability', _reportsTo: 'deputy_magistrate', _factionId: 'bureaucrat' },
      { id: 'water_resources_head', name: '林海涛', title: '水利局局长', rank: '正科', faction: '本土系',
        abilities: { politics: 50, economy: 55, personnel: 50, crisis: 60, integrity: 74, profession: 76, execution: 70, coordination: 65, innovation: 35 },
        _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'local' },
      { id: 'commerce_head', name: '程志刚', title: '商务局局长', rank: '正科', faction: '空降系',
        abilities: { politics: 58, economy: 72, personnel: 55, crisis: 50, integrity: 74, profession: 70, execution: 68, coordination: 78, innovation: 62 },
        _domain: 'economy', _reportsTo: 'deputy_magistrate', _factionId: 'appointed' },
      { id: 'culture_tourism_head', name: '文雅丽', title: '文广体旅局局长(文物局)', rank: '正科', faction: '官僚系',
        abilities: { politics: 62, economy: 55, personnel: 50, crisis: 45, integrity: 78, profession: 82, execution: 68, coordination: 76, innovation: 60 },
        _domain: 'livelihood', _reportsTo: 'propaganda', _factionId: 'bureaucrat' },
      { id: 'veterans_head', name: '孙卫国', title: '退役军人事务局局长', rank: '正科', faction: '无派系',
        abilities: { politics: 60, economy: 45, personnel: 55, crisis: 50, integrity: 80, profession: 68, execution: 70, coordination: 72, innovation: 35 },
        _domain: 'livelihood', _reportsTo: 'magistrate', _factionId: 'nonaligned' },
      { id: 'emergency_head', name: '周建国', title: '应急管理局局长(地震局)', rank: '正科', faction: '官僚系',
        abilities: { politics: 55, economy: 50, personnel: 55, crisis: 85, integrity: 78, profession: 76, execution: 80, coordination: 68, innovation: 40 },
        _domain: 'stability', _reportsTo: 'deputy_magistrate', _factionId: 'bureaucrat' },
      { id: 'administrative_approval_head', name: '张明辉', title: '行政审批局局长(政务服务管理办)', rank: '正科', faction: '空降系',
        abilities: { politics: 58, economy: 55, personnel: 50, crisis: 45, integrity: 80, profession: 72, execution: 78, coordination: 70, innovation: 65 },
        _domain: 'general', _reportsTo: 'deputy_magistrate', _factionId: 'appointed' },
      { id: 'medical_security_head', name: '李建民', title: '医保局局长', rank: '正科', faction: '无派系',
        abilities: { politics: 55, economy: 50, personnel: 52, crisis: 50, integrity: 76, profession: 70, execution: 68, coordination: 66, innovation: 38 },
        _domain: 'livelihood', _reportsTo: 'deputy_magistrate', _factionId: 'nonaligned' },
    ];

    for (const g of govDeptHeads) {
      this.officials.push(new Official({
        ...g,
        rank: g.rank || '正科',
        _managementTier: 'county',
        _appointmentType: 'gov',
        abilities: g.abilities || { profession: 65, execution: 65, coordination: 65, innovation: 40, integrity: 75 },
        demands: { taskCompletion: 0.4, bureauManagement: 0.3, innovation: 0.15, promotion: 0.15 },
        workStatus: { satisfaction: 65, health: 80 + Math.floor(Math.random() * 15), performance: '良好', complaints: 0 },
        adjustable: { matchRate: 75 + Math.floor(Math.random() * 15), promotionExpect: '副处', potentialIssues: null },
        traits: g.traits || ['本县成长'],
        relations: g.relations || { player: 50, secretary: 50, staffTrust: 60 },
        _background: g._background || ['本县成长'],
      }));
    }

    // 初始干部士气
    stateManager.get('personnel').morale = 60 + Math.floor(Math.random() * 15);

    // 构建朋友圈关系网络
    this._buildFriendsNetwork();

    // 派系朋友圈过滤（延迟到派系系统初始化后执行）
    var factionSys = this.engine ? this.engine.getSystem('factions') : null;
    if (factionSys && factionSys.factions && Object.keys(factionSys.factions).length > 0) {
      this._filterFactionFriends();
    } else {
      // 注册等待 GAME_INIT 事件（此时派系系统已完成 init）
      eventBus.on(EVENTS.GAME_INIT, function() {
        this._filterFactionFriends();
      }.bind(this));
    }
  }

  /** 获取所有干部（含常委和局长） */
  getAll() { return this.officials; }

  /** 按ID获取 */
  get(id) { return this.officials.find(o => o.id === id); }

  /** 获取常委会成员（9人） */
  getCommitteeMembers() {
    const ids = ['magistrate', 'deputy_secretary', 'deputy_magistrate',
                 'discipline', 'organization', 'propaganda',
                 'politics_law', 'united_front', 'office_director'];
    return ids.map(id => this.get(id)).filter(Boolean);
  }

  /** 获取局长列表 */
  getBureauChiefs() {
    const standingIds = ['magistrate', 'deputy_secretary', 'deputy_magistrate',
                         'discipline', 'organization', 'propaganda',
                         'politics_law', 'united_front', 'office_director'];
    return this.officials.filter(o => !standingIds.includes(o.id));
  }

  /** 常委会投票（民主集中制） */
  holdVote(issue) {
    const members = this.getCommitteeMembers();
    // 书记（玩家）有投票主导权，但不直接计入票数
    // 一票否决：书记可行使否决权
    // 县长需2/3以上通过约束（重大事项）
    const result = calculator.calcCommitteeVote(members, issue);
    return result;
  }

  /** 书记行使一票否决权 */
  oneVoteVeto(issue) {
    eventBus.emit(EVENTS.COMMITTEE_VOTE, {
      issue, result: { veto: true, reason: '书记行使一票否决权' },
    });
    return { vetoed: true };
  }

  /** 根据业务关联和分管领域自动构建朋友圈关系网络 */
  _buildFriendsNetwork() {
    // 官员ID映射表
    var all = this.officials;
    var map = {};
    for (var i = 0; i < all.length; i++) {
      map[all[i].id] = all[i];
    }

    // 预定义朋友圈关系（按业务关联）
    var friendConfig = {
      // ——— 县政府经济口 ———
      'magistrate': ['deputy_magistrate', 'finance_bureau', 'dev_reform'],
      'deputy_magistrate': ['magistrate', 'finance_bureau', 'dev_reform', 'statistics_bureau'],
      'finance_bureau': ['deputy_magistrate', 'dev_reform', 'audit_bureau', 'magistrate'],
      'dev_reform': ['deputy_magistrate', 'finance_bureau', 'statistics_bureau', 'tech_bureau'],
      'statistics_bureau': ['dev_reform', 'finance_bureau'],
      'tech_bureau': ['dev_reform', 'finance_bureau'],
      'natural_resources': ['housing_bureau', 'dev_reform'],
      'market_bureau': ['urban_admin', 'dev_reform'],

      // ——— 书记系 ———
      'deputy_secretary': ['office_director', 'organization', 'hr_bureau'],
      'office_director': ['deputy_secretary', 'organization'],
      'organization': ['deputy_secretary', 'hr_bureau', 'office_director'],
      'hr_bureau': ['organization', 'finance_bureau'],

      // ——— 政法口 ———
      'politics_law': ['public_security', 'discipline'],
      'public_security': ['politics_law', 'urban_admin'],

      // ——— 宣传口 ———
      'propaganda': ['edu_bureau', 'culture_tourism', 'health_bureau'],
      'edu_bureau': ['propaganda', 'culture_tourism'],
      'culture_tourism': ['propaganda', 'edu_bureau', 'united_front'],
      'health_bureau': ['propaganda', 'civil_affairs'],

      // ——— 民生口（本地派） ———
      'civil_affairs': ['hr_bureau', 'health_bureau'],
      'housing_bureau': ['natural_resources', 'urban_admin', 'transport_bureau'],
      'transport_bureau': ['housing_bureau', 'agriculture_bureau'],
      'agriculture_bureau': ['transport_bureau', 'water_bureau'],
      'water_bureau': ['agriculture_bureau', 'natural_resources'],

      // ——— 城管 ———
      'urban_admin': ['public_security', 'market_bureau', 'housing_bureau'],

      // ——— 独立派 ———
      'discipline': ['audit_bureau'],
      'audit_bureau': ['discipline', 'finance_bureau'],

      // ——— 统战 ———
      'united_front': ['culture_tourism', 'edu_bureau'],
    };

    // 应用朋友圈配置
    for (var id in friendConfig) {
      var official = map[id];
      if (!official) continue;
      var friendIds = friendConfig[id] || [];

      // 去重+过滤无效ID
      var uniqueFriends = [];
      var seen = {};
      seen[id] = true; // 不把自己加进去
      for (var fi = 0; fi < friendIds.length; fi++) {
        var fId = friendIds[fi];
        if (!seen[fId] && map[fId]) {
          seen[fId] = true;
          uniqueFriends.push(fId);
        }
      }
      official._friends = uniqueFriends;
      official._network = uniqueFriends.length; // 基础网络规模
    }

    // 补充：未在配置中的官员自动根据 domain 和 reportsTo 生成朋友圈
    for (var ci = 0; ci < all.length; ci++) {
      var o = all[ci];
      if (!o || !o._friends) continue;
      // 如果朋友圈为空，根据reportsTo和同domain生成
      if (o._friends.length === 0) {
        var candidates = [];
        for (var cj = 0; cj < all.length; cj++) {
          var other = all[cj];
          if (!other || other.id === o.id) continue;
          // 同领域的人
          if (other._domain === o._domain && o._domain !== 'general') {
            candidates.push(other.id);
            continue;
          }
          // 上下级关系
          if (other.id === o._reportsTo || o.id === other._reportsTo) {
            if (candidates.indexOf(other.id) === -1) candidates.push(other.id);
          }
        }
        o._friends = candidates.slice(0, 4);
        o._network = o._friends.length;
      }
    }
  }

  /** 派系朋友圈过滤：移除跨敌对派系的好友关系 */
  _filterFactionFriends() {
    var factionSys = this.engine ? this.engine.getSystem('factions') : null;
    if (!factionSys || !factionSys.factions) return;

    var all = this.officials;
    var map = {};
    for (var i = 0; i < all.length; i++) {
      map[all[i].id] = all[i];
    }

    for (var ci = 0; ci < all.length; ci++) {
      var o = all[ci];
      if (!o || !o._friends) continue;
      var myFaction = o._factionId;
      var newFriends = [];

      for (var fi = 0; fi < o._friends.length; fi++) {
        var friendId = o._friends[fi];
        var friend = map[friendId];
        if (!friend) continue;
        var friendFaction = friend._factionId;

        // 检查派系关系：敌对派系（关系 < -15）不能做朋友
        if (myFaction && friendFaction && myFaction !== friendFaction) {
          var rel = factionSys.getRelation(myFaction, friendFaction);
          // 默认关系 < -15 = 敌对，删除好友
          if (rel < -15) {
            continue;
          }
        }

        newFriends.push(friendId);
      }

      // 如果朋友圈被清理后少于3人，从同派系补充
      if (newFriends.length < 3 && myFaction) {
        var sameFactionCandidates = [];
        for (var cj = 0; cj < all.length; cj++) {
          var other = all[cj];
          if (!other || other.id === o.id || other.id === o._reportsTo) continue;
          if (other._factionId === myFaction && newFriends.indexOf(other.id) === -1) {
            sameFactionCandidates.push(other.id);
          }
        }
        // 优先补充上下级
        for (var ck = 0; ck < sameFactionCandidates.length; ck++) {
          if (newFriends.length >= 3) break;
          var candidate = sameFactionCandidates[ck];
          var candOff = map[candidate];
          if (candOff && (o._reportsTo === candidate || candOff._reportsTo === o.id)) {
            if (newFriends.indexOf(candidate) === -1) {
              newFriends.push(candidate);
            }
          }
        }
        // 再补随机
        while (newFriends.length < 3 && sameFactionCandidates.length > 0) {
          var pickIdx = Math.floor(Math.random() * sameFactionCandidates.length);
          var picked = sameFactionCandidates[pickIdx];
          if (newFriends.indexOf(picked) === -1) {
            newFriends.push(picked);
          }
          sameFactionCandidates.splice(pickIdx, 1);
        }
      }

      o._friends = newFriends;
      o._network = newFriends.length;
    }
  }

  /** 人事调动（含朋友圈连锁反应） */
  transfer(officialId, newTitle, newDepartment) {
    const official = this.get(officialId);
    if (!official) return null;
    const oldTitle = official.title;
    official.title = newTitle;
    if (newDepartment) official.department = newDepartment;
    // 满意度变化
    const relationDrop = Math.random() * 10 + 5;
    official.modifyRelation('player', -relationDrop);
    official.workStatus.satisfaction = Math.max(30, (official.workStatus.satisfaction || 60) - 10);

    // 触发朋友圈连锁反应
    var factionSys = this.engine.getSystem('factions');
    if (factionSys) {
      factionSys.onTransfer(officialId);
    }

    eventBus.emit(EVENTS.PERSONNEL_CHANGE, {
      officialId, name: official.name, from: oldTitle, to: newTitle,
    });
    return { success: true, official, relationDrop };
  }

  /** 干部谈话（书记与下属互动） */
  talk(officialId) {
    const official = this.get(officialId);
    if (!official) return null;
    const player = stateManager.get('player');
    if (!player) return null;
    player.modifyStatus('energy', -8);
    player.modifyStatus('stress', -2);
    const relationGain = Math.floor(Math.random() * 5) + 2;
    official.modifyRelation('player', relationGain);
    official.modifyRelation('staffTrust', 2);
    if (Math.random() < 0.15) {
      const keys = Object.keys(official.abilities).filter(k => k !== 'integrity' && k !== 'politics');
      const abil = keys[Math.floor(Math.random() * keys.length)];
      official.train(abil, 0.5);
    }
    return { official, relationGain };
  }

  /** 干部培训 */
  train(officialId, ability, amount) {
    const official = this.get(officialId);
    if (!official) return false;
    official.train(ability, amount);
    return true;
  }


  /** 替换官员（人大任命流程） */
  replaceOfficial(oldId, newData) {
    var old = this.get(oldId);
    if (!old) return null;

    // 记录原官员信息用于日志
    var oldName = old.name;
    var oldTitle = old.title;

    // 修改原官员的职务和状态
    old.title = '调研员';
    old._disciplineStatus = 'transfer';
    old.modifyRelation('player', -20);
    old.relations.player = Math.max(10, old.relations.player - 20);

    // 创建新官员对象（保留原部门位置）
    var newOfficial = new Official({
      id: oldId, // 保持ID不变，引用不受影响
      name: newData.name,
      title: oldTitle,
      rank: old.rank || '正科',
      age: newData.age,
      faction: newData.faction || '书记系',
      abilities: Object.assign({}, newData.abilities),
      traits: newData.traits || [],
      relations: { player: 50, secretary: 50, staffTrust: 50 },
      demands: old.demands || { taskCompletion: 0.4, bureauManagement: 0.3, innovation: 0.15, promotion: 0.15 },
      workStatus: { satisfaction: 60, health: 80, performance: '良好', complaints: 0 },
      adjustables: { matchRate: 70, promotionExpect: '副处', potentialIssues: null },
    });

    // 替换
    var idx = this.officials.indexOf(old);
    if (idx !== -1) {
      this.officials[idx] = newOfficial;
    }

    // 触发朋友圈连锁反应（查处旧官员）
    var factionSys = this.engine.getSystem('factions');
    if (factionSys && newData._isPunish) {
      factionSys.onPunish(oldId);
    } else if (factionSys) {
      factionSys.onPromote(oldId);
    }

    eventBus.emit(EVENTS.PERSONNEL_CHANGE, {
      officialId: oldId, name: oldName + '→' + newData.name, from: oldTitle, to: oldTitle + '(新任)',
    });

    return { oldName: oldName, newName: newData.name, title: oldTitle };
  }

  // ========== 人事权 v2：两级管理 + 任免流程 ==========

  /** 获取市管干部列表（副处级以上：9名常委+县长） */
  getCityManaged() {
    return this.officials.filter(function(o) { return o._managementTier === 'city'; });
  }

  /** 获取县管干部列表（正科级及以下：各局局长） */
  getCountyManaged() {
    return this.officials.filter(function(o) { return o._managementTier === 'county'; });
  }

  /** 获取五人小组成员：书记(玩家)/县长/副书记/纪委书记/组织部长 */
  getFivePersonGroup() {
    return [
      { id: 'player', name: '陈志远', title: '县委书记', role: '书记' },
      this.get('magistrate'),
      this.get('deputy_secretary'),
      this.get('discipline'),
      this.get('organization'),
    ].filter(Boolean);
  }

  /** 计算一位干部对另一位干部的态度（基于派系+朋友圈+关系） */
  calcOfficialAttitude(towardOfficialId, subjectOfficialId) {
    var toward = this.get(towardOfficialId);
    var subject = this.get(subjectOfficialId);
    if (!toward || !subject) return 50;

    var score = 50;
    if (towardOfficialId === subjectOfficialId) return 10; // 自己→坚决反对

    // 派系关系
    if (toward._factionId === subject._factionId) {
      score += 25;
    } else {
      var factionSys = this.engine ? this.engine.getSystem('factions') : null;
      if (factionSys && factionSys.factions[toward._factionId]) {
        var relVal = factionSys.factions[toward._factionId].relations[subject._factionId] || 0;
        score += relVal * 0.5;
      } else {
        score -= 10;
      }
    }

    // 朋友圈
    var friends = toward._friends || [];
    if (friends.indexOf(subjectOfficialId) >= 0) score += 15;

    // 上下级
    if (toward._reportsTo === subjectOfficialId) score += 5;
    if (subject._reportsTo === towardOfficialId) score += 5;

    // 书记系团结
    if (toward._factionId === 'secretary' && subject._factionId === 'secretary') score += 10;
    // 党政张力
    if ((toward._factionId === 'magistrate' && subject._factionId === 'secretary') ||
        (toward._factionId === 'secretary' && subject._factionId === 'magistrate')) score -= 10;

    return calculator.clamp(score, 0, 100);
  }

  /** 获取五人小组对某人的支持度（基于人际关系+派系，非随机）
   *  @param {boolean} isDismissal - true=罢免场景，关系越好越反对罢免 */
  calcFivePersonSupport(officialId, isDismissal) {
    var official = this.get(officialId);
    if (!official) return { avg: 0, members: {} };

    var fiveIds = ['organization', 'discipline', 'deputy_secretary', 'magistrate'];
    var support = {};

    for (var i = 0; i < fiveIds.length; i++) {
      var memberId = fiveIds[i];
      var member = this.get(memberId);
      if (!member) { support[memberId] = 50; continue; }

      var baseScore = this.calcOfficialAttitude(memberId, officialId);
      if (official._reportsTo === memberId) baseScore += 10;
      if (member._reportsTo === officialId) baseScore += 10;

      if (memberId === 'discipline') {
        if (official.abilities && official.abilities.integrity < 60) baseScore -= 20;
        else if (official.abilities && official.abilities.integrity > 80) baseScore += 10;
      }
      if (memberId === 'organization' && official.abilities) {
        var avgAbil = (official.abilities.politics + official.abilities.personnel + official.abilities.execution) / 3;
        if (avgAbil > 75) baseScore += 10;
        else if (avgAbil < 50) baseScore -= 10;
      }
      if (memberId === 'deputy_secretary') {
        baseScore += ((official.relations ? official.relations.player || 50 : 50) - 50) * 0.3;
      }
      if (memberId === 'magistrate') {
        if (officialId === 'magistrate') baseScore = 10;
        else if (official._factionId === 'magistrate') baseScore += 15;
      }

      // 罢免场景：关系越铁越反对罢免
      if (isDismissal) {
        baseScore = 100 - baseScore;
      }

      support[memberId] = calculator.clamp(Math.round(baseScore), 0, 100);
    }
    support.player = Math.round((official.relations ? official.relations.player || 50 : 50));
    // 罢免场景下玩家态度也反转
    if (isDismissal) {
      support.player = 100 - support.player;
    }

    var total = support.organization + support.discipline + support.deputy_secretary + support.magistrate;
    var avg = Math.round(total / 4);
    official._fivePersonSupport = support;
    return { avg: avg, members: support };
  }

  /**
   * 启动干部任免流程
   * @param {string} officialId - 目标干部ID
   * @param {string} targetTitle - 拟任职务
   * @param {string} motionDesc - 动议说明
   * @returns {object} 流程启动结果
   */
  startAppointmentProcess(officialId, targetTitle, motionDesc) {
    var official = this.get(officialId);
    if (!official) return { error: 'not_found' };
    if (official._appointmentStatus) return { error: 'already_in_process', status: official._appointmentStatus };

    var player = stateManager.get('player');
    if (!player || (player.politicalCapital || 0) < 5) return { error: '政治资本不足（需要5点）' };

    // 扣政治资本
    player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - 5);

    // 记录动议
    official._appointmentStatus = 'initiated';
    official._proceduralRecord.hasMotion = true;
    official._appointmentLog.push({
      stage: '动议', time: timeSystem ? timeSystem.getTimeString() : 'now',
      detail: motionDesc || '书记动议调整' + official.name + '职务',
    });

    // 问责风险：如果程序不完整，记录违规
    if (!motionDesc) {
      official._proceduralRecord.irregularities.push('动议说明不充分');
    }

    return {
      success: true,
      message: official.name + '任免流程已启动（动议阶段）',
      official: official,
      nextStage: 'five_person_group',
    };
  }

  /**
   * 五人小组酝酿
   * @param {string} officialId - 目标干部ID
   * @returns {object} 酝酿结果
   */
  holdFivePersonGroup(officialId) {
    var official = this.get(officialId);
    if (!official) return { error: 'not_found' };
    if (official._appointmentStatus !== 'initiated' && official._appointmentStatus !== 'five_person_group') {
      return { error: '流程状态错误，当前：' + official._appointmentStatus };
    }

    var support = this.calcFivePersonSupport(officialId, true);
    official._fivePersonSupport = support.members;
    official._proceduralRecord.hasFivePersonGroup = true;
    official._appointmentStatus = 'five_person_group';

    official._appointmentLog.push({
      stage: '五人小组酝酿', time: timeSystem ? timeSystem.getTimeString() : 'now',
      detail: '平均支持度 ' + support.avg + '%（组织' + support.members.organization + '% · 纪委' +
        support.members.discipline + '% · 副书记' + support.members.deputy_secretary + '% · 县长' + support.members.magistrate + '%）',
    });

    // 如果支持度过低，标记为有争议
    var controversy = support.avg < 50 ? 'high' : support.avg < 65 ? 'low' : null;
    if (controversy) {
      official._proceduralRecord.irregularities.push('五人小组支持度偏低（' + support.avg + '%）');
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '五人小组酝酿',
      message: official.name + '人选方案：平均支持度' + support.avg + '%' + (controversy ? ' ⚠️ 有争议' : ' ✅ 共识良好'),
    });

    return {
      success: true,
      support: support,
      controversy: controversy,
      nextStage: 'committee_vote',
    };
  }

  /**
   * 常委会讨论表决
   * @param {string} officialId - 目标干部ID
   * @returns {object} 表决结果
   */
  holdStandingCommitteeVote(officialId) {
    var official = this.get(officialId);
    if (!official) return { error: 'not_found' };
    if (official._appointmentStatus !== 'five_person_group' && official._appointmentStatus !== 'committee_vote') {
      return { error: '流程状态错误，需先完成五人小组酝酿' };
    }

    var members = this.getCommitteeMembers();
    // 检查出席人数（需≥2/3）
    var required = Math.ceil(members.length * 2 / 3);
    if (members.length < required) {
      return { error: '常委会出席人数不足（需≥' + required + '人）' };
    }

    // 计算投票：基于派系立场、个人关系、五人小组态度
    var support = 0, oppose = 0, abstain = 0;
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var stance = 50; // 基础中立

      // 派系倾向
      if (m._factionId === official._factionId) stance += 20;
      if (m._factionId === 'secretary' && official._factionId !== 'magistrate') stance += 15;

      // 与书记关系
      if (m.relations && m.relations.player) {
        stance += (m.relations.player - 50) * 0.3;
      }

      // 五人小组态度（如果有）
      var fiv = official._fivePersonSupport || {};
      if (fiv[m.id]) stance += (fiv[m.id] - 50) * 0.2;

      // 随机微调
      stance += (Math.random() - 0.5) * 20;

      if (stance >= 60) support++;
      else if (stance <= 40) oppose++;
      else abstain++;
    }

    var passed = support > members.length / 2;
    var majorityStr = support + '/' + oppose + '/' + abstain;

    official._proceduralRecord.hasCommitteeVote = true;
    official._appointmentStatus = 'committee_vote';

    official._appointmentLog.push({
      stage: '常委会表决', time: timeSystem ? timeSystem.getTimeString() : 'now',
      detail: majorityStr + '（' + (passed ? '通过' : '未通过') + '）',
    });

    // 如果未通过，记录违规
    if (!passed) {
      official._proceduralRecord.irregularities.push('常委会表决未通过');
    }

    eventBus.emit(EVENTS.COMMITTEE_VOTE, {
      issue: { name: official.name + '任免' },
      result: { support: support, oppose: oppose, abstain: abstain, result: passed ? '通过' : '未通过', veto: false },
    });

    return {
      success: passed,
      support: support, oppose: oppose, abstain: abstain,
      passed: passed,
      nextStage: passed ? (official._managementTier === 'city' ? 'city_report' :
        (official._appointmentType === 'gov' ? 'npc_appointment' : 'completed')) : null,
    };
  }

  /**
   * 市管干部报市委审批
   * @param {string} officialId - 目标干部ID
   * @returns {object} 审批结果
   */
  reportToCity(officialId) {
    var official = this.get(officialId);
    if (!official) return { error: 'not_found' };

    // 市管干部最终决定权在市委
    // 县委推荐效果取决于：上级信任 + 推荐质量 + 关系
    var county = stateManager.get('county');
    var superior = county ? (county.superiorTrust ? county.superiorTrust.citySecretary || 50 : 50) : 50;
    var approvalChance = superior * 0.5 + 10 + Math.random() * 20;
    var approved = approvalChance > 50;

    official._proceduralRecord.hasCityReport = true;
    official._appointmentLog.push({
      stage: '报市委审批', time: timeSystem ? timeSystem.getTimeString() : 'now',
      detail: approved ? '市委批复同意' : '市委批复暂缓（上级信任度' + Math.round(superior) + '）',
    });

    if (approved) {
      official._appointmentStatus = 'city_report';
      // 市管干部政府职务还需人大
      if (official._appointmentType === 'gov') {
        return { success: true, approved: true, message: '市委批复同意，待县人大常委会任命', nextStage: 'npc_appointment' };
      }
      official._appointmentStatus = 'completed';
      return { success: true, approved: true, message: '市委批复同意，任免完成', nextStage: 'completed' };
    }

    return { success: false, approved: false, message: '市委暂缓审批', approvalChance: Math.round(approvalChance) };
  }

  /**
   * 县人大/常委会任命（政府组成部门负责人法定程序）
   * @param {string} officialId - 目标干部ID
   * @returns {object} 任命结果
   */
  completeNPCAppointment(officialId, voteResult) {
    var official = this.get(officialId);
    if (!official) return { error: 'not_found' };

    var passed;
    if (voteResult && typeof voteResult.support === 'number' && typeof voteResult.needed === 'number') {
      // 使用代表弹窗中计算的真实票型
      passed = voteResult.support >= voteResult.needed;
    } else {
      // 降级：纯随机（75-95%通过率）
      var npcConfidence = 75 + Math.floor(Math.random() * 20);
      passed = Math.random() * 100 < npcConfidence;
    }

    official._proceduralRecord.hasNPCRecognition = true;
    official._appointmentLog.push({
      stage: '人大任命', time: timeSystem ? timeSystem.getTimeString() : 'now',
      detail: passed ? '县人大常委会表决通过任命' : '县人大常委会暂缓任命',
      voteCount: voteResult ? (voteResult.support + '/' + voteResult.oppose + '/' + voteResult.absent) : null,
    });

    if (passed) {
      official._appointmentStatus = 'completed';
      return { success: true, message: official.name + '经县人大常委会任命，正式就任' + official.title };
    }

    official._proceduralRecord.irregularities.push('人大任命未通过');
    return { success: false, message: '县人大常委会未通过任命，需重新协商' };
  }

  /** 获取任免流程当前状态摘要 */
  getAppointmentProcess(officialId) {
    var official = this.get(officialId);
    if (!official || !official._appointmentStatus) return null;

    var stageLabels = {
      initiated: '动议已启动',
      five_person_group: '五人小组酝酿',
      committee_vote: '常委会表决',
      city_report: '报市委审批',
      npc_appointment: '人大任命',
      completed: '已完成',
    };

    return {
      status: official._appointmentStatus,
      statusLabel: stageLabels[official._appointmentStatus] || official._appointmentStatus,
      log: official._appointmentLog || [],
      irregularities: (official._proceduralRecord && official._proceduralRecord.irregularities) || [],
      tier: official._managementTier,
      apptType: official._appointmentType,
    };
  }

  /** 获取某类官员的完整流程步骤链 */
  getFlowForOfficial(officialId) {
    var o = this.get(officialId);
    if (!o) return [];
    // 市管干部：动议→五人小组→常委会→报市委
    if (o._managementTier === 'city') {
      return ['initiated', 'five_person_group', 'committee_vote', 'city_report'];
    }
    // 县管 + 政府职务：动议→五人小组→常委会→人大任命
    if (o._appointmentType === 'gov') {
      return ['initiated', 'five_person_group', 'committee_vote', 'npc_appointment'];
    }
    // 县管 + 党内职务：动议→五人小组→常委会
    return ['initiated', 'five_person_group', 'committee_vote'];
  }

  /** 获取当前应该显示的步骤操作（含UI交互所需数据） */
  getAppointmentAction(officialId) {
    var o = this.get(officialId);
    if (!o) return null;
    var flow = this.getFlowForOfficial(officialId);
    var currentStatus = o._appointmentStatus;
    if (!currentStatus || currentStatus === 'completed') return null;

    // 找到当前状态在流程中的位置和下一步
    var currentIdx = flow.indexOf(currentStatus);
    if (currentIdx < 0) return { error: '未知状态', status: currentStatus };

    var next = (currentIdx + 1 < flow.length) ? flow[currentIdx + 1] : null;

    // 准备不同步骤的UI数据
    switch (currentStatus) {
      case 'initiated':
        return {
          step: 'initiated',
          label: '动议已启动',
          action: '五人小组酝酿',
          actionKey: 'five_person_group',
          players: this.getFivePersonGroup(),
          next: next,
        };
      case 'five_person_group':
        var support = this.calcFivePersonSupport(officialId, true);
        return {
          step: 'five_person_group',
          label: '五人小组酝酿',
          action: '提交常委会表决',
          actionKey: 'committee_vote',
          support: support,
          members: this.getFivePersonGroup().map(function(m) { return {
            id: m ? m.id : '?',
            name: m ? m.name : '未知',
            title: m ? m.title : '',
            support: support.members[m ? m.id : ''] || 50,
          };}),
          next: next,
        };
      case 'committee_vote':
        return {
          step: 'committee_vote',
          label: '常委会表决',
          action: next === 'city_report' ? '报市委审批' : (next === 'npc_appointment' ? '人大任命' : '完成'),
          actionKey: next || 'completed',
          members: this.getCommitteeMembers(),
          next: next,
        };
      case 'city_report':
        return {
          step: 'city_report',
          label: '报市委审批',
          action: '等待市委批复',
          actionKey: 'city_report',
          next: next,
        };
      case 'npc_appointment':
        return {
          step: 'npc_appointment',
          label: '待人大任命',
          action: '提交人大表决',
          actionKey: 'npc_appointment',
          next: next,
        };
    }
    return null;
  }

  /** 检查程序合规：返回违规项列表 */
  checkProceduralCompliance(officialId) {
    var official = this.get(officialId);
    if (!official) return [];
    var rec = official._proceduralRecord;
    var issues = [];

    if (!rec.hasMotion) issues.push('缺少动议环节');
    if (!rec.hasRecommendation) issues.push('缺少民主推荐');
    if (!rec.hasAssessment) issues.push('缺少组织考察');
    if (!rec.hasFivePersonGroup) issues.push('缺少五人小组酝酿');
    if (!rec.hasCommitteeVote) issues.push('缺少常委会表决');
    if (official._managementTier === 'city' && !rec.hasCityReport) issues.push('市管干部未报市委审批');
    if (official._appointmentType === 'gov' && !rec.hasNPCRecognition) issues.push('政府职务未经人大任命');

    // 合并已有违规
    var all = issues.concat(rec.irregularities || []);
    return all;
  }

  /** 从存档恢复 */
  restoreFromState(savedPersonnel) {
    if (!savedPersonnel?.officials) return;
    this.officials = [];
    for (const oData of savedPersonnel.officials) {
      this.officials.push(new Official(oData));
    }
  }
}
