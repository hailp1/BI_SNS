import { Award, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtNvbhRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  nvbh_name?: string;
  storage?: string;
  sellout_val?: number;
  aso_count?: number;
  order_count?: number;
  order_sku_cnt?: number;
  aso_sku_cnt?: number;
}

interface GtNvbhMcpRow extends GeoRecord {
  month?: string;
  nvbh_name?: string;
  mcp_count?: number;
}

interface GtActiveRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  is_active_target?: number;
  is_active_in_month?: string;
}

interface GtSubchanRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sub_chan?: string;
  total_so?: number;
  cold_so?: number;
  dry_so?: number;
  aso_count?: number;
}

interface SalesmanAgg {
  nvbh: string;
  nppName: string;
  vung: string;
  gsbh: string;
  sellout: number;
  coldSellout: number;
  drySellout: number;
  aso: number;
  orders: number;
  mcp: number;
  skuCnt: number;
  strikeRate: number;
}

export function GtProductivityPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_NVBH_M));

  const [nvbhRows, setNvbhRows] = useState<GtNvbhRow[]>([]);
  const [mcpRows, setMcpRows] = useState<GtNvbhMcpRow[]>([]);
  const [activeRows, setActiveRows] = useState<GtActiveRow[]>([]);
  const [subchanRows, setSubchanRows] = useState<GtSubchanRow[]>([]);

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

  const monthlyTrendOption = useMemo(() => {
    const soM = new Array<number>(12).fill(0);
    const ordM = new Array<number>(12).fill(0);
    for (const r of nvbhRows) {
      if (String(r.year) !== year || !matchGeo(r)) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx >= 0 && idx < 12) {
        soM[idx] += (Number(r.sellout_val) || 0) / 1e9;
        ordM[idx] += Number(r.order_count || 0);
      }
    }
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell-out (Tỷ)', 'Đơn hàng'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 48, top: 38, bottom: 28 },
      xAxis: { type: 'category' as const, data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Sell-out (Tỷ)',
          type: 'bar' as const,
          data: soM.map((v) => Number(v.toFixed(2))),
          itemStyle: { color: 'rgba(255,255,255,0.9)', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? `${Number(p.value || 0).toFixed(1)}B` : '') },
          labelLayout: { hideOverlap: true },
        },
        {
          name: 'Đơn hàng',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: ordM,
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.5, color: '#fde047' },
          label: { show: true, position: 'top' as const, color: '#fde047', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? Number(p.value || 0).toLocaleString('en-US') : '') },
          labelLayout: { hideOverlap: true },
        },
      ],
    };
  }, [nvbhRows, year, matchGeo]);

  const activeTrendOption = useMemo(() => {
    const tgtM = new Array<number>(12).fill(0);
    const actM = new Array<number>(12).fill(0);
    for (const r of activeRows) {
      if (String(r.year) !== year || !matchGeo(r)) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx >= 0 && idx < 12) {
        tgtM[idx] += Number(r.is_active_target || 0);
        if (String(r.is_active_in_month || '').toLowerCase() === 'true' || r.is_active_in_month === '1') actM[idx] += 1;
      }
    }
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Chỉ tiêu Active', 'Thực tế Active'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 38, bottom: 28 },
      xAxis: { type: 'category' as const, data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
      series: [
        {
          name: 'Chỉ tiêu Active',
          type: 'bar' as const,
          data: tgtM,
          itemStyle: { color: 'rgba(255,255,255,0.45)', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? String(p.value) : '') },
          labelLayout: { hideOverlap: true },
        },
        {
          name: 'Thực tế Active',
          type: 'line' as const,
          smooth: true,
          data: actM,
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.5, color: '#fde047' },
          label: { show: true, position: 'top' as const, color: '#fde047', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? String(p.value) : '') },
          labelLayout: { hideOverlap: true },
        },
      ],
    };
  }, [activeRows, year, matchGeo]);

  const subchanOption = useMemo(() => {
    const map = new Map<string, { total: number; cold: number; dry: number; aso: number }>();
    for (const r of subchanRows) {
      if (String(r.year) !== year || !matchMonthNum(r.month_num, selectedMonths) || !matchGeo(r)) continue;
      const sc = r.sub_chan || 'Khác';
      const cur = map.get(sc) || { total: 0, cold: 0, dry: 0, aso: 0 };
      cur.total += Number(r.total_so) || 0;
      cur.cold += Number(r.cold_so) || 0;
      cur.dry += Number(r.dry_so) || 0;
      cur.aso += Number(r.aso_count) || 0;
      map.set(sc, cur);
    }
    const items = Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        cold: Number((v.cold / 1e6).toFixed(1)),
        dry: Number((v.dry / 1e6).toFixed(1)),
        aso: v.aso,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total);
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: { data: ['Hàng Đông (Tr)', 'Hàng Khô (Tr)', 'ASO'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 48, top: 38, bottom: 36 },
      xAxis: { type: 'category' as const, data: items.map((i) => i.name), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, rotate: items.length > 5 ? 18 : 0 } },
      yAxis: [
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Hàng Đông (Tr)',
          type: 'bar' as const,
          stack: 'so',
          data: items.map((i) => i.cold),
          itemStyle: { color: '#38bdf8' },
          label: { show: true, position: 'inside' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? Number(p.value || 0).toFixed(0) : '') },
          labelLayout: { hideOverlap: true },
        },
        {
          name: 'Hàng Khô (Tr)',
          type: 'bar' as const,
          stack: 'so',
          data: items.map((i) => i.dry),
          itemStyle: { color: '#fbbf24', borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? Number(p.value || 0).toFixed(0) : '') },
          labelLayout: { hideOverlap: true },
        },
        {
          name: 'ASO',
          type: 'line' as const,
          yAxisIndex: 1,
          smooth: true,
          data: items.map((i) => i.aso),
          itemStyle: { color: '#4ade80' },
          lineStyle: { width: 2.5, color: '#4ade80' },
          label: { show: true, position: 'top' as const, color: '#4ade80', fontSize: 9 },
          labelLayout: { hideOverlap: true },
        },
      ],
    };
  }, [subchanRows, year, selectedMonths, matchGeo]);

  const { kpis, rows, topSalesmen, byRegion } = useMemo(() => {
    const mcpMap = new Map<string, number>();
    for (const m of mcpRows) {
      if (!matchGeo(m)) continue;
      const key = `${m.npp_code || ''}::${m.nvbh_name || ''}`;
      mcpMap.set(key, Math.max(mcpMap.get(key) || 0, Number(m.mcp_count || 0)));
    }

    const agg = new Map<string, SalesmanAgg>();
    const regMap = new Map<string, { sellout: number; orders: number }>();

    for (const r of nvbhRows) {
      if (String(r.year) !== year || !matchMonthNum(r.month_num, selectedMonths)) continue;
      if (!matchGeo(r)) continue;
      const nvbh = r.nvbh_name || 'N/A';
      const nppCode = r.npp_code || '';
      const key = `${nppCode}::${nvbh}`;
      const cur = agg.get(key) || {
        nvbh,
        nppName: r.npp_name || nppCode,
        vung: r.vung || 'Khác',
        gsbh: r.gsbh || '',
        sellout: 0,
        coldSellout: 0,
        drySellout: 0,
        aso: 0,
        orders: 0,
        mcp: mcpMap.get(key) || 0,
        skuCnt: 0,
        strikeRate: 0,
      };
      const so = Number(r.sellout_val || 0);
      const storage = String(r.storage || '').toLowerCase();
      cur.sellout += so;
      if (storage.includes('đông') || storage.includes('cold') || storage.includes('lạnh')) {
        cur.coldSellout += so;
      } else {
        cur.drySellout += so;
      }
      cur.aso += Number(r.aso_count || 0);
      cur.orders += Number(r.order_count || 0);
      cur.skuCnt = Math.max(cur.skuCnt, Number(r.order_sku_cnt || 0));
      agg.set(key, cur);

      const vung = r.vung || 'Khác';
      const reg = regMap.get(vung) || { sellout: 0, orders: 0 };
      reg.sellout += so;
      reg.orders += Number(r.order_count || 0);
      regMap.set(vung, reg);
    }

    const list = Array.from(agg.values())
      .map((s) => ({ ...s, strikeRate: s.mcp > 0 ? (s.aso / s.mcp) * 100 : 0 }))
      .sort((a, b) => b.sellout - a.sellout);

    const totalSellout = list.reduce((s, r) => s + r.sellout, 0);
    const totalOrders = list.reduce((s, r) => s + r.orders, 0);
    const totalAso = list.reduce((s, r) => s + r.aso, 0);
    const avgProd = list.length > 0 ? totalSellout / list.length : 0;

    return {
      kpis: { count: list.length, totalSellout, totalOrders, totalAso, avgProd },
      rows: list,
      topSalesmen: list.slice(0, 12),
      byRegion: Array.from(regMap.entries())
        .map(([vung, v]) => ({ vung, ...v }))
        .sort((a, b) => b.sellout - a.sellout),
    };
  }, [nvbhRows, mcpRows, year, selectedMonths, matchGeo]);

  const topChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: { data: ['Hàng Đông', 'Hàng Khô'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 110, right: 32, top: 32, bottom: 28 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: [...topSalesmen].reverse().map((s) => s.nvbh),
        axisLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10 },
      },
      series: [
        {
          name: 'Hàng Đông',
          type: 'bar' as const,
          stack: 'total',
          data: [...topSalesmen].reverse().map((s) => Number((s.coldSellout / 1e6).toFixed(1))),
          itemStyle: { color: '#38bdf8' },
          label: { show: true, position: 'inside' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? `${Number(p.value || 0).toFixed(0)}M` : '') },
          labelLayout: { hideOverlap: true },
        },
        {
          name: 'Hàng Khô',
          type: 'bar' as const,
          stack: 'total',
          data: [...topSalesmen].reverse().map((s) => Number((s.drySellout / 1e6).toFixed(1))),
          itemStyle: { color: '#fbbf24', borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: 'right' as const, color: '#fff', fontSize: 9, formatter: (p: { value?: unknown }) => (Number(p.value || 0) > 0 ? `${Number(p.value || 0).toFixed(0)}M` : '') },
          labelLayout: { hideOverlap: true },
        },
      ],
    }),
    [topSalesmen],
  );

  const regionChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell-out (Tỷ)', 'Đơn hàng'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 48, top: 36, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: byRegion.map((r) => r.vung),
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
        },
        {
          type: 'value' as const,
          axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Sell-out (Tỷ)',
          type: 'bar' as const,
          data: byRegion.map((r) => Number((r.sellout / 1e9).toFixed(2))),
          itemStyle: { color: 'rgba(255,255,255,0.9)', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Đơn hàng',
          type: 'line' as const,
          yAxisIndex: 1,
          data: byRegion.map((r) => r.orders),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.5, color: '#fde047' },
        },
      ],
    }),
    [byRegion],
  );

  const columns: ColumnDef<SalesmanAgg>[] = [
    { key: 'nvbh', header: 'Nhân viên bán hàng', sortValue: (r) => r.nvbh, render: (r) => <span className="font-semibold text-slate-900">{r.nvbh}</span> },
    { key: 'npp', header: 'NPP', sortValue: (r) => r.nppName, render: (r) => r.nppName },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'sellout', header: 'Sell-out', align: 'right', sortValue: (r) => r.sellout, render: (r) => <span className="font-mono-num font-semibold">{formatCurrencyVnd(r.sellout)}</span> },
    { key: 'aso', header: 'ASO', align: 'right', sortValue: (r) => r.aso, render: (r) => r.aso.toLocaleString('vi-VN') },
    { key: 'orders', header: 'Số đơn', align: 'right', sortValue: (r) => r.orders, render: (r) => r.orders.toLocaleString('vi-VN') },
    { key: 'mcp', header: 'MCP', align: 'right', sortValue: (r) => r.mcp, render: (r) => r.mcp.toLocaleString('vi-VN') },
    { key: 'strike', header: '% ASO/MCP', align: 'right', sortValue: (r) => r.strikeRate, render: (r) => formatPercent(r.strikeRate) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">GT — Productivity &amp; Salesman</h1>
          <p className="text-xs text-slate-500">Năng suất đội ngũ NVBH, độ phủ ASO và số lượng đơn hàng</p>
        </div>
        <ExportExcelButton
          filename={`GT_Productivity_${year}.xlsx`}
          sheetName="NVBH_Productivity"
          rows={rows}
          columns={[
            { header: 'NVBH', key: 'nvbh' },
            { header: 'NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'Sell-out', key: 'sellout' },
            { header: 'ASO', key: 'aso' },
            { header: 'Đơn hàng', key: 'orders' },
            { header: 'MCP', key: 'mcp' },
          ]}
        />
      </div>

      <GeoFilterBar records={nvbhRows} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Nhân sự NVBH có doanh số" value={loading ? '...' : kpis.count.toLocaleString('vi-VN')} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard title="Tổng Sell-out NVBH" value={loading ? '...' : formatCurrencyVnd(kpis.totalSellout)} icon={<TrendingUp className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Tổng ASO / Đơn hàng" value={loading ? '...' : `${kpis.totalAso.toLocaleString('vi-VN')} / ${kpis.totalOrders.toLocaleString('vi-VN')}`} icon={<ShoppingBag className="h-4 w-4" />} accent="red" />
        <KpiCard title="Năng suất TB / NVBH" value={loading ? '...' : formatCurrencyVnd(kpis.avgProd)} icon={<Award className="h-4 w-4" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="Xu Hướng Năng Suất NVBH (12 Tháng)"
          subtitle="Sell-out (Tỷ VNĐ) & Số đơn hàng theo tháng"
          option={monthlyTrendOption}
          height={270}
          loading={loading}
          gradientClass="grad-blue"
          badgeText="Monthly Trend"
          badgeClass="badge-pill badge-pill-blue"
        />
        <EChartsCard
          title="Xu Hướng Salesman Active (12 Tháng)"
          subtitle="Chỉ tiêu Active vs Thực tế Active"
          option={activeTrendOption}
          height={270}
          loading={loading}
          gradientClass="grad-green"
          badgeText="Active Trend"
          badgeClass="badge-pill badge-pill-green"
        />
        <EChartsCard
          title="Cơ Cấu Sell-out Theo Sub-channel GT"
          subtitle="Tỷ trọng đóng góp theo phân kênh"
          option={subchanOption}
          height={270}
          loading={loading}
          gradientClass="grad-purple"
          badgeText="Sub-channel"
          badgeClass="badge-pill badge-pill-purple"
        />
        <EChartsCard
          title="Top 12 NVBH Sell-out Cao Nhất"
          subtitle="Đơn vị: Triệu VNĐ"
          option={topChartOption}
          height={270}
          loading={loading}
          gradientClass="grad-orange"
          badgeText="Top Salesman"
          badgeClass="badge-pill badge-pill-orange"
        />
      </div>

      <EChartsCard
        title="Năng Suất & Đơn Hàng Theo Vùng"
        subtitle="Sell-out (Tỷ) và Số đơn hàng"
        option={regionChartOption}
        height={250}
        loading={loading}
        gradientClass="grad-primary"
        badgeText="Regional"
        badgeClass="badge-pill badge-pill-primary"
      />

      <div className="material-card p-4">
        <DataTable
          data={rows}
          columns={columns}
          searchPlaceholder="Tìm theo tên NVBH, NPP, Vùng..."
          searchFilter={(r, q) =>
            r.nvbh.toLowerCase().includes(q) || r.nppName.toLowerCase().includes(q) || r.vung.toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}
