// ════════════════════════════════════════════
//  NPC/人大系统 — 以原型混合方式挂载到 UIManager
//  由 UIManager.js 抽取独立，2026-06-06
// ════════════════════════════════════════════

// ============== 人大数据初始化 ==============

UIManager.prototype._initNPC = function() {
  this._npcInitialized = true;
  var factionSys = gameEngine?.getSystem?.('factions');
  var delegations = factionSys?.getFactionDelegationMap?.() || [
    { factionId: 'secretary',   name: '书记派', count: 35, demand: '执行党委决策', color: '#7c3aed' },
    { factionId: 'magistrate',  name: '政府派', count: 40, demand: '保障行政效率', color: '#2563eb' },
    { factionId: 'local',       name: '本土派', count: 55, demand: '维护地方利益', color: '#16a34a' },
    { factionId: 'appointed',   name: '空降派', count: 25, demand: '贯彻上级指示', color: '#dc2626' },
    { factionId: 'bureaucrat',  name: '技术官僚', count: 45, demand: '规范行政程序', color: '#f59e0b' },
    { factionId: 'nonaligned',  name: '无派系', count: 43, demand: '依个人判断', color: '#6b7280' },
  ];
  var constituencies = ['城区', '正定镇', '新城铺镇', '南牛乡', '北早现乡', '曲阳桥乡', '西平乐乡', '南楼乡', '里双乡', '东杜乡', '工业界', '农业界', '教育界', '医卫界', '工商界'];

  var delegates = [];
  var globalId = 0;
  for (var di = 0; di < delegations.length; di++) {
    var dlg = delegations[di];
    for (var ri = 0; ri < dlg.count; ri++) {
      globalId++;
      delegates.push({
        id: 'del_' + globalId,
        delegationId: dlg.factionId,
        delegationName: dlg.name,
        name: dlg.name + '·第' + (ri + 1) + '席',
        constituency: constituencies[Math.floor(Math.random() * constituencies.length)],
        keyDemand: dlg.demand,
        influence: 1 + Math.floor(Math.random() * 3),
        personalBias: Math.floor(Math.random() * 31) - 15,
        lobbyBias: 0,
        swayed: false,
        attendance: 0.85 + Math.random() * 0.15,
      });
    }
  }

  var delegationMap = {};
  for (var i = 0; i < delegates.length; i++) {
    var d = delegates[i];
    if (!delegationMap[d.delegationId]) delegationMap[d.delegationId] = [];
    delegationMap[d.delegationId].push(d);
  }

  this._npcData = {
    delegates: delegates,
    delegationMap: delegationMap,
    delegations: delegations,
    passedLaws: [],
    pendingMotions: [],
    pendingDismissal: null,
    lastVoteResult: null,
    lastLobby: 0,
    scLastVoteResult: null, // 常委会独立投票结果
  };

  // 初始化人大常委会
  this._ensureStandingCommittee();
};

// ============== 人大主页渲染（含常委会 + 人代会） ==============

UIManager.prototype._renderNPC = function(c) {
  if (!this._npcInitialized) this._initNPC();
  this._checkAndLoadMotions();
  var data = this._npcData;
  var sc = data.standingCommittee;
  var total = data.delegates.length;
  var hasResult = data.lastVoteResult !== null;
  var absenteeCount = hasResult ? Math.min(data.lastVoteResult.absent, Math.floor(Math.random() * 13)) : 0;
  var abstainCount = hasResult ? data.lastVoteResult.absent - absenteeCount : 0;
  var scHasResult = data.scLastVoteResult !== null;
  var scAbsentee = scHasResult ? Math.min(data.scLastVoteResult.absent, Math.floor(Math.random() * 3)) : 0;
  var scAbstain = scHasResult ? data.scLastVoteResult.absent - scAbsentee : 0;

  // ===== 代表团卡片（常委会点阵内置其中） =====
  // 建立常委ID快速查找表
  var scMemberSet = {};
  if (sc && sc.members) {
    for (var si = 0; si < sc.members.length; si++) {
      scMemberSet[sc.members[si].id] = true;
    }
  }

  var delegationCards = (data.delegations || []).map(function(dlg) {
    var members = data.delegationMap[dlg.factionId] || [];
    // 常委排前面，方便查看
    var sorted = members.slice().sort(function(a, b) {
      var aSC = scMemberSet[a.id] ? 0 : 1;
      var bSC = scMemberSet[b.id] ? 0 : 1;
      return aSC - bSC;
    });
    var scCount = 0;
    for (var mi = 0; mi < members.length; mi++) {
      if (scMemberSet[members[mi].id]) scCount++;
    }
    return '<div class="npc-faction-card" style="border-left:4px solid ' + dlg.color + ';padding:10px 12px;border-radius:8px;background:var(--bg-card);margin-bottom:6px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div>' +
          '<div style="font-size:13px;font-weight:600;">' + dlg.name + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">' + dlg.demand + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:18px;font-weight:700;">' + members.length + '</div>' +
          '<div style="font-size:9px;color:var(--text-muted);">代表 · 常委' + scCount + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(20,8px);gap:2px;margin-top:6px;">' +
        sorted.map(function(m) {
          var isSC = scMemberSet[m.id] || false;
          var border = isSC ? ';border:1.5px solid #e6b800;box-shadow:0 0 2px #e6b800' : '';
          var tip = isSC ? '⭐' + m.delegationName + '常委' : m.delegationName;
          return '<span style="width:8px;height:8px;border-radius:50%;background:' + dlg.color + ';cursor:pointer' + border + '" title="' + tip + '"></span>';
        }).join('') +
      '</div>' +
    '</div>';
  }).join('');


  // ===== 人代会投票结果 =====
  var voteResultHtml = '';
  if (hasResult && data.lastVoteResult) {
    var r = data.lastVoteResult;
    voteResultHtml = '<div style="display:flex;gap:8px;margin-top:4px;padding:6px 8px;background:var(--bg-card);border-radius:6px;">' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#3fb950;">' + r.support + '</div><div style="font-size:9px;color:var(--text-muted);">支持</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#f85149;">' + r.oppose + '</div><div style="font-size:9px;color:var(--text-muted);">反对</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#484f58;">' + abstainCount + '</div><div style="font-size:9px;color:var(--text-muted);">弃权</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#eab308;">' + absenteeCount + '</div><div style="font-size:9px;color:var(--text-muted);">缺席</div></div>' +
    '</div>';
  }

  // ===== 常委会投票结果 =====
  var scResultHtml = '';
  if (scHasResult && data.scLastVoteResult) {
    var sr = data.scLastVoteResult;
    scResultHtml = '<div style="display:flex;gap:8px;margin-top:4px;padding:6px 8px;background:var(--bg-card);border-radius:6px;">' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#3fb950;">' + sr.support + '</div><div style="font-size:9px;color:var(--text-muted);">赞成</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#f85149;">' + sr.oppose + '</div><div style="font-size:9px;color:var(--text-muted);">反对</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#484f58;">' + scAbstain + '</div><div style="font-size:9px;color:var(--text-muted);">弃权</div></div>' +
      '<div style="flex:1;text-align:center;"><div style="font-size:16px;font-weight:700;color:#eab308;">' + scAbsentee + '</div><div style="font-size:9px;color:var(--text-muted);">缺席</div></div>' +
    '</div>';
  }

  // ===== 可罢免列表（分权） =====
  var personnel = gameEngine.getSystem('personnel');
  var scDismissible = [];  // 常委会可罢免：各局局长
  var npcDismissible = []; // 人代会可罢免：县长
  var partyOnly = ['deputy_secretary','discipline','organization','propaganda','politics_law','united_front','office_director',
    'discipline_deputy','party_office_deputy','organization_deputy','propaganda_deputy','united_front_deputy',
    'cyberspace_head','institutional_compile_head','direct_work_head','inspection_office_head','retired_cadre_head'];
  if (personnel) {
    var allOffs = personnel.getAll() || [];
    for (var i = 0; i < allOffs.length; i++) {
      var o = allOffs[i];
      if (o.id === 'magistrate') { npcDismissible.push(o); continue; } // 县长→人代会
      if (partyOnly.indexOf(o.id) !== -1) continue;
      scDismissible.push(o); // 局长→常委会
    }
  }

  var scDismissHtml = scDismissible.length > 0
    ? '<div style="max-height:150px;overflow-y:auto;">' + scDismissible.map(function(o) {
        return '<div class="int-card" onclick="uiManager._startSCDismissalVote(\'' + o.id + '\')" style="font-size:10px;padding:3px 6px;">' +
          '<div class="int-row"><span>⚖ 罢免 ' + o.name + '</span><span style="font-size:9px;color:var(--text-muted);">' + o.title + '</span></div></div>';
      }).join('') + '</div>'
    : '<div style="font-size:10px;color:var(--text-muted);padding:6px;">无可罢免</div>';

  var npcDismissHtml = npcDismissible.length > 0
    ? '<div style="max-height:80px;overflow-y:auto;">' + npcDismissible.map(function(o) {
        return '<div class="int-card" onclick="uiManager._startDismissalVote(\'' + o.id + '\')" style="font-size:10px;padding:3px 6px;">' +
          '<div class="int-row"><span>⚖ 罢免 ' + o.name + '</span><span style="font-size:9px;color:var(--text-muted);">' + o.title + '</span></div></div>';
      }).join('') + '</div>'
    : '<div style="font-size:10px;color:var(--text-muted);padding:6px;">无可罢免</div>';

  // ===== 议案 =====
  var pendingHtml = '';
  if (data.pendingMotions && data.pendingMotions.length > 0) {
    pendingHtml = '<div class="npc-section-label" style="margin-top:4px;">📋 待审议议案</div>' +
      data.pendingMotions.slice(0, 3).map(function(m) {
        var icon = m.type === 'legislation' ? '📜' : m.type === 'decision' ? '📋' : '📄';
        return '<div class="int-card" onclick="uiManager._showMotionDetail(\'' + m.id + '\')" style="font-size:10px;padding:3px 6px;">' +
          '<div class="int-row"><span>' + icon + ' ' + m.title + '</span><span style="font-size:9px;color:var(--text-muted);">' + m.initiator + '</span></div></div>';
      }).join('') +
      (data.pendingMotions.length > 3 ? '<div style="font-size:9px;color:var(--text-muted);padding:3px 6px;">+ ' + (data.pendingMotions.length - 3) + ' 件</div>' : '');
  }
  var lawsHtml = '';
  if (data.passedLaws && data.passedLaws.length > 0) {
    lawsHtml = '<div class="npc-section-label" style="margin-top:4px;">已通过议案</div>' +
      data.passedLaws.map(function(l) { return '<div style="font-size:9px;padding:2px 4px;background:rgba(63,185,80,0.08);border-radius:3px;margin:1px 0;">✅ ' + l.name + '</div>'; }).join('');
  }

  // ===== SVG渲染（通用函数） =====
  function makeFanSVG(totalDots, svgHeight, hasRes, voteResult, optAbsentee, optAbstain) {
    var cx = 350, cy = svgHeight - 25;
    var maxR = Math.min(260, svgHeight * 0.72), minR = Math.max(30, svgHeight * 0.15);
    var layers = totalDots <= 40 ? 3 : 7;
    var radii = [];
    for (var li = 0; li < layers; li++) radii.push(minR + (maxR - minR) * (li / (layers - 1)));
    var sumR = radii.reduce(function(a,b){return a+b;}, 0);
    var dotsPerLayer = radii.map(function(r){ return Math.round(r / sumR * totalDots); });
    var sumDots = dotsPerLayer.reduce(function(a,b){return a+b;}, 0);
    dotsPerLayer[layers-1] = Math.max(1, dotsPerLayer[layers-1] + (totalDots - sumDots));

    var dots = [];
    if (hasRes && voteResult) {
      var s = voteResult.support, o = voteResult.oppose, a = voteResult.absent;
      var rs = s, ro = o, ra = a;
      // 使用外部传入的缺席/弃权拆分（保证与HTML显示一致）
      var globalAbsentee = optAbsentee !== undefined ? optAbsentee : 0;
      var globalAbstain = optAbstain !== undefined ? optAbstain : 0;
      for (var li = 0; li < layers; li++) {
        var count = dotsPerLayer[li];
        var rem = rs + ro + ra;
        if (rem === 0) break;
        var sRow = Math.min(Math.round(count * rs / rem), rs);
        var oRow = Math.min(Math.round(count * ro / rem), ro);
        var aRow = count - sRow - oRow;
        if (aRow > ra) { aRow = ra; oRow = count - sRow - aRow; if (oRow > ro) { oRow = ro; sRow = count - oRow - aRow; } }
        rs -= sRow; ro -= oRow; ra -= aRow;
        var radius = radii[li];
        // 按全局比例拆分缺席/弃权
        var absAbsent = globalAbsentee + globalAbstain > 0 ? Math.round(aRow * globalAbsentee / (globalAbsentee + globalAbstain)) : 0;
        var absAbstain = aRow - absAbsent;
        for (var ci = 0; ci < count; ci++) {
          var theta = Math.PI * ci / (count - 1 || 1);
          var x = cx + radius * Math.cos(theta);
          var y = cy - radius * Math.sin(theta);
          var color = ci < absAbsent ? '#eab308' : ci < absAbsent + absAbstain ? '#484f58' : ci < absAbsent + absAbstain + oRow ? '#f85149' : '#3fb950';
          dots.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + color + '" opacity="0.85"/>');
        }
      }
    } else {
      for (var li = 0; li < layers; li++) {
        var count = dotsPerLayer[li];
        var radius = radii[li];
        for (var ci = 0; ci < count; ci++) {
          var theta = Math.PI * ci / (count - 1 || 1);
          var x = cx + radius * Math.cos(theta);
          var y = cy - radius * Math.sin(theta);
          dots.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#58a6ff" opacity="0.3"/>');
        }
      }
    }
    return '<svg viewBox="0 0 700 ' + svgHeight + '" style="width:100%;height:auto;">' +
      '<rect width="700" height="' + svgHeight + '" fill="var(--bg-secondary)" rx="6"/>' +
      dots.join('') + '</svg>';
  }

  // ===== 拼装最终页面 =====
  c.innerHTML = '' +

    // ─── 上区：常委会 ───
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:4px;">' +
      '<div class="section-header" style="margin:0;font-size:14px;">🏛 县人大常委会 · ' + (sc ? sc.members.length : 35) + '名常委</div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">' +
      '<div style="flex:2;min-width:350px;">' +
        '<div style="margin-bottom:4px;">' +
          makeFanSVG(35, 120, scHasResult, data.scLastVoteResult, scAbsentee, scAbstain) +
        '</div>' +
      '</div>' +
      '<div style="flex:1;min-width:200px;">' +
        '<div style="font-size:10px;font-weight:500;color:var(--accent-amber);margin-bottom:2px;">📊 常委表决</div>' +
        (scResultHtml || '<div style="font-size:10px;color:var(--text-muted);padding:4px 0;">表决局长罢免等事项后出现票型</div>') +
        '<div class="npc-section-label" style="margin-top:4px;font-size:10px;">⚖ 常委会罢免（局长）</div>' +
        scDismissHtml +
      '</div>' +
    '</div>' +

    // ─── 下区：人代会 ───
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:4px;">' +
      '<div class="section-header" style="margin:0;font-size:14px;">🏛 县人民代表大会 · ' + total + '名代表</div>' +
      (data.passedLaws && data.passedLaws.length > 0 ? '<span style="font-size:11px;color:var(--accent-green);">已通过' + data.passedLaws.length + '项</span>' : '') +
    '</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
      '<div style="flex:2;min-width:350px;">' +
        '<div style="margin-bottom:4px;">' +
          makeFanSVG(243, 220, hasResult, data.lastVoteResult, absenteeCount, abstainCount) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">' +
          delegationCards +
        '</div>' +
      '</div>' +
      '<div style="flex:1;min-width:200px;">' +
        '<div style="font-size:10px;font-weight:500;color:var(--accent-green);margin-bottom:2px;">📊 表决结果</div>' +
        (voteResultHtml || '<div style="font-size:10px;color:var(--text-muted);padding:4px 0;">提起罢免县长或议案后产生票型</div>') +
        '<div class="npc-section-label" style="margin-top:4px;font-size:10px;">⚖ 人代会罢免（县长）</div>' +
        npcDismissHtml +
        pendingHtml +
        lawsHtml +
        '<button class="fd-action-btn" style="width:100%;margin-top:4px;padding:3px 6px;font-size:10px;" onclick="uiManager._showMotionForm()">📝 提交议案</button>' +
        '<button class="fd-action-btn" style="width:100%;margin-top:2px;padding:3px 6px;font-size:10px;" onclick="uiManager._showSupervisionPanel()">📋 人大监督</button>' +
        '<button class="fd-action-btn" style="width:100%;margin-top:2px;padding:3px 6px;font-size:10px;" onclick="uiManager._showInquiryPanel()">❓ 专题询问</button>' +
      '</div>' +
    '</div>';
};

// ============== 议案系统 ==============

UIManager.prototype._checkAndLoadMotions = function() {
  var data = this._npcData;
  if (!data.pendingMotions) data.pendingMotions = [];
  if (typeof getActiveMotions !== 'function') return;
  var allMotions = getActiveMotions();
  if (!allMotions || allMotions.length === 0) return;
  for (var mi = 0; mi < allMotions.length; mi++) {
    var m = allMotions[mi];
    var existing = data.pendingMotions.find(function(x) { return x.id === m.id; });
    if (existing) continue;
    if (Math.random() < 0.15 && data.pendingMotions.length < 3) {
      data.pendingMotions.push({
        id: m.id, type: m.type, title: m.title, desc: m.desc,
        initiator: m.initiator === 'player' ? '您' : '代表联名',
        isPlayerInitiated: m.initiator === 'player',
        baseDifficulty: m.passageDifficulty,
        effects: m.effects,
        status: 'pending',
      });
    }
  }
};

UIManager.prototype._showMotionForm = function() {
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  var motions = typeof getActiveMotions === 'function' ? getActiveMotions() : [];
  var available = motions.filter(function(m) { return m.initiator === 'player' || m.initiator === 'government'; });
  var typeIcons = { legislation: '📜', decision: '📋', resolution: '📄' };
  var typeLabels = { legislation: '法规案', decision: '决定案', resolution: '决议案' };

  overlay.classList.remove('hidden');
  var bodyHtml = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">选择预备案提交审议：</div>';

  if (available.length === 0) {
    bodyHtml += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">暂无符合条件议案</div>';
  } else {
    bodyHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    for (var mi = 0; mi < available.length; mi++) {
      var m = available[mi];
      var passRate = typeof getMotionPassRate === 'function' ? Math.round(getMotionPassRate(m) * 100) : Math.round(m.passageDifficulty * 100);
      var passColor = passRate >= 70 ? 'var(--accent-green)' : passRate >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
      bodyHtml += '<div style="padding:8px;border:1px solid var(--border-color);border-radius:6px;text-align:center;cursor:pointer;" onclick="uiManager._showMotionDetail(\'' + m.id + '\')">' +
        '<div style="font-size:20px;margin-bottom:2px;">' + (typeIcons[m.type] || '📋') + '</div>' +
        '<div style="font-weight:500;font-size:11px;margin-bottom:2px;">' + m.title + '</div>' +
        '<div style="font-size:9px;color:var(--text-muted);">' + (typeLabels[m.type] || '议案') + '</div>' +
        '<div style="font-size:10px;font-weight:600;color:' + passColor + ';margin-top:2px;">' + passRate + '%</div>' +
      '</div>';
    }
    bodyHtml += '</div>';
  }

  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:480px;">' +
    '<div class="mc-header"><span class="mc-icon">📝</span><span class="mc-title">提交人大议案</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body" style="max-height:60vh;overflow-y:auto;">' + bodyHtml +
      '<button class="fd-action-btn" onclick="uiManager._closeModal()" style="width:100%;margin-top:8px;">关闭</button>' +
    '</div></div>';
};

UIManager.prototype._showMotionDetail = function(motionId) {
  var data = this._npcData;
  var motion = null;
  for (var i = 0; i < data.pendingMotions.length; i++) {
    if (data.pendingMotions[i].id === motionId) { motion = data.pendingMotions[i]; break; }
  }
  if (!motion) return;

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  var typeIcons = { legislation: '📜', decision: '📋', resolution: '📄' };
  var typeLabels = { legislation: '法规案', decision: '决定案', resolution: '决议案' };
  var result = this._calcDelegatesForIssue(motion.type === 'legislation' ? 'law' : 'law');
  var total = 243;
  var needed = Math.ceil(total / 2) + 1;
  var passed = result.support >= needed;

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:520px;">' +
    '<div class="mc-header"><span class="mc-icon">' + (typeIcons[motion.type] || '📋') + '</span><span class="mc-title">' + motion.title + '</span>' +
    '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
        '<span style="font-size:10px;padding:2px 8px;background:rgba(55,138,221,0.15);border-radius:4px;color:var(--accent-blue);">' + (typeLabels[motion.type] || '议案') + '</span>' +
        '<span style="font-size:10px;padding:2px 8px;background:rgba(255,255,255,0.08);border-radius:4px;color:var(--text-secondary);">发起：' + motion.initiator + '</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.6;">' + (motion.desc || '无详细说明') + '</div>' +
      '<div class="npc-summary" style="margin-bottom:8px;">' +
        '<div class="npc-sum-row"><span class="npc-dot" style="background:#3fb950;"></span> 支持 ' + result.support + '人 (' + (result.support/total*100).toFixed(0) + '%)</div>' +
        '<div class="npc-sum-row"><span class="npc-dot" style="background:#f85149;"></span> 反对 ' + result.oppose + '人</div>' +
        '<div class="npc-sum-row"><span class="npc-dot" style="background:#484f58;"></span> 弃权 ' + result.absent + '人</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">需 <strong>' + needed + '</strong> 票通过（过半数）</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="fd-action-btn" onclick="uiManager._executeMotionVote(\'' + motionId + '\')" style="flex:2;background:' + (passed ? 'var(--accent-green)' : 'var(--accent-red)') + ';color:#fff;border-color:' + (passed ? 'var(--accent-green)' : 'var(--accent-red)') + ';">🗳 执行表决</button>' +
        '<button class="fd-action-btn" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')" style="flex:1;">返回</button>' +
      '</div>' +
    '</div></div>';
};

UIManager.prototype._executeMotionVote = function(motionId) {
  var data = this._npcData;
  var motionIdx = -1;
  for (var i = 0; i < data.pendingMotions.length; i++) {
    if (data.pendingMotions[i].id === motionId) { motionIdx = i; break; }
  }
  if (motionIdx === -1) return;
  var motion = data.pendingMotions[motionIdx];
  var result = this._calcDelegatesForIssue(motion.type === 'legislation' ? 'law' : 'law');
  var total = 243;
  var needed = Math.ceil(total / 2) + 1;
  var passed = result.support >= needed;

  data.lastVoteResult = { support: result.support, oppose: result.oppose, absent: result.absent };
  for (var di = 0; di < data.delegates.length; di++) { data.delegates[di].lobbyBias = 0; }

  if (passed) {
    motion.status = 'passed';
    data.passedLaws.push({ id: motion.id, name: motion.title, type: motion.type });
    var ef = motion.effects || {};
    var county = stateManager.get('county');
    if (ef.growthBoost && county && county.economy) county.economy.gdpGrowth = (county.economy.gdpGrowth || 0.05) + ef.growthBoost;
    if (ef.corruptionIndex != null && county && county.institution) {
      county.institution.corruptionIndex = Math.max(0, Math.min(100, (county.institution.corruptionIndex || 20) + ef.corruptionIndex));
    }
    if (result.support > 180) {
      if (county && county.superiorTrust) county.superiorTrust.citySecretary = Math.min(100, (county.superiorTrust.citySecretary || 50) + 2);
    }
    if (ef.socialTension != null) {
      var petitionSys = gameEngine.getSystem('petition');
      if (petitionSys) {
        var petState = stateManager.get('petition');
        if (petState && petState.stats) petState.stats.petitionPressure = Math.max(0, Math.min(100, (petState.stats.petitionPressure || 30) - ef.socialTension * 3));
      }
    }
    data.pendingMotions.splice(motionIdx, 1);
    this._addEventLog('important', '人大', '✅ 议案通过：' + motion.title);
    this.showToast('✅ 议案通过！', 'success');
  } else {
    motion.status = 'rejected';
    data.pendingMotions.splice(motionIdx, 1);
    this._addEventLog('important', '人大', '❌ 议案被否决：' + motion.title);
    this.showToast('❌ 议案被否决', 'error');
  }
  document.getElementById('modal-overlay').classList.add('hidden');
  this.refreshAll();
};

UIManager.prototype._confirmBudget = function() {
  var finance = stateManager.get('finance');
  if (!finance) return;
  if (!this._npcInitialized) this._initNPC();
  var voteResult = this._calcDelegatesForIssue('budget');
  var needed = Math.ceil(243 / 2) + 1;
  var passed = voteResult.support >= needed;
  finance.budgetApproved = passed;
  var data = this._npcData;
  data.lastVoteResult = { support: voteResult.support, oppose: voteResult.oppose, absent: voteResult.absent };
  if (passed) {
    this._addEventLog('important', '人大', '💰 ' + (timeSystem ? timeSystem.year : '') + '年度财政预算经人大审议通过');
    if (voteResult.support > 180) {
      var county = stateManager.get('county');
      if (county && county.superiorTrust) county.superiorTrust.citySecretary = Math.min(100, (county.superiorTrust.citySecretary || 50) + 2);
    }
    document.getElementById('modal-overlay').classList.add('hidden');
    this.showToast('✅ 预算通过！', 'success');
  } else {
    this.showToast('❌ 预算被否决', 'error');
  }
  this.refreshAll();
};

// ============== 派系关系投票算法 ==============

UIManager.prototype._calcDelegatesForIssue = function(issueType, targetFaction) {
  var data = this._npcData;
  var results = { support: 0, oppose: 0, absent: 0, details: [], byFaction: {} };
  var factionSys = gameEngine?.getSystem?.('factions');

  if (targetFaction) {
    var delegations = data.delegations || [];
    for (var fi = 0; fi < delegations.length; fi++) {
      results.byFaction[delegations[fi].factionId] = {
        factionName: delegations[fi].name, color: delegations[fi].color,
        support: 0, oppose: 0, absent: 0, total: delegations[fi].count,
        relation: targetFaction === delegations[fi].factionId ? 999 : (factionSys ? factionSys.getRelation(delegations[fi].factionId, targetFaction) : 0),
        reasonSameFaction: false, reasonRelation: 0, reasonNote: '',
      };
    }
  }

  var baseBias = {
    'secretary':   { law: 15, budget: 15 },
    'magistrate':  { law: 5, budget: 10 },
    'local':       { law: -10, budget: 5 },
    'appointed':   { law: 10, budget: 5 },
    'bureaucrat':  { law: 0, budget: 10 },
    'nonaligned':  { law: -5, budget: 5 },
  };

  for (var i = 0; i < data.delegates.length; i++) {
    var d = data.delegates[i];
    var score = 0;

    if (issueType === 'dismissal' && targetFaction) {
      if (d.delegationId === targetFaction) {
        if (targetFaction === 'nonaligned') {
          score = 0; // 无派系不抱团，各自判断
        } else {
          score = -35; // 正常派系强烈反对罢免
        }
      } else {
        var rel = factionSys ? factionSys.getRelation(d.delegationId, targetFaction) : 0;
        score = -rel * 0.8;
      }
    } else if (issueType === 'appointment' && targetFaction) {
      if (d.delegationId === targetFaction) {
        if (targetFaction === 'nonaligned') {
          score = 0; // 无派系不抱团
        } else {
          score = 30; // 正常派系强烈支持任命
        }
      } else {
        var rel = factionSys ? factionSys.getRelation(d.delegationId, targetFaction) : 0;
        score = rel * 0.8;
      }
    } else {
      var bias = baseBias[d.delegationId] ? (baseBias[d.delegationId][issueType] || 0) : 0;
      var cohesion = 50;
      if (factionSys && factionSys.factions[d.delegationId]) cohesion = factionSys.factions[d.delegationId].cohesion || 50;
      score = bias + (cohesion - 50) * 0.15;
    }

    score += d.personalBias || 0;
    score += d.lobbyBias || 0;
    score += (d.influence || 1) * 2;
    // 已游说的代表：噪声极小（拿了好处必须按意愿投票）
    // 未游说的代表：正常随机浮动
    if (Math.abs(d.lobbyBias || 0) >= 10) {
      score += Math.floor(Math.random() * 5) - 2; // ±2 微小波动
    } else {
      score += Math.floor(Math.random() * 11) - 5; // ±5 正常波动
    }

    var stance;
    if (score > 3) stance = 'support';
    else if (score < -3) stance = 'oppose';
    else stance = 'absent';

    if (stance === 'support') results.support++;
    else if (stance === 'oppose') results.oppose++;
    else results.absent++;

    if (targetFaction && results.byFaction[d.delegationId]) {
      var bf = results.byFaction[d.delegationId];
      if (stance === 'support') bf.support++;
      else if (stance === 'oppose') bf.oppose++;
      else bf.absent++;
      if (!bf.reasonNote) {
        if (d.delegationId === targetFaction) {
          bf.reasonSameFaction = true;
          bf.reasonNote = '同派系，强烈反对罢免';
        } else if (d.delegationId === 'nonaligned' && targetFaction === 'nonaligned') {
          bf.reasonNote = '无派系不抱团，各自独立判断';
        } else {
          bf.reasonRelation = bf.relation;
          bf.reasonNote = bf.relation <= -15 ? '关系敌对，支持罢免' : bf.relation >= 15 ? '关系友好，反对罢免' : bf.relation <= -5 ? '关系偏紧，倾向于支持' : bf.relation >= 5 ? '关系偏松，倾向于反对' : '关系中性，视具体情况';
        }
      }
    }
    results.details.push({ id: d.id, delegationId: d.delegationId, delegationName: d.delegationName, score: score, stance: stance });
  }
  return results;
};

// ============== 预算审议 ==============

UIManager.prototype._updateMotionPreview = function() {
  // 旧方法保留，不再需要
};

UIManager.prototype._submitMotion = function() {
  // 旧方法保留，不再需要
};

// ============== 青县机构数据 ==============

UIManager.prototype._getQingCountyDepts = function() {
  return {
    party: [
      { id:'discipline', name:'纪委监委', icon:'🔍' },
      { id:'party_office', name:'县委办公室(保密机要局)', icon:'📋' },
      { id:'organization', name:'组织部(公务员局)', icon:'👥' },
      { id:'propaganda', name:'宣传部(精神文明办等)', icon:'📢' },
      { id:'united_front', name:'统战部(民宗局等)', icon:'🤝' },
      { id:'politics_law', name:'政法委', icon:'⚖️' },
      { id:'cyberspace', name:'网信办(互联网信息办)', icon:'🌐' },
      { id:'institutional_compile', name:'编办', icon:'📝' },
      { id:'direct_work', name:'县直机关工委', icon:'🏛️' },
      { id:'inspection_office', name:'巡察办', icon:'🔦' },
      { id:'petition_bureau', name:'信访局', icon:'✉️' },
      { id:'retired_cadre', name:'老干部局', icon:'👴' },
    ],
    government: [
      { id:'gov_office', name:'县政府办公室(人防办等)', icon:'📋' },
      { id:'dev_reform', name:'发改局(粮食和物资储备局)', icon:'📊' },
      { id:'edu_bureau', name:'教育局', icon:'📚' },
      { id:'tech_industry', name:'科工信局', icon:'🔬' },
      { id:'public_security', name:'公安局', icon:'🛡️' },
      { id:'civil_affairs', name:'民政局(扶贫办)', icon:'🤲' },
      { id:'justice', name:'司法局', icon:'⚖️' },
      { id:'finance_bureau', name:'财政局', icon:'💰' },
      { id:'human_resources', name:'人社局', icon:'👷' },
      { id:'natural_resources', name:'自然资源和规划局', icon:'🗺️' },
      { id:'housing', name:'住建局', icon:'🏗️' },
      { id:'urban_management', name:'城管局(园林局)', icon:'🏙️' },
      { id:'transport_bureau', name:'交通局', icon:'🚛' },
      { id:'water_resources', name:'水利局', icon:'💧' },
      { id:'agriculture_bureau', name:'农业农村局', icon:'🌾' },
      { id:'commerce', name:'商务局', icon:'🏪' },
      { id:'culture_tourism', name:'文广体旅局(文物局)', icon:'🎭' },
      { id:'health_bureau', name:'卫健局(爱卫办)', icon:'🏥' },
      { id:'veterans', name:'退役军人事务局', icon:'🎖️' },
      { id:'emergency', name:'应急管理局(地震局)', icon:'🚨' },
      { id:'audit_bureau', name:'审计局', icon:'📐' },
      { id:'market_supervision', name:'市场监管局(知识产权局)', icon:'🏪' },
      { id:'statistics', name:'统计局', icon:'📈' },
      { id:'administrative_approval', name:'行政审批局(政务服务管理办)', icon:'✅' },
      { id:'medical_security', name:'医保局', icon:'💊' },
    ]
  };
};

UIManager.prototype._renderDeptGrid = function(depts, onclickFn) {
  return depts.map(function(d) {
    return '<div style="padding:8px 4px;border:1px solid var(--border-color);border-radius:6px;text-align:center;cursor:pointer;font-size:10px;" onclick="' + onclickFn.replace('{id}', d.id) + '">' +
      '<div style="font-size:16px;margin-bottom:1px;">' + d.icon + '</div>' +
      '<div style="font-weight:500;line-height:1.3;">' + d.name + '</div>' +
    '</div>';
  }).join('');
};

// ============== 人大监督 ==============

UIManager.prototype._getSupervisionQuarter = function() {
  if (!timeSystem) return 1;
  return Math.ceil((timeSystem.month || 1) / 3);
};

UIManager.prototype._showSupervisionPanel = function() {
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  var quarter = this._getSupervisionQuarter();
  var quarterNames = ['一', '二', '三', '四'];
  var typeIndex = Math.ceil((timeSystem ? timeSystem.month : 4) / 3) || 1;
  var supervisionTypes = [
    { icon: '📊', name: '专项工作审议', desc: '人大听取审议某部门专项工作报告。' },
    { icon: '🔍', name: '执法检查', desc: '组织代表检查法律法规执行情况。' },
    { icon: '📋', name: '专题调研', desc: '就特定议题开展调研形成报告。' },
    { icon: '🎤', name: '专题询问', desc: '对部门负责人进行现场询问。' },
  ];
  var current = supervisionTypes[typeIndex - 1] || supervisionTypes[0];
  var depts = this._getQingCountyDepts();
  var partyGrid = this._renderDeptGrid(depts.party, "uiManager._launchSupervision('{id}'," + typeIndex + ")");
  var govGrid = this._renderDeptGrid(depts.government, "uiManager._launchSupervision('{id}'," + typeIndex + ")");

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:560px;">' +
    '<div class="mc-header"><span class="mc-icon">' + current.icon + '</span><span class="mc-title">人大监督 · 第' + quarterNames[typeIndex - 1] + '季度</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body" style="max-height:65vh;overflow-y:auto;">' +
      '<div style="font-size:12px;font-weight:500;margin-bottom:4px;">' + current.icon + ' ' + current.name + '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">' + current.desc + '</div>' +
      '<div style="font-size:11px;font-weight:500;color:var(--accent-purple);margin-bottom:4px;">🏛 党委部门</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:10px;">' + partyGrid + '</div>' +
      '<div style="font-size:11px;font-weight:500;color:var(--accent-blue);margin-bottom:4px;">🏢 政府部门</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;">' + govGrid + '</div>' +
      '<button class="fd-action-btn" onclick="uiManager._closeModal()" style="width:100%;">关闭</button>' +
    '</div></div>';
};

UIManager.prototype._launchSupervision = function(officialId, typeIndex) {
  var personnel = gameEngine.getSystem('personnel');
  var off = personnel ? personnel.get(officialId) : null;
  var depts = this._getQingCountyDepts();
  var allDepts = depts.party.concat(depts.government);
  var deptInfo = allDepts.find(function(d) { return d.id === officialId; });
  var deptName = deptInfo ? deptInfo.name : officialId;
  var offName = off ? off.name : (deptName + '负责人');
  var profession = off && off.abilities && off.abilities.profession ? off.abilities.profession : 50;
  var execution = off && off.abilities && off.abilities.execution ? off.abilities.execution : 50;
  var performance = Math.round((profession + execution) / 2);

  var grade = performance > 80 ? { icon:'🟢', label:'优秀' } : performance > 60 ? { icon:'🟡', label:'合格' } : { icon:'🔴', label:'不合格' };
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  var typeNames = ['专项工作审议', '执法检查', '专题调研', '专题询问'];
  var typeName = typeNames[typeIndex - 1] || '监督';

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:480px;">' +
    '<div class="mc-header"><span class="mc-icon">' + grade.icon + '</span><span class="mc-title">监督结果 · ' + deptName + '</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:' + (grade.label === '优秀' ? 'var(--accent-green)' : grade.label === '不合格' ? 'var(--accent-red)' : 'var(--accent-amber)') + ';">' +
        grade.icon + ' ' + typeName + '结果：' + grade.label +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px;">被监督部门：<strong>' + deptName + '</strong><br>' +
        '检查评价：' + grade.label + '（评分' + performance + '分）' +
      '</div>' +
      '<div>' + (grade.label === '不合格' ? '⚠️ 要求限期整改，一个月后复查。' : grade.label === '合格' ? '📋 提出改进建议3条，要求书面回复。' : '✅ 人大对部门工作给予充分肯定。') + '</div>' +
      '<button class="fd-action-btn" onclick="uiManager._closeModal();uiManager.refreshAll();" style="width:100%;margin-top:10px;">关闭</button>' +
    '</div></div>';
  this._addEventLog('important', '人大监督', typeName + '：' + deptName + ' → ' + grade.icon + grade.label);
};

// ============== 专题询问与质询 ==============

UIManager.prototype._showInquiryPanel = function() {
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  var depts = this._getQingCountyDepts();
  var allDepts = depts.party.concat(depts.government);
  var gridHtml = this._renderDeptGrid(allDepts, "uiManager._showInquiryMode('{id}')");

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:560px;">' +
    '<div class="mc-header"><span class="mc-icon">🎤</span><span class="mc-title">人大监督方向</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body" style="max-height:65vh;overflow-y:auto;">' +
      '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;line-height:1.6;">' +
        '您通过县人大常委会党组提出监督方向建议。<br>💬 建议询问（政资-3） · ⚡ 建议质询（政资-8）' +
      '</div>' +
      '<div style="font-size:11px;font-weight:500;color:var(--accent-purple);margin-bottom:4px;">🏛 党委部门</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;">' + this._renderDeptGrid(depts.party, "uiManager._showInquiryMode('{id}')") + '</div>' +
      '<div style="font-size:11px;font-weight:500;color:var(--accent-blue);margin-bottom:4px;">🏢 政府部门</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;">' + this._renderDeptGrid(depts.government, "uiManager._showInquiryMode('{id}')") + '</div>' +
      '<button class="fd-action-btn" onclick="uiManager._closeModal()" style="width:100%;">关闭</button>' +
    '</div></div>';
};

UIManager.prototype._showInquiryMode = function(deptId) {
  var depts = this._getQingCountyDepts();
  var allDepts = depts.party.concat(depts.government);
  var deptInfo = allDepts.find(function(d) { return d.id === deptId; });
  var deptName = deptInfo ? deptInfo.name : deptId;
  var personnel = gameEngine.getSystem('personnel');
  var off = personnel ? personnel.get(deptId) : null;
  var offName = off ? off.name : '负责人';
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:480px;">' +
    '<div class="mc-header"><span class="mc-icon">🎤</span><span class="mc-title">' + deptName + '</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">建议对<b>' + deptName + '</b>开展监督。' + (off ? '负责人为' + offName + '。' : '') + '</div>' +
      '<div class="int-card" style="font-size:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;border-left:4px solid var(--accent-blue);" onclick="uiManager._executeInquiry(\'' + deptId + '\',\'ask\')">' +
        '<div class="int-row"><span style="font-weight:500;">💬 建议开展询问</span><span style="font-size:10px;color:var(--accent-blue);">政治资本-3</span></div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">以县委名义建议人大开展专题询问，部门负责人须到会作答。</div>' +
      '</div>' +
      '<div class="int-card" style="font-size:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;border-left:4px solid var(--accent-red);" onclick="uiManager._executeInquiry(\'' + deptId + '\',\'interpellate\')">' +
        '<div class="int-row"><span style="font-weight:500;">⚡ 建议启动质询</span><span style="font-size:10px;color:var(--accent-red);">政治资本-8</span></div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">提议人大启动质询，可能成立调查委员会，纪委可能介入。</div>' +
      '</div>' +
      '<button class="fd-action-btn" onclick="uiManager._showInquiryPanel()" style="width:100%;background:var(--bg-secondary);">← 返回</button>' +
    '</div></div>';
};

UIManager.prototype._executeInquiry = function(officialId, mode) {
  var player = stateManager.get('player');
  if (!player) return;
  if (mode === 'ask') {
    if ((player.politicalCapital || 0) < 3) { this.showToast('政治资本不足（需要3）', 'warning'); return; }
    player.politicalCapital -= 3;
  } else {
    if ((player.politicalCapital || 0) < 8) { this.showToast('政治资本不足（需要8）', 'warning'); return; }
    player.politicalCapital -= 8;
  }

  var personnel = gameEngine.getSystem('personnel');
  var off = personnel ? personnel.get(officialId) : null;
  var depts = this._getQingCountyDepts();
  var allDepts = depts.party.concat(depts.government);
  var deptInfo = allDepts.find(function(d) { return d.id === officialId; });
  var deptName = deptInfo ? deptInfo.name : officialId;
  var offName = off ? off.name : (deptName + '负责人');
  var profession = off?.abilities?.profession ?? 50;
  var execution = off?.abilities?.execution ?? 50;
  var integrity = off?.abilities?.integrity ?? 50;
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  if (mode === 'ask') {
    var corruptionRisk = Math.round(Math.max(0, 100 - integrity * 0.8 + (Math.random() - 0.5) * 30));
    var performance = Math.round((profession + execution) / 2);
    var dialogue, summary;
    if (corruptionRisk > 65 && performance < 50) {
      dialogue = '\"感谢代表的关注。目前部门确实面临一些挑战。\" —— 负责人回避关键问题。';
      summary = '存在较高廉政风险（' + corruptionRisk + '），效能低于平均水平。';
    } else if (corruptionRisk < 35 && performance > 65) {
      dialogue = '\"代表提出的问题很有针对性。我们一直严格按规章办事。\" —— 答复条理清晰。';
      summary = '运行规范，廉政风险低（' + corruptionRisk + '），效能良好。';
    } else {
      dialogue = '\"关于这个问题，回去后会认真研究。\" —— 答复中规中矩。';
      summary = '未发现明显异常，廉政风险可控（' + corruptionRisk + '）。';
    }
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span class="mc-icon">💬</span><span class="mc-title">人大询问结果 · ' + deptName + '</span>' +
      '<button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="padding:12px;background:var(--bg-secondary);border-radius:6px;margin-bottom:10px;font-size:12px;">' + dialogue + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">' + summary + '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
          '<div style="flex:1;text-align:center;padding:6px;background:rgba(63,185,80,0.06);border-radius:4px;"><div style="font-size:11px;color:var(--text-secondary);">部门能力</div><div style="font-size:16px;font-weight:600;">' + performance + '</div></div>' +
          '<div style="flex:1;text-align:center;padding:6px;background:' + (corruptionRisk > 50 ? 'rgba(248,81,73,0.06)' : 'rgba(63,185,80,0.06)') + ';border-radius:4px;"><div style="font-size:11px;color:var(--text-secondary);">廉政风险</div><div style="font-size:16px;font-weight:600;color:' + (corruptionRisk > 50 ? 'var(--accent-red)' : 'var(--accent-green)') + ';">' + corruptionRisk + '</div></div>' +
        '</div>' +
        '<button class="fd-action-btn" onclick="uiManager._closeModal();uiManager.refreshAll();" style="width:100%;margin-top:10px;">关闭</button>' +
      '</div></div>';
    var county = stateManager.get('county');
    if (county && county.intel) county.intel[officialId + '_inquiry'] = { risk: corruptionRisk, week: gameEngine.turnCount || 0 };
    this._addEventLog('info', '人大监督', '通过人大党组对' + deptName + '开展询问，廉政风险' + corruptionRisk);
  } else {
    var roll = Math.random();
    var effectiveIntegrity = integrity + (Math.random() - 0.5) * 20;
    var result;
    if (effectiveIntegrity < 40 && roll < 0.35) {
      result = { severity:'high', trustChange:3, investigation:true,
        dialogue:'面对追问，' + offName + '承认\"部分资金使用存在不规范之处\"。',
        summary:'发现严重资金管理问题，人大决定成立调查组，纪委同步关注。', conclusion:'发现严重问题，已启动调查' };
    } else if (effectiveIntegrity < 60 && roll < 0.65) {
      result = { severity:'medium', trustChange:1, investigation:false,
        dialogue:'\"代表提的这个问题确实存在。\" ' + offName + '承认工作中存在不足。',
        summary:'发现程序性问题，人大常委会要求30天内提交整改报告。', conclusion:'程序性问题，限期整改' };
    } else {
      result = { severity:'low', trustChange:2, investigation:false,
        dialogue:'\"感谢人大代表的监督。\" ' + offName + '逐一回应了代表们的关切。',
        summary:'部门准备充分，代表满意度测评结果为\"基本满意\"。', conclusion:'答复满意' };
    }
    var outcomeIcon = result.severity === 'high' ? '🔴' : result.severity === 'medium' ? '🟡' : '🟢';
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:500px;">' +
      '<div class="mc-header"><span class="mc-icon">⚡</span><span class="mc-title">人大质询结果 · ' + deptName + '</span>' +
      '<button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="padding:12px;background:' + (result.severity === 'high' ? 'rgba(248,81,73,0.1)' : result.severity === 'medium' ? 'rgba(210,153,34,0.1)' : 'rgba(63,185,80,0.1)') + ';border-radius:6px;margin-bottom:10px;font-size:12px;">' + outcomeIcon + ' ' + result.dialogue + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">' + result.summary + '</div>' +
        '<table style="font-size:11px;width:100%;border-collapse:collapse;margin-bottom:10px;">' +
          '<tr><td style="padding:4px;color:var(--text-muted);">质询结论</td><td style="padding:4px;font-weight:500;color:' + (result.severity === 'high' ? 'var(--accent-red)' : result.severity === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)') + ';">' + result.conclusion + '</td></tr>' +
          (result.investigation ? '<tr><td style="padding:4px;color:var(--text-muted);">调查</td><td style="padding:4px;color:var(--accent-red);">已触发调查程序</td></tr>' : '') +
        '</table>' +
        '<button class="fd-action-btn" onclick="uiManager._closeModal();uiManager.refreshAll();" style="width:100%;">关闭</button>' +
      '</div></div>';
    if (result.trustChange) {
      var county = stateManager.get('county');
      if (county && county.superiorTrust) county.superiorTrust.citySecretary = Math.min(100, (county.superiorTrust.citySecretary || 50) + (result.severity === 'high' ? 3 : 1));
    }
    if (result.investigation) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, { type:'warning', title:'🔍 质询引发调查', message: deptName + '因质询发现问题，纪委已启动核查。' });
    }
    this._addEventLog('important', '人大监督', '通过人大党组建议对' + deptName + '启动质询,' + result.conclusion);
  }
  this.refreshAll();
};

// ============== 罢免案（派系透明版） ==============

UIManager.prototype._startDismissalVote = function(officialId) {
  var personnel = gameEngine.getSystem('personnel');
  var official = personnel ? personnel.get(officialId) : null;
  if (!official) { this.showToast('官员数据异常', 'error'); return; }

  var data = this._npcData;
  var result = this._calcDelegatesForIssue('dismissal', official._factionId);
  var total = data.delegates.length;
  var passNeeded = Math.ceil(total / 2) + 1;
  var projectedPass = result.support >= passNeeded;

  var factionOrder = ['secretary','magistrate','local','appointed','bureaucrat','nonaligned'];
  var factionColors = { secretary:'#7c3aed', magistrate:'#2563eb', local:'#16a34a', appointed:'#dc2626', bureaucrat:'#d97706', nonaligned:'#9ca3af' };

  var factionCards = '';
  for (var fi = 0; fi < factionOrder.length; fi++) {
    var fid = factionOrder[fi];
    var bf = result.byFaction[fid];
    if (!bf) continue;
    var isTarget = (fid === official._factionId);
    var mainStance = bf.support > bf.oppose ? 'support' : bf.oppose > bf.support ? 'oppose' : 'split';
    var stanceColor = mainStance === 'support' ? '#3fb950' : mainStance === 'oppose' ? '#f85149' : '#eab308';
    var stanceLabel = isTarget ? (fid === 'nonaligned' ? '🔴 无派系（各自判断）' : '🔴 被罢免方') : mainStance === 'support' ? '🟢 支持' : mainStance === 'oppose' ? '🔴 反对' : '🟡 摇摆';

    var lobbyBtn = '';
    if (!isTarget && mainStance !== 'support') {
      lobbyBtn = '<button class="sc-btn" style="padding:2px 6px;font-size:9px;" onclick="uiManager._factionLobbyDismissal(\'' + officialId + '\',\'' + fid + '\')">🎯 游说</button>';
    } else if (!isTarget && mainStance === 'support') {
      lobbyBtn = '<span style="font-size:9px;color:#3fb950;">已支持 ✓</span>';
    } else if (isTarget) {
      // 无派系被罢免方也可以逐个笼络（无派系不抱团）
      lobbyBtn = fid === 'nonaligned'
        ? '<button class="sc-btn" style="padding:2px 6px;font-size:9px;" onclick="uiManager._factionLobbyDismissal(\'' + officialId + '\',\'' + fid + '\')">🎯 逐个笼络</button>'
        : '<span style="font-size:9px;color:var(--text-muted);">不可游说</span>';
    }

    factionCards += '<div style="border-left:3px solid ' + bf.color + ';padding:6px 8px;margin-bottom:4px;border-radius:4px;background:var(--bg-card);font-size:11px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:600;">' + bf.factionName + '</span>' +
        '<span style="color:' + stanceColor + ';font-size:10px;">' + stanceLabel + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:2px;font-size:10px;">' +
        '<span style="color:#3fb950;">支持' + bf.support + '</span>' +
        '<span style="color:#f85149;">反对' + bf.oppose + '</span>' +
        '<span style="color:#484f58;">弃权' + bf.absent + '</span>' +
        '<span style="color:var(--text-muted);">共' + bf.total + '人</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">' +
        '<span style="font-size:9px;color:var(--text-secondary);">' + (bf.reasonNote || '') +
          (bf.relation !== undefined && bf.relation !== 999 ? '（关系 ' + bf.relation + '）' : '') +
        '</span>' +
        '<span>' + lobbyBtn + '</span>' +
      '</div>' +
    '</div>';
  }

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:540px;">' +
    '<div class="mc-header"><span class="mc-icon">⚖</span><span class="mc-title">罢免案 · ' + official.name + '</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body" style="max-height:65vh;overflow-y:auto;">' +
      '<div style="display:flex;gap:8px;margin-bottom:8px;font-size:11px;padding:6px 8px;background:rgba(255,255,255,0.02);border-radius:4px;flex-wrap:wrap;">' +
        '<span style="color:var(--text-muted);">拟罢免：</span><span style="font-weight:600;">' + official.name + '</span>' +
        '<span style="color:var(--text-muted);">｜职务：</span><span>' + official.title + '</span>' +
        '<span style="color:var(--text-muted);">｜派系：</span><span style="font-weight:600;color:' + (factionColors[official._factionId] || '#fff') + ';">' + (official.faction || '无') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(63,185,80,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#3fb950;">' + result.support + '</div><div style="font-size:9px;color:var(--text-muted);">支持罢免</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(248,81,73,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#f85149;">' + result.oppose + '</div><div style="font-size:9px;color:var(--text-muted);">反对罢免</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(255,255,255,0.02);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#484f58;">' + result.absent + '</div><div style="font-size:9px;color:var(--text-muted);">未决</div></div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text-secondary);margin-bottom:6px;">需 <strong>' + passNeeded + '</strong> 票通过｜预估 ' + (projectedPass ? '<span style="color:#3fb950;">可能通过</span>' : '<span style="color:#f85149;">可能不通过</span>') + '</div>' +
      '<div style="font-size:11px;font-weight:500;margin-bottom:4px;">📊 各派系立场</div>' +
      factionCards +
      '<button class="action-btn" style="width:100%;margin-top:6px;padding:8px;font-size:13px;background:var(--accent-red);color:#fff;" onclick="uiManager._executeDismissalVote(\'' + officialId + '\')">⚖ 发起罢免表决</button>' +
      '<button class="action-btn" style="width:100%;margin-top:4px;padding:6px;font-size:11px;background:transparent;border:1px solid var(--border-color);" onclick="uiManager._closeModal()">取消</button>' +
    '</div></div>';
};

UIManager.prototype._executeDismissalVote = function(officialId) {
  var personnel = gameEngine.getSystem('personnel');
  var official = personnel ? personnel.get(officialId) : null;
  if (!official) return;
  var data = this._npcData;
  var result = this._calcDelegatesForIssue('dismissal', official._factionId);
  var total = data.delegates.length;
  var needed = Math.ceil(total / 2) + 1;
  var passed = result.support >= needed;
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  if (passed) {
    if (!this._vacancies) this._vacancies = [];
    this._vacancies.push({ officialId: officialId, title: official.title, rank: official.rank || '正科', dismissedName: official.name, week: gameEngine.turnCount || 0 });
    official.title = '调研员（待安排）';
    official._disciplineStatus = 'transfer';
    if (official.relations) official.relations.player = Math.max(5, (official.relations.player||50) - 30);
    this._addEventLog('important', '人大', '罢免案通过：' + official.name + '被免去' + official.title + '职务');
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span class="mc-icon">⚖</span><span class="mc-title">罢免通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:14px;font-weight:700;padding:12px;background:rgba(248,81,73,0.12);border-radius:6px;color:var(--accent-red);margin-bottom:10px;">⚖ 人大表决通过罢免</div>' +
        '<div style="font-size:13px;line-height:1.7;color:var(--text-secondary);">' + official.name + '被免去' + official.title + '职务。<br>赞成' + result.support + '票 / 反对' + result.oppose + '票 / 弃权' + result.absent + '票。</div>' +
        '<button class="action-btn" style="width:100%;margin-top:12px;padding:8px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button>' +
      '</div></div>';
  } else {
    this._addEventLog('important', '人大', '罢免案未通过：' + official.name + '的罢免被否决');
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span class="mc-icon">⚖</span><span class="mc-title">罢免未通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:14px;font-weight:700;padding:12px;background:rgba(63,185,80,0.12);border-radius:6px;color:var(--accent-green);margin-bottom:10px;">⚖ 人大表决未通过罢免</div>' +
        '<div style="font-size:13px;line-height:1.7;color:var(--text-secondary);">赞成' + result.support + '票 / 反对' + result.oppose + '票 / 弃权' + result.absent + '票，未达到' + needed + '票过半数。</div>' +
        '<button class="action-btn" style="width:100%;margin-top:12px;padding:8px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button>' +
      '</div></div>';
  }
  data.lastVoteResult = { support: result.support, oppose: result.oppose, absent: result.absent };
  for (var i = 0; i < data.delegates.length; i++) { data.delegates[i].lobbyBias = 0; }
  this.refreshAll();
};

// ============== 常委会罢免（局长级别） ==============

/** 发起常委会罢免案（35名常委投票） */
UIManager.prototype._startSCDismissalVote = function(officialId) {
  var personnel = gameEngine.getSystem('personnel');
  var official = personnel ? personnel.get(officialId) : null;
  if (!official) { this.showToast('官员数据异常', 'error'); return; }

  var data = this._npcData;
  var sc = data.standingCommittee;
  if (!sc || !sc.members || sc.members.length === 0) { this.showToast('常委会尚未组建', 'error'); return; }
  var members = sc.members;

  // 常委会投票：每个常委按派系关系+个人倾向投票
  var support = 0, oppose = 0, absent = 0;
  var factionSys = gameEngine?.getSystem?.('factions');
  var targetFaction = official._factionId;

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var score = 0;
    if (targetFaction && m.delegationId === targetFaction) {
      if (targetFaction === 'nonaligned') score = 0; // 无派系不抱团
      else score = -20; // 同派系反对（常委会力度小一点）
    } else if (targetFaction && factionSys) {
      var rel = factionSys.getRelation(m.delegationId, targetFaction);
      score = -rel * 0.5; // 关系越好越反对罢免
    }
    score += (m.personalBias || 0) + (m.influence || 1) * 1.5 + Math.floor(Math.random() * 7) - 3;

    if (score > 2) support++;
    else if (score < -2) oppose++;
    else absent++;
  }

  var total = members.length;
  var needed = Math.ceil(total / 2) + 1;
  var projectedPass = support >= needed;

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:480px;">' +
    '<div class="mc-header"><span class="mc-icon">⚖</span><span class="mc-title">常委会罢免 · ' + official.name + '</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="font-size:11px;padding:6px 8px;background:rgba(255,255,255,0.02);border-radius:4px;margin-bottom:8px;">' +
        '<span style="color:var(--text-muted);">拟罢免：</span><span style="font-weight:600;">' + official.name + '</span>' +
        '<span style="color:var(--text-muted);">｜职务：</span><span>' + official.title + '</span>' +
        '<span style="color:var(--text-muted);">｜程序：</span><span style="color:var(--accent-amber);">县人大常委会表决</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:6px;">' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(63,185,80,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#3fb950;">' + support + '</div><div style="font-size:9px;color:var(--text-muted);">赞成罢免</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(248,81,73,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#f85149;">' + oppose + '</div><div style="font-size:9px;color:var(--text-muted);">反对</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(255,255,255,0.02);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#484f58;">' + absent + '</div><div style="font-size:9px;color:var(--text-muted);">弃权</div></div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text-secondary);margin-bottom:8px;">35名常委需 <strong>' + needed + '</strong> 票通过 | ' + (projectedPass ? '<span style="color:#3fb950;">可能通过</span>' : '<span style="color:#f85149;">可能不通过</span>') + '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="action-btn" style="flex:2;padding:6px;font-size:12px;background:var(--accent-red);color:#fff;" onclick="uiManager._executeSCDismissalVote(\'' + officialId + '\')">⚖ 发起常委表决</button>' +
        '<button class="action-btn" style="flex:1;padding:6px;font-size:11px;background:transparent;border:1px solid var(--border-color);" onclick="uiManager._closeModal()">取消</button>' +
      '</div>' +
    '</div></div>';
};

/** 执行常委会罢免表决 */
UIManager.prototype._executeSCDismissalVote = function(officialId) {
  var personnel = gameEngine.getSystem('personnel');
  var official = personnel ? personnel.get(officialId) : null;
  if (!official) return;
  var data = this._npcData;
  var sc = data.standingCommittee;
  if (!sc || !sc.members) return;
  var members = sc.members;

  var support = 0, oppose = 0, absent = 0;
  var factionSys = gameEngine?.getSystem?.('factions');
  var targetFaction = official._factionId;

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var score = 0;
    if (targetFaction && m.delegationId === targetFaction) {
      if (targetFaction === 'nonaligned') score = 0;
      else score = -20;
    } else if (targetFaction && factionSys) {
      var rel = factionSys.getRelation(m.delegationId, targetFaction);
      score = -rel * 0.5;
    }
    score += (m.personalBias || 0) + (m.influence || 1) * 1.5 + Math.floor(Math.random() * 7) - 3;
    if (score > 2) support++;
    else if (score < -2) oppose++;
    else absent++;
  }

  var total = members.length;
  var needed = Math.ceil(total / 2) + 1;
  var passed = support >= needed;

  // 保存常委会投票结果
  data.scLastVoteResult = { support: support, oppose: oppose, absent: absent };

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  if (passed) {
    if (!this._vacancies) this._vacancies = [];
    this._vacancies.push({ officialId: officialId, title: official.title, rank: official.rank || '正科', dismissedName: official.name, week: gameEngine.turnCount || 0 });
    official.title = '调研员（待安排）';
    official._disciplineStatus = 'transfer';
    if (official.relations) official.relations.player = Math.max(5, (official.relations.player||50) - 30);
    this._addEventLog('important', '人大常委会', '✅ 免职通过：' + official.name + '被免去' + official.title);
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:440px;">' +
      '<div class="mc-header"><span class="mc-icon">⚖</span><span class="mc-title">免职通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body"><div style="padding:10px;background:rgba(248,81,73,0.12);border-radius:6px;color:var(--accent-red);margin-bottom:8px;font-size:14px;font-weight:700;">⚖ 人大常委会表决通过免职</div>' +
      '<div style="font-size:12px;">赞成' + support + '票 / 反对' + oppose + '票 / 弃权' + absent + '票</div>' +
      '<button class="action-btn" style="width:100%;margin-top:10px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button></div></div>';
  } else {
    this._addEventLog('important', '人大常委会', '❌ 免职被否决：' + official.name);
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:440px;">' +
      '<div class="mc-header"><span class="mc-icon">❌</span><span class="mc-title">免职未通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body"><div style="padding:10px;background:rgba(63,185,80,0.12);border-radius:6px;color:var(--accent-green);margin-bottom:8px;font-size:14px;font-weight:700;">❌ 未达过半数</div>' +
      '<div style="font-size:12px;">赞成' + support + '票 / 反对' + oppose + '票 / 弃权' + absent + '票，未达' + needed + '票</div>' +
      '<button class="action-btn" style="width:100%;margin-top:10px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button></div></div>';
  }
  this.refreshAll();
};

UIManager.prototype._npcLobbyAction = function(action) {
  // 旧游说方法保留
};

// ============== 派系游说系统 ==============

UIManager.prototype._factionLobbyDismissal = function(officialId, factionId) {
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  var player = stateManager.get('player');
  var fin = stateManager.get('finance');

  var factionNames = { secretary:'书记派', magistrate:'政府派', local:'本土派', appointed:'空降派', bureaucrat:'技术官僚', nonaligned:'无派系' };
  var name = factionNames[factionId] || factionId;

  // 无派系：逐个笼络，每次固定拉拢N名代表
  if (factionId === 'nonaligned') {
    var data = this._npcData;
    var nonalignedDelegates = (data.delegationMap['nonaligned'] || []).filter(function(d) { return (d.lobbyBias || 0) < 10; });
    var totalLeft = nonalignedDelegates.length;
    var totalNonaligned = (data.delegationMap['nonaligned'] || []).length;
    var alreadyLobbied = totalNonaligned - totalLeft;

    var batchOptions = [
      { id:'nl_small', label:'📋 笼络5名代表', desc:'逐个接触5名无派系代表，承诺小恩小惠', cost:'财政20万', effect:15, count:5, costCheck:(fin?.treasuryBalance||0)>=20 },
      { id:'nl_medium', label:'📋 笼络10名代表', desc:'接触10名无派系代表，给予具体利益承诺', cost:'财政40万', effect:18, count:10, costCheck:(fin?.treasuryBalance||0)>=40 },
      { id:'nl_large', label:'📋 笼络15名代表', desc:'大范围接触无派系代表，全面利益输送', cost:'财政60万', effect:20, count:15, costCheck:(fin?.treasuryBalance||0)>=60, risk:'可能有风声走漏' },
    ];

    var optionsHtml = batchOptions.map(function(opt) {
      var disabled = (!opt.costCheck || opt.count > totalLeft) ? 'opacity:0.4;pointer-events:none;' : '';
      var available = Math.min(opt.count, totalLeft);
      return '<div style="padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;margin-bottom:4px;cursor:pointer;font-size:11px;' + disabled + '" ' +
        'onclick="uiManager._executeNonalignedLobby(\'' + officialId + '\',\'' + opt.id + '\',' + available + ',' + opt.effect + ')">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<span style="font-weight:500;">' + opt.label + '</span>' +
          '<span style="font-size:10px;color:var(--text-muted);">' + opt.cost + '</span>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + opt.desc + '（剩余' + totalLeft + '人）</div>' +
        (opt.risk ? '<div style="font-size:9px;color:var(--accent-red);margin-top:1px;">⚠ ' + opt.risk + '</div>' : '') +
      '</div>';
    }).join('');

    overlay.classList.remove('hidden');
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:420px;">' +
      '<div class="mc-header"><span class="mc-icon">🎯</span><span class="mc-title">逐笼无派系代表</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
      '<div class="mc-body">' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">无派系代表不抱团，需逐个笼络。已笼络' + alreadyLobbied + '/' + totalNonaligned + '人，拿了好处必按您意愿投票。</div>' +
        optionsHtml +
        '<button class="sc-btn" style="width:100%;margin-top:4px;background:var(--bg-secondary);font-size:11px;" onclick="uiManager._closeModal()">← 返回</button>' +
      '</div></div>';
    return;
  }

  // 五大派系：按派系统一游说
  var lobbyOptions = [
    { id:'project', label:'🏗 项目承诺', desc:'承诺在该派系关注的领域安排项目资金', cost:'财政80万', costCheck:(fin?.treasuryBalance||0)>=80, effect:15 },
    { id:'talk', label:'💬 个别沟通', desc:'与派系核心人物私下做政治交易', cost:'政治资本6', costCheck:(player?.politicalCapital||0)>=6, effect:10 },
    { id:'appoint', label:'📈 人事许诺', desc:'承诺在空缺职位中考虑该派系人选', cost:'政治资本10', costCheck:(player?.politicalCapital||0)>=10, effect:20 },
    { id:'pressure', label:'⚡ 施压', desc:'以县委名义施加压力，效果强力但有后患', cost:'政资8+关系-5', costCheck:(player?.politicalCapital||0)>=8, effect:25 },
    { id:'bribe', label:'💰 利益输送', desc:'暗箱操作，效果最大但风险极高', cost:'腐败+20', costCheck:true, effect:30 },
  ];

  var optionsHtml = lobbyOptions.map(function(opt) {
    var disabled = opt.costCheck ? '' : 'opacity:0.4;pointer-events:none;';
    return '<div style="padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;margin-bottom:4px;cursor:pointer;font-size:11px;' + disabled + '" ' +
      'onclick="uiManager._executeFactionLobby(\'' + officialId + '\',\'' + factionId + '\',\'' + opt.id + '\',' + opt.effect + ')">' +
      '<div style="display:flex;justify-content:space-between;">' +
        '<span style="font-weight:500;">' + opt.label + '</span>' +
        '<span style="font-size:10px;color:var(--text-muted);">' + opt.cost + '</span>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + opt.desc + '</div>' +
    '</div>';
  }).join('');

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:420px;">' +
    '<div class="mc-header"><span class="mc-icon">🎯</span><span class="mc-title">游说 ' + name + '</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">选择游说策略，影响该派系全体代表投票倾向（拿好处后必按意愿投票）：</div>' +
      optionsHtml +
      '<button class="sc-btn" style="width:100%;margin-top:4px;background:var(--bg-secondary);font-size:11px;" onclick="uiManager._closeModal()">← 返回</button>' +
    '</div></div>';
};

UIManager.prototype._executeFactionLobby = function(officialId, factionId, action, effect) {
  var player = stateManager.get('player');
  var fin = stateManager.get('finance');
  var data = this._npcData;

  if (action === 'project') {
    if ((fin?.treasuryBalance||0) < 80) { this.showToast('财政资金不足', 'warning'); return; }
    fin.treasuryBalance -= 80;
  } else if (action === 'talk') {
    if ((player?.politicalCapital||0) < 6) { return this.showToast('政治资本不足', 'warning'); }
    player.politicalCapital -= 6;
  } else if (action === 'appoint') {
    if ((player?.politicalCapital||0) < 10) { return this.showToast('政治资本不足', 'warning'); }
    player.politicalCapital -= 10;
  } else if (action === 'pressure') {
    if ((player?.politicalCapital||0) < 8) { return this.showToast('政治资本不足', 'warning'); }
    player.politicalCapital -= 8;
    var factionSys = gameEngine?.getSystem?.('factions');
    if (factionSys) { factionSys.modifyRelation('secretary', factionId, -5); }
  } else if (action === 'bribe') {
    if (player) {
      player.corruption = player.corruption || { level: 0 };
      player.corruption.level = Math.min(100, (player.corruption.level || 0) + 20);
    }
  }

  for (var i = 0; i < data.delegates.length; i++) {
    if (data.delegates[i].delegationId === factionId) {
      data.delegates[i].lobbyBias = (data.delegates[i].lobbyBias || 0) + effect;
    }
  }

  this.showToast('游说完成', 'success');
  this._addEventLog('info', '人大游说', '对' + factionId + '派系进行游说');
  this._closeModal();
  this._startDismissalVote(officialId);
  this.refreshAll();
};

/** 逐笼无派系代表（逐个分配lobbyBias） */
UIManager.prototype._executeNonalignedLobby = function(officialId, action, count, effect) {
  var fin = stateManager.get('finance');

  // 扣费
  var cost = action === 'nl_small' ? 20 : action === 'nl_medium' ? 40 : 60;
  if ((fin?.treasuryBalance||0) < cost) { this.showToast('财政资金不足', 'warning'); return; }
  fin.treasuryBalance -= cost;

  var data = this._npcData;
  var nonaligned = (data.delegationMap['nonaligned'] || []).filter(function(d) { return (d.lobbyBias || 0) < 10; });
  var target = nonaligned.slice(0, count);

  for (var i = 0; i < target.length; i++) {
    target[i].lobbyBias = (target[i].lobbyBias || 0) + effect;
  }

  this.showToast('笼络了' + target.length + '名无派系代表', 'success');
  this._addEventLog('info', '人大游说', '逐笼' + target.length + '名无派系代表');
  this._closeModal();
  this._startDismissalVote(officialId);
  this.refreshAll();
};

// ============== 任命票 ==============

UIManager.prototype._appointToVacancy = function(talentId, officialId, title) {
  var personnel = gameEngine.getSystem('personnel');
  var existing = personnel ? personnel.get(officialId) : null;
  if (!existing) return;
  this._talentNomination = { talentId:talentId, officialId:officialId, talentName:'', title:title, existingName:existing.name };
  if (!this._npcInitialized) this._initNPC();
  var data = this._npcData;
  var result = this._calcDelegatesForIssue('appointment', existing._factionId);
  var total = data.delegates.length;
  var passNeeded = Math.ceil(total / 2) + 1;
  var projectedPass = result.support >= passNeeded;

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:540px;">' +
    '<div class="mc-header"><span class="mc-icon">📋</span><span class="mc-title">任命确认 · ' + existing.name + '</span><button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="display:flex;gap:6px;margin-bottom:8px;font-size:11px;"><span style="color:var(--text-muted);">拟任命：</span><span>' + existing.name + '</span><span style="color:var(--text-muted);">｜' + title + '</span><span style="color:var(--text-muted);">｜派系：</span><span>' + (existing.faction || '无') + '</span></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(63,185,80,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#3fb950;">' + result.support + '</div><div style="font-size:9px;color:var(--text-muted);">支持</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(248,81,73,0.06);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#f85149;">' + result.oppose + '</div><div style="font-size:9px;color:var(--text-muted);">反对</div></div>' +
        '<div style="flex:1;text-align:center;padding:6px;background:rgba(255,255,255,0.02);border-radius:4px;"><div style="font-size:18px;font-weight:700;color:#484f58;">' + result.absent + '</div><div style="font-size:9px;color:var(--text-muted);">未决</div></div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text-secondary);margin-bottom:8px;">需 ' + passNeeded + ' 票通过｜预估 ' + (projectedPass ? '<span style="color:#3fb950;">可能通过</span>' : '<span style="color:#f85149;">可能不通过</span>') + '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="action-btn" style="flex:2;padding:8px;font-size:13px;background:var(--accent-green);color:#fff;" onclick="uiManager._executeAppointmentVote()">🗳 发起表决</button>' +
        '<button class="action-btn" style="flex:1;padding:8px;font-size:12px;background:transparent;border:1px solid var(--border-color);" onclick="uiManager._closeModal()">取消</button>' +
      '</div>' +
    '</div></div>';
};

UIManager.prototype._executeAppointmentVote = function() {
  var nom = this._talentNomination;
  if (!nom) { this.showToast('未找到提名信息', 'error'); return; }
  var personnel = gameEngine.getSystem('personnel');
  var existing = personnel ? personnel.get(nom.officialId) : null;
  if (!existing) { this.showToast('该职位数据已变化', 'error'); return; }
  var data = this._npcData;
  var result = this._calcDelegatesForIssue('appointment', existing._factionId);
  var total = data.delegates.length;
  var needed = Math.ceil(total / 2) + 1;
  var passed = result.support >= needed;
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  data.lastVoteResult = { support: result.support, oppose: result.oppose, absent: result.absent };
  for (var di = 0; di < data.delegates.length; di++) { data.delegates[di].lobbyBias = 0; }

  if (passed) {
    var talentPool = this._talentPool || [];
    var talent = null;
    for (var ti = 0; ti < talentPool.length; ti++) {
      if (talentPool[ti].id === nom.talentId) { talent = talentPool[ti]; break; }
    }
    if (talent) {
      existing.abilities = talent.baseAbilities;
      existing._ability = talent.ability || 50;
    }
    existing.title = nom.title;
    existing._disciplineStatus = 'active';
    if (existing.relations) existing.relations.player = Math.min(100, (existing.relations.player||50) + 15);
    this._vacancies = (this._vacancies || []).filter(function(v) { return v.officialId !== nom.officialId; });
    this._talentNomination = null;
    this._addEventLog('important', '人大', '✅ 任命通过：' + existing.name + '就任' + nom.title);
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span class="mc-icon">✅</span><span class="mc-title">任命通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body"><div style="padding:12px;background:rgba(63,185,80,0.12);border-radius:6px;color:var(--accent-green);margin-bottom:10px;font-size:14px;font-weight:700;">✅ 人大表决通过任命</div>' +
      '<div style="font-size:13px;">赞成' + result.support + '票 / 反对' + result.oppose + '票 / 弃权' + result.absent + '票</div>' +
      '<button class="action-btn" style="width:100%;margin-top:12px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button></div></div>';
  } else {
    this._addEventLog('important', '人大', '❌ 任命被否决：' + existing.name + '未获任命');
    overlay.innerHTML = '' +
      '<div class="modal-card" style="max-width:480px;">' +
      '<div class="mc-header"><span class="mc-icon">❌</span><span class="mc-title">任命未通过</span><button class="mc-close" onclick="uiManager._closeModal();uiManager.refreshAll();">✕</button></div>' +
      '<div class="mc-body"><div style="padding:12px;background:rgba(248,81,73,0.12);border-radius:6px;color:var(--accent-red);margin-bottom:10px;font-size:14px;font-weight:700;">❌ 人大表决未通过任命</div>' +
      '<div style="font-size:13px;">赞成' + result.support + '票 / 反对' + result.oppose + '票 / 弃权' + result.absent + '票，未达' + needed + '票半数。</div>' +
      '<button class="action-btn" style="width:100%;margin-top:12px;" onclick="uiManager._closeModal();uiManager.refreshAll();">确认</button></div></div>';
  }
  this.refreshAll();
};

// ============== 旧投票游说界面（保留兼容） ==============

UIManager.prototype._showLobbyInteractions = function(officialId) {
  var personnel = gameEngine.getSystem('personnel');
  var o = personnel?.get(officialId);
  if (!o) return;
  var rel = o.relations?.player || 50;
  var loy = o._loyalty != null ? o._loyalty : 50;
  var lev = o._leverage || 0;
  var successChance = Math.min(95, Math.round(rel * 0.3 + loy * 0.3 + lev * 0.4));

  function renderLobbyAction(key, label, desc, pcCost) {
    var costStr = pcCost ? '政治资本' + pcCost : '免费';
    var onclick = "uiManager._executeLobbyAction('" + officialId + "','" + key + "')";
    return '<div class="int-card" onclick="' + onclick + '">' +
      '<div class="int-row"><span class="int-label">' + label + '</span><span class="int-cost">' + costStr + '</span></div>' +
      '<div class="int-desc">' + desc + '</div>' +
      '<div class="int-benefit">成功率 ' + successChance + '%</div></div>';
  }

  var html = '<div class="int-status">关系' + rel + ' | 忠诚' + loy + ' | 把柄' + lev + ' | 预估成功率 ' + successChance + '%</div>';
  html += '<div class="int-group-header">🎯 游说投票方向</div>';
  html += renderLobbyAction('lobby_support', '✅ 要求支持', '游说此委员投支持票', 3);
  html += renderLobbyAction('lobby_oppose', '❌ 要求反对', '游说此委员投反对票', 3);
  html += renderLobbyAction('lobby_abstain', '⬜ 要求弃权', '游说此委员投弃权票', 0);
  html += '<div class="int-group-header" style="margin-top:8px;">💵 利益交换（增加腐败风险）</div>';
  html += '<div class="int-card" onclick="uiManager._executeLobbyAction(\'' + officialId + '\',\'lobby_bribe\')">' +
    '<div class="int-row"><span class="int-label">💰 利益输送</span><span class="int-cost">财政50万 + 腐败↑</span></div>' +
    '<div class="int-desc">用财政资金私下输送利益</div>' +
    '<div class="int-benefit">成功率 ' + Math.min(95, successChance + 20) + '%（+20%）</div></div>';

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:480px;">' +
    '<div class="mc-header"><span class="mc-icon">🗳</span><span class="mc-title">' + o.name + ' · 投票游说</span>' +
    '<button class="mc-close" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">✕</button></div>' +
    '<div class="mc-body">' + html +
      '<div style="margin-top:10px;"><button class="action-btn" style="width:100%;padding:8px;font-size:12px;background:transparent;border:1px solid var(--border-color);" onclick="document.getElementById(\'modal-overlay\').classList.add(\'hidden\')">← 返回</button></div>' +
    '</div></div>';
};

UIManager.prototype._closeLobby = function() {
  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  try {
    if (this._lobbyIssueId && this._lobbyIssueId.indexOf('appt_') === 0) {
      var apptId = this._lobbyIssueId.replace('appt_', '');
      this._refreshAppointmentLobby(apptId);
      return;
    } else if (this._lobbyIssueId) {
      this._showPreVoteLobby(this._lobbyIssueId);
      return;
    }
  } catch (e) {
    console.warn('[Lobby] 返回出错,直接关闭:', e.message);
  }
  overlay.classList.add('hidden');
};

UIManager.prototype._showPreVoteLobby = function(issueId) {
  // 保留方法空实现，不再需要
};

UIManager.prototype._refreshAppointmentLobby = function(officialId) {
  // 保留方法空实现，不再需要
};

// ============== 人大常委会系统 ==============

/** 初始化人大常委会（35名常委，按派系比例分配） */
UIManager.prototype._ensureStandingCommittee = function() {
  if (this._npcData && this._npcData.standingCommittee) return; // 已初始化

  var data = this._npcData;
  if (!data || !data.delegations) { this._initNPC(); data = this._npcData; }

  // 分配35个常委席位（按派系代表数比例）
  var totalDelegates = data.delegates.length; // 243
  var scSeats = 35;
  var delegationSeats = {};
  var remaining = scSeats;

  // 第一轮：按比例分配
  for (var di = 0; di < data.delegations.length; di++) {
    var dlg = data.delegations[di];
    var seats = Math.max(1, Math.round(dlg.count / totalDelegates * scSeats));
    delegationSeats[dlg.factionId] = seats;
    remaining -= seats;
  }
  // 第二轮：剩余席位补给出让最多的派系
  while (remaining > 0) {
    for (var ri = 0; ri < data.delegations.length && remaining > 0; ri++) {
      delegationSeats[data.delegations[ri].factionId]++;
      remaining--;
    }
  }

  // 按影响力从各派系选取常委
  var members = [];
  for (var fi = 0; fi < data.delegations.length; fi++) {
    var fid = data.delegations[fi].factionId;
    var factionDelegates = (data.delegationMap[fid] || []).slice();
    factionDelegates.sort(function(a, b) { return b.influence - a.influence; });
    var count = Math.min(delegationSeats[fid], factionDelegates.length);
    for (var mi = 0; mi < count; mi++) {
      members.push(factionDelegates[mi]);
    }
  }

  // 选常委会主任/副主任（由影响力最高的常委担任）
  members.sort(function(a, b) { return b.influence - a.influence; });

  data.standingCommittee = {
    members: members,
    chairperson: members[0],
    viceChairpersons: members.slice(1, 4),
    meetings: [],
    lastMeetingMonth: 0,
  };
};

/** 检查是否需要召开人大常委会会议（每2个月一次） */
UIManager.prototype._checkStandingCommitteeMeeting = function(month) {
  var data = this._npcData;
  if (!data || !data.standingCommittee) return;
  var sc = data.standingCommittee;
  if (!sc) return;

  // 双月例会：2,4,6,8,10,12月
  if (month % 2 === 0 && month !== sc.lastMeetingMonth) {
    sc.lastMeetingMonth = month;
    // 延迟一回合触发，避免刷新冲突
    setTimeout((function(ui) {
      return function() { ui._openStandingCommitteeMeeting(); };
    })(this), 500);
  }
};

/** 打开人大常委会会议面板 */
UIManager.prototype._openStandingCommitteeMeeting = function() {
  var data = this._npcData;
  var sc = data.standingCommittee;
  if (!sc) return;

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  var month = timeSystem ? timeSystem.month : 1;
  var meetingType = month === 2 ? '财政执行监督' : month === 4 ? '专项工作报告审议' :
    month === 6 ? '半年工作评估' : month === 8 ? '民生项目督查' :
    month === 10 ? '预算调整审议' : '年度工作总结';

  // 议程项目（根据会议类型生成，每项都有操作选项）
  var agendas = [];
  if (meetingType === '财政执行监督') {
    var fin = stateManager.get('finance');
    var bal = fin ? Math.round(fin.treasuryBalance || 0) : 0;
    agendas = [
      { id:'ag_01', label:'📊 听取财政收支情况报告', desc:'1-2月财政预算执行进度：余额' + bal + '万元',
        options:[
          { label:'✅ 批准报告', effect:'财政信任+1', action:function(){ var f=stateManager.get('finance');if(f)f.fiscalTrust=(f.fiscalTrust||50)+2; } },
          { label:'📋 要求补充材料', effect:'部门加班加点', action:function(){ } },
          { label:'⚠️ 提出质询', effect:'常委关注度↑', action:function(){ } },
        ]},
      { id:'ag_02', label:'🔍 审议专项转移支付使用情况', desc:'上级转移支付资金的分配和使用合规性检查',
        options:[
          { label:'✅ 通过合规审查', effect:'上级评价+1', action:function(){ } },
          { label:'🔦 要求专项审计', effect:'可能发现问题', action:function(){ var f=stateManager.get('finance');if(f)f.auditTriggered=true; } },
        ]},
      { id:'ag_03', label:'📋 讨论下季度财政支出优先序', desc:'确定下一阶段财政资金投向重点',
        options:[
          { label:'🏗 倾向基础设施', effect:'建设速度+10%', action:function(){ var c=stateManager.get('county');if(c&&c.economy)c.economy.constructionBoost=10; } },
          { label:'🏥 倾向民生保障', effect:'社会满意度+2', action:function(){ } },
          { label:'📈 倾向产业扶持', effect:'企业活力+5%', action:function(){ var c=stateManager.get('county');if(c&&c.economy)c.economy.industryBoost=5; } },
        ]},
    ];
  } else if (meetingType === '专项工作报告审议') {
    var depts = ['教育局', '卫健局', '农业农村局'];
    var randomDept = depts[Math.floor(Math.random() * depts.length)];
    agendas = [
      { id:'ag_01', label:'📋 听取' + randomDept + '专项工作报告', desc: randomDept + '负责人到会报告近期工作',
        options:[
          { label:'✅ 肯定成绩，提出建议', effect:'部门士气+3', action:function(){ } },
          { label:'📋 要求整改问题', effect:'部门焦灼', action:function(){ } },
          { label:'🔥 严厉批评', effect:'部门负责人紧张', action:function(){ } },
        ]},
      { id:'ag_02', label:'🗳 表决通过工作报告', desc:'常委对报告进行正式表决',
        effect:'vote', voteLabel:'开始表决'},
      { id:'ag_03', label:'📋 讨论代表议案办理进度', desc:'检查人大代表建议的办理情况',
        options:[
          { label:'✅ 办理情况良好', effect:'代表满意度+2', action:function(){ } },
          { label:'⚠️ 点名批评滞后单位', effect:'部门紧迫感↑', action:function(){ } },
        ]},
    ];
  } else if (meetingType === '半年工作评估') {
    agendas = [
      { id:'ag_01', label:'📊 审议上半年经济指标完成情况', desc:'检查GDP、固投、财政收入等核心指标进度',
        options:[
          { label:'✅ 达标，下半年保持', effect:'信心+1', action:function(){ } },
          { label:'⚠️ 部分指标滞后，加强督导', effect:'执行力+2', action:function(){ var c=stateManager.get('county');if(c)c.enforcement=2; } },
        ]},
      { id:'ag_02', label:'💰 审查预算执行偏差', desc:'比对预算批复与实际支出差异',
        options:[
          { label:'✅ 偏差在合理范围', effect:'财政评价+1', action:function(){ var f=stateManager.get('finance');if(f)f.fiscalTrust=(f.fiscalTrust||50)+1; } },
          { label:'🔦 对偏差较大的项目开展核查', effect:'可能发现浪费', action:function(){ } },
        ]},
      { id:'ag_03', label:'🗳 表决下半年工作调整方案', desc:'根据上半年执行情况调整下半年工作部署',
        effect:'vote', voteLabel:'审议调整方案'},
    ];
  } else if (meetingType === '民生项目督查') {
    agendas = [
      { id:'ag_01', label:'📋 督查重点民生实事进度', desc:'检查年初承诺的10件民生实事推进情况',
        options:[
          { label:'✅ 总体进展顺利', effect:'社会评价+1', action:function(){ } },
          { label:'⚠️ 约谈滞后项目责任人', effect:'问责压力↑', action:function(){ } },
        ]},
      { id:'ag_02', label:'🗳 听取群众反映突出问题汇报', desc:'信访集中问题及积案化解进展',
        effect:'vote', voteLabel:'审议信访报告'},
      { id:'ag_03', label:'📋 研究下阶段民生工作部署', desc:'确定下一季度民生工作优先方向',
        options:[
          { label:'🏫 教育提升', effect:'教育资源+2', action:function(){ } },
          { label:'🏥 医疗改善', effect:'医疗水平+2', action:function(){ } },
          { label:'🚌 交通优化', effect:'交通便利度+2', action:function(){ } },
        ]},
    ];
  } else if (meetingType === '预算调整审议') {
    agendas = [
      { id:'ag_01', label:'🗳 审议预算调整方案', desc:'根据上半年执行情况调整年度预算',
        effect:'vote', voteLabel:'表决调整方案'},
      { id:'ag_02', label:'📋 审查新增政府投资项目', desc:'部门申报的新增项目必要性评估',
        options:[
          { label:'✅ 批准一批重点项目', effect:'发展速度+5%', action:function(){ } },
          { label:'🔍 委托第三方做可研', effect:'项目质量更高', action:function(){ } },
          { label:'❌ 暂缓新增项目', effect:'财政压力↓', action:function(){ var f=stateManager.get('finance');if(f)f.treasuryBalance=(f.treasuryBalance||0)+200; } },
        ]},
    ];
  } else {
    agendas = [
      { id:'ag_01', label:'🗳 审议县政府年度工作报告', desc:'听取和审议县政府年度工作及来年计划',
        effect:'vote', voteLabel:'审议报告'},
      { id:'ag_02', label:'📋 讨论来年工作方向', desc:'初步确定明年工作重点领域',
        options:[
          { label:'📈 经济发展优先', effect:'经济增速+2%', action:function(){ } },
          { label:'🏘 社会稳定优先', effect:'社会张力-5', action:function(){ } },
          { label:'🚩 改革创新优先', effect:'创新能力+3', action:function(){ } },
        ]},
    ];
  }

  var memberCards = sc.members.map(function(m) {
    var col = '#58a6ff';
    var dlg = data.delegations.find(function(d) { return d.factionId === m.delegationId; });
    if (dlg) col = dlg.color;
    return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + col + ';margin:1px;cursor:pointer;" title="' + m.name + '·' + m.delegationName + '·影响力' + m.influence + '"></span>';
  }).join('');

  var completed = sc.completedAgendas || {};
  var agendaHtml = agendas.map(function(a, idx) {
    var done = completed[a.id];
    var icon = done ? '✅' : (a.effect === 'vote' ? '🗳' : '📋');
    var opacity = done ? '0.5' : '1';
    var actionHtml = '';
    if (done) {
      actionHtml = '<span style="font-size:9px;color:var(--accent-green);">已完成 ✓</span>';
    } else if (a.effect === 'vote') {
      actionHtml = '<button class="sc-btn" style="padding:3px 10px;font-size:10px;" onclick="uiManager._scVote(\'' + a.id + '\',\'' + a.label.replace(/'/g,"\\'") + '\')">' + (a.voteLabel || '表决') + '</button>';
    } else if (a.options && a.options.length > 0) {
      actionHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">' +
        a.options.map(function(o, oi) {
          return '<button class="sc-btn" style="padding:2px 6px;font-size:9px;" onclick="uiManager._scExecuteAgenda(\'' + a.id + '\',\'' + a.label.replace(/'/g,"\\'") + '\',' + oi + ')">' + o.label + '</button>';
        }).join('') + '</div>';
    }
    return '<div style="padding:8px 10px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:4px;font-size:11px;opacity:' + opacity + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div style="flex:1;"><span style="font-weight:500;">' + icon + ' ' + a.label + '</span>' +
        '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + a.desc + '</div>' + actionHtml + '</div>' +
      '</div></div>';
  }).join('');

  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:540px;">' +
    '<div class="mc-header"><span class="mc-icon">🏛</span><span class="mc-title">县人大常委会 · ' + meetingType + '</span>' +
    '<button class="mc-close" onclick="uiManager._closeModal()">✕</button></div>' +
    '<div class="mc-body" style="max-height:65vh;overflow-y:auto;">' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">县人大常委会现有常委 <strong>' + sc.members.length + '</strong> 人，本次会议议程如下：</div>' +
      '<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:2px;">' + memberCards + '</div>' +
      '<div style="font-size:11px;font-weight:500;margin:6px 0 4px;">📋 议程</div>' +
      agendaHtml +
      '<div style="margin-top:8px;font-size:10px;color:var(--text-muted);">常委会会议实行全体常委过半数通过制。</div>' +
      '<button class="fd-action-btn" onclick="uiManager._closeModal()" style="width:100%;margin-top:8px;">关闭</button>' +
    '</div></div>';
};

/** 执行常委会议程操作选项 */
UIManager.prototype._scExecuteAgenda = function(agendaId, agendaLabel, optionIndex) {
  var data = this._npcData;
  var sc = data.standingCommittee;
  if (!sc) return;

  // 将选择结果临时存储，待重新渲染会议面板时使用
  if (!sc.completedAgendas) sc.completedAgendas = {};
  sc.completedAgendas[agendaId] = { optionIndex: optionIndex, label: agendaLabel };

  this._addEventLog('info', '人大常委会', agendaLabel + '：已处理');
  this.showToast('✅ ' + agendaLabel, 'success');

  this._closeModal();
  setTimeout((function(ui) { return function() { ui._openStandingCommitteeMeeting(); }; })(this), 200);
  this.refreshAll();
};
UIManager.prototype._scVote = function(agendaId, agendaName) {
  var data = this._npcData;
  var sc = data.standingCommittee;
  if (!sc) return;

  // 常委投票：受派系和个人倾向影响，但更可控（人数少，关系近）
  var support = 0, oppose = 0, absent = 0;
  for (var i = 0; i < sc.members.length; i++) {
    var m = sc.members[i];
    var score = (m.personalBias || 0) + (m.influence || 1) * 2 + Math.floor(Math.random() * 11) - 5;
    if (score > 2) support++;
    else if (score < -2) oppose++;
    else absent++;
  }

  var passed = support >= Math.ceil(sc.members.length / 2) + 1;

  // 记录到会议历史
  sc.meetings.push({
    month: timeSystem ? timeSystem.month : 0,
    agenda: agendaName,
    support: support,
    oppose: oppose,
    absent: absent,
    passed: passed,
  });

  var emoji = passed ? '✅' : '❌';
  var msg = '';
  if (agendaName.includes('财政') || agendaName.includes('预算')) {
    msg = passed ? '财政报告获常委会通过，上级满意度+1' : '常委会对财政工作提出质疑，需补充说明';
  } else if (agendaName.includes('报告') || agendaName.includes('评估')) {
    msg = passed ? '工作报告获常委会肯定，部门士气+2' : '工作报告被要求修改，部门士气-3';
  } else if (agendaName.includes('项目') || agendaName.includes('民生')) {
    msg = passed ? '项目方案获常委会批准，可继续推进' : '项目方案被暂缓，需重新论证';
  } else {
    msg = passed ? '经表决通过' : '未获通过';
  }

  var overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.innerHTML = '' +
    '<div class="modal-card" style="max-width:420px;">' +
    '<div class="mc-header"><span class="mc-icon">' + emoji + '</span><span class="mc-title">表决结果</span><button class="mc-close" onclick="uiManager._closeModal();setTimeout(function(){uiManager._openStandingCommitteeMeeting();},200)">✕</button></div>' +
    '<div class="mc-body">' +
      '<div style="text-align:center;padding:12px;font-size:14px;font-weight:700;color:' + (passed ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + emoji + ' ' + (passed ? '通过' : '未通过') + '</div>' +
      '<div style="display:flex;gap:8px;margin:8px 0;">' +
        '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:#3fb950;">' + support + '</div><div style="font-size:10px;color:var(--text-muted);">赞成</div></div>' +
        '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:#f85149;">' + oppose + '</div><div style="font-size:10px;color:var(--text-muted);">反对</div></div>' +
        '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:#484f58;">' + absent + '</div><div style="font-size:10px;color:var(--text-muted);">弃权</div></div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);padding:6px;background:var(--bg-secondary);border-radius:4px;">' + msg + '</div>' +
      '<button class="fd-action-btn" onclick="uiManager._closeModal();setTimeout(function(){uiManager._openStandingCommitteeMeeting();},200)" style="width:100%;margin-top:8px;">返回议程</button>' +
    '</div></div>';

  this._addEventLog('important', '人大常委会', agendaName + '：' + (passed ? '通过' : '未通过') + '（' + support + '/' + oppose + '/' + absent + '）');
  this.refreshAll();
};
