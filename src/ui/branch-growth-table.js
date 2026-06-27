/**
 * GBT v3.4 — Branch Growth Table
 * 分支等级明细表模块，统一展示每级消耗、收益、战力贡献与累计值。
 */
import { normalizeBranch, getBranchLevelCost, getBranchLevelGains, calcBranchPower } from '../engine/simulator.js';

function nameOf(list, id, fallback) {
  const item = (list || []).find(x => x.id === id);
  return item ? item.name : fallback;
}

export function buildBranchGrowthRows(S, branchRaw) {
  const branch = normalizeBranch(branchRaw);
  if (!branch) return [];
  let totalCost = 0;
  const totalGains = {};
  const rows = [];
  for (let lv = 1; lv <= branch.maxLevel; lv++) {
    const cost = getBranchLevelCost(S, branch, lv);
    const gains = getBranchLevelGains(S, branch, lv);
    const power = Math.round(calcBranchPower(S, branch, lv - 1));
    totalCost += cost;
    Object.entries(gains).forEach(([k,v]) => { totalGains[k] = (totalGains[k] || 0) + v; });
    rows.push({ level: lv, cost, gains, power, totalCost, totalGains: { ...totalGains } });
  }
  return rows;
}

export function renderBranchGrowthTable(containerId, S, branchRaw) {
  const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!el) return;
  const branch = normalizeBranch(branchRaw);
  if (!branch) {
    el.innerHTML = '<div class="help-block">请选择一个养成分支查看等级明细。</div>';
    return;
  }
  const rows = buildBranchGrowthRows(S, branch);
  const attrNames = S.attrs || [];
  el.innerHTML = `
    <div class="section" style="margin-top:12px">
      <div class="section-header"><span class="section-title">📋 分支成长数值表 — ${branch.name}</span></div>
      <div class="section-body">
        <div class="tbl-wrap" style="max-height:360px;overflow:auto">
          <table class="tbl">
            <thead><tr><th>等级</th><th>本级总消耗</th><th>本级属性收益</th><th>本级战力贡献</th><th>累计消耗</th></tr></thead>
            <tbody>
              ${rows.map(r => {
                const gainText = Object.entries(r.gains).map(([aid,v]) => `${nameOf(attrNames, aid, aid)} +${v}`).join('，') || '-';
                return `<tr><td>第${r.level}级</td><td>${r.cost}</td><td>${gainText}</td><td style="color:var(--accent2);font-weight:600">${r.power}</td><td>${r.totalCost}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

export default renderBranchGrowthTable;
