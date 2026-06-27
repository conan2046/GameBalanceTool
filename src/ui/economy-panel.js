/**
 * UI模块 - 经济体系面板
 * 7层货币体系 + ROI计算
 */

import { CURRENCY_DATA, getExchangeRates } from '../data/currencies.js';

let editingCurrencyId = '';
let editingVipLevel = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

/**
 * 初始化经济面板
 */
export function initEconomyPanel() {
  renderCurrencyTable();
  renderVipTable();
  renderExchangeRates();
}

/**
 * 渲染货币表
 */
function renderCurrencyTable() {
  const tbody = document.getElementById('currency-table');
  if (!tbody) return;

  tbody.innerHTML = CURRENCY_DATA.tiers.map(c => {
    if (editingCurrencyId === c.id) {
      return `
        <tr class="editing-row">
          <td><input class="fc eco-edit-input" id="eco-cur-name-${c.id}" value="${esc(c.name)}"></td>
          <td><input class="fc eco-edit-input" id="eco-cur-tier-${c.id}" type="number" min="1" value="${Number(c.tier) || 1}"></td>
          <td><input class="fc eco-edit-input" id="eco-cur-purpose-${c.id}" value="${esc(c.purpose)}"></td>
          <td><input class="fc eco-edit-input" id="eco-cur-source-${c.id}" value="${esc(c.source)}"></td>
          <td><input class="fc eco-edit-input" id="eco-cur-rate-${c.id}" value="${esc(c.exchangeRate)}"></td>
          <td>
            <button class="btn btn-primary btn-xs" onclick="saveCurrency('${c.id}')">\u4fdd\u5b58</button>
            <button class="btn btn-ghost btn-xs" onclick="cancelCurrencyEdit()">\u53d6\u6d88</button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td><b>${esc(c.name)}</b></td>
        <td>\u7b2c${Number(c.tier) || 1}\u5c42</td>
        <td>${esc(c.purpose)}</td>
        <td>${esc(c.source)}</td>
        <td><code>${esc(c.exchangeRate)}</code></td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="editCurrency('${c.id}')">\u7f16\u8f91</button>
          <button class="btn btn-danger btn-xs" onclick="deleteCurrency('${c.id}')">\u5220\u9664</button>
        </td>
      </tr>
    `;
  }).join('');
}
/**
 * 渲染VIP等级表
 */
function renderVipTable() {
  const tbody = document.getElementById('vip-table');
  if (!tbody) return;

  tbody.innerHTML = CURRENCY_DATA.vipThresholds.map(v => {
    if (editingVipLevel === v.level) {
      return `
        <tr class="editing-row">
          <td><input class="fc eco-edit-input" id="eco-vip-level-${v.level}" type="number" min="1" value="${Number(v.level) || 1}"></td>
          <td><input class="fc eco-edit-input" id="eco-vip-cumulative-${v.level}" type="number" min="0" value="${Number(v.cumulative) || 0}"></td>
          <td><input class="fc eco-edit-input" id="eco-vip-perk-${v.level}" value="${esc(v.perk)}"></td>
          <td>
            <button class="btn btn-primary btn-xs" onclick="saveVip(${v.level})">\u4fdd\u5b58</button>
            <button class="btn btn-ghost btn-xs" onclick="cancelVipEdit()">\u53d6\u6d88</button>
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td><span class="badge badge-a">\u8d35\u5bbe${Number(v.level) || 1}\u7ea7</span></td>
        <td>\u00a5${Number(v.cumulative || 0).toLocaleString()}</td>
        <td>${esc(v.perk)}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="editVip(${v.level})">\u7f16\u8f91</button>
          <button class="btn btn-danger btn-xs" onclick="deleteVip(${v.level})">\u5220\u9664</button>
        </td>
      </tr>
    `;
  }).join('');
}
/**
 * 渲染兑换比率
 */
function renderExchangeRates() {
  const rates = getExchangeRates();
  const display = document.getElementById('exchange-rates');
  if (!display) return;

  display.innerHTML = `
    <div class="stat-card">
      <div class="stat-l">仙玉 → 灵石</div>
      <div class="stat-v">${rates.jade_to_stone.toLocaleString()} : 1</div>
    </div>
    <div class="stat-card">
      <div class="stat-l">灵石 → 现实</div>
      <div class="stat-v">¥${rates.stone_to_real}</div>
    </div>
    <div class="stat-card">
      <div class="stat-l">仙玉 → 现实</div>
      <div class="stat-v">¥${rates.jade_to_real}</div>
    </div>
  `;
}

/**
 * ROI计算
 * @param {number} budget - 总预算
 * @param {number} totalPower - 获得战力
 * @returns {number} 每元战力
 */
export function calcROI(budget, totalPower) {
  if (budget <= 0) return 0;
  return Math.round(totalPower / budget);
}

/**
 * 礼包星级评定
 * @param {number} multiplier - 倍率（理论价值/售价）
 * @returns {Object} { stars, label, color }
 */
export function evaluatePackQuality(multiplier) {
  if (multiplier < 3) return { stars: 1, label: '基础偏低', color: 'var(--text3)' };
  if (multiplier < 6) return { stars: 2, label: '正常准线', color: 'var(--text2)' };
  if (multiplier < 10) return { stars: 3, label: '性价优良', color: 'var(--accent2)' };
  if (multiplier < 15) return { stars: 4, label: '高度推荐', color: 'var(--warning)' };
  return { stars: 5, label: '极端超值', color: 'var(--danger)' };
}

// ── CRUD 操作 ────────────────────────────────────────────

/** 新增货币 */
export function addCurrency() {
  const count = CURRENCY_DATA.tiers.length + 1;
  CURRENCY_DATA.tiers.push({
    id: 'cur_' + Date.now(),
    name: '新货币' + count,
    tier: count,
    purpose: '自定义用途',
    source: '自定义来源',
    exchangeRate: '可交易'
  });
  renderCurrencyTable();
}

/** 删除货币 */
export function editCurrency(currencyId) {
  editingCurrencyId = currencyId;
  renderCurrencyTable();
}

export function cancelCurrencyEdit() {
  editingCurrencyId = '';
  renderCurrencyTable();
}

export function saveCurrency(currencyId) {
  const item = CURRENCY_DATA.tiers.find(c => c.id === currencyId);
  if (!item) return;
  item.name = document.getElementById(`eco-cur-name-${currencyId}`)?.value.trim() || item.name;
  item.tier = Math.max(1, parseInt(document.getElementById(`eco-cur-tier-${currencyId}`)?.value, 10) || item.tier || 1);
  item.purpose = document.getElementById(`eco-cur-purpose-${currencyId}`)?.value.trim() || '';
  item.source = document.getElementById(`eco-cur-source-${currencyId}`)?.value.trim() || '';
  item.exchangeRate = document.getElementById(`eco-cur-rate-${currencyId}`)?.value.trim() || '';
  editingCurrencyId = '';
  CURRENCY_DATA.tiers.sort((a, b) => (Number(a.tier) || 0) - (Number(b.tier) || 0));
  renderCurrencyTable();
}

export function deleteCurrency(currencyId) {
  const idx = CURRENCY_DATA.tiers.findIndex(c => c.id === currencyId);
  if (idx === -1) return;
  CURRENCY_DATA.tiers.splice(idx, 1);
  if (editingCurrencyId === currencyId) editingCurrencyId = '';
  renderCurrencyTable();
}

/** 恢复默认货币 */
export function resetCurrencies() {
  const def = [
    { id: 'real_money', name: '现实额度', tier: 1, purpose: '系统任务发放，驱动消费行为', source: '系统任务/每日签到', exchangeRate: '不可交易' },
    { id: 'spirit_stone', name: '灵石', tier: 2, purpose: '游戏内基础交易货币', source: '活动/掉落/任务', exchangeRate: '1仙玉 = 10000灵石' },
    { id: 'cultivation_xp', name: '修为值', tier: 3, purpose: '境界突破专用资源', source: '修炼/丹药/打坐/分身', exchangeRate: '不可直接交易' },
    { id: 'merit', name: '功德值', tier: 4, purpose: '特殊事件/宗门威望兑换', source: '玩家对战/宗门战/副本', exchangeRate: '100功德 = 1宗门贡献' },
    { id: 'fortune', name: '机缘', tier: 5, purpose: '商城购买特殊装备', source: '秘境/礼包/兑换', exchangeRate: '1机缘 = 1000灵石' },
    { id: 'jade', name: '仙玉', tier: 6, purpose: '高级商城货币/充值专用', source: '充值/兑换/活动', exchangeRate: '10元 = 100仙玉' },
    { id: 'bind_stone', name: '绑定灵石', tier: 7, purpose: '锁定基础资源/不可交易', source: '基础产出/日常任务', exchangeRate: '不可交易' }
  ];
  const arr = CURRENCY_DATA.tiers;
  arr.length = 0;
  def.forEach(c => arr.push(c));
  renderCurrencyTable();
}

/** 新增VIP等级 */
export function addVip() {
  const last = CURRENCY_DATA.vipThresholds[CURRENCY_DATA.vipThresholds.length - 1];
  const newLvl = last ? last.level + 1 : 1;
  CURRENCY_DATA.vipThresholds.push({
    level: newLvl,
    cumulative: (last?.cumulative || 0) * 2,
    perk: '预留特权'
  });
  renderVipTable();
}

/** 删除VIP等级 */
export function editVip(level) {
  editingVipLevel = level;
  renderVipTable();
}

export function cancelVipEdit() {
  editingVipLevel = null;
  renderVipTable();
}

export function saveVip(level) {
  const item = CURRENCY_DATA.vipThresholds.find(v => v.level === level);
  if (!item) return;
  const nextLevel = Math.max(1, parseInt(document.getElementById(`eco-vip-level-${level}`)?.value, 10) || item.level || 1);
  item.level = nextLevel;
  item.cumulative = Math.max(0, parseInt(document.getElementById(`eco-vip-cumulative-${level}`)?.value, 10) || 0);
  item.perk = document.getElementById(`eco-vip-perk-${level}`)?.value.trim() || '';
  editingVipLevel = null;
  CURRENCY_DATA.vipThresholds.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  renderVipTable();
}

export function deleteVip(level) {
  const idx = CURRENCY_DATA.vipThresholds.findIndex(v => v.level === level);
  if (idx === -1) return;
  CURRENCY_DATA.vipThresholds.splice(idx, 1);
  if (editingVipLevel === level) editingVipLevel = null;
  renderVipTable();
}

/** 恢复默认VIP */
export function resetVip() {
  const def = [
    { level: 1, cumulative: 100, perk: '自动修炼、每日礼包×1' },
    { level: 2, cumulative: 500, perk: '+1% 修为获取' },
    { level: 3, cumulative: 1000, perk: '一键扫荡解锁' },
    { level: 4, cumulative: 3000, perk: '+2% 战斗属性' },
    { level: 5, cumulative: 5000, perk: '每日礼包×3' },
    { level: 6, cumulative: 10000, perk: '宗门传送免费' },
    { level: 7, cumulative: 30000, perk: '+3% 突破成功率' },
    { level: 8, cumulative: 50000, perk: '藏经阁折扣' },
    { level: 9, cumulative: 100000, perk: '专属称号"氪金先锋"' },
    { level: 10, cumulative: 200000, perk: '商城解锁隐藏商品' },
    { level: 11, cumulative: 500000, perk: '+5% 全属性' },
    { level: 12, cumulative: 1000000, perk: '专属光效' },
    { level: 13, cumulative: 2000000, perk: '每日礼包×5' },
    { level: 14, cumulative: 5000000, perk: '突破失败不倒退' },
    { level: 15, cumulative: 10000000, perk: '终身至尊称号' }
  ];
  const arr = CURRENCY_DATA.vipThresholds;
  arr.length = 0;
  def.forEach(v => arr.push(v));
  renderVipTable();
}
