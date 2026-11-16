import { Award, Filter, Flame, Snowflake, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatNumber, formatPercent } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtNvbhRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  npp_name?: string;
  nvbh_name?: string;
  office?: string;
  storage?: string;
  sellout_val?: number;
  aso_count?: number;
  order_count?: number;
  order_sku_cnt?: number;
  aso_sku_cnt?: number;
}

interface GtNvbhMcpRow extends GeoRecord {
  month?: string;
  npp_code?: string;
  nvbh_name?: string;
  mcp_count?: number;
}

interface GtActiveRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  emp_code?: string;
  emp_name?: string;
  office?: string;
  is_active_target?: number | string;
  is_active_in_month?: number | string;
}

interface GtSubchanRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sub_chan?: string;
  total_so?: number;
  cold_so?: number;
  dry_so?: number;
  aso_count?: number;
  nv_count?: number;
}

interface SalesmanAgg {
  stt: number;
  nvbh: string;
  nppName: string;
  nppCode: string;
  office: string;
  vung: string;
  gsbh: string;
  sellout: number;
  coldSellout: number;
  drySellout: number;
  coldPct: number;
  aso: number;
  coldAso: number;
  dryAso: number;
  orders: number;
  mcp: number;
  skuCnt: number;
  strikeRate: number;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
}

const FIXED_SUB_CHANNELS = ['SDL', 'NT', 'THTT', 'CHTC', 'HRC', 'CS_LOCAL', 'THC'];

export function GtProductivityPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) =>
    Boolean(s.loading.GT_NVBH_M || s.loading.GT_NVBH_MCP_M || s.loading.GT_SALESMAN_ACTIVE || s.loading.GT_SUBCHAN_M),
  );

  const [nvbhRows, setNvbhRows] = useState<GtNvbhRow[]>([]);
  const [mcpRows, setMcpRows] = useState<GtNvbhMcpRow[]>([]);
  const [activeRows, setActiveRows] = useState<GtActiveRow[]>([]);
  const [subchanRows, setSubchanRows] = useState<GtSubchanRow[]>([]);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'T1' | 'T2' | 'T3' | 'T4'>('ALL');

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('GT_NVBH_M', user),
      loadPayload('GT_NVBH_MCP_M', user),
      loadPayload('GT_SALESMAN_ACTIVE', user),
      loadPayload('GT_SUBCHAN_M', user),
    ]).then(([nvbh, mcp, act, sub]) => {
      if (!active) return;
      if (Array.isArray(nvbh)) setNvbhRows(nvbh as GtNvbhRow[]);
      if (Array.isArray(mcp)) setMcpRows(mcp as GtNvbhMcpRow[]);
      if (Array.isArray(act)) setActiveRows(act as GtActiveRow[]);
      if (Array.isArray(sub)) setSubchanRows(sub as GtSubchanRow[]);
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

  // Office lookup map from GT_SALESMAN_ACTIVE
  const empOfficeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of activeRows) {
      if (r.office) {
        if (r.emp_name) map[r.emp_name] = r.office;
        if (r.emp_code) map[r.emp_code] = r.office;
      }
    }
    return map;
  }, [activeRows]);

  // MCP lookup map
  const mcpMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mcpRows) {
      if (!matchGeo(m)) continue;
      const key = `${m.npp_code || ''}::${m.nvbh_name || ''}`;
      map.set(key, Math.max(map.get(key) || 0, Number(m.mcp_count || 0)));
    }
    return map;
  }, [mcpRows, matchGeo]);

  // Aggregated Salesman Data for the selected period
  const salesmanData = useMemo(() => {
    const agg = new Map<string, SalesmanAgg>();

    for (const r of nvbhRows) {
      if (String(r.year) !== year || !matchMonthNum(r.month_num, selectedMonths)) continue;
      if (!matchGeo(r)) continue;

      const nvbh = r.nvbh_name || 'Chưa phân công NVBH';
      const nppCode = r.npp_code || '';
      const key = `${nppCode}::${nvbh}`;

      const office = r.office || empOfficeMap[nvbh] || '';
      const cur = agg.get(key) || {
        stt: 0,
        nvbh,
        nppName: r.npp_name || nppCode || 'Chưa gán NPP',
        nppCode,
        office,
        vung: r.vung || 'Khác',
        gsbh: r.gsbh || '',
        sellout: 0,
        coldSellout: 0,
        drySellout: 0,
        coldPct: 0,
        aso: 0,
        coldAso: 0,
        dryAso: 0,
        orders: 0,
        mcp: mcpMap.get(key) || 0,
        skuCnt: 0,
        strikeRate: 0,
        tier: 'T4',
      };

      const so = Number(r.sellout_val || 0);
      const aso = Number(r.aso_count || 0);
      const st = String(r.storage || '').toLowerCase();
      const isCold =
        st.includes('đông') ||
        st.includes('cold') ||
        st.includes('lạnh') ||
        st.includes('chilled') ||
        st.includes('frozen');

      cur.sellout += so;
      if (isCold) {
        cur.coldSellout += so;
        cur.coldAso += aso;
      } else {
        cur.drySellout += so;
        cur.dryAso += aso;
      }
      cur.aso += aso;
      cur.orders += Number(r.order_count || 0);
      cur.skuCnt = Math.max(cur.skuCnt, Number(r.order_sku_cnt || 0));
      if (office && !cur.office) cur.office = office;

      agg.set(key, cur);
    }

    const list = Array.from(agg.values()).map((s) => {
      const strikeRate = s.mcp > 0 ? (s.aso / s.mcp) * 100 : 0;
      const coldPct = s.sellout > 0 ? (s.coldSellout / s.sellout) * 100 : 0;
      let tier: 'T1' | 'T2' | 'T3' | 'T4' = 'T4';
      if (s.sellout >= 50e6) tier = 'T1';
      else if (s.sellout >= 30e6) tier = 'T2';
      else if (s.sellout >= 15e6) tier = 'T3';

      return {
        ...s,
        strikeRate,
        coldPct,
        tier,
      };
    });

    list.sort((a, b) => b.sellout - a.sellout);
    list.forEach((s, idx) => {
      s.stt = idx + 1;
    });
    return list;
  }, [nvbhRows, year, selectedMonths, matchGeo, empOfficeMap, mcpMap]);

  // Filtered rows for the matrix table based on tierFilter
  const filteredSalesmanRows = useMemo(() => {
    if (tierFilter === 'ALL') return salesmanData;
    return salesmanData.filter((s) => s.tier === tierFilter);
  }, [salesmanData, tierFilter]);

  // 5 KPI Cards for the selected period
  const kpiMetrics = useMemo(() => {
    let totalGtSellout = 0;
    let totalColdSellout = 0;
    let totalDrySellout = 0;
    let totalAso = 0;
    let coldAso = 0;
    let dryAso = 0;

    for (const s of salesmanData) {
      totalGtSellout += s.sellout;
      totalColdSellout += s.coldSellout;
      totalDrySellout += s.drySellout;
      totalAso += s.aso;
      coldAso += s.coldAso;
      dryAso += s.dryAso;
    }

    // Target NV & Active NV Sets in the selected months
    const activeTargetNvSet = new Set<string>();
    const activeInMonthNvSet = new Set<string>();

    for (const d of activeRows) {
      if (String(d.year) !== year || !matchMonthNum(d.month_num, selectedMonths) || !matchGeo(d)) continue;
      const emp = String(d.emp_code || d.emp_name || '');
      if (!emp) continue;
      if (Number(d.is_active_target) === 1 || String(d.is_active_target) === 'true') {
        activeTargetNvSet.add(emp);
      }
      if (Number(d.is_active_in_month) === 1 || String(d.is_active_in_month) === 'true') {
        activeInMonthNvSet.add(emp);
      }
    }

    const activeNvbhCount = activeTargetNvSet.size;
    const actualActiveNvCount = activeInMonthNvSet.size;

    const avgSalesPerNvbh = activeNvbhCount > 0 ? totalGtSellout / activeNvbhCount : 0;
    const avgColdPerNvbh = activeNvbhCount > 0 ? totalColdSellout / activeNvbhCount : 0;
    const avgDryPerNvbh = activeNvbhCount > 0 ? totalDrySellout / activeNvbhCount : 0;

    const coldShare = totalGtSellout > 0 ? (totalColdSellout / totalGtSellout) * 100 : 0;
    const dryShare = totalGtSellout > 0 ? (totalDrySellout / totalGtSellout) * 100 : 0;
    const activeRate = activeNvbhCount > 0 ? (actualActiveNvCount / activeNvbhCount) * 100 : 0;

    return {
      totalGtSellout,
      totalColdSellout,
      totalDrySellout,
      totalAso,
      coldAso,
      dryAso,
      activeNvbhCount,
      actualActiveNvCount,
      avgSalesPerNvbh,
      avgColdPerNvbh,
      avgDryPerNvbh,
      coldShare,
      dryShare,
      activeRate,
    };
  }, [salesmanData, activeRows, year, selectedMonths, matchGeo]);

  // BIỂU ĐỒ 1: NĂNG SUẤT BQ / NV CÓ TARGET (12 Tháng 2026 / 2025)
  const monthlyTrendOption = useMemo(() => {
    const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const targetTotalPerNvSeries: (number | null)[] = [];
    const targetColdPerNvSeries: (number | null)[] = [];
    const targetDryPerNvSeries: (number | null)[] = [];
    const targetNvCountSeries: number[] = [];
    const coldPctSeries: (number | null)[] = [];

    for (let i = 1; i <= 12; i++) {
      const mStr = String(i).padStart(2, '0');
      let mTotalSo = 0;
      let mColdSo = 0;
      let mDrySo = 0;
      let hasSoData = false;

      for (const r of nvbhRows) {
        if (String(r.year) !== year || String(r.month_num).padStart(2, '0') !== mStr || !matchGeo(r)) continue;
        hasSoData = true;
        const so = Number(r.sellout_val) || 0;
        const st = String(r.storage || '').toLowerCase();
        const isCold =
          st.includes('đông') ||
          st.includes('cold') ||
          st.includes('lạnh') ||
          st.includes('chilled') ||
          st.includes('frozen');
        mTotalSo += so;
        if (isCold) mColdSo += so;
        else mDrySo += so;
      }

      const mTargetNvSet = new Set<string>();
      for (const d of activeRows) {
        if (String(d.year) !== year || String(d.month_num).padStart(2, '0') !== mStr || !matchGeo(d)) continue;
        const emp = String(d.emp_code || d.emp_name || '');
        if (!emp) continue;
        if (Number(d.is_active_target) === 1 || String(d.is_active_target) === 'true') {
          mTargetNvSet.add(emp);
        }
      }

      const mTargetNvCount = mTargetNvSet.size;
      targetNvCountSeries.push(mTargetNvCount);

      const coldPct = mTotalSo > 0 ? Number(((mColdSo / mTotalSo) * 100).toFixed(1)) : 0;
      coldPctSeries.push(hasSoData ? coldPct : null);

      if (!hasSoData && mTargetNvCount === 0) {
        targetTotalPerNvSeries.push(null);
        targetColdPerNvSeries.push(null);
        targetDryPerNvSeries.push(null);
      } else {
        targetTotalPerNvSeries.push(
          mTargetNvCount > 0 ? Number((mTotalSo / mTargetNvCount / 1e6).toFixed(1)) : 0,
        );
        targetColdPerNvSeries.push(
          mTargetNvCount > 0 ? Number((mColdSo / mTargetNvCount / 1e6).toFixed(1)) : 0,
        );
        targetDryPerNvSeries.push(
          mTargetNvCount > 0 ? Number((mDrySo / mTargetNvCount / 1e6).toFixed(1)) : 0,
        );
      }
    }

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#38BDF8',
        borderWidth: 1,
        textStyle: { color: '#FFFFFF', fontSize: 11 },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? (params as { dataIndex: number; seriesName: string; value: number | null; marker: string }[]) : [];
          if (list.length === 0) return '';
          const idx = list[0].dataIndex;
          const mLabel = monthLabels[idx];
          const nvCnt = targetNvCountSeries[idx] || 0;
          let res = `<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-sky-300 flex justify-between gap-4">
            <span>${mLabel} / Năm ${year}</span>
            <span class="text-indigo-300 font-mono-num font-bold">${formatNumber(nvCnt)} NV có Target</span>
          </div>`;
          list.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              const unit = p.seriesName.includes('%') ? '%' : ' Triệu/NV';
              res += `<div class="flex justify-between gap-4 py-0.5">
                <span>${p.marker} ${p.seriesName}:</span>
                <strong class="font-mono-num text-white">${formatNumber(p.value)}${unit}</strong>
              </div>`;
            }
          });
          return res;
        },
      },
      legend: {
        data: ['Total Sell-out / NV', 'Sell-out Hàng Đông / NV', 'Sell-out Hàng Khô / NV', '% Tỷ Lệ Hàng Đông'],
        top: 6,
        textStyle: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' as const },
      },
      grid: { left: 48, right: 48, top: 48, bottom: 28 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels,
        axisLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' as const },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Tr/NV',
          nameTextStyle: { color: '#CBD5E1', fontSize: 9 },
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: '%',
          nameTextStyle: { color: '#fde047', fontSize: 9 },
          axisLabel: { color: '#fde047', fontSize: 10, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Total Sell-out / NV',
          type: 'bar' as const,
          data: targetTotalPerNvSeries,
          itemStyle: { color: '#818CF8', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#fff',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: 'Sell-out Hàng Đông / NV',
          type: 'bar' as const,
          data: targetColdPerNvSeries,
          itemStyle: { color: '#38BDF8', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#BAE6FD',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: 'Sell-out Hàng Khô / NV',
          type: 'bar' as const,
          data: targetDryPerNvSeries,
          itemStyle: { color: '#FBBF24', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#FEF3C7',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: '% Tỷ Lệ Hàng Đông',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: coldPctSeries,
          itemStyle: { color: '#34D399' },
          lineStyle: { width: 2.5, color: '#34D399' },
          label: {
            show: true,
            position: 'top' as const,
            color: '#D1FAE5',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}%` : '',
          },
        },
      ],
    };
  }, [nvbhRows, activeRows, year, matchGeo]);

  // BIỂU ĐỒ 2: NĂNG SUẤT BQ / NV ACTIVE BÁN HÀNG
  const activeTrendOption = useMemo(() => {
    const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const activeTotalPerNvSeries: (number | null)[] = [];
    const activeColdPerNvSeries: (number | null)[] = [];
    const activeDryPerNvSeries: (number | null)[] = [];
    const activeNvCountSeries: number[] = [];
    const coldPctSeries: (number | null)[] = [];

    for (let i = 1; i <= 12; i++) {
      const mStr = String(i).padStart(2, '0');
      let mTotalSo = 0;
      let mColdSo = 0;
      let mDrySo = 0;
      let hasSoData = false;

      for (const r of nvbhRows) {
        if (String(r.year) !== year || String(r.month_num).padStart(2, '0') !== mStr || !matchGeo(r)) continue;
        hasSoData = true;
        const so = Number(r.sellout_val) || 0;
        const st = String(r.storage || '').toLowerCase();
        const isCold =
          st.includes('đông') ||
          st.includes('cold') ||
          st.includes('lạnh') ||
          st.includes('chilled') ||
          st.includes('frozen');
        mTotalSo += so;
        if (isCold) mColdSo += so;
        else mDrySo += so;
      }

      const mActiveInMonthNvSet = new Set<string>();
      for (const d of activeRows) {
        if (String(d.year) !== year || String(d.month_num).padStart(2, '0') !== mStr || !matchGeo(d)) continue;
        const emp = String(d.emp_code || d.emp_name || '');
        if (!emp) continue;
        if (Number(d.is_active_in_month) === 1 || String(d.is_active_in_month) === 'true') {
          mActiveInMonthNvSet.add(emp);
        }
      }

      const mActiveNvCount = mActiveInMonthNvSet.size;
      activeNvCountSeries.push(mActiveNvCount);

      const coldPct = mTotalSo > 0 ? Number(((mColdSo / mTotalSo) * 100).toFixed(1)) : 0;
      coldPctSeries.push(hasSoData ? coldPct : null);

      if (!hasSoData && mActiveNvCount === 0) {
        activeTotalPerNvSeries.push(null);
        activeColdPerNvSeries.push(null);
        activeDryPerNvSeries.push(null);
      } else {
        activeTotalPerNvSeries.push(
          mActiveNvCount > 0 ? Number((mTotalSo / mActiveNvCount / 1e6).toFixed(1)) : 0,
        );
        activeColdPerNvSeries.push(
          mActiveNvCount > 0 ? Number((mColdSo / mActiveNvCount / 1e6).toFixed(1)) : 0,
        );
        activeDryPerNvSeries.push(
          mActiveNvCount > 0 ? Number((mDrySo / mActiveNvCount / 1e6).toFixed(1)) : 0,
        );
      }
    }

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#C084FC',
        borderWidth: 1,
        textStyle: { color: '#FFFFFF', fontSize: 11 },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? (params as { dataIndex: number; seriesName: string; value: number | null; marker: string }[]) : [];
          if (list.length === 0) return '';
          const idx = list[0].dataIndex;
          const mLabel = monthLabels[idx];
          const nvCnt = activeNvCountSeries[idx] || 0;
          let res = `<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-purple-300 flex justify-between gap-4">
            <span>${mLabel} / Năm ${year}</span>
            <span class="text-emerald-300 font-mono-num font-bold">${formatNumber(nvCnt)} NV Active</span>
          </div>`;
          list.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              const unit = p.seriesName.includes('%') ? '%' : ' Triệu/NV';
              res += `<div class="flex justify-between gap-4 py-0.5">
                <span>${p.marker} ${p.seriesName}:</span>
                <strong class="font-mono-num text-white">${formatNumber(p.value)}${unit}</strong>
              </div>`;
            }
          });
          return res;
        },
      },
      legend: {
        data: ['Total Sell-out / NV Active', 'Sell-out Hàng Đông / NV', 'Sell-out Hàng Khô / NV', '% Tỷ Lệ Hàng Đông'],
        top: 6,
        textStyle: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' as const },
      },
      grid: { left: 48, right: 48, top: 48, bottom: 28 },
      xAxis: {
        type: 'category' as const,
        data: monthLabels,
        axisLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' as const },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Tr/NV',
          nameTextStyle: { color: '#CBD5E1', fontSize: 9 },
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: '%',
          nameTextStyle: { color: '#fde047', fontSize: 9 },
          axisLabel: { color: '#fde047', fontSize: 10, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Total Sell-out / NV Active',
          type: 'bar' as const,
          data: activeTotalPerNvSeries,
          itemStyle: { color: '#A855F7', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#fff',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: 'Sell-out Hàng Đông / NV',
          type: 'bar' as const,
          data: activeColdPerNvSeries,
          itemStyle: { color: '#0EA5E9', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#BAE6FD',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: 'Sell-out Hàng Khô / NV',
          type: 'bar' as const,
          data: activeDryPerNvSeries,
          itemStyle: { color: '#F59E0B', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#FEF3C7',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}` : '',
          },
        },
        {
          name: '% Tỷ Lệ Hàng Đông',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: coldPctSeries,
          itemStyle: { color: '#34D399' },
          lineStyle: { width: 2.5, color: '#34D399' },
          label: {
            show: true,
            position: 'top' as const,
            color: '#D1FAE5',
            fontSize: 8.5,
            formatter: (p: { value?: unknown }) =>
              p.value !== null && Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}%` : '',
          },
        },
      ],
    };
  }, [nvbhRows, activeRows, year, matchGeo]);

  // BIỂU ĐỒ 3: NĂNG SUẤT BÁN HÀNG THEO SUB-CHANNEL GT
  const subchanOption = useMemo(() => {
    const subChanMap: Record<string, { total_so: number; cold_so: number; dry_so: number; aso: number; nv: number }> =
      {};

    for (const r of subchanRows) {
      if (String(r.year) !== year || !matchMonthNum(r.month_num, selectedMonths) || !matchGeo(r)) continue;
      const k = r.sub_chan || 'Khác';
      if (!subChanMap[k]) subChanMap[k] = { total_so: 0, cold_so: 0, dry_so: 0, aso: 0, nv: 0 };
      subChanMap[k].total_so += Number(r.total_so) || 0;
      subChanMap[k].cold_so += Number(r.cold_so) || 0;
      subChanMap[k].dry_so += Number(r.dry_so) || 0;
      subChanMap[k].aso += Number(r.aso_count) || 0;
      subChanMap[k].nv += Number(r.nv_count) || 0;
    }

    const extraChannels = Object.keys(subChanMap).filter((k) => !FIXED_SUB_CHANNELS.includes(k) && k !== 'Khác');
    const channelNames = [...FIXED_SUB_CHANNELS, ...extraChannels];

    const coldPerNvData = channelNames.map((k) => {
      const itm = subChanMap[k] || { cold_so: 0, nv: 0 };
      return itm.nv > 0 ? Number((itm.cold_so / itm.nv / 1e6).toFixed(1)) : 0;
    });

    const dryPerNvData = channelNames.map((k) => {
      const itm = subChanMap[k] || { dry_so: 0, nv: 0 };
      return itm.nv > 0 ? Number((itm.dry_so / itm.nv / 1e6).toFixed(1)) : 0;
    });

    const avgAsoData = channelNames.map((k) => {
      const itm = subChanMap[k] || { aso: 0, nv: 0 };
      return itm.nv > 0 ? Number((itm.aso / itm.nv).toFixed(1)) : 0;
    });

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#38BDF8',
        borderWidth: 1,
        textStyle: { color: '#FFFFFF', fontSize: 11 },
      },
      legend: {
        data: ['Đông / NV', 'Khô / NV', 'ASO TB / NV'],
        top: 6,
        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' as const },
      },
      grid: { left: 48, right: 48, top: 48, bottom: 36 },
      xAxis: {
        type: 'category' as const,
        data: channelNames,
        axisLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' as const },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Tr/NV',
          nameTextStyle: { color: '#CBD5E1', fontSize: 9 },
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          name: 'ASO/NV',
          nameTextStyle: { color: '#34D399', fontSize: 9 },
          axisLabel: { color: '#34D399', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Đông / NV',
          type: 'bar' as const,
          stack: 'prod_sub',
          data: coldPerNvData,
          itemStyle: { color: '#38BDF8' },
          label: {
            show: true,
            position: 'inside' as const,
            color: '#fff',
            fontSize: 9,
            formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? Number(p.value).toFixed(1) : ''),
          },
        },
        {
          name: 'Khô / NV',
          type: 'bar' as const,
          stack: 'prod_sub',
          data: dryPerNvData,
          itemStyle: { color: '#F59E0B', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top' as const,
            color: '#fff',
            fontSize: 9,
            formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? Number(p.value).toFixed(1) : ''),
          },
        },
        {
          name: 'ASO TB / NV',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: avgAsoData,
          itemStyle: { color: '#34D399' },
          lineStyle: { width: 2.5, color: '#34D399' },
          label: { show: true, position: 'top' as const, color: '#A7F3D0', fontSize: 9.5, fontWeight: 'bold' as const },
        },
      ],
    };
  }, [subchanRows, year, selectedMonths, matchGeo]);

  // BIỂU ĐỒ 4: TOP 15 NVBH DOANH THU CAO NHẤT (KÈM OFFICE)
  const topNvbhOption = useMemo(() => {
    const top15 = salesmanData.slice(0, 15).reverse();

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#C084FC',
        borderWidth: 1,
        textStyle: { color: '#FFFFFF', fontSize: 11 },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? (params as { dataIndex: number; seriesName: string; value: number }[]) : [];
          if (list.length === 0) return '';
          const idx = list[0].dataIndex;
          const rep = top15[idx] || {};
          const offTxt = rep.office ? ` (${rep.office})` : '';

          let res = `<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-purple-300 flex items-center justify-between gap-3">
            <span>${rep.nvbh}${offTxt}</span>
          </div>`;

          let total = 0;
          list.forEach((p) => {
            total += p.value || 0;
            res += `<div class="flex justify-between gap-4 py-0.5">
              <span>${p.seriesName}:</span>
              <strong class="font-mono-num text-white">${formatNumber(p.value)} M</strong>
            </div>`;
          });

          res += `<div class="border-t border-slate-700 pt-1 mt-1 text-yellow-300 flex justify-between gap-4 font-bold">
            <span>Tổng Sell-out:</span>
            <strong>${total.toFixed(1)} M</strong>
          </div>`;

          if (rep.aso || rep.orders) {
            res += `<div class="text-[10px] text-slate-300 mt-1 pt-1 border-t border-slate-800">
              ASO: ${formatNumber(rep.aso)} KH (Đông: ${formatNumber(rep.coldAso)}, Khô: ${formatNumber(rep.dryAso)}) | Đơn: ${formatNumber(rep.orders)}
            </div>`;
          }

          if (rep.nppName) {
            res += `<div class="text-[10px] text-slate-400 mt-0.5">NPP: ${rep.nppName} | Vùng: ${rep.vung}</div>`;
          }

          return res;
        },
      },
      legend: {
        data: ['Hàng Đông', 'Hàng Khô'],
        top: 6,
        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' as const },
      },
      grid: { left: 160, right: 48, top: 40, bottom: 24, containLabel: true },
      xAxis: {
        type: 'value' as const,
        axisLabel: { color: '#FFFFFF', fontSize: 9, formatter: '{value}M' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: top15.map((n) => (n.office ? `${n.nvbh} (${n.office})` : n.nvbh)),
        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      },
      series: [
        {
          name: 'Hàng Đông',
          type: 'bar' as const,
          stack: 'top_nv',
          data: top15.map((n) => Number((n.coldSellout / 1e6).toFixed(1))),
          itemStyle: { color: '#38BDF8' },
          label: {
            show: true,
            position: 'inside' as const,
            color: '#fff',
            fontSize: 9,
            formatter: (p: { value?: unknown }) =>
              Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}M` : '',
          },
        },
        {
          name: 'Hàng Khô',
          type: 'bar' as const,
          stack: 'top_nv',
          data: top15.map((n) => Number((n.drySellout / 1e6).toFixed(1))),
          itemStyle: { color: '#FBBF24', borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right' as const,
            color: '#fff',
            fontSize: 9,
            formatter: (p: { value?: unknown }) =>
              Number(p.value || 0) > 0 ? `${Number(p.value).toFixed(0)}M` : '',
          },
        },
      ],
    };
  }, [salesmanData]);

  // Matrix table columns
  const columns: ColumnDef<SalesmanAgg>[] = [
    {
      key: 'stt',
      header: 'STT',
      align: 'center',
      sortValue: (r) => r.stt,
      render: (r) => <span className="font-mono text-slate-400">{r.stt}</span>,
    },
    {
      key: 'nvbh',
      header: 'Nhân viên bán hàng',
      sortValue: (r) => r.nvbh,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900">{r.nvbh}</span>
          {r.office && (
            <span className="ml-1.5 inline-block rounded bg-purple-50 px-1.5 py-0.2 text-[10px] font-bold text-purple-700 border border-purple-200">
              {r.office}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'npp',
      header: 'Nhà phân phối',
      sortValue: (r) => r.nppName,
      render: (r) => <span className="text-slate-700 text-xs">{r.nppName}</span>,
    },
    {
      key: 'vung',
      header: 'Vùng / GSBH',
      sortValue: (r) => r.vung,
      render: (r) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{r.vung}</span>
          {r.gsbh && <span className="block text-[10.5px] text-slate-400">{r.gsbh}</span>}
        </div>
      ),
    },
    {
      key: 'sellout',
      header: 'Tổng Sell-out',
      align: 'right',
      sortValue: (r) => r.sellout,
      render: (r) => (
        <div>
          <span className="font-mono-num font-bold text-slate-900 block">{formatCurrencyVnd(r.sellout)}</span>
          <span className="text-[10px] text-purple-700 font-mono-num">{(r.sellout / 1e6).toFixed(1)} M</span>
        </div>
      ),
    },
    {
      key: 'cold',
      header: 'Sell-out Đông',
      align: 'right',
      sortValue: (r) => r.coldSellout,
      render: (r) => (
        <span className="font-mono-num text-sky-700 font-semibold">
          {(r.coldSellout / 1e6).toFixed(1)} M
        </span>
      ),
    },
    {
      key: 'dry',
      header: 'Sell-out Khô',
      align: 'right',
      sortValue: (r) => r.drySellout,
      render: (r) => (
        <span className="font-mono-num text-amber-700 font-semibold">
          {(r.drySellout / 1e6).toFixed(1)} M
        </span>
      ),
    },
    {
      key: 'coldPct',
      header: '% Đông',
      align: 'right',
      sortValue: (r) => r.coldPct,
      render: (r) => (
        <span
          className={`font-mono-num font-bold text-xs ${
            r.coldPct >= 50 ? 'text-sky-700' : 'text-slate-600'
          }`}
        >
          {r.coldPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'aso',
      header: 'ASO (Tổng / Đông / Khô)',
      align: 'right',
      sortValue: (r) => r.aso,
      render: (r) => (
        <div className="text-right">
          <span className="font-mono-num font-bold text-slate-800">{formatNumber(r.aso)}</span>
          <span className="block text-[10px] text-slate-400 font-mono-num">
            ❄️{formatNumber(r.coldAso)} • 🌾{formatNumber(r.dryAso)}
          </span>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Số đơn',
      align: 'right',
      sortValue: (r) => r.orders,
      render: (r) => <span className="font-mono-num text-slate-700">{formatNumber(r.orders)}</span>,
    },
    {
      key: 'mcp',
      header: 'MCP',
      align: 'right',
      sortValue: (r) => r.mcp,
      render: (r) => <span className="font-mono-num text-slate-500">{formatNumber(r.mcp)}</span>,
    },
    {
      key: 'strike',
      header: '% Strike Rate',
      align: 'right',
      sortValue: (r) => r.strikeRate,
      render: (r) => (
        <span
          className={`font-mono-num font-bold text-xs ${
            r.strikeRate >= 70
              ? 'text-emerald-700'
              : r.strikeRate >= 40
                ? 'text-amber-700'
                : 'text-rose-700'
          }`}
        >
          {formatPercent(r.strikeRate)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">GT — Hiệu Suất Bán Hàng (Productivity &amp; NVBH)</h1>
          <p className="text-xs text-slate-500">
            Năng suất bình quân / NVBH / tháng, tỷ lệ nhân sự active và ma trận hiệu quả đầu tư RTM
          </p>
        </div>
        <ExportExcelButton
          filename={`GT_Productivity_Matrix_${year}.xlsx`}
          sheetName="RTM_Productivity"
          rows={filteredSalesmanRows}
          columns={[
            { header: 'NVBH', key: 'nvbh' },
            { header: 'Office', key: 'office' },
            { header: 'NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'GSBH', key: 'gsbh' },
            { header: 'Tổng Sell-out (VND)', key: 'sellout' },
            { header: 'Sell-out Đông (VND)', key: 'coldSellout' },
            { header: 'Sell-out Khô (VND)', key: 'drySellout' },
            { header: '% Tỷ Lệ Đông', key: 'coldPct' },
            { header: 'ASO Tổng', key: 'aso' },
            { header: 'Số Đơn Hàng', key: 'orders' },
            { header: 'MCP', key: 'mcp' },
            { header: '% Strike Rate', key: 'strikeRate' },
          ]}
        />
      </div>

      <GeoFilterBar records={nvbhRows} />

      {/* 5 Enterprise KPI Cards (Exact Parity với web_app) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Tổng Sell-out */}
        <div
          className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #8b5cf6' }}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-purple-700">
                <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                <span>TỔNG SELL-OUT</span>
              </span>
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-700">
                Total
              </span>
            </div>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : formatCurrencyVnd(kpiMetrics.totalGtSellout)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100/90 pt-2 text-[11px] font-semibold text-slate-500">
            <span className="truncate">
              BQ/NV: <b className="font-mono-num font-bold text-purple-700">{(kpiMetrics.avgSalesPerNvbh / 1e6).toFixed(1)} M</b>
            </span>
            <span className="truncate text-right text-slate-600">
              ASO: <b className="font-mono-num font-bold text-purple-700">{formatNumber(kpiMetrics.totalAso)}</b>
            </span>
          </div>
        </div>

        {/* Card 2: Hàng Đông */}
        <div
          className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #0284c7' }}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-sky-700">
                <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                <span>HÀNG ĐÔNG</span>
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold text-sky-700">
                {kpiMetrics.coldShare.toFixed(1)}%
              </span>
            </div>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : formatCurrencyVnd(kpiMetrics.totalColdSellout)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100/90 pt-2 text-[11px] font-semibold text-slate-500">
            <span className="truncate">
              BQ/NV: <b className="font-mono-num font-bold text-sky-700">{(kpiMetrics.avgColdPerNvbh / 1e6).toFixed(1)} M</b>
            </span>
            <span className="truncate text-right text-slate-600">
              ASO Đông: <b className="font-mono-num font-bold text-sky-700">{formatNumber(kpiMetrics.coldAso)}</b>
            </span>
          </div>
        </div>

        {/* Card 3: Hàng Khô */}
        <div
          className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #d97706' }}
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                <span>HÀNG KHÔ</span>
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                {kpiMetrics.dryShare.toFixed(1)}%
              </span>
            </div>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : formatCurrencyVnd(kpiMetrics.totalDrySellout)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100/90 pt-2 text-[11px] font-semibold text-slate-500">
            <span className="truncate">
              BQ/NV: <b className="font-mono-num font-bold text-amber-700">{(kpiMetrics.avgDryPerNvbh / 1e6).toFixed(1)} M</b>
            </span>
            <span className="truncate text-right text-slate-600">
              ASO Khô: <b className="font-mono-num font-bold text-amber-700">{formatNumber(kpiMetrics.dryAso)}</b>
            </span>
          </div>
        </div>

        {/* Card 4: Số Lượng NV Có Target */}
        <div
          className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #6366f1' }}
        >
          <div>
            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-indigo-700">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              <span>SỐ LƯỢNG NV CÓ TARGET</span>
            </span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : `${formatNumber(kpiMetrics.activeNvbhCount)} NV`}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px] font-semibold text-slate-500">
            <span className="truncate block">Được giao Target trong kỳ (Master)</span>
          </div>
        </div>

        {/* Card 5: Số Lượng NV Active */}
        <div
          className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #10b981' }}
        >
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">SỐ LƯỢNG NV ACTIVE</span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : `${formatNumber(kpiMetrics.actualActiveNvCount)} NV`}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px] font-semibold text-slate-500">
            <span className="truncate block">
              Tỷ lệ Active: <b className="font-mono-num font-bold text-emerald-700">{kpiMetrics.activeRate.toFixed(1)}%</b>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Main Productivity Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Biểu đồ 1 */}
        <EChartsCard
          title="Năng Suất Bán Hàng / NVBH / Tháng (NV Có Target)"
          subtitle="Total / Hàng Đông / Hàng Khô (Triệu/NV) & % Tỷ Lệ Đông (12 Tháng)"
          option={monthlyTrendOption}
          height={320}
          loading={loading}
          gradientClass="grad-blue"
          badgeText="Target NV Productivity"
          badgeClass="badge-pill badge-pill-blue"
        />

        {/* Biểu đồ 2 */}
        <EChartsCard
          title="Năng Suất Bán Hàng / NV Active Bán Hàng"
          subtitle="Total / Hàng Đông / Hàng Khô (Triệu/NV Active) & % Tỷ Lệ Đông (12 Tháng)"
          option={activeTrendOption}
          height={320}
          loading={loading}
          gradientClass="grad-green"
          badgeText="Active NV Productivity"
          badgeClass="badge-pill badge-pill-purple"
        />

        {/* Biểu đồ 3 */}
        <EChartsCard
          title="Năng Suất Bán Hàng Theo Kênh Phụ (Sub-channel)"
          subtitle="SDL, NT, THTT, CHTC, HRC, CS_LOCAL, THC — Triệu/NV & ASO TB/NV"
          option={subchanOption}
          height={320}
          loading={loading}
          gradientClass="grad-purple"
          badgeText="Sales Rep by Channel"
          badgeClass="badge-pill badge-pill-blue"
        />

        {/* Biểu đồ 4 */}
        <EChartsCard
          title="Top 15 NVBH Doanh Thu Xuất Sắc Nhất Kèm Office"
          subtitle="Cơ cấu Hàng Đông & Hàng Khô (Triệu VNĐ)"
          option={topNvbhOption}
          height={320}
          loading={loading}
          gradientClass="grad-orange"
          badgeText="Top 15 NVBH"
          badgeClass="badge-pill badge-pill-orange"
        />
      </div>

      {/* MA TRẬN NĂNG SUẤT & HIỆU QUẢ ĐẦU TƯ MÔ HÌNH PHÂN PHỐI GT */}
      <div className="material-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              <span>Ma Trận Năng Suất &amp; Hiệu Quả Đầu Tư Mô Hình Phân Phối GT (RTM Matrix)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chi tiết doanh số, cơ cấu ngành hàng, độ phủ ASO và hiệu suất viếng thăm của từng nhân viên bán hàng
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Phân tầng:
            </span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as 'ALL' | 'T1' | 'T2' | 'T3' | 'T4')}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">Tất cả Tiers ({salesmanData.length} NV)</option>
              <option value="T1">Tier 1 (≥ 50 Triệu)</option>
              <option value="T2">Tier 2 (30 - 50 Triệu)</option>
              <option value="T3">Tier 3 (15 - 30 Triệu)</option>
              <option value="T4">Tier 4 (&lt; 15 Triệu)</option>
            </select>
          </div>
        </div>

        <DataTable
          data={filteredSalesmanRows}
          columns={columns}
          searchPlaceholder="Tìm theo tên NVBH, Office, NPP, Vùng, GSBH..."
          searchFilter={(r, q) =>
            r.nvbh.toLowerCase().includes(q) ||
            r.nppName.toLowerCase().includes(q) ||
            r.office.toLowerCase().includes(q) ||
            r.vung.toLowerCase().includes(q) ||
            r.gsbh.toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}
