/**
 * 索引化数据库封装
 * 自动保存、自动恢复、多存档槽
 */

const DB_NAME = 'gbt_v3';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * 初始化IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('realms')) {
        db.createObjectStore('realms', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('equipment')) {
        db.createObjectStore('equipment', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('saves')) {
        const store = db.createObjectStore('saves', { keyPath: 'slotId' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB open failed: ' + event.target.error));
    };
  });
}

/**
 * 通用写入
 */
export function writeToStore(storeName, data) {
  if (!dbInstance) return Promise.reject(new Error('DB not initialized'));
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 通用读取
 */
export function readFromStore(storeName, key) {
  if (!dbInstance) return Promise.reject(new Error('DB not initialized'));
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 存档（多槽位）
 * @param {string} slotId - 存档槽位ID
 * @param {Object} gameData - 游戏数据
 */
export function saveGame(slotId, gameData) {
  const saveData = {
    slotId,
    timestamp: Date.now(),
    data: JSON.stringify(gameData)
  };
  return writeToStore('saves', saveData);
}

/**
 * 读档
 * @param {string} slotId - 存档槽位ID
 */
export function loadGame(slotId) {
  return readFromStore('saves', slotId).then(save => {
    if (!save) return null;
    return JSON.parse(save.data);
  });
}

/**
 * 列出所有存档
 */
export function listSaves() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return reject(new Error('DB not initialized'));
    const tx = dbInstance.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除存档
 */
export function deleteSave(slotId) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return reject(new Error('DB not initialized'));
    const tx = dbInstance.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');
    const request = store.delete(slotId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 自动保存（节流）
 * @param {Function} getDataFn - 获取数据的函数
 * @param {string} slotId - 存档槽位
 * @param {number} intervalMs - 保存间隔（毫秒）
 */
export function autoSave(getDataFn, slotId = 'main', intervalMs = 30000) {
  let lastSaveTime = 0;
  let timer = null;

  const doSave = () => {
    const now = Date.now();
    if (now - lastSaveTime >= intervalMs) {
      saveGame(slotId, getDataFn()).then(() => {
        lastSaveTime = now;
      });
    } else {
      clearTimeout(timer);
      timer = setTimeout(doSave, intervalMs - (now - lastSaveTime));
    }
  };

  // 立即保存一次
  doSave();

  // 返回定时函数，供外部调用
  return () => doSave();
}
