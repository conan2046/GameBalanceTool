export const DEFAULT_PAYMENT_CONFIG = {
  playerTiers: [
    { id: 'free', name: '免费玩家', budget: 0, repurchaseThreshold: 40, roiThreshold: 1.0 },
    { id: 'low_r', name: '小额付费', budget: 68, repurchaseThreshold: 50, roiThreshold: 2.0 },
    { id: 'mid_r', name: '中额付费', budget: 648, repurchaseThreshold: 60, roiThreshold: 2.5 },
    { id: 'high_r', name: '大额付费', budget: 5000, repurchaseThreshold: 65, roiThreshold: 2.0 },
    { id: 'whale', name: '鲸鱼', budget: 50000, repurchaseThreshold: 70, roiThreshold: 1.5 },
  ],
  moduleMix: [
    { id: 'equipment', name: '装备', ratio: 35 },
    { id: 'realm', name: '境界', ratio: 25 },
    { id: 'skill', name: '技能', ratio: 15 },
    { id: 'pet', name: '宠物', ratio: 15 },
    { id: 'body', name: '炼体', ratio: 10 },
  ],
  thresholds: {
    moduleTotal: 100,
    moduleTolerance: 0.5,
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
};

export function clonePaymentConfig(config = DEFAULT_PAYMENT_CONFIG) {
  return JSON.parse(JSON.stringify(config));
}
