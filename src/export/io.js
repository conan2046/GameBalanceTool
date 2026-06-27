/**
 * GBT v3.6 — JSON导出/导入 + 版本化工程封包
 */

import { initDB, saveGame, loadGame } from './db.js';
import { createProjectEnvelope, normalizeImportedProject, downloadJSON, PROJECT_VERSION } from '../core/project-versioning.js';

export function exportToFile(gameData, filename = 'gbt_project_v3.6.json') {
  downloadJSON(gameData, filename);
}

export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try { resolve(JSON.parse(event.target.result)); }
      catch (err) { reject(new Error('文件格式错误')); }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function exportVersionedProject(state, filename) {
  const envelope = createProjectEnvelope(state, { from: state?.project?.version || PROJECT_VERSION });
  const safeName = filename || `gbt_project_v${PROJECT_VERSION}_${new Date().toISOString().slice(0,10)}.json`;
  downloadJSON(envelope, safeName);
  return envelope;
}

export async function importVersionedProject(file) {
  const raw = await importFromFile(file);
  return normalizeImportedProject(raw);
}

export function migrateFromV2(v2Data) {
  if (!v2Data) return null;
  const raw = v2Data.data || v2Data;
  const migrated = {
    realms: raw.realms || [],
    equipment: raw.equipment || [],
    classes: raw.classes || [],
    currencies: raw.currencies || [],
    curves: raw.curves || [],
    cultivations: raw.cultivations || raw.cultivation || [],
    resources: raw.resources || [],
    attrs: raw.attrs || []
  };
  return createProjectEnvelope(migrated, { from: '2.1' });
}

export async function saveToDatabase(gameData, slotId = 'main') {
  try { await initDB(); await saveGame(slotId, gameData); return true; }
  catch (err) { console.error('Save failed:', err); return false; }
}

export async function loadFromDatabase(slotId = 'main') {
  try { await initDB(); return await loadGame(slotId) || null; }
  catch (err) { console.error('Load failed:', err); return null; }
}

export function loadLocalStorageData() {
  try {
    const saved = localStorage.getItem('gbt21_data');
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
}
