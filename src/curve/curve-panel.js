/**
 * GBT v3.2 — Curve Panel
 * 接管旧曲线库 UI：模块化曲线定义 + 动态参数面板。
 */
import { CURVE_DEFINITIONS, getCurveTypes, getCurveDefinition, normalizeCurve, defaultParams, calculateCurveValue, sampleCurve } from './curve-library.js';
import { ProjectState } from '../core/project-state.js';

const $ = (id) => document.getElementById(id);
let selectedCurveId = '';

function toast(msg, type) {
  if (typeof window.toast === 'function') window.toast(msg, type);
  else console.log('[curve]', msg);
}

function saveProject() {
  if (typeof window.save === 'function') window.save();
  if (window.ProjectState && typeof window.ProjectState.emit === 'function') window.ProjectState.emit('curve-change');
}

function ensureCurves() {
  const S = ProjectState.get() || window.S || {};
  if (!S.curves) S.curves = [];
  S.curves = S.curves.map(normalizeCurve);
  if (!S.curves.length) {
    S.curves.push(
      { id: 'c1', name: '边际递减', type: 'diminishing', params: { a: 10 } },
      { id: 'c2', name: '线性', type: 'linear', params: { a: 10 } },
      { id: 'c3', name: '对数', type: 'logarithmic', params: { a: 10 } },
      { id: 'c4', name: '平方根', type: 'sqrt', params: { a: 10 } },
      { id: 'c5', name: '幂函数', type: 'power', params: { a: 10, b: 0.5 } },
      { id: 'c6', name: '指数饱和', type: 'exponential', params: { a: 500, k: 0.05 } },
      { id: 'c7', name: 'S型', type: 'sigmoid', params: { a: 500, k: 0.08, x0: 8 } }
    );
  }
  return S.curves;
}

function countUsage(curveId) {
  const S = ProjectState.get() || window.S || {};
  let count = 0;
  (S.cultivations || []).forEach(line => {
    (line.branches || []).forEach(branch => {
      if (branch.cvId === curveId) count++;
      (branch.consumes || []).forEach(c => { if (c.cvId === curveId) count++; });
      (branch.gains || []).forEach(g => { if (g.cvId === curveId) count++; });
    });
  });
  return count;
}

function drawSvg(svgId, vals) {
  const svg = $(svgId);
  if (!svg) return;
  const W = svg.clientWidth || 280;
  const H = svg.clientHeight || 150;
  const px = 30;
  const py = 20;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const rng = max - min || 1;
  const sx = i => px + (W - px * 2) * i / (vals.length - 1 || 1);
  const sy = v => H - py - (H - py * 2) * (v - min) / rng;
  const pts = vals.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
  const labelStyle = 'fill="#f3f6ff" font-size="12" font-weight="700"';
  const labels = vals.map((v, i) => (i === 0 || i === Math.floor(vals.length / 2) || i === vals.length - 1)
    ? `<text x="${sx(i)}" y="${H - 5}" ${labelStyle} text-anchor="middle">L${i + 1}</text><text x="${sx(i)}" y="${sy(v) - 6}" ${labelStyle} text-anchor="middle">${Math.round(v)}</text>`
    : '').join('');
  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>${labels}`;
}

function renderCurveTable() {
  const body = $('t-curve') && $('t-curve').querySelector('tbody');
  if (!body) return;
  const curves = ensureCurves();
  body.innerHTML = '';
  curves.forEach(curve => {
    const def = getCurveDefinition(curve.type);
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td><span class="badge badge-s">${curve.id}</span></td>
      <td><div class="curve-cell-inline"><b>${curve.name}</b><span class="help-block">${def.formula}</span></div></td>
      <td><div class="curve-cell-inline"><span class="badge badge-w">${def.name}</span><span class="help-block">${def.category}</span></div></td>
      <td><span class="badge badge-t">${countUsage(curve.id)}处引用</span></td>
      <td><button class="btn btn-ghost btn-xs" data-act="edit">修正</button> <button class="btn btn-danger btn-xs" data-act="del">擦除</button></td>`;
    tr.addEventListener('click', (e) => {
      const act = e.target && e.target.dataset && e.target.dataset.act;
      if (act === 'edit') return openCurveModal(curve.id);
      if (act === 'del') return deleteCurve(curve.id);
      selectedCurveId = curve.id;
      drawCurveGraph(curve);
    });
    body.appendChild(tr);
  });
}

function renderTypeOptions(selectedType) {
  const select = $('cv-type');
  if (!select) return;
  select.innerHTML = getCurveTypes().map(def => `<option value="${def.id}">${def.name}｜${def.formula}</option>`).join('');
  select.value = selectedType || 'linear';
}

function renderParamPanel(curve) {
  const common = $('cv-p-common');
  const stair = $('cv-p-stair');
  if (!common) return;
  if (stair) stair.style.display = 'none';
  const def = getCurveDefinition(curve.type);
  const params = { ...defaultParams(curve.type), ...(curve.params || {}) };
  common.style.display = 'grid';
  common.innerHTML = def.params.map(p => {
    if (p.type === 'json') {
      return `<div class="form-group" style="grid-column:1/-1"><label>${p.name}</label><textarea class="fc cv-dyn-param" data-param="${p.id}" rows="4">${JSON.stringify(params[p.id] ?? p.default)}</textarea><div class="help-block">支持 [[等级,数值],...] 或 [{"u":等级,"v":数值}]</div></div>`;
    }
    return `<div class="form-group"><label>${p.name}</label><input type="number" class="fc cv-dyn-param" data-param="${p.id}" value="${params[p.id] ?? p.default}" step="${p.step ?? 0.1}" ${p.min !== undefined ? `min="${p.min}"` : ''}></div>`;
  }).join('') + `<div class="form-group" style="grid-column:1/-1"><label>公式说明</label><div class="help-block">${def.description}<br><b>${def.formula}</b></div></div>`;
  common.querySelectorAll('.cv-dyn-param').forEach(input => input.addEventListener('input', previewCurveFromModal));
}

function readModalParams() {
  const type = $('cv-type') ? $('cv-type').value : 'linear';
  const params = {};
  document.querySelectorAll('.cv-dyn-param').forEach(input => {
    const key = input.dataset.param;
    if (input.tagName === 'TEXTAREA') {
      try { params[key] = JSON.parse(input.value || '[]'); }
      catch (e) { params[key] = []; }
    } else {
      params[key] = parseFloat(input.value) || 0;
    }
  });
  return params;
}

function previewCurveFromModal() {
  const type = $('cv-type') ? $('cv-type').value : 'linear';
  const curve = { type, params: readModalParams() };
  drawSvg('cv-svg', sampleCurve(curve, 15));
}

function openCurveModal(id = '') {
  const curves = ensureCurves();
  const curve = id ? normalizeCurve(curves.find(c => c.id === id)) : normalizeCurve({ id: '', name: '', type: 'linear' });
  if ($('mc-title')) $('mc-title').textContent = id ? '再校准现有增长曲线' : '录入全新算法增长模型';
  if ($('cv-id')) $('cv-id').value = curve.id || '';
  if ($('cv-name')) $('cv-name').value = curve.name || '';
  renderTypeOptions(curve.type);
  renderParamPanel(curve);
  previewCurveFromModal();
  if ($('m-curve')) $('m-curve').style.display = 'flex';
}

function saveCurve() {
  const S = ProjectState.get() || window.S;
  const id = $('cv-id') ? $('cv-id').value : '';
  const name = $('cv-name') ? $('cv-name').value.trim() : '';
  const type = $('cv-type') ? $('cv-type').value : 'linear';
  if (!name) return toast('公式模型必须有命名', 'e');
  const curve = normalizeCurve({ id: id || ('c' + (S.curves.length + 1 + Date.now() % 100)), name, type, params: readModalParams() });
  if (id) {
    const idx = S.curves.findIndex(c => c.id === id);
    if (idx >= 0) S.curves[idx] = curve;
  } else {
    S.curves.push(curve);
  }
  if (typeof window.cm === 'function') window.cm('m-curve');
  renderCurveTable();
  drawCurveGraph(curve);
  saveProject();
}

function deleteCurve(id) {
  const S = ProjectState.get() || window.S;
  if (countUsage(id) > 0) return toast('该曲线仍被养成系统引用，先解除绑定再删除', 'e');
  S.curves = (S.curves || []).filter(c => c.id !== id);
  renderCurveTable();
  saveProject();
}

function drawCurveGraph(curve) {
  selectedCurveId = curve.id || selectedCurveId;
  drawSvg('cv-svg', sampleCurve(curve, 15));
}

function initCurveLibraryPanel() {
  ensureCurves();
  const table = $('t-curve');
  if (table && table.querySelector('thead tr') && table.querySelector('thead tr').children.length === 4) {
    table.querySelector('thead tr').innerHTML = '<th>曲线ID</th><th>曲线名称</th><th>类型</th><th>绑定</th><th>操作</th>';
  }
  const type = $('cv-type');
  if (type) type.onchange = () => {
    renderParamPanel({ type: type.value, params: defaultParams(type.value) });
    previewCurveFromModal();
  };
  renderCurveTable();
  const first = ensureCurves()[0];
  if (first) drawCurveGraph(first);
}

// 兼容旧 inline 函数名
window.CURVE_DEFINITIONS = CURVE_DEFINITIONS;
window.initCurveLibraryPanel = initCurveLibraryPanel;
window.rCurves = renderCurveTable;
window.openCurveModal = openCurveModal;
window.saveCurve = saveCurve;
window.delCurve = deleteCurve;
window.switchCvType = function(){
  const type = $('cv-type') ? $('cv-type').value : 'linear';
  renderParamPanel({ type, params: defaultParams(type) });
  previewCurveFromModal();
};
window.getCvParams = readModalParams;
window.cvVal = calculateCurveValue;
window.prevCurve = previewCurveFromModal;
window.drawCurveGraph = drawCurveGraph;

export { initCurveLibraryPanel, calculateCurveValue, sampleCurve };
