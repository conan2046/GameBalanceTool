/**
 * 曲线库默认值（复用v2.1逻辑）
 */

export const DEFAULT_CURVES = [
  { id: 'c1', name: '边际递减', type: 'diminishing', params: { a: 10 } },
  { id: 'c2', name: '线性', type: 'linear', params: { a: 10 } },
  { id: 'c3', name: '对数', type: 'logarithmic', params: { a: 10 } },
  { id: 'c4', name: '平方根', type: 'sqrt', params: { a: 10 } },
  { id: 'c5', name: '幂函数', type: 'power', params: { a: 10, b: 0.5 } },
  { id: 'c6', name: '指数饱和', type: 'exponential', params: { a: 10, k: 0.05 } },
  { id: 'c7', name: '平滑过渡型', type: 'sigmoid', params: { a: 10, k: 0.08, x0: 8 } }
];

/**
 * 曲线值计算（与v2.1 cvVal完全一致）
 */
export function cvVal(curve, x) {
  if (!curve || !curve.type) return 0;
  const p = curve.params || {};
  switch (curve.type) {
    case 'linear': return p.a * x;
    case 'diminishing': {
      const coeffs = [1.0, 0.75, 0.5, 0.35, 0.25, 0.18, 0.13, 0.10, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.015, 0.015, 0.01, 0.01];
      return p.a * (coeffs[x - 1] || 0.01);
    }
    case 'logarithmic': return p.a * Math.log(x + 0.01);
    case 'sqrt': return p.a * Math.sqrt(x);
    case 'power': return p.a * Math.pow(x, p.b || 0.5);
    case 'expo': return p.a * Math.pow(p.b || 1.2, x);
    case 'exponential': return p.a * (1 - Math.exp(-(p.k || 0.05) * x));
    case 'sigmoid': return p.a / (1 + Math.exp(-(p.k || 0.08) * (x - (p.x0 || 8))));
    case 'fix': return p.a;
    case 'stair': {
      const arr = p.stairs || [];
      let v = 0;
      for (let i = 0; i < arr.length; i++) {
        if (x >= arr[i].u) v = arr[i].v;
        else break;
      }
      return v;
    }
    default: return 0;
  }
}

/**
 * 获取曲线参数
 */
export function getCvParams(type, userValues) {
  const defaults = { a: 10 };
  if (type === 'power' || type === 'expo') defaults.b = 0.5;
  if (type === 'exponential') defaults.k = 0.05;
  if (type === 'sigmoid') { defaults.k = 0.08; defaults.x0 = 8; }
  if (type === 'stair') defaults.stairs = [[5, 100], [10, 300], [20, 1000]];
  
  return { ...defaults, ...userValues };
}
