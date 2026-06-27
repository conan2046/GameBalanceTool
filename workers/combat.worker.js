/**
 * 战斗模拟 Web Worker
 * 处理高强度战斗计算，不阻塞主线程
 */

/**
 * 接收主线程消息
 */
self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'SIMULATE_COMBAT') {
    handleSimulateCombat(payload);
  } else if (type === 'CALC_DAMAGE') {
    handleCalcDamage(payload);
  } else if (type === 'ROUND_BATTLE') {
    handleRoundBattle(payload);
  }
};

/**
 * 处理大规模战斗模拟
 */
function handleSimulateCombat({ count, attacker, defender }) {
  let totalDmg = 0;
  let maxDmg = 0;
  let minDmg = Infinity;
  let critCount = 0;
  let rounds = 0;

  for (let i = 0; i < count; i++) {
    const result = calcSingleDamage(attacker, defender);
    totalDmg += result.finalDmg;
    if (result.finalDmg > maxDmg) maxDmg = result.finalDmg;
    if (result.finalDmg < minDmg) minDmg = result.finalDmg;
    if (result.isCrit) critCount++;
    rounds++;
  }

  self.postMessage({
    type: 'COMBAT_RESULT',
    payload: {
      count,
      avgDmg: Math.round(totalDmg / count),
      maxDmg,
      minDmg: minDmg === Infinity ? 0 : minDmg,
      critRate: ((critCount / count) * 100).toFixed(2) + '%',
      totalDmg
    }
  });
}

/**
 * 单次伤害计算
 */
function calcSingleDamage(attacker, defender) {
  const atk = attacker.atk || 100;
  const def = defender.def || 50;
  const critRate = attacker.critRate || 0.05;
  const critDmg = attacker.critDmg || 1.5;
  const realmMult = attacker.realmMult || 1.0;

  let baseDmg = atk * 0.5 + (atk - def);
  baseDmg *= realmMult;

  if (baseDmg <= 0) baseDmg = atk * 0.1;

  const isCrit = Math.random() < critRate;
  let finalDmg = baseDmg;

  if (isCrit) {
    finalDmg *= critDmg;
  }

  const randomMult = 0.95 + Math.random() * 0.1;
  finalDmg *= randomMult;

  return {
    baseDmg: Math.round(baseDmg),
    finalDmg: Math.round(finalDmg),
    isCrit
  };
}

/**
 * 处理回合制战斗
 */
function handleRoundBattle({ attacker, defender, maxRounds = 30 }) {
  let attHp = attacker.hp;
  let defHp = defender.hp;
  let round = 0;
  const log = [];

  while (round < maxRounds && attHp > 0 && defHp > 0) {
    round++;

    // 攻方出手
    const attResult = calcSingleDamage(
      { atk: attacker.atk, critRate: attacker.critRate, critDmg: attacker.critDmg, realmMult: attacker.realmMult },
      { def: defender.def }
    );
    defHp -= attResult.finalDmg;

    log.push({
      round,
      side: 'attacker',
      dmg: attResult.finalDmg,
      isCrit: attResult.isCrit,
      defHp: Math.max(0, defHp)
    });

    if (defHp <= 0) break;

    // 守方出手
    const defResult = calcSingleDamage(
      { atk: defender.atk, critRate: defender.critRate, critDmg: defender.critDmg, realmMult: defender.realmMult },
      { def: attacker.def }
    );
    attHp -= defResult.finalDmg;

    log.push({
      round,
      side: 'defender',
      dmg: defResult.finalDmg,
      isCrit: defResult.isCrit,
      attHp: Math.max(0, attHp)
    });
  }

  const winner = attHp > 0 ? 'attacker' : 'defender';

  self.postMessage({
    type: 'ROUND_BATTLE_RESULT',
    payload: {
      winner,
      rounds: round,
      attackerHp: Math.max(0, attHp),
      defenderHp: Math.max(0, defHp),
      log
    }
  });
}

/**
 * 处理单次伤害计算
 */
function handleCalcDamage({ attacker, defender }) {
  const result = calcSingleDamage(attacker, defender);
  self.postMessage({
    type: 'DAMAGE_RESULT',
    payload: result
  });
}
