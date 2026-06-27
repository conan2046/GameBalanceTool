/**
 * 瑁呭寮曟搸
 * 瑁呭鎴樺姏绱姞銆佸搧璐ㄥ€嶇巼搴旂敤銆佺簿鐐煎姞鎴? */

import { EQUIPMENT_DATA } from '../data/equipment.js';

/**
 * 璁＄畻鍗曚欢瑁呭灞炴€? */
export function calcItemStats(slotId, qualityId, refineLevel) {
  const slot = EQUIPMENT_DATA.slots.find(s => s.id === slotId);
  const quality = EQUIPMENT_DATA.qualities.find(q => q.id === qualityId);

  if (!slot || !quality) return null;

  const mult = quality.mult;
  const refineBonus = refineLevel > 0
    ? 1 + (refineLevel * EQUIPMENT_DATA.refine.perLevel.damageBonus)
    : 1;

  const finalMult = mult * refineBonus;

  return {
    slotId,
    slotName: slot.name,
    qualityId,
    qualityName: quality.name,
    qualityColor: quality.color,
    refineLevel,
    mult: finalMult,
    attrs: {}
  };
}

/**
 * 璁＄畻鍏ㄨ韩瑁呭鎬诲睘鎬? */
export function calcFullEquipStats(equippedItems) {
  let totalAttrs = {};
  const attrs = typeof window !== 'undefined' && Array.isArray(window.S?.attrs) ? window.S.attrs : [];
  attrs.forEach(attr => { totalAttrs[attr.id] = 0; });
  if (!attrs.length) totalAttrs = { a1: 0, a2: 0, a3: 0 };
  let totalMult = 0;
  let refineBonuses = 0;

  for (const item of equippedItems) {
    const result = calcItemStats(item.slotId, item.quality, item.refineLevel);
    if (!result) continue;
    const slot = EQUIPMENT_DATA.slots.find(s => s.id === item.slotId);
    if (!slot) continue;

    totalMult += result.mult;
    refineBonuses += item.refineLevel * EQUIPMENT_DATA.refine.perLevel.damageBonus;
    Object.entries(slot.baseAttrs || {}).forEach(([attrId, value]) => {
      totalAttrs[attrId] = (totalAttrs[attrId] || 0) + Number(value || 0) * result.mult;
    });
  }

  return {
    totalAttrs,
    averageMult: equippedItems.length > 0 ? totalMult / equippedItems.length : 0,
    refineBonusFactor: 1 + refineBonuses
  };
}

/**
 * 鑾峰彇瑁呭鍝佽川鎺ㄨ崘
 */
export function getQualityRecommendation(currentLevel, targetSlot) {
  const qualities = EQUIPMENT_DATA.qualities;
  for (const q of qualities) {
    if (q.mult >= currentLevel * 0.1) return q;
  }
  return qualities[qualities.length - 1];
}

/**
 * 绮剧偧鎴愭湰璁＄畻
 */
export function calcRefineCost(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += Math.round(
      EQUIPMENT_DATA.refine.stones.baseCost *
      Math.pow(EQUIPMENT_DATA.refine.stones.costMultiplier, i - 1)
    );
  }
  return total;
}

/**
 * 绮剧偧鎴愬姛妯℃嫙
 */
export function simulateRefine(currentLevel, maxLevel, successRate = 0.7) {
  const results = [];
  let stoneCost = 0;

  for (let i = currentLevel + 1; i <= maxLevel; i++) {
    const success = Math.random() < successRate;
    const cost = calcRefineCost(i) - calcRefineCost(i - 1);

    results.push({
      level: i,
      success,
      cost,
      cumulativeCost: calcRefineCost(i)
    });

    stoneCost += cost;
  }

  return {
    currentLevel,
    maxLevel,
    results,
    totalStoneCost: stoneCost,
    estimatedSuccessRate: successRate
  };
}

