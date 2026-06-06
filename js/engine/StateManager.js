/**
 * StateManager - 全局状态管理器
 * 维护游戏世界所有的状态，支持响应式更新
 *
 * ⚠️ 重要：register() 现在直接存储对象引用（不做展开复制）
 * 这样可以保留类实例的原型链方法。
 * 如果需要不可变快照，请使用 snapshot() 显式序列化。
 */
class StateManager {
  constructor() {
    this._state = {};
    this._proxies = {};
    this._frozen = false;
  }

  /**
   * 注册一个状态模块
   * 直接存储引用，不展开复制，保留类实例的方法
   */
  register(namespace, defaultState = {}) {
    if (this._state[namespace]) {
      console.warn(`[StateManager] Namespace "${namespace}" already registered, merging`);
      // 如果已有值且新值是普通对象，做合并
      if (this._isPlainObject(this._state[namespace]) && this._isPlainObject(defaultState)) {
        Object.assign(this._state[namespace], defaultState);
      } else {
        this._state[namespace] = defaultState;
      }
    } else {
      this._state[namespace] = defaultState;
    }
    return this.getProxy(namespace);
  }

  /** 判断是否为普通对象（不是类实例） */
  _isPlainObject(obj) {
    return obj && obj.constructor === Object;
  }

  /** 获取某个命名空间的完整状态 */
  get(namespace) {
    return this._state[namespace] || {};
  }

  /** 判断命名空间是否已注册且非空 */
  has(namespace) {
    const val = this._state[namespace];
    return val !== undefined && val !== null &&
           !(typeof val === 'object' && Object.keys(val).length === 0);
  }

  /** 获取某个命名空间下的具体值 */
  getValue(namespace, key) {
    return this._state[namespace] ? this._state[namespace][key] : undefined;
  }

  /** 设置某个命名空间下的值（不可变更新） */
  set(namespace, keyOrObj, value) {
    if (this._frozen) return this;
    const target = this._state[namespace];
    if (!target) {
      console.error(`[StateManager] Namespace "${namespace}" not found`);
      return this;
    }
    if (typeof keyOrObj === 'object') {
      Object.assign(target, keyOrObj);
      eventBus.emit(EVENTS.STATE_CHANGE, { namespace, changes: keyOrObj });
    } else {
      const old = target[keyOrObj];
      if (old !== value) {
        target[keyOrObj] = value;
        eventBus.emit(EVENTS.STATE_CHANGE, { namespace, changes: { [keyOrObj]: value } });
      }
    }
    return this;
  }

  /** 批量更新 */
  batch(namespace, updater) {
    if (this._frozen) return this;
    const target = this._state[namespace];
    if (!target) return this;
    const changes = {};
    updater(target, changes);
    if (Object.keys(changes).length > 0) {
      eventBus.emit(EVENTS.STATE_CHANGE, { namespace, changes });
    }
    return this;
  }

  /** 获取整个状态树快照（用于存档） */
  snapshot() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /** 加载存档（反序列化后需要重新初始化类实例） */
  load(snapshot) {
    this._state = JSON.parse(JSON.stringify(snapshot));
    eventBus.emit(EVENTS.GAME_LOAD, { snapshot: this._state });
  }

  /** 冻结状态（禁止修改，用于结算阶段） */
  freeze() { this._frozen = true; }
  unfreeze() { this._frozen = false; }

  /** 创建响应式代理（用于UI绑定） */
  getProxy(namespace) {
    if (this._proxies[namespace]) return this._proxies[namespace];
    const self = this;
    this._proxies[namespace] = new Proxy(this._state[namespace] || {}, {
      set(target, key, value) {
        if (self._frozen) return true;
        const old = target[key];
        target[key] = value;
        if (old !== value) {
          eventBus.emit(EVENTS.STATE_CHANGE, { namespace, changes: { [key]: value } });
        }
        return true;
      },
      get(target, key) {
        return target[key];
      }
    });
    return this._proxies[namespace];
  }
}

// 全局单例
const stateManager = new StateManager();
