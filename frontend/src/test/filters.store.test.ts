import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveApiMonth, matchMonthNum, useFiltersStore } from '../shared/stores/filters.store';

describe('useFiltersStore', () => {
  beforeEach(() => {
    useFiltersStore.getState().resetAll();
    useFiltersStore.getState().setYear('2026');
    useFiltersStore.getState().setSelectedMonths(['10']);
  });

  it('cascades downstream geo filters back to ALL when parent changes', () => {
    const store = useFiltersStore.getState();
    store.setGeoFilter('geoMien', 'MIỀN NAM');
    store.setGeoFilter('geoVung', 'HCM');
    store.setGeoFilter('geoGsbh', 'HCM 1');
    expect(useFiltersStore.getState().geoGsbh).toBe('HCM 1');

    useFiltersStore.getState().setGeoFilter('geoMien', 'MIỀN BẮC');
    expect(useFiltersStore.getState().geoVung).toBe('ALL');
    expect(useFiltersStore.getState().geoGsbh).toBe('ALL');
  });

  it('keeps at least one month selected and computes active API month', () => {
    useFiltersStore.getState().toggleMonth('10');
    expect(useFiltersStore.getState().selectedMonths).toEqual(['10']);

    useFiltersStore.getState().toggleMonth('09');
    expect(useFiltersStore.getState().selectedMonths).toEqual(['09', '10']);
    expect(getActiveApiMonth('2026', useFiltersStore.getState().selectedMonths)).toBe('2026-10');
    expect(matchMonthNum(9, ['09', '10'])).toBe(true);
    expect(matchMonthNum('08', ['09', '10'])).toBe(false);
  });
});
