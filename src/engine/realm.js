/**
 * 境界系数引擎
 * 处理突破模拟、成功率计算、境界差系数
 */

import {
  REALM_DATA,
  getRealm,
  getRealmDiffMultiplier,
  calcBreakthroughSuccess
} from '../data/realms.js';

/**
 * 境界突破模拟
 * @param {number} currentTier - 当前境界tier
 * @param {string} realmType - 'cultivation' or 'body'
 * @param {number} vipLevel - VIP等级
 * @param {Object} params - { hasBreakthroughItem, hasProtectionPill, hasVipBonus }
 * @returns {Object} { successRate, failPenalty, xpAfterBreakthrough }
 */
export function simulateBreakthrough(currentTier, realmType = 'cultivation', vipLevel = 0, params = {}) {
  const realm = getRealm(currentTier, realmType);
  if (!realm) {
    return { error: 'Invalid realm tier' };
  }

  let successRate = realm.successRate;

  // VIP加成
  if (params.hasVipBonus) {
    const vipBonus = vipLevel >= 7 ? 3 : vipLevel >= 14 ? 100 : 0;
    successRate = Math.min(100, successRate + vipBonus);
  }

  // 护脉丹
  if (params.hasProtectionPill) {
    successRate = Math.min(100, successRate + 20);
  }

  // 没有突破道具
  if (!params.hasBreakthroughItem) {
    successRate = 0;
  }

  const isSuccess = Math.random() * 100 < successRate;

  let failPenalty = { xpLoss: 0, cooldown: 0 };
  let xpAfterBreakthrough = 0;

  if (isSuccess) {
    // 成功
    xpAfterBreakthrough = realm.xpReq;
  } else {
    // 失败
    failPenalty = { ...realm.failPenalty };
    const costMult = realm.failPenalty.costMultiplier || 1;
    // 失败惩罚：修为倒退
    xpAfterBreakthrough = Math.round(realm.xpReq * (1 - failPenalty.xpLoss / 100));
  }

  return {
    currentTier,
    realmName: realm.name,
    successRate,
    isSuccess,
    failPenalty,
    xpAfterBreakthrough,
    realmMult: realm.realmMult
  };
}

/**
 * 计算境界差系数
 */
export function calcRealmDiff(attackerTier, defenderTier) {
  return getRealmDiffMultiplier(attackerTier, defenderTier);
}

/**
 * 获取所有境界信息
 */
export function getAllRealms(type = 'cultivation') {
  return REALM_DATA[type] || [];
}

/**
 * 境界系数曲线数据（用于Chart.js渲染）
 */
export function getRealmMultCurve(realmType = 'cultivation') {
  const realms = REALM_DATA[realmType] || [];
  return realms.map(r => ({
    tier: r.tier,
    name: r.name,
    mult: r.realmMult
  }));
}

/**
 * 突破成本预估（从tier 1到targetTier）
 */
export function calcTotalBreakthroughCost(targetTier, realmType = 'cultivation') {
  const realms = REALM_DATA[realmType];
  if (!realms) return { totalXp: 0, totalCost: 0, itemCount: 0 };

  let totalXp = 0;
  let totalCost = 0;
  let itemCount = 0;

  for (let i = 1; i <= targetTier; i++) {
    const realm = realms.find(r => r.tier === i);
    if (!realm) continue;

    totalXp += realm.xpReq;
    if (realm.breakthroughItem.itemId) {
      totalCost += realm.breakthroughItem.cost;
      itemCount += realm.breakthroughItem.count;
    }
  }

  return { totalXp, totalCost, itemCount };
}
