/**
 * GBT v3.3 — Cultivation Branch Editor
 * 将养成系统分支编辑器从 index.html 内联逻辑中拆出，并统一复用 Curve Binding Component。
 */

import { getAttrName } from '../data/attrs.js';
import { calculateCurveValue } from '../curve/curve-library.js';
import { buildCurveOptions, createCurveSelectHTML, getCurveById, getCurveName, escapeHtml } from './components/curve-binding.js';
import { renderCultPanel } from './cultivation-panel.js';

const $ = (id) => document.getElementById(id);

function getState() {
  return window.ProjectState && typeof window.ProjectState.get === 'function' ? window.ProjectState.get() : window.S;
}

function toast(msg, type) {
  if (typeof window.toast === 'function') window.toast(msg, type);
  else console.log('[branch-editor]', msg);
}

function persist() {
  if (typeof window.save === 'function') window.save();
  if (window.ProjectState && typeof window.ProjectState.emit === 'function') {
    window.ProjectState.emit('cultivation-change');
    window.ProjectState.emit('curve-binding-change');
  }
}

function normalizeBranch(branch = {}) {
  const b = { ...branch };
  if (!Array.isArray(b.consumes)) {
    b.consumes = b.resId ? [{ resId: b.resId, qty: b.qty || 1, cvId: b.cvId || '' }] : [];
  }
  if (!b.consumes.length) b.consumes = [{ resId: '', qty: 1, cvId: '' }];
  if (!Array.isArray(b.gains)) {
    b.gains = b.attrId ? [{ attrId: b.attrId, val: b.attrVal || 10, cvId: b.cvId || '' }] : [];
  }
  b.gains = b.gains.map(g => ({ ...g, cvId: g.cvId || '' }));
  if (!b.gains.length) b.gains = [{ attrId: '', val: 10, cvId: '' }];
  b.maxLevel = Number(b.maxLevel) || 10;
  return b;
}

function getLine(lid) {
  const S = getState();
  return S && Array.isArray(S.cultivations) ? S.cultivations.find(x => x.id === lid) : null;
}

function getBranch(lid, bid) {
  const line = getLine(lid);
  return line && Array.isArray(line.branches) ? line.branches.find(x => x.id === bid) : null;
}

function resourceOptions(selectedId = '') {
  const S = getState();
  return (S.resources || []).map(r => `<option value="${escapeHtml(r.id)}"${r.id === selectedId ? ' selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
}

function attrOptions(selectedId = '') {
  const S = getState();
  const base = (S.attrs || []).map(a => `<option value="${escapeHtml(a.id)}"${a.id === selectedId ? ' selected' : ''}>${escapeHtml(a.name)}</option>`).join('');
  const extra = [
    { id: 'dmgBonus', name: '增伤' },
    { id: 'dmgRed', name: '减伤' }
  ].map(a => `<option value="${a.id}"${a.id === selectedId ? ' selected' : ''}>${a.name}</option>`).join('');
  return base + extra;
}

function makeRemoveButton() {
  return '<button class="btn btn-danger btn-xs" data-row-remove type="button">删</button>';
}

export function renderBranchCostRows(rows = []) {
  const wrap = $('branch-cost-rows');
  if (!wrap) return;
  wrap.innerHTML = '';
  rows.forEach(row => addBranchCostRow(row, rows.length > 1));
  bindRowRemove(wrap);
}

export function renderBranchAttrRows(rows = []) {
  const wrap = $('branch-attr-rows');
  if (!wrap) return;
  wrap.innerHTML = '';
  rows.forEach(row => addBranchAttrRow(row, rows.length > 1));
  bindRowRemove(wrap);
}

function bindRowRemove(root) {
  root.querySelectorAll('[data-row-remove]').forEach(btn => {
    btn.onclick = () => btn.closest('[data-branch-row]')?.remove();
  });
}

export function addBranchCostRow(row = { resId: '', qty: 1, cvId: '' }) {
  const wrap = $('branch-cost-rows');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'grid-3';
  div.dataset.branchRow = 'cost';
  div.style.cssText = 'gap:6px;margin-bottom:4px';
  div.innerHTML =
    `<select class="fc" data-bc-res style="font-size:12px">${resourceOptions(row.resId || '')}</select>` +
    `<input type="number" class="fc" data-bc-qty value="${Number(row.qty) || 1}" min="1" style="font-size:12px">` +
    `<div style="display:flex;gap:4px">${createCurveSelectHTML({ attr: 'data-bc-cv', selectedId: row.cvId || '', style: 'font-size:11px;flex:1' })}${makeRemoveButton()}</div>`;
  wrap.appendChild(div);
  bindRowRemove(div);
}

export function addBranchAttrRow(row = { attrId: '', val: 10, cvId: '' }) {
  const wrap = $('branch-attr-rows');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'grid-3';
  div.dataset.branchRow = 'attr';
  div.style.cssText = 'gap:6px;margin-bottom:4px';
  div.innerHTML =
    `<select class="fc" data-ba-attr style="font-size:12px">${attrOptions(row.attrId || '')}</select>` +
    `<input type="number" class="fc" data-ba-val value="${Number(row.val) || 10}" min="0" style="font-size:12px">` +
    `<div style="display:flex;gap:4px">${createCurveSelectHTML({ attr: 'data-ba-cv', selectedId: row.cvId || '', style: 'font-size:11px;flex:1' })}${makeRemoveButton()}</div>`;
  wrap.appendChild(div);
  bindRowRemove(div);
}

export function openBranchModal(lid, bid = '') {
  const line = getLine(lid);
  if (!line) return;
  const branch = bid ? normalizeBranch(getBranch(lid, bid)) : normalizeBranch({ id: '', name: '', maxLevel: 10 });
  $('b-lid').value = lid;
  $('b-id').value = branch.id || '';
  $('b-name').value = branch.name || '';
  $('b-max').value = branch.maxLevel || 10;
  if ($('mb-title')) $('mb-title').textContent = `隶属于 [${line.name}] 的二级进化规则设定`;
  renderBranchCostRows(branch.consumes);
  renderBranchAttrRows(branch.gains);
  const modal = $('m-branch');
  if (modal) modal.style.display = 'flex';
}

function readCostRows() {
  const rows = [];
  document.querySelectorAll('#branch-cost-rows [data-branch-row="cost"]').forEach(row => {
    const res = row.querySelector('[data-bc-res]');
    const qty = row.querySelector('[data-bc-qty]');
    const cv = row.querySelector('[data-bc-cv]');
    if (res && res.value) rows.push({ resId: res.value, qty: parseInt(qty?.value || '1', 10) || 1, cvId: cv?.value || '' });
  });
  return rows;
}

function readGainRows() {
  const rows = [];
  document.querySelectorAll('#branch-attr-rows [data-branch-row="attr"]').forEach(row => {
    const attr = row.querySelector('[data-ba-attr]');
    const val = row.querySelector('[data-ba-val]');
    const cv = row.querySelector('[data-ba-cv]');
    if (attr && attr.value) rows.push({ attrId: attr.value, val: parseInt(val?.value || '10', 10) || 10, cvId: cv?.value || '' });
  });
  return rows;
}

function calcBoundValue(base, cvId, level) {
  const cv = getCurveById(cvId);
  const mult = cv ? calculateCurveValue(cv, level) : 1;
  return Math.round((Number(base) || 0) * mult);
}

export function previewBranch() {
  const lid = $('b-lid')?.value || '';
  const bid = $('b-id')?.value || '';
  const name = $('b-name')?.value.trim() || '未命名';
  const maxLv = parseInt($('b-max')?.value || '10', 10) || 10;
  let costs = readCostRows();
  let gains = readGainRows();
  if ((!costs.length || !gains.length) && bid) {
    const b = normalizeBranch(getBranch(lid, bid));
    costs = costs.length ? costs : b.consumes;
    gains = gains.length ? gains : b.gains;
  }
  if (!costs.length || !gains.length) return toast('至少配置一条消耗和一条属性才能预览', 'e');

  const S = getState();
  let html = '<div style="max-height:400px;overflow:auto"><table class="tbl" style="min-width:620px"><thead><tr><th>等级</th>';
  costs.forEach(c => {
    const res = (S.resources || []).find(x => x.id === c.resId);
    html += `<th>消耗 ${escapeHtml(res ? res.name : '?')}<div class="help-block">${escapeHtml(getCurveName(c.cvId))}</div></th>`;
  });
  gains.forEach(g => {
    html += `<th>获得 ${escapeHtml(getAttrName(g.attrId))}<div class="help-block">${escapeHtml(getCurveName(g.cvId))}</div></th>`;
  });
  html += '</tr></thead><tbody>';
  for (let lv = 1; lv <= maxLv; lv++) {
    html += `<tr><td style="font-weight:bold;color:var(--accent2)">第${lv}级</td>`;
    costs.forEach(c => { html += `<td style="color:var(--danger);font-variant-numeric:tabular-nums">×${calcBoundValue(c.qty, c.cvId, lv).toLocaleString()}</td>`; });
    gains.forEach(g => { html += `<td style="color:var(--success);font-variant-numeric:tabular-nums">+${calcBoundValue(g.val, g.cvId, lv).toLocaleString()}</td>`; });
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  showPreviewModal(`[${name}] 每级详细数据`, html);
}

function showPreviewModal(title, bodyHtml) {
  if (typeof window.showToastModal === 'function') return window.showToastModal(title, bodyHtml);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:15px';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  const panel = document.createElement('div');
  panel.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:8px;width:100%;max-width:760px;max-height:90%;display:flex;flex-direction:column';
  panel.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><span style="font-size:14px;font-weight:600">${escapeHtml(title)}</span><button class="btn btn-ghost btn-xs" data-close>关闭</button></div><div style="padding:16px;overflow:auto">${bodyHtml}</div>`;
  panel.querySelector('[data-close]').onclick = () => overlay.remove();
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

function syncRefineBranch(id, maxLevel, consumes, gains) {
  if (id !== 'b_refine' || !window.EQUIPMENT_REFINE) return;
  const rf = window.EQUIPMENT_REFINE;
  rf.maxLevel = maxLevel;
  if (consumes.length) {
    const S = getState();
    const res = (S.resources || []).find(r => r.id === consumes[0].resId);
    rf.stones.material = res ? res.name : '精炼晶石';
    rf.stones.baseCost = consumes[0].qty || 100;
    rf.stones.costMultiplier = consumes[0].cvId ? 1.5 : 1;
  }
  rf.perLevel.damageBonus = 0;
  rf.perLevel.damageReduction = 0;
  gains.forEach(g => {
    if (g.attrId === 'dmgBonus') rf.perLevel.damageBonus = (g.val || 0) / 100;
    if (g.attrId === 'dmgRed') rf.perLevel.damageReduction = (g.val || 0) / 100;
  });
}

export function saveBranch() {
  const lid = $('b-lid')?.value || '';
  const id = $('b-id')?.value || '';
  const line = getLine(lid);
  if (!line) return;
  const name = $('b-name')?.value.trim() || '';
  const maxLevel = parseInt($('b-max')?.value || '10', 10) || 10;
  if (!name) return toast('明细分支必起名称', 'e');
  const consumes = readCostRows();
  const gains = readGainRows();
  if (!consumes.length) return toast('至少配置一条消耗规则', 'e');
  if (!gains.length) return toast('至少配置一条属性收益', 'e');
  if (id) {
    const b = getBranch(lid, id);
    if (b) Object.assign(b, { name, maxLevel, consumes, gains });
  } else {
    line.branches = line.branches || [];
    line.branches.push({ id: 'b' + (Date.now() % 100000), name, maxLevel, consumes, gains });
  }
  syncRefineBranch(id, maxLevel, consumes, gains);
  if (typeof window.cm === 'function') window.cm('m-branch');
  renderCultPanel();
  persist();
}

export function deleteBranch(lid, bid) {
  const line = getLine(lid);
  if (line) line.branches = (line.branches || []).filter(x => x.id !== bid);
  if (bid === 'b_refine' && window.EQUIPMENT_REFINE) {
    const rf = window.EQUIPMENT_REFINE;
    rf.maxLevel = 10;
    rf.perLevel.damageBonus = 0.03;
    rf.perLevel.damageReduction = 0.06;
    rf.stones.material = '精炼晶石';
    rf.stones.baseCost = 100;
    rf.stones.costMultiplier = 1.5;
  }
  renderCultPanel();
  persist();
}

export function installBranchEditor() {
  window.openBranchModal = openBranchModal;
  window.renderBranchCostRows = renderBranchCostRows;
  window.renderBranchAttrRows = renderBranchAttrRows;
  window.addBranchCostRow = () => addBranchCostRow();
  window.addBranchAttrRow = () => addBranchAttrRow();
  window.previewBranch = previewBranch;
  window.saveBranch = saveBranch;
  window.delBranch = deleteBranch;
  window.buildCurveOptions = buildCurveOptions;
}
