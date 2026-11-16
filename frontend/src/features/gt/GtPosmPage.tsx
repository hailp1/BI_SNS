import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  Snowflake,
  Store,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatNumber } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

export interface PosmAssetRow extends GeoRecord {
  c_code?: string;
  c_name?: string;
  addr?: string;
  dev_code?: string;
  dev_name?: string;
  dev_type?: string;
  capacity?: string;
  cap_group?: string;
  model_year?: number;
  qr?: string;
  serial?: string;
  qty?: number;
  channel?: string;
  channel_name?: string;
  sales?: Record<string, number[]> | string | null;
  sales_json?: Record<string, number[]> | string | null;
  [key: string]: unknown;
}

const GT_STANDEE_CAT_DATA: Record<string, Record<string, number>> = {
  '01': { '03. Snack': 2354317696, '06. Seasoning & Sauce': 120301620, '07. Processed Rice': 4852654, '08. Healthy Food': 80357967, '09. ETC': 24772573, '12. Noodles': 10263750 },
  '02': { '03. Snack': 1380649456, '06. Seasoning & Sauce': 232088611, '07. Processed Rice': 8142578, '08. Healthy Food': 37688633, '09. ETC': 29800034, '12. Noodles': 4276359 },
  '03': { '03. Snack': 2159766189, '06. Seasoning & Sauce': 146581134, '07. Processed Rice': 15903176, '08. Healthy Food': 16133645, '09. ETC': 46262599, '12. Noodles': 8776283 },
  '04': { '03. Snack': 2268103423, '06. Seasoning & Sauce': 124535543, '07. Processed Rice': 10866280, '08. Healthy Food': 23340442, '09. ETC': 50747399, '12. Noodles': 8797533 },
  '05': { '03. Snack': 2402719074, '06. Seasoning & Sauce': 115438199, '07. Processed Rice': 23185100, '08. Healthy Food': 16683408, '09. ETC': 51955554, '12. Noodles': 5493146 },
  '06': { '03. Snack': 2518323336, '06. Seasoning & Sauce': 95385112, '07. Processed Rice': 12525775, '08. Healthy Food': 7974288, '09. ETC': 20589891, '12. Noodles': 131138044 },
  '07': { '03. Snack': 2321742724, '06. Seasoning & Sauce': 73876155, '07. Processed Rice': 7640276, '08. Healthy Food': 4017082, '09. ETC': 16147818, '12. Noodles': 264100727 },
  '08': { '03. Snack': 2951035237, '06. Seasoning & Sauce': 128095623, '07. Processed Rice': 27497227, '08. Healthy Food': 3625171, '09. ETC': 13671224, '12. Noodles': 278285482 },
  '09': { '03. Snack': 2646762300, '06. Seasoning & Sauce': 87516132, '07. Processed Rice': 15926906, '08. Healthy Food': 5511240, '09. ETC': 22115487, '12. Noodles': 224043443 },
  '10': { '03. Snack': 1476481814, '06. Seasoning & Sauce': 29082399, '07. Processed Rice': 7858880, '08. Healthy Food': 17043566, '09. ETC': 7557000, '12. Noodles': 104947021 },
};

const FREEZER_TIER_CONFIG = [
  { label: '= 0 (Zero)', color: '#f43f5e', max: 0 },
  { label: '< 500k', color: '#fb923c', max: 500_000 },
  { label: '500k ~ 1.5M', color: '#eab308', max: 1_500_000 },
  { label: '1.5M ~ 3M', color: '#06b6d4', max: 3_000_000 },
  { label: '3M ~ 5M', color: '#3b82f6', max: 5_000_000 },
  { label: '5M ~ 10M', color: '#10b981', max: 10_000_000 },
  { label: '> 10M', color: '#8b5cf6', max: Infinity },
];

const STANDEE_TIER_CONFIG = [
  { label: '= 0 (Zero)', color: '#f43f5e', max: 0 },
  { label: '< 200k', color: '#fb923c', max: 200_000 },
  { label: '200k ~ 500k', color: '#fbbf24', max: 500_000 },
  { label: '500k ~ 1M', color: '#38bdf8', max: 1_000_000 },
  { label: '1M ~ 2M', color: '#818cf8', max: 2_000_000 },
  { label: '> 2M', color: '#34d399', max: Infinity },
];

function parseSalesMap(raw: unknown): Record<string, number[]> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, number[]>;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, number[]>;
    } catch {
      return {};
    }
  }
  return {};
}

function getL3mMonths(selMonths: string[]): string[] {
  const lastM = selMonths.length > 0 ? parseInt(selMonths[selMonths.length - 1], 10) : 10;
  const res: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const m = lastM - i;
    if (m >= 1) res.push(String(m).padStart(2, '0'));
  }
  return res;
}

function getGtPosmDataForPeriod(allData: PosmAssetRow[], selMonths: string[], curYear: string): PosmAssetRow[] {
  if (!allData || !Array.isArray(allData) || allData.length === 0) return [];
  const year = Number(curYear) || 2026;
  const monthsNum = (selMonths || []).map((m) => parseInt(m, 10)).filter((n) => !Number.isNaN(n));
  const maxSelectedMonth = monthsNum.length > 0 ? Math.max(...monthsNum) : 10;

  const getT10Snapshot = () => {
    const t10 = allData.filter(
      (d) =>
        (Number(d.month_num) === 10 || !d.month_num) &&
        (Number(d.year) === 2026 || !d.year),
    );
    return t10.length > 0 ? t10 : allData;
  };

  if (year < 2026 || (year === 2026 && maxSelectedMonth <= 10)) {
    return getT10Snapshot();
  }

  const monthRecords = allData.filter(
    (d) =>
      (Number(d.month_num) === maxSelectedMonth && Number(d.year) === year) ||
      d.month === `${year}-${String(maxSelectedMonth).padStart(2, '0')}`,
  );
  if (monthRecords.length > 0) return monthRecords;

  return getT10Snapshot();
}

function formatPosmShort(val: number): string {
  if (!val || val === 0) return '-';
  if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(2)} B`;
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)} M`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(0)} k`;
  return val.toLocaleString('vi-VN');
}

export interface PosmTreeNode {
  id: string;
  name: string;
  level: number;
  total: number;
  active: number;
  zero: number;
  actRate: number;
  mainSo: number;
  subSo: number;
  vpo: number;
  l3mZero: number;
  l3mZeroRate: number;
  l3mAvg: number;
  tiers: number[];
  children: PosmTreeNode[];
}

function buildPosmTree(
  rows: PosmAssetRow[],
  type: 'freezer' | 'standee',
  selectedMonths: string[],
  l3mMonths: string[],
  mCount: number,
): PosmTreeNode {
  const root: PosmTreeNode = {
    id: 'ROOT',
    name: type === 'freezer' ? 'TOÀN QUỐC (KÊNH GT)' : 'TOÀN QUỐC',
    level: 0,
    total: 0,
    active: 0,
    zero: 0,
    actRate: 0,
    mainSo: 0,
    subSo: 0,
    vpo: 0,
    l3mZero: 0,
    l3mZeroRate: 0,
    l3mAvg: 0,
    tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
    children: [],
  };

  const mienMap = new Map<string, PosmTreeNode>();
  const vungMap = new Map<string, PosmTreeNode>();
  const officeMap = new Map<string, PosmTreeNode>();
  const nppMap = new Map<string, PosmTreeNode>();
  const nvbhMap = new Map<string, PosmTreeNode>();

  for (const r of rows) {
    const q = Number(r.qty || 1);
    const salesMap = parseSalesMap(r.sales || r.sales_json);

    let mainVal = 0;
    let subVal = 0;
    for (const m of selectedMonths) {
      const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
      if (arr) {
        mainVal += Number(arr[0]) || 0;
        subVal += Number(arr[1]) || 0;
      }
    }

    let l3mSum = 0;
    for (const m of l3mMonths) {
      const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
      if (arr) l3mSum += Number(arr[0]) || 0;
    }

    const isActive = mainVal > 0 ? 1 : 0;
    const isL3mZero = l3mSum === 0 ? 1 : 0;
    const l3mAvg = l3mMonths.length > 0 ? Math.round(l3mSum / l3mMonths.length) : 0;
    const monthlySo = Math.round(mainVal / mCount);

    let tIdx = 0;
    if (type === 'freezer') {
      if (monthlySo <= 0) tIdx = 0;
      else if (monthlySo < 500_000) tIdx = 1;
      else if (monthlySo < 1_500_000) tIdx = 2;
      else if (monthlySo < 3_000_000) tIdx = 3;
      else if (monthlySo < 5_000_000) tIdx = 4;
      else if (monthlySo <= 10_000_000) tIdx = 5;
      else tIdx = 6;
    } else {
      if (monthlySo <= 0) tIdx = 0;
      else if (monthlySo < 200_000) tIdx = 1;
      else if (monthlySo < 500_000) tIdx = 2;
      else if (monthlySo < 1_000_000) tIdx = 3;
      else if (monthlySo < 2_000_000) tIdx = 4;
      else tIdx = 5;
    }

    const mien = r.mien || 'Chưa xác định';
    const vung = r.vung || 'Chưa xác định';
    const office = r.office || r.gsbh || 'Chưa phân công Office';
    const npp = (r.npp_name || r.npp_code) ? ((r.npp_code ? `${r.npp_code} - ` : '') + r.npp_name) : 'Khác';
    const nv = (r.emp_name || r.nvbh_name) ? ((r.emp_code ? `${r.emp_code} - ` : '') + (r.emp_name || r.nvbh_name)) : 'Chưa phân công NVBH';

    const mienId = `NODE_${mien}`;
    const vungId = `${mienId}_${vung}`;
    const officeId = `${vungId}_${office}`;
    const nppId = `${officeId}_${npp}`;
    const nvId = `${nppId}_${nv}`;

    const accNode = (node: PosmTreeNode) => {
      node.total += q;
      node.active += (isActive ? q : 0);
      node.l3mZero += (isL3mZero ? q : 0);
      node.mainSo += mainVal;
      node.subSo += subVal;
      node.l3mAvg += l3mAvg;
      node.tiers[tIdx] += q;
    };

    accNode(root);

    let mNode = mienMap.get(mienId);
    if (!mNode) {
      mNode = {
        id: mienId,
        name: mien,
        level: 1,
        total: 0,
        active: 0,
        zero: 0,
        actRate: 0,
        mainSo: 0,
        subSo: 0,
        vpo: 0,
        l3mZero: 0,
        l3mZeroRate: 0,
        l3mAvg: 0,
        tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
        children: [],
      };
      mienMap.set(mienId, mNode);
      root.children.push(mNode);
    }
    accNode(mNode);

    let vNode = vungMap.get(vungId);
    if (!vNode) {
      vNode = {
        id: vungId,
        name: vung,
        level: 2,
        total: 0,
        active: 0,
        zero: 0,
        actRate: 0,
        mainSo: 0,
        subSo: 0,
        vpo: 0,
        l3mZero: 0,
        l3mZeroRate: 0,
        l3mAvg: 0,
        tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
        children: [],
      };
      vungMap.set(vungId, vNode);
      mNode.children.push(vNode);
    }
    accNode(vNode);

    let oNode = officeMap.get(officeId);
    if (!oNode) {
      oNode = {
        id: officeId,
        name: office,
        level: 3,
        total: 0,
        active: 0,
        zero: 0,
        actRate: 0,
        mainSo: 0,
        subSo: 0,
        vpo: 0,
        l3mZero: 0,
        l3mZeroRate: 0,
        l3mAvg: 0,
        tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
        children: [],
      };
      officeMap.set(officeId, oNode);
      vNode.children.push(oNode);
    }
    accNode(oNode);

    let pNode = nppMap.get(nppId);
    if (!pNode) {
      pNode = {
        id: nppId,
        name: npp,
        level: 4,
        total: 0,
        active: 0,
        zero: 0,
        actRate: 0,
        mainSo: 0,
        subSo: 0,
        vpo: 0,
        l3mZero: 0,
        l3mZeroRate: 0,
        l3mAvg: 0,
        tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
        children: [],
      };
      nppMap.set(nppId, pNode);
      oNode.children.push(pNode);
    }
    accNode(pNode);

    let nvNode = nvbhMap.get(nvId);
    if (!nvNode) {
      nvNode = {
        id: nvId,
        name: nv,
        level: 5,
        total: 0,
        active: 0,
        zero: 0,
        actRate: 0,
        mainSo: 0,
        subSo: 0,
        vpo: 0,
        l3mZero: 0,
        l3mZeroRate: 0,
        l3mAvg: 0,
        tiers: new Array(type === 'freezer' ? 7 : 6).fill(0),
        children: [],
      };
      nvbhMap.set(nvId, nvNode);
      pNode.children.push(nvNode);
    }
    accNode(nvNode);
  }

  const finalizeNode = (n: PosmTreeNode) => {
    n.zero = Math.max(0, n.total - n.active);
    n.actRate = n.total > 0 ? (n.active / n.total) * 100 : 0;
    n.l3mZeroRate = n.total > 0 ? (n.l3mZero / n.total) * 100 : 0;
    n.vpo = n.active > 0 ? Math.round(n.mainSo / n.active / mCount) : 0;
    n.children.sort((a, b) => b.total - a.total);
    for (const ch of n.children) finalizeNode(ch);
  };
  finalizeNode(root);

  return root;
}

function flattenPosmTree(
  node: PosmTreeNode,
  openNodes: Record<string, boolean>,
  searchQuery: string,
): PosmTreeNode[] {
  const result: PosmTreeNode[] = [];
  const q = searchQuery.trim().toLowerCase();

  const matchesSearch = (n: PosmTreeNode): boolean => {
    if (!q) return true;
    if (n.name.toLowerCase().includes(q)) return true;
    return n.children.some(matchesSearch);
  };

  const traverse = (n: PosmTreeNode) => {
    if (!matchesSearch(n)) return;
    result.push(n);
    const isOpen = Boolean(openNodes[n.id] || q.length > 0);
    if (isOpen) {
      for (const ch of n.children) {
        traverse(ch);
      }
    }
  };

  traverse(node);
  return result;
}

export function GtPosmPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_FREEZER_DATA || s.loading.GT_STANDEE_DATA));

  const [tab, setTab] = useState<'freezer' | 'standee'>('freezer');
  const [freezers, setFreezers] = useState<PosmAssetRow[]>([]);
  const [standees, setStandees] = useState<PosmAssetRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([loadPayload('GT_FREEZER_DATA', user), loadPayload('GT_STANDEE_DATA', user)]).then(([f, s]) => {
      if (!active) return;
      if (Array.isArray(f)) setFreezers(f as PosmAssetRow[]);
      if (Array.isArray(s)) setStandees(s as PosmAssetRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const matchGeo = useCallback(
    (r: GeoRecord) =>
      (geoMien === 'ALL' || r.mien === geoMien) &&
      (geoVung === 'ALL' || r.vung === geoVung) &&
      (geoGsbh === 'ALL' || r.gsbh === geoGsbh) &&
      (geoNpp === 'ALL' || r.npp_code === geoNpp),
    [geoMien, geoVung, geoGsbh, geoNpp],
  );

  const periodFreezers = useMemo(
    () => getGtPosmDataForPeriod(freezers, selectedMonths, year),
    [freezers, selectedMonths, year],
  );
  const periodStandees = useMemo(
    () => getGtPosmDataForPeriod(standees, selectedMonths, year),
    [standees, selectedMonths, year],
  );

  const filteredFreezers = useMemo(() => periodFreezers.filter(matchGeo), [periodFreezers, matchGeo]);
  const filteredStandees = useMemo(() => periodStandees.filter(matchGeo), [periodStandees, matchGeo]);
  const activeRows = tab === 'freezer' ? filteredFreezers : filteredStandees;

  const mCount = Math.max(1, selectedMonths.length || 1);
  const l3mMonths = useMemo(() => getL3mMonths(selectedMonths), [selectedMonths]);

  const [treeSearch, setTreeSearch] = useState('');
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({ ROOT: true });

  const posmTreeRoot = useMemo(
    () => buildPosmTree(activeRows, tab, selectedMonths, l3mMonths, mCount),
    [activeRows, tab, selectedMonths, l3mMonths, mCount],
  );

  const flatTreeRows = useMemo(
    () => flattenPosmTree(posmTreeRoot, openNodes, treeSearch),
    [posmTreeRoot, openNodes, treeSearch],
  );

  useEffect(() => {
    setOpenNodes((prev) => {
      const next: Record<string, boolean> = { ...prev, ROOT: true };
      for (const ch of posmTreeRoot.children) {
        next[ch.id] = true;
      }
      return next;
    });
  }, [posmTreeRoot]);

  const toggleAllTreeNodes = useCallback(() => {
    setOpenNodes((prev) => {
      const allIds: Record<string, boolean> = {};
      const collect = (n: PosmTreeNode) => {
        allIds[n.id] = true;
        for (const ch of n.children) collect(ch);
      };
      collect(posmTreeRoot);

      const countOpen = Object.values(prev).filter(Boolean).length;
      if (countOpen > posmTreeRoot.children.length + 1) {
        const collapsed: Record<string, boolean> = { ROOT: true };
        for (const ch of posmTreeRoot.children) collapsed[ch.id] = true;
        return collapsed;
      }
      return allIds;
    });
  }, [posmTreeRoot]);

  const toggleNode = useCallback((id: string) => {
    setOpenNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const excelTreeRows = useMemo(() => {
    const list: PosmTreeNode[] = [];
    const collect = (n: PosmTreeNode) => {
      list.push(n);
      for (const ch of n.children) collect(ch);
    };
    collect(posmTreeRoot);
    return list;
  }, [posmTreeRoot]);

  // Freezer Processed Metrics
  const freezerMetrics = useMemo(() => {
    let totalFreezers = 0;
    let freezeCnt = 0;
    let coolCnt = 0;
    let activeFreezers = 0;
    let totalFrozenSo = 0;
    let totalAllSo = 0;
    let l3mZeroFreezers = 0;
    const outletSet = new Set<string>();

    const byCap = new Map<string, { qty: number; frozenSo: number; active: number }>();
    const byChan = new Map<string, { qty: number; frozenSo: number; active: number }>();
    const byYear = new Map<string, { qty: number; active: number; frozenSo: number }>();
    const tierCounts = new Array(FREEZER_TIER_CONFIG.length).fill(0);

    for (const r of filteredFreezers) {
      const q = Number(r.qty || 1);
      totalFreezers += q;
      if (r.c_code) outletSet.add(r.c_code);

      const dType = String(r.dev_type || '').toLowerCase();
      if (dType.includes('mát')) coolCnt += q;
      else freezeCnt += q;

      const salesMap = parseSalesMap(r.sales || r.sales_json);
      let rFrozen = 0;
      let rTotal = 0;
      for (const m of selectedMonths) {
        const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
        if (arr) {
          rFrozen += Number(arr[0]) || 0;
          rTotal += Number(arr[1]) || 0;
        }
      }

      let l3mSum = 0;
      for (const m of l3mMonths) {
        const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
        if (arr) l3mSum += Number(arr[0]) || 0;
      }
      if (l3mSum === 0) l3mZeroFreezers += q;

      totalFrozenSo += rFrozen;
      totalAllSo += rTotal;
      const isActive = rFrozen > 0;
      if (isActive) activeFreezers += q;

      // Tier
      const monthlySo = rFrozen / mCount;
      let tierIdx = 0;
      if (monthlySo <= 0) tierIdx = 0;
      else if (monthlySo < 500_000) tierIdx = 1;
      else if (monthlySo < 1_500_000) tierIdx = 2;
      else if (monthlySo < 3_000_000) tierIdx = 3;
      else if (monthlySo < 5_000_000) tierIdx = 4;
      else if (monthlySo <= 10_000_000) tierIdx = 5;
      else tierIdx = 6;
      tierCounts[tierIdx] += q;

      // By Capacity
      const capKey = r.cap_group || r.capacity || 'Khác';
      const curCap = byCap.get(capKey) || { qty: 0, frozenSo: 0, active: 0 };
      curCap.qty += q;
      curCap.frozenSo += rFrozen;
      if (isActive) curCap.active += q;
      byCap.set(capKey, curCap);

      // By Channel
      const chanKey = r.channel_name || r.channel || 'Khác';
      const curChan = byChan.get(chanKey) || { qty: 0, frozenSo: 0, active: 0 };
      curChan.qty += q;
      curChan.frozenSo += rFrozen;
      if (isActive) curChan.active += q;
      byChan.set(chanKey, curChan);

      // By Year
      const yrKey = String(r.model_year || 'N/A');
      const curYr = byYear.get(yrKey) || { qty: 0, active: 0, frozenSo: 0 };
      curYr.qty += q;
      if (isActive) curYr.active += q;
      curYr.frozenSo += rFrozen;
      byYear.set(yrKey, curYr);
    }

    const zeroFreezers = Math.max(0, totalFreezers - activeFreezers);
    const activeRate = totalFreezers > 0 ? (activeFreezers / totalFreezers) * 100 : 0;
    const zeroRate = totalFreezers > 0 ? (zeroFreezers / totalFreezers) * 100 : 0;
    const vpo = activeFreezers > 0 ? totalFrozenSo / activeFreezers / mCount : 0;
    const coldShare = totalAllSo > 0 ? (totalFrozenSo / totalAllSo) * 100 : 0;

    return {
      totalFreezers,
      freezeCnt,
      coolCnt,
      activeFreezers,
      zeroFreezers,
      l3mZeroFreezers,
      activeRate,
      zeroRate,
      totalFrozenSo,
      totalAllSo,
      coldShare,
      vpo,
      uniqueOutlets: outletSet.size,
      byCap,
      byChan,
      byYear,
      tierCounts,
    };
  }, [filteredFreezers, selectedMonths, mCount, l3mMonths]);

  // Standee Processed Metrics
  const standeeMetrics = useMemo(() => {
    let totalRacks = 0;
    let ironCnt = 0;
    let miniCnt = 0;
    let cnt2026 = 0;
    let activeRacks = 0;
    let totalAmbientSo = 0;
    let totalSnackSo = 0;
    let totalAllSo = 0;
    let l3mZeroRacks = 0;
    const outletSet = new Set<string>();

    const byChan = new Map<string, { qty: number; ambientSo: number; active: number }>();
    const tierCounts = new Array(STANDEE_TIER_CONFIG.length).fill(0);

    for (const r of filteredStandees) {
      const q = Number(r.qty || 1);
      totalRacks += q;
      if (r.c_code) outletSet.add(r.c_code);

      const dName = String(r.dev_name || r.dev_type || '').toUpperCase();
      if (dName.includes('MINI')) miniCnt += q;
      else if (dName.includes('2026') || r.model_year === 2026) cnt2026 += q;
      else ironCnt += q;

      const salesMap = parseSalesMap(r.sales || r.sales_json);
      let rAmbient = 0;
      let rSnack = 0;
      let rTotal = 0;
      for (const m of selectedMonths) {
        const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
        if (arr) {
          rAmbient += Number(arr[0]) || 0;
          rSnack += Number(arr[1]) || 0;
          rTotal += Number(arr[2]) || 0;
        }
      }

      let l3mSum = 0;
      for (const m of l3mMonths) {
        const arr = salesMap[m] || salesMap[String(parseInt(m, 10)).padStart(2, '0')];
        if (arr) l3mSum += Number(arr[0]) || 0;
      }
      if (l3mSum === 0) l3mZeroRacks += q;

      totalAmbientSo += rAmbient;
      totalSnackSo += rSnack;
      totalAllSo += rTotal;
      const isActive = rAmbient > 0;
      if (isActive) activeRacks += q;

      // Tier
      const avgM = rAmbient / mCount;
      let tierIdx = 0;
      if (avgM <= 0) tierIdx = 0;
      else if (avgM < 200_000) tierIdx = 1;
      else if (avgM < 500_000) tierIdx = 2;
      else if (avgM < 1_000_000) tierIdx = 3;
      else if (avgM < 2_000_000) tierIdx = 4;
      else tierIdx = 5;
      tierCounts[tierIdx] += q;

      // By Channel
      const chanKey = r.channel_name || r.channel || 'Khác';
      const curChan = byChan.get(chanKey) || { qty: 0, ambientSo: 0, active: 0 };
      curChan.qty += q;
      curChan.ambientSo += rAmbient;
      if (isActive) curChan.active += q;
      byChan.set(chanKey, curChan);
    }

    const zeroRacks = Math.max(0, totalRacks - activeRacks);
    const activeRate = totalRacks > 0 ? (activeRacks / totalRacks) * 100 : 0;
    const zeroRate = totalRacks > 0 ? (zeroRacks / totalRacks) * 100 : 0;
    const vpo = activeRacks > 0 ? totalAmbientSo / activeRacks / mCount : 0;
    const snackShare = totalAmbientSo > 0 ? (totalSnackSo / totalAmbientSo) * 100 : 0;

    return {
      totalRacks,
      ironCnt,
      miniCnt,
      cnt2026,
      activeRacks,
      zeroRacks,
      l3mZeroRacks,
      activeRate,
      zeroRate,
      totalAmbientSo,
      totalSnackSo,
      totalAllSo,
      snackShare,
      vpo,
      uniqueOutlets: outletSet.size,
      byChan,
      tierCounts,
    };
  }, [filteredStandees, selectedMonths, mCount, l3mMonths]);

  // Chart 1 Freezer: Capacity (Dual-axis Bar + Line)
  const freezerCapacityOption = useMemo(() => {
    const entries = Array.from(freezerMetrics.byCap.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Số Lượng Tủ', 'Năng Suất (Tr/Tủ/Tháng)'], top: 2, textStyle: { color: '#fff', fontSize: 10 } },
      grid: { left: 48, right: 44, top: 34, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: entries.map((e) => e[0]),
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, rotate: 12 },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Số Tủ',
          nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: 'Tr/Tủ',
          nameTextStyle: { color: '#fde047', fontSize: 9 },
          axisLabel: { color: '#fde047', fontSize: 9.5 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Số Lượng Tủ',
          type: 'bar' as const,
          barMaxWidth: 20,
          data: entries.map((e) => e[1].qty),
          itemStyle: { color: 'rgba(255,255,255,0.85)', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' as const },
        },
        {
          name: 'Năng Suất (Tr/Tủ/Tháng)',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: entries.map((e) => (e[1].active > 0 ? Number((e[1].frozenSo / e[1].active / mCount / 1e6).toFixed(1)) : 0)),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.2, color: '#fde047' },
          label: { show: true, position: 'top' as const, color: '#FEF08A', fontSize: 8.5 },
        },
      ],
    };
  }, [freezerMetrics.byCap, mCount]);

  // Chart 2 Freezer: Channel (Horizontal Bar)
  const freezerChannelOption = useMemo(() => {
    const entries = Array.from(freezerMetrics.byChan.entries()).sort((a, b) => a[1].qty - b[1].qty).slice(-8);
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 96, right: 48, top: 16, bottom: 24 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: entries.map((e) => e[0]),
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      series: [
        {
          name: 'Số Lượng Tủ',
          type: 'bar' as const,
          barMaxWidth: 20,
          data: entries.map((e) => e[1].qty),
          itemStyle: { color: '#38BDF8', borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right' as const, color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
        },
      ],
    };
  }, [freezerMetrics.byChan]);

  // Chart 3 Freezer: Model Year (Dual Bar + Line)
  const freezerYearOption = useMemo(() => {
    const entries = Array.from(freezerMetrics.byYear.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Tổng Tủ', 'Tủ Active', 'DS/Tủ (Tr)'], top: 2, textStyle: { color: '#fff', fontSize: 10 } },
      grid: { left: 48, right: 44, top: 34, bottom: 28 },
      xAxis: {
        type: 'category' as const,
        data: entries.map((e) => e[0]),
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: 'Tr/Tủ',
          nameTextStyle: { color: '#fde047', fontSize: 9 },
          axisLabel: { color: '#fde047', fontSize: 9.5 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Tổng Tủ',
          type: 'bar' as const,
          barMaxWidth: 16,
          data: entries.map((e) => e[1].qty),
          itemStyle: { color: 'rgba(255,255,255,0.5)', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Tủ Active',
          type: 'bar' as const,
          barMaxWidth: 16,
          data: entries.map((e) => e[1].active),
          itemStyle: { color: '#38BDF8', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#BAE6FD', fontSize: 8.5 },
        },
        {
          name: 'DS/Tủ (Tr)',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: entries.map((e) => (e[1].active > 0 ? Number((e[1].frozenSo / e[1].active / mCount / 1e6).toFixed(1)) : 0)),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.2, color: '#fde047' },
        },
      ],
    };
  }, [freezerMetrics.byYear, mCount]);

  // Chart 4 Freezer: Tiers (Horizontal Bar)
  const freezerTierOption = useMemo(() => {
    const total = freezerMetrics.totalFreezers || 1;
    const categories = FREEZER_TIER_CONFIG.map((t) => t.label);
    const data = FREEZER_TIER_CONFIG.map((t, idx) => ({
      value: freezerMetrics.tierCounts[idx],
      itemStyle: { color: t.color, borderRadius: [0, 4, 4, 0] },
    }));
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 96, right: 64, top: 16, bottom: 24 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: categories,
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      series: [
        {
          name: 'Số Tủ',
          type: 'bar' as const,
          barMaxWidth: 18,
          data,
          label: {
            show: true,
            position: 'right' as const,
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 'bold' as const,
            formatter: (p: { value?: unknown }) => {
              const v = Number(p.value || 0);
              return `${v} (${((v / total) * 100).toFixed(1)}%)`;
            },
          },
        },
      ],
    };
  }, [freezerMetrics.tierCounts, freezerMetrics.totalFreezers]);

  // Chart 1 Standee: 12-Month Trend (Dual-axis Bar + Line)
  const standeeMonthlyOption = useMemo(() => {
    const monthLabels = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T12'];
    const monthKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const totalRacks = standeeMetrics.totalRacks || 1;

    const monthlyActive: number[] = [];
    const monthlyRate: number[] = [];

    monthKeys.forEach((m) => {
      let act = 0;
      for (const r of filteredStandees) {
        const salesMap = parseSalesMap(r.sales || r.sales_json);
        const arr = salesMap[m];
        if (arr && Number(arr[0]) > 0) act += Number(r.qty || 1);
      }
      monthlyActive.push(act);
      monthlyRate.push(Number(((act / totalRacks) * 100).toFixed(1)));
    });

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Kệ Active', 'Tỷ Lệ Active %'], top: 2, textStyle: { color: '#fff', fontSize: 10 } },
      grid: { left: 44, right: 44, top: 34, bottom: 28 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels,
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Số Kệ',
          nameTextStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: '%',
          max: 100,
          nameTextStyle: { color: '#38BDF8', fontSize: 9 },
          axisLabel: { color: '#38BDF8', fontSize: 9.5 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Kệ Active',
          type: 'bar' as const,
          barMaxWidth: 16,
          data: monthlyActive,
          itemStyle: { color: '#34D399', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#D1FAE5', fontSize: 8 },
        },
        {
          name: 'Tỷ Lệ Active %',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: monthlyRate,
          itemStyle: { color: '#38BDF8' },
          lineStyle: { width: 2.2, color: '#38BDF8' },
        },
      ],
    };
  }, [filteredStandees, standeeMetrics.totalRacks]);

  // Chart 2 Standee: Channel (Bar + Năng suất k/kệ)
  const standeeChannelOption = useMemo(() => {
    const entries = Array.from(standeeMetrics.byChan.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Số Kệ', 'Năng Suất (k/kệ/tháng)'], top: 2, textStyle: { color: '#fff', fontSize: 10 } },
      grid: { left: 44, right: 44, top: 34, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: entries.map((e) => e[0]),
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, rotate: 12 },
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: 'k/Kệ',
          nameTextStyle: { color: '#fde047', fontSize: 9 },
          axisLabel: { color: '#fde047', fontSize: 9.5 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Số Kệ',
          type: 'bar' as const,
          barMaxWidth: 20,
          data: entries.map((e) => e[1].qty),
          itemStyle: { color: '#A78BFA', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#EDE9FE', fontSize: 8.5 },
        },
        {
          name: 'Năng Suất (k/kệ/tháng)',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: entries.map((e) => (e[1].active > 0 ? Number((e[1].ambientSo / e[1].active / mCount / 1e3).toFixed(1)) : 0)),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.2, color: '#fde047' },
        },
      ],
    };
  }, [standeeMetrics.byChan, mCount]);

  // Chart 3 Standee: Category (6 Ngành hàng Khô)
  const standeeCategoryOption = useMemo(() => {
    const catTotals: Record<string, number> = {
      '03. Snack': 0,
      '06. Seasoning & Sauce': 0,
      '12. Noodles': 0,
      '09. ETC': 0,
      '08. Healthy Food': 0,
      '07. Processed Rice': 0,
    };
    const selM = selectedMonths.length > 0 ? selectedMonths : ['10'];
    selM.forEach((m) => {
      const padM = m.padStart(2, '0');
      const mData = GT_STANDEE_CAT_DATA[padM] || {};
      Object.keys(catTotals).forEach((cat) => {
        catTotals[cat] += mData[cat] || 0;
      });
    });

    const categories = Object.keys(catTotals);
    const colorMap: Record<string, string> = {
      '03. Snack': '#10b981',
      '06. Seasoning & Sauce': '#f59e0b',
      '12. Noodles': '#3b82f6',
      '09. ETC': '#94a3b8',
      '08. Healthy Food': '#ec4899',
      '07. Processed Rice': '#8b5cf6',
    };

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c} ({d}%)',
      },
      legend: { top: 2, textStyle: { color: '#fff', fontSize: 9.5 } },
      series: [
        {
          name: 'Cơ Cấu Ngành Hàng Khô',
          type: 'pie' as const,
          radius: ['40%', '70%'],
          center: ['50%', '55%'],
          data: categories.map((c) => ({
            name: c,
            value: catTotals[c],
            itemStyle: { color: colorMap[c] || '#CBD5E1' },
          })),
          label: { color: '#FFFFFF', fontSize: 9.5, formatter: '{b}: {d}%' },
        },
      ],
    };
  }, [selectedMonths]);

  // Chart 4 Standee: Tiers (Horizontal Bar)
  const standeeTierOption = useMemo(() => {
    const total = standeeMetrics.totalRacks || 1;
    const categories = STANDEE_TIER_CONFIG.map((t) => t.label);
    const data = STANDEE_TIER_CONFIG.map((t, idx) => ({
      value: standeeMetrics.tierCounts[idx],
      itemStyle: { color: t.color, borderRadius: [0, 4, 4, 0] },
    }));
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 96, right: 64, top: 16, bottom: 24 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: categories,
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      series: [
        {
          name: 'Số Kệ',
          type: 'bar' as const,
          barMaxWidth: 18,
          data,
          label: {
            show: true,
            position: 'right' as const,
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 'bold' as const,
            formatter: (p: { value?: unknown }) => {
              const v = Number(p.value || 0);
              return `${v} (${((v / total) * 100).toFixed(1)}%)`;
            },
          },
        },
      ],
    };
  }, [standeeMetrics.tierCounts, standeeMetrics.totalRacks]);

  const columns: ColumnDef<PosmAssetRow>[] = [
    { key: 'c_code', header: 'Mã KH', sortValue: (r) => r.c_code || '', render: (r) => <span className="font-mono-num font-semibold text-slate-900">{r.c_code}</span> },
    { key: 'c_name', header: 'Tên điểm bán', sortValue: (r) => r.c_name || '', render: (r) => r.c_name || '-' },
    { key: 'npp', header: 'NPP', sortValue: (r) => r.npp_name || '', render: (r) => r.npp_name || r.npp_code || '-' },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung || '', render: (r) => r.vung || '-' },
    { key: 'dev_type', header: 'Loại thiết bị', sortValue: (r) => r.dev_type || '', render: (r) => r.dev_type || r.dev_name || '-' },
    { key: 'cap', header: tab === 'freezer' ? 'Dung tích' : 'Số lượng', align: 'right', sortValue: (r) => String(r.capacity || r.qty || ''), render: (r) => (tab === 'freezer' ? r.capacity || '-' : String(r.qty || 1)) },
    { key: 'year', header: 'Model', align: 'center', sortValue: (r) => r.model_year || 0, render: (r) => String(r.model_year || '-') },
    { key: 'qr', header: 'QR / Serial', sortValue: (r) => r.qr || '', render: (r) => <span className="font-mono-num text-xs text-slate-500">{r.qr || r.serial || r.dev_code || '-'}</span> },
  ];

  const periodLabel = `Kỳ T${selectedMonths.join(', T')}/${year}`;

  return (
    <div className="space-y-4">
      {/* Title & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#004B91] shadow-sm">
            {tab === 'freezer' ? <Snowflake className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                {tab === 'freezer' ? 'BÁO CÁO HIỆU QUẢ KHAI THÁC TỦ ĐÔNG & TỦ MÁT KÊNH GT' : 'BÁO CÁO HIỆU QUẢ KHAI THÁC STANDEE (KỆ SẮT) KÊNH GT'}
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-800">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dữ liệu liên kết đồng bộ với bộ lọc Địa Lý GT (Miền/Vùng/Office/NPP/NVBH) và Tháng trên thanh điều khiển chung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setTab('freezer')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                tab === 'freezer' ? 'bg-[#004B91] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>❄️</span>
              <span>Tủ Đông &amp; Tủ Mát ({filteredFreezers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('standee')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                tab === 'standee' ? 'bg-[#7c3aed] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🧺</span>
              <span>Standee Kệ Sắt ({filteredStandees.length})</span>
            </button>
          </div>

          <ExportExcelButton
            filename={`GT_POSM_${tab}_${year}.xlsx`}
            sheetName={tab.toUpperCase()}
            rows={activeRows}
            columns={[
              { header: 'Mã KH', key: (r) => r.c_code || '' },
              { header: 'Tên điểm bán', key: (r) => r.c_name || '' },
              { header: 'NPP', key: (r) => r.npp_name || '' },
              { header: 'Vùng', key: (r) => r.vung || '' },
              { header: 'Loại thiết bị', key: (r) => r.dev_type || r.dev_name || '' },
              { header: 'Model Year', key: (r) => r.model_year || '' },
              { header: 'QR / Seri', key: (r) => r.qr || r.serial || '' },
            ]}
          />
        </div>
      </div>

      <GeoFilterBar records={tab === 'freezer' ? freezers : standees} />

      {/* 5 KPI Cards matching web_app */}
      {tab === 'freezer' ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 lg:grid-cols-5">
          <KpiCard
            title="QUY MÔ TỦ ĐẦU TƯ"
            value={loading ? '...' : formatNumber(freezerMetrics.totalFreezers)}
            subtitle={`Đông: ${formatNumber(freezerMetrics.freezeCnt)} | Mát: ${formatNumber(freezerMetrics.coolCnt)}`}
            badge={`${formatNumber(freezerMetrics.uniqueOutlets)} Điểm`}
            accent="blue"
            icon={<Snowflake className="h-4 w-4" />}
          />
          <KpiCard
            title="TỦ ACTIVE (CÓ DOANH SỐ)"
            value={loading ? '...' : formatNumber(freezerMetrics.activeFreezers)}
            subtitle="Tỷ lệ điểm đặt tủ có phát sinh sell-out tháng"
            badge={`${freezerMetrics.activeRate.toFixed(1)}%`}
            badgeTone="positive"
            accent="emerald"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            title="TỦ ZERO-SALES (0 BÁN)"
            value={loading ? '...' : formatNumber(freezerMetrics.zeroFreezers)}
            subtitle={`⚠️ 3T không lấy hàng: ${formatNumber(freezerMetrics.l3mZeroFreezers)} tủ`}
            badge={`${freezerMetrics.zeroRate.toFixed(1)}%`}
            badgeTone="negative"
            accent="red"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KpiCard
            title="DOANH SỐ HÀNG ĐÔNG"
            value={loading ? '...' : formatCurrencyVnd(freezerMetrics.totalFrozenSo)}
            subtitle={`Tổng SO điểm tủ: ${formatCurrencyVnd(freezerMetrics.totalAllSo)}`}
            badge={`${freezerMetrics.coldShare.toFixed(1)}% SO`}
            accent="blue"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            title="NĂNG SUẤT TB / TỦ / THÁNG"
            value={loading ? '...' : formatCurrencyVnd(freezerMetrics.vpo)}
            subtitle="Bình quân doanh số đông / 1 tủ có mua / tháng"
            accent="amber"
            icon={<Box className="h-4 w-4" />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 lg:grid-cols-5">
          <KpiCard
            title="QUY MÔ KỆ ĐẦU TƯ"
            value={loading ? '...' : formatNumber(standeeMetrics.totalRacks)}
            subtitle={`RB: ${formatNumber(standeeMetrics.ironCnt)} | Mini: ${formatNumber(standeeMetrics.miniCnt)} | 2026: ${formatNumber(standeeMetrics.cnt2026)}`}
            badge={`${formatNumber(standeeMetrics.uniqueOutlets)} Điểm`}
            accent="blue"
            icon={<Layers className="h-4 w-4" />}
          />
          <KpiCard
            title="KỆ ACTIVE (CÓ DOANH SỐ)"
            value={loading ? '...' : formatNumber(standeeMetrics.activeRacks)}
            subtitle="Tỷ lệ điểm đặt kệ có phát sinh sell-out khô"
            badge={`${standeeMetrics.activeRate.toFixed(1)}%`}
            badgeTone="positive"
            accent="emerald"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            title="KỆ ZERO-SALES (0 BÁN KHÔ)"
            value={loading ? '...' : formatNumber(standeeMetrics.zeroRacks)}
            subtitle={`⚠️ 3T không lấy hàng khô: ${formatNumber(standeeMetrics.l3mZeroRacks)} kệ`}
            badge={`${standeeMetrics.zeroRate.toFixed(1)}%`}
            badgeTone="negative"
            accent="red"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KpiCard
            title="DOANH SỐ HÀNG KHÔ"
            value={loading ? '...' : formatCurrencyVnd(standeeMetrics.totalAmbientSo)}
            subtitle={`Snack: ${formatCurrencyVnd(standeeMetrics.totalSnackSo)}`}
            badge={`03. Snack: ${standeeMetrics.snackShare.toFixed(0)}%`}
            accent="blue"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            title="NĂNG SUẤT TB / KỆ / THÁNG"
            value={loading ? '...' : formatCurrencyVnd(standeeMetrics.vpo)}
            subtitle="Bình quân doanh số khô / 1 kệ có mua / tháng"
            accent="amber"
            icon={<Box className="h-4 w-4" />}
          />
        </div>
      )}

      {/* 4 ECharts Cards matching web_app */}
      {tab === 'freezer' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EChartsCard
            title="Quy Mô Tủ &amp; Doanh Số TB Theo Dung Tích"
            subtitle="Số lượng tủ đầu tư &amp; Năng suất doanh số sinh ra (Tr/Tủ/Tháng)"
            option={freezerCapacityOption}
            height={280}
            loading={loading}
            gradientClass="grad-blue"
            badgeText="Dung Tích"
            badgeClass="badge-pill badge-pill-blue"
          />
          <EChartsCard
            title="Phân Bổ Tủ &amp; Doanh Số Theo Kênh Khách Hàng"
            subtitle="Số lượng tủ đầu tư theo loại hình điểm bán"
            option={freezerChannelOption}
            height={280}
            loading={loading}
            gradientClass="grad-blue"
            badgeText="Kênh KH"
            badgeClass="badge-pill badge-pill-green"
          />
          <EChartsCard
            title="Quy Mô &amp; Hiệu Quả Khai Thác Theo Năm Sản Xuất"
            subtitle="Phân bổ theo Model Year và doanh số bình quân"
            option={freezerYearOption}
            height={280}
            loading={loading}
            gradientClass="grad-purple"
            badgeText="Model Year"
            badgeClass="badge-pill badge-pill-purple"
          />
          <EChartsCard
            title="Phân Tầng Năng Suất Điểm Đặt Tủ Đông"
            subtitle="Phân nhóm Tier doanh số (Zero, <500k, 500k~1.5M, 1.5M~3M, 3M~5M, 5M~10M, >10M)"
            option={freezerTierOption}
            height={280}
            loading={loading}
            gradientClass="grad-orange"
            badgeText="Sales Tier"
            badgeClass="badge-pill badge-pill-orange"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EChartsCard
            title="Xu Hướng Quy Mô &amp; Năng Suất Standee 12 Tháng"
            subtitle="Tổng số lượng standee, số standee active và tỷ lệ active qua từng tháng"
            option={standeeMonthlyOption}
            height={280}
            loading={loading}
            gradientClass="grad-purple"
            badgeText="12 Tháng"
            badgeClass="badge-pill badge-pill-purple"
          />
          <EChartsCard
            title="Quy Mô Kệ &amp; Năng Suất TB Theo Kênh KH"
            subtitle="Số lượng kệ đầu tư &amp; Năng suất hàng khô sinh ra (k/Kệ/Tháng)"
            option={standeeChannelOption}
            height={280}
            loading={loading}
            gradientClass="grad-blue"
            badgeText="Kênh KH"
            badgeClass="badge-pill badge-pill-blue"
          />
          <EChartsCard
            title="Cơ Cấu Doanh Số Theo Ngành Hàng Khô Trưng Bày"
            subtitle="Chi tiết tỷ trọng doanh số theo 6 ngành hàng: Snack, Gia vị, Mì, ETC..."
            option={standeeCategoryOption}
            height={280}
            loading={loading}
            gradientClass="grad-green"
            badgeText="Ngành Hàng"
            badgeClass="badge-pill badge-pill-green"
          />
          <EChartsCard
            title="Phân Tầng Năng Suất Kệ Sắt Standee"
            subtitle="Phân nhóm Tier doanh số (Zero, <200k, 200k~500k, 500k~1M, 1M~2M, >2M)"
            option={standeeTierOption}
            height={280}
            loading={loading}
            gradientClass="grad-orange"
            badgeText="Sales Tier"
            badgeClass="badge-pill badge-pill-orange"
          />
        </div>
      )}

      {/* 5-Level Hierarchical Drilldown Tree Table matching web_app table-gt-freezer / table-gt-standee */}
      <div className="material-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-purple-600 rounded-full inline-block" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {tab === 'freezer'
                  ? 'Bảng Phân Tích Hiệu Quả Tủ Đông Kênh GT (Cây Phân Cấp)'
                  : 'Bảng Phân Tích Hiệu Quả Standee (Kệ Sắt) Kênh GT (Cây Phân Cấp)'}
              </h3>
              <p className="text-xs text-slate-500">
                Phân tích 5 cấp (Miền → Vùng → Office → NPP → NVBH) kèm chỉ số 1 tháng, L3M và phân tầng doanh số
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="Tìm miền, vùng, office, NPP, NVBH..."
                className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none w-56 shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={toggleAllTreeNodes}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-slate-50 shadow-2xs"
            >
              Bung / Đóng Hết
            </button>
            <ExportExcelButton
              filename={tab === 'freezer' ? `CJ_POSM_Freezer_Tree_${year}.xlsx` : `CJ_POSM_Standee_Tree_${year}.xlsx`}
              sheetName={tab === 'freezer' ? 'FreezerTree' : 'StandeeTree'}
              rows={excelTreeRows}
              columns={
                tab === 'freezer'
                  ? [
                      { header: 'Cấp Tổ Chức', key: (r) => `${'  '.repeat(r.level)}${r.name}` },
                      { header: 'Tổng Tủ', key: (r) => r.total },
                      { header: '# Tủ Có Mua', key: (r) => r.active },
                      { header: '# Tủ Chưa Mua', key: (r) => r.zero },
                      { header: '% Tủ Có Mua', key: (r) => Number(r.actRate.toFixed(1)) },
                      { header: 'DS Hàng Đông', key: (r) => r.mainSo },
                      { header: 'Tổng Sell-out', key: (r) => r.subSo },
                      { header: 'Năng Suất TB', key: (r) => r.vpo },
                      { header: 'Tủ 3T Ko Mua', key: (r) => r.l3mZero },
                      { header: '% Tủ 3T Ko Mua', key: (r) => Number(r.l3mZeroRate.toFixed(1)) },
                      { header: 'TB 3T Đông', key: (r) => r.l3mAvg },
                      { header: '= 0', key: (r) => r.tiers[0] },
                      { header: '< 500k', key: (r) => r.tiers[1] },
                      { header: '500k~1.5M', key: (r) => r.tiers[2] },
                      { header: '1.5M~3M', key: (r) => r.tiers[3] },
                      { header: '3M~5M', key: (r) => r.tiers[4] },
                      { header: '5M~10M', key: (r) => r.tiers[5] },
                      { header: '> 10M', key: (r) => r.tiers[6] },
                    ]
                  : [
                      { header: 'Cấp Tổ Chức', key: (r) => `${'  '.repeat(r.level)}${r.name}` },
                      { header: 'Tổng Kệ', key: (r) => r.total },
                      { header: '# Kệ Có Mua', key: (r) => r.active },
                      { header: '# Kệ Chưa Mua', key: (r) => r.zero },
                      { header: '% Kệ Có Mua', key: (r) => Number(r.actRate.toFixed(1)) },
                      { header: 'DS Hàng Khô', key: (r) => r.mainSo },
                      { header: 'DS 03. Snack', key: (r) => r.subSo },
                      { header: 'Năng Suất TB', key: (r) => r.vpo },
                      { header: 'Kệ 3T Ko Mua', key: (r) => r.l3mZero },
                      { header: '% Kệ 3T Ko Mua', key: (r) => Number(r.l3mZeroRate.toFixed(1)) },
                      { header: 'TB 3T Khô', key: (r) => r.l3mAvg },
                      { header: '= 0', key: (r) => r.tiers[0] },
                      { header: '< 200k', key: (r) => r.tiers[1] },
                      { header: '200k~500k', key: (r) => r.tiers[2] },
                      { header: '500k~1M', key: (r) => r.tiers[3] },
                      { header: '1M~2M', key: (r) => r.tiers[4] },
                      { header: '> 2M', key: (r) => r.tiers[5] },
                    ]
              }
              label="Xuất Excel Cây Phân Cấp"
            />
          </div>
        </div>

        <div className="table-scroll-container overflow-x-auto max-h-[600px]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-800">
                <th rowSpan={2} className="px-3 py-2 text-left font-bold min-w-[240px]">
                  Cấp Tổ Chức / Quản Lý
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center font-bold min-w-[70px]">
                  {tab === 'freezer' ? 'Tổng Tủ' : 'Tổng Kệ'}
                </th>
                <th colSpan={6} className="px-2 py-1.5 text-center font-bold bg-sky-100/90 text-sky-950 border-l border-sky-300">
                  CHỈ SỐ THÁNG HIỆN TẠI (1 THÁNG)
                </th>
                <th colSpan={3} className="px-2 py-1.5 text-center font-bold bg-amber-100/90 text-amber-950 border-l border-amber-300">
                  CHỈ SỐ 3 THÁNG GẦN NHẤT (L3M)
                </th>
                <th colSpan={tab === 'freezer' ? 7 : 6} className="px-2 py-1.5 text-center font-bold bg-purple-100/90 text-purple-950 border-l border-purple-300">
                  {tab === 'freezer' ? 'SỐ LƯỢNG TỦ THEO TỪNG MỨC DOANH SỐ ĐÔNG' : 'SỐ LƯỢNG KỆ THEO TỪNG MỨC DOANH SỐ KHÔ'}
                </th>
              </tr>
              <tr className="border-b border-slate-200 text-slate-700 text-[10px]">
                {/* 1 Tháng */}
                <th className="px-2 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[85px]">
                  {tab === 'freezer' ? '# Tủ Có Mua' : '# Kệ Có Mua'}
                </th>
                <th className="px-2 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[85px]">
                  {tab === 'freezer' ? '# Tủ 0 Mua' : '# Kệ 0 Mua'}
                </th>
                <th className="px-2 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[85px]">
                  % Có Mua
                </th>
                <th className="px-2.5 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[95px]">
                  {tab === 'freezer' ? 'DS Hàng Đông' : 'DS Hàng Khô'}
                </th>
                <th className="px-2.5 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[95px]">
                  {tab === 'freezer' ? 'Tổng Sell-out' : 'DS 03. Snack'}
                </th>
                <th className="px-2.5 py-1.5 text-center font-bold text-sky-950 bg-sky-50/90 border-l border-sky-200 min-w-[105px]">
                  Năng Suất TB
                </th>
                {/* L3M */}
                <th className="px-2 py-1.5 text-center font-bold text-rose-800 bg-rose-50/80 border-l border-rose-200 min-w-[85px]">
                  {tab === 'freezer' ? 'Tủ 3T Ko Mua' : 'Kệ 3T Ko Mua'}
                </th>
                <th className="px-2 py-1.5 text-center font-bold text-rose-900 bg-rose-50/80 border-l border-rose-200 min-w-[85px]">
                  % 3T Ko Mua
                </th>
                <th className="px-2.5 py-1.5 text-center font-bold text-amber-950 bg-amber-50/90 border-l border-amber-200 min-w-[95px]">
                  {tab === 'freezer' ? 'TB 3T Đông' : 'TB 3T Khô'}
                </th>
                {/* Tiers */}
                {tab === 'freezer' ? (
                  <>
                    <th className="px-1.5 py-1.5 text-center font-bold text-rose-700 bg-rose-50/90 border-l border-rose-200 min-w-[60px]">= 0</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-orange-700 bg-orange-50/90 border-l border-orange-200 min-w-[65px]">&lt; 500k</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-amber-800 bg-amber-50/90 border-l border-amber-200 min-w-[75px]">500k~1.5M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-cyan-800 bg-cyan-50/90 border-l border-cyan-200 min-w-[75px]">1.5M~3M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-blue-800 bg-blue-50/90 border-l border-blue-200 min-w-[70px]">3M~5M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-emerald-800 bg-emerald-50/90 border-l border-emerald-200 min-w-[70px]">5M~10M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-purple-800 bg-purple-50/90 border-l border-r border-purple-200 min-w-[65px]">&gt; 10M</th>
                  </>
                ) : (
                  <>
                    <th className="px-1.5 py-1.5 text-center font-bold text-rose-700 bg-rose-50/90 border-l border-rose-200 min-w-[60px]">= 0</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-orange-700 bg-orange-50/90 border-l border-orange-200 min-w-[65px]">&lt; 200k</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-amber-800 bg-amber-50/90 border-l border-amber-200 min-w-[75px]">200k~500k</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-cyan-800 bg-cyan-50/90 border-l border-cyan-200 min-w-[75px]">500k~1M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-blue-800 bg-blue-50/90 border-l border-blue-200 min-w-[75px]">1M~2M</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-emerald-800 bg-emerald-50/90 border-l border-r border-emerald-200 min-w-[65px]">&gt; 2M</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {flatTreeRows.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'freezer' ? 18 : 17} className="text-center py-8 text-slate-400 font-semibold">
                    Không tìm thấy dữ liệu cây phân cấp phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                flatTreeRows.map((n) => {
                  const isExpanded = Boolean(openNodes[n.id] || treeSearch.trim().length > 0);
                  const hasChildren = n.children.length > 0;
                  const indentPx = n.level * 18;
                  const badgeIcon =
                    n.level === 0 ? '🇻🇳' :
                    n.level === 1 ? '🏛️' :
                    n.level === 2 ? '📍' :
                    n.level === 3 ? '🏢' :
                    n.level === 4 ? '🏪' : '🛵';

                  let rowBg = 'bg-white hover:bg-slate-50 text-slate-800 border-b border-slate-100';
                  let fontClass = 'font-normal text-xs';
                  if (n.level === 0) {
                    rowBg = 'bg-indigo-100/95 hover:bg-indigo-200/90 text-indigo-950 border-y-2 border-indigo-400';
                    fontClass = 'font-black text-xs uppercase tracking-wider';
                  } else if (n.level === 1) {
                    rowBg = 'bg-blue-100/90 hover:bg-blue-200/80 text-blue-950 border-b-2 border-blue-300';
                    fontClass = 'font-extrabold text-xs';
                  } else if (n.level === 2) {
                    rowBg = 'bg-indigo-50/80 hover:bg-indigo-100/70 text-indigo-950 border-b border-indigo-100';
                    fontClass = 'font-bold text-xs';
                  } else if (n.level === 3) {
                    rowBg = 'bg-amber-50 hover:bg-amber-100/80 text-amber-950 border-l-4 border-l-amber-500 border-b border-amber-200';
                    fontClass = 'font-bold text-xs';
                  } else if (n.level === 4) {
                    rowBg = 'bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-950 border-b border-emerald-100';
                    fontClass = 'font-semibold text-xs';
                  }

                  const actBadgeColor =
                    n.actRate >= 80
                      ? 'bg-emerald-600 text-white'
                      : n.actRate >= 50
                        ? 'bg-amber-500 text-amber-950'
                        : 'bg-rose-600 text-white';

                  const l3mBadgeColor =
                    n.l3mZeroRate === 0
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : n.l3mZeroRate <= 15
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300';

                  return (
                    <tr
                      key={n.id}
                      onClick={() => hasChildren && toggleNode(n.id)}
                      className={`${rowBg} transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
                    >
                      <td className={`px-3 py-2 ${fontClass}`} style={{ paddingLeft: `${indentPx + 12}px` }}>
                        <span className="inline-flex items-center justify-center w-4 text-slate-400">
                          {hasChildren ? (
                            isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )
                          ) : null}
                        </span>
                        <span className="mr-1">{badgeIcon}</span>
                        <span className="truncate">{n.name}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono-num font-bold text-blue-700">
                        {n.total.toLocaleString('vi-VN')}
                      </td>
                      {/* 1 Tháng */}
                      <td className="px-2 py-2 text-right font-mono-num font-bold text-emerald-700 border-l border-sky-100">
                        {n.active.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2 py-2 text-right font-mono-num font-bold border-l border-sky-100">
                        {n.zero > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                            {n.zero.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono-num border-l border-sky-100">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black min-w-[42px] text-center shadow-2xs ${actBadgeColor}`}>
                          {n.actRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono-num font-bold text-purple-700 border-l border-sky-100">
                        {formatPosmShort(n.mainSo)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono-num font-semibold text-slate-700 border-l border-sky-100">
                        {formatPosmShort(n.subSo)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono-num font-black text-sky-950 bg-sky-50/70 border-l border-sky-200/70">
                        {formatPosmShort(n.vpo)}
                      </td>
                      {/* L3M */}
                      <td className="px-2 py-2 text-right font-mono-num font-bold bg-rose-50/40 border-l border-rose-200/70">
                        {n.l3mZero > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                            {n.l3mZero.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono-num bg-rose-50/20 border-l border-rose-100/60">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[42px] text-center ${l3mBadgeColor}`}>
                          {n.l3mZeroRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono-num font-bold text-amber-900 bg-amber-50/60 border-l border-amber-200/70 border-r border-amber-200/80">
                        {formatPosmShort(n.l3mAvg)}
                      </td>
                      {/* Tiers */}
                      {n.tiers.map((cnt, idx) => (
                        <td
                          key={idx}
                          className="px-1.5 py-2 text-right font-mono-num border-l border-purple-100/70"
                        >
                          {cnt > 0 ? (
                            <span className="font-bold text-purple-900">{cnt.toLocaleString('vi-VN')}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Table */}
      <div className="material-card p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[#004B91]" />
            <h3 className="text-sm font-bold text-slate-800">
              {tab === 'freezer' ? 'Danh Sách Chi Tiết Điểm Đặt Tủ Đông Kênh GT' : 'Danh Sách Chi Tiết Điểm Đặt Standee (Kệ Sắt) Kênh GT'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {activeRows.length.toLocaleString('vi-VN')} thiết bị được tìm thấy
          </span>
        </div>
        <DataTable
          data={activeRows}
          columns={columns}
          searchPlaceholder="Tìm theo mã KH, tên điểm bán, NPP, QR/Seri..."
          searchFilter={(r, q) =>
            String(r.c_code || '').toLowerCase().includes(q) ||
            String(r.c_name || '').toLowerCase().includes(q) ||
            String(r.npp_name || '').toLowerCase().includes(q) ||
            String(r.qr || '').toLowerCase().includes(q) ||
            String(r.serial || '').toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}
