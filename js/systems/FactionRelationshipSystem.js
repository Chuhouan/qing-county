/**
 * FactionRelationshipSystem — 派系关系系统 v2
 * 六大派系模型：书记系 / 县长系 / 本土系 / 空降系 / 官僚系 / 无派系
 *
 * 核心设计（用户提供）：
 *   每个派系有：核心标签、权力来源、典型成员、核心诉求、策略价值、潜在风险
 *   不做意识形态派系，做人和人之间的权力关系网络
 *
 * 动态机制：
 *   派系权力随游戏进程消长（成员能力×岗位权重要素）
 *   派系关系受玩家行为和投票结果影响
 *   每月派系向书记施压争夺财政资源
 */

/** 派系定义数据库 */
var FACTION_DEFS = {
  secretary: {
    id: 'secretary',
    name: '书记系',
    tag: '自己人',
    color: '#7c3aed',
    powerSource: '直接效忠于现任县委书记（玩家），是玩家亲手提拔或绝对信赖的班底',
    leaderId: 'deputy_secretary',
    coreDemand: '巩固玩家权力，落实玩家意志',
    strategyValue: '最忠诚的执行力量，是推动任何议程的基石',
    risk: '若玩家权威削弱或离任，此派系将迅速瓦解',
    defaultRelations: { magistrate: -10, local: 5, appointed: 15, bureaucrat: 10, nonaligned: 20 },
  },
  magistrate: {
    id: 'magistrate',
    name: '县长系',
    tag: '搭档/对手',
    color: '#2563eb',
    powerSource: '效忠于县长，构成县政府执行体系的核心',
    leaderId: 'magistrate',
    coreDemand: '确保政府工作顺畅，争取县长个人政绩与权威',
    strategyValue: '必须合作的对象，掌控行政资源；处理不当，易变成最大内部对手',
    risk: '党政不和的主要来源。可能架空书记，或向上级告状',
    defaultRelations: { secretary: -10, local: 15, appointed: -20, bureaucrat: 20, nonaligned: 10 },
  },
  local: {
    id: 'local',
    name: '本土系',
    tag: '地头蛇',
    color: '#16a34a',
    powerSource: '权力源于本地深厚的血缘、地缘、业缘关系网，往往盘踞多年',
    leaderId: 'united_front',
    coreDemand: '维护本地利益网络，保持对地方事务的实际影响力',
    strategyValue: '熟悉县情，能办成事也能坏事。争取到则根基稳，得罪则寸步难行',
    risk: '可能抱团抵制外来政策，形成中梗阻',
    defaultRelations: { secretary: 5, magistrate: 15, appointed: -30, bureaucrat: 0, nonaligned: 10 },
  },
  appointed: {
    id: 'appointed',
    name: '空降系',
    tag: '空降兵/带天线',
    color: '#dc2626',
    powerSource: '权力来源于上级领导（市委、省委组织部、省厅），是上级意志的延伸或眼线',
    leaderId: 'discipline',
    coreDemand: '完成上级交办任务，传达或制衡本地主官，为个人前程服务',
    strategyValue: '是沟通上级的桥梁，也可能是不受控的监督者。其态度影响上级评价',
    risk: '可能绕过你直接向上汇报，成为钦差大臣',
    defaultRelations: { secretary: 15, magistrate: -20, local: -30, bureaucrat: 0, nonaligned: 5 },
  },
  bureaucrat: {
    id: 'bureaucrat',
    name: '官僚系',
    tag: '办事的',
    color: '#d97706',
    powerSource: '权力源于专业能力与岗位职责，相对超脱于人身依附，但需寻找庇护',
    leaderId: 'politics_law',
    coreDemand: '在其专业领域内做成事，避免因政治斗争背锅',
    strategyValue: '实际工作的操盘手，提供专业意见。可用，但忠诚度需培养',
    risk: '缺乏政治忠诚，在压力下可能倒向任何一方，或明哲保身',
    defaultRelations: { secretary: 10, magistrate: 20, local: 0, appointed: 0, nonaligned: 15 },
  },
  nonaligned: {
    id: 'nonaligned',
    name: '无派系',
    tag: '风向标',
    color: '#9ca3af',
    powerSource: '无稳定权力来源，依附于当前最强势力，随时准备转向',
    leaderId: null,
    coreDemand: '个人安全与晋升，哪边强倒向哪边',
    strategyValue: '易于收买和拉拢，成本低，可用来凑票数或打探消息',
    risk: '毫无忠诚可言，局势不利时会第一时间背叛',
    defaultRelations: { secretary: 10, magistrate: 10, local: 10, appointed: 5, bureaucrat: 15 },
  },
};

/** 派系双方关系矩阵 */
var FACTION_RELATION_KEYS = ['secretary', 'magistrate', 'local', 'appointed', 'bureaucrat', 'nonaligned'];

class FactionRelationshipSystem {
  constructor() {
    this.engine = null;
    // 运行时派系数据（包含动态power等）
    this.factions = {};
    // 派系间当前关系: factions[secretary].relations = { magistrate: -10, ... }
    this._initFactions();
  }

  /** 初始化派系定义 */
  _initFactions() {
    for (var id in FACTION_DEFS) {
      var def = FACTION_DEFS[id];
      this.factions[id] = {
        id: id,
        name: def.name,
        tag: def.tag,
        color: def.color,
        powerSource: def.powerSource,
        leaderId: def.leaderId,
        coreDemand: def.coreDemand,
        strategyValue: def.strategyValue,
        risk: def.risk,
        relations: {}, // 对其他派系的关系
        members: [],   // 成员ID列表
        power: 50,     // 初始权势 0-100
        cohesion: 60,  // 初始凝聚力 0-100
      };
    }
    // 初始化派系关系
    for (var id in this.factions) {
      var f = this.factions[id];
      var defaults = FACTION_DEFS[id].defaultRelations;
      for (var otherId in this.factions) {
        if (id === otherId) continue;
        f.relations[otherId] = defaults[otherId] || 0;
      }
    }
  }

  init(config) {
    // 从PersonnelSystem同步成员
    this._syncMembers();
    // 计算初始权力
    this._recalcAllPower();
    // 注册到 StateManager
    stateManager.register('factions', {
      factions: this._serializeFactions(),
      lastUpdate: timeSystem ? (timeSystem.year + '-' + timeSystem.month + '-' + timeSystem.week) : 'init',
    });
  }

  /** 从PersonnelSystem同步成员归属 */
  _syncMembers() {
    // 清空
    for (var id in this.factions) {
      this.factions[id].members = [];
    }

    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return;
    var all = personnel.getAll() || [];
    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (!o || o.id === 'player') continue;
      var fId = o._factionId;
      if (fId && this.factions[fId]) {
        this.factions[fId].members.push(o.id);
      }
    }

    // 自动指派领袖：派系内身份最高的人
    for (var fId in this.factions) {
      var f = this.factions[fId];
      if (f.leaderId && this.factions[fId].members.indexOf(f.leaderId) === -1) {
        // 如果领袖不在本派系（被调离），选members中能力最高者继任
        var bestMember = null, bestAbility = 0;
        for (var mi = 0; mi < f.members.length; mi++) {
          var mo = personnel.get(f.members[mi]);
          if (mo && (mo._ability || 50) > bestAbility) {
            bestAbility = mo._ability || 50;
            bestMember = f.members[mi];
          }
        }
        f.leaderId = bestMember;
      }
    }

    // 同步完成后初始化亲和度
    this._seedFactionAffinities();
  }

  /** 为所有官员初始化对各派系的亲和度（仅在首次创建时执行） */
  _seedFactionAffinities() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return;
    var all = personnel.getAll() || [];
    var factionIds = ['secretary', 'magistrate', 'local', 'appointed', 'bureaucrat', 'nonaligned'];

    for (var i = 0; i < all.length; i++) {
      var off = all[i];
      if (!off || off.id === 'player') continue;
      // 已有存档值则跳过
      if (off._factionAffinities && typeof off._factionAffinities === 'object' &&
          Object.keys(off._factionAffinities).length >= 5) continue;

      var ownFaction = off._factionId;
      var aff = {};
      for (var fi = 0; fi < factionIds.length; fi++) {
        var fid = factionIds[fi];
        if (fid === 'nonaligned') {
          aff[fid] = 45 + Math.round(Math.random() * 10 - 5); // 40-50
        } else if (fid === ownFaction) {
          // 本派系 60-80
          aff[fid] = 60 + Math.round(Math.random() * 20);
        } else if (ownFaction && FACTION_DEFS[ownFaction]) {
          // 从派系默认关系换算：defaultRelation 20 → 亲和 55, -30 → 35
          var rel = FACTION_DEFS[ownFaction].defaultRelations[fid] || 0;
          aff[fid] = 45 + Math.round(rel / 2) + Math.round(Math.random() * 6 - 3);
          aff[fid] = calculator.clamp(aff[fid], 10, 90);
        } else {
          aff[fid] = 45 + Math.round(Math.random() * 10 - 5);
        }
      }
      if (ownFaction && ownFaction === 'nonaligned') {
        // 无派系人员各派系亲和度均匀
        for (var j = 0; j < factionIds.length; j++) {
          var f2 = factionIds[j];
          if (f2 === 'nonaligned') continue;
          aff[f2] = 40 + Math.round(Math.random() * 20); // 40-60
        }
      }
      off._factionAffinities = aff;
    }
  }

  /** 重新计算所有派系权力值 */
  _recalcAllPower() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return;

    for (var fId in this.factions) {
      var f = this.factions[fId];
      var members = f.members || [];
      if (members.length === 0) {
        f.power = 0;
        continue;
      }

      var totalPower = 0;
      for (var mi = 0; mi < members.length; mi++) {
        var o = personnel.get(members[mi]);
        if (!o) continue;
        var ability = o._ability || 50;
        var loyalty = o._loyalty || 50;
        var network = o._network || 0;
        var voteWeight = o.voteWeight || 1;
        // 权力公式: 能力×0.3 + 关系网×0.2 + 票权×0.3 + 凝聚力×0.2
        totalPower += ability * 0.3 + Math.min(network, 30) * 0.2 + voteWeight * 15 * 0.3 + (f.cohesion || 60) * 0.2;
      }
      f.power = Math.round(totalPower / members.length);
    }
  }

  // ========== 对外接口 ==========

  /** 获取某个派系的完整定义 */
  getFactionDef(factionId) {
    return FACTION_DEFS[factionId] || null;
  }

  /** 获取所有派系数据 */
  getAllFactions() {
    return this.factions;
  }

  /** 获取派系概览列表（排序后的） */
  getFactionClusters() {
    var result = [];
    for (var id in this.factions) {
      var f = this.factions[id];
      result.push({
        id: id,
        name: f.name,
        tag: f.tag,
        color: f.color,
        leaderId: f.leaderId,
        members: f.members,
        power: f.power,
        cohesion: f.cohesion,
        memberCount: f.members.length,
      });
    }
    return result.sort(function(a, b) { return b.power - a.power; });
  }

  /** 获取指定官员的完整关系属性 */
  getProfile(officialId) {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return null;
    var off = personnel.get(officialId);
    if (!off) return null;
    var fId = off._factionId;
    var fDef = FACTION_DEFS[fId] || null;
    return {
      id: off.id,
      name: off.name,
      title: off.title,
      ability: off._ability || 50,
      loyalty: off._loyalty || 50,
      ambition: off._ambition || 50,
      network: off._network || this._calcNetwork(off),
      background: off._background || [],
      friends: off._friends || [],
      reportsTo: off._reportsTo || null,
      domain: off._domain || 'general',
      factionId: fId,
      factionName: fDef ? fDef.name : '无派系',
      factionTag: fDef ? fDef.tag : '',
      factionColor: fDef ? fDef.color : '#9ca3af',
      isCommittee: this._isCommitteeMember(off.id),
    };
  }

  /** 获取所有官员的关系概况（用于UI关系网络图） */
  getRelationshipGraph() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return { nodes: [], edges: [] };
    var all = personnel.getAll() || [];
    var nodes = [];
    var edgeSet = {};

    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (!o || o.id === 'player') continue;
      var profile = this.getProfile(o.id);
      if (!profile) continue;
      nodes.push({
        id: o.id,
        name: o.name,
        title: o.title,
        factionId: profile.factionId,
        factionName: profile.factionName,
        factionColor: profile.factionColor,
        ability: profile.ability,
        loyalty: profile.loyalty,
        ambition: profile.ambition,
        network: profile.network,
        domain: profile.domain,
        isCommittee: profile.isCommittee,
      });

      var friends = profile.friends || [];
      for (var j = 0; j < friends.length; j++) {
        var fId = friends[j];
        var edgeKey = o.id < fId ? o.id + ':' + fId : fId + ':' + o.id;
        if (!edgeSet[edgeKey]) {
          edgeSet[edgeKey] = { source: o.id, target: fId, weight: 1 };
        } else {
          edgeSet[edgeKey].weight += 1;
        }
      }
    }

    var edges = [];
    for (var key in edgeSet) {
      var e = edgeSet[key];
      if (e.weight >= 1) {
        edges.push({ source: e.source, target: e.target, weight: Math.min(e.weight, 5) });
      }
    }

    return { nodes: nodes, edges: edges };
  }

  /** 改变两个派系间的关系值 */
  modifyRelation(fId1, fId2, delta) {
    if (!this.factions[fId1] || !this.factions[fId2]) return;
    this.factions[fId1].relations[fId2] = calculator.clamp(
      (this.factions[fId1].relations[fId2] || 0) + delta, -100, 100
    );
    this.factions[fId2].relations[fId1] = calculator.clamp(
      (this.factions[fId2].relations[fId1] || 0) + delta, -100, 100
    );
  }

  /** 获取两派系间的关系值 */
  getRelation(fId1, fId2) {
    if (!this.factions[fId1] || !this.factions[fId2]) return 0;
    return this.factions[fId1].relations[fId2] || 0;
  }

  // ========== 连锁反应 ==========

  /** 提拔干部 */
  onPromote(officialId) {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return [];
    var off = personnel.get(officialId);
    if (!off) return [];
    var effects = [];

    // 1. 本人忠诚+10
    off._loyalty = Math.min(100, (off._loyalty || 50) + 10);
    effects.push({ target: off.name, change: 'loyalty', delta: 10, reason: '被书记提拔' });
    off._ambition = Math.min(100, (off._ambition || 50) + 5);

    // 2. 朋友圈连锁
    var friends = off._friends || [];
    for (var i = 0; i < friends.length; i++) {
      var friend = personnel.get(friends[i]);
      if (!friend) continue;
      friend._loyalty = Math.min(100, (friend._loyalty || 50) + 3);
      effects.push({ target: friend.name, change: 'loyalty', delta: 3, reason: '朋友圈效应（被提拔者的朋友）' });
      if ((friend._ambition || 50) > 70) {
        friend._ambition = Math.min(100, friend._ambition + 5);
        effects.push({ target: friend.name, change: 'ambition', delta: 5, reason: '野心被激发' });
      }
    }

    // 3. 同派系欣慰
    var fId = off._factionId;
    if (fId && this.factions[fId]) {
      var members = this.factions[fId].members;
      for (var mi = 0; mi < members.length; mi++) {
        if (members[mi] === officialId) continue;
        var member = personnel.get(members[mi]);
        if (!member) continue;
        member._loyalty = Math.min(100, (member._loyalty || 50) + 2);
      }
      effects.push({ target: '[' + this.factions[fId].name + '全体]', change: 'loyalty', delta: '+2', reason: '同派系欣慰' });
    }

    // 4. 敌对派系忌惮
    if (fId) {
      var rivals = this._getRivalFactions(fId);
      for (var ri = 0; ri < rivals.length; ri++) {
        var rFaction = this.factions[rivals[ri]];
        if (!rFaction) continue;
        // 派系关系恶化的数字已作用，此处仅记录
        var rMembers = rFaction.members || [];
        for (var rmi = 0; rmi < rMembers.length; rmi++) {
          var rOff = personnel.get(rMembers[rmi]);
          if (!rOff) continue;
          rOff._loyalty = Math.max(0, (rOff._loyalty || 50) - 2);
        }
        effects.push({ target: '[' + rFaction.name + ']', change: 'loyalty', delta: '-2', reason: '敌对派系忌惮' });
      }
    }

    // 5. 提拔对亲和度的影响：同派系对本派系亲和度 +3~5，敌对派系对本派系 -2
    if (fId && off._factionAffinities) {
      var all = personnel.getAll() || [];
      for (var pmi = 0; pmi < all.length; pmi++) {
        var po = all[pmi];
        if (!po || po.id === 'player' || !po._factionAffinities) continue;
        var poFid = po._factionId;
        if (poFid === fId && po.id !== officialId) {
          // 同派系：对己方派系亲和度 +3（受野心影响：野心越高越敏感）
          var boost = 3 + Math.round((po._ambition || 50) / 50);
          po._factionAffinities[fId] = Math.min(100, (po._factionAffinities[fId] || 50) + boost);
        } else if (rivals.indexOf(poFid) !== -1) {
          // 敌对派系：对提拔方派系亲和度 -2
          po._factionAffinities[fId] = Math.max(0, (po._factionAffinities[fId] || 50) - 2);
        }
      }
    }

    // 6. 派系权力重算
    this._recalcAllPower();
    return effects;
  }

  /** 查处干部 */
  onPunish(officialId) {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return [];
    var off = personnel.get(officialId);
    if (!off) return [];
    var effects = [];

    // 1. 本人
    off._loyalty = Math.max(0, (off._loyalty || 50) - 30);
    off._ambition = Math.max(0, (off._ambition || 50) - 20);

    // 2. 朋友圈恐慌
    var friends = off._friends || [];
    for (var i = 0; i < friends.length; i++) {
      var friend = personnel.get(friends[i]);
      if (!friend) continue;
      friend._loyalty = Math.max(0, (friend._loyalty || 50) - 8);
      friend.modifyRelation('player', -5);
      effects.push({ target: friend.name, change: 'loyalty', delta: -8, reason: '朋友圈恐慌' });
    }

    // 3. 同派系恐惧
    var fId = off._factionId;
    if (fId && this.factions[fId]) {
      var members = this.factions[fId].members;
      for (var mi = 0; mi < members.length; mi++) {
        if (members[mi] === officialId) continue;
        var member = personnel.get(members[mi]);
        if (!member) continue;
        member._loyalty = Math.max(0, (member._loyalty || 50) - 3);
        member.modifyRelation('player', -3);
      }
      effects.push({ target: '[' + this.factions[fId].name + '全体]', change: 'loyalty', delta: '-3', reason: '同派系恐惧' });
      // 派系凝聚力下降
      this.factions[fId].cohesion = Math.max(0, (this.factions[fId].cohesion || 60) - 5);
    }

    // 4. 敌对派系高兴
    if (fId) {
      var rivals = this._getRivalFactions(fId);
      for (var ri = 0; ri < rivals.length; ri++) {
        var rFaction = this.factions[rivals[ri]];
        if (!rFaction) continue;
        var rMembers = rFaction.members || [];
        for (var rmi = 0; rmi < rMembers.length; rmi++) {
          var rOff = personnel.get(rMembers[rmi]);
          if (!rOff) continue;
          rOff._loyalty = Math.min(100, (rOff._loyalty || 50) + 1);
        }
      }
    }

    // 5. 查处对亲和度的影响：本人对己方派系 -15，同派系 -5，敌对派系对本派系 +3
    if (fId && off._factionAffinities) {
      // 本人：对己方派系亲和度暴跌
      off._factionAffinities[fId] = Math.max(0, (off._factionAffinities[fId] || 50) - 15);
      // 同派系成员
      var members = this.factions[fId] ? this.factions[fId].members : [];
      for (var pmi = 0; pmi < members.length; pmi++) {
        if (members[pmi] === officialId) continue;
        var pm = personnel.get(members[pmi]);
        if (!pm || !pm._factionAffinities) continue;
        pm._factionAffinities[fId] = Math.max(0, (pm._factionAffinities[fId] || 50) - 5);
      }
      // 敌对派系：对本派系亲和度 +3（觉得对手被削弱了，对己方更有利）
      var rivals = this._getRivalFactions(fId);
      for (var ri2 = 0; ri2 < rivals.length; ri2++) {
        var rFaction2 = this.factions[rivals[ri2]];
        if (!rFaction2) continue;
        var rMembers2 = rFaction2.members || [];
        for (var rmi2 = 0; rmi2 < rMembers2.length; rmi2++) {
          var ro2 = personnel.get(rMembers2[rmi2]);
          if (!ro2 || !ro2._factionAffinities) continue;
          ro2._factionAffinities[fId] = Math.min(100, (ro2._factionAffinities[fId] || 50) + 3);
        }
      }
    }

    this._recalcAllPower();
    return effects;
  }

  /** 调任干部 */
  onTransfer(officialId) {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return [];
    var off = personnel.get(officialId);
    if (!off) return [];
    var effects = [];

    off._loyalty = Math.max(0, (off._loyalty || 50) - 5);
    off.modifyRelation('player', -8);

    var friends = off._friends || [];
    for (var i = 0; i < friends.length; i++) {
      var friend = personnel.get(friends[i]);
      if (!friend) continue;
      friend._loyalty = Math.max(0, (friend._loyalty || 50) - 2);
      effects.push({ target: friend.name, change: 'loyalty', delta: -2, reason: '朋友圈不安' });
    }
    return effects;
  }

  // ========== 派系动态 ==========

  /** 每周派系更新（由GameEngine调用，返回周报文本） */
  weeklyUpdate() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return '';
    var reportLines = [];
    var week = timeSystem ? timeSystem.week : 0;

    // 1. 权力重算
    this._recalcAllPower();

    // 2. 凝聚力自然漂移
    for (var fId in this.factions) {
      var f = this.factions[fId];
      f.cohesion = calculator.clamp(f.cohesion + (60 - f.cohesion) * 0.02, 10, 100);
    }

    // 3. 关系自然漂移（向默认值回归）
    for (var fId1 in this.factions) {
      for (var fId2 in this.factions) {
        if (fId1 >= fId2) continue;
        if (!FACTION_DEFS[fId1] || !FACTION_DEFS[fId2]) continue;
        var target = FACTION_DEFS[fId1].defaultRelations[fId2] || 0;
        var current = this.factions[fId1].relations[fId2] || 0;
        if (current !== target) {
          var drift = (target - current) * 0.02;
          if (Math.abs(drift) < 0.5) drift = drift > 0 ? 0.5 : -0.5;
          this.factions[fId1].relations[fId2] = calculator.clamp(current + drift, -100, 100);
          this.factions[fId2].relations[fId1] = calculator.clamp(
            (this.factions[fId2].relations[fId1] || 0) + drift, -100, 100
          );
        }
      }
    }
    // 收集关系简况
    var relSummary = [];
    for (var r1 in this.factions) {
      for (var r2 in this.factions) {
        if (r1 < r2) {
          var rv = this.factions[r1].relations[r2];
          if (rv < -20) {
            relSummary.push(this.factions[r1].name + '↔' + this.factions[r2].name + '关系紧张');
          }
        }
      }
    }

    // 4. 忠诚度自然衰减（每4周检查一次）
    if (week % 4 === 0) {
      for (var oi = 0; oi < (personnel.getAll() || []).length; oi++) {
        var off = personnel.getAll()[oi];
        if (!off || off.id === 'player') continue;
        // 忠诚 < 50 且与书记关系 < 40 的，每4周流失
        if ((off._loyalty || 50) < 50 && (off.relations.player || 50) < 40) {
          off._loyalty = Math.max(0, (off._loyalty || 50) - 2);
        }
      }
    }

    // 5. 派系主动事件（每4周检查一次）
    var events = [];
    if (week % 4 === 0) {
      for (var fId3 in this.factions) {
        var f3 = this.factions[fId3];
        if (f3.members.length < 2) continue;
        var rand = Math.random();

        // 凝聚力低→内讧
        if (f3.cohesion < 25 && rand < 0.3) {
          var m1 = personnel.get(f3.members[0]);
          var m2 = personnel.get(f3.members[Math.min(1, f3.members.length - 1)]);
          if (m1 && m2) {
            events.push({ type: '内讧', faction: f3.name, desc: m1.name + '与' + m2.name + '关系恶化' });
            // 两人忠诚下降
            m1._loyalty = Math.max(0, (m1._loyalty || 50) - 5);
            m2._loyalty = Math.max(0, (m2._loyalty || 50) - 5);
            f3.cohesion = Math.max(10, f3.cohesion + 5); // 内讧后反弹
          }
        }

        // 派系向书记施压（权力>65）
        if (f3.power > 65 && rand > 0.5 && rand < 0.7 && f3.leaderId) {
          var leader = personnel.get(f3.leaderId);
          if (leader) {
            var pressure = Math.round((f3.power - 50) / 5);
            events.push({ type: '施压', faction: f3.name, desc: leader.name + '代表' + f3.name + '向书记施压（权势+' + pressure + '）' });
            // 如果不回应，派系关系恶化（逻辑留在GameEngine的响应中）
          }
        }

        // 派系丑闻（稀有）
        if (rand < 0.05 && f3.members.length > 0) {
          var scandalOff = personnel.get(f3.members[Math.floor(Math.random() * f3.members.length)]);
          if (scandalOff && scandalOff._leverage > 20) {
            events.push({ type: '丑闻', faction: f3.name, desc: scandalOff.name + '卷入丑闻，派系声誉受损' });
            f3.cohesion = Math.max(10, f3.cohesion - 10);
            scandalOff._loyalty = Math.max(0, (scandalOff._loyalty || 50) - 10);
          }
        }
      }
    }

    // 记录事件到report
    for (var evi = 0; evi < events.length; evi++) {
      reportLines.push('[' + events[evi].type + '] ' + events[evi].faction + '：' + events[evi].desc);
    }

    // 6. 锁定倒计时衰减（每周）
    this._decrementLocks();

    // 7. 亲和度自然漂移 + 朋友圈影响（每周）
    this._driftFactionAffinities();

    // 8. 派系流动检测（每周）
    var flowReports = this._checkFactionFlows();
    for (var fri = 0; fri < flowReports.length; fri++) {
      var fr = flowReports[fri];
      if (fr.type === 'faction_leave') {
        reportLines.push('➡️ ' + fr.official + '退出' + (FACTION_DEFS[fr.from] ? FACTION_DEFS[fr.from].name : fr.from));
      } else if (fr.type === 'faction_join') {
        reportLines.push('⬅️ ' + fr.official + '加入' + (FACTION_DEFS[fr.to] ? FACTION_DEFS[fr.to].name : fr.to));
      }
    }

    // 9. 生成派系周报
    var report = '';
    reportLines.unshift('📊 派系动态 · 第' + week + '周');
    // 权力变化
    var sortedFactions = this.getFactionClusters();
    var powerLine = sortedFactions.map(function(f) { return f.name + f.power; }).join(' · ');
    reportLines.push('权势排行：' + powerLine);
    if (relSummary.length > 0) {
      reportLines.push(relSummary.slice(0, 2).join('｜'));
    }

    return reportLines.join('\n');
  }

  /** 获取某个派系的敌对派系列表 */
  _getRivalFactions(fId) {
    if (!this.factions[fId]) return [];
    var rivals = [];
    for (var otherId in this.factions) {
      if (otherId === fId) continue;
      if ((this.factions[fId].relations[otherId] || 0) < -15) {
        rivals.push(otherId);
      }
    }
    return rivals;
  }

  /** 检查并触发派系事件 */
  checkFactionEvents() {
    var events = [];
    // 凝聚力低→内讧风险
    for (var fId in this.factions) {
      var f = this.factions[fId];
      if (f.cohesion < 30 && f.members.length >= 3) {
        events.push({
          type: 'faction_infighting',
          faction: fId,
          description: f.name + '凝聚力不足，可能出现内讧',
        });
      }
    }
    return events;
  }

  // ========== 派系流动机制 ==========

  /** 退出派系 */
  _leaveFaction(off, reports) {
    var oldFaction = off._factionId;
    if (!oldFaction || oldFaction === 'nonaligned') return;

    off._factionId = 'nonaligned';
    // 锁定一年（48周）
    if (!off._lockedFactions) off._lockedFactions = {};
    off._lockedFactions[oldFaction] = 48;

    reports.push({
      type: 'faction_leave',
      official: off.name,
      from: oldFaction,
      reason: '亲和度低于阈值'
    });
  }

  /** 尝试加入派系 */
  _tryJoinFaction(off, reports) {
    var affinities = off._factionAffinities || {};
    var locked = off._lockedFactions || {};

    // 按亲和度降序，找最高且 >= 75 的
    var candidates = [];
    for (var fid in affinities) {
      if (fid === 'nonaligned') continue;
      if (locked[fid]) continue;
      if (affinities[fid] >= 75) {
        candidates.push({ faction: fid, affinity: affinities[fid] });
      }
    }
    if (candidates.length === 0) return;

    candidates.sort(function(a, b) { return b.affinity - a.affinity; });
    var target = candidates[0].faction;

    off._factionId = target;
    reports.push({
      type: 'faction_join',
      official: off.name,
      to: target,
      reason: '亲和度超过阈值'
    });
  }

  /** 每周流动检测 */
  _checkFactionFlows() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return [];
    var all = personnel.getAll() || [];
    var reports = [];

    for (var i = 0; i < all.length; i++) {
      var off = all[i];
      if (!off || off.id === 'player') continue;

      var currentFaction = off._factionId;

      if (!currentFaction || currentFaction === 'nonaligned') {
        // 无派系：只检查加入
        this._tryJoinFaction(off, reports);
        continue;
      }

      // 有派系：先检查退出
      var affinities = off._factionAffinities || {};
      var affinity = affinities[currentFaction] || 50;
      if (affinity <= 25) {
        this._leaveFaction(off, reports);
        // 退出后再尝试加入别的派系
        this._tryJoinFaction(off, reports);
      }
    }

    // 如果发生了流动，重算派系权力与成员同步
    if (reports.length > 0) {
      this._syncMembers();
      this._recalcAllPower();
    }
    return reports;
  }

  /** 每周锁定倒计时减1 */
  _decrementLocks() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return;
    var all = personnel.getAll() || [];
    for (var i = 0; i < all.length; i++) {
      var off = all[i];
      if (!off || !off._lockedFactions) continue;
      for (var fId in off._lockedFactions) {
        off._lockedFactions[fId]--;
        if (off._lockedFactions[fId] <= 0) {
          delete off._lockedFactions[fId];
        }
      }
      if (Object.keys(off._lockedFactions).length === 0) off._lockedFactions = {};
    }
  }

  /** 每周亲和度自然漂移 + 朋友圈影响 */
  _driftFactionAffinities() {
    var personnel = this.engine ? this.engine.getSystem('personnel') : null;
    if (!personnel) return;
    var all = personnel.getAll() || [];

    for (var i = 0; i < all.length; i++) {
      var off = all[i];
      if (!off || off.id === 'player') continue;
      var aff = off._factionAffinities;
      if (!aff) continue;

      // 自然漂移：向基准值缓慢回归（基准 = 本派系该官员的默认关系换算值）
      var ownFaction = off._factionId;
      var factionIds = ['secretary', 'magistrate', 'local', 'appointed', 'bureaucrat', 'nonaligned'];

      for (var fi = 0; fi < factionIds.length; fi++) {
        var fid = factionIds[fi];
        if (fid === 'nonaligned') continue;

        // 计算基准值
        var base;
        if (ownFaction && FACTION_DEFS[ownFaction]) {
          var rel = FACTION_DEFS[ownFaction].defaultRelations[fid] || 0;
          base = 45 + Math.round(rel / 3);
        } else {
          base = 50;
        }
        // 如果是本派系，基准再高一些
        if (fid === ownFaction) base = 65;

        base = calculator.clamp(base, 20, 80);
        var current = aff[fid] || 50;

        if (current !== base) {
          var drift = (base - current) * 0.03;
          if (Math.abs(drift) < 0.3) drift = drift > 0 ? 0.3 : -0.3;
          aff[fid] = calculator.clamp(Math.round(current + drift), 0, 100);
        }
      }

      // 朋友圈影响：若朋友圈中 >= 3 人属于派系 X 且亲和度 < 60，则 +1
      var friends = off._friends || [];
      var factionCounts = {};
      for (var j = 0; j < friends.length; j++) {
        var friend = personnel.get(friends[j]);
        if (!friend || !friend._factionId) continue;
        var ff = friend._factionId;
        if (ff === 'nonaligned') continue;
        factionCounts[ff] = (factionCounts[ff] || 0) + 1;
      }
      for (var fid2 in factionCounts) {
        if (factionCounts[fid2] >= 3 && (aff[fid2] || 50) < 60) {
          aff[fid2] = Math.min(100, (aff[fid2] || 50) + 1);
        }
      }

      off._factionAffinities = aff;
    }
  }

  // ========== 内部方法 ==========

  /** 计算关系网规模 */
  _calcNetwork(official) {
    if (!official) return 0;
    return (official._friends || []).length;
  }

  /** 判断是否是常委会成员 */
  _isCommitteeMember(id) {
    var committeeIds = ['magistrate', 'deputy_secretary', 'deputy_magistrate',
      'discipline', 'organization', 'propaganda',
      'politics_law', 'united_front', 'office_director'];
    return committeeIds.indexOf(id) !== -1;
  }

  /** 序列化派系数据用于存档 */
  _serializeFactions() {
    var s = {};
    for (var id in this.factions) {
      var f = this.factions[id];
      s[id] = {
        power: f.power,
        cohesion: f.cohesion,
        relations: f.relations,
        leaderId: f.leaderId,
      };
    }
    return s;
  }

  /** 从存档恢复 */
  restoreFromState(savedState) {
    if (!savedState || !savedState.factions) return;
    var sf = savedState.factions;
    for (var id in sf) {
      if (this.factions[id]) {
        this.factions[id].power = sf[id].power || 50;
        this.factions[id].cohesion = sf[id].cohesion || 60;
        if (sf[id].relations) this.factions[id].relations = sf[id].relations;
        if (sf[id].leaderId) this.factions[id].leaderId = sf[id].leaderId;
      }
    }
  }

  /** 返回派系到大界别的映射表（供人大系统使用） */
  getFactionDelegationMap() {
    // 六大派系 → 人大代表团分类（界别）
    // delegateCount: 每个派系对应的人大代表人数
    // coreDemand: 该界别代表的主要诉求方向
    return [
      { factionId: 'secretary',   name: '书记派', count: 35, demand: '执行党委决策,维护班子团结', color: '#7c3aed' },
      { factionId: 'magistrate',  name: '政府派', count: 40, demand: '保障行政效率,争取财政资源', color: '#2563eb' },
      { factionId: 'local',       name: '本土派', count: 55, demand: '维护地方利益,推动民生项目', color: '#16a34a' },
      { factionId: 'appointed',   name: '空降派', count: 25, demand: '贯彻上级指示,推进改革创新', color: '#dc2626' },
      { factionId: 'bureaucrat',  name: '技术官僚', count: 45, demand: '规范行政程序,提高治理效能', color: '#f59e0b' },
      { factionId: 'nonaligned',  name: '无派系', count: 43, demand: '依个人判断,关注具体民生', color: '#6b7280' },
    ];
  }
}
