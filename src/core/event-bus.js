/** GBT v3.1 — 简易事件总线，后续模块拆分统一用它通信。 */
export const EventBus = {
  map: new Map(),
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  },
  off(type, fn) {
    if (this.map.has(type)) this.map.get(type).delete(fn);
  },
  emit(type, payload) {
    if (!this.map.has(type)) return;
    this.map.get(type).forEach(fn => {
      try { fn(payload); } catch (e) { console.warn('[EventBus]', type, e.message); }
    });
  }
};
export default EventBus;
