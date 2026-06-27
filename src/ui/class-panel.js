/**
 * UI妯″潡 - 鑱屼笟闈㈡澘
 * 鑱屼笟棰勮 + 浼ゅ绫诲瀷閰嶇疆 + 1v1鍑绘潃鐭╅樀锛堟敮鎸佹壒閲忔ā鎷燂級
 */

import { CLASS_DATA, simulate1v1, computeStatsFromPrimaries } from '../data/classes.js';

const PRIMARY_LABELS = { power: '力量', spirit: '灵力', agility: '敏捷', endurance: '耐力', physique: '体质' };
const PRIMARY_KEYS = ['power', 'spirit', 'agility', 'endurance', 'physique'];

/** 鍔ㄦ€佹瀯寤轰簩绾у睘鎬ч瑙圚TML锛宎ttr鍚嶁啋棰滆壊鎸夐搧寰?10鏄犲皠 */
function _buildStatsPreview(stats) {
  var attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];
  var colors = ['var(--danger)', 'var(--accent2)', 'var(--success)', 'var(--warning)', 'var(--accent)'];
  return attrs.map(function(a, index) {
    var c = colors[index % colors.length];
    return '<span>' + a.name + ': <b style="color:' + c + '">' + (stats[a.id] || 0) + '</b></span>';
  }).join('');
}
/** 璇诲彇 ATTR_MATRIX锛屾樉绀轰竴绾р啋浜岀骇灞炴€ф槧灏勬彁绀?*/
function _buildMatrixMappingHint() {
  var m = typeof ATTR_MATRIX !== 'undefined' ? ATTR_MATRIX : null;
  if (!m) return '（无属性成长矩阵数据）';
  var lines = [];
  PRIMARY_KEYS.forEach(function(k) {
    var row = m[k];
    if (!row || !row.configs) return;
    var targets = row.configs.map(function(c) {
      var attrName = (typeof S !== 'undefined' && S.attrs) 
        ? ((S.attrs.find(function(a){return a.id===c.targetAttrId;})||{}).name || c.targetAttrId) 
        : c.targetAttrId;
      return attrName;
    }).join('/');
    var bm = row.baseMult || '?';
    lines.push(PRIMARY_LABELS[k]+' -> '+targets+' (x'+bm+')');
  });
  return '映射规则：' + lines.join(' | ');
}

let currentClass = 'universal';
let currentLevel = 50;

/** 鍒濆鍖栬亴涓氶潰鏉?*/
export function initClassPanel() {
  renderClassSelector();
  renderDamageTypes();
  renderKillMatrix();
}

/** 娓叉煋鑱屼笟閫夋嫨鍣?*/
function renderClassSelector() {
  const grid = document.getElementById('class-selector');
  if (!grid) return;

  let html = `
    <div class="class-level-row">
      <label>参考等级</label>
      <input type="number" min="1" max="130" value="${currentLevel}"
        onchange="setClassLevel(this.value)" class="fc">
    </div>`;

  html += CLASS_DATA.classes.map(cls => {
    const stats = computeStatsFromPrimaries(cls.primaries, currentLevel);
    var attrs = typeof S !== 'undefined' && S.attrs ? S.attrs : [];
    var statsHtml = attrs.map(function(a) {
      return '<div class="class-stat-item"><span class="label">' + a.name + '：</span><span class="value">' + (stats[a.id] || 0) + '</span></div>';
    }).join('') + '<div class="class-stat-item"><span class="label">等级：</span><span class="value">第' + currentLevel + '级</span></div>';
    return `
    <div class="class-card ${currentClass === cls.id ? 'active' : ''}" data-class-id="${cls.id}" onclick="selectClass('${cls.id}')">
      <div class="class-name">${cls.name}</div>
      <div class="class-stats">${statsHtml}</div>
      <div style="display:flex;gap:4px;margin-top:8px;justify-content:center">
        <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();editClass('${cls.id}')">编辑</button>
        <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteClass('${cls.id}')" ${CLASS_DATA.classes.length <= 1 ? 'disabled' : ''}>删除</button>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = html;
}

/** 閫夋嫨鑱屼笟 */
export function selectClass(classId) {
  currentClass = classId;
  renderClassSelector();
  renderKillMatrix();
}

/** 缂栬緫鑱屼笟锛堜竴绾?浜岀骇灞炴€э級 */
export function editClass(classId) {
  const cls = CLASS_DATA.classes.find(c => c.id === classId);
  if (!cls) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000';
  overlay.onclick = function(e) { if (e.target === this) overlay.remove(); };

  const primaryInputs = PRIMARY_KEYS.map(k =>
    `<div class="form-group"><label>${PRIMARY_LABELS[k]}</label><input type="number" class="fc" id="ec-${k}" value="${cls.primaries[k] || 0}" min="0" step="1"></div>`
  ).join('');

  const stats = computeStatsFromPrimaries(cls.primaries, currentLevel);

  overlay.innerHTML = `
    <div class="modal" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);width:100%;max-width:480px;display:flex;flex-direction:column;max-height:90%">
      <div class="modal-header" style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <span class="modal-title">编辑职业 - ${cls.name}</span>
        <button class="btn btn-ghost btn-xs" onclick="this.closest('.modal-overlay').remove()">关闭</button>
      </div>
      <div class="modal-body" style="padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto">
        <div class="form-group"><label>名称</label><input class="fc" id="ec-name" value="${cls.name}"></div>
        <div style="border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--bg2)">
          <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">一级属性（基础数值分配）</div>
          <div class="grid-3">${primaryInputs}</div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">
            ${ _buildMatrixMappingHint() }
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--bg3)">
          <div style="font-size:12px;font-weight:600;color:var(--warning);margin-bottom:6px">二级属性预览（第${currentLevel}级）</div>
          <div style="display:flex;gap:16px;font-size:14px;flex-wrap:wrap">
            ${ _buildStatsPreview(stats) }
          </div>
        </div>
        <div class="form-group"><label>描述</label><input class="fc" id="ec-desc" value="${cls.description}"></div>
      </div>
      <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:end;gap:10px">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveClass('${classId}')">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/** 淇濆瓨鑱屼笟缂栬緫 */
export function saveClass(classId) {
  const cls = CLASS_DATA.classes.find(c => c.id === classId);
  if (!cls) return;

  const name = document.getElementById('ec-name').value.trim();
  if (!name) { alert('名称不能为空'); return; }
  cls.name = name;

  PRIMARY_KEYS.forEach(k => {
    cls.primaries[k] = parseInt(document.getElementById('ec-' + k).value) || 0;
  });

  cls.description = document.getElementById('ec-desc').value.trim();

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
  initClassPanel();
}

/** 璁剧疆鍙傝€冪瓑绾?*/
export function setClassLevel(val) {
  currentLevel = parseInt(val) || 50;
  if (currentLevel < 1) currentLevel = 1;
  if (currentLevel > 130) currentLevel = 130;
  renderClassSelector();
}

/** 娓叉煋浼ゅ绫诲瀷 */
function renderDamageTypes() {
  const container = document.getElementById('damage-types');
  if (!container) return;

  container.innerHTML = CLASS_DATA.damageTypes.map(dt => `
    <div class="damage-type-card">
      <div class="dt-name">${dt.name}</div>
      <div class="dt-desc">${dt.description}</div>
      <label>
        <input type="checkbox" ${dt.bypassDefense ? 'checked' : ''} onchange="toggleDamageType('${dt.id}')">
        忽略防御
      </label>
      <button class="btn btn-danger btn-xs" onclick="deleteDamageType('${dt.id}')">删除</button>
    </div>
  `).join('');
}

/** 鍒囨崲浼ゅ绫诲瀷璁剧疆 */
export function toggleDamageType(damageTypeId) {
  const dt = CLASS_DATA.damageTypes.find(d => d.id === damageTypeId);
  if (dt) dt.bypassDefense = !dt.bypassDefense;
}

/** 妯℃嫙鍦烘鏁帮紙榛樿10000锛?*/
let simCount = 10000;

/** 璁剧疆妯℃嫙鍦烘 */
export function setSimCount(val) {
  simCount = parseInt(val) || 10000;
  if (simCount < 100) simCount = 100;
  if (simCount > 100000) simCount = 100000;
  renderKillMatrix();
}

/** 娓叉煋1v1鍑绘潃鐭╅樀锛堝姩鎬佹ā鎷燂級 */
function renderKillMatrix() {
  const container = document.getElementById('kill-matrix');
  if (!container) return;

  const classes = CLASS_DATA.classes;

  // 妯℃嫙鍦烘杈撳叆
  let html = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <span style="font-size:12px;color:var(--text2)">模拟场次：</span>
      <input type="number" class="fc" value="${simCount}" min="100" max="100000" step="100"
        onchange="setSimCount(this.value)" class="fc" style="width:120px">
      <span style="font-size:10px;color:var(--text3)">（范围100~100000）</span>
      <button class="btn btn-primary btn-xs" onclick="setSimCount(document.querySelector('#kill-matrix input').value)">重新模拟</button>
    </div>
  `;

  // 鐭╅樀琛ㄦ牸
  html += '<table class="tbl"><thead><tr><th>攻方\\守方</th>';
  classes.forEach(cls => { html += `<th>${cls.name}</th>`; });
  html += '</tr></thead><tbody>';

  classes.forEach(attCls => {
    html += `<tr><td><b>${attCls.name}</b></td>`;
    classes.forEach(defCls => {
      const result = simulate1v1(simCount, attCls.id, defCls.id);
      if (!result) {
        html += '<td>-</td>';
      } else {
        const winRate = result.attackerWinRate;
        const color = winRate > 0.6 ? 'var(--success)' : winRate > 0.4 ? 'var(--warning)' : 'var(--danger)';
        html += `<td style="color:${color};text-align:center;font-size:12px">
          <b>${winRate >= 0.5 ? '胜' : '负'}</b>
          <span style="font-size:18px;font-weight:700">${(winRate * 100).toFixed(1)}%</span>
          <span style="display:block;font-size:10px;color:var(--text3)">${result.avgRounds}回合</span>
        </td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// 鈹€鈹€ CRUD 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/** 鏂板鑱屼笟 */
export function addClass() {
  const id = 'cls_' + Date.now();
  const count = CLASS_DATA.classes.length + 1;
  CLASS_DATA.classes.push({
    id, name: '新职业' + count,
    description: '自定义职业',
    primaries: { power: 4, spirit: 0, agility: 2, endurance: 1, physique: 3 }
  });
  initClassPanel();
}

/** 鍒犻櫎鑱屼笟锛堜繚鐣欐渶灏?涓級 */
export function deleteClass(classId) {
  if (CLASS_DATA.classes.length <= 1) return;
  CLASS_DATA.classes = CLASS_DATA.classes.filter(c => c.id !== classId);
  if (currentClass === classId) currentClass = CLASS_DATA.classes[0]?.id || 'universal';
  initClassPanel();
}

/** 鏂板浼ゅ绫诲瀷 */
export function addDamageType() {
  const id = 'dt_' + Date.now();
  CLASS_DATA.damageTypes.push({
    id, name: '新伤害类型', bypassDefense: false, formulaModifier: 1.0,
    description: '自定义伤害类型'
  });
  initClassPanel();
}

/** 鍒犻櫎浼ゅ绫诲瀷 */
export function deleteDamageType(typeId) {
  CLASS_DATA.damageTypes = CLASS_DATA.damageTypes.filter(d => d.id !== typeId);
  initClassPanel();
}

