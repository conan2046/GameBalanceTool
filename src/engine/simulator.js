/**
 * GBT v3.4 — Simulator Engine
 * 统一生命周期模拟器与 ROI 投资模拟器的数据源。
 * 所有计算从 ProjectState 当前数据读取，不再直接依赖页面内临时状态。
 */
import { calculateCurveValue } from '../curve/curve-library.js';

export function getProjectData(projectState) {
  const data = projectState && typeof projectState.get === 'function' ? projectState.get() : (window.S || {});
  return data || {};
}

export function findCurve(S, curveId) {
  if (!curveId || !S || !Array.isArray(S.curves)) return null;
  return S.curves.find(c => c.id === curveId) || null;
}

export function evalCurveById(S, curveId, level, fallback = 1) {
  const curve = findCurve(S, curveId);
  if (!curve) return fallback;
  const v = calculateCurveValue(curve, Math.max(1, Number(level) || 1));
  return Number.isFinite(v) ? v : fallback;
}

export function normalizeBranch(branch) {
  if (!branch) return null;
  const consumes = branch.consumes || (branch.resId ? [{ resId: branch.resId, qty: branch.qty || 1, cvId: branch.cvId || '' }] : []);
  const gains = branch.gains || (branch.attrId ? [{ attrId: branch.attrId, val: branch.attrVal || 10, cvId: branch.gainCvId || branch.cvId || '' }] : []);
  return {
    ...branch,
    maxLevel: Number(branch.maxLevel || branch.maxLevels || 10),
    consumes: consumes.map(c => ({ resId: c.resId || '', qty: Number(c.qty || 0), cvId: c.cvId || '' })),
    gains: gains.map(g => ({ attrId: g.attrId || '', val: Number(g.val || 0), cvId: g.cvId || '' }))
  };
}

export function buildBranchSystems(S) {
  const systems = [];
  const colors = ['cs1','cs2','cs3','cs4','cs5'];
  let ci = 0;
  (S.cultivations || []).forEach(line => {
    (line.branches || []).forEach(branchRaw => {
      const branch = normalizeBranch(branchRaw);
      if (!branch) return;
      const costValue = branch.consumes.reduce((sum, c) => {
        const res = (S.resources || []).find(r => r.id === c.resId);
        return sum + (res ? Number(res.price || 0.1) : 0.1) * Number(c.qty || 0);
      }, 0);
      const attrValue = branch.gains.reduce((sum, g) => {
        const attr = (S.attrs || []).find(a => a.id === g.attrId);
        const weight = attr ? Number(attr.weight || 1) : 1;
        return sum + Number(g.val || 0) * weight;
      }, 0);
      const firstGainCurve = branch.gains.find(g => g.cvId);
      const firstCostCurve = branch.consumes.find(c => c.cvId);
      const curve = findCurve(S, (firstGainCurve && firstGainCurve.cvId) || (firstCostCurve && firstCostCurve.cvId));
      systems.push({
        id: branch.id,
        lineId: line.id,
        branch,
        name: `${line.name}-${branch.name}`,
        color: colors[ci % colors.length],
        maxLevels: branch.maxLevel,
        perLvl: Math.max(1, Math.round(attrValue || 10)),
        basePower: 0,
        resPrice: Math.max(0.1, costValue || 0.1),
        qty: 1,
        curveName: curve ? curve.name : '线性',
        curveType: curve ? curve.type : 'linear',
        params: curve ? curve.params : { a: Math.max(1, Math.round(attrValue || 10)) }
      });
      ci++;
    });
  });
  return systems;
}

export function getBranchLevelCost(S, branch, nextLevel) {
  const b = normalizeBranch(branch);
  if (!b) return 0;
  return b.consumes.reduce((sum, c) => {
    const mult = evalCurveById(S, c.cvId, nextLevel, 1);
    return sum + Math.round(Number(c.qty || 0) * mult);
  }, 0);
}

export function getBranchLevelGains(S, branch, nextLevel) {
  const b = normalizeBranch(branch);
  if (!b) return {};
  const out = {};
  b.gains.forEach(g => {
    const mult = evalCurveById(S, g.cvId, nextLevel, 1);
    out[g.attrId] = (out[g.attrId] || 0) + Math.round(Number(g.val || 0) * mult);
  });
  return out;
}

export function calcBranchPower(S, branch, level) {
  const gains = getBranchLevelGains(S, branch, level + 1);
  return Object.entries(gains).reduce((sum, [attrId, v]) => {
    const attr = (S.attrs || []).find(a => a.id === attrId);
    return sum + Number(v || 0) * (attr ? Number(attr.weight || 1) : 1);
  }, 0);
}

export function calcBranchTotalPower(S, branch, levels) {
  let total = 0;
  for (let i = 0; i < levels; i++) total += calcBranchPower(S, branch, i);
  return Math.round(total);
}

export function runLifecycleSimulation(S, options = {}) {
  const budget = Number(options.budget || 0);
  const days = Math.max(1, parseInt(options.days || 1, 10));
  const ratio = Number(options.ratio || 1);
  const strategy = options.strategy || 'roi';
  const wallet = {};
  (S.resources || []).forEach(r => { wallet[r.id] = days * 50 * ratio; });

  let moneySpent = 0;
  const buyLog = [];
  const packs = [...(S.packs || [])];
  const packValue = p => Object.entries(p.items || {}).reduce((sum, [rid, qty]) => {
    const r = (S.resources || []).find(x => x.id === rid);
    return sum + (r ? Number(r.price || 0) : 0) * Number(qty || 0);
  }, 0);
  if (strategy === 'roi') packs.sort((a,b) => (packValue(b)/(b.price||1)) - (packValue(a)/(a.price||1)));
  if (strategy === 'cheap') packs.sort((a,b) => Number(a.price || 0) - Number(b.price || 0));
  if (strategy === 'expensive') packs.sort((a,b) => Number(b.price || 0) - Number(a.price || 0));

  packs.forEach(p => {
    while (moneySpent + Number(p.price || 0) <= budget) {
      moneySpent += Number(p.price || 0);
      buyLog.push(p.name);
      Object.entries(p.items || {}).forEach(([rid, qty]) => { wallet[rid] = (wallet[rid] || 0) + Number(qty || 0); });
      if (['roi','cheap','expensive'].includes(strategy)) break;
    }
  });

  const branchLevels = {};
  const totalAttrGains = {};
  (S.attrs || []).forEach(a => { totalAttrGains[a.id] = 0; });
  (S.cultivations || []).forEach(line => (line.branches || []).forEach(b => { branchLevels[b.id] = 0; }));

  let advanced = true;
  let loopCount = 0;
  while (advanced && loopCount < 500) {
    advanced = false;
    loopCount++;
    (S.cultivations || []).forEach(line => {
      (line.branches || []).forEach(branchRaw => {
        const branch = normalizeBranch(branchRaw);
        const current = branchLevels[branch.id] || 0;
        if (current >= branch.maxLevel) return;
        const next = current + 1;
        let canAfford = true;
        branch.consumes.forEach(c => {
          const need = Math.round(Number(c.qty || 0) * evalCurveById(S, c.cvId, next, 1));
          if ((wallet[c.resId] || 0) < need) canAfford = false;
        });
        if (!canAfford) return;
        branch.consumes.forEach(c => {
          const need = Math.round(Number(c.qty || 0) * evalCurveById(S, c.cvId, next, 1));
          wallet[c.resId] = (wallet[c.resId] || 0) - need;
        });
        branchLevels[branch.id] = next;
        const gains = getBranchLevelGains(S, branch, next);
        Object.entries(gains).forEach(([attrId, v]) => { totalAttrGains[attrId] = (totalAttrGains[attrId] || 0) + Number(v || 0); });
        advanced = true;
      });
    });
  }

  const totalCP = (S.attrs || []).reduce((sum, a) => sum + (totalAttrGains[a.id] || 0) * Number(a.weight || 1), 0);
  return { wallet, moneySpent, buyLog, branchLevels, totalAttrGains, totalCP: Math.round(totalCP), loopCount };
}
