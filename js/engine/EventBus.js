/**
 * EventBus - 全局事件总线
 * 所有系统间通信通过事件驱动
 */
class EventBus {
  constructor() {
    this._listeners = {};
    this._history = [];
    this._maxHistory = 200;
  }

  /** 注册事件监听 */
  on(event, callback, priority = 0) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push({ callback, priority });
    this._listeners[event].sort((a, b) => b.priority - a.priority);
    return () => this.off(event, callback);
  }

  /** 取消监听 */
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(
      l => l.callback !== callback
    );
  }

  /** 触发事件 */
  emit(event, data = {}) {
    const entry = { event, data, timestamp: Date.now() };
    this._history.push(entry);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    const listeners = this._listeners[event];
    if (!listeners) return;
    for (const l of listeners) {
      try {
        l.callback(data);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${event}":`, e);
      }
    }
  }

  /** 获取事件历史 */
  getHistory(eventName, limit = 20) {
    const filtered = eventName
      ? this._history.filter(e => e.event === eventName)
      : this._history;
    return filtered.slice(-limit);
  }

  /** 清空历史 */
  clearHistory() {
    this._history = [];
  }
}

// 全局单例
const eventBus = new EventBus();

// 事件常量
const EVENTS = {
  // 时间
  DAY_CHANGE: 'time:day',
  WEEK_CHANGE: 'time:week',
  MONTH_CHANGE: 'time:month',
  YEAR_CHANGE: 'time:year',
  SEASON_CHANGE: 'time:season',

  // 状态
  STATE_CHANGE: 'state:change',
  PLAYER_STAT_CHANGE: 'player:stat',
  COUNTY_STAT_CHANGE: 'county:stat',

  // 决策
  DECISION_MAKE: 'decision:make',
  DECISION_RESULT: 'decision:result',

  // 事件
  EVENT_TRIGGER: 'event:trigger',
  EVENT_RESOLVE: 'event:resolve',
  EVENT_CHAIN: 'event:chain',

  // 财政
  FINANCE_MONTHLY: 'finance:monthly',
  FINANCE_YEARLY: 'finance:yearly',
  FINANCE_WARNING: 'finance:warning',
  BUDGET_REVIEW: 'finance:budget_review',

  // 人事
  PERSONNEL_CHANGE: 'personnel:change',
  PERSONNEL_TRAIN: 'personnel:train',
  COMMITTEE_VOTE: 'committee:vote',

  // 社会
  SOCIAL_TENSION: 'social:tension',
  SOCIAL_PROTEST: 'social:protest',

  // 上级
  SUPERIOR_TASK: 'superior:task',
  SUPERIOR_EVALUATION: 'superior:evaluation',

  // 信息
  INTEL_UPDATE: 'intel:update',
  INTEL_VERIFY: 'intel:verify',

  // 每周决策流
  WEEKLY_FOCUS: 'weekly:focus',    // 选关注领域
  WEEKLY_EVENTS: 'weekly:events',  // 处理周事件
  WEEKLY_ADVANCE: 'weekly:advance', // 实际推进

  // UI
  UI_NOTIFICATION: 'ui:notification',
  UI_REFRESH_DASHBOARD: 'ui:refresh',
  UI_OPEN_DECISION: 'ui:open_decision',
  UI_ALERT: 'ui:alert',

  // 游戏
  GAME_INIT: 'game:init',
  GAME_SAVE: 'game:save',
  GAME_LOAD: 'game:load',
  GAME_OVER: 'game:over',

  // 上级
  SUPERIOR_EVENT: 'superior:event',

  // 巡视
  INSPECTION_ACTIVE: 'inspection:active',
  INSPECTION_CHOICE: 'inspection:choice',
};
