import { expect, test } from '@playwright/test';
import {
  evaluatePackValue,
  runPaymentBehaviorSimulation,
} from '../src/engine/payment-behavior.js';

const baseState = {
  attrs: [
    { id: 'atk', name: 'Attack', weight: 2 },
    { id: 'hp', name: 'Health', weight: 0.5 },
  ],
  resources: [
    { id: 'gold', name: 'Gold', price: 0.01 },
    { id: 'stone', name: 'Stone', price: 1 },
  ],
  packs: [
    { id: 'starter', name: 'Starter', price: 6, items: { gold: 500, stone: 10 }, limit: 1, targetTiers: ['low_r', 'mid_r', 'high_r', 'whale'] },
    { id: 'growth', name: 'Growth', price: 30, items: { gold: 1000, stone: 40 }, limit: 2, targetTiers: ['mid_r', 'high_r', 'whale'] },
    { id: 'premium', name: 'Premium', price: 128, items: { gold: 2000, stone: 160 }, limit: 5, targetTiers: ['high_r', 'whale'] },
  ],
  cultivations: [
    {
      id: 'equip',
      name: 'Equipment',
      branches: [
        { id: 'forge', name: 'Forge', maxLevel: 4, consumes: [{ resId: 'stone', qty: 10 }], gains: [{ attrId: 'atk', val: 20 }] },
      ],
    },
    {
      id: 'realm',
      name: 'Realm',
      branches: [
        { id: 'body', name: 'Body', maxLevel: 4, consumes: [{ resId: 'gold', qty: 300 }], gains: [{ attrId: 'hp', val: 80 }] },
      ],
    },
  ],
  paymentConfig: {
    playerTiers: [
      { id: 'free', name: 'Free', budget: 0, repurchaseThreshold: 40, roiThreshold: 1 },
      { id: 'low_r', name: 'Low R', budget: 6, repurchaseThreshold: 50, roiThreshold: 2 },
      { id: 'mid_r', name: 'Mid R', budget: 60, repurchaseThreshold: 60, roiThreshold: 2.5 },
      { id: 'high_r', name: 'High R', budget: 300, repurchaseThreshold: 65, roiThreshold: 2 },
      { id: 'whale', name: 'Whale', budget: 800, repurchaseThreshold: 70, roiThreshold: 1.5 },
    ],
    moduleMix: [
      { id: 'equip', name: 'Equipment', ratio: 60 },
      { id: 'realm', name: 'Realm', ratio: 40 },
    ],
    thresholds: {
      moduleTotal: 100,
      moduleSingleMax: 70,
      overpoweredPackRoi: 12,
      paidNoFeelPowerGain: 50,
      advantageWarningRatio: 5,
      lowPaidPressureRatio: 2,
    },
    scoringWeights: {
      roi: 0.4,
      power: 0.35,
      growthSpace: 0.2,
      pricePressure: 0.05,
    },
  },
};

test('pack value and ROI are calculated from resource prices', () => {
  const result = evaluatePackValue(baseState.packs[0], baseState.resources);

  expect(result.value).toBe(15);
  expect(result.roi).toBeCloseTo(2.5, 2);
});

test('payment simulation compares deterministic player tiers', () => {
  const report = runPaymentBehaviorSimulation(baseState);

  expect(report.tiers.map(t => t.id)).toEqual(['free', 'low_r', 'mid_r', 'high_r', 'whale']);
  expect(report.tiers.find(t => t.id === 'low_r').spent).toBe(6);
  expect(report.tiers.find(t => t.id === 'mid_r').totalPower).toBeGreaterThan(report.tiers.find(t => t.id === 'low_r').totalPower);
  expect(report.tiers.find(t => t.id === 'whale').advantage.free).toBeGreaterThan(1);
});

test('module mix validation returns risks when ratios are invalid', () => {
  const invalid = structuredClone(baseState);
  invalid.paymentConfig.moduleMix = [
    { id: 'equip', name: 'Equipment', ratio: 85 },
    { id: 'realm', name: 'Realm', ratio: 30 },
  ];

  const report = runPaymentBehaviorSimulation(invalid);

  expect(report.moduleMix.totalRatio).toBe(115);
  expect(report.risks.some(r => r.code === 'module_total_mismatch')).toBe(true);
  expect(report.risks.some(r => r.code === 'single_module_overweight')).toBe(true);
});

test('repurchase score reacts to pack efficiency and paid power gain', () => {
  const weak = structuredClone(baseState);
  weak.packs = [
    { id: 'weak', name: 'Weak', price: 60, items: { gold: 10 }, limit: 1, targetTiers: ['mid_r'] },
  ];

  const strongReport = runPaymentBehaviorSimulation(baseState);
  const weakReport = runPaymentBehaviorSimulation(weak);

  expect(strongReport.tiers.find(t => t.id === 'mid_r').repurchaseScore)
    .toBeGreaterThan(weakReport.tiers.find(t => t.id === 'mid_r').repurchaseScore);
  expect(weakReport.risks.some(r => r.code === 'paid_no_feel')).toBe(true);
});
