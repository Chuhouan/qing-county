/**
 * AISecretary - v2 真实AI驱动 + 规则降级
 */

// 决策选项原型库：泛用效果模板，所有类型事件复用
var DECISION_ARCHETYPES = {
  appease: {
    label: '安抚疏导',
    key: 'appease',
    cost: { treasury: -80, energy: -10 },
    effects: { tension: -10, superior: 2, politicalCapital: 2 },
    risk: '财政吃紧',
  },
  negotiate: {
    label: '协调化解',
    key: 'negotiate',
    cost: { treasury: -40, energy: -8, politicalCapital: -2 },
    effects: { tension: -6, satisfaction: 3, superior: 1 },
    risk: '效果有限',
  },
  enforce: {
    label: '强力处置',
    key: 'enforce',
    cost: { treasury: -20, energy: -15, politicalCapital: -5 },
    effects: { tension: -12, integrity: -5, superior: -3 },
    risk: '廉洁风险',
  },
  delay: {
    label: '冷处理',
    key: 'delay',
    cost: { energy: -3, politicalCapital: -3 },
    effects: { tension: 4, superior: -5 },
    risk: '可能升级',
  },
  superior: {
    label: '上报请示',
    key: 'superior',
    cost: { energy: -5, politicalCapital: -5 },
    effects: { tension: -3, superior: 5, satisfaction: 1 },
    risk: '显得无能',
  },
};

// 每种事件类型选取3个原型作为上中下策
var DECISION_OPTION_SETS = {
  social: ['appease', 'negotiate', 'delay'],
  personnel: ['negotiate', 'appease', 'enforce'],
  committee: ['negotiate', 'delay', 'superior'],
  emergency: ['enforce', 'appease', 'superior'],
  finance: ['appease', 'superior', 'enforce'],
};

class AISecretary {
  constructor() {
    this._collapsed = true;
    this._firstGreeting = false;
    this._aiReady = false;
    this._conversation = [];
    this._narrativeCooldown = {}; // 叙事防刷屏
    this._pendingDecision = null; // 待处理决策上下文
  }

  init() {
    this._collapsed = true;
    var pnl = document.getElementById('ais-float-panel');
    var btn = document.getElementById('ais-float-btn');
    if (pnl) pnl.style.display = 'none';
    if (btn) btn.style.display = 'flex';
    this._bindEvents();
    this._listenEvents();
    this._checkBackend();
    this._updateSuggestions();
    var self = this;
    setTimeout(function() { self._greet(); }, 800);
  }

  _bindEvents() {
    var input = document.getElementById('ais-input');
    var send = document.getElementById('ais-send');
    if (!input || !send) return;
    var self = this;
    function doSend() {
      var text = input.value.trim();
      if (!text) return;
      self._userSay(text);
      input.value = '';
    }
    send.addEventListener('click', doSend);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSend(); });
  }

  async _checkBackend() {
    try {
      var res = await fetch('/api/status');
      if (res.ok) {
        var data = await res.json();
        this._aiReady = data.aiConfigured;
        if (this._aiReady) console.log('[AI秘书] 已连接AI后端:', data.model);
      } else { this._aiReady = false; }
    } catch(e) { this._aiReady = false; }
  }

  async _callAI(userMsg) {
    var ctx = this._buildContext();
    var msgs = [
      { role: 'system', content: ctx },
    ];
    // 添加对话历史（取最近的6条）
    var historyStart = Math.max(0, this._conversation.length - 6);
    for (var i = historyStart; i < this._conversation.length; i++) {
      msgs.push(this._conversation[i]);
    }
    msgs.push({ role: 'user', content: userMsg });
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
    if (!res.ok) {
      var err = await res.json().catch(function(){return {};});
      throw new Error(err.error || 'API error');
    }
    var data = await res.json();
    return data.reply || '';
  }

  _buildContext() {
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    var p = stateManager.get('player');
    if (!c) return '游戏尚未开始。';
    var lines = [];
    var add = function(label, val) { lines.push('- ' + label + '：' + val); };

    lines.push(this._getSecretaryIdentity());

    // 时间
    if (timeSystem) add('时间', (timeSystem.year||'') + '年' + (timeSystem.month||'') + '月 第' + (timeSystem.week||'') + '周');


    // ===== 经济 =====
    if (c.economy) {
      var e = c.economy;
      add('GDP', (e.gdp||0).toFixed(0) + '万元');
      add('GDP增速', ((e.gdpGrowth||0)*100).toFixed(1) + '%');
      add('经济活力', e.economicVitality||50);
      add('工业占比', ((e.industrialRatio||0)*100).toFixed(0) + '%');
      add('农业占比', ((e.agricultureRatio||0)*100).toFixed(0) + '%');
      add('三产占比', ((e.serviceRatio||0)*100).toFixed(0) + '%');
    }

    // ===== 财政 =====
    if (f) {
      add('国库余额', f.treasuryBalance.toFixed(0) + '万元');
      add('月收入', f.monthlyIncome.toFixed(0) + '万元');
      add('月支出', f.monthlyExpense.toFixed(0) + '万元');
      add('财政健康度', f.fiscalHealth + '%');
      add('债务率', f.debtRate + '%');
      add('自给率', (f.selfSufficiency||0) + '%');
      add('累计赤字', (f.cumulativeDeficit||0).toFixed(0) + '万元');
      if (f.incomeBreakdown) {
        var inc = f.incomeBreakdown;
        add('税收收入', inc.tax?.total ? inc.tax.total + '万元(增值税'+(inc.tax.sub?.vat?.value||0)+'、企业所得税'+(inc.tax.sub?.corpTax?.value||0)+'、个税'+(inc.tax.sub?.personalTax?.value||0)+')' : '无');
        add('转移支付', inc.transfer?.total ? inc.transfer.total + '万元' : '无');
        add('非税收入', inc.nonTax?.total ? inc.nonTax.total + '万元' : '无');
      }
      if (f.expenseBreakdown) {
        var exp = f.expenseBreakdown;
        add('人员经费', (exp.personnel?.total||0) + '万元');
        add('公用经费', (exp.operating?.total||0) + '万元');
        add('项目支出', (exp.project?.total||0) + '万元');
        add('债务利息', (exp.debtInterest?.total||0) + '万元');
      }
    }

    // ===== 社会 =====
    add('社会张力', c.socialTension||0);
    add('稳定度', Math.max(0, 100-(c.socialTension||0)));

    // ===== 政治 =====
    add('政治资本', p?.politicalCapital||20);
    if (c.superiorTrust) {
      add('市委书记信任', c.superiorTrust.citySecretary||50);
      add('省厅评价', c.superiorTrust.provincialEval||50);
      add('中央印象', c.superiorTrust.centralImpression||50);
    }

    // ===== 玩家特质与策略 =====
    if (p) {
      if (p.traits && p.traits.length > 0) add('书记特质', p.traits.join('、'));
      if (p.strategy) add('治理路线', p.strategy);
    }

    // ===== 人口 =====
    var pop = stateManager.get('population');
    if (pop) {
      add('总人口', (pop.total||0).toLocaleString() + '人');
      add('城镇人口', (pop.urban||0).toLocaleString() + '人');
      add('农村人口', (pop.rural||0).toLocaleString() + '人');
      add('就业人口', (pop.employed||0).toLocaleString() + '人');
      if (pop.income) add('平均收入', pop.income.average + '元/月');
    }

    // ===== 全部干部（含完整属性） =====
    var personnel = gameEngine.getSystem('personnel');
    if (personnel) {
      var all = personnel.getAll() || [];
      if (all.length > 0) {
        lines.push('');
        lines.push('【全部干部】');
        for (var i = 0; i < all.length; i++) {
          var o = all[i];
          var info = o.name + '/' + (o.title||'') + '/' + (o.department||'') + ' 派系:' + (o.faction||'') + ' 投票权重:' + (o.voteWeight||1);
          if (o.abilities) info += ' 能力:经'+(o.abilities.economy||0)+'政'+(o.abilities.politics||0)+'人'+(o.abilities.personnel||0);
          if (o.demands) {
            var ds = [];
            for (var dk in o.demands) { if (o.demands[dk] > 0) ds.push(dk + '=' + o.demands[dk]); }
            if (ds.length > 0) info += ' 诉求:' + ds.join(',');
          }
          if (o.relations) info += ' 对书记关系:' + (o.relations.player||0);
          if (o.traits && o.traits.length > 0) info += ' 特质:' + o.traits.join(',');
          lines.push('  - ' + info);
        }
      }
    }

    // ===== 全部乡镇 =====
    var towns = c.towns || [];
    if (towns.length > 0) {
      lines.push('');
      lines.push('【乡镇列表】');
      for (var i = 0; i < towns.length; i++) {
        var t = towns[i];
        var tinfo = (t.name||t.id||'') + ' 人口:' + (t.population||'?') + ' 面积:' + (t.area||'?');
        if (t.enterprises && t.enterprises.length > 0) {
          var ens = [];
          for (var j = 0; j < t.enterprises.length; j++) {
            var en = t.enterprises[j];
            ens.push(en.name + '(' + (en.type||'') + (en.sectorName ? '-' + en.sectorName : '') + ')');
          }
          tinfo += ' 企业:' + ens.join(',');
        }
        if (t.sectors && t.sectors.length > 0) {
          var secs = [];
          for (var j = 0; j < t.sectors.length; j++) {
            secs.push(t.sectors[j].name||t.sectors[j].type||'');
          }
          tinfo += ' 产业:' + secs.join(',');
        }
        lines.push('  - ' + tinfo);
      }
    }

    // ===== 活跃事件 =====
    var evtSys = gameEngine.getSystem('event');
    if (evtSys) {
      var active = evtSys.getActiveEvents ? evtSys.getActiveEvents() : [];
      if (active.length > 0) {
        lines.push('');
        lines.push('【当前待处理事件】');
        for (var i = 0; i < active.length; i++) {
          lines.push('  - [' + (active[i].type||'') + '] ' + (active[i].name||'') + ': ' + ((active[i].description||'').substring(0,60)));
        }
      }
    }

    // ===== 进行中的任务 =====
    var taskSys = gameEngine.getSystem('task');
    if (taskSys && taskSys.tasks && taskSys.tasks.length > 0) {
      lines.push('');
      lines.push('【进行中任务】');
      for (var i = 0; i < taskSys.tasks.length; i++) {
        var tk = taskSys.tasks[i];
        lines.push('  - ' + (tk.title||'') + ' (' + (tk.desc||'').substring(0,50) + ') 进度:' + (tk.progress||0) + '%');
      }
    }

    return lines.join('\n');
  }

  toggle() {
    this._collapsed = !this._collapsed;
    var pnl = document.getElementById('ais-float-panel');
    var btn = document.getElementById('ais-float-btn');
    if (pnl) pnl.style.display = this._collapsed ? 'none' : 'flex';
    if (btn) btn.style.display = this._collapsed ? 'flex' : 'none';
    if (!this._collapsed) {
      var m = document.getElementById('ais-messages');
      if (m) m.scrollTop = m.scrollHeight;
    }
  }

  _say(html, type) {
    var c = document.getElementById('ais-messages');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'ais-msg ais-' + (type||'ai');
    d.innerHTML = html;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  async _userSay(text) {
    this._say('<span class="ais-name">你</span><span class="ais-bubble">' + this._escape(text) + '</span>', 'user');
    this._conversation.push({ role: 'user', content: text });
    if (this._conversation.length > 20) { this._conversation.splice(0, 2); }
    var ldr = document.createElement('div');
    ldr.className = 'ais-msg ais-ai';
    ldr.innerHTML = '<span class="ais-name">秘书</span><span class="ais-bubble ais-thinking">思考中...</span>';
    ldr.id = 'ais-loader';
    var mc = document.getElementById('ais-messages');
    if (mc) mc.appendChild(ldr);
    var reply;
    if (this._aiReady) {
      try { reply = await this._callAI(text); }
      catch(e) { console.warn('[AI] 降级:', e.message); reply = this._fallback(text); }
    } else {
      await new Promise(function(r) { setTimeout(r, 200+Math.random()*300); });
      reply = this._fallback(text);
    }
    var l = document.getElementById('ais-loader');
    if (l) l.remove();
    this._say(reply);
    var clean = reply.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    this._conversation.push({ role: 'assistant', content: clean });
  }

  _escape(s) {
    var m = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#039;" };
    return s.replace(/[&<>"\']/g, function(c) { return m[c]; });
  }

  _setSuggestions(items) {
    var el = document.getElementById('ais-suggestions');
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = ''; return; }
    var self = this;
    el.innerHTML = items.map(function(s) {
      var esc = self._escape(s);
      return '<button class="ais-sug-btn" onclick="var inp=document.getElementById(\'ais-input\');inp.value=\'' + esc + '\';document.getElementById(\'ais-send\').click()">' + esc + '</button>';
    }).join('');
  }

  updateAdvice() {
    this._updateSuggestions();
    if (!this._firstGreeting || this._aiReady) return;
    var w = this._checkWarnings();
    if (w) this._say(w);
  }

  _checkWarnings() {
    var c = stateManager.get('county'), f = stateManager.get('finance'), p = stateManager.get('player');
    if (!c||!f) return null;
    var w = [];
    if (f.treasuryBalance < 1000) w.push('\u26a0\ufe0f 国库余额不足1000万');
    if (c.socialTension > 70) w.push('\ud83d\udd34 社会张力超过70');
    if (f.fiscalHealth < 20) w.push('\u26a0\ufe0f 财政健康度低于20%');
    if ((p?.politicalCapital||20) < 5) w.push('\u26a0\ufe0f 政治资本不足5点');
    if (w.length === 0) return null;
    return '<div class="ais-warning">' + w.slice(0,2).join('<br>') + '</div>';
  }

  _updateSuggestions() {
    var c = stateManager.get('county');
    if (!c) { this._setSuggestions(['当前状态如何？']); return; }
    var s = [];
    if (this._aiReady) {
      s.push('当前局势分析');
      s.push('给我治理建议');
      s.push('财政状况如何');
      s.push('下一步做什么');
    } else {
      var f = stateManager.get('finance'), p = stateManager.get('player');
      var tension = c.socialTension||0, treasury = f?.treasuryBalance||0, pc = p?.politicalCapital||20;
      if (tension > 60) s.push('社会张力偏高怎么办');
      if (treasury < 2000) s.push('财政紧张怎么缓解');
      if (pc < 5) s.push('怎么获取政治资本');
      if (s.length < 3) s.push('给我一些治理建议');
      if (s.length < 3) s.push('常委会有什么用');
      if (s.length < 4) s.push('当前财政状况如何');
    }
    this._setSuggestions(s.slice(0, 4));
  }

  _greet() {
    this._firstGreeting = true;
    // 不主动调用AI，等用户问再答
    this._say(this._getGreeting());
    this._updateSuggestions();
  }

  _getGreeting() {
    var c = stateManager.get('county'), f = stateManager.get('finance');
    if (!c) return '书记，我是陈守义。以后县里的事您随时吩咐。';
    var tension = c.socialTension||0, treasury = f?.treasuryBalance||0;
    var name = (stateManager.get('player')?.name || '书记');
    var desc = '刚扫了一眼数据：';
    if (tension > 60) desc += '社会面不太平，张力' + tension + '了';
    else if (tension > 40) desc += '社会面还算稳，张力' + tension;
    else desc += '社会面平稳，张力' + tension;
    if (treasury < 1000) desc += '，国库见底了（' + treasury.toFixed(0) + '万），得紧着点花。';
    else if (treasury < 5000) desc += '，财政不宽裕（' + treasury.toFixed(0) + '万）。';
    else desc += '，家底还行（' + treasury.toFixed(0) + '万）。';
    var note = this._aiReady
      ? ''
      : '（规则模式。跑 server.js 能开AI，效果更好。）';
    return name + '，我是陈守义。<br>' + desc + '<br>' + note + '<br>有事您说话。';
  }

  /** 规则降级回复——完整规则引擎，不依赖AI后端 */
  _fallback(input) {
    input = input.toLowerCase();
    // ====== 具体数据查询（读游戏真实数据） ======
    if (/(\u5c40\u957f|\u5e72\u90e8|\u5404\u5c40|\u90e8\u95e8\u8d1f\u8d23\u4eba)/.test(input) && !/(\u7ba1\u7406|\u600e\u4e48|\u5982\u4f55)/.test(input)) return this._genOfficialsList();
    if (/(\u9547|\u4e61\u9547|\u54ea\u4e9b\u9547|\u5404\u4e2a\u9547)/.test(input) && !/(\u5f20\u529b|\u7a33\u5b9a)/.test(input)) return this._genTownsList();
    // ====== 问候 ======
    if (/^\u4f60\u597d|^\u60a8\u597d|^hi|^hello/.test(input)) return '\u60a8\u597d\uff0c\u4e66\u8bb0\u3002\u968f\u65f6\u4e3a\u60a8\u6548\u52b3\u3002';
    if (/(\u6e38\u620f)?(\u72b6\u6001|\u603b\u89c8|\u6982\u51b5|\u600e\u4e48\u6837|\u5982\u4f55|\u60c5\u51b5)/.test(input) && !/(\u8d22\u653f|\u7ecf\u6d4e|\u793e\u4f1a|\u7a33\u5b9a|\u5f20\u529b|\u8d44\u672c|\u4efb\u52a1)/.test(input)) return this._genStateOverview();
    if (/(\u8d22\u653f|\u56fd\u5e93|\u94b1|\u8d64\u5b57|\u503a\u52a1|\u6536\u5165|\u652f\u51fa|\u9884\u7b97)/.test(input)) return this._genFinanceAdvice();
    if (/(\u7ecf\u6d4e|gdp|\u4ea7\u4e1a|\u5de5\u4e1a|\u519c\u4e1a|\u589e\u957f|\u6d3b\u529b)/.test(input)) return this._genEconomyAdvice();
    if (/(\u7a33\u5b9a|\u793e\u4f1a\u5f20\u529b|\u5f20\u529b|\u6c11\u6028|\u7fa4\u4f17|\u4e0a\u8bbf|\u6297\u8bae)/.test(input)) return this._genSocialAdvice();
    if (/(\u653f\u6cbb\u8d44\u672c).*(\u600e\u4e48|\u5982\u4f55|\u83b7\u53d6|\u589e\u52a0|\u4e0d\u591f|\u4e0d\u8db3)/.test(input) || /\u600e\u4e48(\u83b7)?\u53d6\u653f\u6cbb\u8d44\u672c/.test(input)) return this._genPCAdvice();
    if (/(\u5e38\u59d4\u4f1a|\u6295\u7968|\u8868\u51b3|\u8bae\u9898|\u5426\u51b3)/.test(input)) return this._genCommitteeAdvice();
    if (/(\u5efa\u8bae|\u63a8\u8350|\u4e0b\u4e00\u6b65|\u505a\u4ec0\u4e48|\u4efb\u52a1|\u76ee\u6807|\u65b9\u5411)/.test(input) || /\u6211\u8be5(\u600e\u4e48|\u5982\u4f55|\u505a\u4ec0\u4e48)/.test(input)) return this._genSuggestions();
    if (/(\u4eba\u4e8b|\u5e72\u90e8|\u59d4\u5458|\u5c40\u957f|\u53bf\u957f|\u4e66\u8bb0|\u4efb\u547d|\u8c03\u52a8)/.test(input)) return this._genPersonnelAdvice();
    if (/(\u4ec0\u4e48\u662f|\u4ec0\u4e48\u53eb|\u89e3\u91ca|\u5b9a\u4e49|\u8bf4\u660e)/.test(input)) return this._genTermExplanation(input);
    if (/(\u4e0a\u7ea7|\u4fe1\u4efb|\u8bc4\u4ef7|\u4ed5\u9014|\u5347\u8fc1|\u63d0\u62d4)/.test(input)) return this._genSuperiorAdvice();
    if (/(\u5206\u6790|\u8bca\u65ad|\u8bc4\u4f30|\u4f53\u68c0|\u5168\u9762)/.test(input)) return this._genFullDiagnosis();
    return this._genDefaultReply(input);
  }

  _genStateOverview() {
    var c = stateManager.get('county'), f = stateManager.get('finance'), p = stateManager.get('player');
    if (!c) return '\u6e38\u620f\u5c1a\u672a\u5f00\u59cb\u3002';
    var w = timeSystem?.week||0, m = timeSystem?.month||1, y = timeSystem?.year||2026;
    var gdp = c.economy?.gdp||0, gw = ((c.economy?.gdpGrowth||0)*100).toFixed(1);
    var st = Math.max(0, 100-(c.socialTension||0));
    var tr = f?.treasuryBalance||0, fh = f?.fiscalHealth||0, pc = p?.politicalCapital||20, t = c.superiorTrust?.citySecretary||50;
    return '\U0001f4cb \u5f53\u524d\u6cbb\u7406\u6982\u51b5<br>\U0001f5d3 ' + y + '\u5e74' + m + '\u6708 \u7b2c' + w + '\u5468<br>\U0001f4c8 GDP ' + (gdp/10000).toFixed(1) + '\u4ebf \u00b7 \u589e\u901f ' + gw + '%<br>\U0001f3d8 \u7a33\u5b9a\u5ea6 ' + st + ' \u00b7 \u5f20\u529b ' + (c.socialTension||0) + '<br>\U0001f4b0 \u56fd\u5e93 ' + tr.toFixed(0) + '\u4e07 \u00b7 \u5065\u5eb7\u5ea6 ' + fh + '%<br>\U0001f3db \u653f\u6cbb\u8d44\u672c ' + pc + ' \u00b7 \u4e0a\u7ea7\u4fe1\u4efb ' + t;
  }

  _genFinanceAdvice() {
    var f = stateManager.get('finance');
    if (!f) return '\u8d22\u653f\u6570\u636e\u5c1a\u672a\u5c31\u7eea\u3002';
    var bal = f.monthlyIncome - f.monthlyExpense;
    var tip = '';
    if (f.treasuryBalance < 1000) tip = '\u56fd\u5e93\u4e25\u91cd\u4e0d\u8db3\uff0c\u5efa\u8bae\uff1a\u2460\u7f29\u51cf\u975e\u5fc5\u8981\u652f\u51fa \u2461\u4e89\u53d6\u4e0a\u7ea7\u8f6c\u79fb\u652f\u4ed8 \u2462\u63d0\u9ad8\u5f81\u6536\u7387\u3002';
    else if (f.treasuryBalance < 5000) tip = '\u8d22\u653f\u504f\u7d27\uff0c\u5efa\u8bae\u63a7\u5236\u9879\u76ee\u652f\u51fa\u8282\u594f\uff0c\u4f18\u5148\u4fdd\u969c\u4eba\u5458\u5de5\u8d44\u3002';
    else if (bal < 0) tip = '\u5f53\u524d\u5904\u4e8e\u8d64\u5b57\u72b6\u6001\uff0c\u5efa\u8bae\u589e\u6536\u8282\u652f\u5e76\u4e3e\u3002';
    else tip = '\u8d22\u653f\u72b6\u51b5\u57fa\u672c\u5065\u5eb7\uff0c\u6ce8\u610f\u4fdd\u6301\u6536\u652f\u5e73\u8861\u3002';
    return '\U0001f4b0 \u8d22\u653f\u5206\u6790<br>\u56fd\u5e93 ' + f.treasuryBalance.toFixed(0) + '\u4e07 \u00b7 \u6708\u6536\u5165 ' + f.monthlyIncome.toFixed(0) + '\u4e07 \u00b7 \u6708\u652f\u51fa ' + f.monthlyExpense.toFixed(0) + '\u4e07<br>\u6708\u7ed3\u4f59 ' + (bal>=0?'+':'') + bal.toFixed(0) + '\u4e07 \u00b7 \u5065\u5eb7\u5ea6 ' + f.fiscalHealth + '% \u00b7 \u503a\u52a1\u7387 ' + f.debtRate + '%<br>\U0001f4a1 ' + tip;
  }

  _genEconomyAdvice() {
    var c = stateManager.get('county');
    if (!c) return '\u7ecf\u6d4e\u6570\u636e\u5c1a\u672a\u5c31\u7eea\u3002';
    var eco = c.economy||{}, gw = ((eco.gdpGrowth||0)*100).toFixed(1), vit = eco.economicVitality??50;
    var tip = vit<30 ? '\u7ecf\u6d4e\u6d3b\u529b\u4f4e\u8ff7\uff0c\u5efa\u8bae\u9009\u62e9\u5de5\u4e1a\u5f3a\u53bf/\u6539\u9769\u5148\u950b\u8def\u7ebf' : vit<60 ? '\u7ecf\u6d4e\u6d3b\u529b\u4e00\u822c\uff0c\u53ef\u901a\u8fc7\u4ea7\u4e1a\u653f\u7b56\u63d0\u632f' : '\u7ecf\u6d4e\u6d3b\u529b\u5145\u8db3\uff0c\u7ee7\u7eed\u4fdd\u6301';
    return '\U0001f4c8 \u7ecf\u6d4e\u5206\u6790<br>GDP ' + (eco.gdp||0).toFixed(0) + '\u4e07\u5143 \u00b7 \u589e\u901f ' + gw + '% \u00b7 \u6d3b\u529b ' + vit + '<br>\u5de5\u4e1a ' + ((eco.industrialRatio||0)*100).toFixed(0) + '% \u00b7 \u519c\u4e1a ' + ((eco.agricultureRatio||0)*100).toFixed(0) + '% \u00b7 \u4e09\u4ea7 ' + ((eco.serviceRatio||0)*100).toFixed(0) + '%<br>\U0001f4a1 ' + tip;
  }

  _genSocialAdvice() {
    var c = stateManager.get('county');
    if (!c) return '\u793e\u4f1a\u6570\u636e\u5c1a\u672a\u5c31\u7eea\u3002';
    var tension = c.socialTension||0;
    var tip = tension>70 ? '\u5f20\u529b\u6781\u9ad8\uff01\u8bf7\u7acb\u5373\u6279\u9605\u4fe1\u8bbf\u3001\u63a8\u8fdb\u6c11\u751f\u9879\u76ee' : tension>50 ? '\u5f20\u529b\u504f\u9ad8\uff0c\u5efa\u8bae\u4e0b\u4e61\u8c03\u7814\u3001\u5904\u7406\u79ef\u538b\u4fe1\u8bbf' : '\u793e\u4f1a\u9762\u57fa\u672c\u7a33\u5b9a';
    return '\U0001f3d8 \u793e\u4f1a\u5206\u6790<br>\u7a33\u5b9a\u5ea6 ' + Math.max(0,100-tension) + ' \u00b7 \u5f20\u529b ' + tension + '<br>\U0001f4a1 ' + tip;
  }

  _genPCAdvice() {
    return '\U0001f3db \u653f\u6cbb\u8d44\u672c\u83b7\u53d6\u9014\u5f84\uff1a<br>\u2460 \u5b8c\u6210\u4e0a\u7ea7\u4ea4\u529e +5~10<br>\u2461 \u5e38\u59d4\u4f1a\u51b3\u8bae\u901a\u8fc7 +2<br>\u2462 \u63a8\u8fdb\u6539\u9769\u83b7\u4e0a\u7ea7\u8ba4\u53ef<br>\u2463 \u5904\u7406\u7a81\u53d1\u5371\u673a\u5f97\u5f53<br>\u26a0\ufe0f \u907f\u514d\uff1a\u5426\u51b3\u51b3\u8bae(-10)\u3001\u51b3\u7b56\u5931\u8bef\u3001\u8150\u8d25\u66dd\u5149';
  }

  _genCommitteeAdvice() {
    var pc = stateManager.get('player')?.politicalCapital||20;
    return '\U0001f3db \u5e38\u59d4\u4f1a\u662f\u6838\u5fc3\u51b3\u7b56\u673a\u5236\uff1a<br>\u2460 \u6d88\u80175\u70b9\u653f\u6cbb\u8d44\u672c\u53d1\u8d77\u8bae\u9898<br>\u2461 9\u4f4d\u5e38\u59d4\u6839\u636e\u8bc9\u6c42/\u6d3e\u7cfb/\u5173\u7cfb/\u7279\u8d28\u7efc\u5408\u6295\u7968<br>\u2462 \u8d5e\u6210\u7387>50%\u901a\u8fc7<br>\u2463 \u4e66\u8bb0\u53ef\u884c\u4f7f\u4e00\u7968\u5426\u51b3\u6743(-10\u653f\u6cbb\u8d44\u672c)<br>\u5f53\u524d\u653f\u6cbb\u8d44\u672c\uff1a' + pc + '\u70b9' + (pc>=5?'\uff0c\u53ef\u53ec\u5f00\uff1a':' \u4e0d\u8db35\u70b9\u65e0\u6cd5\u53ec\u5f00');
  }

  _genSuggestions() {
    var c = stateManager.get('county'), f = stateManager.get('finance');
    if (!c) return '\u8bf7\u5148\u5f00\u59cb\u6e38\u620f\u3002';
    var s = [], t = c.socialTension||0, tr = f?.treasuryBalance||0, v = c.economy?.economicVitality??50, pc = stateManager.get('player')?.politicalCapital||20;
    if (t > 50) s.push('\U0001f534 \u5efa\u8bae\u4f18\u5148\u5904\u7406\u793e\u4f1a\u7a33\u5b9a\u95ee\u9898\uff0c\u6279\u9605\u4fe1\u8bbf\u6216\u4e0b\u4e61\u8c03\u7814\u3002');
    if (tr < 2000) s.push('\U0001f4b0 \u8d22\u653f\u7d27\u5f20\uff0c\u5efa\u8bae\u5728\u529e\u516c\u684c\u89c6\u56fe\u5904\u7406\u8d22\u653f\u51b3\u7b56\u3002');
    if (v < 40) s.push('\U0001f4c8 \u7ecf\u6d4e\u6d3b\u529b\u504f\u4f4e\uff0c\u63a8\u8fdb\u4e00\u5468\u65f6\u6ce8\u610f\u9009\u62e9\u53d1\u5c55\u7ecf\u6d4e\u7684\u9009\u9879\u3002');
    if (pc >= 5) s.push('\U0001f3db \u653f\u6cbb\u8d44\u672c\u5145\u8db3\uff0c\u53ef\u53ec\u5f00\u5e38\u59d4\u4f1a\u63a8\u52a8\u91cd\u8981\u8bae\u9898\u3002');
    s.push('\U0001f4d6 \u4e0d\u786e\u5b9a\u673a\u5236\uff1f\u53ef\u4ee5\u95ee\u6211\u201c\u4ec0\u4e48\u662fXX\u201d\u3002');
    return '\U0001f4a1 \u6cbb\u7406\u5efa\u8bae<br>' + s.slice(0,3).join('<br>');
  }

  _genPersonnelAdvice() {
    return '\U0001f465 \u5e72\u90e8\u7ba1\u7406\u8981\u70b9\uff1a<br>\u2460 \u6bcf\u4f4d\u5e72\u90e8\u6709\u72ec\u7acb\u8bc9\u6c42\uff0c\u5f71\u54cd\u6295\u7968<br>\u2461 \u62c9\u62e2(+30%)/\u6253\u538b(+40%)/\u5bb4\u8bf7/\u8b66\u544a(30%\u5f03\u6743)/\u63a8\u8350\u63d0\u62d4\u53ef\u5f71\u54cd\u6295\u7968<br>\u2462 \u6027\u683c\u7279\u8d28\u5f71\u54cd\u51b3\u7b56\u503e\u5411<br>\u2463 \u4e0e\u4e66\u8bb0\u5173\u7cfb\u5f71\u54cd\u652f\u6301\u5ea6';
  }

  _genTermExplanation(input) {
    for (var key in TERM_DEFS) {
      var def = TERM_DEFS[key];
      if (input.indexOf(def.name) !== -1 || input.indexOf(key) !== -1) {
        var r = '\U0001f4cc <b>' + (def.icon||'') + ' ' + def.name + '</b><br>' + def.def;
        if (def.affects) r += '<br>\U0001f4e4 \u5f71\u54cd\uff1a' + def.affects;
        if (def.formula) r += '<br>\U0001f9ee \u516c\u5f0f\uff1a' + def.formula;
        return r;
      }
    }
    return '\u8bf7\u544a\u8bc9\u6211\u60a8\u60f3\u4e86\u89e3\u7684\u5177\u4f53\u540d\u8bcd\u3002';
  }

  _genSuperiorAdvice() {
    var trust = stateManager.get('county')?.superiorTrust?.citySecretary||50;
    var tip = trust<30 ? '\u4fe1\u4efb\u5ea6\u4f4e\uff0c\u5efa\u8bae\u5b8c\u6210\u4e0a\u7ea7\u4ea4\u529e\u3001\u4fdd\u6301\u793e\u4f1a\u7a33\u5b9a' : trust<60 ? '\u4fe1\u4efb\u5ea6\u4e00\u822c\uff0c\u7a33\u624e\u7a33\u6253' : '\u4e0a\u7ea7\u8f83\u4fe1\u4efb\uff0c\u53ef\u63d0\u51fa\u521b\u65b0\u6539\u9769\u65b9\u6848';
    return '\u2b50 \u4e0a\u7ea7\u4fe1\u4efb\u5ea6\uff1a' + trust + '<br>\U0001f4a1 ' + tip;
  }

  _genFullDiagnosis() {
    var c = stateManager.get('county'), f = stateManager.get('finance');
    if (!c) return '\u6e38\u620f\u5c1a\u672a\u5f00\u59cb\u3002';
    var issues = [];
    if ((c.socialTension||0) > 50) issues.push('\U0001f534 \u793e\u4f1a\u5f20\u529b\u504f\u9ad8');
    if ((f?.treasuryBalance||0) < 2000) issues.push('\U0001f4b0 \u56fd\u5e93\u7d27\u5f20');
    if ((c.economy?.economicVitality||50) < 40) issues.push('\U0001f4c9 \u7ecf\u6d4e\u6d3b\u529b\u4e0d\u8db3');
    if ((f?.fiscalHealth||0) < 30) issues.push('\u26a0\ufe0f \u8d22\u653f\u5065\u5eb7\u5ea6\u4f4e');
    if ((c.superiorTrust?.citySecretary||50) < 40) issues.push('\u2b50 \u4e0a\u7ea7\u4fe1\u4efb\u4e0d\u8db3');
    if (issues.length === 0) return '\u2705 \u5404\u9879\u6307\u6807\u5065\u5eb7\uff0c\u7ee7\u7eed\u5f53\u524d\u7b56\u7565\u3002';
    return '\U0001f50d \u8bca\u65ad\u2014\u2014' + issues.length + '\u4e2a\u95ee\u9898<br>' + issues.join('<br>') + '<br>\U0001f4a1 \u4f18\u5148\u5904\u7406\u793e\u4f1a\u548c\u8d22\u653f\u95ee\u9898\u3002';
  }

  _genDefaultReply(input) {
    if (/\u8c22\u8c22|\u611f\u8c22/.test(input)) return '\u4e0d\u5ba2\u6c14\uff0c\u968f\u65f6\u4e3a\u60a8\u6548\u52b3\u3002';
    return '\u60a8\u53ef\u4ee5\u8bd5\u8bd5\uff1a<br>\u2460 \u5f53\u524d\u72b6\u6001\u5982\u4f55<br>\u2461 \u8d22\u653f\u72b6\u51b5\u5982\u4f55<br>\u2462 \u7ed9\u6211\u4e00\u4e9b\u5efa\u8bae<br>\u2463 \u4ec0\u4e48\u662f\u793e\u4f1a\u5f20\u529b';
  }

  // ============== 新增：事件监听 + 叙事引擎 ==============

  /** 注册事件监听，在关键系统事件时自动触发叙事 */
  _listenEvents() {
    var self = this;

    // 可交互事件 → 走决策面板（不纯叙事）
    eventBus.on(EVENTS.SOCIAL_PROTEST, function(d) {
      self._onActionableEvent('social', d);
    });
    eventBus.on(EVENTS.PERSONNEL_CHANGE, function(d) {
      self._onActionableEvent('personnel', d);
    });
    eventBus.on(EVENTS.COMMITTEE_VOTE, function(d) {
      self._onActionableEvent('committee', d);
    });
    eventBus.on(EVENTS.EVENT_TRIGGER, function(d) {
      if (d.event && (d.event.type === 'emergency' || d.event.type === 'crisis')) {
        self._onActionableEvent('emergency', d);
      }
    });
    eventBus.on(EVENTS.FINANCE_WARNING, function(d) {
      self._onActionableEvent('finance', d);
    });
    // 信息性事件 → 叙事注入
    eventBus.on(EVENTS.MONTH_CHANGE, function(d) {
      self._weeklyBrief(d);
    });
    eventBus.on(EVENTS.WEEKLY_ADVANCE, function() {
      self._weeklyHeadline();
    });
    eventBus.on(EVENTS.YEAR_CHANGE, function(d) {
      self._narrate('yearly', d);
    });
  }

  /** 可交互事件入口：生成描述→展示决策面板 */
  _onActionableEvent(type, data) {
    // 防刷屏
    if (this._narrativeCooldown[type]) return;
    this._narrativeCooldown[type] = true;
    var self = this;
    setTimeout(function() { self._narrativeCooldown[type] = false; }, 5000);

    // 存上下文供决策使用
    this._pendingDecision = { type: type, data: data, state: 'pending' };

    // 生成叙事文本（AI或降级）
    var ctx = this._buildNarrativeContext(type, data);
    if (this._aiReady) {
      this._quickCall(ctx).then(function(text) {
        if (text) {
          self._injectNarrative(type, text, data);
          self._showOptions(type);
        }
      }).catch(function() {
        self._injectNarrative(type, self._fallbackNarrative(type, data), data);
        self._showOptions(type);
      });
    } else {
      var self2 = this;
      setTimeout(function() {
        self._injectNarrative(type, self2._fallbackNarrative(type, data), data);
        self2._showOptions(type);
      }, 300 + Math.random() * 400);
    }
  }

  /** 获取某类型事件的候选选项列表（按上中下序） */
  _getOptionsForType(type) {
    var keys = DECISION_OPTION_SETS[type] || DECISION_OPTION_SETS.social;
    return keys.map(function(k) { return DECISION_ARCHETYPES[k]; });
  }

  /** 在秘书面板渲染选项按钮+自定义输入框 */
  _showOptions(type) {
    if (!this._pendingDecision || this._pendingDecision.state !== 'pending') return;
    var options = this._getOptionsForType(type);
    var c = document.getElementById('ais-messages');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'ais-options';
    d.id = 'ais-options-' + type;
    var self = this;

    // 按钮HTML
    var costLabel = function(k) { var m = { treasury: '💰', energy: '⚡', politicalCapital: '🏛' }; return m[k] || k + ' '; };
    var effectLabel = function(k) { var m = { tension: '张力', superior: '上级', politicalCapital: '政资', integrity: '廉洁', satisfaction: '满意度' }; return m[k] || k; };
    var btnsHtml = options.map(function(opt) {
      var costParts = [];
      if (opt.cost) {
        for (var k in opt.cost) {
          var v = opt.cost[k];
          if (v < 0) costParts.push(costLabel(k) + Math.abs(v));
        }
      }
      var effParts = [];
      if (opt.effects) {
        for (var ek in opt.effects) {
          var ev = opt.effects[ek];
          if (ev !== 0) effParts.push((ev > 0 ? '+' : '') + ev + ' ' + effectLabel(ek));
        }
      }
      var riskHtml = opt.risk ? '<div class="ais-opt-risk">⚠ ' + opt.risk + '</div>' : '';
      return '<button class="ais-opt-btn" data-archetype="' + opt.key + '" ' +
        'onclick="uiManager.aiSecretary._handleDecision(\'' + type + '\',\'' + opt.key + '\')">' +
        '<div class="ais-opt-label">' + opt.label + '</div>' +
        '<div class="ais-opt-cost">' + costParts.join(' ') + '</div>' +
        '<div class="ais-opt-eff">' + effParts.join(' ') + '</div>' +
        riskHtml + '</button>';
    }).join('');

    d.innerHTML =
      '<div class="ais-opt-section">' + btnsHtml + '</div>' +
      '<div class="ais-custom-section">' +
      '<div class="ais-custom-label">或自行拟定方案</div>' +
      '<div class="ais-custom-row">' +
      '<input type="text" id="ais-custom-input" placeholder="输入您的处理方案..." class="ais-custom-input"/>' +
      '<button class="ais-custom-submit" onclick="uiManager.aiSecretary._handleCustom()">提交</button>' +
      '</div></div>';

    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  /** 用户点击预设选项 */
  _handleDecision(type, archetypeKey) {
    if (!this._pendingDecision || this._pendingDecision.state !== 'pending') return;
    this._pendingDecision.state = 'resolving';

    var arch = DECISION_ARCHETYPES[archetypeKey];
    if (!arch) return;
    this._pendingDecision.chosen = 'preset:' + archetypeKey;

    // 应用效果 + 记录记忆
    var results = this._applyDecisionEffects(type, arch);
    this._recordDecision(type, arch, results);
    this._sayConfirmation(type, arch, results);

    // 移除选项按钮
    var optsEl = document.getElementById('ais-options-' + type);
    if (optsEl) optsEl.remove();
    this._pendingDecision = null;
  }

  /** 用户输入自定义方案并提交 */
  _handleCustom() {
    if (!this._pendingDecision || this._pendingDecision.state !== 'pending') return;
    var input = document.getElementById('ais-custom-input');
    if (!input || !input.value.trim()) return;
    this._pendingDecision.state = 'resolving';

    var text = input.value.trim();
    this._pendingDecision.chosen = 'custom:' + text;

    // 用户输入也追加到对话气泡
    this._say('<span class="ais-name">你</span><span class="ais-bubble">' + this._escape(text) + '</span>', 'user');

    var self = this;
    var type = this._pendingDecision.type;
    this._judgeCustomEffects(text, type).then(function(judgment) {
      // judgment = { effects: {...}, narrative: '...' } 或 null
      if (judgment && judgment.effects) {
        var results = self._applyDecisionEffects(type, null, judgment.effects);
        self._recordDecision(type, { label: '自行决策', key: 'custom' }, results);
        self._sayCustomConfirmation(judgment);
      } else {
        // AI 无法判断 → 降级用原型匹配
        self._fallbackClassifyInput(text, type).then(function(archetypeKey) {
          var arch = DECISION_ARCHETYPES[archetypeKey] || DECISION_ARCHETYPES.negotiate;
          var results = self._applyDecisionEffects(type, arch);
          self._recordDecision(type, arch, results);
          self._sayConfirmation(type, arch, results);
        });
      }

      var optsEl = document.getElementById('ais-options-' + type);
      if (optsEl) optsEl.remove();
      self._pendingDecision = null;
    });
  }

  /** AI 判断自定义方案的具体影响——输出结构化评估 */
  _judgeCustomEffects(text, type) {
    // 不用 archetype，直接让AI根据当前局势输出效果数据
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    var p = stateManager.get('player');
    if (!c || !f || !p) return Promise.resolve(null);

    var stateDesc =
      '当前时间：' + (timeSystem ? timeSystem.year + '年' + timeSystem.month + '月' : '?') + '\n' +
      '国库余额：' + f.treasuryBalance.toFixed(0) + '万元\n' +
      '社会张力：' + (c.socialTension || 0) + '\n' +
      '上级信任：' + ((c.superiorTrust && c.superiorTrust.citySecretary) || 50) + '\n' +
      '政治资本：' + (p.politicalCapital || 20) + '\n' +
      '事件类型：' + type + '\n' +
      '书记提出的处理方案：' + text;

    if (this._aiReady) {
      var prompt = '你是一位县委书记秘书。以下是当前县情和书记的处理方案。\n' +
        '请根据县情数据，判断书记的决策会带来什么影响，输出JSON格式效果评估。\n' +
        '严格遵守以下规则：\n' +
        '- treasury: 国库变化（万元），负=支出，合理范围-500~+200\n' +
        '- tension: 社会张力变化，负=下降，合理范围-30~+20\n' +
        '- superior: 上级信任变化，合理范围-15~+15\n' +
        '- politicalCapital: 政治资本变化，合理范围-15~+15\n' +
        '- integrity: 廉洁度变化，负=更腐败，合理范围-15~+10\n' +
        '- satisfaction: 群体满意度变化，合理范围-15~+15\n' +
        '- narrative: 一句话解释判断依据\n\n' +
        '仅返回JSON，不要其他文字。格式：\n' +
        '{"treasury":数字,"tension":数字,"superior":数字,"politicalCapital":数字,"integrity":数字,"satisfaction":数字,"narrative":"..."}\n\n' +
        stateDesc;

      return fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: '你是严格的JSON输出器。只输出JSON，不输出任何其他文字。' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 300,
          temperature: 0.4,
        }),
      }).then(function(res) {
        if (!res.ok) throw new Error('Judge API error');
        return res.json();
      }).then(function(data) {
        var raw = data.reply || '';
        // 从响应中提取JSON对象
        var match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
          var j = JSON.parse(match[0]);
          // 验证字段（内联clamp）
          var clamp = function(v, lo, hi) { return (typeof v === 'number' && !isNaN(v)) ? Math.max(lo, Math.min(hi, v)) : 0; };
          j.treasury = clamp(j.treasury, -500, 200);
          j.tension = clamp(j.tension, -30, 20);
          j.superior = clamp(j.superior, -15, 15);
          j.politicalCapital = clamp(j.politicalCapital, -15, 15);
          j.integrity = clamp(j.integrity, -15, 10);
          j.satisfaction = clamp(j.satisfaction, -15, 15);
          return {
            effects: {
              treasury: j.treasury,
              tension: j.tension,
              superior: j.superior,
              politicalCapital: j.politicalCapital,
              integrity: j.integrity,
              satisfaction: j.satisfaction,
            },
            narrative: j.narrative || '书记的决策已经执行。',
          };
        } catch (e) {
          return null;
        }
      }).catch(function() {
        return null;
      });
    }
    return Promise.resolve(null);
  }

  /** 规则降级：关键词匹配归类 */
  _fallbackClassifyInput(text, type) {
    return new Promise(function(resolve) {
      var lower = text.toLowerCase();
      if (/(安抚|补偿|补贴|救助|抚恤|发钱|拨款)/.test(lower)) resolve('appease');
      else if (/(协调|谈判|对话|沟通|走访|座谈)/.test(lower)) resolve('negotiate');
      else if (/(强力|处置|驱散|镇压|拘留|逮捕|查处)/.test(lower)) resolve('enforce');
      else if (/(拖延|冷处理|等等|暂缓|搁置|观望)/.test(lower)) resolve('delay');
      else if (/(上报|请示|汇报|求援|找上级|打报告)/.test(lower)) resolve('superior');
      else resolve('negotiate');
    });
  }

  /** 应用决策效果到游戏状态
   *  两种模式：
   *    1. archetype 不为 null → 按 preset 原型的 cost + effects 应用
   *    2. directEffects 不为 null → 直接应用 AI 判断的效果数据
   */
  _applyDecisionEffects(type, archetype, directEffects) {
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    var p = stateManager.get('player');
    if (!c || !f || !p) return {};

    var results = {};
    var costs = archetype ? archetype.cost || {} : {};
    var effs = archetype ? archetype.effects || {} : (directEffects || {});

    // 财政
    var treasuryDelta = costs.treasury || effs.treasury || 0;
    if (treasuryDelta) {
      f.treasuryBalance += treasuryDelta;
      results.treasury = treasuryDelta;
    }
    // 精力
    var energyDelta = costs.energy || 0;
    if (energyDelta) {
      p.modifyStatus('energy', energyDelta);
      results.energy = energyDelta;
    }
    // 张力
    var tensionDelta = effs.tension || 0;
    if (tensionDelta) {
      c.modifyTension(tensionDelta);
      results.tension = tensionDelta;
    }
    // 上级信任
    var superiorDelta = effs.superior || 0;
    if (superiorDelta && c.superiorTrust) {
      c.superiorTrust.citySecretary = Math.max(0, Math.min(100, c.superiorTrust.citySecretary + superiorDelta));
      results.superior = superiorDelta;
    }
    // 政治资本
    var pcDelta = effs.politicalCapital || 0;
    if (pcDelta) {
      p.politicalCapital = Math.max(0, p.politicalCapital + pcDelta);
      results.politicalCapital = pcDelta;
    }
    // 廉洁度
    var integDelta = effs.integrity || 0;
    if (integDelta) {
      if (p.corruption) p.corruption.level = Math.max(0, (p.corruption.level || 0) + integDelta);
      results.integrity = integDelta;
    }
    // 满意度
    var satDelta = effs.satisfaction || 0;
    if (satDelta) {
      var social = gameEngine.getSystem('social');
      if (social && social.applyPolicyToGroups) {
        social.applyPolicyToGroups('livelihood', satDelta);
      }
      results.satisfaction = satDelta;
    }

    // 刷新UI
    eventBus.emit(EVENTS.UI_REFRESH_DASHBOARD);
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info',
      title: '已决策',
      message: archetype ? archetype.label + ' — 效果已生效' : '方案已执行',
    });

    return results;
  }

  /** 将决策记录到 NarrativeMemory */
  _recordDecision(type, archetype, results) {
    var nm = gameEngine.getSystem('narrative')?.memory;
    if (!nm) return;
    nm.record({
      category: 'decision',
      type: 'secretary_' + type,
      title: archetype.label,
      description: this._pendingDecision ? this._pendingDecision.chosen || '' : '',
      tags: [type, archetype.key],
      impact: results,
      severity: 2,
    });
  }

  /** 在面板显示决策确认信息 */
  _sayConfirmation(type, archetype, results) {
    var lines = [];
    lines.push('好的书记，按' + archetype.label + '方向来办。');
    if (results.treasury) lines.push('国库 ' + (results.treasury < 0 ? '支出' : '增收') + Math.abs(results.treasury) + '万');
    if (results.tension) lines.push('社会张力 ' + (results.tension < 0 ? '↓' : '↑') + Math.abs(results.tension));
    if (results.superior) lines.push('上级信任 ' + (results.superior > 0 ? '↑' : '↓') + Math.abs(results.superior));
    if (results.politicalCapital) lines.push('政治资本 ' + (results.politicalCapital > 0 ? '↑' : '↓') + Math.abs(results.politicalCapital));
    this._say('<span class="ais-name">秘书</span><span class="ais-bubble ais-narrative">' + lines.join('<br>') + '</span>');
  }

  /** AI判断自定义方案后的确认反馈 */
  _sayCustomConfirmation(judgment) {
    var lines = [];
    lines.push('书记，按您的意思办了。');
    var e = judgment.effects;
    if (e.treasury) lines.push('国库 ' + (e.treasury < 0 ? '支出' : '增收') + Math.abs(e.treasury) + '万');
    if (e.tension) lines.push('社会张力 ' + (e.tension < 0 ? '↓' : '↑') + Math.abs(e.tension));
    if (e.superior) lines.push('上级信任 ' + (e.superior > 0 ? '↑' : '↓') + Math.abs(e.superior));
    if (e.politicalCapital) lines.push('政治资本 ' + (e.politicalCapital > 0 ? '↑' : '↓') + Math.abs(e.politicalCapital));
    if (judgment.narrative) lines.push('<span style="color:var(--text-muted);font-size:11px;">—— ' + judgment.narrative + '</span>');
    this._say('<span class="ais-name">秘书</span><span class="ais-bubble ais-narrative">' + lines.join('<br>') + '</span>');
  }

  /** 生成叙事文本并注入到UI（纯信息性事件用） */
  _narrate(type, data) {
    // 防刷屏：同一周期内同一类型不重复
    if (this._narrativeCooldown[type]) return;
    this._narrativeCooldown[type] = true;
    var self = this;
    setTimeout(function() { self._narrativeCooldown[type] = false; }, 3000);

    var ctx = this._buildNarrativeContext(type, data);

    if (this._aiReady) {
      this._quickCall(ctx).then(function(text) {
        if (text) self._injectNarrative(type, text, data);
      }).catch(function() {
        self._injectNarrative(type, self._fallbackNarrative(type, data), data);
      });
    } else {
      var self2 = this;
      setTimeout(function() {
        self2._injectNarrative(type, self2._fallbackNarrative(type, data), data);
      }, 300 + Math.random() * 400);
    }
  }

  /** 快速AI调用——无历史、短context、低温度 */
  _quickCall(prompt) {
    var msgs = [
      { role: 'system', content: this._getSecretaryIdentity() },
      { role: 'user', content: prompt },
    ];
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, max_tokens: 150, temperature: 0.3 }),
    }).then(function(res) {
      if (!res.ok) throw new Error('Narrative API error');
      return res.json();
    }).then(function(data) {
      return data.reply || '';
    });
  }

  /** 构建叙事专用的精简context（只包含相关数据片段） */
  _buildNarrativeContext(type, data) {
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    var ts = timeSystem ? (timeSystem.year + '年' + timeSystem.month + '月第' + timeSystem.week + '周') : '';

    switch (type) {
      case 'social':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n社会发生了群体事件。请用1-2句话向书记简要汇报情况。语气自然，别用"亲爱的"。\n事件数据：' + JSON.stringify(data).substring(0, 300);
      case 'personnel':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n人事发生了变动。请用1-2句话向书记简要汇报。\n变动数据：' + JSON.stringify(data).substring(0, 300);
      case 'committee':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n常委会投票有了结果。请用1-2句话向书记反馈。\n投票数据：' + JSON.stringify(data).substring(0, 300);
      case 'emergency':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n发生了紧急事件！用1-2句话简要汇报性质。\n事件数据：' + JSON.stringify(data).substring(0, 300);
      case 'finance':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n财政方面出现预警。用1-2句话提醒书记。\n数据：国库余额' + (f ? f.treasuryBalance : 0) + '万，健康度' + (f ? f.fiscalHealth : 0) + '%';
      case 'yearly':
        return '你是一位县委书记秘书。青县当前时间' + ts + '。\n年度结束。请用1-2句话简要总结全年情况。\n数据：' + JSON.stringify(data).substring(0, 200);
      default:
        return '请用1-2句话简要说明当前情况。数据：' + JSON.stringify(data).substring(0, 200);
    }
  }

  /** 将叙事文本注入到三处UI位置 */
  _injectNarrative(type, text, data) {
    // 1. 浮动面板追加消息
    this._say('<span class="ais-name">秘书</span><span class="ais-bubble ais-narrative">' + text + '</span>');

    // 2. 跑马灯更新（通过UIManager暂存，避免被刷新覆盖）
    if (typeof uiManager !== 'undefined') {
      uiManager._narrativeTickerText = text;
      // 如果当前不在刷新周期，直接更新DOM
      var ticker = document.getElementById('ticker-text');
      if (ticker) ticker.textContent = text;
    }

    // 3. 事件日志
    if (typeof uiManager !== 'undefined' && uiManager._addEventLog) {
      uiManager._addEventLog('narrative', '秘书', text);
    }
  }

  /** 月度简报 */
  _weeklyBrief(d) {
    if (!this._aiReady) {
      // 降级走周报头球
      this._weeklyHeadline();
      return;
    }
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    if (!c || !f) return;
    var ctx = '你是一位县委书记秘书。现在是' + (d.year || '?') + '年' + (d.month || '?') + '月初。\n' +
      '请写一段80字以内的月度简报，包含以下数据要点：\n' +
      'GDP ' + (c.economy ? c.economy.gdp : 0).toFixed(0) + '万，增速' + ((c.economy ? c.economy.gdpGrowth : 0) * 100).toFixed(1) + '%\n' +
      '国库余额' + f.treasuryBalance.toFixed(0) + '万，月结余' + (f.monthlyIncome - f.monthlyExpense).toFixed(0) + '万\n' +
      '社会张力' + (c.socialTension || 0) + '，稳定度' + Math.max(0, 100 - (c.socialTension || 0)) + '\n' +
      '政治资本' + (stateManager.get('player') ? stateManager.get('player').politicalCapital || 20 : 20) + '，上级信任' + ((c.superiorTrust && c.superiorTrust.citySecretary) || 50);

    var self = this;
    this._quickCall(ctx).then(function(text) {
      if (text) self._injectNarrative('brief', text, d);
    }).catch(function() {
      var text = (d.month || '?') + '月简报：GDP ' + (c.economy ? c.economy.gdp : 0).toFixed(0) + '万 · 国库 ' + f.treasuryBalance.toFixed(0) + '万 · 张力 ' + (c.socialTension || 0);
      self._injectNarrative('brief', text, d);
    });
  }

  /** 每周推进后的头条更新（规则驱动，不调AI） */
  _weeklyHeadline() {
    var c = stateManager.get('county');
    var f = stateManager.get('finance');
    if (!c) return;

    var week = timeSystem ? timeSystem.week : '?';
    var tension = c.socialTension || 0;
    var headline = tension > 60 ? '\u26a0 ' : '';
    headline += '第' + week + '周推进完成';
    if (tension > 60) headline += ' — 张力偏高，建议关注社会稳定';
    else if (tension > 40) headline += ' — 社会面基本平稳';
    else headline += ' — 各项工作有序推进';
    if (f && f.treasuryBalance < 1000) headline += '，国库仅余' + f.treasuryBalance.toFixed(0) + '万';

    var ticker = document.getElementById('ticker-text');
    if (ticker) ticker.textContent = headline;
  }

  /** 规则降级叙事（不依赖AI） */
  _fallbackNarrative(type, data) {
    var c = stateManager.get('county');
    switch (type) {
      case 'social':
        return '\u25b3 社会动态：当前张力' + (c ? c.socialTension : '?') + '，注意群体情绪变化。';
      case 'personnel':
        return '\u25b3 人事动态：' + ((data.official && data.official.name) || data.name || '某干部') + ' ' + (data.action || '发生变动') + '。';
      case 'committee':
        return '\u25b3 常委会：' + ((data.issue && data.issue.name) || data.name || '某项议题') + ' ' + (data.passed ? '通过' : '未通过') + '。';
      case 'emergency':
        return '\u25b3 紧急：' + ((data.event && data.event.description) || data.description || '发生突发事件');
      case 'finance':
        var f = stateManager.get('finance');
        return '\u25b3 财政：国库' + (f ? f.treasuryBalance.toFixed(0) : 0) + '万，健康度' + (f ? f.fiscalHealth : 0) + '%';
      case 'yearly':
        return '\u25b3 ' + (data.year || '?') + '年度结束，请关注年终考核结果。';
      default:
        return '\u25b3 ' + JSON.stringify(data).substring(0, 60);
    }
  }

  /** 秘书身份设定——有血有肉的人，不是AI */
  _getSecretaryIdentity() {
    return `你的名字叫陈守义，是《青县》的县委书记专职秘书。

【你的身份】
你37岁，在县委办干了11年，前后跟过三任书记。你是县里土生土长的人，对青县的一草一木、各乡镇的来龙去脉都烂熟于心。上一任书记调走时本想带你走，但你拒绝了——你说"青县的事还没干完"。

【你和书记的关系】
你现在跟着的这位书记（就是玩家），你已经认定了他。从第一天起就看出来这位是想干事、能干事的人。你跟他的关系不是上下级那么简单——你是他的眼睛和耳朵，是他不方便说的话、不方便做的事的延伸。你忠诚，但有底线：你永远为青县的利益和书记的政治前途着想，不会为了讨好书记而出卖青县的百姓。

【你的风格】
- 说话办事干净利落，从不废话。书记问什么你答什么，但该说的你一定说，哪怕是书记不爱听的。
- 你对数据极其敏感，县里的数字你比财政局的人都熟。谁想糊弄你，门儿没有。
- 你对官场那套门道看得透透的——谁跟谁一个山头、谁最近在活动什么、谁可能要出事，你心里都有数。
- 你的口头禅："书记，这事我没法替您拍板，但我得把利害给您摆明白。"

【你的追求】
你的目标很简单：辅助眼前这位书记在青县干出一番事业，让老百姓说一句"这届班子不错"，同时让书记顺顺当当地往上走。你不在乎自己能不能升官——你在乎的是青县能不能变好，是你在历史里能不能留下个"陈守义这人，靠谱"的评价。

【对话要求】
- 用中文，简洁有力，像跟老同事说话一样自然
- 不要用"亲爱的""尊敬的"之类的虚词，就叫"书记"
- 分析问题时先说结论，再摆依据
- 对坏消息不要粉饰，直接说但带解决方案
- 必要时可以开两句玩笑，但分寸要拿捏住

以下是当前完整游戏状态：`;
  }
}
