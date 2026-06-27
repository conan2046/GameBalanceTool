/**
 * 职业系统预设数据
 * 4职业 + 3伤害类型 + 1v1击杀矩阵
 * 来源: 用户截图(战斗属性投放比例 + 职业权重)
 */

export const CLASS_DATA = {
  classes: [
    {
      id: 'warrior',
      name: '战士',
      description: '坦克输出，低攻高防高血，节奏均衡',
      primaries: { power: 3, spirit: 0, agility: 1, endurance: 2, physique: 4 }
    },
    {
      id: 'mage',
      name: '法师',
      description: '高攻低防，法术输出，容错率低',
      primaries: { power: 1, spirit: 5, agility: 1, endurance: 1, physique: 2 }
    },
    {
      id: 'universal',
      name: '通用',
      description: '默认职业，无属性偏好',
      primaries: { power: 4, spirit: 0, agility: 2, endurance: 1, physique: 3 }
    }
  ],
  damageTypes: [
    {
      id: 'physical',
      name: '物理',
      bypassDefense: false,
      formulaModifier: 1.0,
      description: '标准伤害，受防御减免'
    },
    {
      id: 'magical',
      name: '法术',
      bypassDefense: false,
      formulaModifier: 1.0,
      description: '标准伤害，受法术防御减免（复用防御属性）'
    },
    {
      id: 'true',
      name: '真实',
      bypassDefense: true,
      formulaModifier: 1.0,
      description: '忽略所有防御乘区，仅受境界系数影响'
    }
  ],
  killMatrix: [] // 运行时动态生成
};

/**
 * 基础战斗属性 (ATK=800, DEF=400, HP=2400, 比例2:1:6)
 */
export const BASE_COMBAT_STATS = {
  atk: 800,
  def: 400,
  hp: 2400,
  roundsPerFight: 6
};

/**
 * 从一级属性计算二级属性（攻击/防御/生命）
 * 使用 window.ATTR_MATRIX 和 window.S 中的属性定义
 * @param {Object} primaries - { power, spirit, agility, endurance, physique }
 * @param {number} level - 参考等级（默认50）
 * @returns {Object} { atk, def, hp }
 */
export function computeStatsFromPrimaries(primaries, level = 50) {
  if (!primaries) primaries = { power: 4, spirit: 0, agility: 2, endurance: 1, physique: 3 };
  const matrix = typeof ATTR_MATRIX !== 'undefined' ? ATTR_MATRIX : null;
  const attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];

  if (!matrix || !attrs.length) {
    // 降级估算 — 对齐 ATTR_MATRIX 属性乘数，动态键名
    var fallback = {};
    fallback[attrs[0]?.id || 'a1'] = Math.round(level * ((primaries.power || 0) * 10 + (primaries.spirit || 0) * 10 + (primaries.agility || 0) * 8));
    fallback[attrs[1]?.id || 'a2'] = Math.round(level * (primaries.endurance || 1) * 8);
    fallback[attrs[2]?.id || 'a3'] = Math.round(level * (primaries.physique || 1) * 50);
    return fallback;
  }

  let result = {};

  // 从 ATTR_MATRIX 中收集所有 targetAttrId（不依赖 S.attrs 预定义）
  for (let key in matrix) {
    const row = matrix[key];
    if (!row.configs) continue;
    row.configs.forEach(config => {
      if (config.targetAttrId && !result.hasOwnProperty(config.targetAttrId)) {
        result[config.targetAttrId] = 0;
      }
    });
  }
  // 兜底：如果 ATTR_MATRIX 为空，至少建三个默认键
  if (Object.keys(result).length === 0) {
    attrs.forEach(a => result[a.id] = 0);
  }

  for (let key in matrix) {
    const row = matrix[key];
    const coeff = primaries[key] || 0; // 职业主属性投入
    if (coeff === 0) continue;

    // 基倍率从矩阵读取 — 铁律: 不硬编码乘数
    const baseMult = row.baseMult || (key === 'physique' ? 50 : (key === 'power' || key === 'spirit' ? 10 : 8));

    row.configs.forEach(config => {
      const targetId = config.targetAttrId;
      if (result[targetId] === undefined) return;
      // 公式: 等级 × 基倍率(矩阵) × 职业主属性值
      result[targetId] += level * baseMult * coeff;
    });
  }

  return result; // { a1: val, a2: val, a3: val, ... } 动态属性键
}

/**
 * 获取职业属性修正（保留兼容，现基于 primaries 计算）
 */
export function getClassMultiplier(classId) {
  const cls = CLASS_DATA.classes.find(c => c.id === classId);
  if (!cls) return {};
  const stats = computeStatsFromPrimaries(cls.primaries, 1);
  const attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];
  var result = {};
  attrs.forEach(function(a) {
    // BASE_COMBAT_STATS 是固定比例的参考值
    var ref = BASE_COMBAT_STATS[a.id] || (a.base || 100);
    result[a.id] = (stats[a.id] || 0) / ref;
  });
  return result;
}

/**
 * 批量模拟1v1对战
 */
export function simulate1v1(count, attackerClass, defenderClass) {
  const att = CLASS_DATA.classes.find(c => c.id === attackerClass);
  const def = CLASS_DATA.classes.find(c => c.id === defenderClass);
  if (!att || !def) return null;

  const attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];
  const atkKey = attrs[0]?.id || 'a1';
  const hpKey  = attrs[2]?.id || 'a3';
  const attStats = computeStatsFromPrimaries(att.primaries, 50);
  const defStats = computeStatsFromPrimaries(def.primaries, 50);

  let attWins = 0;
  let totalRounds = 0;

  for (let n = 0; n < count; n++) {
    let attHp = attStats[hpKey] || 0;
    let defHp = defStats[hpKey] || 0;
    let rounds = 0;
    const maxRounds = 30;

    while (rounds < maxRounds && attHp > 0 && defHp > 0) {
      rounds++;
      const attDmg = Math.max(1, Math.round((attStats[atkKey]||0) * (0.85 + Math.random() * 0.3)));
      defHp -= attDmg;
      if (defHp <= 0) break;
      const defDmg = Math.max(1, Math.round((defStats[atkKey]||0) * (0.85 + Math.random() * 0.3)));
      attHp -= defDmg;
    }

    if (attHp > 0) attWins++;
    totalRounds += rounds;
  }

  return {
    attackerClass, defenderClass,
    attackerWinRate: attWins / count,
    avgRounds: Math.round(totalRounds / count * 10) / 10,
    totalSimulations: count
  };
}

/**
 * 计算1v1对战结果（保留兼容）
 */
export function calc1v1(attackerClass, defenderClass) {
  const result = simulate1v1(1000, attackerClass, defenderClass);
  if (!result) return null;
  const att = CLASS_DATA.classes.find(c => c.id === attackerClass);
  const def = CLASS_DATA.classes.find(c => c.id === defenderClass);
  const attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];
  const atkKey = attrs[0]?.id || 'a1';
  const hpKey  = attrs[2]?.id || 'a3';
  const attStats = computeStatsFromPrimaries(att.primaries, 50);
  const defStats = computeStatsFromPrimaries(def.primaries, 50);
  return {
    attacker: attackerClass, defender: defenderClass,
    attackerStats: attStats, defenderStats: defStats,
    attackerRoundsToKill: Math.ceil((defStats[hpKey]||0) / Math.max(1, attStats[atkKey]||0)),
    defenderRoundsToKill: Math.ceil((attStats[hpKey]||0) / Math.max(1, defStats[atkKey]||0)),
    winner: result.attackerWinRate >= 0.5 ? attackerClass : defenderClass,
    winProb: result.attackerWinRate
  };
}
