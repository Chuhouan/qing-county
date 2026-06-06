/**
 * NarrativeSystem - 叙事系统主控制器
 * 管理叙事记忆、剧情线引擎和结局生成器的协调工作
 *
 * 职责:
 *   1. 初始化并协调子组件(NarrativeMemory, PlotlineEngine, EpilogueGenerator)
 *   2. 管理5年叙事节奏（引入→上升→高潮预备→高潮→结局）
 *   3. 生成叙事简报,提供政治气候的文本描述
 *   4. 提供NPC回忆机制
 *   5. 为存档/读档提供序列化接口
 */
class NarrativeSystem {
  constructor() {
    this.memory = null;
    this.plotlines = null;
    this.epilogue = null;
    this.engine = null;
    this._currentPhase = 'introduction';
    this._lastPhaseCheck = 0;
    this._narrativeBrief = '';
  }

  init(config) {
    // 初始化子组件
    this.memory = new NarrativeMemory();
    this.memory.init();

    this.plotlines = new PlotlineEngine();
    this.plotlines.engine = this.engine || gameEngine;
    this.plotlines.init();

    this.epilogue = new EpilogueGenerator();
    this.epilogue.engine = this.engine || gameEngine;
    this.epilogue.init();

    // 注册到StateManager
    if (!stateManager.has('narrative')) {
      stateManager.register('narrative', {
        memories: [],
        plotlines: {},
        currentPhase: 'introduction',
        phaseChanged: false,
        _pendingPlotlineEvent: null,
      });
    } else {
      const state = stateManager.get('narrative');
      state.currentPhase = this._currentPhase;
      state.phaseChanged = false;
      state._pendingPlotlineEvent = null;
    }

    // 设置监听
    this._setupListeners();

    console.log('[NarrativeSystem] 叙事系统初始化完成');
  }

  /** 设置事件监听 */
  _setupListeners() {
    // 在当务之急解决后检查是否有plotlineImpact
    eventBus.on(EVENTS.UI_NOTIFICATION, (data) => {
      if (data.type === 'important' && data.title && data.title.indexOf('当务之急决策') !== -1) {
        // 当务之急解决后,检查是否对剧情线有影响
        this._checkMatterPlotlineImpact(data);
      }
    });
  }

  /**
   * 每周更新 —— 由GameEngine调用
   */
  weeklyUpdate() {
    if (!this.plotlines) return;

    // 1. 推进剧情线
    this.plotlines.tick();

    // 2. 检查叙事阶段变化（每季度检查一次）
    this._checkPhaseChange();

    // 3. 生成叙事简报（每月度一次）
    if (timeSystem && timeSystem.month % 3 === 1) {
      this._narrativeBrief = this.generateNarrativeBrief();
    }
  }

  /**
   * 年度更新 —— 由GameEngine调用
   */
  yearlyUpdate() {
    if (this.plotlines) {
      this.plotlines.yearlyCheck();
    }
  }

  // ==================== 叙事阶段管理 ====================

  /**
   * 5年叙事节奏:
   * Y1: introduction - 建立世界观,激活剧情线1和3
   * Y2: rising - 剧情线2(腐败)激活,剧情线1白热化,剧情线4(发展)产生结果
   * Y3: climax_prep - 剧情线5(接班人)引入,所有剧情线进入关键节点
   * Y4: climax - 各剧情线高潮
   * Y5: resolution - 结局方向确定,各剧情线收尾
   */
  getCurrentNarrativePhase() {
    return this._currentPhase;
  }

  _checkPhaseChange() {
    const termYear = timeSystem ? timeSystem.termYear : 1;
    let newPhase = this._currentPhase;

    switch (termYear) {
      case 1: newPhase = 'introduction'; break;
      case 2: newPhase = 'rising'; break;
      case 3: newPhase = 'climax_prep'; break;
      case 4: newPhase = 'climax'; break;
      case 5: newPhase = 'resolution'; break;
      default: newPhase = 'resolution';
    }

    if (newPhase !== this._currentPhase) {
      const oldPhase = this._currentPhase;
      this._currentPhase = newPhase;

      // 通知阶段变化
      const narrativeState = stateManager.get('narrative');
      if (narrativeState) {
        narrativeState.currentPhase = newPhase;
        narrativeState.phaseChanged = true;
      }

      this._onPhaseChange(oldPhase, newPhase);
    }
  }

  /** 叙事阶段变化时的处理 */
  _onPhaseChange(oldPhase, newPhase) {
    const phaseNames = {
      introduction: '第一年: 新官上任',
      rising: '第二年: 权力代价',
      climax_prep: '第三年: 暗流涌动',
      climax: '第四年: 清算与抉择',
      resolution: '第五年: 尘埃落定',
    };

    const phaseDesc = {
      introduction: '您刚刚就任。熟悉环境,认识各派系干部,选择治理路线。这是奠定基础的一年。',
      rising: '您的决策开始产生后果。派系开始站队,腐败线索浮出水面。权力的代价逐渐显现。',
      climax_prep: '原有矛盾激化,新变量出现。各派系开始为换届布局。这是决定最终走向的关键时期。',
      climax: '腐败案收网、权力对决、发展路线定论。所有积累的矛盾集中爆发。',
      resolution: '收拾残局,安排后事,等待组织决定。您的政治遗产即将接受最终评价。',
    };

    // 发送通知
    eventBus.emit(EVENTS.UI_NOTIFICATION, {
      type: 'important',
      title: '📜 叙事阶段: ' + (phaseNames[newPhase] || newPhase),
      message: phaseDesc[newPhase] || '',
      persistent: true,
    });

    if (typeof uiManager !== 'undefined') {
      uiManager._addEventLog('important', '叙事', '进入新阶段: ' + (phaseNames[newPhase] || newPhase));
    }

    console.log('[NarrativeSystem] 阶段变化: ' + oldPhase + ' → ' + newPhase);
  }

  // ==================== 叙事简报 ====================

  /**
   * 生成叙事简报——描述当前政治气候的一段话
   */
  generateNarrativeBrief() {
    const county = stateManager.get('county');
    const player = stateManager.get('player');
    if (!county || !player) return '';

    const phase = this._currentPhase;
    const tension = county.socialTension || 0;
    const ecoVital = county.economy ? county.economy.economicVitality : 50;
    const superior = county.superiorTrust ? county.superiorTrust.citySecretary : 50;

    const briefs = [];

    // 总体基调
    briefs.push(this._getPhaseBrief(phase));

    // 社会状况
    if (tension > 70) briefs.push('社会张力居高不下,维稳形势严峻。');
    else if (tension > 50) briefs.push('社会面存在一些不稳定因素,需要密切关注。');
    else if (tension < 25) briefs.push('社会大局平稳,百姓安居乐业。');

    // 经济状况
    if (ecoVital > 70) briefs.push('经济活力充沛,各项指标向好。');
    else if (ecoVital < 30) briefs.push('经济形势不容乐观,需要找到新的增长点。');

    // 上级评价
    if (superior > 70) briefs.push('上级对您的工作高度认可。');
    else if (superior < 30) briefs.push('上级对您的表现有所保留。');

    // 剧情线简述
    const activePlotlines = this.plotlines.getActivePlotlines();
    if (activePlotlines.length > 0) {
      const names = activePlotlines.map(p => p.name).join(', ');
      briefs.push('政治暗流正在涌动: ' + names + '。');
    }

    // 活跃的当务之急
    const taskSys = this.engine ? this.engine.getSystem('tasks') : null;
    const activeMatters = taskSys ? taskSys.getActiveMatters() : [];
    if (activeMatters.length > 0) {
      briefs.push('手头有' + activeMatters.length + '件当务之急需要处理。');
    }

    return briefs.join(' ');
  }

  /** 获取各阶段的基调描述 */
  _getPhaseBrief(phase) {
    const briefs = {
      introduction: '您就任县委书记的第一年。各派系正在试探您的底牌。',
      rising: '您已站稳脚跟,但决策的后果逐渐显现。有人开始对您不满,也有人更紧密地团结在您周围。',
      climax_prep: '任期过半。旧账开始清算,新人开始布局。这是暴风雨前的宁静。',
      climax: '所有矛盾集中爆发。您的每一个决定都将影响最终走向。',
      resolution: '五年将至。收拾残局,安排后事。历史将如何评价您的执政?',
    };
    return briefs[phase] || '';
  }

  // ==================== NPC回忆机制 ====================

  /**
   * 生成NPC对过去决策的引用文本
   * 供AISecretary或UI调用
   */
  generateNpcRecall(npcId) {
    if (!this.memory) return null;

    const lastDecision = this.memory.getLastDecisionAbout(npcId);
    if (!lastDecision) return null;

    // 获取NPC名称
    const personnelSys = this.engine ? this.engine.getSystem('personnel') : null;
    const npc = personnelSys ? personnelSys.get(npcId) : null;
    const npcName = npc ? npc.name : '这位干部';

    const recallTemplates = [
      npcName + '似乎还记得您在' + lastDecision.getTimeLabel() + '做出的"' + lastDecision.title + '"决定。',
      '那次关于"' + lastDecision.title + '"的决策,在' + npcName + '心中留下了深刻印象。',
      '有消息称,' + npcName + '私下里还提到您在' + lastDecision.getTimeLabel() + '的"' + lastDecision.title + '"处理方式。',
      '您和' + npcName + '的关系中,最关键的节点是' + lastDecision.getTimeLabel() + '的"' + lastDecision.title + '"事件。',
    ];

    return recallTemplates[Math.floor(Math.random() * recallTemplates.length)];
  }

  /**
   * 生成政治局势摘要
   */
  describeCurrentSituation() {
    const plots = this.plotlines.getActivePlotlines();
    if (plots.length === 0) {
      return '目前政治格局相对平静,未有明显的权力博弈。';
    }

    const descriptions = plots.map(p => {
      const def = PLOTLINE_DEFS ? PLOTLINE_DEFS[p.id] : null;
      return def ? def.description : p.name;
    });

    return descriptions.join(' ');
  }

  // ==================== 当务之急剧情线影响 ====================

  /**
   * 当务之急解决后检查是否有剧情线影响
   */
  _checkMatterPlotlineImpact(data) {
    // 这个功能需要当务之急的选项包含 plotlineImpact 字段
    // 在 TaskSystem.resolveMatter() 中,如果有 plotlineImpact,会调用这里
    // 具体集成在 TaskSystem 的修改中
  }

  /**
   * 应用一个剧情线影响决策
   * 由 TaskSystem 在当务之急解决时调用
   */
  applyPlotlineImpact(impactData) {
    if (!impactData || !impactData.plotlineId) return;

    const plotline = this.plotlines.getPlotline(impactData.plotlineId);
    if (!plotline || plotline.isResolved()) return;

    // 定义剧情线ID到可用分支ID的映射
    const branchMap = {
      plot_power_struggle: {
        push_to_cooperation: 'branch_cooperation',
        push_to_confrontation: 'branch_confrontation',
        push_to_vacuum: 'branch_vacuum',
      },
      plot_corruption_web: {
        push_to_clean: 'branch_clean',
        push_to_selective: 'branch_selective',
        push_to_protective: 'branch_protective',
      },
      plot_local_vs_appointed: {
        push_to_local: 'branch_decentralize',
        push_to_appointed: 'branch_centralize',
        push_to_balance: 'branch_balance',
      },
      plot_development_path: {
        push_to_industrial: 'branch_industrial',
        push_to_livelihood: 'branch_livelihood',
        push_to_ecology: 'branch_ecology',
        push_to_reform: 'branch_reform',
      },
      plot_succession_crisis: {
        push_to_cultivate: 'branch_cultivate',
        push_to_balance: 'branch_balance',
        push_to_ignore: 'branch_ignore',
      },
    };

    // 查找分支映射
    const plotlineBranches = branchMap[impactData.plotlineId];
    if (plotlineBranches) {
      const targetBranch = plotlineBranches[impactData.effect];
      if (targetBranch) {
        plotline.activeBranch = targetBranch;
      }
    }

    // 通用推进
    const effect = impactData.effect;
    if (effect.indexOf('push_to') !== -1) {
      // 分支方向型推进
      const branchNames = {
        branch_cooperation: '玩家选择合作方向', branch_confrontation: '玩家选择对抗方向', branch_vacuum: '权力真空',
        branch_clean: '选择清廉路线', branch_selective: '选择选择性反腐', branch_protective: '选择保护伞',
        branch_decentralize: '支持本土系', branch_centralize: '支持空降系', branch_balance: '维持平衡',
        branch_industrial: '工业强县', branch_livelihood: '民生为本', branch_ecology: '生态立县', branch_reform: '改革先锋',
        branch_cultivate: '培养接班人', branch_ignore: '不刻意培养',
      };
      const branchName = branchNames[plotline.activeBranch] || '关键选择';

      plotline.advance({
        progressDelta: impactData.delta || 10,
        type: 'branch',
        title: branchName,
        description: impactData.reason || '',
      });

      // 记录到叙事记忆
      if (this.memory) {
        this.memory.record({
          category: 'plotline_branch',
          type: 'plotline_decision',
          title: plotline.name + ': ' + branchName,
          description: impactData.reason || '',
          tags: ['plotline', impactData.plotlineId, plotline.activeBranch],
          plotlineId: impactData.plotlineId,
          plotlineEffect: impactData.effect,
          severity: 3,
        });
      }
    } else {
      // 普通进度推进
      plotline.advance({
        progressDelta: impactData.delta || 8,
        type: 'progress',
        title: impactData.reason || '剧情推进',
        description: '',
      });
    }
  }

  // ==================== 结局相关 ====================

  /**
   * 生成结局数据（由GameEngine在游戏结束时调用）
   */
  generateEpilogue() {
    if (this.epilogue) {
      return this.epilogue.generate();
    }
    return null;
  }

  // ==================== 序列化 ====================

  /**
   * 获取叙事简报（供UI使用）
   */
  getNarrativeBrief() {
    return this._narrativeBrief;
  }

  /**
   * 获取待处理的剧情线事件
   */
  getPendingPlotlineEvent() {
    return this.plotlines ? this.plotlines.getPendingPlotlineEvent() : null;
  }

  /**
   * 标记剧情线事件已处理
   */
  acknowledgePlotlineEvent() {
    if (this.plotlines) {
      this.plotlines.acknowledgePlotlineEvent();
    }
  }

  serialize() {
    return {
      memories: this.memory ? this.memory.serialize() : { memories: [] },
      plotlines: this.plotlines ? this.plotlines._serializeAll() : {},
      currentPhase: this._currentPhase,
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.memories && this.memory) {
      this.memory.deserialize(data.memories);
    }
    if (data.plotlines && this.plotlines) {
      this.plotlines.deserialize(data.plotlines);
    }
    if (data.currentPhase) {
      this._currentPhase = data.currentPhase;
    }
  }
}
