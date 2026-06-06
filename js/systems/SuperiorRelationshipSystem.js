/**
 * SuperiorRelationshipSystem — 上级关系系统
 *
 * 描述：县委书记的省、市两级上级关系网络模拟。
 * 包括信任衰减、跑上级、争取项目、人情账本、靠山体系等核心机制。
 *
 * 设计文档：DESIGN_PHASE1_DETAILED.md 第一篇
 * 依赖模型：createDefaultSuperiorRelations (js/models/SuperiorRelations.js)
 */

class SuperiorRelationshipSystem {
  constructor() {
    this.engine = null;
    this._initialized = false;
  }

  /** 初始化 */
  init(config) {
    // 注册命名空间（如果尚未注册或为空，填充默认数据）
    const existing = stateManager.get('superiorRelations');
    if (!existing || Object.keys(existing).length === 0) {
      stateManager.register('superiorRelations', createDefaultSuperiorRelations());
    } else {
      // 检查是否有 cityLevel 结构，没有的话补全
      const sr = existing;
      if (!sr.cityLevel) {
        const defaults = createDefaultSuperiorRelations();
        Object.keys(defaults).forEach(k => {
          if (sr[k] === undefined) sr[k] = defaults[k];
        });
      }
    }
    // 初始化市委领导姓名/风格
    this._initLeadership();
    this._initialized = true;
    console.log('[SuperiorRelations] 上级关系系统初始化完成');
  }

  /** 初始化市委领导配置 */
  _initLeadership() {
    const sr = stateManager.get('superiorRelations');
    if (!sr) return;
    // 随机选一种领导风格组合（可扩展为难度/存档初始化）
    const styles = ['pragmatic', 'political', 'aggressive'];
    const chosen = styles[Math.floor(Math.random() * styles.length)];
    const leaders = createDefaultCityLeadership(chosen);
    // 只写名字，不覆盖已有信任值（以防读档）
    if (sr.cityLevel.secretary) {
      sr.cityLevel.secretary.name = leaders.secretary.name;
      sr.cityLevel.secretary.style = leaders.secretary.style;
      sr.cityLevel.secretary.keyConcerns = leaders.secretary.concerns;
    }
    if (sr.cityLevel.mayor) {
      sr.cityLevel.mayor.name = leaders.mayor.name;
      sr.cityLevel.mayor.style = leaders.mayor.style;
      sr.cityLevel.mayor.keyConcerns = leaders.mayor.concerns;
    }
  }

  // ════════════════════════════════════════════
  //  每周更新（由 GameEngine._weeklyUpdate 调用）
  // ════════════════════════════════════════════

  weeklyUpdate() {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!sr || !player || !county) return;

    // 1. 信任自然衰减（每月一次，4周）
    if (timeSystem && (timeSystem.day % 28 < 7)) {
      this._applyTrustDecay(sr, player, county);
    }

    // 2. 派系偏好修正（每周）
    this._applyFactionBias(sr, player);

    // 3. 政绩→上级评价传导（每周微调）
    this._applyPerformanceConduction(sr, county);

    // 4. 政治资本恢复（每周）
    this._recoverPoliticalCapital(sr, player);

    // 5. 上级交办事项超期检查
    this._checkPendingRequests(sr, player);

    // 6. 上级交办事项生成（每周概率）
    this._generatePendingRequests(sr);

    // 7. 随机上级事件（~15%概率）
    if (Math.random() < 0.15) {
      this._triggerRandomSuperiorEvent(sr, player, county);
    }

    // 8. 同步到 player.relations（兼容旧系统引用）
    this._syncToPlayerRelations(sr, player);
  }

  /** 月度更新（由 GameEngine._monthlyUpdate 调用） */
  monthlyUpdate(year, month) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    const county = stateManager.get('county');
    if (!sr || !player || !county) return;

    // 1. 统计月度跑上级次数
    const visitCount = sr.stats.totalVisits;
    // 记录上次衰减月份
    sr.stats.lastMonthlyDecay = { year, month };

    // 2. 检查所有交办事项
    this._checkAllRequests(sr, player, county);

    // 3. 生成月度上级满意度快照
    this._updateSuperiorSatisfaction(sr, player, county);

    // 4. 省厅项目审批结果（如果有在途项目）
    this._processProjectResults(sr);

    // 5. 月度政治账本维护（清理过期人情、提醒未还人情）
    this._maintainFavorAccount(sr);

    // 6. 靠山体系月度检测
    this._checkPatronStatus(sr, player);
  }

  // ════════════════════════════════════════════
  //  政治账本维护
  // ════════════════════════════════════════════

  /** 维护人情账本：清理过期、发出提醒 */
  _maintainFavorAccount(sr) {
    if (!sr.favorAccount) return;
    // 检查你欠别人的：超过6个月不还的，对方会来讨债
    const owes = sr.favorAccount.owes || [];
    for (let i = 0; i < owes.length; i++) {
      const d = owes[i];
      if (d.status !== 'active') continue;
      const weeks = this._weeksSince(sr, d.date);
      // 约6个月=24周
      if (d.reminded) continue;
      if (weeks > 20) {
        d.reminded = true;
        const whoLabel = d.from === 'citySecretary' ? '市委书记' : d.from === 'cityMayor' ? '市长' : d.from;
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '🤝 人情提醒',
          message: `${whoLabel}那边暗示你该还人情了（${d.desc}）。人情债太久不还会影响关系。`,
          choices: [
            { label: '主动还人情', action: 'repayFavor_' + i },
            { label: '再等等', action: null }
          ]
        });
      }
      // 超过36周（9个月）不还 → 关系恶化
      if (weeks > 32 && d.status === 'active') {
        d.status = 'forgiven';
        const whoLabel = d.from === 'citySecretary' ? '市委书记' : d.from === 'cityMayor' ? '市长' : d.from;
        const trustPenalty = d.from === 'citySecretary' ? 5 : 3;
        if (d.from === 'citySecretary' && sr.cityLevel.secretary) {
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust - trustPenalty, 0, 100);
        } else if (d.from === 'cityMayor' && sr.cityLevel.mayor) {
          sr.cityLevel.mayor.trust = calculator.clamp(sr.cityLevel.mayor.trust - trustPenalty, 0, 100);
        }
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'error', title: '🤝 人情债违约',
          message: `你欠${whoLabel}的人情一直没有还，对方已心生不满。信任-${trustPenalty}。`
        });
      }
    }
  }

  /** 记录一笔人情债（你欠别人的） */
  _addOwedFavor(sr, from, type, desc) {
    if (!sr.favorAccount) sr.favorAccount = { owes: [], owed: [] };
    if (!sr.favorAccount.owes) sr.favorAccount.owes = [];
    sr.favorAccount.owes.push({
      from,
      type,
      desc,
      date: {
        week: Math.ceil((timeSystem?.day || 1) / 7),
        month: timeSystem?.month || 1,
        year: timeSystem?.year || 2026
      },
      status: 'active',
      reminded: false
    });
    sr.stats.totalFavors = (sr.stats.totalFavors || 0) + 1;
  }

  /** 记录一笔人情债（别人欠你的） */
  _addOwedToMe(sr, from, type, desc) {
    if (!sr.favorAccount) sr.favorAccount = { owes: [], owed: [] };
    if (!sr.favorAccount.owed) sr.favorAccount.owed = [];
    sr.favorAccount.owed.push({
      from,
      type,
      desc,
      date: {
        week: Math.ceil((timeSystem?.day || 1) / 7),
        month: timeSystem?.month || 1,
        year: timeSystem?.year || 2026
      },
      status: 'active'
    });
  }

  // ════════════════════════════════════════════
  //  靠山体系
  // ════════════════════════════════════════════

  /** 每月检测靠山状态 */
  _checkPatronStatus(sr, player) {
    const sec = sr.cityLevel.secretary;
    // 条件：市委书记信任连续>70且政治资本>120
    if (!sr.patronChain.patron && sec.trust > 70 && sr.politicalCapital > 120) {
      // 有概率建立靠山关系
      if (Math.random() < 0.1) { // 10%/月
        sr.patronChain.patron = {
          id: 'citySecretary',
          name: sec.name || '赵建国',
          role: '市委书记',
          power: Math.floor(50 + sec.trust * 0.3) // 势力随信任增长
        };
        sr.patronChain.patronStrength = sr.patronChain.patron.power;
        sr.patronChain.patronLoyalty = 30; // 初始忠诚度
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'success', title: '🔗 建立靠山',
          message: `市委书记${sec.name}成为了您的政治靠山！您的政治空间显著扩大。政治资本上限+50。`
        });
      }
    }
    // 已有靠山后，维持忠诚度
    if (sr.patronChain.patron) {
      // 每月自然增长忠诚度
      sr.patronChain.patronLoyalty = calculator.clamp(
        (sr.patronChain.patronLoyalty || 0) + 1, 0, 100
      );
      // 靠山势力随市委书记信任变化
      sr.patronChain.patronStrength = Math.floor(50 + sec.trust * 0.3);
      // 靠山政治资本加成
      const bonus = Math.floor(sr.patronChain.patronStrength / 10);
      sr.politicalCapital = calculator.clamp(
        (sr.politicalCapital || 100) + 0.5, 0, 200 + bonus
      );
      // 靠山失势检测
      if (sec.trust < 35 && sr.patronChain.patronStrength > 30) {
        sr.patronChain.patronStrength = calculator.clamp(
          sr.patronChain.patronStrength - 2, 0, 100
        );
      }
      if (sec.trust < 20) {
        // 靠山可能自身难保
        sr.patronChain.patronLoyalty = calculator.clamp(
          sr.patronChain.patronLoyalty - 2, 0, 100
        );
      }
      if (sec.trust < 10 && sr.patronChain.patronStrength < 20) {
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'error', title: '🔗 靠山动摇',
          message: `市委书记${sec.name}自身处境艰难，已无力为您提供庇护。靠山势力大幅削弱。`
        });
      }
    }
  }

  // ════════════════════════════════════════════
  //  交办事项生成
  // ════════════════════════════════════════════

  /** 生成上级交办事项（每周在 weeklyUpdate 调用） */
  _generatePendingRequests(sr) {
    const sec = sr.cityLevel.secretary;
    if (!sec.pendingRequests) sec.pendingRequests = [];
    const activeCount = sec.pendingRequests.filter(r => r.status === 'active').length;
    // 最多3个同时活跃
    if (activeCount >= 3) return;
    // 约8%概率/周 生成新交办
    if (Math.random() >= 0.08) return;

    const tasks = [
      { desc: '完成上半年经济形势分析报告', deadlineWeeks: 4 },
      { desc: '推进县域营商环境优化专项行动', deadlineWeeks: 6 },
      { desc: '落实市委关于安全生产大检查的部署', deadlineWeeks: 3 },
      { desc: '完成信访积案化解攻坚月任务', deadlineWeeks: 4 },
      { desc: '报送基层党建工作经验材料', deadlineWeeks: 3 },
      { desc: '协调解决重点项目建设中的征地问题', deadlineWeeks: 5 },
      { desc: '做好省委巡视准备工作自查报告', deadlineWeeks: 4 },
      { desc: '落实乡村振兴考核指标整改', deadlineWeeks: 6 },
      { desc: '完成环保督察反馈问题整改阶段性报告', deadlineWeeks: 4 },
      { desc: '推进县域医共体建设试点', deadlineWeeks: 8 },
    ];
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    const nowWeek = Math.ceil((timeSystem?.day || 1) / 7);
    sec.pendingRequests.push({
      id: 'req_' + Date.now(),
      desc: task.desc,
      deadline: {
        week: nowWeek + task.deadlineWeeks,
        month: timeSystem?.month || 1,
        year: timeSystem?.year || 2026
      },
      status: 'active'
    });
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 上级交办',
      message: `市委交办：${task.desc}（${task.deadlineWeeks}周内完成）。`
    });
  }

  /** 添加一条交办事项（被其他系统调用） */
  addPendingRequest(leaderType, request) {
    const sr = stateManager.get('superiorRelations');
    if (!sr) return;
    const leader = leaderType === 'secretary' ? sr.cityLevel.secretary : sr.cityLevel.mayor;
    if (!leader) return;
    if (!leader.pendingRequests) leader.pendingRequests = [];
    leader.pendingRequests.push({
      id: request.id || 'req_' + Date.now(),
      desc: request.desc,
      deadline: request.deadline || null,
      status: 'active'
    });
  }

  // ════════════════════════════════════════════
  //  核心衰减逻辑
  // ════════════════════════════════════════════

  /** 上级信任月度衰减 */
  _applyTrustDecay(sr, player, county) {
    const sec = sr.cityLevel.secretary;
    const may = sr.cityLevel.mayor;

    // 基础衰减
    const baseDecay = 1.2; // 约1.2点/月

    // 检查距离上次见面时间（周）
    const weeksSinceMeeting = this._weeksSince(sr, sec.lastMeeting);
    let decaySec = baseDecay;
    if (weeksSinceMeeting > 4) decaySec += 1;   // 超过1月未见
    if (weeksSinceMeeting > 8) decaySec += 2;   // 超过2月未见
    if (weeksSinceMeeting > 12) decaySec += 3;  // 超过3月未见

    // 市长衰减速度是书记的60%
    const weeksSinceMayorMeeting = this._weeksSince(sr, may.lastMeeting);
    let decayMay = baseDecay * 0.6;
    if (weeksSinceMayorMeeting > 4) decayMay += 0.6;
    if (weeksSinceMayorMeeting > 8) decayMay += 1.2;

    // 政治把控能力减缓衰减
    const politicsAbility = player.getAbility ? player.getAbility('politics') : 50;
    const politicsFactor = 1 - (politicsAbility - 50) * 0.004; // 50→1.0, 80→0.88, 30→1.08
    sec.trust = calculator.clamp(sec.trust - decaySec * politicsFactor, 0, 100);
    may.trust = calculator.clamp(may.trust - decayMay * politicsFactor, 0, 100);

    // 组织部印象自然衰减（更慢）
    if (sr.cityLevel.organizationDept) {
      sr.cityLevel.organizationDept.impression = calculator.clamp(
        sr.cityLevel.organizationDept.impression - 0.5, 0, 100
      );
    }

    // 若信任过低触发警告
    if (sec.trust < 30) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '⚠️ 上级关系预警',
        message: `市委书记信任度降至${Math.round(sec.trust)}。建议近期安排汇报工作。`
      });
    }
    if (sec.trust < 15) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'error', title: '🔴 政治危机',
        message: '市委书记对您的信任已到危险边缘！尽快修复关系，否则可能被调离。'
      });
    }
  }

  /** 计算距离上次见面的周数 */
  _weeksSince(sr, lastMeeting) {
    if (!lastMeeting || !timeSystem) return 99;
    const currentWeek = Math.ceil((timeSystem.day || 1) / 7);
    const lastWeek = lastMeeting.week || 1;
    const yearDiff = ((timeSystem.year || 2026) - (lastMeeting.year || 2026)) * 52;
    return Math.max(0, currentWeek - lastWeek + yearDiff);
  }

  /** 派系偏好修正 */
  _applyFactionBias(sr, player) {
    const sec = sr.cityLevel.secretary;
    if (sec.faction === 'unknown') return;

    const factionSys = this.engine?.getSystem?.('factions');
    if (!factionSys) return;

    // 统计玩家提拔的派系干部数量
    const playerFactionCount = factionSys.getMemberCount?.('secretary') || 0;
    const targetFactionCount = factionSys.getMemberCount?.(sec.faction) || 0;

    // 派系权重取决于书记风格
    const styleWeights = {
      political: 0.8,    // 政治型非常看重站队
      aggressive: 0.5,
      pragmatic: 0.3,    // 务实型看实绩
      technocratic: 0.2  // 技术型不太关心
    };
    const weight = styleWeights[sec.style] || 0.3;

    // 如果书记和自己同派系→信任微增
    if (sec.faction === 'secretary') {
      sec.trust = calculator.clamp(sec.trust + 0.3 * weight, 0, 100);
    }
    // 如果提拔了大量对立派系→信任微降
    // （简化：用 targetFaction 的上升代表对方势力扩张）
    if (targetFactionCount > 3) {
      const penalty = (targetFactionCount - 3) * 0.2 * weight;
      sec.trust = calculator.clamp(sec.trust - penalty, 0, 100);
    }
  }

  /** 政绩→上级评价传导 */
  _applyPerformanceConduction(sr, county) {
    const sec = sr.cityLevel.secretary;
    // 经济增速影响
    const gdpGrowth = county.economy?.gdpGrowth || 0;
    if (gdpGrowth > 0.08) {
      sec.trust = calculator.clamp(sec.trust + 0.15, 0, 100);
    }
    // 社会稳定影响
    const tension = county.socialTension || 0;
    if (tension > 60) {
      sec.trust = calculator.clamp(sec.trust - 0.25 * ((tension - 60) / 40), 0, 100);
    }
  }

  /** 政治资本恢复 */
  _recoverPoliticalCapital(sr, player) {
    let recovery = 1.0; // 基础恢复 1/周
    const sec = sr.cityLevel.secretary;
    if (sec.trust > 70) recovery += 0.5;  // 信任高→更多空间
    if (sr.patronChain.patron && sr.patronChain.patronStrength > 50) recovery += 0.3;
    sr.politicalCapital = calculator.clamp(
      (sr.politicalCapital || 100) + recovery, 0, 200
    );
    // 同步 Player 中的政治资本（兼容旧引用）
    if (player.politicalCapital !== undefined) {
      player.politicalCapital = sr.politicalCapital;
    }
  }

  /** 上级交办事项超期检查 */
  _checkPendingRequests(sr, player) {
    [sr.cityLevel.secretary, sr.cityLevel.mayor].forEach(leader => {
      if (!leader.pendingRequests) return;
      const overdue = leader.pendingRequests.filter(r => {
        if (r.status !== 'active') return false;
        if (!r.deadline) return false;
        return this._weeksSince(sr, r.deadline) > 0;
      });
      overdue.forEach(r => {
        r.status = 'overdue';
        leader.trust = calculator.clamp(leader.trust - 2, 0, 100);
        eventBus.emit(EVENTS.UI_NOTIFICATION, {
          type: 'warning', title: '⏰ 交办事项逾期',
          message: `您有一项${leader === sr.cityLevel.secretary ? '市委' : '市政'}交办事项已逾期：「${r.desc}」。上级信任-2。`
        });
      });
    });
  }

  /** 检查所有交办事项 */
  _checkAllRequests(sr, player, county) {
    [sr.cityLevel.secretary, sr.cityLevel.mayor].forEach(leader => {
      if (!leader.pendingRequests) return;
      leader.pendingRequests.forEach(r => {
        if (r.status === 'active' && r.deadline) {
          if (this._weeksSince(sr, r.deadline) > 0) {
            r.status = 'overdue';
          }
        }
      });
    });
  }

  // ════════════════════════════════════════════
  //  上级综合满意度
  // ════════════════════════════════════════════

  /** 更新上级综合满意度 */
  _updateSuperiorSatisfaction(sr, player, county) {
    const sec = sr.cityLevel.secretary;
    const org = sr.cityLevel.organizationDept;
    // 综合=书记信任×0.6 + 市长信任×0.2 + 组织部印象×0.2
    const satisfaction = sec.trust * 0.6 + (sr.cityLevel.mayor?.trust || 50) * 0.2
                       + (org?.impression || 50) * 0.2;
    sr.stats.superiorSatisfaction = Math.round(satisfaction);
  }

  /** 获取年度上级综合评分（考核用） */
  getAnnualSuperiorScore() {
    const sr = stateManager.get('superiorRelations');
    if (!sr) return 50;
    return sr.stats.superiorSatisfaction || 50;
  }

  // ════════════════════════════════════════════
  //  省厅项目审批
  // ════════════════════════════════════════════

  /** 处理在途项目审批结果 */
  _processProjectResults(sr) {
    const depts = sr.provinceLevel.deptFavors;
    Object.keys(depts).forEach(deptKey => {
      const dept = depts[deptKey];
      if (!dept.projectsSubmitted || dept.projectsSubmitted.length === 0) return;
      const submitted = dept.projectsSubmitted;
      for (let i = submitted.length - 1; i >= 0; i--) {
        const proj = submitted[i];
        if (!proj.submittedDate) continue;
        // 审批周期4-8周
        const weeksWaiting = this._weeksSince(sr, proj.submittedDate);
        if (weeksWaiting >= 4 + Math.floor(Math.random() * 5)) {
          // 审批结果
          const favor = dept.favor / 100;
          const baseChance = 0.3 + favor * 0.4; // favor=50→0.5, favor=0→0.3, favor=100→0.7
          const approved = Math.random() < baseChance;
          if (approved) {
            proj.status = 'approved';
            sr.stats.totalProjectsWon++;
            const projectValue = proj.value || 500; // 万元
            // 项目获批=省厅给了面子 → 你欠省厅一个人情
            this._addOwedFavor(sr, deptKey, 'project', `省厅批准了「${proj.name}」项目`);
            eventBus.emit(EVENTS.UI_NOTIFICATION, {
              type: 'success', title: '✅ 项目获批',
              message: `「${proj.name}」项目已获${deptKey === 'finance' ? '省财政厅' : '省厅'}批准，项目资金${projectValue}万元。`
            });
            // 资金注入财政
            const finance = stateManager.get('finance');
            if (finance) {
              finance.treasuryBalance = (finance.treasuryBalance || 0) + projectValue;
            }
          } else {
            proj.status = 'rejected';
            eventBus.emit(EVENTS.UI_NOTIFICATION, {
              type: 'info', title: '📋 项目未获批',
              message: `「${proj.name}」项目本次未获批。可继续争取或调整方案。`
            });
          }
          submitted.splice(i, 1); // 移除已处理项
        }
      }
    });
  }

  // ════════════════════════════════════════════
  //  玩家操作（主动行动）
  // ════════════════════════════════════════════

  /**
   * 去市委汇报工作
   * @param {string} topic - 汇报主题: 'economy'|'partyBuilding'|'stability'|'general'
   * @returns {object} 结果
   */
  reportToSecretary(topic) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    // 消耗精力
    if (!player.consumeEnergy || !player.consumeEnergy(15)) {
      return { success: false, msg: '精力不足（需要15精力）' };
    }

    const sec = sr.cityLevel.secretary;
    const weeksGap = this._weeksSince(sr, sec.lastMeeting);

    // 汇报效果：取决于汇报主题是否对路 + 政治把控能力
    const topicBonus = sec.keyConcerns.includes(topic) ? 0.4 : 0;
    const politicsAbility = player.getAbility ? player.getAbility('politics') : 50;
    const abilityBonus = (politicsAbility - 50) * 0.002; // 50→0, 80→+0.06

    // 太久没见面有额外的"修补"效果
    const gapBonus = weeksGap > 8 ? 0.15 : 0;

    const trustGain = 2 + Math.round((topicBonus + abilityBonus + gapBonus) * 5);
    // 随机波动 ±1
    const finalGain = calculator.clamp(trustGain + Math.floor(Math.random() * 3) - 1, 0, 10);

    sec.trust = calculator.clamp(sec.trust + finalGain, 0, 100);
    sec.lastMeeting = {
      week: Math.ceil((timeSystem?.day || 1) / 7),
      month: timeSystem?.month || 1,
      year: timeSystem?.year || 2026
    };
    sec.meetingCount = (sec.meetingCount || 0) + 1;
    sr.stats.totalVisits++;

    // 汇报产生政治资本
    const pcGain = 2 + Math.floor(Math.random() * 3);
    sr.politicalCapital = calculator.clamp((sr.politicalCapital || 100) + pcGain, 0, 200);

    // 同步player
    if (player.politicalCapital !== undefined) player.politicalCapital = sr.politicalCapital;

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '📋 汇报工作',
      message: `向市委书记汇报${topic === 'general' ? '近期工作' : topic === 'economy' ? '经济工作' : topic === 'partyBuilding' ? '党建工作' : '稳定工作'}，市委书记信任+${finalGain}。`
    });

    return { success: true, trustGain: finalGain, pcGain };
  }

  /**
   * 跑省进厅
   * @param {string} deptKey - 厅局key: 'finance'|'agriculture'|'transportation'|'waterResources'
   * @param {string} purpose - 'funding'|'project'|'relationship'
   * @returns {object} 结果
   */
  visitProvinceDept(deptKey, purpose) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    const finance = stateManager.get('finance');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    // 消耗精力
    if (!player.consumeEnergy || !player.consumeEnergy(20)) {
      return { success: false, msg: '精力不足（需要20精力）' };
    }
    // 消耗差旅费
    const tripCost = 40; // 万元
    if (finance) {
      if ((finance.treasuryBalance || 0) < tripCost) {
        return { success: false, msg: `差旅费不足（需要${tripCost}万元）` };
      }
      finance.treasuryBalance -= tripCost;
    }

    const dept = sr.provinceLevel.deptFavors[deptKey];
    if (!dept) return { success: false, msg: '未知厅局' };

    const economyAbility = player.getAbility ? player.getAbility('economy') : 50;
    favorGain: {
      const baseGain = 3;
      const abilityGain = (economyAbility - 50) * 0.04; // 50→0, 80→+1.2
      const randomGain = Math.floor(Math.random() * 3); // 0-2
      const total = Math.round(baseGain + abilityGain + randomGain);
      dept.favor = calculator.clamp(dept.favor + total, 0, 100);
    }
    dept.lastVisit = {
      week: Math.ceil((timeSystem?.day || 1) / 7),
      month: timeSystem?.month || 1,
      year: timeSystem?.year || 2026
    };
    sr.stats.totalVisits++;

    // 如果是争取项目，提交项目申请
    if (purpose === 'project' || purpose === 'funding') {
      const projectName = this._generateProjectName(deptKey);
      const projectValue = deptKey === 'finance' ? 800 : deptKey === 'transportation' ? 1200 : 500;
      if (!dept.projectsSubmitted) dept.projectsSubmitted = [];
      dept.projectsSubmitted.push({
        name: projectName,
        value: projectValue,
        type: purpose,
        submittedDate: {
          week: Math.ceil((timeSystem?.day || 1) / 7),
          month: timeSystem?.month || 1,
          year: timeSystem?.year || 2026
        },
        status: 'pending'
      });
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: '📮 项目申报',
        message: `已向${deptKey === 'finance' ? '省财政厅' : deptKey === 'agriculture' ? '省农业厅' : deptKey === 'transportation' ? '省交通厅' : '省水利厅'}申报「${projectName}」（${projectValue}万元），等待审批。`
      });
    }

    return { success: true, favorGain: dept.favor };
  }

  /** 生成项目名称 */
  _generateProjectName(deptKey) {
    const names = {
      finance: ['县域经济高质量发展专项资金', '财政转移支付增量项目', '地方债额度申请'],
      agriculture: ['高标准农田建设项目', '现代农业产业园创建', '农村人居环境整治'],
      transportation: ['县乡道路升级改造', '农村公路提质改造', '交通枢纽建设项目'],
      waterResources: ['中小河流治理工程', '水库除险加固工程', '农村饮水安全提升']
    };
    const pool = names[deptKey] || ['专项资金申请'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * 邀请领导调研
   * @param {string} leaderType - 'secretary'|'mayor'
   * @param {string} spot - 'industrial'|'rural'|'petition'
   * @returns {object} 结果
   */
  inviteInspection(leaderType, spot) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    const finance = stateManager.get('finance');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    // 消耗精力
    if (!player.consumeEnergy || !player.consumeEnergy(10)) {
      return { success: false, msg: '精力不足' };
    }
    // 接待费
    const receptionCost = 80; // 万元
    if (finance) {
      if ((finance.treasuryBalance || 0) < receptionCost) {
        return { success: false, msg: `接待经费不足（需要${receptionCost}万元）` };
      }
      finance.treasuryBalance -= receptionCost;
    }

    const leader = leaderType === 'secretary' ? sr.cityLevel.secretary : sr.cityLevel.mayor;
    if (!leader) return { success: false, msg: '该领导不存在' };

    // 调研效果：看点对口加分，暴露问题减分
    const concernBonus = leader.keyConcerns.includes(spot) ? 0.3 : 0;
    const exposeRisk = Math.random() < 0.15; // 15%概率暴露问题
    const trustGain = 2 + Math.round(concernBonus * 5) - (exposeRisk ? 3 : 0);
    const finalGain = calculator.clamp(trustGain, -5, 8);

    leader.trust = calculator.clamp(leader.trust + finalGain, 0, 100);
    leader.lastMeeting = {
      week: Math.ceil((timeSystem?.day || 1) / 7),
      month: timeSystem?.month || 1,
      year: timeSystem?.year || 2026
    };
    leader.meetingCount = (leader.meetingCount || 0) + 1;

    const spotNames = { industrial: '工业园区', rural: '乡村振兴示范点', petition: '信访中心' };
    if (exposeRisk) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '📸 调研发现',
        message: `${leaderType === 'secretary' ? '市委' : '市政'}领导在参观${spotNames[spot]}时发现了问题，印象打了折扣。`
      });
    }
    const msg = exposeRisk ? `上级好感+${finalGain}` : `上级好感+${finalGain}，调研顺利。`;
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: exposeRisk ? 'warning' : 'success',
      title: '🏛️ 调研结束',
      message: msg
    });

    return { success: true, trustGain: finalGain, exposeRisk };
  }

  /**
   * 电话沟通（维护关系不掉队，效果减半）
   * @param {string} target - 'secretary'|'mayor'|'orgDept'
   */
  phoneCall(target) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    if (!player.consumeEnergy || !player.consumeEnergy(5)) {
      return { success: false, msg: '精力不足' };
    }

    let leader;
    let name = '';
    if (target === 'secretary') { leader = sr.cityLevel.secretary; name = '市委书记'; }
    else if (target === 'mayor') { leader = sr.cityLevel.mayor; name = '市长'; }
    else if (target === 'orgDept') { leader = sr.cityLevel.organizationDept; name = '组织部'; }

    if (!leader) return { success: false, msg: '目标不存在' };

    const trustGain = 1 + Math.floor(Math.random() * 2); // 1-2
    if (target !== 'orgDept') {
      leader.trust = calculator.clamp(leader.trust + trustGain, 0, 100);
    } else {
      leader.impression = calculator.clamp(leader.impression + trustGain, 0, 100);
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📞 电话沟通',
      message: `与${name}通话${target === 'orgDept' ? '，联络感情' : '，汇报近期工作'}。`
    });

    return { success: true, trustGain };
  }

  /**
   * 完成上级交办事项
   * @param {string} requestId - 交办事项ID
   */
  completeRequest(requestId) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    if (!player.consumeEnergy || !player.consumeEnergy(10)) {
      return { success: false, msg: '精力不足' };
    }

    // 在书记和市长的交办事项中查找
    let foundRequest = null;
    let foundLeader = null;
    [sr.cityLevel.secretary, sr.cityLevel.mayor].forEach(leader => {
      if (!leader.pendingRequests) return;
      const req = leader.pendingRequests.find(r => r.id === requestId);
      if (req) { foundRequest = req; foundLeader = leader; }
    });

    if (!foundRequest) return { success: false, msg: '未找到该交办事项' };

    foundRequest.status = 'completed';
    const trustGain = 3 + Math.floor(Math.random() * 3); // 3-5
    foundLeader.trust = calculator.clamp(foundLeader.trust + trustGain, 0, 100);
    foundLeader.evaluation.execution = calculator.clamp(
      (foundLeader.evaluation.execution || 50) + 2, 0, 100
    );

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '✅ 交办完成',
      message: `「${foundRequest.desc}」已完成上报。${foundLeader === sr.cityLevel.secretary ? '市委' : '市政'}信任+${trustGain}。`
    });

    return { success: true, trustGain };
  }

  /**
   * 还人情债
   * @param {number} debtIndex - 人情债索引
   */
  repayFavor(debtIndex) {
    const sr = stateManager.get('superiorRelations');
    const player = stateManager.get('player');
    if (!sr || !player) return { success: false, msg: '系统未就绪' };

    const debt = sr.favorAccount.owes[debtIndex];
    if (!debt) return { success: false, msg: '该人情不存在' };

    if (debt.status !== 'active') return { success: false, msg: '该人情已处理' };

    // 消耗政治资本
    if (sr.politicalCapital < 5) {
      return { success: false, msg: '政治资本不足（需要5）' };
    }
    sr.politicalCapital -= 5;

    debt.status = 'repaid';
    // 还人情→关系改善
    if (debt.from === 'citySecretary') {
      sr.cityLevel.secretary.trust = calculator.clamp(
        sr.cityLevel.secretary.trust + 3, 0, 100
      );
    } else if (debt.from === 'cityMayor') {
      sr.cityLevel.mayor.trust = calculator.clamp(
        sr.cityLevel.mayor.trust + 3, 0, 100
      );
    }

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🤝 人情两清',
      message: `已偿还${debt.from === 'citySecretary' ? '市委书记' : '市长'}的一个人情。`
    });

    return { success: true };
  }

  // ════════════════════════════════════════════
  //  随机上级事件
  // ════════════════════════════════════════════

  /** 触发随机上级动态事件 */
  _triggerRandomSuperiorEvent(sr, player, county) {
    const events = [
      this._eventSecretaryCall,
      this._eventCityMeeting,
      this._eventOrgDeptNotice,
      this._eventSuperiorInspection,
      this._eventPoliticalWind,
      this._eventSuperiorPraise,
      this._eventPersonnelRecommendation,
      this._eventBudgetCut,
      this._eventNeighborComparison,
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    const eventName = event.name;
    event.call(this, sr, player, county);
    // 发送上级事件到右侧面板（兼容旧toast通知）
    eventBus.emit(EVENTS.SUPERIOR_EVENT, {
      type: 'superior',
      timestamp: {
        week: Math.ceil((timeSystem?.day || 1) / 7),
        month: timeSystem?.month || 1,
        year: timeSystem?.year || 2026
      },
      eventName: eventName,
      source: 'superiorRelations'
    });
  }

  /** 事件1：市委书记来电询问工作 */
  _eventSecretaryCall(sr, player, county) {
    const topic = sr.cityLevel.secretary.keyConcerns[Math.floor(Math.random() * sr.cityLevel.secretary.keyConcerns.length)];
    const topics = {
      economicGrowth: '经济增长',
      stability: '社会稳定',
      partyBuilding: '党建工作',
      fiscalHealth: '财政状况',
      projectProgress: '重点项目',
      loyalty: '班子团结'
    };
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📞 市委书记来电',
      message: `市委书记来电询问${topics[topic] || '近期工作'}情况。`,
      choices: [
        { label: '详细汇报（准备充分）', action: () => {
          const gain = 2 + Math.floor(Math.random() * 2);
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + gain, 0, 100);
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: `市委书记满意您的汇报，信任+${gain}。` });
        }},
        { label: '简要回应（精力消耗小）', action: () => {
          const gain = 0 + Math.floor(Math.random() * 2);
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + gain, 0, 100);
        }},
        { label: '含糊其辞（回避问题）', action: () => {
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust - 1, 0, 100);
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', message: '市委书记似乎不太满意您的回答，信任-1。' });
        }}
      ]
    });
  }

  /** 事件2：市委开会通知 */
  _eventCityMeeting(sr, player, county) {
    const meetingType = ['全市经济工作会议', '县委书记座谈会', '全市维稳工作会议', '党建工作推进会'][Math.floor(Math.random() * 4)];
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 会议通知',
      message: `市委通知：下周三召开「${meetingType}」，要求县委书记参加。`,
      choices: [
        { label: '按时参加', action: () => {
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + 1, 0, 100);
          player.modifyStatus('energy', -8);
        }},
        { label: '请假（派副书记代开）', action: () => {
          sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust - 1, 0, 100);
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'info', message: '市委书记注意到您缺席。' });
        }}
      ]
    });
  }

  /** 事件3：组织部考察预告 */
  _eventOrgDeptNotice(sr, player, county) {
    const org = sr.cityLevel.organizationDept;
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '📋 组织部预告',
      message: '市委组织部通知：近期将对本县领导班子进行年度考察，请做好准备。',
      choices: [
        { label: '认真准备材料', action: () => {
          const bonus = 3 + Math.floor(Math.random() * 3);
          org.impression = calculator.clamp(org.impression + bonus, 0, 100);
          player.consumeEnergy(8);
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: `材料准备充分，组织部印象+${bonus}。` });
        }},
        { label: '常规应对', action: () => {
          const bonus = 1;
          org.impression = calculator.clamp(org.impression + bonus, 0, 100);
        }},
        { label: '找关系提前沟通', action: () => {
          if (sr.politicalCapital < 10) {
            eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', message: '政治资本不足（需要10）。无法提前沟通。' });
            return;
          }
          sr.politicalCapital -= 10;
          const bonus = 5 + Math.floor(Math.random() * 3);
          org.impression = calculator.clamp(org.impression + bonus, 0, 100);
          // 风险：被记录为"跑官要官"
          org.vigilance = calculator.clamp((org.vigilance || 20) + 5, 0, 100);
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: `已提前沟通，组织部印象+${bonus}。但组织部警惕度有所上升。` });
        }}
      ]
    });
  }

  /** 事件4：上级督查通知 */
  _eventSuperiorInspection(sr, player, county) {
    const area = ['安全生产', '环境保护', '脱贫攻坚成果', '营商环境'][Math.floor(Math.random() * 4)];
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'warning', title: '🔍 上级督查通知',
      message: `市督查组将于近期对本县${area}工作进行专项督查。`,
      choices: [
        { label: '全面自查整改', action: () => {
          player.consumeEnergy(12);
          sr.cityLevel.secretary.evaluation.execution = calculator.clamp(
            (sr.cityLevel.secretary.evaluation.execution || 50) + 3, 0, 100
          );
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: '自查整改到位，督查准备充分。' });
        }},
        { label: '重点准备亮点', action: () => {
          player.consumeEnergy(6);
          // 50%概率过关
          if (Math.random() < 0.5) {
            eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: '督查顺利通过。' });
          } else {
            sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust - 2, 0, 100);
            eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', message: '督查发现了一些问题，被通报批评。信任-2。' });
          }
        }},
        { label: '忽略（精力省下来）', action: () => {
          if (Math.random() < 0.4) {
            sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust - 4, 0, 100);
            eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'error', message: '督查发现严重问题，市委书记点名批评。信任-4！' });
          }
        }}
      ]
    });
  }

  /** 事件5：政治风向事件（低概率，影响格局） */
  _eventPoliticalWind(sr, player, county) {
    const winds = [
      { msg: '传闻市委副书记可能调离，派系格局或将调整。', effect: 'faction' },
      { msg: '省委巡视组即将部署新一轮巡视。', effect: 'inspection' },
      { msg: '据可靠消息，市委书记近期向省委推荐了您的名字。', effect: 'positive' },
      { msg: '邻县县委书记被免职接受调查，全县官场气氛紧张。', effect: 'warning' }
    ];
    const wind = winds[Math.floor(Math.random() * winds.length)];
    let type = 'info';
    if (wind.effect === 'positive') type = 'success';
    else if (wind.effect === 'warning') type = 'warning';

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type, title: '🏛️ 政治风向',
      message: wind.msg
    });

    if (wind.effect === 'positive') {
      sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + 2, 0, 100);
    }
  }

  /** 事件6：上级表扬 */
  _eventSuperiorPraise(sr, player, county) {
    const area = ['经济发展', '社会稳定', '党建工作', '乡村振兴'][Math.floor(Math.random() * 4)];
    const praiseValue = 3 + Math.floor(Math.random() * 3);
    sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + praiseValue, 0, 100);
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'success', title: '🏆 上级表扬',
      message: `在全市工作会议上，市委书记点名表扬了本县的${area}工作，称"值得各区县学习"。信任+${praiseValue}。`
    });
  }

  /** 事件7：上级向你要人 */
  _eventPersonnelRecommendation(sr, player, county) {
    const names = ['办公室主任', '财政局局长', '发改局局长', '县委办副主任', '组织部副部长'];
    const position = names[Math.floor(Math.random() * names.length)];
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '📋 上级调人',
      message: `市委组织部来电：希望推荐一名优秀干部到市里工作。有意向从您的${position}中选调。`,
      choices: [
        { label: '推荐得力干将（送人情）', action: () => {
          sr.cityLevel.organizationDept.impression = calculator.clamp(
            (sr.cityLevel.organizationDept.impression || 50) + 5, 0, 100
          );
          this._addOwedToMe(sr, 'citySecretary', 'personnel', '向市委推荐了优秀干部');
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', message: '你推荐的干部到市里后表现出色，你在上级那里的口碑更好了。组织部印象+5。' });
        }},
        { label: '推荐一般干部（留一手）', action: () => {
          sr.cityLevel.organizationDept.impression = calculator.clamp(
            (sr.cityLevel.organizationDept.impression || 50) + 1, 0, 100
          );
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'info', message: '干部已到市里报到，不算特别出彩但也没丢脸。' });
        }},
        { label: '婉拒（说没有合适人选）', action: () => {
          sr.cityLevel.organizationDept.impression = calculator.clamp(
            (sr.cityLevel.organizationDept.impression || 50) - 3, 0, 100
          );
          eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', message: '组织部对你"不配合"的态度略有微词。组织部印象-3。' });
        }}
      ]
    });
  }

  /** 事件8：财政指标被压减 */
  _eventBudgetCut(sr, player, county) {
    const cutAmount = 100 + Math.floor(Math.random() * 200); // 100-300万
    const finance = stateManager.get('finance');
    if (finance) {
      finance.treasuryBalance = Math.max(0, (finance.treasuryBalance || 0) - cutAmount);
    }
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'warning', title: '💰 指标压减',
      message: `市财政局通知：因全市财政紧张，本月转移支付压减${cutAmount}万元。这是普遍性压减，并非针对本县。`
    });
  }

  /** 事件9：邻县比较 */
  _eventNeighborComparison(sr, player, county) {
    const neighborGDP = 50 + Math.floor(Math.random() * 60); // 50-110
    const myGDP = Math.round((county?.economy?.gdpGrowth || 0.05) * 100);
    if (myGDP > neighborGDP) {
      sr.cityLevel.secretary.trust = calculator.clamp(sr.cityLevel.secretary.trust + 2, 0, 100);
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'success', title: '📊 邻县对比',
        message: `最新经济数据显示：本县GDP增速${myGDP}%，高于邻县的${neighborGDP}%。市委书记在会上肯定了你的工作。信任+2。`
      });
    } else {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: '📊 邻县对比',
        message: `最新经济数据显示：本县GDP增速${myGDP}%，邻县达到${neighborGDP}%。差距不大，但仍需努力。`
      });
    }
  }

  // ════════════════════════════════════════════
  //  工具方法
  // ════════════════════════════════════════════

  /** 同步到 player.relations（兼容旧系统对单个 citySecretary 的引用） */
  _syncToPlayerRelations(sr, player) {
    if (!player.relations) return;
    if (sr.cityLevel?.secretary?.trust !== undefined) {
      // 旧系统信任范围是 -50~+50，新系统是 0-100
      player.relations.citySecretary = (sr.cityLevel.secretary.trust - 50);
    }
    if (sr.cityLevel?.mayor?.trust !== undefined) {
      player.relations.cityMayor = (sr.cityLevel.mayor.trust - 50);
    }
    // 同步政治资本
    if (player.politicalCapital !== undefined) {
      player.politicalCapital = sr.politicalCapital;
    }
  }

  /**
   * 获取市委书记的信任度（便捷方法）
   */
  getSecretaryTrust() {
    const sr = stateManager.get('superiorRelations');
    return sr?.cityLevel?.secretary?.trust || 50;
  }

  /**
   * 获取上级综合满意度
   */
  getSuperiorSatisfaction() {
    const sr = stateManager.get('superiorRelations');
    return sr?.stats?.superiorSatisfaction || 55;
  }

  /** 获取序列化状态（用于存档） */
  toJSON() {
    return stateManager.get('superiorRelations');
  }

  /** 从存档恢复 */
  fromJSON(data) {
    if (data) stateManager.set('superiorRelations', data);
  }
}
