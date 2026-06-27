/**
 * Default attribute template.
 * Runtime UI must prefer the current project attributes from ProjectState/S.
 */

export const ATTRS = [
  { id: 'a1', name: '攻击力', base: 100, weight: 1.5 },
  { id: 'a2', name: '防御力', base: 50, weight: 1.0 },
  { id: 'a3', name: '生命值', base: 600, weight: 0.2 }
];

export const ATTR_MAP = Object.fromEntries(ATTRS.map(a => [a.id, a.name]));

export function getRuntimeAttrs() {
  if (typeof window === 'undefined') return ATTRS;
  const state = window.ProjectState && typeof window.ProjectState.get === 'function'
    ? window.ProjectState.get()
    : window.S;
  return Array.isArray(state?.attrs) && state.attrs.length ? state.attrs : ATTRS;
}

export function getAttrName(id) {
  const attr = getRuntimeAttrs().find(a => a.id === id);
  return attr ? attr.name : (ATTR_MAP[id] || id);
}

export function getAttr(id) {
  return getRuntimeAttrs().find(a => a.id === id) || null;
}

export function getAttrKeys() {
  return getRuntimeAttrs().map(a => a.id);
}

export const ATTR_KEYS = ATTRS.map(a => a.id);
