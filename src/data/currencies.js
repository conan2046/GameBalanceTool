/**
 * 7层货币体系预设数据
 * 源自《氪金模拟器》GDD v2.2 章节8
 */

export const CURRENCY_DATA = {
  tiers: [
    {
      id: 'real_money',
      name: '现实额度',
      tier: 1,
      purpose: '系统任务发放，驱动消费行为',
      source: '系统任务/每日签到',
      exchangeRate: '不可交易'
    },
    {
      id: 'spirit_stone',
      name: '灵石',
      tier: 2,
      purpose: '游戏内基础交易货币',
      source: '活动/掉落/任务',
      exchangeRate: '1仙玉 = 10000灵石'
    },
    {
      id: 'cultivation_xp',
      name: '修为值',
      tier: 3,
      purpose: '境界突破专用资源',
      source: '修炼/丹药/打坐/分身',
      exchangeRate: '不可直接交易'
    },
    {
      id: 'merit',
      name: '功德值',
      tier: 4,
      purpose: '特殊事件/宗门威望兑换',
      source: '玩家对战/宗门战/副本',
      exchangeRate: '100功德 = 1宗门贡献'
    },
    {
      id: 'fortune',
      name: '机缘',
      tier: 5,
      purpose: '商城购买特殊装备',
      source: '秘境/礼包/兑换',
      exchangeRate: '1机缘 = 1000灵石'
    },
    {
      id: 'jade',
      name: '仙玉',
      tier: 6,
      purpose: '高级商城货币/充值专用',
      source: '充值/兑换/活动',
      exchangeRate: '10元 = 100仙玉'
    },
    {
      id: 'bind_stone',
      name: '绑定灵石',
      tier: 7,
      purpose: '锁定基础资源/不可交易',
      source: '基础产出/日常任务',
      exchangeRate: '不可交易'
    }
  ],
  exchangeRates: [
    { id: 'jade_to_stone', from: '仙玉', to: '灵石', value: 10000, suffix: ': 1' },
    { id: 'stone_to_real', from: '灵石', to: '现实', value: 0.001, prefix: '¥' },
    { id: 'jade_to_real', from: '仙玉', to: '现实', value: 0.1, prefix: '¥' }
  ],
  vipThresholds: [
    { level: 1, cumulative: 100, perk: '自动修炼、每日礼包×1' },
    { level: 2, cumulative: 500, perk: '+1% 修为获取' },
    { level: 3, cumulative: 1000, perk: '一键扫荡解锁' },
    { level: 4, cumulative: 3000, perk: '+2% 战斗属性' },
    { level: 5, cumulative: 5000, perk: '每日礼包×3' },
    { level: 6, cumulative: 10000, perk: '宗门传送免费' },
    { level: 7, cumulative: 30000, perk: '+3% 突破成功率' },
    { level: 8, cumulative: 50000, perk: '藏经阁折扣' },
    { level: 9, cumulative: 100000, perk: '专属称号"氪金先锋"' },
    { level: 10, cumulative: 200000, perk: '商城解锁隐藏商品' },
    { level: 11, cumulative: 500000, perk: '+5% 全属性' },
    { level: 12, cumulative: 1000000, perk: '专属光效' },
    { level: 13, cumulative: 2000000, perk: '每日礼包×5' },
    { level: 14, cumulative: 5000000, perk: '突破失败不倒退' },
    { level: 15, cumulative: 10000000, perk: '终身至尊称号' }
  ]
};

/**
 * 根据VIP等级获取特权
 */
export function getVipPerks(vipLevel) {
  if (vipLevel <= 0) return [];
  return CURRENCY_DATA.vipThresholds
    .filter(v => v.level <= vipLevel)
    .map(v => ({ level: v.level, perk: v.perk }));
}

/**
 * 获取货币兑换比例
 */
export function getExchangeRates() {
  const rates = {};
  (CURRENCY_DATA.exchangeRates || []).forEach(rate => {
    rates[rate.id] = Number(rate.value) || 0;
  });
  if (!('jade_to_stone' in rates)) rates.jade_to_stone = 10000;
  if (!('stone_to_real' in rates)) rates.stone_to_real = 0.001;
  if (!('jade_to_real' in rates)) rates.jade_to_real = 0.1;
  return rates;
}
