import { PROJECT_VERSION, ensureProjectMeta, getActiveScenario, setActiveScenario, upsertScenario, removeScenario, createProjectEnvelope, normalizeImportedProject } from './project-versioning.js';
/**
 * GBT v3.1 — ProjectState
 * 单一工程状态入口：兼容 v2.1 的 window.S，同时让 v3 模块、IndexedDB、JSON 导入导出读写同一份数据。
 */

const LS_KEY = 'gbt21_data';
const IDB_SLOT = 'v3main';

let stateRef = null;
let saveAdapter = null;
const listeners = new Set();

function clone(data) {
  return JSON.parse(JSON.stringify(data || {}));
}

export const ProjectState = {
  version: PROJECT_VERSION,
  LS_KEY,
  IDB_SLOT,

  bind(initialState, options = {}) {
    stateRef = ensureProjectMeta(initialState || {});
    saveAdapter = options.saveAdapter || saveAdapter;
    window.S = stateRef;
    window.ProjectState = ProjectState;
    return stateRef;
  },

  get() {
    if (!stateRef && window.S) stateRef = window.S;
    return stateRef;
  },

  set(nextState, reason = 'set') {
    stateRef = ensureProjectMeta(nextState || {});
    window.S = stateRef;
    this.emit(reason);
    return stateRef;
  },

  patch(partial, reason = 'patch') {
    if (!stateRef) stateRef = {};
    Object.assign(stateRef, partial || {});
    ensureProjectMeta(stateRef);
    window.S = stateRef;
    this.emit(reason);
    return stateRef;
  },

  snapshot(extra = {}) {
    return createProjectEnvelope(this.get(), extra);
  },

  restore(snapshotOrState, reason = 'restore') {
    const normalized = normalizeImportedProject(snapshotOrState);
    return this.set(normalized.data || {}, reason);
  },

  loadLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[v3.1] localStorage load failed:', e.message);
      return null;
    }
  },

  saveLocalStorage() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.get()));
      return true;
    } catch (e) {
      console.warn('[v3.1] localStorage save failed:', e.message);
      return false;
    }
  },

  async persist(reason = 'manual') {
    this.saveLocalStorage();
    if (typeof saveAdapter === 'function') {
      try { await saveAdapter(IDB_SLOT, this.snapshot({ reason })); }
      catch (e) { console.warn('[v3.1] IndexedDB persist failed:', e.message); }
    }
  },



  ensureProject() {
    return ensureProjectMeta(this.get() || {});
  },

  getActiveScenario() {
    return getActiveScenario(this.get() || {});
  },

  setActiveScenario(scenarioId) {
    const scenario = setActiveScenario(this.get() || {}, scenarioId);
    this.emit('scenario:set-active');
    return scenario;
  },

  upsertScenario(scenario) {
    const result = upsertScenario(this.get() || {}, scenario);
    this.emit('scenario:upsert');
    return result;
  },

  removeScenario(scenarioId) {
    const ok = removeScenario(this.get() || {}, scenarioId);
    if (ok) this.emit('scenario:remove');
    return ok;
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  emit(reason = 'change') {
    listeners.forEach(fn => {
      try { fn(this.get(), reason); } catch (e) { console.warn('[v3.1] listener failed:', e.message); }
    });
  }
};

export default ProjectState;
