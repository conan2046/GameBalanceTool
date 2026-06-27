/**
 * 装备系统预设数据
 * 9 个装备槽位 + 6 品质 + 精炼系统。
 * 属性 key 对齐 S.attrs：a1=攻击力、a2=防御力、a3=生命值。
 */

export const DEFAULT_EQUIPMENT_LABELS = {
  slots: {
    slt_wep: '武器',
    slt_helm: '头盔',
    slt_armor: '衣服',
    slt_bracer: '护腕',
    slt_belt: '腰带',
    slt_boots: '鞋子',
    slt_ring1: '戒指A',
    slt_ring2: '戒指B',
    slt_neck: '项链'
  },
  qualities: {
    white: '白色',
    green: '绿色',
    blue: '蓝色',
    purple: '紫色',
    orange: '橙色',
    red: '红色'
  }
};

export const EQUIPMENT_DATA = {
  slots: [
    { id: 'slt_wep', name: '武器', type: 'attack', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 50, a3: 100 } },
    { id: 'slt_helm', name: '头盔', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a2: 30, a3: 80 } },
    { id: 'slt_armor', name: '衣服', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a2: 40, a3: 100 } },
    { id: 'slt_bracer', name: '护腕', type: 'defense', qualities: ['blue', 'purple', 'orange'], baseAttrs: { a1: 10, a2: 15 } },
    { id: 'slt_belt', name: '腰带', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a3: 120, a2: 20 } },
    { id: 'slt_boots', name: '鞋子', type: 'defense', qualities: ['white', 'green', 'blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 15, a3: 80 } },
    { id: 'slt_ring1', name: '戒指A', type: 'sub', qualities: ['purple', 'orange', 'red'], baseAttrs: { a1: 5, a2: 5, a3: 5 } },
    { id: 'slt_ring2', name: '戒指B', type: 'sub', qualities: ['purple', 'orange', 'red'], baseAttrs: { a1: 5, a2: 5, a3: 5 } },
    { id: 'slt_neck', name: '项链', type: 'sub', qualities: ['blue', 'purple', 'orange', 'red'], baseAttrs: { a1: 8, a2: 8, a3: 8 } }
  ],
  qualities: [
    { id: 'white', name: '白色', color: '#cccccc', mult: 1.0, bonusSlots: 0 },
    { id: 'green', name: '绿色', color: '#2ed573', mult: 1.5, bonusSlots: 0 },
    { id: 'blue', name: '蓝色', color: '#4fc3f7', mult: 2.0, bonusSlots: 0 },
    { id: 'purple', name: '紫色', color: '#ba68c8', mult: 3.0, bonusSlots: 6 },
    { id: 'orange', name: '橙色', color: '#ffa502', mult: 5.0, bonusSlots: 9 },
    { id: 'red', name: '红色', color: '#ff4757', mult: 10.0, bonusSlots: 12 }
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

export function normalizeEquipmentLabels(equipment = EQUIPMENT_DATA) {
  if (!equipment) return equipment;
  (equipment.slots || []).forEach(slot => {
    if (DEFAULT_EQUIPMENT_LABELS.slots[slot.id]) slot.name = DEFAULT_EQUIPMENT_LABELS.slots[slot.id];
  });
  (equipment.qualities || []).forEach(quality => {
    if (DEFAULT_EQUIPMENT_LABELS.qualities[quality.id]) quality.name = DEFAULT_EQUIPMENT_LABELS.qualities[quality.id];
  });
  return equipment;
}

normalizeEquipmentLabels(EQUIPMENT_DATA);

/**
 * 装备属性汇总。
 * @param {Array} equippedItems [{slotId, quality, level, refineLevel}]
 * @param {Object} baseAttrs 角色基础属性
 * @returns {Object} 装备提供的属性总和
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

export function calcRefineCost(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += Math.round(EQUIPMENT_DATA.refine.stones.baseCost * Math.pow(EQUIPMENT_DATA.refine.stones.costMultiplier, i - 1));
  }
  return total;
}
