/**
 * 战斗公式引擎
 * 整合v2.1现有公式 + 境界系数乘区 + 职业权重修正
 */

import { getRealmDiffMultiplier } from '../data/realms.js';
import { getClassMultiplier } from '../data/classes.js';

/**
 * 战斗参数配置
 */
export const COMBAT_CONFIG = {
  formulas: [
    { id: 'sub', name: '减法模型', desc: '伤害 = 攻击×c + (攻击×a - 防御×b)', enabled: true },
    { id: 'div', name: '除法模型', desc: '伤害 = 攻击×a × (1 - 防御/(防御+f(lv)×b))', enabled: true },
    { id: 'mul', name: '全乘法模型', desc: '伤害 = 攻击×a × (1-减伤%)×(1+暴伤%)×(1+增伤%)', enabled: true },
    { id: 'half', name: '半除法模型', desc: '(攻击-防御)×a + 攻击×b', enabled: true },
    { id: 'stair', name: '分段减法', desc: '防御>攻击×90%时触发保底', enabled: true },
    { id: 'combo', name: '除+乘混合', desc: '攻击减防御后，再乘增伤与暴击', enabled: true }
  ],
  defaults: {
    c: 0.5,  // 基础层系数
    a: 1.0,  // 攻击增益系数
    b: 0.8,  // 防御免伤系数
    critDmg: 50,  // 暴击伤害%
    bonus: 0,   // 增伤%
    minPct: 10   // 保底伤害%
  }
};

/**
 * 核心伤害计算公式
 * @param {Object} params - { atk, def, hp, critRate, critDmg, bonusPct, minPctPct, formulaType, c, a, b, realmMult, classMults, damageType }
 * @returns {Object} { baseDmg, critDmg, finalDmg, isCrit, penetrationRate }
 */
export function calcDamage(params) {
  const {
    atk, def, hp, critRate, critDmg: critDmgParam, bonusPct, minPctPct,
    formulaType = 'sub', c, a, b, realmMult = 1.0, classMults = {},
    damageType = 'physical', bypassDefense = false
  } = params;

  // 职业权重修正
  const atkMult = classMults.atk || 1.0;
  const defMult = classMults.def || 1.0;
  const hpMult = classMults.hp || 1.0;

  const effectiveAtk = atk * atkMult;
  const effectiveDef = def * defMult;
  const effectiveHp = hp * hpMult;

  let baseDmg = 0;

  // 境界系数乘区
  const realmMultiplier = realmMult;

  // 根据公式类型计算
  switch (formulaType) {
    case 'sub':
      baseDmg = effectiveAtk * c + (effectiveAtk * a - effectiveDef * b);
      break;
    case 'div':
      const fLv = Math.max(100, effectiveAtk * 0.5) * b;
      const dr = effectiveDef / (effectiveDef + fLv);
      baseDmg = effectiveAtk * a * Math.max(0.05, 1 - dr);
      break;
    case 'mul':
      const dr2 = (b / 100);
      const critMul = 1 + critDmgParam / 100;
      baseDmg = effectiveAtk * a * c * Math.max(0.05, 1 - dr2) * (1 + bonusPct / 100) * critMul;
      break;
    case 'half':
      baseDmg = Math.max(0, (effectiveAtk - effectiveDef)) * a + effectiveAtk * b;
      break;
    case 'stair':
      if (effectiveDef > effectiveAtk * 0.9) {
        baseDmg = effectiveAtk * c;
      } else {
        baseDmg = Math.max(0, effectiveAtk * a - effectiveDef * b) + effectiveAtk * (minPctPct / 100);
      }
      break;
    case 'combo':
      const comboBase = Math.max(0, (effectiveAtk * a - effectiveDef * b)) * c;
      baseDmg = comboBase * (1 + bonusPct / 100) * (1 + critDmgParam / 100);
      break;
    default:
      baseDmg = effectiveAtk * c + (effectiveAtk * a - effectiveDef * b);
  }

  // 真实伤害绕过防御 — bypassDefense boolean 由调用方设置
  if (!bypassDefense) {
    baseDmg *= realmMult;
  } else {
    baseDmg = effectiveAtk * a * realmMult;
  }

  // 保底伤害
  if (baseDmg <= 0 && effectiveAtk > 0) {
    baseDmg = effectiveAtk * (minPctPct / 100);
  }

  // 暴击判定
  const isCrit = Math.random() < (critRate / 100);
  let finalDmg = baseDmg;
  if (isCrit) {
    finalDmg *= (1 + critDmgParam / 100);
  }

  // 随机波动
  const randomMult = 0.95 + Math.random() * 0.1;
  finalDmg *= randomMult;

  return {
    baseDmg: Math.round(baseDmg),
    finalDmg: Math.round(finalDmg),
    isCrit,
    effectiveAtk: Math.round(effectiveAtk),
    effectiveDef: Math.round(effectiveDef),
    effectiveHp: Math.round(effectiveHp),
    realmMult,
    classMults
  };
}

/**
 * 战斗模拟（N次）
 */
export function simulateCombat(count, params) {
  let totalDmg = 0;
  let critCount = 0;
  let maxDmg = 0;

  for (let i = 0; i < count; i++) {
    const result = calcDamage(params);
    totalDmg += result.finalDmg;
    if (result.isCrit) critCount++;
    if (result.finalDmg > maxDmg) maxDmg = result.finalDmg;
  }

  return {
    count,
    avgDmg: Math.round(totalDmg / count),
    critRate: ((critCount / count) * 100).toFixed(2) + '%',
    maxDmg,
    minDmg: Math.round(totalDmg - (count - 1) * (totalDmg / count))
  };
}

/**
 * 回合制战斗模拟
 */
export function simulateRoundBattle(attacker, defender) {
  let attHp = attacker.hp;
  let defHp = defender.hp;
  let rounds = 0;
  const maxRounds = 30;

  const log = [];

  while (rounds < maxRounds && attHp > 0 && defHp > 0) {
    rounds++;

    // 攻击方出手
    const attResult = calcDamage({
      atk: attacker.atk,
      def: defender.def,
      hp: attacker.hp,
      critRate: attacker.critRate,
      critDmg: attacker.critDmg,
      bonusPct: attacker.bonusPct,
      minPctPct: 10,
      formulaType: attacker.formulaType || 'sub',
      c: attacker.c,
      a: attacker.a,
      b: attacker.b,
      realmMult: attacker.realmMult || 1.0,
      classMults: attacker.classMults || {},
      bypassDefense: (attacker.damageType || 'physical') === 'true'
    });

    defHp -= attResult.finalDmg;

    log.push({
      round: rounds,
      side: 'attacker',
      dmg: attResult.finalDmg,
      isCrit: attResult.isCrit,
      defHp: Math.max(0, defHp)
    });

    if (defHp <= 0) break;

    // 防守方出手
    const defResult = calcDamage({
      atk: defender.atk,
      def: attacker.def,
      hp: defender.hp,
      critRate: defender.critRate,
      critDmg: defender.critDmg,
      bonusPct: defender.bonusPct,
      minPctPct: 10,
      formulaType: defender.formulaType || 'sub',
      c: defender.c,
      a: defender.a,
      b: defender.b,
      realmMult: defender.realmMult || 1.0,
      classMults: defender.classMults || {},
      bypassDefense: (defender.damageType || 'physical') === 'true'
    });

    attHp -= defResult.finalDmg;

    log.push({
      round: rounds,
      side: 'defender',
      dmg: defResult.finalDmg,
      isCrit: defResult.isCrit,
      attHp: Math.max(0, attHp)
    });
  }

  const winner = attHp > 0 ? 'attacker' : 'defender';

  return {
    winner,
    rounds,
    attackerHp: Math.max(0, attHp),
    defenderHp: Math.max(0, defHp),
    log
  };
}
