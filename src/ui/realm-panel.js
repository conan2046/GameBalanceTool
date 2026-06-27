/**
 * UI模块 - 境界面板
 * 修为12境/炼体12境切换Tab + 详情 + 曲线图
 */

import { REALM_DATA, getRealmDiffMultiplier } from '../data/realms.js';
import { cvVal } from '../data/defaults.js';

let currentRealmType = 'cultivation';
let selectedRealm = null;

/**
 * 初始化境界面板
 */
export function initRealmPanel(curves = []) {
  currentRealmType = 'cultivation';
  selectedRealm = null;
  renderRealmTabs();
  renderRealmList();
}

/**
 * 渲染Tab切换
 */
function renderRealmTabs() {
  const container = document.getElementById('realm-tabs');
  if (!container) return;

  container.innerHTML = `
    <button class="btn ${currentRealmType === 'cultivation' ? 'btn-primary' : 'btn-ghost'}" onclick="switchRealmType('cultivation')">修为</button>
    <button class="btn ${currentRealmType === 'body' ? 'btn-primary' : 'btn-ghost'}" onclick="switchRealmType('body')">炼体</button>
  `;
}

/**
 * 切换境界类型
 */
export function switchRealmType(type) {
  currentRealmType = type;
  selectedRealm = null;
  renderRealmTabs();
  renderRealmList();
  renderRealmDetail();
  renderRealmChart();
}

/**
 * 渲染境界列表
 */
function renderRealmList() {
  const listContainer = document.getElementById('realm-list');
  if (!listContainer) return;

  const realms = REALM_DATA[currentRealmType];
  listContainer.innerHTML = realms.map(r => `
    <div class="realm-item ${selectedRealm === r.tier ? 'active' : ''}" onclick="selectRealm(${r.tier})">
      <div class="realm-tier">${r.tier}阶</div>
      <div class="realm-name">${r.name}</div>
      <div class="realm-mult">×${r.realmMult}</div>
    </div>
  `).join('');
}

/**
 * 选择境界
 */
export function selectRealm(tier) {
  selectedRealm = tier;
  renderRealmList();
  renderRealmDetail();
  renderRealmChart();
}

/**
 * 渲染境界详情
 */
function renderRealmDetail() {
  const detailContainer = document.getElementById('realm-detail');
  if (!detailContainer) return;

  if (!selectedRealm) {
    detailContainer.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px">请选择一个境界查看详情</p>';
    return;
  }

  const realm = REALM_DATA[currentRealmType].find(r => r.tier === selectedRealm);
  if (!realm) return;

  detailContainer.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>境界名称</label>
        <input class="fc" id="rd-name" value="${realm.name}" onchange="updateRealmField('name', this.value)">
      </div>
      <div class="form-group">
        <label>境界系数</label>
        <input type="number" step="0.1" class="fc" id="rd-mult" value="${realm.realmMult}" onchange="updateRealmField('realmMult', parseFloat(this.value))">
      </div>
      <div class="form-group">
        <label>修为阈值</label>
        <input type="number" class="fc" id="rd-xp" value="${realm.xpReq}" onchange="updateRealmField('xpReq', parseInt(this.value))">
      </div>
      <div class="form-group">
        <label>突破率</label>
        <input type="number" class="fc" id="rd-rate" value="${realm.successRate}" onchange="updateRealmField('successRate', parseInt(this.value))">
      </div>
      <div class="form-group">
        <label>修为倒退</label>
        <input type="number" class="fc" id="rd-loss" value="${realm.failPenalty.xpLoss}" onchange="updateRealmField('failPenalty.xpLoss', parseInt(this.value))">
      </div>
      <div class="form-group">
        <label>冷却</label>
        <input type="number" class="fc" id="rd-cooldown" value="${realm.failPenalty.cooldown}" onchange="updateRealmField('failPenalty.cooldown', parseInt(this.value))">
      </div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label>解锁系统</label>
      <input class="fc" id="rd-unlock" value="${realm.unlockSys.join(',')}" onchange="updateRealmField('unlockSys', this.value.split(',').map(s=>s.trim()))">
    </div>
  `;
}

/**
 * 更新境界字段
 */
export function updateRealmField(field, value) {
  if (!selectedRealm) return;
  const realm = REALM_DATA[currentRealmType].find(r => r.tier === selectedRealm);
  if (!realm) return;

  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    realm[parent][child] = value;
  } else {
    realm[field] = value;
  }

  console.log('Updated realm:', field, '=', value);
  // 这里触发全局状态更新
}

/**
 * 渲染境界系数曲线图
 */
function renderRealmChart() {
  const svg = document.getElementById('realm-chart-svg');
  if (!svg) return;

  const realms = REALM_DATA[currentRealmType];
  const vals = realms.map(r => r.realmMult);
  const labels = realms.map(r => r.tier);

  const W = 400, H = 150, px = 40, py = 20;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const rng = max - min || 1;

  const x = (i) => px + (W - px * 2) * i / (vals.length - 1);
  const y = (v) => H - py - (H - py * 2) * (v - min) / rng;

  let pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  let txts = vals.map((v, i) =>
    `<text x="${x(i)}" y="${y(v) - 4}" fill="var(--accent2)" font-size="9" text-anchor="middle">${v}</text>`
  ).join('');

  svg.innerHTML = `
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${txts}
  `;
}

/**
 * 渲染境界差系数表
 */
export function renderRealmDiffTable(attackerTier, defenderTier) {
  const table = document.getElementById('realm-diff-table');
  if (!table) return;

  let html = '<thead><tr><th>攻方\\守方</th>';
  for (let t = 1; t <= REALM_DATA[currentRealmType].length; t++) html += `<th>${t}</th>`;
  html += '</tr></thead><tbody>';

  for (let a = 1; a <= REALM_DATA[currentRealmType].length; a++) {
    html += `<tr><td><b>${a}</b></td>`;
    for (let d = 1; d <= 9; d++) {
      const mult = getRealmDiffMultiplier(a, d);
      html += `<td style="color:${mult > 1 ? 'var(--success)' : mult < 1 ? 'var(--danger)' : 'var(--text2)'}">${mult}x</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';

  table.innerHTML = html;
}

// 无自动监听 - 由 index-loader.js 统一触发

// ── CRUD 操作 ────────────────────────────────────────────

/** 新增境界（追加到当前类型末尾） */
export function addRealm() {
  const realms = REALM_DATA[currentRealmType];
  const last = realms[realms.length - 1];
  const newTier = last ? last.tier + 1 : 1;
  realms.push({
    id: currentRealmType + '_' + newTier,
    tier: newTier,
    name: '新境界' + newTier,
    xpReq: Math.round((last?.xpReq || 1000) * 2),
    successRate: Math.max(1, (last?.successRate || 100) - 10),
    failPenalty: { xpLoss: Math.min(50, (last?.failPenalty?.xpLoss || 0) + 5), cooldown: 0 },
    realmMult: (last?.realmMult || 1.0) * 1.3,
    unlockSys: ['预留'],
    breakthroughItem: { itemId: '丹药', cost: (last?.breakthroughItem?.cost || 1000) * 2, count: 1 },
    perfLevels: {
      basic: (last?.xpReq || 1000) * 2,
      advanced: (last?.xpReq || 1000) * 3,
      perfect: (last?.xpReq || 1000) * 4,
      extreme: (last?.xpReq || 1000) * 6
    }
  });
  selectedRealm = newTier;
  renderRealmList();
  renderRealmDetail();
  renderRealmChart();
}

/** 删除当前选中境界 */
export function deleteRealm() {
  if (selectedRealm === null) return;
  const realms = REALM_DATA[currentRealmType];
  const idx = realms.findIndex(r => r.tier === selectedRealm);
  if (idx === -1) return;
  realms.splice(idx, 1);
  selectedRealm = null;
  renderRealmList();
  renderRealmDetail();
  renderRealmChart();
}

/** 恢复默认境界数据 */
export function resetRealms() {
  // 从 data 模块重新导入默认数据
  // 为了动态重置，直接覆写数组内容
  const defaultData = {
    cultivation: [
      { id: 'mortal1', tier: 1, name: '凡人', xpReq: 100, successRate: 100, failPenalty: { xpLoss: 0, cooldown: 0 }, realmMult: 0.8, unlockSys: ['基础移动', '对话系统'], breakthroughItem: { itemId: null, cost: 0, count: 0 }, perfLevels: { basic: 100, advanced: 150, perfect: 200, extreme: 300 } },
      { id: 'qi2', tier: 2, name: '炼气', xpReq: 1000, successRate: 100, failPenalty: { xpLoss: 0, cooldown: 0 }, realmMult: 1.0, unlockSys: ['基础战斗', '装备系统'], breakthroughItem: { itemId: null, cost: 0, count: 0 }, perfLevels: { basic: 1000, advanced: 1500, perfect: 2000, extreme: 3000 } },
      { id: 'foundation3', tier: 3, name: '筑基', xpReq: 5000, successRate: 80, failPenalty: { xpLoss: 5, cooldown: 0 }, realmMult: 1.3, unlockSys: ['法宝系统', '宗门系统'], breakthroughItem: { itemId: '筑基丹', cost: 1000, count: 1 }, perfLevels: { basic: 5000, advanced: 7500, perfect: 10000, extreme: 15000 } },
      { id: 'goldenCore4', tier: 4, name: '结丹', xpReq: 20000, successRate: 60, failPenalty: { xpLoss: 10, cooldown: 0 }, realmMult: 1.7, unlockSys: ['神通', '炼器系统'], breakthroughItem: { itemId: '结丹丹', cost: 5000, count: 1 }, perfLevels: { basic: 20000, advanced: 30000, perfect: 40000, extreme: 60000 } },
      { id: 'nascentSoul5', tier: 5, name: '元婴', xpReq: 80000, successRate: 40, failPenalty: { xpLoss: 15, cooldown: 0 }, realmMult: 2.2, unlockSys: ['精炼系统', '灵兽园'], breakthroughItem: { itemId: '元婴丹', cost: 20000, count: 1 }, perfLevels: { basic: 80000, advanced: 120000, perfect: 160000, extreme: 240000 } },
      { id: 'soulFormation6', tier: 6, name: '化神', xpReq: 300000, successRate: 30, failPenalty: { xpLoss: 20, cooldown: 24 }, realmMult: 2.8, unlockSys: ['分身系统', '天才塔'], breakthroughItem: { itemId: '化神丹', cost: 80000, count: 1 }, perfLevels: { basic: 300000, advanced: 450000, perfect: 600000, extreme: 900000 } },
      { id: 'voidRefine7', tier: 7, name: '返虚', xpReq: 1000000, successRate: 20, failPenalty: { xpLoss: 25, cooldown: 48 }, realmMult: 3.5, unlockSys: ['仙魔系统(预留)'], breakthroughItem: { itemId: '返虚丹', cost: 200000, count: 1 }, perfLevels: { basic: 1000000, advanced: 1500000, perfect: 2000000, extreme: 3000000 } },
      { id: 'bodyIntegrate8', tier: 8, name: '合体', xpReq: 3000000, successRate: 15, failPenalty: { xpLoss: 15, cooldown: 0, costMultiplier: 1.3 }, realmMult: 4.5, unlockSys: ['领域系统(预留)'], breakthroughItem: { itemId: '合体丹', cost: 500000, count: 1 }, perfLevels: { basic: 3000000, advanced: 4500000, perfect: 6000000, extreme: 9000000 } },
      { id: 'mahayana9', tier: 9, name: '大乘', xpReq: 10000000, successRate: 10, failPenalty: { xpLoss: 20, cooldown: 0, costMultiplier: 1.5 }, realmMult: 6.0, unlockSys: ['飞升系统'], breakthroughItem: { itemId: '大乘丹', cost: 2000000, count: 1 }, perfLevels: { basic: 10000000, advanced: 15000000, perfect: 20000000, extreme: 30000000 } },
      { id: 'trib10', tier: 10, name: '渡劫', xpReq: 30000000, successRate: 5, failPenalty: { xpLoss: 30, cooldown: 72 }, realmMult: 10.0, unlockSys: ['预留'], breakthroughItem: { itemId: '仙品丹药', cost: 5000000, count: 1 }, perfLevels: { basic: 30000000, advanced: 45000000, perfect: 60000000, extreme: 90000000 } },
      { id: 'immortal11', tier: 11, name: '真仙', xpReq: 100000000, successRate: 3, failPenalty: { xpLoss: 30, cooldown: 72 }, realmMult: 20.0, unlockSys: ['预留'], breakthroughItem: { itemId: '仙品丹药', cost: 20000000, count: 1 }, perfLevels: { basic: 100000000, advanced: 150000000, perfect: 200000000, extreme: 300000000 } },
      { id: 'immortal12', tier: 12, name: '金仙', xpReq: 500000000, successRate: 1, failPenalty: { xpLoss: 30, cooldown: 72 }, realmMult: 50.0, unlockSys: ['预留'], breakthroughItem: { itemId: '仙品丹药', cost: 100000000, count: 1 }, perfLevels: { basic: 500000000, advanced: 750000000, perfect: 1000000000, extreme: 1500000000 } }
    ],
    body: [
      { id: 'bod1', tier: 1, name: '淬体', xpReq: 500, successRate: 100, failPenalty: { xpLoss: 0, cooldown: 0 }, realmMult: 1.0, unlockSys: ['体质解锁', '血脉觉醒'], breakthroughItem: { itemId: '淬体液', cost: 500, count: 1 } },
      { id: 'bod2', tier: 2, name: '锻骨', xpReq: 2000, successRate: 90, failPenalty: { xpLoss: 5, cooldown: 0 }, realmMult: 1.2, unlockSys: ['体质解锁', '血脉觉醒'], breakthroughItem: { itemId: '锻骨液', cost: 2000, count: 1 } },
      { id: 'bod3', tier: 3, name: '易筋', xpReq: 10000, successRate: 75, failPenalty: { xpLoss: 10, cooldown: 0 }, realmMult: 1.5, unlockSys: ['命格系统', '特殊体质'], breakthroughItem: { itemId: '易筋丹', cost: 10000, count: 1 } },
      { id: 'bod4', tier: 4, name: '洗髓', xpReq: 40000, successRate: 60, failPenalty: { xpLoss: 15, cooldown: 12 }, realmMult: 1.8, unlockSys: ['体质融合', '血脉变异'], breakthroughItem: { itemId: '洗髓丹', cost: 40000, count: 1 } },
      { id: 'bod5', tier: 5, name: '凝脉', xpReq: 150000, successRate: 45, failPenalty: { xpLoss: 20, cooldown: 24 }, realmMult: 2.2, unlockSys: ['经脉全开', '体质传承'], breakthroughItem: { itemId: '凝脉液', cost: 150000, count: 1 } },
      { id: 'bod6', tier: 6, name: '通窍', xpReq: 500000, successRate: 35, failPenalty: { xpLoss: 25, cooldown: 48 }, realmMult: 2.8, unlockSys: ['天眼通', '神行术'], breakthroughItem: { itemId: '通窍散', cost: 500000, count: 1 } },
      { id: 'bod7', tier: 7, name: '辟谷', xpReq: 2000000, successRate: 25, failPenalty: { xpLoss: 30, cooldown: 72 }, realmMult: 3.5, unlockSys: ['辟谷之术', '肉身成圣'], breakthroughItem: { itemId: '辟谷丹', cost: 2000000, count: 1 } },
      { id: 'bod8', tier: 8, name: '涅槃', xpReq: 8000000, successRate: 15, failPenalty: { xpLoss: 35, cooldown: 96 }, realmMult: 4.5, unlockSys: ['涅槃重生', '不死之身'], breakthroughItem: { itemId: '涅槃丹', cost: 8000000, count: 1 } },
      { id: 'bod9', tier: 9, name: '金刚', xpReq: 20000000, successRate: 10, failPenalty: { xpLoss: 40, cooldown: 120 }, realmMult: 6.0, unlockSys: ['金刚不坏', '万劫不灭体'], breakthroughItem: { itemId: '金刚液', cost: 20000000, count: 1 } },
      { id: 'bod10', tier: 10, name: '不灭', xpReq: 60000000, successRate: 5, failPenalty: { xpLoss: 50, cooldown: 168 }, realmMult: 10.0, unlockSys: ['不灭金身', '天地同寿'], breakthroughItem: { itemId: '不灭丹', cost: 60000000, count: 1 } },
      { id: 'bod11', tier: 11, name: '天尊', xpReq: 200000000, successRate: 3, failPenalty: { xpLoss: 50, cooldown: 168 }, realmMult: 20.0, unlockSys: ['预留'], breakthroughItem: { itemId: '天尊液', cost: 200000000, count: 1 } },
      { id: 'bod12', tier: 12, name: '圣体', xpReq: 1000000000, successRate: 1, failPenalty: { xpLoss: 50, cooldown: 168 }, realmMult: 50.0, unlockSys: ['预留'], breakthroughItem: { itemId: '圣体液', cost: 1000000000, count: 1 } }
    ]
  };
  // 覆写数据（保持引用地址不变）
  const cultArr = REALM_DATA.cultivation;
  cultArr.length = 0;
  defaultData.cultivation.forEach(r => cultArr.push(r));
  const bodyArr = REALM_DATA.body;
  bodyArr.length = 0;
  defaultData.body.forEach(r => bodyArr.push(r));
  currentRealmType = 'cultivation';
  selectedRealm = null;
  renderRealmTabs();
  renderRealmList();
  renderRealmDetail();
  renderRealmChart();
}
