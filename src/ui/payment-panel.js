import { ProjectState } from '../core/project-state.js';
import { runPaymentBehaviorSimulation } from '../engine/payment-behavior.js';

const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString();

function S() {
  return ProjectState.get() || window.S || {};
}

function intentText(intent) {
  if (intent === 'high') return '高';
  if (intent === 'medium') return '中';
  return '低';
}

function riskBadge(risk) {
  const cls = risk.level === 'P1' ? 'badge-w' : risk.level === 'P0' ? 'badge-d' : 'badge-t';
  const label = risk.level === 'P0' ? '零级风险' : risk.level === 'P1' ? '一级风险' : '二级风险';
  return `<span class="badge ${cls}">${label}</span>`;
}

function optionRows(tiers, selectedId) {
  return tiers.map(tier => `<option value="${tier.id}" ${tier.id === selectedId ? 'selected' : ''}>${tier.name}</option>`).join('');
}

export function renderPaymentPanel() {
  const state = S();
  const config = state.paymentConfig || {};
  const tiers = config.playerTiers || [];
  const selectedId = $('payment-tier')?.value || tiers[1]?.id || tiers[0]?.id || '';
  const selectedTier = tiers.find(tier => tier.id === selectedId);
  const budgetOverride = parseFloat($('payment-budget')?.value || '');
  const strategy = $('payment-strategy')?.value || 'roi';
  const simulationState = JSON.parse(JSON.stringify(state));
  if (selectedTier && Number.isFinite(budgetOverride)) {
    simulationState.paymentConfig.playerTiers = tiers.map(tier => tier.id === selectedTier.id ? { ...tier, budget: budgetOverride } : tier);
  }
  const report = runPaymentBehaviorSimulation(simulationState, { strategy });

  if ($('payment-tier')) $('payment-tier').innerHTML = optionRows(report.config.playerTiers, selectedId);
  if ($('payment-budget') && selectedTier && !Number.isFinite(budgetOverride)) $('payment-budget').value = selectedTier.budget;

  const tbody = document.querySelector('#payment-tier-table tbody');
  if (tbody) {
    tbody.innerHTML = report.tiers.map(tier => {
      const freeRatio = tier.advantage.free || 1;
      const lowRatio = tier.advantage.low_r || 1;
      return `<tr>
        <td style="font-weight:700">${tier.name}</td>
        <td>¥${fmt(tier.budget)}</td>
        <td style="color:var(--warning)">¥${fmt(tier.spent)}</td>
        <td>${tier.packRoi.toFixed(2)}x</td>
        <td style="color:var(--accent2);font-weight:700">${fmt(tier.totalPower)}</td>
        <td>${freeRatio.toFixed(2)}x / ${lowRatio.toFixed(2)}x</td>
        <td>${tier.repurchaseScore}</td>
        <td>${intentText(tier.repurchaseIntent)}</td>
      </tr>`;
    }).join('');
  }

  const purchase = $('payment-purchase-list');
  if (purchase) {
    const selectedResult = report.tiers.find(tier => tier.id === selectedId) || report.tiers[0];
    purchase.innerHTML = selectedResult && selectedResult.purchases.length
      ? selectedResult.purchases.map(item => `<div class="roi-comp-row"><div class="roi-comp-label">${item.name}</div><div class="roi-comp-bar"><div class="roi-comp-fill" style="width:${Math.min(100, item.roi * 12)}%;background:#4ecca3">投入回报 ${item.roi.toFixed(2)}倍</div></div><div class="roi-comp-val">¥${fmt(item.price)}</div></div>`).join('')
      : '<div class="help-block">当前档位预算不足或没有匹配礼包。</div>';
  }

  const moduleBody = document.querySelector('#payment-module-table tbody');
  if (moduleBody) {
    moduleBody.innerHTML = report.moduleMix.items.map(item => `<tr><td>${item.name || item.id}</td><td>${Number(item.ratio || 0).toFixed(1)}%</td></tr>`).join('');
  }
  if ($('payment-module-total')) $('payment-module-total').textContent = `${report.moduleMix.totalRatio.toFixed(1)}%`;

  const risks = $('payment-risk-list');
  if (risks) {
    risks.innerHTML = report.risks.length
      ? report.risks.map(risk => `<div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">${riskBadge(risk)}<span>${risk.message}</span></div>`).join('')
      : '<div class="help-block">当前配置未触发明显商业化风险。</div>';
  }

  return report;
}

export function initPaymentPanel() {
  window.renderPaymentPanel = renderPaymentPanel;
  const tierSelect = $('payment-tier');
  if (tierSelect && !tierSelect.dataset.paymentBound) {
    tierSelect.addEventListener('change', () => {
      const tier = ((S().paymentConfig || {}).playerTiers || []).find(item => item.id === tierSelect.value);
      if ($('payment-budget') && tier) $('payment-budget').value = tier.budget;
      renderPaymentPanel();
    });
    tierSelect.dataset.paymentBound = '1';
  }
  ['payment-budget', 'payment-strategy'].forEach(id => {
    const el = $(id);
    if (el && !el.dataset.paymentBound) {
      el.addEventListener('change', renderPaymentPanel);
      el.dataset.paymentBound = '1';
    }
  });
  if ($('payment-tier-table')) renderPaymentPanel();
}
