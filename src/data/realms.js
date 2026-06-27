/**
 * 境界系统预设数据
 * 修为13境 + 炼体12境，源自《氪金模拟器》GDD v2.2
 */

export const REALM_DATA = {
  cultivation: [
    {
      id: 'mortal1',
      tier: 1,
      name: '凡人',
      xpReq: 100,
      successRate: 100,
      failPenalty: { xpLoss: 0, cooldown: 0 },
      realmMult: 0.8,
      unlockSys: ['基础移动', '对话系统'],
      breakthroughItem: { itemId: null, cost: 0, count: 0 },
      perfLevels: { basic: 100, advanced: 150, perfect: 200, extreme: 300 }
    },
    {
      id: 'qi2',
      tier: 2,
      name: '炼气',
      xpReq: 1000,
      successRate: 100,
      failPenalty: { xpLoss: 0, cooldown: 0 },
      realmMult: 1.0,
      unlockSys: ['基础战斗', '装备系统'],
      breakthroughItem: { itemId: null, cost: 0, count: 0 },
      perfLevels: {
        basic: 1000,
        advanced: 1500,
        perfect: 2000,
        extreme: 3000
      }
    },
    {
      id: 'foundation3',
      tier: 3,
      name: '筑基',
      xpReq: 5000,
      successRate: 80,
      failPenalty: { xpLoss: 5, cooldown: 0 },
      realmMult: 1.3,
      unlockSys: ['法宝系统', '宗门系统'],
      breakthroughItem: { itemId: '筑基丹', cost: 1000, count: 1 },
      perfLevels: { basic: 5000, advanced: 7500, perfect: 10000, extreme: 15000 }
    },
    {
      id: 'goldenCore4',
      tier: 4,
      name: '结丹',
      xpReq: 20000,
      successRate: 60,
      failPenalty: { xpLoss: 10, cooldown: 0 },
      realmMult: 1.7,
      unlockSys: ['神通', '炼器系统'],
      breakthroughItem: { itemId: '结丹丹', cost: 5000, count: 1 },
      perfLevels: { basic: 20000, advanced: 30000, perfect: 40000, extreme: 60000 }
    },
    {
      id: 'nascentSoul5',
      tier: 5,
      name: '元婴',
      xpReq: 80000,
      successRate: 40,
      failPenalty: { xpLoss: 15, cooldown: 0 },
      realmMult: 2.2,
      unlockSys: ['精炼系统', '灵兽园'],
      breakthroughItem: { itemId: '元婴丹', cost: 20000, count: 1 },
      perfLevels: { basic: 80000, advanced: 120000, perfect: 160000, extreme: 240000 }
    },
    {
      id: 'soulFormation6',
      tier: 6,
      name: '化神',
      xpReq: 300000,
      successRate: 30,
      failPenalty: { xpLoss: 20, cooldown: 24 },
      realmMult: 2.8,
      unlockSys: ['分身系统', '天才塔'],
      breakthroughItem: { itemId: '化神丹', cost: 80000, count: 1 },
      perfLevels: { basic: 300000, advanced: 450000, perfect: 600000, extreme: 900000 }
    },
    {
      id: 'voidRefine7',
      tier: 7,
      name: '返虚',
      xpReq: 1000000,
      successRate: 20,
      failPenalty: { xpLoss: 25, cooldown: 48 },
      realmMult: 3.5,
      unlockSys: ['仙魔系统(预留)'],
      breakthroughItem: { itemId: '返虚丹', cost: 200000, count: 1 },
      perfLevels: { basic: 1000000, advanced: 1500000, perfect: 2000000, extreme: 3000000 }
    },
    {
      id: 'bodyIntegrate8',
      tier: 8,
      name: '合体',
      xpReq: 3000000,
      successRate: 15,
      failPenalty: { xpLoss: 15, cooldown: 0, costMultiplier: 1.3 },
      realmMult: 4.5,
      unlockSys: ['领域系统(预留)'],
      breakthroughItem: { itemId: '合体丹', cost: 500000, count: 1 },
      perfLevels: { basic: 3000000, advanced: 4500000, perfect: 6000000, extreme: 9000000 }
    },
    {
      id: 'mahayana9',
      tier: 9,
      name: '大乘',
      xpReq: 10000000,
      successRate: 10,
      failPenalty: { xpLoss: 20, cooldown: 0, costMultiplier: 1.5 },
      realmMult: 6.0,
      unlockSys: ['飞升系统'],
      breakthroughItem: { itemId: '大乘丹', cost: 2000000, count: 1 },
      perfLevels: { basic: 10000000, advanced: 15000000, perfect: 20000000, extreme: 30000000 }
    },
    {
      id: 'trib10',
      tier: 10,
      name: '渡劫',
      xpReq: 30000000,
      successRate: 5,
      failPenalty: { xpLoss: 30, cooldown: 72 },
      realmMult: 10.0,
      unlockSys: ['预留'],
      breakthroughItem: { itemId: '仙品丹药', cost: 5000000, count: 1 },
      perfLevels: { basic: 30000000, advanced: 45000000, perfect: 60000000, extreme: 90000000 }
    },
    {
      id: 'immortal11',
      tier: 11,
      name: '真仙',
      xpReq: 100000000,
      successRate: 3,
      failPenalty: { xpLoss: 30, cooldown: 72 },
      realmMult: 20.0,
      unlockSys: ['预留'],
      breakthroughItem: { itemId: '仙品丹药', cost: 20000000, count: 1 },
      perfLevels: { basic: 100000000, advanced: 150000000, perfect: 200000000, extreme: 300000000 }
    },
    {
      id: 'immortal12',
      tier: 12,
      name: '金仙',
      xpReq: 500000000,
      successRate: 1,
      failPenalty: { xpLoss: 30, cooldown: 72 },
      realmMult: 50.0,
      unlockSys: ['预留'],
      breakthroughItem: { itemId: '仙品丹药', cost: 100000000, count: 1 },
      perfLevels: { basic: 500000000, advanced: 750000000, perfect: 1000000000, extreme: 1500000000 }
    }
  ],
  body: [
    {
      id: 'bod1',
      tier: 1,
      name: '淬体',
      xpReq: 500,
      successRate: 100,
      failPenalty: { xpLoss: 0, cooldown: 0 },
      realmMult: 1.0,
      unlockSys: ['体质解锁', '血脉觉醒'],
      breakthroughItem: { itemId: '淬体液', cost: 500, count: 1 }
    },
    {
      id: 'bod2',
      tier: 2,
      name: '锻骨',
      xpReq: 2000,
      successRate: 90,
      failPenalty: { xpLoss: 5, cooldown: 0 },
      realmMult: 1.2,
      unlockSys: ['体质解锁', '血脉觉醒'],
      breakthroughItem: { itemId: '锻骨液', cost: 2000, count: 1 }
    },
    {
      id: 'bod3',
      tier: 3,
      name: '易筋',
      xpReq: 10000,
      successRate: 75,
      failPenalty: { xpLoss: 10, cooldown: 0 },
      realmMult: 1.5,
      unlockSys: ['命格系统', '特殊体质'],
      breakthroughItem: { itemId: '易筋丹', cost: 10000, count: 1 }
    },
    {
      id: 'bod4',
      tier: 4,
      name: '洗髓',
      xpReq: 40000,
      successRate: 60,
      failPenalty: { xpLoss: 15, cooldown: 12 },
      realmMult: 1.8,
      unlockSys: ['体质融合', '血脉变异'],
      breakthroughItem: { itemId: '洗髓丹', cost: 40000, count: 1 }
    },
    {
      id: 'bod5',
      tier: 5,
      name: '凝脉',
      xpReq: 150000,
      successRate: 45,
      failPenalty: { xpLoss: 20, cooldown: 24 },
      realmMult: 2.2,
      unlockSys: ['经脉全开', '体质传承'],
      breakthroughItem: { itemId: '凝脉液', cost: 150000, count: 1 }
    },
    {
      id: 'bod6',
      tier: 6,
      name: '通窍',
      xpReq: 500000,
      successRate: 35,
      failPenalty: { xpLoss: 25, cooldown: 48 },
      realmMult: 2.8,
      unlockSys: ['天眼通', '神行术'],
      breakthroughItem: { itemId: '通窍散', cost: 500000, count: 1 }
    },
    {
      id: 'bod7',
      tier: 7,
      name: '辟谷',
      xpReq: 2000000,
      successRate: 25,
      failPenalty: { xpLoss: 30, cooldown: 72 },
      realmMult: 3.5,
      unlockSys: ['辟谷之术', '肉身成圣'],
      breakthroughItem: { itemId: '辟谷丹', cost: 2000000, count: 1 }
    },
    {
      id: 'bod8',
      tier: 8,
      name: '涅槃',
      xpReq: 8000000,
      successRate: 15,
      failPenalty: { xpLoss: 35, cooldown: 96 },
      realmMult: 4.5,
      unlockSys: ['涅槃重生', '不死之身'],
      breakthroughItem: { itemId: '涅槃丹', cost: 8000000, count: 1 }
    },
    {
      id: 'bod9',
      tier: 9,
      name: '金刚',
      xpReq: 20000000,
      successRate: 10,
      failPenalty: { xpLoss: 40, cooldown: 120 },
      realmMult: 6.0,
      unlockSys: ['金刚不坏', '万劫不灭体'],
      breakthroughItem: { itemId: '金刚液', cost: 20000000, count: 1 }
    },
    {
      id: 'bod10',
      tier: 10,
      name: '不灭',
      xpReq: 60000000,
      successRate: 5,
      failPenalty: { xpLoss: 50, cooldown: 168 },
      realmMult: 10.0,
      unlockSys: ['不灭金身', '天地同寿'],
      breakthroughItem: { itemId: '不灭丹', cost: 60000000, count: 1 }
    },
    {
      id: 'bod11',
      tier: 11,
      name: '天尊',
      xpReq: 200000000,
      successRate: 3,
      failPenalty: { xpLoss: 50, cooldown: 168 },
      realmMult: 20.0,
      unlockSys: ['预留'],
      breakthroughItem: { itemId: '天尊液', cost: 200000000, count: 1 }
    },
    {
      id: 'bod12',
      tier: 12,
      name: '圣体',
      xpReq: 1000000000,
      successRate: 1,
      failPenalty: { xpLoss: 50, cooldown: 168 },
      realmMult: 50.0,
      unlockSys: ['预留'],
      breakthroughItem: { itemId: '圣体液', cost: 1000000000, count: 1 }
    }
  ]
};

/**
 * 按tier获取境界信息
 */
export function getRealm(tier, type = 'cultivation') {
  const list = REALM_DATA[type];
  if (!list) return null;
  return list.find(r => r.tier === tier) || null;
}

/**
 * 获取境界差对应的系数
 */
export function getRealmDiffMultiplier(attackerTier, defenderTier) {
  const diff = attackerTier - defenderTier;
  if (diff <= -4) return 0.6;
  if (diff === -3) return 0.65;
  if (diff === -2) return 0.7;
  if (diff === -1) return 0.75;
  if (diff === 0) return 1.0;
  if (diff === 1) return 1.3;
  if (diff === 2) return 1.7;
  if (diff >= 3) return 2.5;
  return 1.0;
}

/**
 * 突破成功率计算（考虑VIP加成）
 */
export function calcBreakthroughSuccess(baseRate, vipLevel) {
  const vipBonus = vipLevel >= 7 ? 3 : vipLevel >= 14 ? 100 : 0; // VIP14突破失败不倒退
  return Math.min(100, baseRate + vipBonus);
}
