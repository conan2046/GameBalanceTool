/**
 * GBT v3.6 — Project Scenario Panel
 * 管理工程内置多方案数据结构，供 ROI/Simulator/导入导出共用。
 */
import { ProjectState } from '../core/project-state.js';
import { createDefaultScenario } from '../core/project-versioning.js';

const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString();
function S() { return ProjectState.get() || window.S || {}; }

function ensureHost() {
  let host = $('project-scenario-panel');
  const parent = $('roi-scenario-area') || $('sim-result') || document.body;
  if (!host) {
    host = document.createElement('div');
    host.id = 'project-scenario-panel';
    parent.parentNode ? parent.parentNode.insertBefore(host, parent) : parent.appendChild(host);
  }
  return host;
}

export function renderProjectScenarioPanel() {
  const data = ProjectState.ensureProject();
  const host = ensureHost();
  const activeId = data.project.activeScenarioId;
  host.innerHTML = `<div class="card" style="padding:14px;margin:12px 0">
    <div class="card-title" style="font-size:13px;padding:0 0 10px 0;border:none;display:flex;justify-content:space-between;align-items:center">
      <span>工程多方案管理 <span style="font-size:11px;color:var(--text3)">版本${ProjectState.version}</span></span>
      <button class="btn" onclick="projectAddScenario()">+ 新方案</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
      ${data.project.scenarios.map(s => `<div style="border:1px solid ${s.id===activeId?'var(--accent)':'var(--border)'};border-radius:8px;padding:10px;background:var(--bg3)">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${s.name}</b><span style="color:var(--warning)">¥${fmt(s.budget)}</span></div>
        <div style="font-size:11px;color:var(--text3);margin:6px 0">策略: ${s.strategy} | 天数: ${s.dayLimit} | 成本: ${s.costBase}/${s.costGrowth}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn" onclick="projectSetScenario('${s.id}')" ${s.id===activeId?'disabled':''}>设为当前</button>
          <button class="btn" onclick="projectEditScenario('${s.id}')">编辑</button>
          <button class="btn danger" onclick="projectRemoveScenario('${s.id}')">删除</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

export function projectSetScenario(id) {
  ProjectState.setActiveScenario(id);
  ProjectState.persist('scenario:set-active');
  renderProjectScenarioPanel();
  if (typeof window.roiResetAll === 'function') window.roiResetAll();
}

export function projectAddScenario() {
  const data = S();
  const id = 'scenario_' + Date.now();
  const scenario = createDefaultScenario({ id, name: '新方案', budget: 10000, strategy: 'greedy' });
  ProjectState.upsertScenario(scenario);
  ProjectState.setActiveScenario(id);
  ProjectState.persist('scenario:add');
  renderProjectScenarioPanel();
}

export function projectEditScenario(id) {
  const data = ProjectState.ensureProject();
  const s = data.project.scenarios.find(x => x.id === id);
  if (!s) return;
  const name = prompt('方案名称', s.name) || s.name;
  const budget = Number(prompt('预算', s.budget) || s.budget);
  const strategy = prompt('策略：高效优先、均衡、低价优先、聚焦（内部值 greedy/balanced/cheapest/focused）', s.strategy) || s.strategy;
  const dayLimit = Number(prompt('天数上限', s.dayLimit) || s.dayLimit);
  ProjectState.upsertScenario({ ...s, name, budget, strategy, dayLimit });
  ProjectState.persist('scenario:edit');
  renderProjectScenarioPanel();
  if (typeof window.roiResetAll === 'function') window.roiResetAll();
}

export function projectRemoveScenario(id) {
  ProjectState.removeScenario(id);
  ProjectState.persist('scenario:remove');
  renderProjectScenarioPanel();
  if (typeof window.roiResetAll === 'function') window.roiResetAll();
}

export function initProjectScenarioPanel() {
  window.projectSetScenario = projectSetScenario;
  window.projectAddScenario = projectAddScenario;
  window.projectEditScenario = projectEditScenario;
  window.projectRemoveScenario = projectRemoveScenario;
  if ($('roi-scenario-area') || $('sim-result')) renderProjectScenarioPanel();
}
