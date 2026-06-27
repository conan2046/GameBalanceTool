import { DEFAULT_PAYMENT_CONFIG, clonePaymentConfig } from '../data/payment-defaults.js';
import {
  evalCurveById,
  getBranchLevelGains,
  getBranchLevelCost,
  normalizeBranch,
} from './simulator.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clone = value => JSON.parse(JSON.stringify(value || {}));

export function ensurePaymentConfig(state = {}) {
  const defaults = clonePaymentConfig();
  const current = state.paymentConfig || {};
  const merged = {
    ...defaults,
    ...current,
    thresholds: { ...defaults.thresholds, ...(current.thresholds || {}) },
    scoringWeights: { ...defaults.scoringWeights, ...(current.scoringWeights || {}) },
    playerTiers: Array.isArray(current.playerTiers) && current.playerTiers.length ? clone(current.playerTiers) : defaults.playerTiers,
    moduleMix: Array.isArray(current.moduleMix) && current.moduleMix.length ? clone(current.moduleMix) : defaults.moduleMix,
  };
  state.paymentConfig = merged;
  return merged;
}

export function evaluatePackValue(pack = {}, resources = []) {
  const value = Object.entries(pack.items || {}).reduce((sum, [resourceId, quantity]) => {
    const resource = resources.find(r => r.id === resourceId);
    return sum + num(quantity) * num(resource?.price);
  }, 0);
  const price = num(pack.price);
  return {
    value,
    price,
    roi: price > 0 ? value / price : 0,
  };
}

export function validateModuleMix(config) {
  const moduleMix = Array.isArray(config.moduleMix) ? config.moduleMix : [];
  const thresholds = config.thresholds || {};
  const totalTarget = num(thresholds.moduleTotal, 100);
  const tolerance = num(thresholds.moduleTolerance, 0.5);
  const singleMax = num(thresholds.moduleSingleMax, 70);
  const totalRatio = moduleMix.reduce((sum, item) => sum + num(item.ratio), 0);
  const risks = [];

  if (Math.abs(totalRatio - totalTarget) > tolerance) {
    risks.push({
      code: 'module_total_mismatch',
      level: 'P1',
      message: `功能模块投放占比合计为 ${totalRatio}%，目标应为 ${totalTarget}%`,
    });
  }

  moduleMix.filter(item => num(item.ratio) > singleMax).forEach(item => {
    risks.push({
      code: 'single_module_overweight',
      level: 'P1',
      message: `${item.name || item.id} 占比 ${item.ratio}%，存在单线最优风险`,
    });
  });

  return { items: moduleMix, totalRatio, risks };
}

function getPackLimit(pack) {
  const limit = num(pack.limit ?? pack.maxBuy ?? 1, 1);
  return Math.max(1, Math.floor(limit));
}

function isPackEligible(pack, tier) {
  const targets = pack.targetTiers || pack.targetTierIds || [];
  return !Array.isArray(targets) || targets.length === 0 || targets.includes(tier.id);
}

function sortPacks(packs, resources, strategy) {
  const valueOf = pack => evaluatePackValue(pack, resources);
  return [...packs].sort((a, b) => {
    if (strategy === 'cheap') return num(a.price) - num(b.price) || valueOf(b).roi - valueOf(a).roi;
    if (strategy === 'expensive') return num(b.price) - num(a.price) || valueOf(b).roi - valueOf(a).roi;
    return valueOf(b).roi - valueOf(a).roi || num(a.price) - num(b.price);
  });
}

function buyPacksForTier(state, tier, strategy) {
  const resources = state.resources || [];
  const wallet = {};
  const purchases = [];
  let spent = 0;
  let totalValue = 0;
  const budget = num(tier.budget);
  const candidates = sortPacks((state.packs || []).filter(pack => isPackEligible(pack, tier)), resources, strategy);

  candidates.forEach(pack => {
    const price = num(pack.price);
    if (price <= 0) return;
    const limit = getPackLimit(pack);
    for (let count = 0; count < limit; count++) {
      if (spent + price > budget) break;
      const valuation = evaluatePackValue(pack, resources);
      spent += price;
      totalValue += valuation.value;
      Object.entries(pack.items || {}).forEach(([resourceId, quantity]) => {
        wallet[resourceId] = (wallet[resourceId] || 0) + num(quantity);
      });
      purchases.push({
        packId: pack.id,
        name: pack.name || pack.id,
        price,
        value: valuation.value,
        roi: valuation.roi,
      });
    }
  });

  return { wallet, purchases, spent, totalValue, budget };
}

function attrPower(state, gains) {
  return (state.attrs || []).reduce((sum, attr) => {
    return sum + num(gains[attr.id]) * num(attr.weight, 1);
  }, 0);
}

function moduleRatioMap(config) {
  return new Map((config.moduleMix || []).map(item => [item.id, num(item.ratio)]));
}

function advanceCultivation(state, initialWallet, config) {
  const wallet = { ...initialWallet };
  const branchLevels = {};
  const totalAttrGains = {};
  const modulePower = {};
  const ratios = moduleRatioMap(config);

  (state.attrs || []).forEach(attr => { totalAttrGains[attr.id] = 0; });
  (state.cultivations || []).forEach(line => {
    (line.branches || []).forEach(branch => { branchLevels[branch.id] = 0; });
  });

  const lines = [...(state.cultivations || [])].sort((a, b) => {
    return num(ratios.get(b.id)) - num(ratios.get(a.id));
  });

  let advanced = true;
  let loopCount = 0;
  while (advanced && loopCount < 500) {
    advanced = false;
    loopCount++;
    lines.forEach(line => {
      (line.branches || []).forEach(rawBranch => {
        const branch = normalizeBranch(rawBranch);
        if (!branch) return;
        const current = branchLevels[branch.id] || 0;
        if (current >= branch.maxLevel) return;
        const next = current + 1;
        const canAfford = branch.consumes.every(cost => {
          const needed = Math.round(num(cost.qty) * evalCurveById(state, cost.cvId, next, 1));
          return (wallet[cost.resId] || 0) >= needed;
        });
        if (!canAfford) return;

        branch.consumes.forEach(cost => {
          const needed = Math.round(num(cost.qty) * evalCurveById(state, cost.cvId, next, 1));
          wallet[cost.resId] = (wallet[cost.resId] || 0) - needed;
        });
        branchLevels[branch.id] = next;
        const gains = getBranchLevelGains(state, branch, next);
        Object.entries(gains).forEach(([attrId, value]) => {
          totalAttrGains[attrId] = (totalAttrGains[attrId] || 0) + num(value);
        });
        modulePower[line.id] = (modulePower[line.id] || 0) + attrPower(state, gains);
        advanced = true;
      });
    });
  }

  const totalPower = Math.round(attrPower(state, totalAttrGains));
  const maxLevelSum = (state.cultivations || []).reduce((sum, line) => {
    return sum + (line.branches || []).reduce((s, branch) => s + num(normalizeBranch(branch)?.maxLevel), 0);
  }, 0);
  const levelSum = Object.values(branchLevels).reduce((sum, level) => sum + num(level), 0);
  const growthSpaceScore = maxLevelSum > 0 ? clamp((1 - levelSum / maxLevelSum) * 100, 0, 100) : 0;

  return {
    wallet,
    branchLevels,
    totalAttrGains,
    totalPower,
    modulePower,
    growthSpaceScore,
    loopCount,
  };
}

function scoreRepurchase(tier, result, config) {
  const thresholds = config.thresholds || {};
  const weights = config.scoringWeights || {};
  const spent = num(result.spent);
  const budget = Math.max(1, num(result.budget));
  const avgRoi = spent > 0 ? result.totalValue / spent : 0;
  const roiTarget = Math.max(0.01, num(tier.roiThreshold, 1));
  const roiScore = clamp((avgRoi / roiTarget) * 60, 0, 100);
  const powerScore = clamp((result.totalPower / Math.max(1, num(thresholds.paidNoFeelPowerGain, 50))) * 60, 0, 100);
  const growthSpaceScore = num(result.growthSpaceScore);
  const pricePressure = clamp((spent / budget) * 100, 0, 100);
  const score = (
    roiScore * num(weights.roi, 0.4) +
    powerScore * num(weights.power, 0.35) +
    growthSpaceScore * num(weights.growthSpace, 0.2) -
    pricePressure * num(weights.pricePressure, 0.05)
  );
  return Math.round(clamp(score, 0, 100));
}

function buildTierResult(state, tier, config, options) {
  const buy = buyPacksForTier(state, tier, options.strategy || 'roi');
  const progression = advanceCultivation(state, buy.wallet, config);
  const result = {
    id: tier.id,
    name: tier.name || tier.id,
    budget: buy.budget,
    spent: Math.round(buy.spent),
    totalValue: Math.round(buy.totalValue * 100) / 100,
    packRoi: buy.spent > 0 ? Math.round((buy.totalValue / buy.spent) * 100) / 100 : 0,
    purchases: buy.purchases,
    wallet: progression.wallet,
    branchLevels: progression.branchLevels,
    totalAttrGains: progression.totalAttrGains,
    totalPower: progression.totalPower,
    modulePower: progression.modulePower,
    growthSpaceScore: progression.growthSpaceScore,
    repurchaseScore: 0,
    repurchaseIntent: 'low',
    advantage: {},
  };
  result.repurchaseScore = scoreRepurchase(tier, result, config);
  result.repurchaseIntent = result.repurchaseScore >= num(tier.repurchaseThreshold, 60) ? 'high' : result.repurchaseScore >= 40 ? 'medium' : 'low';
  return result;
}

function addPackRisks(state, config, risks) {
  const threshold = num(config.thresholds?.overpoweredPackRoi, 12);
  (state.packs || []).forEach(pack => {
    const value = evaluatePackValue(pack, state.resources || []);
    if (value.roi >= threshold) {
      risks.push({
        code: 'pack_overpowered',
        level: 'P1',
        message: `${pack.name || pack.id} 投入回报 ${value.roi.toFixed(2)}，礼包投放过强`,
      });
    }
  });
}

function addTierRisks(tiers, config, risks) {
  const thresholds = config.thresholds || {};
  const paidNoFeel = num(thresholds.paidNoFeelPowerGain, 50);
  const advantageWarning = num(thresholds.advantageWarningRatio, 5);
  const lowPaidPressure = num(thresholds.lowPaidPressureRatio, 2);
  const byId = new Map(tiers.map(tier => [tier.id, tier]));
  const free = byId.get('free') || tiers[0];
  const low = byId.get('low_r');

  tiers.forEach(tier => {
    if (tier.spent > 0 && tier.totalPower < paidNoFeel) {
      risks.push({
        code: 'paid_no_feel',
        level: 'P1',
        message: `${tier.name} 消费 ${tier.spent} 后战力提升 ${tier.totalPower}，付费反馈偏弱`,
      });
    }
    if (tier.spent > 0 && tier.repurchaseScore < 40) {
      risks.push({
        code: 'low_repurchase_intent',
        level: 'P2',
        message: `${tier.name} 复购评分 ${tier.repurchaseScore}，持续消费理由不足`,
      });
    }
    const freeRatio = tier.advantage?.[free?.id];
    if (freeRatio && freeRatio > advantageWarning) {
      risks.push({
        code: 'paid_crush_risk',
        level: 'P1',
        message: `${tier.name} 对 ${free.name} 优势 ${freeRatio.toFixed(2)}x，存在跨档碾压风险`,
      });
    }
  });

  if (low && free && low.advantage?.[free.id] > lowPaidPressure) {
    risks.push({
      code: 'low_paid_pressure',
      level: 'P2',
      message: `${low.name} 对 ${free.name} 优势 ${low.advantage[free.id].toFixed(2)}x，小额付费压力偏强`,
    });
  }
}

export function runPaymentBehaviorSimulation(projectState = {}, options = {}) {
  const state = clone(projectState);
  const config = ensurePaymentConfig(state);
  const moduleMix = validateModuleMix(config);
  const tiers = (config.playerTiers || []).map(tier => buildTierResult(state, tier, config, options));
  const risks = [...moduleMix.risks];

  tiers.forEach(tier => {
    tiers.forEach(other => {
      if (tier.id === other.id) return;
      tier.advantage[other.id] = Math.round((tier.totalPower / Math.max(1, other.totalPower)) * 100) / 100;
    });
  });

  addPackRisks(state, config, risks);
  addTierRisks(tiers, config, risks);

  return {
    config,
    moduleMix,
    tiers,
    risks,
  };
}
