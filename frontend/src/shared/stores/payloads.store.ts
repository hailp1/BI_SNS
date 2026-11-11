import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import type { PayloadName } from '../types/sales';
import { fetchDecryptedPayload } from '../utils/crypto';
import { applyEnterpriseRls } from '../utils/rls';

interface PayloadsState {
  cache: Partial<Record<PayloadName, unknown[]>>;
  loading: Partial<Record<PayloadName, boolean>>;
  errors: Partial<Record<PayloadName, string>>;
  loadPayload: (name: PayloadName, user: AuthUser | null) => Promise<unknown[]>;
  preloadBatch: (names: PayloadName[], user: AuthUser | null) => Promise<void>;
  clearAll: () => void;
}

const inflight = new Map<PayloadName, Promise<unknown[]>>();

export const usePayloadsStore = create<PayloadsState>((set, get) => ({
  cache: {},
  loading: {},
  errors: {},

  loadPayload: async (name, user) => {
    const existing = get().cache[name];
    if (existing) {
      const geo = (get().cache.DIM_GEO_HIER as Record<string, unknown>[] | undefined) || [];
      return applyEnterpriseRls(name, existing, user, geo);
    }

    const pending = inflight.get(name);
    if (pending) {
      const raw = await pending;
      const geo = (get().cache.DIM_GEO_HIER as Record<string, unknown>[] | undefined) || [];
      return applyEnterpriseRls(name, raw, user, geo);
    }

    set((s) => ({
      loading: { ...s.loading, [name]: true },
      errors: { ...s.errors, [name]: undefined },
    }));

    const req = (async () => {
      try {
        const raw = await fetchDecryptedPayload<unknown[]>(name);
        set((s) => ({
          cache: { ...s.cache, [name]: raw },
          loading: { ...s.loading, [name]: false },
        }));
        return raw;
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Lỗi tải ${name}`;
        set((s) => ({
          loading: { ...s.loading, [name]: false },
          errors: { ...s.errors, [name]: msg },
        }));
        return [];
      } finally {
        inflight.delete(name);
      }
    })();

    inflight.set(name, req);
    const raw = await req;
    const geo = (get().cache.DIM_GEO_HIER as Record<string, unknown>[] | undefined) || [];
    return applyEnterpriseRls(name, raw, user, geo);
  },

  preloadBatch: async (names, user) => {
    if (!get().cache.DIM_GEO_HIER && !names.includes('DIM_GEO_HIER')) {
      await get().loadPayload('DIM_GEO_HIER', user);
    }
    await Promise.all(names.map((n) => get().loadPayload(n, user)));
  },

  clearAll: () => set({ cache: {}, loading: {}, errors: {} }),
}));

