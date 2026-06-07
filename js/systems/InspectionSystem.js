/**
 * InspectionSystem - 巡视巡查系统
 *
 * 生命周期型系统：一届任期触发1-2次，4阶段全流程约3个月（12周）。
 * 独立设计，不嵌入 CorruptionSystem，但双向耦合传递线索。
 *
 * 四个阶段：
 *   1. 入驻准备（2-4周）：通知→自查/掩盖/调离
 *   2. 巡视进驻（2-4周）：谈话×N + 查阅资料 + 随机事件 + 发现线索
 *   3. 问题反馈（1-2周）：缺陷分类→移交纪委/考核/上级印象
 *   4. 整改落实（4-12周）：方案→销号→验收
 *
 * 集成系统：
 *   → CorruptionSystem    (移交线索)
 *   → SuperiorRelationshipSystem (结果→省印象)
 *   → PersonnelSystem     (谈话对象、用人问题)
 *   → FactionSystem       (派系借巡视互相倾轧)
 *   → EconomicSystem      (项目资金审计)
 *   → EvaluationSystem    (一票否决)
 *   → NarrativeSystem     (叙事注入)
 */

class InspectionSystem {
  constructor() {
    this.engine = null;
    this._initialized = false;

    // ——— 全状态 ———
    this.state = {

      _phaseStartWeek: 0,          // 当前阶段起始周（用于计算阶段时长）

      status: 'none',              // none | notified | active | feedback | rectifying | closed

      schedule: {                  // 触发时间窗
        minYear: 0,
        maxYear: 0,
        minMonth: 0,
        maxMonth: 0,
        triggered: false,
      },

      team: null,                  // { leader, style, members[], focus[] }
      riskAreas: [],               // [{ area, severity, discovered, reported }]
      interviews: [],              // [{ officialId, name, honesty, willReport, reportedContent, week }]
      findings: {                  // 巡视发现
        general: [],               // 一般性问题
        serious: [],               // 较重问题
        critical: [],              // 严重违纪违法线索
        recommendation: '',
        feedbackLevel: 'none',     // none | general | serious | critical
      },

      feedback: {                  // 反馈阶段
        received: false,
        meetingDate: '',
        criticizedCount: 0,        // 被点名人数
        criticizedOfficials: [],   // 被点名干部ID列表
        requiresRectification: false,
      },

      rectification: {             // 整改阶段
        items: [],                 // [{ id, desc, deadline, completed, effortSpent, result }]
        deadline: '',
        reportSubmitted: false,
        reportQuality: 0,
        inspectionResult: 'none',  // passed | conditional | failed
        completedWeek: 0,
      },

      // ——— 统计 ———
      totalInterviews: 0,
      cluesDiscovered: 0,
      cluesTransferred: 0,
      officialsPunished: 0,
      inspectionCount: 0,          // 已完成的巡视次数（含本轮）

      // ——— 玩家操作记录 ———
      playerChoices: [],
    };
  }

  // ════════════════════════════════════════
  //  初始化
  // ════════════════════════════════════════

  init(config) {
    const existing = stateManager.get('inspection');
    if (!existing || Object.keys(existing).length < 3) {
      stateManager.register('inspection', this.state);
    } else {
      this.state = existing;
    }
    this._initialized = true;
    console.log('[Inspection] 巡视巡查系统初始化完成');
  }

  // ════════════════════════════════════════
  //  每周更新（主循环入口）
  // ════════════════════════════════════════

  weeklyUpdate() {
    const state = stateManager.get('inspection');
    if (!state) return;

    // 更新状态引用
    this.state = state;

    switch (state.status) {
      case 'none':
        this._checkTrigger(state);
        break;
      case 'notified':
        this._runPreparationPhase(state);
        break;
      case 'active':
        this._runActivePhase(state);
        break;
      case 'feedback':
        // 反馈阶段持续1-2周，自动过渡到整改
        this._transitionToRectifying(state);
        break;
      case 'rectifying':
        this._runRectificationPhase(state);
        break;
      case 'closed':
        // 关闭后重置为none，以便下一次触发
        this._setStatus(state, 'none');
        break;
    }
  }

  // ════════════════════════════════════════
  //  阶段0：触发检测
  // ════════════════════════════════════════

  _checkTrigger(state) {
    const ts = timeSystem;
    if (!ts) return;

    const year = ts.year;
    const month = ts.month;

    // ——— 第一次巡视：第2月必触发 ———
    if (state.inspectionCount === 0) {
      if (year === (ts.year || 2026) && month >= 2) {
        this._triggerInspection(state, year, month);
      }
      return;
    }

    // ——— 后续巡视：按周期触发 ———
    if (state.schedule.nextYear === undefined || state.schedule.nextYear === 0) return;
    if (year < state.schedule.nextYear) return;
    if (year === state.schedule.nextYear && month < state.schedule.nextMonth) return;

    // 到达触发时间窗
    if (!state.schedule._rollDone) {
      // 一次掷骰：40%概率触发
      state.schedule._rollDone = true;
      const triggerChance = 0.4;
      const superiorSys = this.engine?.getSystem?.('superiorRelations');
      const trust = superiorSys ? this._getSuperiorTrust() : 50;
      const trustMod = (trust - 50) * -0.005;
      const corrIdx = this._getCountyCorruptionIndex();
      const corrMod = corrIdx * 0.005;

      if (Math.random() < triggerChance + trustMod + corrMod) {
        this._triggerInspection(state, year, month);
      }
    }
  }

  /** 触发巡视 */
  _triggerInspection(state, year, month) {
    state.schedule.triggered = true;
    state.schedule.nextYear = 0;
    state.schedule.nextMonth = 0;
    state.schedule._rollDone = false;
    state.status = 'notified';
    state.inspectionCount++;
    state._phaseStartWeek = this.engine?.turnCount || 0;

    // 生成巡视组
    state.team = this._generateInspectionTeam();
    // 初始化风险域（基于经济/腐败/社会数据）
    state.riskAreas = this._generateRiskAreas();

    state.playerChoices.push({
      week: timeSystem.day / 7 | 0,
      phase: 'trigger',
      action: '巡视通知送达',
    });

    // 记录日志
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '🔍 巡视通知',
      message: `省委巡视组将于近期进驻本县开展工作。组长：${state.team.leader}，巡视风格：${INSPECTION_STYLES[state.team.style]?.name || '常规'}。请做好相关工作准备。`,
      persistent: true,
    });
    this._addInspectionLog('critical', '巡视通知', `省委巡视组将于即日进驻，组长${state.team.leader}`);

    // ——— 触发叙事 ———
    this._emitToNarrative('inspection_notified', {
      leader: state.team.leader,
      style: state.team.style,
      year, month,
    });
  }

  // ════════════════════════════════════════
  //  阶段1：入驻准备（2-4周）
  // ════════════════════════════════════════

  _runPreparationPhase(state) {
    const weeksInPhase = this._getWeeksSince('notified');

    // 最多4周准备期
    if (weeksInPhase >= 4) {
      this._advanceToActive(state);
      return;
    }

    // 准备期的第一周：显示可选操作
    if (weeksInPhase === 0) {
      this._offerPreparationActions(state);
    }

    // 每周提示准备情况
    if (weeksInPhase === 1) {
      this._addInspectionLog('info', '准备中', `巡视组预计${4 - weeksInPhase}周后进驻`);
    }
  }

  /** 弹出巡视决策弹窗 */
  _showChoice(title, message, choices, eventIdPrefix) {
    // 为每个选项生成独立回调
    const self = this;
    const enhanced = choices.map(c => ({
      id: c.id,
      label: c.label,
      desc: c.desc || '',
      callback: function(idx) {
        if (c._handler) c._handler.call(self);
      },
    }));
    eventBus.emit(EVENTS.INSPECTION_CHOICE, {
      title: title,
      message: message,
      choices: enhanced,
      eventId: (eventIdPrefix || 'insp') + '_' + Date.now(),
    });
  }

  /** 提供准备期操作选项 */
  _offerPreparationActions(state) {
    const self = this;
    this._showChoice(
      '📋 巡视准备：选择应对策略',
      '巡视组即将进驻，请选择应对方式：',
      [
        {
          id: 'inspect_self_check', label: '✅ 自查自纠',
          desc: '主动排查问题，及早整改。巡视印象+20，可能提前暴露问题。',
          _handler: function() {
            state.riskAreas.forEach(r => {
              r.severity = Math.max(1, r.severity - Math.floor(Math.random() * 10 + 5));
              r.discovered = Math.max(r.discovered, r.severity * 0.3);
            });
            self._modifySuperiorAttribute('impression', 20);
            self._addInspectionLog('info', '自查自纠', '已安排各部门开展自查自纠');
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'preparation', action: 'inspect_self_check', label: '自查自纠' });
          },
        },
        {
          id: 'inspect_cover_up', label: '🙈 掩盖问题',
          desc: '紧急抹平明显漏洞。降低短时风险，但若被发现→后果加倍。',
          _handler: function() {
            state.riskAreas.forEach(r => {
              r.severity = Math.max(1, r.severity - Math.floor(Math.random() * 5 + 3));
              r._coverUp = (r._coverUp || 0) + 1;
            });
            self._addInspectionLog('warning', '掩盖问题', '已紧急处理部分敏感资料');
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'preparation', action: 'inspect_cover_up', label: '掩盖问题' });
          },
        },
        {
          id: 'inspect_transfer', label: '🔄 调离敏感干部',
          desc: '将高风险干部临时调离岗位。降低问题曝光概率，但得罪该干部及其派系。',
          _handler: function() {
            const risky = self._getHighRiskOfficials(state).slice(0, 2);
            risky.forEach(o => {
              if (o._temporaryTransfer) return;
              o._temporaryTransfer = true;
              o._transferUntil = 'inspection_end';
              self._addInspectionLog('warning', '干部调离', `将${o.name}临时调离岗位`);
              if (o.faction && o.faction !== 'none') {
                const fs = self.engine?.getSystem?.('factions');
                if (fs && fs.modifyFactionRelation) fs.modifyFactionRelation(o.faction, -10);
              }
            });
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'preparation', action: 'inspect_transfer', label: '调离敏感干部' });
          },
        },
      ],
      'inspect_prep'
    );
  }

  // ════════════════════════════════════════
  //  阶段2：巡视进驻（2-4周）
  // ════════════════════════════════════════

  _runActivePhase(state) {
    const weeksInPhase = this._getWeeksSince('active');
    const activeDuration = INSPECTION_STYLES[state.team?.style]?.duration || 4;
    if (weeksInPhase >= activeDuration) {
      this._advanceToFeedback(state);
      return;
    }
    const weekNum = weeksInPhase + 1;

    // 第1周：入驻会议
    if (weekNum === 1) {
      this._holdEntranceMeeting(state);
      // 首次弹出应对选项
      this._offerWeeklyStance(state, weekNum);
    }

    // 每周进行干部谈话
    this._conductInterviews(state, weekNum);

    // 每周检查风险域发现
    this._checkRiskAreas(state, weekNum);

    // 每周随机事件
    if (Math.random() < 0.35) {
      this._generateRandomEvent(state, weekNum);
    }

    // 每周汇成一条简报（合并所有动态），不另弹stance
    if (weekNum > 1) {
      this._addInspectionLog('info', '巡视动态',
        `第${weekNum}周工作：完成${state.totalInterviews}人次谈话，已发现${state.cluesDiscovered}条线索。`);
    }

    // 每周自动应用当前stance效果（不弹窗）
    this._applyPersistentStance(state);
  }

  /** 自动应用持续stance效果 */
  _applyPersistentStance(state) {
    // 无需弹窗，在后台执行持续效果
    // cooperationBonus和obstructionLevel已在玩家首次选择时记录
  }

  /** 巡视期第一次应对策略（仅第1周弹窗，后续自动继承） */
  _offerWeeklyStance(state, weekNum) {
    const self = this;
    this._showChoice(
      `📋 巡视应对策略`,
      '巡视组已进驻。请选择您在整个巡视期间的基本应对态度（后续可在巡视视图中调整）：',
      [
        {
          id: 'inspect_cooperate', label: '🤝 协作配合',
          desc: '全力配合巡视组工作。巡视组印象改善，但问题发现概率上升。',
          _handler: function() {
            state._cooperationBonus = (state._cooperationBonus || 0) + 2;
            state._obstructionLevel = 0;
            self._addInspectionLog('info', '配合巡视', '决定全力配合巡视组工作');
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'stance', action: 'inspect_cooperate', label: '协作配合' });
          },
        },
        {
          id: 'inspect_guide', label: '🧭 引导方向',
          desc: '主动引导巡视组关注已整改领域。暴露轻风险域，掩护高危领域。',
          _handler: function() {
            state._cooperationBonus = 0;
            state._obstructionLevel = 0;
            const safeAreas = state.riskAreas.filter(r => r.severity < 30 && r.discovered < r.severity).sort(() => Math.random() - 0.5);
            if (safeAreas.length > 0) {
              const sacrifice = safeAreas[0];
              sacrifice.discovered = sacrifice.severity;
              self._addInspectionLog('info', '引导巡视', `主动引导巡视组检查${INSPECTION_RISK_AREAS[sacrifice.area]?.name || sacrifice.area}领域`);
            } else {
              self._addInspectionLog('warning', '引导失败', '所有领域风险均已过高，引导策略无效');
            }
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'stance', action: 'inspect_guide', label: '引导方向' });
          },
        },
        {
          id: 'inspect_obstruct', label: '🛑 消极应对',
          desc: '设置障碍拖延进度。问题发现概率下降，但巡视组印象受损。',
          _handler: function() {
            state._cooperationBonus = 0;
            state._obstructionLevel = (state._obstructionLevel || 0) + 1;
            self._addInspectionLog('warning', '消极应对', '采取拖延策略，巡视进度受阻');
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'stance', action: 'inspect_obstruct', label: '消极应对' });
          },
        },
      ],
      'insp_stance'
    );
  }

  /** 入驻会议 */
  _holdEntranceMeeting(state) {
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '🔍 巡视进驻',
      message: `省委巡视组正式进驻本县。组长${state.team.leader}主持召开了巡视工作动员会，强调本次巡视将重点关注${this._getFocusDescriptions(state.team.focus)}等领域。`,
      persistent: true,
    });
    this._addInspectionLog('critical', '巡视进驻', `巡视组召开动员会，组长${state.team.leader}出席`);

    // 巡视期间某些事件被抑制
    eventBus.emit(EVENTS.INSPECTION_ACTIVE, { active: true });

    // 派系系统→通知各派系反应
    const factionSys = this.engine?.getSystem?.('factions');
    if (factionSys) {
      this._addInspectionLog('info', '派系动态', '各派系对巡视进驻反应不一');
    }
  }

  /** 执行谈话 */
  _conductInterviews(state, weekNum) {
    const personnelSys = this.engine?.getSystem?.('personnel');
    if (!personnelSys) return;

    // 本周谈话对象（县委常委 + 关键部门负责人）
    const committeeMembers = personnelSys.getCommitteeMembers?.() || [];
    const departmentHeads = personnelSys.getDepartmentHeads?.() || [];
    const allOfficials = committeeMembers.concat(departmentHeads).filter(Boolean);

    if (allOfficials.length === 0) return;

    // 每周谈话3-4人
    const count = Math.min(3 + Math.floor(Math.random() * 2), allOfficials.length);
    const shuffled = [...allOfficials].sort(() => Math.random() - 0.5);
    const thisWeek = shuffled.slice(0, count);

    const interviewSummaries = [];

    thisWeek.forEach(official => {
      const faction = official.faction || 'none';
      const honesty = this._calculateHonesty(official, state);
      const willReport = this._calculateWillReport(official, state);

      const interview = {
        officialId: official.id || official.name,
        name: official.name || '未知',
        title: official.position || '',
        faction: faction,
        honesty: honesty,
        willReport: willReport,
        reportedContent: [],
        week: weekNum,
      };

      // 派系影响：书记系的干部更可能隐瞒问题
      let factionMod = 0;
      if (faction === 'secretary') factionMod = -0.15;   // 书记系：隐瞒
      else if (faction === 'mayor') factionMod = 0.10;    // 县长系：借巡视举报对手
      else if (faction === 'native') factionMod = -0.05;  // 本土系：自保为主
      else if (faction === 'parachute') factionMod = 0.20; // 空降系：最愿配合巡视
      else if (faction === 'bureaucrat') factionMod = 0.05; // 官僚系：按规矩来

      const adjustedWill = willReport + factionMod * 100;

      // 如实报告→可能提供线索
      if (adjustedWill > 60 && honesty > 50) {
        const clue = this._generateClue(official, state);
        if (clue) {
          interview.reportedContent.push(clue);
          state.cluesDiscovered++;
          interviewSummaries.push(`${official.name}反映：${clue.description}`);
          // 线索更新到风险域
          const targetArea = state.riskAreas.find(r => r.area === clue.area);
          if (targetArea) {
            targetArea.discovered = Math.min(targetArea.severity, targetArea.discovered + clue.severity);
            targetArea.reported = true;
          }
          this._addInspectionLog('warning', '谈话发现',
            `${official.name}反映：${clue.description}`);
        }
      }

      // 记下谁隐瞒了
      if (adjustedWill < 30) {
        interviewSummaries.push(`${official.name}（${official.position}）守口如瓶，未提供有价值信息`);
        // 书记系干部隐瞒被记录
        if (faction === 'secretary') {
          state._secretaryFactionSilence = (state._secretaryFactionSilence || 0) + 1;
        }
      } else if (adjustedWill < 60) {
        interviewSummaries.push(`${official.name}（${official.position}）言辞谨慎，未触及实质`);
      } else if (adjustedWill >= 60 && interview.reportedContent.length === 0) {
        interviewSummaries.push(`${official.name}（${official.position}）态度配合，但未提供具体线索`);
      }

      state.interviews.push(interview);
      state.totalInterviews++;
    });

    // 显示本周谈话简报（仅当有重要发现时推送）
    if (interviewSummaries.length > 0) {
      const brief = interviewSummaries.slice(0, 3).join('；') +
        (interviewSummaries.length > 3 ? `等${interviewSummaries.length}人` : '');
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'info', title: `📋 第${weekNum}周谈话简报`,
        message: brief,
        persistent: false,
      });
    }

    // 调查中谈话影响派系忠诚
    const factionSys = this.engine?.getSystem?.('factions');
    if (factionSys && state._secretaryFactionSilence >= 2) {
      this._addInspectionLog('warning', '派系观察',
        '书记系干部集体缄默，可能引起巡视组注意');
    }
  }

  /** 检查风险域 */
  _checkRiskAreas(state, weekNum) {
    state.riskAreas.forEach(area => {
      if (area.discovered >= area.severity) return; // 已全部发现

      // 每周随机发现进度
      const discoverRate = this._getDiscoverRate(state.team, area);
      const progress = Math.random() * discoverRate;
      area.discovered = Math.min(area.severity, area.discovered + progress);

      // 刚好发现临界问题→触发事件
      if (area.discovered >= area.severity * 0.8 && !area._alerted) {
        area._alerted = true;
        if (area.severity > 40) {
          // 严重问题被发现→触发紧急汇报或掩盖事件
          this._addInspectionLog('critical', '🚨 重大发现',
            `巡视组在${INSPECTION_RISK_AREAS[area.area]?.name || area.area}领域发现问题线索！`);
          eventBus.emit(EVENTS.UI_NOTIFICATION, {
            type: 'warning', title: '🚨 巡视重大发现',
            message: `巡视组在${INSPECTION_RISK_AREAS[area.area]?.name || area.area}领域发现${area.severity > 60 ? '严重' : '较重'}问题。`,
            persistent: true,
          });
        }
      }
    });
  }

  /** 随机巡视事件 */
  _generateRandomEvent(state, weekNum) {
    const events = INSPECTION_EVENTS;
    const evt = events[Math.floor(Math.random() * events.length)];
    if (!evt) return;

    this._addInspectionLog('info', '巡视事件', evt.description);

    // 有些事件提供玩家选项
    if (evt.hasChoice) {
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'inspection_event',
        title: evt.name,
        message: evt.description,
        choices: evt.choices || [],
        persistent: true,
        eventId: 'insp_evt_' + weekNum + '_' + Date.now(),
        callback: (choiceIndex) => {
          if (evt.effects && evt.effects[choiceIndex]) {
            evt.effects[choiceIndex](this, state);
          }
        },
      });
    }

    // 没有选择的事件自动产生效果
    if (evt.autoEffect) {
      evt.autoEffect(this, state);
    }
  }

  // ════════════════════════════════════════
  //  阶段3：问题反馈（1-2周）
  // ════════════════════════════════════════

  _advanceToFeedback(state) {
    this._setStatus(state, 'feedback');

    // 整理发现的问题
    const findings = this._compileFindings(state);

    // 反馈会议
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '📋 巡视反馈',
      message: `巡视组召开反馈会议。共发现${findings.generalCount}个一般性问题、${findings.seriousCount}个较重问题、${findings.criticalCount}个严重问题。反馈等级：${findings.feedbackLabel}。`,
      persistent: true,
    });
    this._addInspectionLog('critical', '巡视反馈',
      `巡视组反馈${findings.generalCount}/${findings.seriousCount}/${findings.criticalCount}项问题`);

    // 移交严重线索到腐败系统
    if (findings.criticalCount > 0) {
      const corruptionSys = this.engine?.getSystem?.('corruption');
      if (corruptionSys) {
        state.cluesTransferred += findings.criticalCount;
        this._transferToCorruptionSystem(state, findings);
        this._addInspectionLog('warning', '线索移交',
          `将${findings.criticalCount}条严重违纪线索移交纪委监委`);
      }
    }

    // 影响上级关系
    const feedbackScore = 100 - findings.totalSeverity * 0.3;
    this._modifySuperiorAttribute('impression', -((100 - feedbackScore) * 0.5));

    // 影响政治资本
    const player = stateManager.get('player');
    if (player) {
      const pcPenalty = findings.totalSeverity * 0.1;
      player.politicalCapital = Math.max(0, (player.politicalCapital || 20) - pcPenalty);
      this._addInspectionLog('info', '政治资本',
        `政治资本因巡视反馈减少${Math.round(pcPenalty)}点`);
    }

    // 影响县治理指标
    const county = stateManager.get('county');
    if (county?.institution) {
      county.institution.governanceIndex = Math.max(0,
        (county.institution.governanceIndex || 50) - findings.totalSeverity * 0.05);
    }

    // 影响考核（一票否决风险）
    if (findings.hasOneVoteVeto) {
      const evalSys = this.engine?.getSystem?.('evaluation');
      if (evalSys) {
        this._addInspectionLog('critical', '⚠️ 一票否决',
          '巡视发现重大问题，可能触发一票否决机制');
      }
    }

    // 反馈后玩家选择应对态度
    this._offerFeedbackResponse(state, findings);

    state.findings = findings.raw;
    state.feedback.received = true;
    state.feedback.meetingDate = timeSystem?.getTimeString?.() || '';
    state.feedback.criticizedCount = findings.criticizedOfficials.length;
    state.feedback.criticizedOfficials = findings.criticizedOfficials;

    // 触发叙事
    this._emitToNarrative('inspection_feedback', {
      generalCount: findings.generalCount,
      seriousCount: findings.seriousCount,
      criticalCount: findings.criticalCount,
      feedbackLevel: findings.feedbackLevel,
    });
  }

  /** 整理巡视发现 */
  _compileFindings(state) {
    // 遮挡率：消极应对降低有效发现
    const obstructionPenalty = state._obstructionLevel ? state._obstructionLevel * 0.15 : 0;
    // 协作奖励
    const cooperationBonus = state._cooperationBonus ? state._cooperationBonus * 0.1 : 0;

    const generalAreas = state.riskAreas.filter(r => {
      const effectiveDiscovered = r.discovered * (1 + cooperationBonus - obstructionPenalty);
      return effectiveDiscovered > 0 && r.severity < 30;
    });
    const seriousAreas = state.riskAreas.filter(r => {
      const effectiveDiscovered = r.discovered * (1 + cooperationBonus - obstructionPenalty);
      return effectiveDiscovered > 0 && r.severity >= 30 && r.severity < 60;
    });
    const criticalAreas = state.riskAreas.filter(r => {
      const effectiveDiscovered = r.discovered * (1 + cooperationBonus - obstructionPenalty);
      return effectiveDiscovered > 0 && r.severity >= 60;
    });

    const criticizedOfficials = [];

    // 从谈话中提取被点名干部
    state.interviews.forEach(intv => {
      if (intv.reportedContent.length > 0 && intv.reportedContent.some(c => c.severity > 30)) {
        criticizedOfficials.push(intv.officialId);
      }
    });

    const totalSeverity = state.riskAreas.reduce((s, r) => s + Math.min(r.discovered, r.severity), 0);
    const feedbackLevel = criticalAreas.length > 0 ? 'critical'
                         : seriousAreas.length > 0 ? 'serious' : 'general';

    const raw = {
      general: generalAreas.map(r => ({
        area: r.area,
        desc: INSPECTION_RISK_AREAS[r.area]?.name || r.area,
        severity: r.severity,
        discovered: r.discovered,
      })),
      serious: seriousAreas.map(r => ({
        area: r.area,
        desc: INSPECTION_RISK_AREAS[r.area]?.name || r.area,
        severity: r.severity,
        discovered: r.discovered,
      })),
      critical: criticalAreas.map(r => ({
        area: r.area,
        desc: INSPECTION_RISK_AREAS[r.area]?.name || r.area,
        severity: r.severity,
        discovered: r.discovered,
      })),
      recommendation: '',
      feedbackLevel: feedbackLevel,
      totalSeverity: totalSeverity,
    };

    return {
      generalCount: generalAreas.length,
      seriousCount: seriousAreas.length,
      criticalCount: criticalAreas.length,
      criticizedOfficials: criticizedOfficials,
      hasOneVoteVeto: criticalAreas.length > 2 || totalSeverity > 200,
      feedbackLevel: feedbackLevel,
      feedbackLabel: { general: '一般', serious: '较重', critical: '严重' }[feedbackLevel] || '一般',
      totalSeverity: totalSeverity,
      raw: raw,
    };
  }

  /** 反馈后玩家应对态度 */
  _offerFeedbackResponse(state, findings) {
    const responses = [
      {
        id: 'insp_accept',
        label: '✅ 诚恳接受',
        desc: '全盘接受巡视反馈意见。上级印象恢复加速，整改态度加分。',
        effect: 'accept',
      },
      {
        id: 'insp_explain',
        label: '📝 解释说明',
        desc: '对部分问题作出解释，争取降低反馈等级。若确有无辜可减少负面影响。',
        effect: 'explain',
      },
      {
        id: 'insp_downplay',
        label: '🙅 轻描淡写',
        desc: '试图淡化问题严重性。风险：巡视组可能认为态度不端正。',
        effect: 'downplay',
      },
    ];
    const self = this;
    this._showChoice(
      '📋 巡视反馈态度',
      `巡视组反馈等级：${findings.feedbackLabel}。请选择您的回应态度：`,
      [
        {
          id: 'insp_accept', label: '✅ 诚恳接受',
          desc: '全盘接受巡视反馈意见。上级印象恢复加速，整改态度加分。',
          _handler: function() {
            self._modifySuperiorAttribute('impression', 15);
            state._acceptanceBonus = 10;
            self._addInspectionLog('info', '反馈回应', '诚恳接受巡视反馈意见');
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'feedback_response', action: 'insp_accept', label: '诚恳接受' });
          },
        },
        {
          id: 'insp_explain', label: '📝 解释说明',
          desc: '对部分问题作出解释，争取降低反馈等级。若确有无辜可减少负面影响。',
          _handler: function() {
            if (findings.feedbackLevel === 'general') {
              self._modifySuperiorAttribute('impression', 5);
            } else if (Math.random() < 0.35) {
              self._modifySuperiorAttribute('impression', 10);
              self._addInspectionLog('info', '解释被接受', '部分解释说明被巡视组采纳');
            } else {
              self._modifySuperiorAttribute('impression', -5);
              self._addInspectionLog('warning', '解释被驳回', '解释说明未被巡视组采纳');
            }
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'feedback_response', action: 'insp_explain', label: '解释说明' });
          },
        },
        {
          id: 'insp_downplay', label: '🙅 轻描淡写',
          desc: '试图淡化问题严重性。风险：巡视组可能认为态度不端正。',
          _handler: function() {
            self._modifySuperiorAttribute('impression', -15);
            if (findings.feedbackLevel === 'critical') {
              self._addInspectionLog('critical', '⚠️ 态度问题', '在严重问题面前轻描淡写，巡视组极为不满');
            }
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'feedback_response', action: 'insp_downplay', label: '轻描淡写' });
          },
        },
      ],
      'insp_feedback'
    );
  }

  // ════════════════════════════════════════
  //  阶段4：整改落实（4-12周）
  // ════════════════════════════════════════

  _transitionToRectifying(state) {
    // 反馈阶段一般持续1周后自动进入整改
    const weeksInFeedback = this._getWeeksSince('feedback');
    if (weeksInFeedback < 1) return;

    this._setStatus(state, 'rectifying');

    // 生成整改清单
    state.rectification.items = this._generateRectificationItems(state);
    state.rectification.deadline = this._calculateRectificationDeadline();

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important', title: '📝 整改落实',
      message: `巡视整改工作正式启动。共${state.rectification.items.length}项整改任务，整改期限：${state.rectification.deadline}。请制定整改方案并逐项落实。`,
      persistent: true,
    });
    this._addInspectionLog('critical', '整改启动',
      `巡视整改开始，${state.rectification.items.length}项任务，期限${state.rectification.deadline}`);
  }

  _runRectificationPhase(state) {
    const weeksInRect = this._getWeeksSince('rectifying');

    // 检查是否超期
    const maxDuration = 12;
    if (weeksInRect >= maxDuration) {
      this._closeInspection(state);
      return;
    }

    // 每周自动推进少量进度（不弹窗）
    state.rectification.items.forEach(item => {
      if (!item.completed) {
        item.effortSpent += 1; // 每周自动推进1点
      }
    });

    // 每2周检查进度 + 弹出整改选项
    if (weeksInRect > 0 && weeksInRect % 2 === 0) {
      this._checkRectificationProgress(state);
    }

    // 整改期每2周提供一次操作机会
    if (weeksInRect === 0 || (weeksInRect > 0 && weeksInRect % 2 === 0)) {
      this._offerRectificationActions(state);
    }

    // 所有整改项完成→提前结束
    const allDone = state.rectification.items.every(i => i.completed);
    if (allDone && weeksInRect >= 4) {
      this._closeInspection(state);
    }
  }

  _offerRectificationActions(state) {
    const uniqueAreas = [...new Set(state.rectification.items.map(i => i.area))];

    const pendingItems = state.rectification.items.filter(i => !i.completed);
    if (pendingItems.length === 0) return;

    // 选一个未完成项，弹出投入精力/财政的选项
    const target = pendingItems[Math.floor(Math.random() * pendingItems.length)];
    const areaName = INSPECTION_RISK_AREAS[target.area]?.name || target.area;
    const pct = target.effortRequired > 0 ? Math.round(target.effortSpent / target.effortRequired * 100) : 0;

    const actions = [
      { id: 'rect_fast_' + target.id, label: '⚡ 加大整改力度', desc: `投入精力10点，快速推进"${areaName}"整改。`, effect: 'fast' },
      { id: 'rect_invest_' + target.id, label: '💰 投入专项资金', desc: `投入财政资金200万，聘请专家团队加速"${areaName}"整改。`, effect: 'invest' },
      { id: 'rect_normal_' + target.id, label: '📋 按部就班', desc: '常规推进，不额外投入资源。', effect: 'normal' },
    ];

    const self = this;
    this._showChoice(
      `🛠 整改推进：${areaName}（${pct}%）`,
      `"${areaName}"整改任务当前进度${pct}%，需要${target.effortRequired}点努力值。请选择推进方式：`,
      [
        {
          id: 'rect_fast_' + target.id, label: '⚡ 加大整改力度',
          desc: `投入精力10点，快速推进"${areaName}"整改。`,
          _handler: function() {
            const player = stateManager.get('player');
            if (!player || (player.status?.energy || 100) < 10) {
              eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', title: '⚠️ 精力不足', message: '精力不足，无法加大整改力度！' });
              return;
            }
            player.modifyStatus('energy', -10);
            target.effortSpent += 20;
            self._checkRectItemDone(target);
            self._addInspectionLog('info', '整改加速', `投入精力推进"${areaName}"整改`);
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'rectification', action: 'rect_fast_' + target.id, label: '加大整改力度' });
          },
        },
        {
          id: 'rect_invest_' + target.id, label: '💰 投入专项资金',
          desc: `投入财政资金200万，聘请专家团队加速"${areaName}"整改。`,
          _handler: function() {
            const finance = stateManager.get('finance');
            if (!finance || (finance.treasuryBalance || 0) < 200) {
              eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'warning', title: '⚠️ 资金不足', message: '财政资金不足，无法投入专项资金！' });
              return;
            }
            finance.treasuryBalance -= 200;
            target.effortSpent += 35;
            self._checkRectItemDone(target);
            self._addInspectionLog('info', '资金投入', `投入200万专项资金推进"${areaName}"整改`);
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'rectification', action: 'rect_invest_' + target.id, label: '投入专项资金' });
          },
        },
        {
          id: 'rect_normal_' + target.id, label: '📋 按部就班',
          desc: '常规推进，不额外投入资源。',
          _handler: function() {
            target.effortSpent += 8;
            self._checkRectItemDone(target);
            state.playerChoices.push({ week: Math.ceil(timeSystem.day / 7), phase: 'rectification', action: 'rect_normal_' + target.id, label: '按部就班' });
          },
        },
      ],
      'insp_rect_' + target.id
    );
  }

  /** 检查整改项是否完成 */
  _checkRectItemDone(target) {
    if (target.effortSpent >= target.effortRequired) {
      target.completed = true;
      target.result = 'resolved';
      const areaName = INSPECTION_RISK_AREAS[target.area]?.name || target.area;
      eventBus.emit(EVENTS.UI_NOTIFICATION, { type: 'success', title: '✅ 整改完成', message: `"${areaName}"整改任务已完成！` });
      this._addInspectionLog('info', '整改完成', `"${areaName}"整改任务已销号`);
    }
  }

  _checkRectificationProgress(state) {
    const completed = state.rectification.items.filter(i => i.completed).length;
    const total = state.rectification.items.length;
    const progress = total > 0 ? completed / total : 0;

    this._addInspectionLog('info', '整改进度',
      `已完成 ${completed}/${total}（${Math.round(progress * 100)}%）`);

    if (progress < 0.3) {
      // 进度落后→警告
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '⚠️ 整改滞后',
        message: `巡视整改进度严重滞后！已完成仅${Math.round(progress * 100)}%，务必加快。`,
        persistent: true,
      });
    }
  }

  /** 提交整改报告 */
  submitRectificationReport() {
    const state = stateManager.get('inspection');
    if (!state || state.status !== 'rectifying') return false;

    const completed = state.rectification.items.filter(i => i.completed).length;
    const total = state.rectification.items.length;
    const completionRate = total > 0 ? completed / total : 0;

    state.rectification.reportSubmitted = true;
    state.rectification.reportQuality = completionRate;

    // 验收结果
    if (completionRate >= 0.9) {
      state.rectification.inspectionResult = 'passed';
      this._modifySuperiorAttribute('impression', 20);
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'success', title: '✅ 巡视整改通过',
        message: '整改报告经巡视组审定，验收通过。上级印象提升。',
      });
    } else if (completionRate >= 0.6) {
      state.rectification.inspectionResult = 'conditional';
      this._modifySuperiorAttribute('impression', -5);
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'warning', title: '⚠️ 有条件通过',
        message: '整改验收有条件通过，仍需继续落实剩余整改任务。',
      });
    } else {
      state.rectification.inspectionResult = 'failed';
      this._modifySuperiorAttribute('impression', -30);
      this._modifySuperiorAttribute('trust', -20);
      eventBus.emit(EVENTS.UI_NOTIFICATION, {
        type: 'error', title: '❌ 整改未通过',
        message: '整改验收不合格，将影响年度考核和上级评价。',
        persistent: true,
      });
    }

    this._addInspectionLog('critical', '整改验收',
      `整改报告已提交，完成率${Math.round(completionRate * 100)}%，结果：${state.rectification.inspectionResult}`);

    return true;
  }

  /** UI快捷操作：巡视期快速调整应对策略 */
  handleQuickAction(action) {
    const state = stateManager.get('inspection');
    if (!state || state.status !== 'active') return;
    switch (action) {
      case 'cooperate':
        state._cooperationBonus = (state._cooperationBonus || 0) + 2;
        state._obstructionLevel = 0;
        this._addInspectionLog('info', '配合巡视', '通过UI面板选择配合巡视');
        break;
      case 'guide':
        state._cooperationBonus = (state._cooperationBonus || 0) + 1;
        state._obstructionLevel = 0;
        const safe = state.riskAreas.filter(r => r.severity < 30 && r.discovered < r.severity).sort(() => Math.random() - 0.5);
        if (safe.length > 0) {
          safe[0].discovered = safe[0].severity;
          this._addInspectionLog('info', '引导巡视', `主动暴露${INSPECTION_RISK_AREAS[safe[0].area]?.name || safe[0].area}领域问题`);
        }
        break;
      case 'obstruct':
        state._obstructionLevel = (state._obstructionLevel || 0) + 1;
        state._cooperationBonus = 0;
        this._addInspectionLog('warning', '消极应对', '通过UI面板选择消极应对');
        break;
      case 'meeting':
        const player = stateManager.get('player');
        if (player && (player.status?.energy || 100) >= 10) {
          player.modifyStatus('energy', -10);
          // 缓和与巡视组关系
          this._addInspectionLog('info', '应对会议', '召开应对会议，缓和巡视气氛');
          state._cooperationBonus = (state._cooperationBonus || 0) + 1;
        }
        break;
    }
  }

  /** UI整改单项操作 */
  handleRectItemAction(itemId, mode) {
    const state = stateManager.get('inspection');
    if (!state || state.status !== 'rectifying') return { error: '巡视未处于整改阶段' };
    const item = state.rectification.items.find(i => i.id === itemId);
    if (!item || item.completed) return { error: '整改项已完成或不存在' };
    const player = stateManager.get('player');
    const finance = stateManager.get('finance');
    switch (mode) {
      case 'fast':
        if (!player || (player.status?.energy || 100) < 10) return { error: '精力不足' };
        player.modifyStatus('energy', -10);
        item.effortSpent += 20;
        break;
      case 'invest':
        if (!finance || (finance.treasuryBalance || 0) < 200) return { error: '财政资金不足' };
        finance.treasuryBalance -= 200;
        item.effortSpent += 35;
        break;
      default: return { error: '未知操作' };
    }
    if (item.effortSpent >= item.effortRequired) {
      item.completed = true;
      item.result = 'resolved';
      const areaName = INSPECTION_RISK_AREAS[item.area]?.name || item.area;
      this._addInspectionLog('info', '整改完成', `"${areaName}"整改任务已销号`);
      return { message: `"${areaName}"整改完成` };
    }
    return { message: '推进中' };
  }

  // ════════════════════════════════════════
  //  巡视关闭
  // ════════════════════════════════════════

  _closeInspection(state) {
    this._setStatus(state, 'closed');
    state.rectification.completedWeek = Math.ceil(timeSystem.day / 7);

    // ——— 安排下一次巡视（1-2年后） ———
    this._scheduleNextInspection(state);

    // 恢复被临时调离的干部
    this._restoreTransferredOfficials();

    // 解除巡视抑制
    eventBus.emit(EVENTS.INSPECTION_ACTIVE, { active: false });

    // ——— 结果等级 → 实际后果 ———
    const resultKey = state.rectification.inspectionResult || 'none';
    const resultScores = {
      passed:       { finalLabel: '通过', impression: 25, trust: 15, pc: 10, eval: 5 },
      conditional:  { finalLabel: '有条件通过', impression: 0, trust: -5, pc: -5, eval: -5 },
      failed:       { finalLabel: '未通过', impression: -35, trust: -25, pc: -20, eval: -15 },
      none:         { finalLabel: '未正式验收', impression: -15, trust: -10, pc: -10, eval: -10 },
    };
    const sc = resultScores[resultKey] || resultScores.none;

    // 1. 上级印象 & 信任
    this._modifySuperiorAttribute('impression', sc.impression);
    this._modifySuperiorAttribute('trust', sc.trust);

    // 2. 政治资本
    const player = stateManager.get('player');
    if (player) {
      player.politicalCapital = Math.max(0, (player.politicalCapital || 20) + sc.pc);
      this._addInspectionLog('info', '政治资本',
        `巡视${sc.finalLabel}：政治资本${sc.pc >= 0 ? '+' : ''}${sc.pc}`);
    }

    // 3. 考核评分（通过evaluation系统）
    const evalSys = this.engine?.getSystem?.('evaluation');
    if (evalSys) {
      // 尝试注入考核扣分
      if (evalSys.applyInspectionResult) {
        evalSys.applyInspectionResult(sc.eval, state.cluesTransferred);
      } else {
        // 直接操作考核数据
        const evalData = stateManager.get('evaluation') || {};
        const oldScore = evalData.inspectionPenalty || 0;
        evalData.inspectionPenalty = Math.max(-30, oldScore + sc.eval);
        this._addInspectionLog('info', '考核影响',
          `巡视结果影响考核评分${sc.eval >= 0 ? '+' : ''}${sc.eval}`);
      }
    }

    // 4. 社会张力影响
    const county = stateManager.get('county');
    if (county) {
      // 巡视结果差→社会不满上升
      const tensionDelta = resultKey === 'failed' ? 5 : resultKey === 'conditional' ? 2 : -2;
      if (typeof county.modifyTension === 'function') {
        county.modifyTension(tensionDelta);
      } else {
        county.socialTension = (county.socialTension || 30) + tensionDelta;
      }
      this._addInspectionLog('info', '社会影响',
        `社会张力因巡视结果${tensionDelta >= 0 ? '上升' : '下降'}${Math.abs(tensionDelta)}点`);
    }

    // 5. 被点名干部的派系关系
    const factionSys = this.engine?.getSystem?.('factions');
    if (factionSys && state.feedback.criticizedOfficials?.length > 0) {
      state.feedback.criticizedOfficials.forEach(officialId => {
        this._addInspectionLog('warning', '干部影响',
          `受巡视点名影响，干部${officialId}未来晋升可能受阻`);
      });
    }

    const resultLabel = {
      passed: '通过',
      conditional: '有条件通过',
      failed: '未通过',
      none: '未正式验收',
    }[state.rectification.inspectionResult] || '结束';

    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'info', title: '🏁 巡视结束',
      message: `本次巡视工作全部结束。巡视结果：${resultLabel}。共访谈${state.totalInterviews}人次，发现线索${state.cluesDiscovered}条，移交${state.cluesTransferred}条。`,
      persistent: true,
    });
    this._addInspectionLog('info', '巡视结束',
      `巡视全流程结束，结果${resultLabel}`);

    this._emitToNarrative('inspection_closed', {
      result: state.rectification.inspectionResult,
      totalInterviews: state.totalInterviews,
      cluesDiscovered: state.cluesDiscovered,
    });
  }

  /** 安排下一次巡视（1-2年后） */
  _scheduleNextInspection(state) {
    const ts = timeSystem;
    if (!ts) return;
    // 清空旧状态以便复用
    state.schedule.triggered = false;
    state.schedule._rollDone = false;
    // 1-2年后
    const offset = 12 + Math.floor(Math.random() * 12); // 12-24个月后
    const totalMonths = ts.year * 12 + (ts.month || 1) + offset;
    state.schedule.nextYear = Math.floor(totalMonths / 12);
    state.schedule.nextMonth = totalMonths % 12 || 12;
    this._addInspectionLog('info', '巡视安排',
      `下次巡视预计在${state.schedule.nextYear}年${state.schedule.nextMonth}月前后`);
  }

  // ════════════════════════════════════════
  //  耦合：腐败系统
  // ════════════════════════════════════════

  /** 移交线索到腐败系统 */
  _transferToCorruptionSystem(state, findings) {
    const corruptionSys = this.engine?.getSystem?.('corruption');
    if (!corruptionSys) return;

    // 对每个严重线索，触发腐败系统的调查启动
    state.riskAreas.forEach(area => {
      if (area.discovered > 0 && area.severity >= 60) {
        // 触发腐败系统调查
        if (corruptionSys.receiveInspectionClue) {
          corruptionSys.receiveInspectionClue({
            source: '巡视巡查',
            area: area.area,
            severity: area.severity,
            description: `巡视组发现${INSPECTION_RISK_AREAS[area.area]?.name || area.area}领域问题线索`,
          });
        }

        // 对相关官员记入反腐败调查
        state.riskAreas.forEach(r => {
          if (r.discovered >= r.severity * 0.8) {
            state.officialsPunished++;
          }
        });
      }
    });
  }

  // ════════════════════════════════════════
  //  辅助方法
  // ════════════════════════════════════════

  /** 生成巡视组信息 */
  _generateInspectionTeam() {
    const styleKeys = Object.keys(INSPECTION_STYLES);
    const style = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    const styleDef = INSPECTION_STYLES[style];
    const focusCount = 2 + Math.floor(Math.random() * 2);
    const allAreas = Object.keys(INSPECTION_RISK_AREAS);
    const focus = [];
    const shuffledAreas = [...allAreas].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(focusCount, shuffledAreas.length); i++) {
      focus.push(shuffledAreas[i]);
    }

    return {
      leader: INSPECTION_LEADERS[Math.floor(Math.random() * INSPECTION_LEADERS.length)],
      style: style,
      styleName: styleDef.name,
      focus: focus,
      members: ['张副组长', '李主任', '王科员', '刘审计', '赵纪检'],
    };
  }

  /** 生成风险域 */
  _generateRiskAreas() {
    const areas = Object.keys(INSPECTION_RISK_AREAS);
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');

    return areas.map(area => {
      // 基础严重程度
      let severity = 10 + Math.floor(Math.random() * 40);

      // 基于游戏状态调整严重程度
      switch (area) {
        case 'finance':
          if (finance?.hiddenDebt > 30000) severity += 30;
          if (finance?.irregularExpenditure > 5000) severity += 20;
          break;
        case 'project':
          if (county?.economy?.irregularProjects > 5) severity += 25;
          break;
        case 'land':
          if (county?.economy?.illegalLandTransfer) severity += 30;
          break;
        case 'personnel':
          const corrSys = this.engine?.getSystem?.('corruption');
          if (corrSys) severity += 10; // 基础腐败加成
          break;
        case 'partyBuilding':
          // 党建领域基础较低
          severity = Math.max(5, severity - 10);
          break;
        case 'environment':
          if (county?.economy?.pollutionIndex > 60) severity += 20;
          break;
        case 'safety':
          // 安全领域 - 基于社会系统
          if (county?.socialTension > 60) severity += 15;
          break;
        case 'poverty':
          // 扶贫领域
          break;
      }

      // 限制在5-95之间
      severity = Math.max(5, Math.min(95, severity));

      return {
        area: area,
        severity: severity,
        discovered: 0,
        reported: false,
        _coverUp: 0,
        _alerted: false,
      };
    });
  }

  /** 获取高风险干部（存在潜在问题的） */
  _getHighRiskOfficials(state) {
    const personnelSys = this.engine?.getSystem?.('personnel');
    if (!personnelSys) return [];

    const allOfficials = personnelSys.getCommitteeMembers?.() || [];
    return allOfficials.filter(o => {
      // 处于敏感岗位或与高风险领域相关的
      const riskyPositions = ['财政局长', '自然资源局长', '住建局长', '交通局长', '发改委主任'];
      return riskyPositions.some(p => (o.position || '').includes(p));
    });
  }

  /** 计算谈话对象诚实度 */
  _calculateHonesty(official, state) {
    // 基础诚实度
    let honesty = official.integrity ?? official.abilities?.integrity ?? 50;

    // 对己方派系干部更配合巡视（诚实度高）
    if (official.faction === 'none') honesty += 10;

    // 对书记系干部更可能隐瞒
    if (official.faction === 'secretary') honesty -= 10;

    // 害怕被报复→降低诚实度
    if (state.riskAreas.some(r => r._coverUp > 0)) honesty -= 10;

    // 随机因子
    honesty += (Math.random() - 0.5) * 20;

    return Math.max(10, Math.min(100, honesty));
  }

  /** 计算谈话对象是否会如实报告 */
  _calculateWillReport(official, state) {
    // 基础意愿
    let will = 50;

    // 诚实度高→更愿意报告
    if (official.integrity && official.integrity > 60) will += 15;
    if (official.abilities?.integrity > 60) will += 15;

    // 对书记系干部报告意愿低
    if (official.faction === 'secretary') will -= 15;

    // 非派系干部更中立
    if (official.faction === 'none') will += 10;

    // 随机
    will += (Math.random() - 0.5) * 30;

    return Math.max(10, Math.min(100, will));
  }

  /** 生成谈话线索 */
  _generateClue(official, state) {
    // 该干部可能提及的问题
    const riskyAreas = state.riskAreas.filter(r => r.severity > 20 && r.discovered < r.severity);
    if (riskyAreas.length === 0) return null;

    const area = riskyAreas[Math.floor(Math.random() * riskyAreas.length)];
    const severity = Math.min(area.severity * (0.3 + Math.random() * 0.5), 90);

    return {
      area: area.area,
      severity: Math.round(severity),
      description: `${official.name}反映：${INSPECTION_RISK_AREAS[area.area]?.clues?.[Math.floor(Math.random() * (INSPECTION_RISK_AREAS[area.area]?.clues?.length || 1))] || '存在可疑情况'}`,
      source: official.name,
    };
  }

  /** 获取巡视组关注领域描述 */
  _getFocusDescriptions(focusAreas) {
    if (!focusAreas || focusAreas.length === 0) return '全面';
    return focusAreas.map(a => INSPECTION_RISK_AREAS[a]?.name || a).join('、');
  }

  /** 获取组长风格描述 */
  _getStyleDescription(state) {
    if (!state.team?.style) return '常规巡视';
    const style = INSPECTION_STYLES[state.team.style];
    return style ? `${style.name}：${style.desc}（持续时间${style.duration}周，发现问题${Math.round(style.discoverMod * 100)}%）` : '常规巡视';
  }

  /** 获取风险领域来源说明 */
  _getRiskAreaSource(area, state) {
    const county = stateManager.get('county');
    const finance = stateManager.get('finance');
    const sources = [];
    switch (area) {
      case 'finance':
        sources.push('基础风险：随机');
        if (finance?.hiddenDebt > 30000) sources.push('隐藏债务偏高：+' + Math.round((finance.hiddenDebt - 30000) / 1000) + '%');
        if (finance?.irregularExpenditure > 5000) sources.push('违规支出：+' + Math.round(finance.irregularExpenditure / 500) + '%');
        break;
      case 'project':
        if (county?.economy?.irregularProjects > 5) sources.push('违规项目数：+' + (county.economy.irregularProjects - 5) * 5 + '%');
        break;
      case 'land':
        if (county?.economy?.illegalLandTransfer) sources.push('违法土地转让：+30%');
        break;
      case 'personnel':
        sources.push('基础风险：随机');
        break;
      case 'environment':
        if (county?.economy?.pollutionIndex > 60) sources.push('污染指数偏高：+' + Math.round((county.economy.pollutionIndex - 60) / 3) + '%');
        break;
      case 'safety':
        if (county?.socialTension > 60) sources.push('社会张力高：+' + Math.round((county.socialTension - 60) / 4) + '%');
        break;
      default:
        sources.push('基础风险：随机');
    }
    if (sources.length === 0) sources.push('基础风险值');
    return sources.join('；');
  }

  /** 获取发现概率（基于巡视风格和风险域） */
  _getDiscoverRate(team, area) {
    const baseRate = team?.style === 'aggressive' ? 0.25
                   : team?.style === 'thorough' ? 0.20
                   : team?.style === 'standard' ? 0.15
                   : team?.style === 'routine' ? 0.10 : 0.15;

    const focusBonus = team?.focus?.includes(area.area) ? 0.15 : 0;
    const coverUpPenalty = area._coverUp > 0 ? -0.1 * area._coverUp : 0;

    return Math.max(0.05, baseRate + focusBonus + coverUpPenalty);
  }

  /** 生成整改项目 */
  _generateRectificationItems(state) {
    const items = [];
    state.riskAreas.forEach(area => {
      if (area.discovered > 0 && area.severity > 10) {
        items.push({
          id: 'rect_' + area.area + '_' + Date.now(),
          area: area.area,
          desc: `整改${INSPECTION_RISK_AREAS[area.area]?.name || area.area}领域问题`,
          deadline: this._calculateRectificationDeadline(),
          completed: false,
          effortSpent: 0,
          effortRequired: Math.round(area.severity * 0.3 + 5),
          result: 'pending',
        });
      }
    });
    return items;
  }

  /** 推进整改项（被UI回调） */
  advanceRectification(itemId, effortPoints) {
    const state = stateManager.get('inspection');
    if (!state) return false;

    const item = state.rectification.items.find(i => i.id === itemId);
    if (!item || item.completed) return false;

    item.effortSpent += effortPoints;
    if (item.effortSpent >= item.effortRequired) {
      item.completed = true;
      item.result = 'resolved';
      this._addInspectionLog('info', '整改完成',
        `${item.desc} 已完成`);
    }
    return true;
  }

  /** 计算整改期限 */
  _calculateRectificationDeadline() {
    if (!timeSystem) return '3个月后';
    const m = timeSystem.month + 3;
    const y = timeSystem.year + Math.floor((m - 1) / 12);
    return `${y}年${((m - 1) % 12) + 1}月`;
  }

  /** 阶段转换：准备→进驻 */
  _advanceToActive(state) {
    this._setStatus(state, 'active');
  }

  /** 设置状态（自动记录阶段起始周） */
  _setStatus(state, newStatus) {
    state.status = newStatus;
    state._phaseStartWeek = this.engine?.turnCount || 0;
  }

  /** 计算某阶段已持续周数 */
  _getWeeksSince(statusFrom) {
    const state = stateManager.get('inspection');
    if (!state || !state._phaseStartWeek) return 0;
    const currentWeek = this.engine?.turnCount || 0;
    const elapsed = currentWeek - state._phaseStartWeek;
    return Math.max(0, Math.floor(elapsed));
  }

  /** 获取上级印象值 */
  _getSuperiorTrust() {
    return stateManager.get('player')?.relations?.citySecretary || 50;
  }

  /** 获取腐败指数 */
  _getCountyCorruptionIndex() {
    return stateManager.get('county')?.institution?.corruptionIndex || 10;
  }

  /** 修改上级关系属性 */
  _modifySuperiorAttribute(attr, delta) {
    const superiorSys = this.engine?.getSystem?.('superiorRelations');
    if (superiorSys) {
      // 调用上级关系系统的接口
      const sr = stateManager.get('superiorRelations');
      if (sr?.cityLevel?.secretary) {
        sr.cityLevel.secretary[attr] = (sr.cityLevel.secretary[attr] || 50) + delta;
        if (sr.cityLevel.secretary[attr] < 0) sr.cityLevel.secretary[attr] = 0;
        if (sr.cityLevel.secretary[attr] > 100) sr.cityLevel.secretary[attr] = 100;
      }
    }
  }

  /** 恢复临时调离干部 */
  _restoreTransferredOfficials() {
    // 通过人事系统恢复被标记为临时调离的干部
    const personnelSys = this.engine?.getSystem?.('personnel');
    if (!personnelSys) return;

    const allOfficials = personnelSys.getCommitteeMembers?.() || [];
    allOfficials.forEach(o => {
      if (o._temporaryTransfer) {
        o._temporaryTransfer = false;
        o._transferUntil = undefined;
      }
    });
  }

  /** 添加巡视日志 */
  _addInspectionLog(level, title, message) {
    const logs = stateManager.get('events')?.logs || [];
    logs.push({
      time: timeSystem?.getTimeString?.() || '未知时间',
      type: 'inspection',
      level: level,
      title: title,
      message: message,
    });
    if (!stateManager.get('events')) {
      stateManager.set('events', { logs: logs.slice(-200) });
    }
  }

  /** 触发叙事系统 */
  _emitToNarrative(eventType, data) {
    try {
      eventBus.emit('narrative_event', {
        source: 'inspection',
        type: eventType,
        data: data,
      });
    } catch(e) {
      // 叙事系统不存在也可以正常运行
    }
  }

  // ════════════════════════════════════════
  //  公共API（被UI/其他系统调用）
  // ════════════════════════════════════════

  /** 获取巡视状态摘要（给UI用） */
  getStatusSummary() {
    const state = stateManager.get('inspection');
    if (!state) return null;

    const statusLabels = {
      none: '未启动',
      notified: '准备进驻',
      active: '巡视进驻中',
      feedback: '反馈阶段',
      rectifying: '整改落实中',
      closed: '已结束',
    };

    const result = {
      status: state.status,
      statusLabel: statusLabels[state.status] || '未知',
      statusBadge: this._getStatusBadge(state.status),
      schedule: state.schedule,
      team: state.team,
      riskAreas: state.riskAreas,
      findings: state.findings,
      rectification: state.rectification,
      stats: {
        totalInterviews: state.totalInterviews,
        cluesDiscovered: state.cluesDiscovered,
        cluesTransferred: state.cluesTransferred,
        officialsPunished: state.officialsPunished,
      },
      hasActiveInspection: ['active', 'feedback', 'rectifying'].includes(state.status),
    };

    return result;
  }

  /** 获取巡视Badge样式 */
  _getStatusBadge(status) {
    const badges = {
      none: { color: '#9ca3af', label: '⚪' },
      notified: { color: '#f59e0b', label: '🟡' },
      active: { color: '#ef4444', label: '🔴' },
      feedback: { color: '#ef4444', label: '🔴' },
      rectifying: { color: '#f97316', label: '🟠' },
      closed: { color: '#22c55e', label: '🟢' },
    };
    return badges[status] || badges.none;
  }

  /** 是否正在进行巡视 */
  hasActiveInspection() {
    const state = stateManager.get('inspection');
    return state && ['active', 'feedback', 'rectifying'].includes(state.status);
  }

  /** 序列化（存档用） */
  toJSON() {
    return {
      state: this.state,
    };
  }

  /** 反序列化（读档用） */
  fromJSON(data) {
    if (data?.state) {
      this.state = data.state;
      stateManager.set('inspection', this.state);
    }
  }
}

// ════════════════════════════════════════
//  常量定义
// ════════════════════════════════════════

/** 巡视组长名库 */
const INSPECTION_LEADERS = [
  '王志刚', '刘建国', '张维明', '陈志平',
  '赵建东', '李永强', '孙德胜', '周卫华',
];

/** 巡视组风格 */
const INSPECTION_STYLES = {
  aggressive:  { name: '雷霆手段', duration: 3, desc: '高效迅猛，不留情面', discoverMod: 1.5 },
  thorough:    { name: '深挖细查', duration: 5, desc: '不放过任何细节', discoverMod: 1.3 },
  standard:    { name: '常规巡视', duration: 4, desc: '按章办事', discoverMod: 1.0 },
  routine:     { name: '例行公事', duration: 3, desc: '走走过场', discoverMod: 0.7 },
};

/** 巡视风险领域 */
const INSPECTION_RISK_AREAS = {
  finance: {
    name: '财政资金',
    clues: ['专项资金被挪用', '预算外支出异常', '存在套取资金嫌疑', '财务账目不清'],
  },
  project: {
    name: '工程建设',
    clues: ['项目招投标不规范', '工程款支付异常', '存在挂靠转包', '验收走过场'],
  },
  land: {
    name: '土地出让',
    clues: ['土地低价出让嫌疑', '违规改变土地用途', '征地补偿安置不到位'],
  },
  personnel: {
    name: '选人用人',
    clues: ['存在带病提拔', '违规进人', '人事档案造假', '跑官要官现象'],
  },
  partyBuilding: {
    name: '党的建设',
    clues: ['民主生活会流于形式', '基层组织软弱涣散', '意识形态工作薄弱'],
  },
  environment: {
    name: '生态环保',
    clues: ['污染企业未整改', '环保数据造假', '生态破坏严重'],
  },
  safety: {
    name: '安全生产',
    clues: ['安全隐患长期未整改', '事故瞒报', '安全监管形同虚设'],
  },
  poverty: {
    name: '乡村振兴',
    clues: ['扶贫资金被截留', '项目效益低下', '脱贫数据不实'],
  },
};

/** 巡视期间随机事件库 */
const INSPECTION_EVENTS = [
  { name: '举报信', description: '巡视组收到一封匿名举报信，涉及一名副县长。', hasChoice: true,
    choices: [{ label: '正常处理', desc: '配合调查' }, { label: '尝试拦截', desc: '风险高' }],
    effects: [
      (self, state) => { self._addInspectionLog('warning', '举报信', '正常处理，配合调查'); },
      (self, state) => { self._addInspectionLog('critical', '举报信', '试图拦截举报信，风险增加'); },
    ] },
  { name: '上访者', description: '巡视组驻地外出现上访群众。', hasChoice: true,
    choices: [{ label: '接访处理', desc: '安抚情绪' }, { label: '疏导离开', desc: '避免影响巡视' }],
    effects: [
      (self, state) => { self._addInspectionLog('info', '上访者', '安排接访'); },
      (self, state) => { self._addInspectionLog('warning', '上访者', '劝离上访者'); },
    ] },
  { name: '干部恐慌', description: '部分干部因巡视组入住而表现得心神不宁。', hasChoice: false,
    autoEffect: (self, state) => { } },
  { name: '突击检查', description: '巡视组临时决定前往某乡镇检查。', hasChoice: false,
    autoEffect: (self, state) => {
      const area = state.riskAreas[Math.floor(Math.random() * state.riskAreas.length)];
      if (area) { area.discovered = Math.min(area.severity, area.discovered + 10);
        self._addInspectionLog('warning', '突击检查', `巡视组检查了${INSPECTION_RISK_AREAS[area.area]?.name || area.area}领域`); }
    } },
  { name: '派系告密', description: '有干部私下向巡视组反映情况，疑似派系倾轧。', hasChoice: false,
    autoEffect: (self, state) => { } },
];
