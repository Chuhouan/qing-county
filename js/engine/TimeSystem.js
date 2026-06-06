/**
 * TimeSystem - 多层时间管理系统
 * 管理 天/周/月/年/任期 的五层时间循环
 */
class TimeSystem {
  constructor() {
    this.day = 1;
    this.weekDay = 1;      // 1=周一 ... 7=周日
    this.month = 1;
    this.year = 1988;
    this.termYear = 1;     // 任期第几年
    this.hour = 8;         // 当前小时 (08:00 ~ 22:00)
    this.totalDays = 0;

    this._speed = 1;       // 时间流速
    this._paused = false;
    this._tickTimer = null;

    // 时间槽分配 (08:00 ~ 12:00 上午, 14:00 ~ 18:00 下午, 20:00 ~ 22:00 晚上)
    this.timeSlots = {
      morning: { start: 8, end: 12, label: '上午' },
      afternoon: { start: 14, end: 18, label: '下午' },
      evening: { start: 20, end: 22, label: '晚上' },
    };

    // 固定会议安排
    this.fixedMeetings = {
      1: { morning: '常委会' },        // 周一上午
      2: { morning: '县长办公会' },     // 周二上午
    };
  }

  /** 初始化时间 */
  init(config = {}) {
    this.year = config.year || 1988;
    this.month = config.month || 1;
    this.day = config.day || 1;
    this.hour = 8;
    this.totalDays = 0;
    this.termYear = 1;
    this.updateWeekDay();
    return this;
  }

  /** 根据日期计算星期几 (1988-01-01是周五=5, 这里映射 1=周一) */
  updateWeekDay() {
    // Zeller formula or just compute offset from 1988-01-01
    const base = new Date(this.year, this.month - 1, this.day).getDay();
    // JS: 0=Sun, 1=Mon ... 6=Sat => 转换为 1=Mon ... 7=Sun
    this.weekDay = base === 0 ? 7 : base;
  }

  /** 获取星期名称 */
  getWeekDayName() {
    const names = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return names[this.weekDay];
  }

  /** 获取当前时间字符串（周循环版） */
  getTimeString() {
    const monthNames = ['','一月','二月','三月','四月','五月','六月',
                        '七月','八月','九月','十月','十一月','十二月'];
    const weekNum = Math.ceil(this.day / 7);
    return `${this.year}年${monthNames[this.month]}第${weekNum}周 · ${this.getWeekDayName()}`;
  }

  /** 获取当前时间段 */
  getCurrentSlot() {
    if (this.hour >= 8 && this.hour < 12) return 'morning';
    if (this.hour >= 14 && this.hour < 18) return 'afternoon';
    if (this.hour >= 20 && this.hour < 22) return 'evening';
    return 'night';
  }

  /** 获取时间段标签 */
  getSlotLabel() {
    const slot = this.getCurrentSlot();
    return this.timeSlots[slot] ? this.timeSlots[slot].label : '休息';
  }

  /** 前进一个时间槽（半天） */
  advanceSlot() {
    if (this._paused) return false;

    const slot = this.getCurrentSlot();
    const transitions = {
      morning: 14,   // 上午结束 → 下午14:00
      afternoon: 20, // 下午结束 → 晚上20:00
      evening: 22,   // 晚上结束 → 第二天08:00
      night: 8,
    };

    const nextHour = transitions[slot];
    if (nextHour === 22) {
      // 天结束
      return this.advanceDay();
    }

    this.hour = nextHour;
    // 仅更新小时，不发射 DAY_CHANGE（只有 advanceDay 才发射）
    return true;
  }

  /** 前进一天 */
  advanceDay() {
    this.day++;
    this.totalDays++;
    this.hour = 8;
    this.updateWeekDay();

    eventBus.emit(EVENTS.DAY_CHANGE, {
      day: this.day,
      month: this.month,
      year: this.year,
      weekDay: this.weekDay,
      weekDayName: this.getWeekDayName(),
    });

    if (this.weekDay === 1) {
      eventBus.emit(EVENTS.WEEK_CHANGE, {
        year: this.year,
        month: this.month,
        week: Math.ceil(this.day / 7),
      });
    }

    // 月底结算
    const daysInMonth = new Date(this.year, this.month, 0).getDate();
    if (this.day > daysInMonth) {
      this.day = 1;
      this.month++;
      if (this.month > 12) {
        this.month = 1;
        this.year++;
        this.termYear++;
        eventBus.emit(EVENTS.YEAR_CHANGE, {
          year: this.year,
          termYear: this.termYear,
        });
      }
      eventBus.emit(EVENTS.MONTH_CHANGE, {
        year: this.year,
        month: this.month,
        termYear: this.termYear,
      });
    }

    return true;
  }

  /** 快速跳过N天（带边界事件） */
  skipDays(n) {
    for (let i = 0; i < n; i++) {
      this.day++;
      this.totalDays++;
      this.updateWeekDay();

      // 发射周变更事件
      if (this.weekDay === 1) {
        eventBus.emit(EVENTS.WEEK_CHANGE, {
          year: this.year,
          month: this.month,
          week: Math.ceil(this.day / 7),
        });
      }

      // 检测月份/年份变化
      const daysInMonth = new Date(this.year, this.month, 0).getDate();
      if (this.day > daysInMonth) {
        this.day = 1;
        this.month++;
        if (this.month > 12) {
          this.month = 1;
          this.year++;
          this.termYear++;
          eventBus.emit(EVENTS.YEAR_CHANGE, { year: this.year, termYear: this.termYear });
        }
        eventBus.emit(EVENTS.MONTH_CHANGE, { year: this.year, month: this.month, termYear: this.termYear });
      }
    }
  }

  /** 判断是否为周末 */
  isWeekend() {
    return this.weekDay === 6 || this.weekDay === 7;
  }

  /** 判断是否为周一 */
  isMonday() {
    return this.weekDay === 1;
  }

  /** 获取当前在任期中的位置（0~1） */
  getTermProgress() {
    return this.termYear / 5;
  }

  /** 获取当前小时段的活动建议 */
  getSuggestedActivity() {
    const slot = this.getCurrentSlot();
    const wd = this.weekDay;

    if (slot === 'morning') {
      if (wd === 1) return '参加常委会';
      if (wd === 2) return '召开县长办公会';
      return '批阅文件 / 处理事务';
    }
    if (slot === 'afternoon') {
      return '下乡调研 / 专项工作 / 接待上级';
    }
    if (slot === 'evening') {
      return '学习思考 / 家庭时间 / 应酬接待';
    }
    return '休息';
  }

  /** 设置时间流速 */
  setSpeed(speed) {
    this._speed = Math.max(0, Math.min(5, speed));
  }

  pause() { this._paused = true; }
  resume() { this._paused = false; }
  isPaused() { return this._paused; }

  /** 获取游戏内已过时间描述 */
  getElapsedTimeDesc() {
    const years = Math.floor(this.totalDays / 360);
    const months = Math.floor((this.totalDays % 360) / 30);
    const days = this.totalDays % 30;
    let desc = '';
    if (years > 0) desc += `${years}年`;
    if (months > 0) desc += `${months}月`;
    if (days > 0 || desc === '') desc += `${days}天`;
    return desc;
  }

  /** 序列化 */
  serialize() {
    return {
      day: this.day, month: this.month, year: this.year,
      weekDay: this.weekDay, hour: this.hour, totalDays: this.totalDays,
      termYear: this.termYear,
    };
  }

  /** 反序列化 */
  deserialize(data) {
    Object.assign(this, data);
  }
}

const timeSystem = new TimeSystem();
