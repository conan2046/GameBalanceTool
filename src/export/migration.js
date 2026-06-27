/**
 * 数据迁移工具 — v2.1→v3.0 + v3.x 版本升级
 * 
 * 铁律 #6: 所有存储源都要迁移
 * - IndexedDB (v3main): restoreV3Snapshot 加 key 迁移
 * - localStorage (gbt21_data): init() 加分支补全逻辑
 */

import { loadLocalStorageData } from './io.js';
import { REALM_DATA } from '../data/realms.js';
import { EQUIPMENT_DATA } from '../data/equipment.js';
import { CLASS_DATA } from '../data/classes.js';
import { CURRENCY_DATA } from '../data/currencies.js';
import { clonePaymentConfig } from '../data/payment-defaults.js';

/**
 * 主迁移函数 — v2.1 localStorage → v3.0 IndexedDB 格式
 */
export function migrateFromV2toV3() {
  console.log('=== GBT v2.1 → v3.0 数据迁移开始 ===');

  const v2Data = loadLocalStorageData();
  if (!v2Data || !v2Data.attrs) {
    console.log('未找到v2.1数据，使用内置预设');
    return getDefaultPreset();
  }

  const migrated = {
    realms: [],
    equipment: {
      slots: deepClone(EQUIPMENT_DATA.slots),
      qualities: deepClone(EQUIPMENT_DATA.qualities),
      refine: deepClone(EQUIPMENT_DATA.refine)
    },
    classes: deepClone(CLASS_DATA.classes),
    currencies: deepClone(CURRENCY_DATA),
    curves: v2Data.curves || [],
    cultivations: v2Data.cultivations || [],
    packs: v2Data.packs || [],
    shop: v2Data.shop || [],
    combatTiers: v2Data.combatTiers || [],
    starConfig: v2Data.starConfig || [],
    ecoConfig: v2Data.ecoConfig || {},
    paymentConfig: v2Data.paymentConfig || clonePaymentConfig(),
    resources: v2Data.resources || [],
    attrs: v2Data.attrs || []
  };

  // v2.1 attrs → v3 realms（参考映射）
  if (v2Data.attrs && v2Data.attrs.length) {
    migrated.realms = v2Data.attrs.map((attr, i) => ({
      id: attr.id || `realm_${i}`,
      name: attr.name || `境界${i + 1}`,
      tier: i + 1,
      xpReq: attr.base || 1000,
      realmMult: attr.weight || 1.0,
      successRate: Math.max(1, 100 - i * 10),
      failPenalty: { xpLoss: i * 3, cooldown: 0 },
      unlockSys: ['基础系统'],
      breakthroughItem: null,
      perfLevels: { basic: (attr.base || 1000), advanced: (attr.base || 1000) * 1.5, perfect: (attr.base || 1000) * 2, extreme: (attr.base || 1000) * 3 }
    }));
  }

  console.log('迁移完成，数据结构已更新');
  return migrated;
}

/**
 * 获取默认预设数据（全新安装）
 */
export function getDefaultPreset() {
  return {
    realms: REALM_DATA.cultivation.map(r => ({ ...r })),
    equipment: {
      slots: deepClone(EQUIPMENT_DATA.slots),
      qualities: deepClone(EQUIPMENT_DATA.qualities),
      refine: deepClone(EQUIPMENT_DATA.refine)
    },
    classes: deepClone(CLASS_DATA.classes),
    currencies: deepClone(CURRENCY_DATA),
    curves: [],
    cultivations: [],
    packs: [],
    shop: [],
    combatTiers: [],
    starConfig: [],
    ecoConfig: {},
    paymentConfig: clonePaymentConfig(),
    resources: []
  };
}

/**
 * 补丁：给旧版本 v3 快照补充缺失字段
 * 铁律 #6: 新增默认数据后，旧存档自动补全
 */
export function patchV3Snapshot(data) {
  if (!data) return data;
  const d = { ...data };

  // 确保 resources 存在（v3.0 初始版没有）
  if (!d.resources) d.resources = [];
  if (!d.ecoConfig) d.ecoConfig = {};
  if (!d.paymentConfig) d.paymentConfig = clonePaymentConfig();

  // 确保 combatTiers/starConfig/packs/shop 存在
  if (!d.combatTiers) d.combatTiers = [];
  if (!d.starConfig) d.starConfig = [];
  if (!d.packs) d.packs = [];
  if (!d.shop) d.shop = [];

  // 确保境界数据有 tier 1「凡人」
  if (d.realms) {
    const cult = d.realms.cultivation || d.realms;
    if (Array.isArray(cult) && !cult.find(r => r.tier === 1)) {
      cult.unshift({
        id: 'mortal1', tier: 1, name: '凡人', xpReq: 100,
        successRate: 100, failPenalty: { xpLoss: 0, cooldown: 0 },
        realmMult: 0.8, unlockSys: ['基础移动', '对话系统'],
        breakthroughItem: { itemId: null, cost: 0, count: 0 },
        perfLevels: { basic: 100, advanced: 150, perfect: 200, extreme: 300 }
      });
    }
  }

  // 确保装备品质有默认配置
  if (d.equipment && !d.equipment.qualities) {
    d.equipment.qualities = deepClone(EQUIPMENT_DATA.qualities);
  }
  if (d.equipment && !d.equipment.refine) {
    d.equipment.refine = deepClone(EQUIPMENT_DATA.refine);
  }

  // 确保职业有 damageTypes 和 killMatrix
  if (d.classes) {
    const clsArr = d.classes.classes || d.classes;
    if (Array.isArray(clsArr)) {
      clsArr.forEach(c => {
        if (!c.primaries) c.primaries = { power: 4, spirit: 0, agility: 2, endurance: 1, physique: 3 };
      });
    }
  }

  return d;
}

/** 深拷贝辅助 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 导出完整游戏数据（含所有模块）
 */
export function exportGameData(gameData) {
  return {
    version: '3.0',
    exportTime: new Date().toISOString(),
    ...gameData
  };
}

/**
 * 导入完整游戏数据
 */
export function importGameData(importedData) {
  if (!importedData || !importedData.version) {
    console.warn('无效的数据格式');
    return null;
  }
  console.log(`导入 v${importedData.version} 数据`);
  // 对导入的旧版本数据打补丁
  const patched = patchV3Snapshot(importedData);
  return { ...patched, lastImported: new Date().toISOString() };
}
