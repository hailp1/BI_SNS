/**
 * Shared IndexedDB + LocalStorage cache manager for CJ Enterprise SNS.
 * Cache partition key = user+scope :: backend data_refresh_date :: local calendar day (YYYY-MM-DD).
 * Automatically invalidates on new calendar day, new PostgreSQL ETL update, or user RLS scope change,
 * and wipes cleanly on logout/session expiration.
 */
(function (global) {
    const DB_NAME = 'CJ_Enterprise_PG_v20261110';
    const STORE_NAME = 'pg_datasets';
    const DB_VERSION = 1;
    let _dbPromise = null;

    function getLocalDateKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function buildCacheTag(userOrName, refreshDate) {
        const u = (userOrName && typeof userOrName === 'object')
            ? userOrName
            : { username: String(userOrName || 'anon') };
        const uname = String(u.username || 'anon').trim() || 'anon';
        const role = String(u.role || 'viewer').toLowerCase();
        const chan = String(u.channel || 'all').toLowerCase();
        const sl = String(u.scope_level || u.scopeLevel || 'all').toLowerCase();
        const sv = String(u.scope_value || u.scopeValue || 'all').trim();
        const dt = String(refreshDate || 'unknown').trim() || 'unknown';
        return `${uname}|${role}|${chan}|${sl}|${sv}::${dt}::${getLocalDateKey()}`;
    }

    function open() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise((resolve) => {
            if (typeof indexedDB === 'undefined') return resolve(null);
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = function (e) {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                req.onsuccess = function (e) { resolve(e.target.result); };
                req.onerror = function () { resolve(null); };
            } catch (_) {
                resolve(null);
            }
        });
        return _dbPromise;
    }

    async function get(key) {
        const db = await open();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch (_) {
                resolve(null);
            }
        });
    }

    async function put(key, val) {
        const db = await open();
        if (!db) return;
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(val, key);
        } catch (_) {}
    }

    async function clear() {
        try {
            const db = await open();
            if (db && db.objectStoreNames && db.objectStoreNames.contains(STORE_NAME)) {
                await new Promise((resolve) => {
                    try {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        tx.objectStore(STORE_NAME).clear();
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                    } catch (_) {
                        resolve();
                    }
                });
            }
        } catch (_) {}
    }

    async function pruneExceptTag(activeTag) {
        if (!activeTag) return;
        const activeSuffix = '::' + activeTag;
        const activeSnapPrefix = 'cj_snap_' + DB_NAME + '_' + activeTag + '_';
        try {
            [global.localStorage, global.sessionStorage].forEach((st) => {
                if (!st) return;
                Object.keys(st).forEach((k) => {
                    if (k.startsWith('cj_snap_') && !k.startsWith(activeSnapPrefix)) {
                        st.removeItem(k);
                    }
                });
            });
        } catch (_) {}

        try {
            const db = await open();
            if (!db || !db.objectStoreNames || !db.objectStoreNames.contains(STORE_NAME)) return;
            await new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    if (typeof store.getAllKeys === 'function') {
                        const keysReq = store.getAllKeys();
                        keysReq.onsuccess = () => {
                            const keys = keysReq.result || [];
                            for (const k of keys) {
                                if (!String(k).endsWith(activeSuffix)) {
                                    store.delete(k);
                                }
                            }
                        };
                    }
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                } catch (_) {
                    resolve();
                }
            });
        } catch (_) {}
    }

    async function fetchDatasetsWithCache(entries, onUnauthorized) {
        const opts = { credentials: 'same-origin' };
        const [meRes, metaRes] = await Promise.all([
            fetch('/api/v1/auth/me', opts),
            fetch('/api/v1/dashboard/meta', opts).catch(() => null),
        ]);

        if (meRes.status === 401 || meRes.status === 403) {
            await clear();
            if (onUnauthorized) onUnauthorized();
            return null;
        }
        if (!meRes.ok) {
            throw new Error(`HTTP ${meRes.status} khi xác thực phiên`);
        }

        const meData = await meRes.json();
        if (!meData || !meData.authenticated || !meData.user) {
            await clear();
            if (onUnauthorized) onUnauthorized();
            return null;
        }

        let refreshDate = 'unknown';
        if (metaRes && metaRes.ok) {
            try {
                const meta = await metaRes.json();
                if (meta && meta.data_refresh_date) {
                    refreshDate = meta.data_refresh_date;
                }
            } catch (_) {}
        }

        const activeTag = buildCacheTag(meData.user, refreshDate);
        await pruneExceptTag(activeTag);

        const cachedValues = await Promise.all(entries.map((e) => get(`${e.name}::${activeTag}`)));
        const result = {};
        const missing = [];

        entries.forEach((e, idx) => {
            const val = cachedValues[idx];
            if (val !== null && val !== undefined) {
                result[e.name] = val;
            } else {
                missing.push(e);
            }
        });

        if (missing.length > 0) {
            const responses = await Promise.all(missing.map((e) => fetch(e.url, opts)));
            for (let i = 0; i < responses.length; i++) {
                if (responses[i].status === 401 || responses[i].status === 403) {
                    await clear();
                    if (onUnauthorized) onUnauthorized();
                    return null;
                }
                if (!responses[i].ok) {
                    throw new Error(`HTTP ${responses[i].status} khi tải ${missing[i].name} từ PostgreSQL`);
                }
            }
            const payloads = await Promise.all(responses.map((r) => r.json()));
            for (let i = 0; i < missing.length; i++) {
                const name = missing[i].name;
                result[name] = payloads[i];
                put(`${name}::${activeTag}`, payloads[i]);
            }
        }

        return result;
    }

    global.CJCacheStore = {
        DB_NAME,
        STORE_NAME,
        getLocalDateKey,
        buildCacheTag,
        open,
        get,
        put,
        clear,
        pruneExceptTag,
        fetchDatasetsWithCache,
    };
})(typeof window !== 'undefined' ? window : globalThis);
