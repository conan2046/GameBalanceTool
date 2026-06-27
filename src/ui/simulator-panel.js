/**
 * GBT v3.5 — Simulator Panel
 * 页面适配层：生命周期模拟器 + ROI 策略对比 + 多方案模拟器。
 */
import { ProjectState } from '../core/project-state.js';
import { buildBranchSystems, calcBranchPower, runLifecycleSimulation } from '../engine/simulator.js';
import { createROIState, investSystem, autoInvest, advanceDay, levelCost, systemTotalPower as roiSystemTotalPower, buildStrategyComparison, summarizeState } from '../engine/roi-strategy.js';

let roiState = null;
const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString();

function S() { return ProjectState.get() || window.S || {}; }

export function runSimulationV34() {
  const data = S();
  const result = runLifecycleSimulation(data, {
    budget: parseFloat($('sim-budget')?.value || 0) || 0,
    days: parseInt($('sim-days')?.value || 1, 10) || 1,
    ratio: parseFloat($('sim-daily-ratio')?.value || 1) || 1,
    strategy: $('sim-strategy')?.value || 'roi'
  });

  const resHTML = (data.resources || []).map(r => `<div class="stat-card"><div class="stat-l">${r.name}剩余结余</div><div class="stat-v" style="color:var(--text)">${Math.round(result.wallet[r.id] || 0)}</div></div>`).join('');
  const attrHTML = (data.attrs || []).map(a => `<div class="stat-card"><div class="stat-l">累计${a.name}净增</div><div class="stat-v" style="color:var(--accent)">+${result.totalAttrGains[a.id] || 0}</div></div>`).join('');
  const cultHTML = (data.cultivations || []).map(l => {
    const bProgress = (l.branches || []).map(b => `<span style="margin-right:12px;font-size:12px">${b.name}: <b style="color:var(--accent2)">第${result.branchLevels[b.id] || 0}级/第${b.maxLevel}级</b></span>`).join('');
    return `<div style="padding:8px;border-bottom:1px solid var(--border)"><b>${l.name}</b>: ${bProgress}</div>`;
  }).join('');

  const target = $('sim-result');
  if (!target) return result;
  target.innerHTML = `
    <div class="section"><div class="section-header"><span class="section-title">建模仿真推演成果报告 <span style="font-size:11px;color:var(--text3)">三点五版工程状态数据源</span></span></div>
    <div class="section-body" style="display:flex;flex-direction:column;gap:12px">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-l">实际资金总消费</div><div class="stat-v" style="color:var(--warning)">￥${fmt(result.moneySpent)}</div></div>
        <div class="stat-card"><div class="stat-l">综合评估战力总贡献</div><div class="stat-v" style="color:var(--success)">${fmt(result.totalCP)}</div></div>
      </div>
      <div style="font-size:12px;color:var(--text2)">付费路线买入行为日志追踪 (${result.buyLog.length}次行为): ${result.buyLog.slice(0,8).join(' → ')}${result.buyLog.length>8?'…':''}</div>
      <span style="font-size:12px;color:var(--text3);font-weight:600">核心代币存留结余表</span><div class="stats-grid">${resHTML}</div>
      <span style="font-size:12px;color:var(--text3);font-weight:600">核心战斗二级属性净增加汇总表</span><div class="stats-grid">${attrHTML}</div>
      <span style="font-size:12px;color:var(--text3);font-weight:600">各系统及分支最终进阶级别评估</span><div style="background:var(--bg3);border-radius:6px;padding:6px">${cultHTML}</div>
    </div></div>`;
  target.style.display = 'flex';
  return result;
}

function resetROIState() {
  const active = ProjectState.getActiveScenario ? ProjectState.getActiveScenario() : null;
  const budget = parseFloat($('roi-budget')?.value || active?.budget || 10000) || active?.budget || 10000;
  roiState = createROIState(S(), { budget, costBase: active?.costBase, costGrowth: active?.costGrowth });
}

function findSys(id) { return (roiState?.systems || []).find(s => s.id === id); }
function branchPower(sysId, level) { const sys = findSys(sysId); return sys ? Math.round(calcBranchPower(S(), sys.branch, level)) : 0; }
function systemTotalPower(sysId, levels) { return roiSystemTotalPower(S(), roiState, sysId, levels); }
function stars() { const p = roiState.totalPower; return p < 3000 ? 1 : p < 6000 ? 2 : p < 10000 ? 3 : p < 15000 ? 4 : 5; }

export function roiResetAllV34() { resetROIState(); roiRenderAllV34(); }
export function roiInvestV34(sysId) {
  if (!roiState) resetROIState();
  const sys = findSys(sysId); if (!sys) return;
  const r = investSystem(S(), roiState, sysId, { strategy: 'manual' });
  if (!r.ok) return;
  roiRenderAllV34();
}
export function roiAutoInvestV34() {
  if (!roiState) resetROIState();
  autoInvest(S(), roiState, 'greedy', 500);
  roiRenderAllV34();
}
export function roiAdvanceDayV34() {
  if (!roiState) resetROIState();
  const active = ProjectState.getActiveScenario ? ProjectState.getActiveScenario() : null;
  const maxDay = parseInt($('roi-day-limit')?.value || active?.dayLimit || 7, 10) || active?.dayLimit || 7;
  advanceDay(roiState, { maxDay, refreshAmount: 5000 });
  roiRenderAllV34();
}

export function roiRenderAllV34() {
  if (!roiState) resetROIState();
  if ($('roi-budget-left')) $('roi-budget-left').textContent = '¥' + fmt(roiState.budget);
  if ($('roi-total-power')) $('roi-total-power').textContent = fmt(roiState.totalPower);
  const active = ProjectState.getActiveScenario ? ProjectState.getActiveScenario() : null;
  const maxDay = parseInt($('roi-day-limit')?.value || active?.dayLimit || 7, 10) || active?.dayLimit || 7;
  if ($('roi-day')) $('roi-day').textContent = '第' + roiState.day + '/' + maxDay + '天';
  const grid = $('roi-sys-grid');
  if (grid) {
    grid.innerHTML = '';
    roiState.systems.forEach(sys => {
      const lvl = roiState.invested[sys.id] || 0, cost = levelCost(roiState, lvl), power = roiState.power[sys.id] || 0;
      const bars = [];
      for (let i = 0; i < Math.min(lvl, 10); i++) {
        const v = branchPower(sys.id, i); const h = Math.min(100, (v / ((sys.perLvl || 100) * 1.5)) * 100);
        bars.push(`<div class="bar" style="height:${Math.max(2,h)}%;background:var(--accent2)"></div>`);
      }
      const canInvest = roiState.budget >= cost && lvl < sys.maxLevels;
      grid.innerHTML += `<div class="roi-sys-card ${sys.color}">
        <div class="roi-sys-hd"><span class="roi-sys-name">${sys.name}</span><span class="roi-sys-power">${fmt(power)} 战力</span></div>
        <div class="roi-sys-sub">已升 ${lvl}/${sys.maxLevels} 级 | 下一级成本: ¥${fmt(cost)}</div>
        <div class="roi-bar-track"><div class="roi-bar-fill ${sys.color}" style="width:${Math.min(100,(power/((sys.perLvl||100)*15))*100)}%"></div></div>
        <div class="roi-sys-graph">${bars.length ? bars.join('') : '<div style="color:var(--text3);font-size:10px;padding:8px;width:100%;text-align:center">未投资</div>'}</div>
        <button class="roi-sys-btn" onclick="roiInvest('${sys.id}')" ${canInvest ? '' : 'disabled'}>投资 ¥${fmt(cost)}</button>
        <div class="roi-sys-info">分支曲线: ${sys.curveName || sys.curveType || '线性'} | 数据源：工程状态</div>
      </div>`;
    });
  }
  const tbody = document.querySelector('#roi-results-tbl tbody');
  if (tbody) {
    tbody.innerHTML = roiState.systems.map(sys => {
      const totalInv = roiState.history.filter(h => h.system === sys.id).reduce((s,h) => s + h.cost, 0);
      const power = roiState.power[sys.id] || 0, ppc = totalInv > 0 ? (power / totalInv).toFixed(2) : '0.00';
      return `<tr><td style="font-weight:600">${sys.name}</td><td>¥${fmt(totalInv)}</td><td style="color:var(--accent2);font-weight:bold">${fmt(power)}</td><td>${ppc}/¥1</td></tr>`;
    }).join('');
    const elStar = $('roi-stars');
    if (elStar) { let sh = ''; for (let i=0;i<5;i++) sh += i<stars()?'<span style="color:var(--warning)">★</span>':'<span style="color:var(--text3)">★</span>'; elStar.innerHTML = sh + ' <span style="font-size:11px;color:var(--text3)">战力评级</span>'; }
  }
  renderStrategyComparison();
  renderScenarioPanel();
}

function renderStrategyComparison() {
  const comp = $('roi-comp-area');
  if (!comp || !roiState) return;
  const totalSpent = summarizeState(roiState).totalSpent;
  if (!totalSpent) { comp.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">尚未投资 — 点击下方卡片上的“投资”按钮开始测试</div>'; return; }
  const rows = buildStrategyComparison(S(), roiState, { budget: totalSpent });
  const maxPower = Math.max(1, ...rows.map(r => r.summary.totalPower));
  comp.innerHTML = `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">以已花 ¥${fmt(totalSpent)} 为预算，自动重跑多种分配策略：</div>` + rows.map((r, idx) => {
    const pct = Math.max(4, Math.round(r.summary.totalPower / maxPower * 100));
    const color = idx === 0 ? '#ffc107' : (r.summary.totalPower === maxPower ? '#4ecca3' : '#6c63ff');
    return `<div class="roi-comp-row"><div class="roi-comp-label">${r.name}</div><div class="roi-comp-bar"><div class="roi-comp-fill" style="width:${pct}%;background:${color}">${fmt(r.summary.totalPower)}</div></div><div class="roi-comp-val">投入回报 ${r.summary.roi.toFixed(2)}</div></div>`;
  }).join('');
}

function renderScenarioPanel() {
  const target = $('roi-scenario-area');
  if (!target || !roiState) return;
  const baseBudget = parseFloat($('roi-budget')?.value || 10000) || 10000;
  const projectScenarios = (S().project && Array.isArray(S().project.scenarios) && S().project.scenarios.length) ? S().project.scenarios : [
    { id:'low', name:'小额付费试探', budget: Math.round(baseBudget * 0.3), strategy:'greedy' },
    { id:'mid', name:'标准预算', budget: baseBudget, strategy:'greedy' },
    { id:'balanced', name:'均衡方案', budget: baseBudget, strategy:'balanced' },
    { id:'whale', name:'大额付费拉满', budget: Math.round(baseBudget * 3), strategy:'greedy' }
  ];
  const scenarios = projectScenarios.map(x => buildStrategyComparison(S(), createROIState(S(), { budget:x.budget, costBase:x.costBase, costGrowth:x.costGrowth }), { budget:x.budget }).find(r => r.id === x.strategy || r.strategy === x.strategy) || null)
   .filter(Boolean);
  const maxPower = Math.max(1, ...scenarios.map(s => s.summary.totalPower));
  target.innerHTML = `<div class="card" style="padding:14px;margin-top:16px"><div class="card-title" style="font-size:13px;padding:0 0 10px 0;border:none">多方案模拟器 — 预算档位 A/B/C</div>` + scenarios.map(s => {
    const pct = Math.max(4, Math.round(s.summary.totalPower / maxPower * 100));
    return `<div class="roi-comp-row"><div class="roi-comp-label">${s.name}</div><div class="roi-comp-bar"><div class="roi-comp-fill" style="width:${pct}%;background:#4fc3f7">${fmt(s.summary.totalPower)}</div></div><div class="roi-comp-val">¥${fmt(s.summary.totalSpent)}</div></div>`;
  }).join('') + `</div>`;
}

export function initSimulatorPanel() {
  window.runSimulation = runSimulationV34;
  window.roiResetAll = roiResetAllV34;
  window.roiInvest = roiInvestV34;
  window.roiAutoInvest = roiAutoInvestV34;
  window.roiAdvanceDay = roiAdvanceDayV34;
  window.roiRenderAll = roiRenderAllV34;
  window.renderROIPanel2 = roiResetAllV34;
  ProjectState.onChange(() => { roiState = null; });
  if (document.getElementById('roi-sys-grid')) roiResetAllV34();
}
