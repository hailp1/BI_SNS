const DB_NAME = 'cj_sns_v2_cache';
const STORE_NAME = 'datasets';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function buildDatasetCacheKey(
  dataset: string,
  userScope: string,
  dbRefreshDate: string,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const safeRefresh = (dbRefreshDate || 'unknown').trim() || 'unknown';
  return `${dataset}::${userScope || 'anon'}::${safeRefresh}::${today}`;
}

export const idbCache = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      let settled = false;
      const done = (val: T | null) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => done(req.result !== undefined ? (req.result as T) : null);
        req.onerror = () => done(null);
        tx.onerror = () => done(null);
        tx.onabort = () => done(null);
      } catch {
        done(null);
      }
    });
  },

  async put(key: string, val: unknown): Promise<boolean> {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(val, key);
        req.onerror = () => done(false);
        tx.oncomplete = () => done(true);
        tx.onerror = () => done(false);
        tx.onabort = () => done(false);
      } catch {
        done(false);
      }
    });
  },

  async pruneStale(currentRefreshDate: string): Promise<void> {
    const db = await openDb();
    if (!db) return;
    const today = new Date().toISOString().slice(0, 10);
    const expectedSuffix = `::${currentRefreshDate || 'unknown'}::${today}`;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          const k = String(cursor.key || '');
          if (!k.endsWith(expectedSuffix)) {
            cursor.delete();
          }
          cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  },

  async clear(): Promise<void> {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  },
};

