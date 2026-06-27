/**
 * 瑁呭绯荤粺棰勮鏁版嵁
 * 9浠惰澶?8涓儴浣? + 6鍝佽川 + 绮剧偧绯荤粺
 * 灞炴€ey瀵归綈 S.attrs: a1=鏀诲嚮鍔?a2=闃插尽鍔?a3=鐢熷懡鍊? */

export const EQUIPMENT_DATA = {
  slots: [
    {
      id: 'slt_wep',
      name: '姝﹀櫒',
      type: 'attack',
      qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'],
      baseAttrs: { a1: 50, a3: 100 }
    },
    {
      id: 'slt_helm',
      name: '澶寸洈',
      type: 'defense',
      qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'],
      baseAttrs: { a2: 30, a3: 80 }
    },
    {
      id: 'slt_armor',
      name: '琛ｆ湇',
      type: 'defense',
      qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'],
      baseAttrs: { a2: 40, a3: 100 }
    },
    {
      id: 'slt_bracer',
      name: '鎶よ厱',
      type: 'defense',
      qualities: ['blue', 'purple', 'orange'],
      baseAttrs: { a1: 10, a2: 15 }
    },
    {
      id: 'slt_belt',
      name: '鑵板甫',
      type: 'defense',
      qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'],
      baseAttrs: { a3: 120, a2: 20 }
    },
    {
      id: 'slt_boots',
      name: '闉嬪瓙',
      type: 'defense',
      qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'],
      baseAttrs: { a1: 15, a3: 80 }
    },
    {
      id: 'slt_ring1',
      name: '鎴掓寚A',
      type: 'sub',
      qualities: ['purple', 'orange', 'red'],
      baseAttrs: { a1: 5, a2: 5, a3: 5 }
    },
    {
      id: 'slt_ring2',
      name: '鎴掓寚B',
      type: 'sub',
      qualities: ['purple', 'orange', 'red'],
      baseAttrs: { a1: 5, a2: 5, a3: 5 }
    },
    {
      id: 'slt_neck',
      name: '椤归摼',
      type: 'sub',
      qualities: ['blue', 'purple', 'orange', 'red'],
      baseAttrs: { a1: 8, a2: 8, a3: 8 }
    }
  ],
  qualities: [
    { id: 'white', name: '鐧借壊', color: '#cccccc', mult: 1.0, bonusSlots: 0 },
    { id: 'green', name: '缁胯壊', color: '#2ed573', mult: 1.5, bonusSlots: 0 },
    { id: 'blue', name: '钃濊壊', color: '#4fc3f7', mult: 2.0, bonusSlots: 0 },
    { id: 'purple', name: '绱壊', color: '#ba68c8', mult: 3.0, bonusSlots: 6 },
    { id: 'orange', name: '姗欒壊', color: '#ffa502', mult: 5.0, bonusSlots: 9 },
    { id: 'red', name: '绾㈣壊', color: '#ff4757', mult: 10.0, bonusSlots: 12 }
  ],
  refine: {
    maxLevel: 10,
    perLevel: {
      damageBonus: 0.03,
      damageReduction: 0.06
    },
    failCost: true,
    stones: {
      material: '精炼石',
      baseCost: 100,
      costMultiplier: 1.5
    }
  }
};

/**
 * 瑁呭鎴樺姏璁＄畻
 * @param {Array} equippedItems - 宸茶澶囩墿鍝佹暟缁?[{slotId, quality, level, refineLevel}]
 * @param {Object} baseAttrs - 瑙掕壊鍩虹灞炴€? * @returns {Object} 瑁呭鎻愪緵鐨勫睘鎬ф€诲拰
 */
export function calcEquipmentStats(equippedItems, baseAttrs = {}) {
  const attrs = typeof window !== 'undefined' && Array.isArray(window.S?.attrs) ? window.S.attrs : [];
  const result = {};
  attrs.forEach(attr => {
    result[attr.id] = Number(baseAttrs[attr.id] || 0);
  });
  if (!attrs.length) {
    result.a1 = baseAttrs.a1 || baseAttrs.attack || 0;
    result.a2 = baseAttrs.a2 || baseAttrs.defense || 0;
    result.a3 = baseAttrs.a3 || baseAttrs.health || 0;
  }

  for (const item of equippedItems || []) {
    const slot = EQUIPMENT_DATA.slots.find(s => s.id === item.slotId);
    const quality = EQUIPMENT_DATA.qualities.find(q => q.id === item.quality);
    if (!slot || !quality) continue;

    const mult = quality.mult;
    const refineBonus = item.refineLevel > 0
      ? 1 + (item.refineLevel * EQUIPMENT_DATA.refine.perLevel.damageBonus)
      : 1;

    Object.entries(slot.baseAttrs || {}).forEach(([attrId, value]) => {
      result[attrId] = (result[attrId] || 0) + Number(value || 0) * mult * refineBonus;
    });
  }

  return result;
}

/**
 * 鑾峰彇绮剧偧鍒版寚瀹氱瓑绾х殑鎴愭湰
 */
export function calcRefineCost(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += Math.round(EQUIPMENT_DATA.refine.stones.baseCost * Math.pow(EQUIPMENT_DATA.refine.stones.costMultiplier, i - 1));
  }
  return total;
}

