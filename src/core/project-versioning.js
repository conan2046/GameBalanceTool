import { clonePaymentConfig } from '../data/payment-defaults.js';

/**
 * GBT v3.10 — Project Versioning
 * 统一工程封包、版本号、导入导出迁移入口。
 */

export const PROJECT_SCHEMA = 'gbt-project';
export const PROJECT_VERSION = '3.10.32';
export const APP_VERSION_LABEL = `v${PROJECT_VERSION}`;
export const APP_RELEASE_NAME = '怪物属性横排修订版';
export const COMPATIBLE_IMPORTS = ['2.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.6.0', '3.7', '3.7.0', '3.8.0', '3.8.1', '3.8.2', '3.9.0', '3.10.0', '3.10.1', '3.10.2', '3.10.3', '3.10.4', '3.10.5', '3.10.6', '3.10.7', '3.10.8', '3.10.9', '3.10.10', '3.10.11', '3.10.12', '3.10.13', '3.10.14', '3.10.15', '3.10.16', '3.10.17', '3.10.18', '3.10.19', '3.10.20', '3.10.21', '3.10.22', '3.10.23', '3.10.24', '3.10.25', '3.10.26', '3.10.27', '3.10.28', '3.10.29', '3.10.30', '3.10.31', '3.10.32'];

function clone(data) { return JSON.parse(JSON.stringify(data || {})); }
function nowISO() { return new Date().toISOString(); }

export function createDefaultScenario(overrides = {}) {
  return {
    id: overrides.id || 'default',
    name: overrides.name || '默认方案',
    description: overrides.description || '主数值方案',
    budget: Number(overrides.budget ?? 10000),
    strategy: overrides.strategy || 'greedy',
    dayLimit: Number(overrides.dayLimit ?? 7),
    costBase: Number(overrides.costBase ?? 500),
    costGrowth: Number(overrides.costGrowth ?? 0.3),
    createdAt: overrides.createdAt || nowISO(),
    updatedAt: overrides.updatedAt || nowISO()
  };
}

export function ensureProjectMeta(state = {}) {
  if (!state.project) state.project = {};
  const p = state.project;
  p.schema = PROJECT_SCHEMA;
  p.version = PROJECT_VERSION;
  p.name = p.name || state.projectName || '游戏数值工程';
  p.activeScenarioId = p.activeScenarioId || 'default';
  p.createdAt = p.createdAt || nowISO();
  p.updatedAt = nowISO();
  if (!Array.isArray(p.scenarios) || !p.scenarios.length) {
    p.scenarios = [
      createDefaultScenario({ id: 'default', name: '标准方案', budget: 10000, strategy: 'greedy' }),
      createDefaultScenario({ id: 'low_r', name: '小额付费试探', budget: 3000, strategy: 'cheapest' }),
      createDefaultScenario({ id: 'balanced', name: '均衡方案', budget: 10000, strategy: 'balanced' }),
      createDefaultScenario({ id: 'whale', name: '大额付费拉满', budget: 30000, strategy: 'greedy' })
    ];
  }
  p.scenarios = p.scenarios.map((s, idx) => createDefaultScenario({
    id: s.id || `scenario_${idx + 1}`,
    name: s.name || `方案${idx + 1}`,
    description: s.description || '',
    budget: s.budget,
    strategy: s.strategy,
    dayLimit: s.dayLimit,
    costBase: s.costBase,
    costGrowth: s.costGrowth,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
  if (!p.scenarios.some(s => s.id === p.activeScenarioId)) p.activeScenarioId = p.scenarios[0].id;
  if (!state.paymentConfig) state.paymentConfig = clonePaymentConfig();
  return state;
}

export function getActiveScenario(state = {}) {
  ensureProjectMeta(state);
  return state.project.scenarios.find(s => s.id === state.project.activeScenarioId) || state.project.scenarios[0];
}

export function setActiveScenario(state = {}, scenarioId) {
  ensureProjectMeta(state);
  if (state.project.scenarios.some(s => s.id === scenarioId)) {
    state.project.activeScenarioId = scenarioId;
    state.project.updatedAt = nowISO();
  }
  return getActiveScenario(state);
}

export function upsertScenario(state = {}, scenario) {
  ensureProjectMeta(state);
  const next = createDefaultScenario({ ...scenario, updatedAt: nowISO() });
  const idx = state.project.scenarios.findIndex(s => s.id === next.id);
  if (idx >= 0) state.project.scenarios[idx] = next;
  else state.project.scenarios.push(next);
  state.project.updatedAt = nowISO();
  return next;
}

export function removeScenario(state = {}, scenarioId) {
  ensureProjectMeta(state);
  if (state.project.scenarios.length <= 1) return false;
  const before = state.project.scenarios.length;
  state.project.scenarios = state.project.scenarios.filter(s => s.id !== scenarioId);
  if (state.project.activeScenarioId === scenarioId) state.project.activeScenarioId = state.project.scenarios[0].id;
  state.project.updatedAt = nowISO();
  return state.project.scenarios.length !== before;
}

export function createProjectEnvelope(state = {}, extra = {}) {
  const data = ensureProjectMeta(clone(state));
  return {
    schema: PROJECT_SCHEMA,
    version: PROJECT_VERSION,
    exportedAt: nowISO(),
    app: 'Game Balance Tool',
    migration: { from: extra.from || data.project.version || PROJECT_VERSION, to: PROJECT_VERSION },
    data
  };
}

export function normalizeImportedProject(input) {
  if (!input) throw new Error('空文件');
  let data = input;
  let from = input.version || 'unknown';
  if (input.schema === PROJECT_SCHEMA && input.data) {
    data = input.data;
    from = input.version || data.project?.version || from;
  } else if (input.schema === 'gbt-project-state' && input.data) {
    data = input.data;
    from = input.version || '3.1';
  } else if (input.v2State && input.v2State.data) {
    data = input.v2State.data;
    from = input.version || '3.0';
  } else if (input.data && (input.data.curves || input.data.cultivations)) {
    data = input.data;
    from = input.version || '2.1';
  }
  const normalized = ensureProjectMeta(clone(data));
  normalized.project.importedFromVersion = String(from);
  normalized.project.version = PROJECT_VERSION;
  normalized.project.updatedAt = nowISO();
  return { data: normalized, from, to: PROJECT_VERSION };
}

export function downloadJSON(payload, filename = `gbt_project_v${PROJECT_VERSION}.json`) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
