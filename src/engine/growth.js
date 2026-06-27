/**
 * 成长曲线引擎
 * 复用v2.1 cvVal()逻辑，提供growth相关计算
 */

import { cvVal } from '../data/defaults.js';

/**
 * 获取养成系统某等级下的资源消耗
 * @param {string} cvId - 曲线ID
 * @param {number} level - 等级
 * @param {number} baseQty - 基础数量
 * @param {Array} curves - 曲线配置数组
 * @returns {number} 消耗量
 */
export function getCostAtLevel(cvId, level, baseQty, curves) {
  const curve = curves.find(c => c.id === cvId);
  if (!curve) return baseQty;
  const mult = cvVal(curve, level);
  return Math.round(baseQty * mult);
}

/**
 * 获取养成系统某等级下的属性增益
 * @param {string} cvId - 曲线ID
 * @param {number} level - 等级
 * @param {number} baseVal - 基础值
 * @param {Array} curves - 曲线配置数组
 * @returns {number} 属性值
 */
export function getGainAtLevel(cvId, level, baseVal, curves) {
  const curve = curves.find(c => c.id === cvId);
  if (!curve) return baseVal;
  const mult = cvVal(curve, level);
  return Math.round(baseVal * mult);
}

/**
 * 获取养成系统总消耗（1到maxLevel累计）
 */
export function getTotalCostUpToLevel(cvId, baseQty, curves, maxLevel) {
  let total = 0;
  for (let lv = 1; lv <= maxLevel; lv++) {
    total += getCostAtLevel(cvId, lv, baseQty, curves);
  }
  return total;
}

/**
 * 离线收益计算
 * @param {Object} params - { playerRealmTier, fenShenLevel, juLingLevel }
 * @returns {Object} { xpPerMin, stonePerMin, total24h }
 */
export function calcOfflineIncome(params) {
  const { playerRealmTier = 1, fenShenLevel = 0, juLingLevel = 0 } = params;

  // 基础修为 = 境界系数 × 0.5
  const baseXp = playerRealmTier * 0.5;

  // 分身等级系数 = 1 + (分身等级 × 0.01)
  const fenShenCoeff = 1 + (fenShenLevel * 0.01);

  // 聚灵阵加成 = 1 + (聚灵阵等级 × 0.002)
  const juLingBonus = 1 + (juLingLevel * 0.002);

  const xpPerMin = baseXp * fenShenCoeff * juLingBonus;
  const stonePerMin = fenShenLevel * 0.01;

  // 上限24小时游戏内时间 = 1440分钟
  const maxMinutes = 1440;

  return {
    xpPerMin: parseFloat(xpPerMin.toFixed(4)),
    stonePerMin: parseFloat(stonePerMin.toFixed(4)),
    total24hXp: Math.round(xpPerMin * maxMinutes),
    total24hStone: Math.round(stonePerMin * maxMinutes)
  };
}

/**
 * 边际效益递减计算
 * @param {number} investmentCount - 投入份数
 * @returns {number} 收益系数
 */
export function calcDiminishingReturn(investmentCount) {
  const coeff = 1 - (investmentCount - 1) * 0.3;
  return Math.max(0.1, coeff);
}

/** 曲线库统一在 src/data/defaults.js 的 DEFAULT_CURVES */
