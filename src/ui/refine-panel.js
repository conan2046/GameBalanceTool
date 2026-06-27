/**
 * 精炼系统计算器
 * 铁律 #2: 编辑委托 openBranchModal('l1', 'b_refine')
 * 铁律 #4: 属性读 attrs.js
 * 铁律 #7: 卡片对齐已有组件
 */

import { getAttrName } from '../data/attrs.js';

/**
 * 渲染精炼面板 → #refine-panel
 * 数据源: window.EQUIPMENT_REFINE（由 saveBranch 同步）
 */
export function renderRefinePanel() {
  const container = document.getElementById('refine-panel');
  if (!container) return;

  const rf = window.EQUIPMENT_REFINE || window.EQUIPMENT_DATA?.refine || {};
  if (!rf || !rf.maxLevel) {
    container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px">精炼系统尚未配置。请在「三层养成线」→ 绝世武器系统 → 精炼系统 编辑。</div>';
    return;
  }

  const maxLvl = rf.maxLevel;
  const dmgPer = ((rf.perLevel?.damageBonus || 0) * 100).toFixed(1);
  const redPer = ((rf.perLevel?.damageReduction || 0) * 100).toFixed(1);
  const baseCost = rf.stones?.baseCost || 100;
  const mat = rf.stones?.material || '精炼晶石';
  const mult = rf.stones?.costMultiplier || 1.5;

  // 计算各等级成本
  var rows = [];
  var cumulCost = 0;
  for (var i = 1; i <= maxLvl; i++) {
    var lvlCost = Math.round(baseCost * Math.pow(mult, i - 1));
    cumulCost += lvlCost;
    rows.push({ lv: i, cost: lvlCost, cumul: cumulCost,
      dmg: (i * parseFloat(dmgPer)).toFixed(1),
      red: (i * parseFloat(redPer)).toFixed(1)
    });
  }

  // 摘要卡片
  var html = '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
  html += _statCard('最大等级', '第'+maxLvl+'级', 'var(--accent)');
  html += _statCard('每级增伤', '+'+dmgPer+'%', 'var(--danger)');
  html += _statCard('每级减伤', '+'+redPer+'%', 'var(--accent2)');
  html += _statCard('材料', mat, 'var(--warning)');
  html += _statCard('基础消耗', '×'+baseCost, 'var(--text2)');
  html += _statCard('累计总消耗', '×'+cumulCost.toLocaleString(), 'var(--success)');
  html += '</div>';

  // 等级明细表
  html += '<table class="tbl"><thead><tr>';
  html += '<th>等级</th><th>单级消耗</th><th>累计消耗</th><th>增伤%</th><th>减伤%</th>';
  html += '</tr></thead><tbody>';
  rows.forEach(function(r) {
    html += '<tr style="text-align:center">';
    html += '<td><b>第'+r.lv+'级</b></td>';
    html += '<td>'+r.cost.toLocaleString()+'</td>';
    html += '<td style="color:var(--warning)">'+r.cumul.toLocaleString()+'</td>';
    html += '<td style="color:var(--danger)">+'+r.dmg+'%</td>';
    html += '<td style="color:var(--accent2)">+'+r.red+'%</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  container.innerHTML = html;
}

function _statCard(label, value, color) {
  return '<div style="flex:1;min-width:100px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);text-align:center">'+
    '<div style="font-size:10px;color:var(--text3);margin-bottom:4px">'+label+'</div>'+
    '<div style="font-size:16px;font-weight:700;color:'+color+'">'+value+'</div>'+
    '</div>';
}
