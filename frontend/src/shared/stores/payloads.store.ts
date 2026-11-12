import { create } from 'zustand';
import { dashboardApi } from '../api/dashboard.api';
import type { AuthUser } from '../types/auth';
import type { PayloadName } from '../types/sales';
import { buildDatasetCacheKey, idbCache } from '../utils/idb-cache';

interface PayloadsState {
  cache: Partial<Record<PayloadName, unknown[]>>;
  loading: Partial<Record<PayloadName, boolean>>;
  errors: Partial<Record<PayloadName, string>>;
  dbRefreshDate: string;
  syncMetadata: () => Promise<string>;
  loadPayload: (name: PayloadName, user: AuthUser | null) => Promise<unknown[]>;
  preloadBatch: (names: PayloadName[], user: AuthUser | null) => Promise<void>;
  clearAll: () => void;
}

const inflight = new Map<string, Promise<unknown[]>>();
let metadataPromise: Promise<string> | null = null;

function getUserScopeTag(user: AuthUser | null): string {
  if (!user) return 'anon';
  return `${user.username}:${user.role}:${user.channel}:${user.scopeLevel}:${user.scopeValue}`;
}

export const usePayloadsStore = create<PayloadsState>((set, get) => ({
  cache: {},
  loading: {},
  errors: {},
  dbRefreshDate: '',

  syncMetadata: async () => {
    const current = get().dbRefreshDate;
    if (current) return current;
    if (metadataPromise) return metadataPromise;

    metadataPromise = (async () => {
      try {
        const meta = await dashboardApi.getMeta();
        const refresh = (meta?.data_refresh_date || 'unknown').trim() || 'unknown';
        set({ dbRefreshDate: refresh });
        await idbCache.pruneStale(refresh);
        return refresh;
      } catch {
        return 'unknown';
      } finally {
        metadataPromise = null;
      }
    })();

    return metadataPromise;
  },

  loadPayload: async (name, user) => {
    const existing = get().cache[name];
    if (existing) {
      return existing;
    }

    const scopeTag = getUserScopeTag(user);
    const inflightKey = `${name}::${scopeTag}`;
    const pending = inflight.get(inflightKey);
    if (pending) {
      return pending;
    }

    set((s) => ({
      loading: { ...s.loading, [name]: true },
      errors: { ...s.errors, [name]: undefined },
    }));

    const req = (async () => {
      try {
        const refreshDate = await get().syncMetadata();
        const cacheKey = buildDatasetCacheKey(name, scopeTag, refreshDate);
        const cached = await idbCache.get<unknown[]>(cacheKey);
        if (Array.isArray(cached) && cached.length > 0) {
          set((s) => ({
            cache: { ...s.cache, [name]: cached },
            loading: { ...s.loading, [name]: false },
          }));
          return cached;
        }

        const raw = await dashboardApi.getDataset<unknown>(name);
        set((s) => ({
          cache: { ...s.cache, [name]: raw },
          loading: { ...s.loading, [name]: false },
        }));
        if (Array.isArray(raw) && raw.length > 0) {
          void idbCache.put(cacheKey, raw);
        }
        return raw;
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Lỗi tải ${name}`;
        set((s) => ({
          loading: { ...s.loading, [name]: false },
          errors: { ...s.errors, [name]: msg },
        }));
        return [];
      } finally {
        inflight.delete(inflightKey);
      }
    })();

    inflight.set(inflightKey, req);
    return req;
  },

  preloadBatch: async (names, user) => {
    await get().syncMetadata();
    await Promise.all(names.map((n) => get().loadPayload(n, user)));
  },

  clearAll: () => set({ cache: {}, loading: {}, errors: {}, dbRefreshDate: '' }),
}));
