/**
 * GBT v3.0 — 模块加载桥接器
 * 将 src/ 目录下的 ES Module 接口挂载到 window，
 * 使 inline onclick 可调用，同时注入 IndexedDB 持久化 + Web Worker。
 *
 * 运行时机：作为 <script type="module"> 加载，在 v2.1 inline script 之后执行。
 * v2.1 原有逻辑完整保留不受影响。
 */

// ── 1. 导入 v3.0 全部模块 ────────────────────────────────
import { REALM_DATA } from './data/realms.js';
import { EQUIPMENT_DATA, normalizeEquipmentLabels } from './data/equipment.js';
import { CLASS_DATA } from './data/classes.js';
import { CURRENCY_DATA } from './data/currencies.js';

import { initClassPanel, selectClass, toggleDamageType, addClass, deleteClass, addDamageType, deleteDamageType, editClass, saveClass, setSimCount, setClassLevel } from './ui/class-panel.js';
import { initRealmPanel, switchRealmType, selectRealm, updateRealmField, renderRealmDiffTable, addRealm, deleteRealm, resetRealms } from './ui/realm-panel.js';
import { initEquipmentPanel, previewQualityEffect, calcEquipTotalPower, updateRefineDisplay, addSlot, deleteSlot, resetEquipment, openSlotModal, saveSlotModal } from './ui/equipment-panel.js';
import { initEconomyPanel, calcROI, evaluatePackQuality, addCurrency, editCurrency, saveCurrency, cancelCurrencyEdit, deleteCurrency, resetCurrencies, addVip, editVip, saveVip, cancelVipEdit, deleteVip, resetVip, addExchangeRate, editExchangeRate, saveExchangeRate, cancelExchangeRateEdit, deleteExchangeRate, resetExchangeRates } from './ui/economy-panel.js';
import { renderCultPanel, toggleLine, previewBranchCurve } from './ui/cultivation-panel.js';
import { ATTRS, ATTR_MAP } from './data/attrs.js';

import { drawLineChart, drawBarChart, drawPieChart, drawMixedChart, drawCultivationCurve, drawCurveComparison } from './chart/growth-chart.js';

import { initDB, saveGame, loadGame, listSaves, deleteSave, autoSave } from './export/db.js';
import { exportVersionedProject, importVersionedProject } from './export/io.js';
import { ProjectState } from './core/project-state.js';
import { APP_RELEASE_NAME, APP_VERSION_LABEL, PROJECT_VERSION } from './core/project-versioning.js';
import { EventBus } from './core/event-bus.js';
import { patchV3Snapshot } from './export/migration.js';
import { calcDamage, simulateCombat, simulateRoundBattle } from './engine/combat.js';
import { initCurveLibraryPanel } from './curve/curve-panel.js';
import { installBranchEditor, openBranchModal, addBranchCostRow, addBranchAttrRow, previewBranch, saveBranch, deleteBranch } from './ui/cultivation-branch-editor.js';
import { initSimulatorPanel, runSimulationV34, roiResetAllV34, roiInvestV34, roiAutoInvestV34, roiAdvanceDayV34, roiRenderAllV34 } from './ui/simulator-panel.js';
import { initProjectScenarioPanel, renderProjectScenarioPanel } from './ui/project-scenario-panel.js';
import { initPaymentPanel, renderPaymentPanel, addPaymentTier, editPaymentTier, savePaymentTier, cancelPaymentTierEdit, deletePaymentTier, addPaymentPack, editPaymentPack, savePaymentPack, cancelPaymentPackEdit, deletePaymentPack, addPaymentModuleMix, editPaymentModuleMix, savePaymentModuleMix, cancelPaymentModuleMixEdit, deletePaymentModuleMix } from './ui/payment-panel.js';

function applyAppVersionUI() {
  const versionEl = document.getElementById('app-version-label');
  if (versionEl) versionEl.textContent = APP_VERSION_LABEL;
  const releaseEl = document.getElementById('app-release-name');
  if (releaseEl) releaseEl.textContent = APP_RELEASE_NAME;
  document.documentElement.dataset.appVersion = PROJECT_VERSION;
}

// ── 2. 挂载到 window — 让 inline onclick 可调用 ───────────

// Tab3: 职业设定
window.initClassPanel = initClassPanel;
window.selectClass = selectClass;
window.toggleDamageType = toggleDamageType;
window.addClass = addClass;
window.deleteClass = deleteClass;
window.addDamageType = addDamageType;
window.deleteDamageType = deleteDamageType;
window.editClass = editClass;
window.saveClass = saveClass;
window.setSimCount = setSimCount;
window.setClassLevel = setClassLevel;

// Tab4: 境界 — 渲染由 inline script 接管（10层/行布局），模块仅保留数据层
// 不移除 import，以便其他模块 (combat 等) 可引用 REALM_DATA

// Tab4: 装备
window.initEquipmentPanel = initEquipmentPanel;
window.updateRefineDisplay = updateRefineDisplay;
window.addSlot = addSlot;
window.deleteSlot = deleteSlot;
window.resetEquipment = resetEquipment;
window.previewQualityEffect = previewQualityEffect;
window.openSlotModal = openSlotModal;
window.saveSlotModal = saveSlotModal;

// 暴露装备数据给 inline script（养成树精炼计算器需要）
window.EQUIPMENT_REFINE = EQUIPMENT_DATA.refine;
window.EQUIPMENT_DATA = EQUIPMENT_DATA;

// Tab6: 经济
window.initEconomyPanel = initEconomyPanel;
window.addCurrency = addCurrency;
window.editCurrency = editCurrency;
window.saveCurrency = saveCurrency;
window.cancelCurrencyEdit = cancelCurrencyEdit;
window.deleteCurrency = deleteCurrency;
window.resetCurrencies = resetCurrencies;
window.addVip = addVip;
window.editVip = editVip;
window.saveVip = saveVip;
window.cancelVipEdit = cancelVipEdit;
window.deleteVip = deleteVip;
window.resetVip = resetVip;
window.addExchangeRate = addExchangeRate;
window.editExchangeRate = editExchangeRate;
window.saveExchangeRate = saveExchangeRate;
window.cancelExchangeRateEdit = cancelExchangeRateEdit;
window.deleteExchangeRate = deleteExchangeRate;
window.resetExchangeRates = resetExchangeRates;

let editingEcoOutputResourceId = '';

function ensureEcoOutputConfig(state) {
  if (!state.ecoConfig) state.ecoConfig = {};
  if (!Array.isArray(state.ecoDisabledResources)) state.ecoDisabledResources = [];
  (state.resources || []).forEach(resource => {
    if (!state.ecoConfig[resource.id]) {
      state.ecoConfig[resource.id] = {
        dayProd: 100,
        smallR: 1.5,
        midR: 2.5,
        bigR: 4,
        superR: 6,
        maxLimit: 500
      };
    }
  });
}

function saveEcoOutputField(el, field) {
  const state = getLegacyState();
  ensureEcoOutputConfig(state);
  const resourceId = el.dataset.rid;
  if (!state.ecoConfig[resourceId]) return;
  const value = parseFloat(el.value);
  state.ecoConfig[resourceId][field] = Number.isFinite(value) ? value : 0;
}

function collectEcoOutputInputs(resourceId) {
  const state = getLegacyState();
  ensureEcoOutputConfig(state);
  const fields = ['dayProd', 'smallR', 'midR', 'bigR', 'superR', 'maxLimit'];
  fields.forEach(field => {
    const input = document.querySelector(`#tbl-eco-config input[data-rid="${resourceId}"][onchange*="${field}"]`);
    if (!input) return;
    const value = parseFloat(input.value);
    state.ecoConfig[resourceId][field] = Number.isFinite(value) ? value : 0;
  });
}

function renderEcoOutputPanel() {
  const state = getLegacyState();
  const tbody = document.querySelector('#tbl-eco-config tbody');
  if (!tbody) return;
  ensureEcoOutputConfig(state);
  const resources = (state.resources || []).filter(resource => !state.ecoDisabledResources.includes(resource.id));
  if (!resources.length) {
    const emptyText = (state.resources || []).length ? '当前产出模型暂无启用资源' : '请先在资源管理页签添加核心资源';
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text2);padding:30px">${emptyText}</td></tr>`;
    return;
  }
  tbody.innerHTML = resources.map(resource => {
    const cfg = state.ecoConfig[resource.id] || {};
    if (editingEcoOutputResourceId === resource.id) {
      const input = (field, step, width) => `<input type="number" ${step ? `step="${step}"` : ''} class="fc eco-output-input" value="${cfg[field] ?? 0}" data-rid="${resource.id}" onchange="saveEcoCfg(this,'${field}')" style="font-size:12px;width:${width}px;text-align:center">`;
      return `<tr>
        <td><span class="badge badge-t">${resource.id}</span></td>
        <td><b style="color:var(--accent);font-size:13px">${resource.name}</b></td>
        <td>${input('dayProd', '', 90)}</td>
        <td>${input('smallR', '0.1', 65)}</td>
        <td>${input('midR', '0.1', 65)}</td>
        <td>${input('bigR', '0.1', 65)}</td>
        <td>${input('superR', '0.1', 65)}</td>
        <td>${input('maxLimit', '', 90)}</td>
        <td><div class="btn-group"><button class="btn btn-primary btn-xs" onclick="saveEcoOutputRow('${resource.id}')">保存</button><button class="btn btn-ghost btn-xs" onclick="cancelEcoOutputEdit()">取消</button></div></td>
      </tr>`;
    }
    return `<tr>
      <td><span class="badge badge-t">${resource.id}</span></td>
      <td><b style="color:var(--accent);font-size:13px">${resource.name}</b></td>
      <td>${cfg.dayProd ?? 0}</td>
      <td>${cfg.smallR ?? 0}</td>
      <td>${cfg.midR ?? 0}</td>
      <td>${cfg.bigR ?? 0}</td>
      <td>${cfg.superR ?? 0}</td>
      <td>${cfg.maxLimit ?? 0}</td>
      <td><div class="btn-group"><button class="btn btn-ghost btn-xs" onclick="editEcoOutputRow('${resource.id}')">编辑</button><button class="btn btn-danger btn-xs" onclick="deleteEcoOutputRow('${resource.id}')">删除</button></div></td>
    </tr>`;
  }).join('');
}

function editEcoOutputRow(resourceId) {
  editingEcoOutputResourceId = resourceId;
  renderEcoOutputPanel();
}

function cancelEcoOutputEdit() {
  editingEcoOutputResourceId = '';
  renderEcoOutputPanel();
}

function saveEcoOutputRow(resourceId) {
  collectEcoOutputInputs(resourceId);
  editingEcoOutputResourceId = '';
  renderEcoOutputPanel();
  const state = getLegacyState();
  if (window.ProjectState) {
    window.ProjectState.bind(state);
    window.ProjectState.persist('eco-output-save');
  } else if (typeof save === 'function') save();
  if (typeof toast === 'function') toast('产出配置已保存');
}

function deleteEcoOutputRow(resourceId) {
  const state = getLegacyState();
  ensureEcoOutputConfig(state);
  if (!state.ecoDisabledResources.includes(resourceId)) state.ecoDisabledResources.push(resourceId);
  if (editingEcoOutputResourceId === resourceId) editingEcoOutputResourceId = '';
  renderEcoOutputPanel();
  if (window.ProjectState) {
    window.ProjectState.bind(state);
    window.ProjectState.persist('eco-output-delete');
  } else if (typeof save === 'function') save();
}

function saveEcoOutputData() {
  editingEcoOutputResourceId = '';
  renderEcoOutputPanel();
  const state = getLegacyState();
  if (window.ProjectState) {
    window.ProjectState.bind(state);
    window.ProjectState.persist('eco-output-lock');
  } else if (typeof save === 'function') save();
  if (typeof toast === 'function') toast('产出数据已锁定');
}

window.saveEcoCfg = saveEcoOutputField;
window.renderEconomyPanel = renderEcoOutputPanel;
window.editEcoOutputRow = editEcoOutputRow;
window.cancelEcoOutputEdit = cancelEcoOutputEdit;
window.saveEcoOutputRow = saveEcoOutputRow;
window.deleteEcoOutputRow = deleteEcoOutputRow;
window.saveEconomyData = saveEcoOutputData;

// 导出/持久化
window.exportV3Data = exportV3Data;
window.importV3Data = importV3Data;
window.ProjectState = ProjectState;
window.EventBus = EventBus;
window.exportVersionedProject = () => exportVersionedProject(ProjectState.get());
window.renderProjectScenarioPanel = renderProjectScenarioPanel;

// Tab4: 养成系统 — 覆盖内联 rCult / toggleLine
window.rCult = renderCultPanel;
window.toggleLine = toggleLine;
window.renderCultPanel = renderCultPanel;
window.previewBranchCurve = previewBranchCurve;
window.openBranchModal = openBranchModal;
window.addBranchCostRow = addBranchCostRow;
window.addBranchAttrRow = addBranchAttrRow;
window.previewBranch = previewBranch;
window.saveBranch = saveBranch;
window.delBranch = deleteBranch;

// 暴露属性定义
window.ATTRS = ATTRS;
window.ATTR_MAP = ATTR_MAP;

// 图表渲染
window.drawCultivationCurve = drawCultivationCurve;
window.drawCurveComparison = drawCurveComparison;
window.drawLineChart = drawLineChart;
window.initCurveLibraryPanel = initCurveLibraryPanel;
window.installBranchEditor = installBranchEditor;

// v3.4 Simulator 统一数据源
window.initSimulatorPanel = initSimulatorPanel;
window.runSimulation = runSimulationV34;
window.roiResetAll = roiResetAllV34;
window.roiInvest = roiInvestV34;
window.roiAutoInvest = roiAutoInvestV34;
window.roiAdvanceDay = roiAdvanceDayV34;
window.roiRenderAll = roiRenderAllV34;
window.renderROIPanel2 = roiResetAllV34;
window.initPaymentPanel = initPaymentPanel;
window.renderPaymentPanel = renderPaymentPanel;
window.addPaymentTier = addPaymentTier;
window.editPaymentTier = editPaymentTier;
window.savePaymentTier = savePaymentTier;
window.cancelPaymentTierEdit = cancelPaymentTierEdit;
window.deletePaymentTier = deletePaymentTier;
window.addPaymentPack = addPaymentPack;
window.editPaymentPack = editPaymentPack;
window.savePaymentPack = savePaymentPack;
window.cancelPaymentPackEdit = cancelPaymentPackEdit;
window.deletePaymentPack = deletePaymentPack;
window.addPaymentModuleMix = addPaymentModuleMix;
window.editPaymentModuleMix = editPaymentModuleMix;
window.savePaymentModuleMix = savePaymentModuleMix;
window.cancelPaymentModuleMixEdit = cancelPaymentModuleMixEdit;
window.deletePaymentModuleMix = deletePaymentModuleMix;

// ── 3. 合成 v3.0 全量快照（用于 IndexedDB 存档） ─────────

function getLegacyState() {
  return (typeof S !== 'undefined' && S) ? S : (window.S || {});
}

function getV3Snapshot() {
  const base = ProjectState.snapshot({ from: '3.5' });
  return {
    ...base,
    version: PROJECT_VERSION,
    timestamp: Date.now(),
    v2State: ProjectState.snapshot(),
    realms: JSON.parse(JSON.stringify(REALM_DATA)),
    equipment: JSON.parse(JSON.stringify(EQUIPMENT_DATA)),
    classes: JSON.parse(JSON.stringify(CLASS_DATA)),
    currencies: JSON.parse(JSON.stringify(CURRENCY_DATA))
  };
}

function restoreV3Snapshot(data) {
  if (!data) return;
  if (data.realms) {
    const cult = REALM_DATA.cultivation;
    cult.length = 0;
    data.realms.cultivation.forEach(r => cult.push(r));
    const body = REALM_DATA.body;
    body.length = 0;
    data.realms.body.forEach(r => body.push(r));
  }
  if (data.equipment) {
    const slots = EQUIPMENT_DATA.slots;
    slots.length = 0;
    // 迁移旧key(attack→a1, defense→a2, health→a3)
    data.equipment.slots.forEach(s => {
      if (s.baseAttrs) {
        const old = s.baseAttrs;
        const mig = {};
        if (old.a1 || old.attack) mig.a1 = old.a1 || old.attack;
        if (old.a2 || old.defense) mig.a2 = old.a2 || old.defense;
        if (old.a3 || old.health) mig.a3 = old.a3 || old.health;
        s.baseAttrs = mig;
      }
      slots.push(s);
    });
    normalizeEquipmentLabels(EQUIPMENT_DATA);
  }
  if (data.classes) {
    const cls = CLASS_DATA.classes;
    cls.length = 0;
    data.classes.classes.forEach(c => {
      // 兼容旧存档：补全 primaries
      if (!c.primaries) c.primaries = { power: 4, spirit: 0, agility: 2, endurance: 1, physique: 3 };
      cls.push(c);
    });
    const dt = CLASS_DATA.damageTypes;
    dt.length = 0;
    data.classes.damageTypes.forEach(d => dt.push(d));
    const km = CLASS_DATA.killMatrix;
    km.length = 0;
    data.classes.killMatrix.forEach(k => km.push(k));
  }
  if (data.currencies) {
    const tiers = CURRENCY_DATA.tiers;
    tiers.length = 0;
    data.currencies.tiers.forEach(t => tiers.push(t));
    const vips = CURRENCY_DATA.vipThresholds;
    vips.length = 0;
    data.currencies.vipThresholds.forEach(v => vips.push(v));
  }
}

// ── 4. IndexedDB 持久化 ──────────────────────────────────

async function exportV3Data() {
  return exportVersionedProject(ProjectState.get());
}

async function importV3Data() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importVersionedProject(file);
      const data = imported.data;
      ProjectState.restore(data, `json-import-v${PROJECT_VERSION}`);
      restoreV3Snapshot(data);
      // 重新渲染所有面板
      initClassPanel();
      initRealmPanel();
      initEquipmentPanel();
      initEconomyPanel();
      renderEcoOutputPanel();
      initProjectScenarioPanel();
      if (typeof toast === 'function') toast(`${APP_VERSION_LABEL} 版本化工程导入成功`);
    } catch (err) {
      if (typeof toast === 'function') toast('导入失败: ' + err.message, 'e');
    }
  };
  input.click();
}

// ── 5. Web Worker 战斗模拟 ───────────────────────────────

let combatWorker = null;

function initCombatWorker() {
  if (combatWorker) return;
  try {
    combatWorker = new Worker('./workers/combat.worker.js');
    console.log('[v3.0] Web Worker 已创建');
  } catch (e) {
    console.warn('[v3.0] Web Worker 创建失败，将使用主线程模拟:', e.message);
  }
}

/**
 * 通过 Worker 执行战斗模拟
 * @param {Object} params - { count, attacker, defender }
 * @param {Function} callback - (result) => void
 */
window.runWorkerCombat = function(params, callback) {
  initCombatWorker();
  if (combatWorker) {
    const handler = (e) => {
      combatWorker.removeEventListener('message', handler);
      callback(e.data.payload);
    };
    combatWorker.addEventListener('message', handler);
    combatWorker.postMessage({ type: 'SIMULATE_COMBAT', payload: params });
  } else {
    // fallback: 主线程
    const result = simulateCombat(params.count || 1000, params);
    callback(result);
  }
};

/**
 * Worker 回合制战斗
 */
window.runWorkerRoundBattle = function(params, callback) {
  initCombatWorker();
  if (combatWorker) {
    const handler = (e) => {
      combatWorker.removeEventListener('message', handler);
      callback(e.data.payload);
    };
    combatWorker.addEventListener('message', handler);
    combatWorker.postMessage({ type: 'ROUND_BATTLE', payload: params });
  } else {
    const result = simulateRoundBattle(params.attacker, params.defender);
    callback(result);
  }
};

// ── 6. Tab 切换时自动初始化 v3.0 面板 ───────────────────

function initV3Panels() {
  initClassPanel();
  // initRealmPanel — 由 inline script 的渲染函数接管
  initEquipmentPanel();
  initEconomyPanel();
  renderEcoOutputPanel();
  initCurveLibraryPanel();
  installBranchEditor();
  initSimulatorPanel();
  initProjectScenarioPanel();
  initPaymentPanel();
  // 养成树 — v3.0 模块在 rAll 调用后自动接管 rCult
}

// 拦截原有 tab click：在切换后调用 v3.0 面板初始化
document.addEventListener('DOMContentLoaded', async () => {
  applyAppVersionUI();
  // 初始化 IndexedDB
  try {
    await initDB();
    ProjectState.bind(getLegacyState(), { saveAdapter: saveGame });
    console.log('[v3.1] IndexedDB 已就绪，ProjectState 已绑定');

    // 尝试恢复上一次存档；v3.7 之后统一走版本化封包迁移入口。
    const saved = await loadGame('v3main');
    if (saved && (saved.schema === 'gbt-project' || saved.schema === 'gbt-project-state' || saved.v2State || saved.data)) {
      ProjectState.restore(saved, 'idb-restore');
      restoreV3Snapshot(saved.data || (saved.v2State && saved.v2State.data) || saved);
      if (typeof window.rAll === 'function') window.rAll();
    } else if (saved && saved.version && saved.classes) {
      // 铁律 #6: 旧存档补全缺失字段
      const patched = patchV3Snapshot(saved);
      restoreV3Snapshot(patched);
    } else if (saved) {
      console.log('[v3.0] 存档版本不匹配，使用默认数据');
    }
  } catch (e) {
    console.warn('[v3.0] IndexedDB 不可用:', e.message);
  }

  // 初始化面板
  initV3Panels();

  // 监听 tab 切换 - 补充 v3.0 面板初始化
  if (typeof window.initCollapsibleSections === 'function') setTimeout(() => window.initCollapsibleSections(document), 80);

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const p = t.dataset.p;
      // DOM 已由 v2.1 切换，只需确保面板已渲染
      if (p === 'panel-class') initClassPanel();
      if (p === 'panel-cult') {
        // 养成树由 v3.0 cultivation-panel 接管渲染
        if (typeof window.renderRealms === 'function') window.renderRealms();
        renderCultPanel();
        initEquipmentPanel();
      }
      if (p === 'panel-eco') {
        initEconomyPanel();
        renderEcoOutputPanel();
      }
      if (p === 'panel-sim') { initSimulatorPanel(); initProjectScenarioPanel(); }
      if (p === 'panel-payment') initPaymentPanel();
      if (p === 'panel-curve') {
        initCurveLibraryPanel();
  installBranchEditor();
        // 曲线库全曲线对比图
        const curveState = (window.ProjectState && typeof window.ProjectState.get === 'function') ? window.ProjectState.get() : window.S;
        if (curveState && curveState.curves) {
          setTimeout(function(){ drawCurveComparison('cv-compare', curveState.curves, 20); }, 100);
        }
      }
      if (typeof window.initCollapsibleSections === 'function') {
        setTimeout(() => window.initCollapsibleSections(document.getElementById(p)), 120);
      }
    });
  });

  // 自动存档定时器（每 30 秒）
  setInterval(async () => {
    try {
      await ProjectState.persist('autosave');
      await saveGame('v3main-v3modules', getV3Snapshot());
    } catch (e) {
      // 静默
    }
  }, 30000);

  console.log('[v3.1] 桥接器已完成初始化');
});
