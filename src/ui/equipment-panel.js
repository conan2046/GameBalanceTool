/**
 * 装备面板 UI 模块。
 * 包含槽位编辑器、品质编辑器、精炼计算器和总战力预览。
 * 通过 ES module export + index-loader 挂载到 window，兼容旧 inline onclick。
 */

import { EQUIPMENT_DATA, calcEquipmentStats, normalizeEquipmentLabels } from '../data/equipment.js';
import { ATTR_MAP, getAttrName } from '../data/attrs.js';

const TYPE_LABEL = { attack: '攻击', defense: '防御', sub: '辅助' };

const QUALITY_COLORS = [
  { label: '白色', value: '#cccccc' },
  { label: '绿色', value: '#2ed573' },
  { label: '蓝色', value: '#4fc3f7' },
  { label: '紫色', value: '#ba68c8' },
  { label: '橙色', value: '#ffa502' },
  { label: '红色', value: '#ff4757' },
  { label: '青色', value: '#1dd1a1' },
  { label: '粉色', value: '#fd79a8' },
  { label: '金色', value: '#f9ca24' },
  { label: '深紫', value: '#6c5ce7' },
];

/**
 * 鍒濆鍖栬澶囬潰鏉? */
export function initEquipmentPanel() {
  normalizeEquipmentLabels(EQUIPMENT_DATA);
  renderSlotEditor();
  renderQualityEditor();
}

/** 缈昏瘧妲戒綅灞炴€ч敭 鈥?缁熶竴浠?attrs.js 璇诲彇 */
function attrLabel(k) { return getAttrName(k); }

/** 缈昏瘧妲戒綅绫诲瀷 */
function typeLabel(t) { return TYPE_LABEL[t] || t; }

/** 鍝佽川ID 鈫?鍝佽川瀵硅薄 */
function qinfo(id) { return EQUIPMENT_DATA.qualities.find(q => q.id === id); }

// 鈹€鈹€ 妲戒綅缂栬緫寮圭獥 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/** 鎵撳紑妲戒綅缂栬緫寮圭獥 鈥?濮旀墭缁?inline script 鐨?_showSlotModal锛堜笌 m-attr 绛夊脊绐楃粺涓€妯″紡锛?*/
export function openSlotModal(id) {
  if (typeof window._showSlotModal === 'function') {
    window._showSlotModal(id);
  } else {
    console.error('[openSlotModal] _showSlotModal not available yet');
  }
}

/** 淇濆瓨妲戒綅缂栬緫 */
export function saveSlotModal() {
  const id = window._slotEditingId;
  const s = EQUIPMENT_DATA.slots.find(x => x.id === id);
  if (!s) return;
  s.name = document.getElementById('ms-name').value.trim() || s.name;
  s.type = document.getElementById('ms-type').value;
  s.qualities = Array.from(document.querySelectorAll('#ms-qualities input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  // 瑙ｆ瀽灞炴€?鈥?浠庡琛岃〃鍗曡鍙栵紙涓枃鍚?鈫?鑻辨枃key锛?  const attrRows = document.querySelectorAll('#ms-attr-rows > div');
  const attrRows = document.querySelectorAll('#ms-attr-rows > div');
  const newAttrs = {};
  attrRows.forEach(row => {
    const sel = row.querySelector('[data-ms-attr]');
    const val = row.querySelector('[data-ms-val]');
    if (sel && sel.value && val) {
      newAttrs[sel.value] = parseInt(val.value) || 0;
    }
  });
  if (Object.keys(newAttrs).length) s.baseAttrs = newAttrs;
  // 鍏抽棴寮圭獥
  const m = document.getElementById('m-slot');
  if (m) m.style.display = 'none';
  renderSlotEditor();
  console.log('[saveSlotModal] saved for slot:', id);
}

/** 鍒犻櫎妲戒綅 */
export function deleteSlot(slotId) {
  const idx = EQUIPMENT_DATA.slots.findIndex(s => s.id === slotId);
  if (idx === -1) return;
  EQUIPMENT_DATA.slots.splice(idx, 1);
  renderSlotEditor();
  renderQualityEditor();
  console.log('[deleteSlot] deleted:', slotId);
}

/** cm 鍑芥暟 - 鍏抽棴寮圭獥 */
export function cm(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

/** 鏂板妲戒綅 */
export function addSlot() {
  const count = EQUIPMENT_DATA.slots.length + 1;
  const attrs = Array.isArray(window.S?.attrs) ? window.S.attrs : [];
  const baseAttrs = {};
  attrs.forEach(attr => { baseAttrs[attr.id] = 3; });
  EQUIPMENT_DATA.slots.push({
    id: 'slt_custom_' + count,
    name: '自定义槽位' + count,
    type: 'sub',
    qualities: ['white', 'green', 'blue', 'purple', 'orange'],
    baseAttrs: Object.keys(baseAttrs).length ? baseAttrs : { a1: 3, a2: 3, a3: 3 }
  });
  renderSlotEditor();
  renderQualityEditor();
}

/** 恢复默认装备预设 */
export function resetEquipment() {
  const defSlots = [
    { id: 'slt_wep', name: '武器', type: 'attack', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 50, a3: 100 } },
    { id: 'slt_helm', name: '头盔', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a2: 30, a3: 80 } },
    { id: 'slt_armor', name: '衣服', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a2: 40, a3: 100 } },
    { id: 'slt_bracer', name: '护腕', type: 'defense', qualities: ['blue', 'purple', 'orange'], baseAttrs: { a1: 10, a2: 15 } },
    { id: 'slt_belt', name: '腰带', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a3: 120, a2: 20 } },
    { id: 'slt_boots', name: '鞋子', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 15, a3: 80 } },
    { id: 'slt_ring1', name: '戒指A', type: 'sub', qualities: ['purple', 'orange', 'red'], baseAttrs: { a1: 5, a2: 5, a3: 5 } },
    { id: 'slt_ring2', name: '戒指B', type: 'sub', qualities: ['purple', 'orange', 'red'], baseAttrs: { a1: 5, a2: 5, a3: 5 } },
    { id: 'slt_neck', name: '项链', type: 'sub', qualities: ['blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 8, a2: 8, a3: 8 } }
  ];
  const arr = EQUIPMENT_DATA.slots;
  arr.length = 0;
  defSlots.forEach(s => arr.push(s));
  initEquipmentPanel();
}

/**
 * 娓叉煋妲戒綅缂栬緫鍣? * 鈿狅笍 缁濆涓嶄娇鐢?onclick锛屼娇鐢ㄤ簨浠跺鎵? */
function renderSlotEditor() {
  const container = document.getElementById('slot-editor');
  if (!container) return;

  container.innerHTML = EQUIPMENT_DATA.slots.map(slot => {
    const attrEntries = Object.entries(slot.baseAttrs);
    return `
    <div class="slot-card" data-slot-id="${slot.id}" style="display:flex;flex-direction:column;gap:4px;position:relative">
      <div class="slot-header">
        <span class="slot-name">${slot.name}</span>
        <span class="slot-type badge badge-a">${typeLabel(slot.type)}</span>
      </div>
      <div class="slot-qualities">
        ${slot.qualities.map(q => {
          const qi = qinfo(q);
          return `<span class="quality-dot" style="background:${qi?qi.color:'#888'}" title="${qi?qi.name:q}"></span>`;
        }).join('')}
      </div>
      <div class="slot-attrs">
        ${attrEntries.map(([k, v]) => `<span>${attrLabel(k)}: ${v}</span>`).join(' ')}
      </div>
      <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:2px;border-top:1px solid var(--border);padding-top:4px">
        <button class="btn btn-ghost btn-xs" data-action="slot-edit" data-slot-id="${slot.id}">编辑</button>
        <button class="btn btn-danger btn-xs" data-action="slot-delete" data-slot-id="${slot.id}">删除</button>
      </div>
    </div>`;
  }).join('');
}

// 鈹€鈹€ 鍏ㄥ眬浜嬩欢濮旀墭锛歞ocument 绾у埆锛屾嫤鎴?data-action 鎸夐挳 鈹€鈹€
(function setupGlobalDelegation() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const slotId = btn.dataset.slotId;
    console.log('[GlobalDelegation] click:', action, slotId);
    
    if (action === 'slot-edit') {
      openSlotModal(slotId);
    } else if (action === 'slot-delete') {
      const s = EQUIPMENT_DATA.slots.find(x => x.id === slotId);
      if (confirm('确认删除槽位“' + (s ? s.name : '') + '”？')) {
        deleteSlot(slotId);
      }
    }
  }, true);
})();

// 鈹€鈹€ 鍝佽川缂栬緫鍣?鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/**
 * 娓叉煋鍝佽川缂栬緫鍣紙妯帓鍙紪杈戝崱鐗囷級
 */
export function renderQualityEditor() {
  const container = document.getElementById('quality-editor');
  if (!container) return;

  container.innerHTML = EQUIPMENT_DATA.qualities.map(q => {
    const colorOpts = QUALITY_COLORS.map(c =>
      `<option value="${c.value}"${q.color === c.value ? ' selected' : ''}>${c.label}</option>`).join('');

    return `
    <div class="quality-card" data-qid="${q.id}" style="flex: 1 1 240px; max-width: calc(20% - 5px); border:1px solid var(--border); border-radius:6px; padding:6px 8px; background:var(--bg2); display:flex; align-items:center; gap:4px;">
      <span class="qc-dot" style="display:inline-block; width:14px; height:14px; background:${q.color}; border-radius:50%; border:1px solid rgba(255,255,255,0.2); flex-shrink:0;"></span>
      <div style="display:flex; align-items:center; gap:4px; font-size:12px; width:100%;">
        <select style="font-size:12px; flex:1; min-width:0; border:1px solid var(--border); border-radius:4px; padding:2px 4px; background:var(--bg); color:var(--text); box-sizing:border-box; text-align:center;" data-qa-field="color" data-qa-id="${q.id}">${colorOpts}</select>
        <span style="color:var(--text3); flex-shrink:0;">倍率</span>
        <input type="number" style="font-size:12px; width:48px; border:1px solid var(--border); border-radius:4px; padding:2px 4px; background:var(--bg); color:var(--text); box-sizing:border-box; text-align:center;" value="${q.mult}" step="0.1" min="0" data-qa-field="mult" data-qa-id="${q.id}">
        <span style="color:var(--text3); flex-shrink:0;">槽位</span>
        <input type="number" style="font-size:12px; width:40px; border:1px solid var(--border); border-radius:4px; padding:2px 4px; background:var(--bg); color:var(--text); box-sizing:border-box; text-align:center;" value="${q.bonusSlots}" min="0" data-qa-field="bonusSlots" data-qa-id="${q.id}">
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('[data-qa-field]').forEach(el => {
    el.addEventListener('change', (e) => {
      const qid = el.dataset.qaId;
      const field = el.dataset.qaField;
      const quality = EQUIPMENT_DATA.qualities.find(q => q.id === qid);
      if (!quality) return;
      if (field === 'mult') quality.mult = parseFloat(el.value) || 0;
      else if (field === 'bonusSlots') quality.bonusSlots = parseInt(el.value) || 0;
      else if (field === 'color') {
        quality.color = el.value;
        const card = el.closest('.quality-card');
        if (card) card.querySelector('.qc-dot').style.background = el.value;
      }
    });
  });
}

/**
 * 棰勮鍝佽川鏁堟灉
 */
export function previewQualityEffect(qualityId, baseValue) {
  const quality = EQUIPMENT_DATA.qualities.find(q => q.id === qualityId);
  if (!quality) return;

  const result = parseInt(baseValue) * quality.mult;
  console.log(`鍝佽川 ${quality.name} 鏁堟灉: ${baseValue} 脳 ${quality.mult} = ${result}`);
}

/**
 * 璁＄畻瑁呭鎬绘垬鍔涢瑙? */
export function calcEquipTotalPower(equippedItems) {
  if (!equippedItems || !equippedItems.length) return 0;

  const attrs = Array.isArray(window.S?.attrs) ? window.S.attrs : [];
  const weightMap = Object.fromEntries(attrs.map(attr => [attr.id, Number(attr.weight || 0)]));
  let totalPower = 0;

  for (const item of equippedItems) {
    const slot = EQUIPMENT_DATA.slots.find(s => s.id === item.slotId);
    const quality = EQUIPMENT_DATA.qualities.find(q => q.id === item.quality);
    if (!slot || !quality) continue;

    const itemMult = quality.mult * (1 + item.refineLevel * EQUIPMENT_DATA.refine.perLevel.damageBonus);
    Object.entries(slot.baseAttrs || {}).forEach(([attrId, value]) => {
      const weight = weightMap[attrId] ?? 1;
      totalPower += Number(value || 0) * weight * itemMult;
    });
  }

  return Math.round(totalPower);
}
/** 鏇存柊绮剧偧鏄剧ず */
export function updateRefineDisplay(level) {
  const lvl = parseInt(level) || 0;
  const maxLvl = EQUIPMENT_DATA.refine.maxLevel;
  const bonus = (lvl * EQUIPMENT_DATA.refine.perLevel.damageBonus * 100).toFixed(1);
  const reduction = (lvl * EQUIPMENT_DATA.refine.perLevel.damageReduction * 100).toFixed(1);
  const totalCost = lvl * EQUIPMENT_DATA.refine.stones.baseCost;

  const lvlVal = document.getElementById('refine-lvl-val');
  const maxVal = document.getElementById('refine-max-val');
  const dmgVal = document.getElementById('refine-dmg-val');
  const redVal = document.getElementById('refine-red-val');
  const costVal = document.getElementById('refine-cost-val');

  if (lvlVal) lvlVal.textContent = lvl;
  if (maxVal) maxVal.textContent = maxLvl;
  if (dmgVal) dmgVal.textContent = '+' + bonus + '%';
  if (redVal) redVal.textContent = '+' + reduction + '%';
  if (costVal) costVal.textContent = '\u00D7' + totalCost;
}

