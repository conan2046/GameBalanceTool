/**
 * GBT v3.5 — ROI Strategy Engine
 * 将 ROI 投资、策略对比、多方案模拟从 UI 中抽离。
 */
import { buildBranchSystems, calcBranchTotalPower } from './simulator.js';

const DEFAULT_COST_BASE = 500;
const DEFAULT_COST_GROWTH = 0.3;

export function createROIState(S, options = {}) {
  const systems = buildBranchSystems(S);
  const budget = Number(options.budget ?? 10000) || 10000;
  const state = {
    systems,
    invested: {},
    power: {},
    history: [],
    budget,
    initialBudget: budget,
    day: 1,
    totalPower: 0,
    costBase: Number(options.costBase ?? DEFAULT_COST_BASE) || DEFAULT_COST_BASE,
    costGrowth: Number(options.costGrowth ?? DEFAULT_COST_GROWTH) || DEFAULT_COST_GROWTH
  };
  systems.forEach(s => { state.invested[s.id] = 0; state.power[s.id] = 0; });
  recalcROIState(S, state);
  return state;
}

export function cloneROIState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function levelCost(state, level) {
  return Math.round(Number(state.costBase || DEFAULT_COST_BASE) * (1 + Number(level || 0) * Number(state.costGrowth ?? DEFAULT_COST_GROWTH)));
}

export function getSystem(state, systemId) {
  return (state.systems || []).find(s => s.id === systemId) || null;
}

export function systemTotalPower(S, state, systemId, levels) {
  const sys = getSystem(state, systemId);
  return sys ? calcBranchTotalPower(S, sys.branch, levels) : 0;
}

export function recalcROIState(S, state) {
  state.totalPower = 0;
  (state.systems || []).forEach(s => {
    const p = systemTotalPower(S, state, s.id, state.invested[s.id] || 0);
    state.power[s.id] = p;
    state.totalPower += p;
  });
  state.totalPower = Math.round(state.totalPower);
  return state;
}

export function investSystem(S, state, systemId, meta = {}) {
  const sys = getSystem(state, systemId);
  if (!sys) return { ok: false, reason: 'system_not_found' };
  const lvl = state.invested[systemId] || 0;
  if (lvl >= sys.maxLevels) return { ok: false, reason: 'max_level' };
  const cost = levelCost(state, lvl);
  if (state.budget < cost) return { ok: false, reason: 'budget_not_enough' };
  const prev = state.totalPower || 0;
  state.budget -= cost;
  state.invested[systemId] = lvl + 1;
  recalcROIState(S, state);
  const powerDelta = state.totalPower - prev;
  state.history.push({ system: systemId, cost, powerDelta, day: state.day || 1, strategy: meta.strategy || 'manual' });
  return { ok: true, cost, powerDelta, level: lvl + 1 };
}

function nextCandidates(S, state) {
  return (state.systems || []).map(sys => {
    const lvl = state.invested[sys.id] || 0;
    if (lvl >= sys.maxLevels) return null;
    const cost = levelCost(state, lvl);
    const currentPower = systemTotalPower(S, state, sys.id, lvl);
    const nextPower = systemTotalPower(S, state, sys.id, lvl + 1);
    const gain = nextPower - currentPower;
    return { sys, level: lvl, cost, gain, roi: cost > 0 ? gain / cost : 0 };
  }).filter(Boolean);
}

export function pickNextSystem(S, state, strategy = 'greedy') {
  const candidates = nextCandidates(S, state).filter(c => c.cost <= state.budget);
  if (!candidates.length) return null;
  const sorters = {
    greedy: (a,b) => b.roi - a.roi,
    balanced: (a,b) => a.level - b.level || b.roi - a.roi,
    cheapest: (a,b) => a.cost - b.cost || b.roi - a.roi,
    expensive: (a,b) => b.cost - a.cost || b.roi - a.roi,
    focused: (a,b) => {
      const firstId = (state.systems[0] || {}).id;
      return (a.sys.id === firstId ? -1 : 1) - (b.sys.id === firstId ? -1 : 1) || b.roi - a.roi;
    }
  };
  candidates.sort(sorters[strategy] || sorters.greedy);
  return candidates[0].sys.id;
}

export function autoInvest(S, state, strategy = 'greedy', maxRounds = 500) {
  let rounds = 0;
  while (rounds < maxRounds) {
    const nextId = pickNextSystem(S, state, strategy);
    if (!nextId) break;
    const r = investSystem(S, state, nextId, { strategy });
    if (!r.ok) break;
    rounds++;
  }
  return { state, rounds };
}

export function advanceDay(state, options = {}) {
  const maxDay = Number(options.maxDay || 7) || 7;
  if (state.day >= maxDay) return { ok: false, reason: 'day_limit' };
  state.day++;
  const refresh = Math.round(Number(options.refreshAmount || 5000) * (1 + state.day * 0.1));
  state.budget += refresh;
  return { ok: true, refresh, day: state.day };
}

export function summarizeState(state) {
  const totalSpent = (state.history || []).reduce((s,h) => s + Number(h.cost || 0), 0);
  const roi = totalSpent > 0 ? state.totalPower / totalSpent : 0;
  return {
    totalSpent,
    totalPower: state.totalPower || 0,
    budgetLeft: state.budget || 0,
    roi,
    levels: { ...(state.invested || {}) },
    historyCount: (state.history || []).length
  };
}

export function simulateStrategy(S, options = {}) {
  const state = createROIState(S, { budget: options.budget, costBase: options.costBase, costGrowth: options.costGrowth });
  if (options.seedInvested) {
    Object.entries(options.seedInvested).forEach(([id, lv]) => { state.invested[id] = Math.max(0, Number(lv || 0)); });
    recalcROIState(S, state);
  }
  autoInvest(S, state, options.strategy || 'greedy', options.maxRounds || 500);
  return { id: options.id || options.strategy || 'greedy', name: options.name || options.strategy || 'greedy', strategy: options.strategy || 'greedy', state, summary: summarizeState(state) };
}

export function buildStrategyComparison(S, currentState, options = {}) {
  const spent = (currentState.history || []).reduce((s,h) => s + Number(h.cost || 0), 0);
  const budget = Number(options.budget ?? spent ?? currentState.initialBudget ?? 10000) || 10000;
  const current = { id: 'current', name: '当前手动方案', strategy: 'manual', state: currentState, summary: summarizeState(currentState) };
  const presets = [
    { id: 'greedy', name: '智能投入回报最优', strategy: 'greedy' },
    { id: 'balanced', name: '均衡补短板', strategy: 'balanced' },
    { id: 'focused', name: '单点集中堆叠', strategy: 'focused' },
    { id: 'cheapest', name: '低成本铺量', strategy: 'cheapest' }
  ];
  return [current, ...presets.map(p => simulateStrategy(S, { ...p, budget }))];
}
