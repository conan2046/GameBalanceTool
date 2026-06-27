/**
 * GBT v3.3 — Curve Binding Component
 * 统一生成「曲线绑定」下拉框，供养成分支、消耗、收益等模块复用。
 */

export function getCurves() {
  const S = window.ProjectState && typeof window.ProjectState.get === 'function'
    ? window.ProjectState.get()
    : window.S;
  return (S && Array.isArray(S.curves)) ? S.curves : [];
}

export function buildCurveOptions(selectedId = '', options = {}) {
  const fixedLabel = options.fixedLabel || '-- 固定 --';
  const curves = getCurves();
  const opts = [`<option value="">${fixedLabel}</option>`];
  curves.forEach(cv => {
    const selected = cv.id === selectedId ? ' selected' : '';
    const type = cv.type ? `｜${cv.type}` : '';
    opts.push(`<option value="${escapeHtml(cv.id)}"${selected}>${escapeHtml(cv.name || cv.id)}${type}</option>`);
  });
  return opts.join('');
}

export function createCurveSelectHTML({ attr = 'data-curve-id', selectedId = '', className = 'fc', style = '', fixedLabel = '-- 固定 --' } = {}) {
  const styleAttr = style ? ` style="${style}"` : '';
  return `<select class="${className}" ${attr}${styleAttr}>${buildCurveOptions(selectedId, { fixedLabel })}</select>`;
}

export function getCurveName(curveId) {
  if (!curveId) return '固定';
  const cv = getCurves().find(c => c.id === curveId);
  return cv ? (cv.name || cv.id) : curveId;
}

export function getCurveById(curveId) {
  if (!curveId) return null;
  return getCurves().find(c => c.id === curveId) || null;
}

export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}
