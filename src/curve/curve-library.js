/**
 * GBT v3.2 — Curve Library
 * 曲线定义、参数 Schema、计算函数统一入口。
 */

export const CURVE_DEFINITIONS = {
  linear: {
    id: 'linear', name: '线性', category: '基础', formula: 'y = a * x',
    description: '稳定等差增长，适合作为基准对照。',
    params: [{ id: 'a', name: '系数 a', type: 'number', default: 10, step: 0.1, min: -999999 }]
  },
  diminishing: {
    id: 'diminishing', name: '边际递减', category: '养成', formula: 'y = a * coeff(level)',
    description: '每级收益按预设系数递减，适合氪金/升级边际收益验证。',
    params: [{ id: 'a', name: '基础收益 a', type: 'number', default: 10, step: 0.1, min: 0 }]
  },
  logarithmic: {
    id: 'logarithmic', name: '对数', category: '递减', formula: 'y = a * ln(x)',
    description: '前期快，后期缓慢，适合经验、熟练度、资源收益。',
    params: [{ id: 'a', name: '系数 a', type: 'number', default: 10, step: 0.1, min: 0 }]
  },
  sqrt: {
    id: 'sqrt', name: '平方根', category: '递减', formula: 'y = a * sqrt(x)',
    description: '幂函数 b=0.5 的常用特例，增长平滑。',
    params: [{ id: 'a', name: '系数 a', type: 'number', default: 10, step: 0.1, min: 0 }]
  },
  power: {
    id: 'power', name: '幂函数', category: '通用', formula: 'y = a * x^b',
    description: 'b<1 边际递减，b=1 线性，b>1 后期膨胀。',
    params: [
      { id: 'a', name: '系数 a', type: 'number', default: 10, step: 0.1, min: 0 },
      { id: 'b', name: '指数 b', type: 'number', default: 0.5, step: 0.05, min: 0 }
    ]
  },
  expo: {
    id: 'expo', name: '指数增长', category: '膨胀', formula: 'y = a * b^x',
    description: '后期快速膨胀，适合成本、等级经验、怪物成长压迫。',
    params: [
      { id: 'a', name: '系数 a', type: 'number', default: 10, step: 0.1, min: 0 },
      { id: 'b', name: '底数 b', type: 'number', default: 1.2, step: 0.01, min: 0 }
    ]
  },
  exponential: {
    id: 'exponential', name: '指数饱和', category: '饱和', formula: 'y = L * (1 - e^(-k*x))',
    description: '有上限，前期明显、后期趋缓，是养成系统常用形态。',
    params: [
      { id: 'a', alias: 'L', name: '上限 L', type: 'number', default: 500, step: 1, min: 0 },
      { id: 'k', name: '增长率 k', type: 'number', default: 0.05, step: 0.005, min: 0 }
    ]
  },
  sigmoid: {
    id: 'sigmoid', name: 'S型', category: '阶段', formula: 'y = L / (1 + e^(-k*(x-x0)))',
    description: '先慢、中期爆发、后期饱和，适合熟练度、解锁型成长。',
    params: [
      { id: 'a', alias: 'L', name: '上限 L', type: 'number', default: 500, step: 1, min: 0 },
      { id: 'k', name: '斜率 k', type: 'number', default: 0.08, step: 0.005, min: 0 },
      { id: 'x0', name: '中心点 x0', type: 'number', default: 8, step: 0.5, min: 0 }
    ]
  },
  fix: {
    id: 'fix', name: '恒定值', category: '离散', formula: 'y = a',
    description: '每级固定值，适合基础奖励或测试占位。',
    params: [{ id: 'a', name: '固定值 a', type: 'number', default: 10, step: 0.1 }]
  },
  stair: {
    id: 'stair', name: '阶梯跳跃', category: '离散', formula: 'y = lookup(level)',
    description: '按等级区间返回指定值，适合突破、品阶、节点奖励。',
    params: [{ id: 'stairs', name: '阶梯映射', type: 'json', default: [[5,100],[10,300],[20,1000]] }]
  }
};

const DIMINISHING = [1.0,0.75,0.5,0.35,0.25,0.18,0.13,0.10,0.08,0.06,0.05,0.04,0.03,0.03,0.02,0.02,0.015,0.015,0.01,0.01];

export function getCurveDefinition(type) {
  return CURVE_DEFINITIONS[type] || CURVE_DEFINITIONS.linear;
}

export function getCurveTypes() {
  return Object.values(CURVE_DEFINITIONS);
}

export function defaultParams(type) {
  const def = getCurveDefinition(type);
  const out = {};
  def.params.forEach(p => { out[p.id] = Array.isArray(p.default) ? JSON.parse(JSON.stringify(p.default)) : p.default; });
  return out;
}

export function normalizeCurve(curve = {}) {
  const type = curve.type || 'linear';
  return {
    id: curve.id || ('c' + Date.now()),
    name: curve.name || getCurveDefinition(type).name,
    type,
    params: { ...defaultParams(type), ...(curve.params || {}) }
  };
}

export function calculateCurveValue(curve, x) {
  const c = normalizeCurve(curve);
  const p = c.params || {};
  const level = Math.max(0, Number(x) || 0);
  switch (c.type) {
    case 'linear': return (Number(p.a) || 0) * level;
    case 'diminishing': return (Number(p.a) || 0) * (DIMINISHING[Math.max(0, Math.ceil(level) - 1)] || 0.01);
    case 'logarithmic': return (Number(p.a) || 0) * Math.log(Math.max(level, 0.0001));
    case 'sqrt': return (Number(p.a) || 0) * Math.sqrt(level);
    case 'power': return (Number(p.a) || 0) * Math.pow(level, Number(p.b) || 0.5);
    case 'expo': return (Number(p.a) || 0) * Math.pow(Number(p.b) || 1.2, level);
    case 'exponential': return (Number(p.a) || 0) * (1 - Math.exp(-(Number(p.k) || 0.05) * level));
    case 'sigmoid': return (Number(p.a) || 0) / (1 + Math.exp(-(Number(p.k) || 0.08) * (level - (Number(p.x0) || 8))));
    case 'fix': return Number(p.a) || 0;
    case 'stair': {
      const arr = Array.isArray(p.stairs) ? p.stairs : [];
      let v = 0;
      arr.forEach(item => {
        const u = Array.isArray(item) ? item[0] : item.u;
        const val = Array.isArray(item) ? item[1] : item.v;
        if (level >= Number(u)) v = Number(val) || 0;
      });
      return v;
    }
    default: return 0;
  }
}

export function sampleCurve(curve, maxLevel = 20) {
  return Array.from({ length: maxLevel }, (_, i) => calculateCurveValue(curve, i + 1));
}
