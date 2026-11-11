import { create } from 'zustand';

export interface FiltersState {
  year: string;
  selectedMonths: string[];
  dashChannel: string;
  dashSubChannel: string;
  dashAccount: string;
  geoMien: string;
  geoVung: string;
  geoArea: string;
  geoGsbh: string;
  geoNpp: string;
  mtSubChan: string;
  mtChain: string;
  mtCluster: string;
  mtStore: string;
  b2bAcc: string;
  b2bCust: string;
  krSubChan: string;
  krChain: string;
  prodStorage: string;
  prodCate: string;
  prodPh1: string;
  prodPh2: string;
  prodSku: string;
  setYear: (year: string) => void;
  toggleMonth: (month: string) => void;
  setSelectedMonths: (months: string[]) => void;
  setDashFilter: (key: 'dashChannel' | 'dashSubChannel' | 'dashAccount', val: string) => void;
  setGeoFilter: (key: 'geoMien' | 'geoVung' | 'geoArea' | 'geoGsbh' | 'geoNpp', val: string) => void;
  setMtFilter: (key: 'mtSubChan' | 'mtChain' | 'mtCluster' | 'mtStore', val: string) => void;
  setB2bFilter: (key: 'b2bAcc' | 'b2bCust', val: string) => void;
  setKrFilter: (key: 'krSubChan' | 'krChain', val: string) => void;
  setProdFilter: (key: 'prodStorage' | 'prodCate' | 'prodPh1' | 'prodPh2' | 'prodSku', val: string) => void;
  resetAll: () => void;
}

const DEFAULT_MONTH = '10';

export const useFiltersStore = create<FiltersState>((set) => ({
  year: '2026',
  selectedMonths: [DEFAULT_MONTH],
  dashChannel: 'ALL',
  dashSubChannel: 'ALL',
  dashAccount: 'ALL',
  geoMien: 'ALL',
  geoVung: 'ALL',
  geoArea: 'ALL',
  geoGsbh: 'ALL',
  geoNpp: 'ALL',
  mtSubChan: 'ALL',
  mtChain: 'ALL',
  mtCluster: 'ALL',
  mtStore: 'ALL',
  b2bAcc: 'ALL',
  b2bCust: 'ALL',
  krSubChan: 'ALL',
  krChain: 'ALL',
  prodStorage: 'ALL',
  prodCate: 'ALL',
  prodPh1: 'ALL',
  prodPh2: 'ALL',
  prodSku: 'ALL',

  setYear: (year) => set({ year }),
  toggleMonth: (month) =>
    set((s) => {
      const m = month.padStart(2, '0');
      const exists = s.selectedMonths.includes(m);
      if (exists && s.selectedMonths.length === 1) return s;
      const next = exists ? s.selectedMonths.filter((x) => x !== m) : [...s.selectedMonths, m].sort();
      return { selectedMonths: next };
    }),
  setSelectedMonths: (months) =>
    set({ selectedMonths: months.length > 0 ? months.map((m) => m.padStart(2, '0')) : [DEFAULT_MONTH] }),

  setDashFilter: (key, val) =>
    set(() => {
      if (key === 'dashChannel') return { dashChannel: val, dashSubChannel: 'ALL', dashAccount: 'ALL' };
      if (key === 'dashSubChannel') return { dashSubChannel: val, dashAccount: 'ALL' };
      return { dashAccount: val };
    }),

  setGeoFilter: (key, val) =>
    set(() => {
      if (key === 'geoMien') return { geoMien: val, geoVung: 'ALL', geoArea: 'ALL', geoGsbh: 'ALL', geoNpp: 'ALL' };
      if (key === 'geoVung') return { geoVung: val, geoArea: 'ALL', geoGsbh: 'ALL', geoNpp: 'ALL' };
      if (key === 'geoArea') return { geoArea: val, geoGsbh: 'ALL', geoNpp: 'ALL' };
      if (key === 'geoGsbh') return { geoGsbh: val, geoNpp: 'ALL' };
      return { geoNpp: val };
    }),

  setMtFilter: (key, val) =>
    set(() => {
      if (key === 'mtSubChan') return { mtSubChan: val, mtChain: 'ALL', mtCluster: 'ALL', mtStore: 'ALL' };
      if (key === 'mtChain') return { mtChain: val, mtCluster: 'ALL', mtStore: 'ALL' };
      if (key === 'mtCluster') return { mtCluster: val, mtStore: 'ALL' };
      return { mtStore: val };
    }),

  setB2bFilter: (key, val) =>
    set(() => (key === 'b2bAcc' ? { b2bAcc: val, b2bCust: 'ALL' } : { b2bCust: val })),

  setKrFilter: (key, val) =>
    set(() => (key === 'krSubChan' ? { krSubChan: val, krChain: 'ALL' } : { krChain: val })),

  setProdFilter: (key, val) =>
    set(() => {
      if (key === 'prodStorage') return { prodStorage: val, prodCate: 'ALL', prodPh1: 'ALL', prodPh2: 'ALL', prodSku: 'ALL' };
      if (key === 'prodCate') return { prodCate: val, prodPh1: 'ALL', prodPh2: 'ALL', prodSku: 'ALL' };
      if (key === 'prodPh1') return { prodPh1: val, prodPh2: 'ALL', prodSku: 'ALL' };
      if (key === 'prodPh2') return { prodPh2: val, prodSku: 'ALL' };
      return { prodSku: val };
    }),

  resetAll: () =>
    set({
      dashChannel: 'ALL',
      dashSubChannel: 'ALL',
      dashAccount: 'ALL',
      geoMien: 'ALL',
      geoVung: 'ALL',
      geoArea: 'ALL',
      geoGsbh: 'ALL',
      geoNpp: 'ALL',
      mtSubChan: 'ALL',
      mtChain: 'ALL',
      mtCluster: 'ALL',
      mtStore: 'ALL',
      b2bAcc: 'ALL',
      b2bCust: 'ALL',
      krSubChan: 'ALL',
      krChain: 'ALL',
      prodStorage: 'ALL',
      prodCate: 'ALL',
      prodPh1: 'ALL',
      prodPh2: 'ALL',
      prodSku: 'ALL',
    }),
}));

export function getActiveApiMonth(year: string, selectedMonths: string[]): string {
  const sorted = [...selectedMonths].sort();
  const last = sorted[sorted.length - 1] || DEFAULT_MONTH;
  return `${year}-${last}`;
}

export function matchMonthNum(rawMonth: unknown, selectedMonths: string[]): boolean {
  if (selectedMonths.length === 0) return true;
  const m = String(rawMonth ?? '').padStart(2, '0');
  return selectedMonths.includes(m);
}
