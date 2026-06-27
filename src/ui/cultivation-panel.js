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
const openLines = new Set();

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
        var name = getAttrName(a.attrId);
        return '<span style="color:var(--success)">'+name+' <b>+'+a.val+'</b><small style="color:var(--text3);margin-left:4px">'+getCurveName(a.cvId)+'</small></span>';
      }).join('')
    : '<span style="color:var(--text3)">无属性</span>';

  var item = document.createElement('div');
  item.className = 'rule-item';
  item.innerHTML =
    '<div class="rule-badge">分支</div>' +
    '<div class="rule-name" style="font-size:14px;font-weight:700">' + b.name + '</div>' +
    '<div class="rule-lvl" style="display:flex;align-items:center;gap:6px;margin:4px 0">' +
      '<span style="font-size:12px;color:var(--text3)">等级上限</span>' +
      '<span style="font-size:14px;color:var(--warning);font-weight:700">第' + b.maxLevel + '级</span>' +
    '</div>' +
    '<div class="rule-cost" style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px;color:var(--text2)">' +
      costHtml +
    '</div>' +
    '<div class="rule-attr" style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px">' +
      attrHtml +
    '</div>' +
    '<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">' +
      '<button class="btn btn-ghost btn-xs" onclick="previewBranchCurve(\''+line.id+'\',\''+b.id+'\')">预览曲线</button>' +
      '<button class="btn btn-ghost btn-xs" onclick="openBranchModal(\''+line.id+'\',\''+b.id+'\')">编辑</button>' +
      '<button class="btn btn-danger btn-xs" onclick="delBranch(\''+line.id+'\',\''+b.id+'\')">删除</button>' +
    '</div>';

  return item;
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
