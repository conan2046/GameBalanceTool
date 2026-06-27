import { ProjectState } from '../core/project-state.js';
import { runPaymentBehaviorSimulation } from '../engine/payment-behavior.js';

const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString();
let editingTierId = '';
let editingPackId = '';
let editingModuleId = '';

function S() {
  return ProjectState.get() || window.S || {};
}

function intentText(intent) {
  if (intent === 'high') return '高';
  if (intent === 'medium') return '中';
  return '低';
}

function riskBadge(risk) {
  const cls = risk.level === 'P1' ? 'badge-w' : risk.level === 'P0' ? 'badge-d' : 'badge-t';
  const label = risk.level === 'P0' ? '零级风险' : risk.level === 'P1' ? '一级风险' : '二级风险';
  return `<span class="badge ${cls}">${label}</span>`;
}

function optionRows(tiers, selectedId) {
  return tiers.map(tier => `<option value="${tier.id}" ${tier.id === selectedId ? 'selected' : ''}>${tier.name}</option>`).join('');
}

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nextId(prefix, list) {
  const ids = new Set((list || []).map(item => item.id));
  let idx = (list || []).length + 1;
  let id = `${prefix}${idx}`;
  while (ids.has(id)) {
    idx += 1;
    id = `${prefix}${idx}`;
  }
  return id;
}

function ensureConfig(state) {
  state.paymentConfig = state.paymentConfig || {};
  state.paymentConfig.playerTiers = Array.isArray(state.paymentConfig.playerTiers) ? state.paymentConfig.playerTiers : [];
  state.paymentConfig.moduleMix = Array.isArray(state.paymentConfig.moduleMix) ? state.paymentConfig.moduleMix : [];
  state.packs = Array.isArray(state.packs) ? state.packs : [];
  return state.paymentConfig;
}

function persist() {
  const state = S();
  ProjectState.bind(state);
  ProjectState.persist?.('payment-config');
  if (typeof window.save === 'function') window.save();
}

function input(id) {
  return document.getElementById(id)?.value ?? '';
}

function itemsToText(items = {}) {
  return Object.entries(items).map(([key, value]) => `${key}:${value}`).join(', ');
}

function textToItems(text = '') {
  return String(text).split(',').reduce((items, raw) => {
    const [key, value] = raw.split(':').map(part => part?.trim());
    if (key && num(value) > 0) items[key] = num(value);
    return items;
  }, {});
}

function targetTiersToText(pack = {}) {
  const tiers = pack.targetTiers || pack.targetTierIds || [];
  return Array.isArray(tiers) ? tiers.join(',') : '';
}

function textToTargetTiers(text = '') {
  return String(text).split(',').map(item => item.trim()).filter(Boolean);
}

function renderTierRow(tier, reportTier) {
  const rowId = `payment-tier-${tier.id}`;
  if (editingTierId === tier.id) {
    return `<tr>
      <td><input class="fc" id="${rowId}-name" value="${esc(tier.name)}" style="text-align:center"></td>
      <td><input class="fc" id="${rowId}-budget" type="number" value="${num(tier.budget)}" style="text-align:center"></td>
      <td><input class="fc" id="${rowId}-roi" type="number" step="0.1" value="${num(tier.roiThreshold, 1)}" style="text-align:center"></td>
      <td><input class="fc" id="${rowId}-repurchase" type="number" value="${num(tier.repurchaseThreshold, 60)}" style="text-align:center"></td>
      <td colspan="4" class="help-block">保存后重新计算实际消费、战力提升和复购意愿。</td>
      <td><button class="btn btn-primary btn-xs" onclick="savePaymentTier('${tier.id}')">保存</button> <button class="btn btn-ghost btn-xs" onclick="cancelPaymentTierEdit()">取消</button></td>
    </tr>`;
  }
  const freeRatio = reportTier?.advantage?.free || 1;
  const lowRatio = reportTier?.advantage?.low_r || 1;
  return `<tr>
    <td style="font-weight:700">${esc(tier.name || tier.id)}</td>
    <td>¥${fmt(tier.budget)}</td>
    <td style="color:var(--warning)">¥${fmt(reportTier?.spent)}</td>
    <td>${num(reportTier?.packRoi).toFixed(2)}x</td>
    <td style="color:var(--accent2);font-weight:700">${fmt(reportTier?.totalPower)}</td>
    <td>${freeRatio.toFixed(2)}x / ${lowRatio.toFixed(2)}x</td>
    <td>${reportTier?.repurchaseScore ?? 0}</td>
    <td>${intentText(reportTier?.repurchaseIntent)}</td>
    <td><button class="btn btn-ghost btn-xs" onclick="editPaymentTier('${tier.id}')">编辑</button> <button class="btn btn-danger btn-xs" onclick="deletePaymentTier('${tier.id}')">删除</button></td>
  </tr>`;
}

function renderPackEditor(pack) {
  const rowId = `payment-pack-${pack.id}`;
  return `<div class="payment-edit-row" style="display:grid;grid-template-columns:1.2fr 90px 1.2fr 1.4fr auto;gap:8px;align-items:center;margin-bottom:8px">
    <input class="fc" id="${rowId}-name" value="${esc(pack.name)}" placeholder="礼包名称">
    <input class="fc" id="${rowId}-price" type="number" value="${num(pack.price)}" placeholder="价格" style="text-align:center">
    <input class="fc" id="${rowId}-targets" value="${esc(targetTiersToText(pack))}" placeholder="目标档位ID，逗号分隔">
    <input class="fc" id="${rowId}-items" value="${esc(itemsToText(pack.items))}" placeholder="资源ID:数量，如 r1:500,r2:5">
    <span><button class="btn btn-primary btn-xs" onclick="savePaymentPack('${pack.id}')">保存</button> <button class="btn btn-ghost btn-xs" onclick="cancelPaymentPackEdit()">取消</button></span>
  </div>`;
}

function renderPackRow(item, pack) {
  if (editingPackId === pack.id) return renderPackEditor(pack);
  const roi = num(item?.roi ?? 0);
  const price = num(item?.price ?? pack.price);
  return `<div class="roi-comp-row">
    <div class="roi-comp-label">${esc(pack.name || item?.name || pack.id)}</div>
    <div class="roi-comp-bar"><div class="roi-comp-fill" style="width:${Math.min(100, roi * 12)}%;background:#4ecca3">投入回报 ${roi.toFixed(2)}倍</div></div>
    <div class="roi-comp-val">¥${fmt(price)}</div>
    <div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn btn-ghost btn-xs" onclick="editPaymentPack('${pack.id}')">编辑</button><button class="btn btn-danger btn-xs" onclick="deletePaymentPack('${pack.id}')">删除</button></div>
  </div>`;
}

function renderModulePie(items = []) {
  const total = items.reduce((sum, item) => sum + Math.max(0, num(item.ratio)), 0);
  const colors = ['#00d6b9', '#6c63ff', '#ffb000', '#ff5d73', '#4cc9f0', '#c77dff', '#80ed99'];
  if (total <= 0) return '<div class="help-block">暂无模块占比数据。</div>';
  let cursor = 0;
  const slices = items.map((item, idx) => {
    const value = Math.max(0, num(item.ratio));
    const start = cursor / total * Math.PI * 2;
    cursor += value;
    const end = cursor / total * Math.PI * 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = 50 + Math.cos(start - Math.PI / 2) * 38;
    const y1 = 50 + Math.sin(start - Math.PI / 2) * 38;
    const x2 = 50 + Math.cos(end - Math.PI / 2) * 38;
    const y2 = 50 + Math.sin(end - Math.PI / 2) * 38;
    return `<path d="M50 50 L${x1.toFixed(3)} ${y1.toFixed(3)} A38 38 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z" fill="${colors[idx % colors.length]}"></path>`;
  }).join('');
  const legend = items.map((item, idx) => `<div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:10px;height:10px;background:${colors[idx % colors.length]};border-radius:2px"></span><span>${esc(item.name || item.id)} ${num(item.ratio).toFixed(1)}%</span></div>`).join('');
  return `<div style="display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:center">
    <svg viewBox="0 0 100 100" width="140" height="140" role="img" aria-label="功能模块投放占比饼图">${slices}<circle cx="50" cy="50" r="18" fill="var(--card)"></circle><text x="50" y="54" text-anchor="middle" fill="#fff" font-size="10">${total.toFixed(0)}%</text></svg>
    <div style="display:grid;gap:6px">${legend}</div>
  </div>`;
}

function renderModuleRow(item) {
  const rowId = `payment-module-${item.id}`;
  if (editingModuleId === item.id) {
    return `<tr>
      <td><input class="fc" id="${rowId}-name" value="${esc(item.name)}" style="text-align:center"></td>
      <td><input class="fc" id="${rowId}-ratio" type="number" step="0.1" value="${num(item.ratio)}" style="text-align:center"></td>
      <td><button class="btn btn-primary btn-xs" onclick="savePaymentModuleMix('${item.id}')">保存</button> <button class="btn btn-ghost btn-xs" onclick="cancelPaymentModuleMixEdit()">取消</button></td>
    </tr>`;
  }
  return `<tr>
    <td>${esc(item.name || item.id)}</td>
    <td>${num(item.ratio).toFixed(1)}%</td>
    <td><button class="btn btn-ghost btn-xs" onclick="editPaymentModuleMix('${item.id}')">编辑</button> <button class="btn btn-danger btn-xs" onclick="deletePaymentModuleMix('${item.id}')">删除</button></td>
  </tr>`;
}

export function renderPaymentPanel() {
  const state = S();
  const config = ensureConfig(state);
  const tiers = config.playerTiers || [];
  const selectedId = $('payment-tier')?.value || tiers[1]?.id || tiers[0]?.id || '';
  const selectedTier = tiers.find(tier => tier.id === selectedId);
  const budgetOverride = parseFloat($('payment-budget')?.value || '');
  const strategy = $('payment-strategy')?.value || 'roi';
  const simulationState = JSON.parse(JSON.stringify(state));
  if (selectedTier && Number.isFinite(budgetOverride)) {
    simulationState.paymentConfig.playerTiers = tiers.map(tier => tier.id === selectedTier.id ? { ...tier, budget: budgetOverride } : tier);
  }
  const report = runPaymentBehaviorSimulation(simulationState, { strategy });

  if ($('payment-tier')) $('payment-tier').innerHTML = optionRows(report.config.playerTiers, selectedId);
  if ($('payment-budget') && selectedTier && !Number.isFinite(budgetOverride)) $('payment-budget').value = selectedTier.budget;

  const tbody = document.querySelector('#payment-tier-table tbody');
  if (tbody) {
    tbody.innerHTML = config.playerTiers.map(tier => renderTierRow(tier, report.tiers.find(item => item.id === tier.id))).join('');
  }

  const purchase = $('payment-purchase-list');
  if (purchase) {
    const selectedResult = report.tiers.find(tier => tier.id === selectedId) || report.tiers[0];
    const packMap = new Map((state.packs || []).map(pack => [pack.id, pack]));
    const purchased = selectedResult?.purchases || [];
    purchase.innerHTML = purchased.length
      ? purchased.map(item => renderPackRow(item, packMap.get(item.packId) || { id: item.packId, name: item.name, price: item.price, items: {} })).join('')
      : '<div class="help-block">当前档位预算不足或没有匹配礼包。可点击右上角新增礼包并设置目标档位。</div>';
    if (editingPackId && !purchased.some(item => item.packId === editingPackId)) {
      const pack = (state.packs || []).find(item => item.id === editingPackId);
      if (pack) purchase.innerHTML += renderPackEditor(pack);
    }
  }

  const moduleBody = document.querySelector('#payment-module-table tbody');
  if (moduleBody) {
    moduleBody.innerHTML = report.moduleMix.items.map(renderModuleRow).join('');
  }
  if ($('payment-module-total')) $('payment-module-total').textContent = `${report.moduleMix.totalRatio.toFixed(1)}%`;
  if ($('payment-module-pie')) $('payment-module-pie').innerHTML = renderModulePie(report.moduleMix.items);

  const risks = $('payment-risk-list');
  if (risks) {
    risks.innerHTML = report.risks.length
      ? report.risks.map(risk => `<div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">${riskBadge(risk)}<span>${risk.message}</span></div>`).join('')
      : '<div class="help-block">当前配置未触发明显商业化风险。</div>';
  }

  return report;
}

export function addPaymentTier() {
  const state = S();
  const config = ensureConfig(state);
  const id = nextId('tier_', config.playerTiers);
  config.playerTiers.push({ id, name: '新付费档位', budget: 0, roiThreshold: 1, repurchaseThreshold: 60 });
  editingTierId = id;
  persist();
  renderPaymentPanel();
}

export function editPaymentTier(id) {
  editingTierId = id;
  renderPaymentPanel();
}

export function savePaymentTier(id) {
  const state = S();
  const tier = ensureConfig(state).playerTiers.find(item => item.id === id);
  if (!tier) return;
  tier.name = input(`payment-tier-${id}-name`).trim() || tier.name || id;
  tier.budget = num(input(`payment-tier-${id}-budget`));
  tier.roiThreshold = num(input(`payment-tier-${id}-roi`), 1);
  tier.repurchaseThreshold = num(input(`payment-tier-${id}-repurchase`), 60);
  editingTierId = '';
  persist();
  renderPaymentPanel();
}

export function cancelPaymentTierEdit() {
  editingTierId = '';
  renderPaymentPanel();
}

export function deletePaymentTier(id) {
  const state = S();
  const config = ensureConfig(state);
  config.playerTiers = config.playerTiers.filter(item => item.id !== id);
  if ($('payment-tier')?.value === id && config.playerTiers[0]) $('payment-tier').value = config.playerTiers[0].id;
  editingTierId = '';
  persist();
  renderPaymentPanel();
}

export function addPaymentPack() {
  const state = S();
  ensureConfig(state);
  const tierId = $('payment-tier')?.value || '';
  const id = nextId('p', state.packs);
  state.packs.push({ id, name: '新礼包', price: 6, tag: '每日特惠', limit: 1, targetTiers: tierId ? [tierId] : [], items: {} });
  editingPackId = id;
  persist();
  renderPaymentPanel();
}

export function editPaymentPack(id) {
  editingPackId = id;
  renderPaymentPanel();
}

export function savePaymentPack(id) {
  const state = S();
  ensureConfig(state);
  const pack = state.packs.find(item => item.id === id);
  if (!pack) return;
  pack.name = input(`payment-pack-${id}-name`).trim() || pack.name || id;
  pack.price = num(input(`payment-pack-${id}-price`));
  pack.targetTiers = textToTargetTiers(input(`payment-pack-${id}-targets`));
  pack.items = textToItems(input(`payment-pack-${id}-items`));
  editingPackId = '';
  persist();
  renderPaymentPanel();
  if (typeof window.rPacks === 'function') window.rPacks();
}

export function cancelPaymentPackEdit() {
  editingPackId = '';
  renderPaymentPanel();
}

export function deletePaymentPack(id) {
  const state = S();
  state.packs = (state.packs || []).filter(item => item.id !== id);
  editingPackId = '';
  persist();
  renderPaymentPanel();
  if (typeof window.rPacks === 'function') window.rPacks();
}

export function addPaymentModuleMix() {
  const state = S();
  const config = ensureConfig(state);
  const id = nextId('module_', config.moduleMix);
  config.moduleMix.push({ id, name: '新功能模块', ratio: 0 });
  editingModuleId = id;
  persist();
  renderPaymentPanel();
}

export function editPaymentModuleMix(id) {
  editingModuleId = id;
  renderPaymentPanel();
}

export function savePaymentModuleMix(id) {
  const state = S();
  const item = ensureConfig(state).moduleMix.find(module => module.id === id);
  if (!item) return;
  item.name = input(`payment-module-${id}-name`).trim() || item.name || id;
  item.ratio = num(input(`payment-module-${id}-ratio`));
  editingModuleId = '';
  persist();
  renderPaymentPanel();
}

export function cancelPaymentModuleMixEdit() {
  editingModuleId = '';
  renderPaymentPanel();
}

export function deletePaymentModuleMix(id) {
  const state = S();
  const config = ensureConfig(state);
  config.moduleMix = config.moduleMix.filter(item => item.id !== id);
  editingModuleId = '';
  persist();
  renderPaymentPanel();
}

export function initPaymentPanel() {
  window.renderPaymentPanel = renderPaymentPanel;
  const tierSelect = $('payment-tier');
  if (tierSelect && !tierSelect.dataset.paymentBound) {
    tierSelect.addEventListener('change', () => {
      const tier = ((S().paymentConfig || {}).playerTiers || []).find(item => item.id === tierSelect.value);
      if ($('payment-budget') && tier) $('payment-budget').value = tier.budget;
      renderPaymentPanel();
    });
    tierSelect.dataset.paymentBound = '1';
  }
  ['payment-budget', 'payment-strategy'].forEach(id => {
    const el = $(id);
    if (el && !el.dataset.paymentBound) {
      el.addEventListener('change', renderPaymentPanel);
      el.dataset.paymentBound = '1';
    }
  });
  if ($('payment-tier-table')) renderPaymentPanel();
}
