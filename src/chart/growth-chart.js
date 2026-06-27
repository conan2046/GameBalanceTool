/**
 * 图表渲染模块
 * 成长曲线可视化
 */

/**
 * 在SVG元素中绘制曲线图
 * @param {string} svgId - SVG元素ID
 * @param {Array} values - 数据值数组
 * @param {Array} labels - 标签数组
 */
export function drawLineChart(svgId, values, labels = []) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const W = 400, H = 150, px = 40, py = 20;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const rng = max - min || 1;

  const x = (i) => px + (W - px * 2) * i / (values.length - 1 || 1);
  const y = (v) => H - py - (H - py * 2) * (v - min) / rng;

  let pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  
  let txts = values.map((v, i) => {
    if (i === 0 || i === Math.floor(values.length / 2) || i === values.length - 1) {
      const label = labels[i] || `L${i + 1}`;
      return `<text x="${x(i)}" y="${H - 4}" fill="var(--text3)" font-size="9" text-anchor="middle">${label}</text>` +
             `<text x="${x(i)}" y="${y(v) - 4}" fill="var(--accent2)" font-size="9" text-anchor="middle">${Math.round(v)}</text>`;
    }
    return '';
  }).filter(t => t).join('');

  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>` + txts;
}

/**
 * 在Canvas元素中绘制柱状图
 * @param {string} canvasId - Canvas元素ID
 * @param {Array} data - [{label, value, color}]
 */
export function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width || 400;
  const H = canvas.height || 200;
  const padding = 40;
  const chartW = W - padding * 2;
  const chartH = H - padding * 2;

  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = chartW / data.length * 0.8;
  const gap = chartW / data.length * 0.2;

  data.forEach((d, i) => {
    const x = padding + i * (barWidth + gap) + gap / 2;
    const barHeight = (d.value / max) * chartH;
    const y = H - padding - barHeight;

    ctx.fillStyle = d.color || '#6c63ff';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#e8eaf6';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barWidth / 2, H - padding + 15);
    ctx.fillText(Math.round(d.value), x + barWidth / 2, y - 5);
  });
}

/**
 * 绘制饼图（占比分布）
 * @param {string} canvasId - Canvas元素ID
 * @param {Array} data - [{label, value, color}]
 */
export function drawPieChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = -Math.PI / 2;

  data.forEach(d => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();

    // 标签
    const midAngle = startAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(midAngle) * radius * 0.7;
    const labelY = centerY + Math.sin(midAngle) * radius * 0.7;
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(d.value / total * 100)}%`, labelX, labelY);

    startAngle += sliceAngle;
  });
}

/**
 * 混合图表（折线+柱状）
 * @param {string} svgId - SVG元素ID
 * @param {Object} config - { bars: [], lines: [] }
 */
export function drawMixedChart(svgId, config) {
  const svg = document.getElementById(svgId);
  if (!svg || !config) return;

  const { bars = [], lines = [] } = config;
  const W = 400, H = 200, px = 50, py = 20;
  const chartW = W - px * 2;
  const chartH = H - py * 2;

  const allValues = [...bars.map(b => b.value), ...lines.flatMap(l => l.values)];
  const max = Math.max(...allValues, 1);

  let html = '';

  // 柱状图
  bars.forEach((b, i) => {
    const x = px + (chartW / bars.length) * i + chartW / bars.length * 0.1;
    const w = (chartW / bars.length) * 0.8;
    const h = (b.value / max) * chartH;
    const y = H - py - h;
    html += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${b.color || '#6c63ff'}" rx="2"/>`;
  });

  // 折线图
  lines.forEach(line => {
    let pts = '';
    line.values.forEach((v, i) => {
      const x = px + (chartW / (line.values.length - 1 || 1)) * i;
      const y = H - py - (v / max) * chartH;
      pts += `${x},${y} `;
    });
    html += `<polyline points="${pts.trim()}" fill="none" stroke="${line.color || '#ff4757'}" stroke-width="2"/>`;
  });

  svg.innerHTML = html;
}

/**
 * 养成树分支曲线叠加图 (Chart.js)
 * 每级消耗 + 属性增益 双Y轴对比
 * @param {string} canvasId - canvas 元素 ID
 * @param {Object} branch - 分支数据 { name, maxLevel, consumes:[], gains:[] }
 * @param {Array} curves - 曲线库 [{id, name, type, params}]
 * @param {Object} S - 全局数据（含 resources）
 */
export function drawCultivationCurve(canvasId, branch, curves, S) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !branch || !branch.maxLevel) return;

  // 销毁旧图表
  if (canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }

  // 从 CSS 变量读取颜色（铁律 #10）
  var cs = getComputedStyle(document.documentElement);
  var cText = cs.getPropertyValue('--text').trim() || '#e8eaf6';
  var cText2 = cs.getPropertyValue('--text2').trim() || '';
  var cText3 = cs.getPropertyValue('--text3').trim() || '';
  var cWarning = cs.getPropertyValue('--warning').trim() || '#ffa502';
  var cSuccess = cs.getPropertyValue('--success').trim() || '#2ed573';

  // 兼容旧格式
  var costs = branch.consumes || (branch.resId ? [{resId:branch.resId, qty:branch.qty||1, cvId:branch.cvId||''}] : []);
  var gains = branch.gains  || (branch.attrId ? [{attrId:branch.attrId, val:branch.attrVal||10}] : []);

  var levels = [];
  for (var lv = 1; lv <= branch.maxLevel; lv++) levels.push(lv);

  // 计算每级消耗（取第一个消耗项）
  var costData = [];
  var costLabel = '';
  if (costs.length > 0) {
    var c0 = costs[0];
    var curve = curves.find(function(c){return c.id===c0.cvId;});
    costLabel = (S&&S.resources ? (S.resources.find(function(r){return r.id===c0.resId;})||{}).name||c0.resId : c0.resId) || '消耗';

    levels.forEach(function(lv) {
      var mult = 1;
      if (curve && typeof cvVal === 'function') mult = cvVal(curve, lv);
      else if (curve && curve.type === 'linear') mult = lv;
      costData.push(Math.round(c0.qty * mult));
    });
  }

  // 计算每级属性增益（取第一个属性项）
  var attrData = [];
  var attrLabel = '属性';
  if (gains.length > 0) {
    var g0 = gains[0];
    var attrCurve = curves.find(function(c){return c.id===g0.cvId;});
    attrLabel = (g0.attrId||'属性') + ' +'+g0.val;
    levels.forEach(function(lv) {
      var mult = 1;
      if (attrCurve && typeof cvVal === 'function') mult = cvVal(attrCurve, lv);
      else if (attrCurve && attrCurve.type === 'linear') mult = lv;
      attrData.push(Math.round(g0.val * mult));
    });
  }

  var datasets = [];
  if (costData.length) {
    datasets.push({
      label: costLabel,
      data: costData,
      borderColor: '#ffa502',
      backgroundColor: 'rgba(255,165,2,0.1)',
      yAxisID: 'y',
      tension: 0.3,
      fill: false
    });
  }
  if (attrData.length) {
    datasets.push({
      label: attrLabel,
      data: attrData,
      borderColor: '#2ed573',
      backgroundColor: 'rgba(46,213,115,0.1)',
      yAxisID: 'y1',
      tension: 0.3,
      fill: false
    });
  }

  var chart = new Chart(canvas, {
    type: 'line',
    data: { labels: levels.map(function(l){return 'Lv.'+l;}), datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: branch.name + ' 成长曲线', color: cText, font: {size:14} },
        legend: { labels: { color: cText2 } }
      },
      scales: {
        x: { title: { display: true, text: '等级', color: cText2 }, ticks: { color: cText3 } },
        y: {
          type: 'linear', display: (costData.length>0),
          title: { display: true, text: costLabel, color: cWarning },
          ticks: { color: cText3 }
        },
        y1: {
          type: 'linear', display: (attrData.length>0), position: 'right',
          title: { display: true, text: attrLabel, color: cSuccess },
          ticks: { color: cText3 },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
  canvas._chart = chart;
}

/**
 * 曲线库预览对比图 (Chart.js)
 * 多个曲线类型在同一画布上叠加展示
 * @param {string} canvasId - canvas 元素 ID
 * @param {Array} curves - 曲线库 [{id,name,type,params}]
 * @param {number} maxLevel - X轴最大等级
 */
export function drawCurveComparison(canvasId, curves, maxLevel) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || !curves || !curves.length) return;

  if (canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  var cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 420));
  var cssHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 180));
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  maxLevel = maxLevel || 20;
  var levels = [];
  for (var lv = 1; lv <= maxLevel; lv++) levels.push(lv);

  // 铁律 #10: 图表颜色从 CSS 变量读取
  var cs = getComputedStyle(document.documentElement);
  var cText = cs.getPropertyValue('--text').trim() || '#e8eaf6';
  var cText2 = cs.getPropertyValue('--text2').trim() || '';
  var cText3 = cs.getPropertyValue('--text3').trim() || '';
  var cAccent = cs.getPropertyValue('--accent').trim() || '#6c63ff';
  var cAccent2 = cs.getPropertyValue('--accent2').trim() || '#00c9a7';
  var cDanger = cs.getPropertyValue('--danger').trim() || '#ff4757';
  var cWarning = cs.getPropertyValue('--warning').trim() || '#ffa502';
  var cSuccess = cs.getPropertyValue('--success').trim() || '#2ed573';

  var colors = [cAccent, cAccent2, cDanger, cWarning, cSuccess, cText2];

  var datasets = curves.map(function(c, i) {
    var data = levels.map(function(lv) {
      if (typeof cvVal === 'function') return cvVal(c, lv);
      // fallback: linear
      var p = c.params || {};
      return (p.a||10) * lv;
    });
    return {
      label: c.name,
      data: data,
      borderColor: colors[i % colors.length],
      tension: 0.3,
      fill: false,
      pointRadius: 2
    };
  });

  var chart = new Chart(canvas, {
    type: 'line',
    data: { labels: levels.map(function(l){return 'Lv.'+l;}), datasets: datasets },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      devicePixelRatio: dpr,
      plugins: {
        title: { display: true, text: '\u66f2\u7ebf\u5e93\u5bf9\u6bd4\uff08\u7b2c1\u7ea7-' + maxLevel + '\u7ea7\uff09', color: cText, font: { size: 15, weight: '700' } },
        legend: { labels: { color: cText, font: { size: 12, weight: '600' } } }
      },
      scales: {
        x: {
          title: { display: true, text: '\u7b49\u7ea7', color: cText2, font: { size: 12, weight: '600' } },
          ticks: { color: cText, font: { size: 13, weight: '700' } }
        },
        y: {
          title: { display: true, text: '\u500d\u7387\u503c', color: cText2, font: { size: 12, weight: '600' } },
          ticks: { color: cText, font: { size: 13, weight: '700' } }
        }
      }
    }
  });
  canvas._chart = chart;
}
