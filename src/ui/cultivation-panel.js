/**
 * 养成树分支 UI 面板
 * 铁律 #2: 复用 m-branch / m-line 弹窗（由 index.html 内联代码提供）
 * 铁律 #3: 函数挂载 window
 * 铁律 #7: 排版对齐 .rule-item 已有组件
 */

import { getAttrName } from '../data/attrs.js';
import { getCurveName } from './components/curve-binding.js';
import { renderBranchGrowthTable } from './branch-growth-table.js';

/** 主线展开状态 */
const openLines = new Set(['l1']);

/**
 * 渲染养成树 → #cult-tree
 * 替代 index.html 内联 rCult()，由 index-loader.js 在 DOMContentLoaded 后调用
 */
export function renderCultPanel() {
  const container = document.getElementById('cult-tree');
  if (!container) return;
  container.innerHTML = '';

  const S = window.S;
  if (!S || !S.cultivations || !S.cultivations.length) return;

  S.cultivations.forEach(line => {
    const div = document.createElement('div');
    div.className = 'cult-row';
    const bc = line.branches && line.branches.length;

    // 主线标题栏 — 复用原版 HTML 结构
    div.innerHTML = `
      <div class="cult-hd" onclick="toggleLine('${line.id}')">
        <div>
          <span style="font-size:14px;font-weight:600">${line.name}</span>
          <span style="font-size:12px;color:var(--text3);margin-left:10px">${line.note||''} (${bc||0}个分支)</span>
        </div>
        <span style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-xs" onclick="openBranchModal('${line.id}')">+ 新增二级分支</button>
          <button class="btn btn-ghost btn-xs" onclick="openLineModal('${line.id}')">编辑</button>
          <button class="btn btn-danger btn-xs" onclick="delLine('${line.id}')">删除</button>
        </span>
      </div>
      <div class="cult-lb${openLines.has(line.id)?' open':''}" id="clb-${line.id}"></div>
    `;

    // 分支卡片
    if (bc) {
      const lb = div.querySelector('#clb-' + line.id);
      line.branches.forEach(b => {
        lb.appendChild(_buildBranchCard(line, b));
      });
    }

    container.appendChild(div);
  });
}

/**
 * 构建单张分支卡片 — 铁律 #7 标准模板
 * badge + 标题 + 等级上限 + 消耗行 + 属性行 + 按钮
 */
function _buildBranchCard(line, b) {
  // 兼容旧格式：单条 → 数组
  var costs = b.consumes || (b.resId ? [{resId:b.resId, qty:b.qty||1, cvId:b.cvId||''}] : []);
  var attrs = b.gains  || (b.attrId ? [{attrId:b.attrId, val:b.attrVal||10}] : []);
  var isRefine = b.id === 'b_refine';

  // 消耗行
  var costHtml = costs.length
    ? costs.map(function(c) {
        var r = (window.S&&window.S.resources) ? window.S.resources.find(function(rr){return rr.id===c.resId;}) : null;
        return '<span>'+(r?r.name:(c.resId||'—'))+' <b>×'+c.qty+'</b><small style="color:var(--text3);margin-left:4px">'+getCurveName(c.cvId)+'</small></span>';
      }).join('')
    : '<span style="color:var(--text3)">无消耗</span>';

  // 属性行
  var attrHtml = attrs.length
    ? attrs.map(function(a) {
        var name = getBranchAttrLabel(a.attrId);
        var suffix = isPercentBranchAttr(a.attrId) ? '%' : '';
        return '<span style="color:var(--success)">'+name+' <b>+'+a.val+suffix+'</b><small style="color:var(--text3);margin-left:4px">'+getCurveName(a.cvId)+'</small></span>';
      }).join('')
    : '<span style="color:var(--text3)">无属性</span>';
  var refineSummary = isRefine ? buildRefineSummary(b, costs, attrs) : '';

  var item = document.createElement('div');
  item.className = 'cult-branch-card';
  item.innerHTML =
    '<div class="cult-branch-head">' +
      '<div class="cult-branch-title">' +
        '<span class="badge badge-w">'+(isRefine ? '精炼' : '分支')+'</span>' +
        '<span class="cult-branch-name">' + b.name + '</span>' +
        '<span class="cult-branch-limit">等级上限: <b style="color:var(--warning)">第' + b.maxLevel + '级</b></span>' +
      '</div>' +
      '<div class="cult-branch-actions">' +
        '<button class="btn btn-ghost btn-xs" onclick="previewBranchCurve(\''+line.id+'\',\''+b.id+'\')">预览曲线</button>' +
        '<button class="btn btn-ghost btn-xs" onclick="openBranchModal(\''+line.id+'\',\''+b.id+'\')">编辑</button>' +
        '<button class="btn btn-danger btn-xs" onclick="delBranch(\''+line.id+'\',\''+b.id+'\')">删除</button>' +
      '</div>' +
    '</div>' +
    '<div class="cult-branch-meta">' +
      '<div>每级消耗: '+costHtml+'</div>' +
      '<div>属性增益: '+attrHtml+'</div>' +
    '</div>' +
    refineSummary +
    '';

  return item;
}

function getBranchAttrLabel(attrId) {
  if (attrId === 'dmgBonus') return '增伤';
  if (attrId === 'dmgRed') return '减伤';
  return getAttrName(attrId);
}

function isPercentBranchAttr(attrId) {
  return attrId === 'dmgBonus' || attrId === 'dmgRed';
}

function buildRefineSummary(branch, costs, gains) {
  var firstCost = costs[0] || {};
  var resource = (window.S && window.S.resources) ? window.S.resources.find(function(r){ return r.id === firstCost.resId; }) : null;
  var material = resource ? resource.name : (firstCost.resId || '未配置材料');
  var baseCost = Number(firstCost.qty || 0);
  var gainText = gains.length
    ? gains.map(function(g){ return getBranchAttrLabel(g.attrId) + ' +' + (g.val || 0) + (isPercentBranchAttr(g.attrId) ? '%' : ''); }).join(' / ')
    : '未配置收益';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-top:8px;font-size:11px">' +
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px"><span style="color:var(--text3)">材料</span><b style="display:block;color:var(--warning)">'+material+'</b></div>' +
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px"><span style="color:var(--text3)">单级基础消耗</span><b style="display:block;color:var(--text)">'+baseCost.toLocaleString()+'</b></div>' +
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px"><span style="color:var(--text3)">每级收益</span><b style="display:block;color:var(--success)">'+gainText+'</b></div>' +
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px"><span style="color:var(--text3)">归属模型</span><b style="display:block;color:var(--accent2)">三层养成线</b></div>' +
  '</div>';
}

/**
 * 预览分支成长曲线 (Chart.js)
 * 铁律 #2: 此函数作为辅助展示，不建新弹窗
 */
export function previewBranchCurve(lid, bid) {
  var line = window.S.cultivations.find(function(x){return x.id===lid;});
  if (!line) return;
  var b = line.branches.find(function(x){return x.id===bid;});
  if (!b) return;

  var section = document.getElementById('cult-chart-section');
  var title = document.getElementById('cult-chart-title');
  if (section) section.style.display = '';
  if (title) title.textContent = line.name + ' > ' + b.name;

  // 委托给 growth-chart 模块
  if (typeof window.drawCultivationCurve === 'function') {
    window.drawCultivationCurve('cult-chart-canvas', b, window.S.curves || [], window.S);
  }

  var body = section ? section.querySelector('.section-body') : null;
  if (body && !document.getElementById('cult-growth-table')) {
    var wrap = document.createElement('div');
    wrap.id = 'cult-growth-table';
    body.appendChild(wrap);
  }
  renderBranchGrowthTable('cult-growth-table', window.S, b);
}

/**
 * 切换主线展开/折叠
 * 替换 index.html 内联 toggleLine，统一使用 openLines Set
 */
export function toggleLine(id) {
  if (openLines.has(id)) openLines.delete(id);
  else openLines.add(id);
  renderCultPanel();
}
