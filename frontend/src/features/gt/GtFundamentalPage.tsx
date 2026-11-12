import { Activity, Layers, ShoppingCart, Store, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtFundTreeRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sellout_val?: number;
}
interface GtSiRow {
  month?: string;
  npp_code?: string;
  sellin_val?: number;
}
interface GtAsoRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  aso_count?: number;
}
interface GtMcpRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  mcp_count?: number;
}
interface GtL3mRow extends GeoRecord {
  month?: string;
  l3m_aso?: number;
}
interface GtNvbhRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sellout_val?: number;
  aso_count?: number;
  order_count?: number;
  order_sku_cnt?: number;
  aso_sku_cnt?: number;
}

interface MonthBucket {
  si: number;
  so: number;
  aso: number;
  mcp: number;
  l3m: number;
  nvSo: number;
  nvOrd: number;
  nvAso: number;
  ordSku: number;
  asoSku: number;
}

function toMonthKey(y: unknown, m: unknown): string {
  const ys = String(y || '').trim();
  const ms = String(m || '').trim().padStart(2, '0');
  if (ys.length === 4 && ms.length === 2 && ms !== '00') return `${ys}-${ms}`;
  return '';
}

export function GtFundamentalPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_NVBH_M || s.loading.GT_ASO_M));

  const [gtTree, setGtTree] = useState<GtFundTreeRow[]>([]);
  const [gtSi, setGtSi] = useState<GtSiRow[]>([]);
  const [gtAso, setGtAso] = useState<GtAsoRow[]>([]);
  const [gtMcp, setGtMcp] = useState<GtMcpRow[]>([]);
  const [gtL3m, setGtL3m] = useState<GtL3mRow[]>([]);
  const [gtNvbh, setGtNvbh] = useState<GtNvbhRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('GT_TREE', user),
      loadPayload('GT_SI', user),
      loadPayload('GT_ASO_M', user),
      loadPayload('GT_MCP_M', user),
      loadPayload('GT_L3M', user),
      loadPayload('GT_NVBH_M', user),
    ]).then(([tree, si, aso, mcp, l3m, nvbh]) => {
      if (!active) return;
      if (Array.isArray(tree)) setGtTree(tree as GtFundTreeRow[]);
      if (Array.isArray(si)) setGtSi(si as GtSiRow[]);
      if (Array.isArray(aso)) setGtAso(aso as GtAsoRow[]);
      if (Array.isArray(mcp)) setGtMcp(mcp as GtMcpRow[]);
      if (Array.isArray(l3m)) setGtL3m(l3m as GtL3mRow[]);
      if (Array.isArray(nvbh)) setGtNvbh(nvbh as GtNvbhRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const matchGeo = useCallback(
    (r: GeoRecord) =>
      (geoMien === 'ALL' || r.mien === geoMien) &&
      (geoVung === 'ALL' || r.vung === geoVung) &&
      (geoGsbh === 'ALL' || r.gsbh === geoGsbh || r.office === geoGsbh) &&
      (geoNpp === 'ALL' || r.npp_code === geoNpp),
    [geoMien, geoVung, geoGsbh, geoNpp],
  );

  const allowedNppSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of gtTree) {
      if (matchGeo(r) && r.npp_code) s.add(String(r.npp_code));
    }
    return s;
  }, [gtTree, matchGeo]);

  const metrics = useMemo(() => {
    const map = new Map<string, MonthBucket>();
    const getB = (k: string) => {
      let b = map.get(k);
      if (!b) {
        b = { si: 0, so: 0, aso: 0, mcp: 0, l3m: 0, nvSo: 0, nvOrd: 0, nvAso: 0, ordSku: 0, asoSku: 0 };
        map.set(k, b);
      }
      return b;
    };

    for (const r of gtTree) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).so += (Number(r.sellout_val) || 0) / 1e9;
    }
    for (const r of gtSi) {
      const k = String(r.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(k)) continue;
      if (allowedNppSet.size > 0 && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      getB(k).si += (Number(r.sellin_val) || 0) / 1e9;
    }
    for (const r of gtAso) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).aso += Number(r.aso_count || 0);
    }
    for (const r of gtMcp) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).mcp += Number(r.mcp_count || 0);
    }
    for (const r of gtL3m) {
      if (!matchGeo(r)) continue;
      const k = String(r.month || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(k)) getB(k).l3m += Number(r.l3m_aso || 0);
    }
    for (const r of gtNvbh) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (!k) continue;
      const b = getB(k);
      b.nvSo += Number(r.sellout_val || 0);
      b.nvOrd += Number(r.order_count || 0);
      b.nvAso += Number(r.aso_count || 0);
      b.ordSku += Number(r.order_sku_cnt || 0);
      b.asoSku += Number(r.aso_sku_cnt || 0);
    }

    const keys = Array.from(map.keys()).filter((k) => k >= '2025-01').sort();
    const labels = keys.map((k) => `${k.slice(2, 4)}-${k.slice(5, 7)}`);

    const selKeys = selectedMonths.map((m) => `${year}-${m.padStart(2, '0')}`);
    let totSo = 0;
    let totOrd = 0;
    let totNvAso = 0;
    let totAso = 0;
    let totMcp = 0;
    let totSku = 0;
    for (const sk of selKeys) {
      const b = map.get(sk);
      if (!b) continue;
      totSo += b.nvSo;
      totOrd += b.nvOrd;
      totNvAso += b.nvAso;
      totAso += b.aso;
      totMcp += b.mcp;
      totSku += b.ordSku;
    }

    const exportRows = keys.map((k) => {
      const b = map.get(k)!;
      return {
        month: k,
        sellinB: Number(b.si.toFixed(2)),
        selloutB: Number(b.so.toFixed(2)),
        mcp: b.mcp,
        aso: b.aso,
        l3m: b.l3m,
        dropsizeM: b.nvOrd > 0 ? Number((b.nvSo / b.nvOrd / 1e6).toFixed(2)) : 0,
        vpoM: b.nvAso > 0 ? Number((b.nvSo / b.nvAso / 1e6).toFixed(2)) : 0,
        freq: b.nvAso > 0 ? Number((b.nvOrd / b.nvAso).toFixed(2)) : 0,
        skuPerOrder: b.nvOrd > 0 ? Number((b.ordSku / b.nvOrd).toFixed(2)) : 0,
      };
    });

    return {
      labels,
      si: keys.map((k) => Number(map.get(k)!.si.toFixed(2))),
      so: keys.map((k) => Number(map.get(k)!.so.toFixed(2))),
      aso: keys.map((k) => map.get(k)!.aso),
      mcp: keys.map((k) => map.get(k)!.mcp),
      l3m: keys.map((k) => map.get(k)!.l3m),
      dropsize: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvOrd > 0 ? Number((b.nvSo / b.nvOrd / 1e6).toFixed(2)) : 0;
      }),
      vpo: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.nvSo / b.nvAso / 1e6).toFixed(2)) : 0;
      }),
      freq: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.nvOrd / b.nvAso).toFixed(2)) : 0;
      }),
      activePct: keys.map((k) => {
        const b = map.get(k)!;
        return b.mcp > 0 ? Number(((b.aso / b.mcp) * 100).toFixed(1)) : 0;
      }),
      skuPerOrder: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvOrd > 0 ? Number((b.ordSku / b.nvOrd).toFixed(2)) : 0;
      }),
      skuPerAso: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.asoSku / b.nvAso).toFixed(2)) : 0;
      }),
      exportRows,
      kpi: {
        dropsize: totOrd > 0 ? totSo / totOrd : 0,
        vpo: totNvAso > 0 ? totSo / totNvAso : 0,
        activePct: totMcp > 0 ? (totAso / totMcp) * 100 : 0,
        freq: totNvAso > 0 ? totOrd / totNvAso : 0,
        skuOrder: totOrd > 0 ? totSku / totOrd : 0,
      },
    };
  }, [gtTree, gtSi, gtAso, gtMcp, gtL3m, gtNvbh, year, selectedMonths, matchGeo, allowedNppSet]);

  const xAxisBase = useMemo(
    () => ({
      type: 'category' as const,
      data: metrics.labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.4)' } },
      axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
    }),
    [metrics.labels],
  );

  const yAxisBase = useMemo(
    () => ({
      type: 'value' as const,
      axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
    }),
    [],
  );

  const sisoOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell In (SAP)', 'Sell Out (DMS)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'B ₫', nameTextStyle: { color: '#CBD5E1', fontSize: 9.5 } },
      series: [
        { name: 'Sell In (SAP)', type: 'bar' as const, barMaxWidth: 11, data: metrics.si, itemStyle: { color: '#38BDF8', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 8.5, formatter: '{c}B' }, labelLayout: { hideOverlap: true } },
        { name: 'Sell Out (DMS)', type: 'bar' as const, barMaxWidth: 11, data: metrics.so, itemStyle: { color: '#34D399', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 8.5, formatter: '{c}B' }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.si, metrics.so, xAxisBase, yAxisBase],
  );

  const coverageOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['MCP Tuyến', 'ASO Active', 'ASO 3 Tháng (L3M)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 52, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: yAxisBase,
      series: [
        { name: 'MCP Tuyến', type: 'line' as const, smooth: true, data: metrics.mcp, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2.2, color: '#C084FC' }, label: { show: true, position: 'top' as const, color: '#F3E8FF', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'ASO Active', type: 'line' as const, smooth: true, data: metrics.aso, itemStyle: { color: '#34D399' }, lineStyle: { width: 2.5, color: '#34D399' }, label: { show: true, position: 'top' as const, color: '#D1FAE5', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'ASO 3 Tháng (L3M)', type: 'line' as const, smooth: true, data: metrics.l3m, itemStyle: { color: '#38BDF8' }, lineStyle: { width: 2.2, color: '#38BDF8' }, label: { show: true, position: 'bottom' as const, color: '#BAE6FD', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.mcp, metrics.aso, metrics.l3m, xAxisBase, yAxisBase],
  );

  const dropsizeOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Drop Size (M/Đơn)', 'VPO (M/Điểm bán)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'M ₫', nameTextStyle: { color: '#CBD5E1', fontSize: 9.5 } },
      series: [
        { name: 'Drop Size (M/Đơn)', type: 'line' as const, smooth: true, data: metrics.dropsize, itemStyle: { color: '#FBBF24' }, lineStyle: { width: 2.4, color: '#FBBF24' }, label: { show: true, position: 'top' as const, color: '#FEF3C7', fontSize: 8.5, formatter: '{c}M' }, labelLayout: { hideOverlap: true } },
        { name: 'VPO (M/Điểm bán)', type: 'line' as const, smooth: true, data: metrics.vpo, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2.4, color: '#C084FC' }, label: { show: true, position: 'bottom' as const, color: '#F3E8FF', fontSize: 8.5, formatter: '{c}M' }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.dropsize, metrics.vpo, xAxisBase, yAxisBase],
  );

  const strikeOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Tần Suất Mua Hàng (Đơn/CH)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 20, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'Đơn/CH', nameTextStyle: { color: '#93C5FD', fontSize: 9.5 } },
      series: [
        {
          name: 'Tần Suất Mua Hàng (Đơn/CH)',
          type: 'line' as const,
          smooth: true,
          data: metrics.freq,
          itemStyle: { color: '#38BDF8' },
          lineStyle: { width: 2.5, color: '#38BDF8' },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
                { offset: 1, color: 'rgba(56, 189, 248, 0.02)' },
              ],
            },
          },
          label: { show: true, position: 'top' as const, color: '#E0F2FE', fontSize: 8.5 },
          labelLayout: { hideOverlap: true },
        },
      ],
    }),
    [metrics.freq, xAxisBase, yAxisBase],
  );

  const skuOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['SKU/Đơn (LPPC)', 'SKU/Cửa Hàng'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 44, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: yAxisBase,
      series: [
        { name: 'SKU/Đơn (LPPC)', type: 'line' as const, smooth: true, data: metrics.skuPerOrder, itemStyle: { color: '#5EEAD4' }, lineStyle: { width: 2.5, color: '#5EEAD4' }, label: { show: true, position: 'top' as const, color: '#CCFBF1', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'SKU/Cửa Hàng', type: 'line' as const, smooth: true, data: metrics.skuPerAso, itemStyle: { color: '#FB923C' }, lineStyle: { width: 2.5, color: '#FB923C' }, label: { show: true, position: 'bottom' as const, color: '#FFEDD5', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.skuPerOrder, metrics.skuPerAso, xAxisBase, yAxisBase],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">GT — Fundamental KPIs (5 Core Pillars)</h1>
          <p className="text-xs text-slate-500">Phân tích đa tháng (2025–2026) Độ phủ, Dropsize, VPO, Tần suất &amp; SKU/Đơn hàng</p>
        </div>
        <ExportExcelButton
          filename={`GT_Fundamental_${year}.xlsx`}
          sheetName="GT_Fundamental"
          rows={metrics.exportRows}
          columns={[
            { header: 'Tháng', key: 'month' },
            { header: 'Sell-in (Tỷ)', key: 'sellinB' },
            { header: 'Sell-out (Tỷ)', key: 'selloutB' },
            { header: 'MCP', key: 'mcp' },
            { header: 'ASO', key: 'aso' },
            { header: 'L3M ASO', key: 'l3m' },
            { header: 'Dropsize (Tr)', key: 'dropsizeM' },
            { header: 'VPO (Tr)', key: 'vpoM' },
            { header: 'Tần suất', key: 'freq' },
            { header: 'SKU/Đơn', key: 'skuPerOrder' },
          ]}
        />
      </div>

      <GeoFilterBar records={gtTree} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Dropsize (TB / Đơn)" value={loading ? '...' : formatCurrencyVnd(metrics.kpi.dropsize)} icon={<ShoppingCart className="h-4 w-4" />} accent="blue" />
        <KpiCard title="VPO (TB / ASO)" value={loading ? '...' : formatCurrencyVnd(metrics.kpi.vpo)} icon={<TrendingUp className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Tỷ lệ Active (ASO/MCP)" value={loading ? '...' : formatPercent(metrics.kpi.activePct)} icon={<Store className="h-4 w-4" />} accent="red" />
        <KpiCard title="Tần suất (Đơn/ASO)" value={loading ? '...' : metrics.kpi.freq.toFixed(2)} icon={<Activity className="h-4 w-4" />} accent="amber" />
        <KpiCard title="SKU / Đơn hàng" value={loading ? '...' : metrics.kpi.skuOrder.toFixed(2)} icon={<Layers className="h-4 w-4" />} accent="slate" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard title="Doanh Số Sell In vs Sell Out (2025 - 2026)" subtitle="Xu hướng xuất xưởng SAP (Sell-in) và tiêu thụ DMS (Sell-out)" option={sisoOption} height={290} loading={loading} gradientClass="grad-green" badgeText="Multi-Month Flow" badgeClass="badge-pill badge-pill-green" />
        <EChartsCard title="Độ Phủ Điểm Bán (MCP vs ASO vs L3M)" subtitle="So sánh điểm bán kế hoạch, hoạt động trong tháng và 3 tháng gần nhất" option={coverageOption} height={290} loading={loading} gradientClass="grad-purple" badgeText="Coverage Trend" badgeClass="badge-pill badge-pill-purple" />
        <EChartsCard title="Drop Size (M/Đơn) & VPO (M/Điểm bán)" subtitle="Giá trị đơn hàng trung bình và doanh số trung bình trên mỗi điểm bán" option={dropsizeOption} height={270} loading={loading} gradientClass="grad-blue" badgeText="Dropsize / VPO" badgeClass="badge-pill badge-pill-blue" />
        <EChartsCard title="Tỷ Lệ Active & Tần Suất Mua Hàng" subtitle="% Active (ASO/MCP) và Số đơn trung bình trên mỗi ASO" option={strikeOption} height={270} loading={loading} gradientClass="grad-orange" badgeText="Strike & Freq" badgeClass="badge-pill badge-pill-orange" />
      </div>

      <EChartsCard title="Chỉ Số SKU / Đơn (LPPC) & SKU / Cửa Hàng" subtitle="Độ rộng danh mục sản phẩm bán ra trên mỗi đơn hàng và mỗi cửa hàng" option={skuOption} height={270} loading={loading} gradientClass="grad-primary" badgeText="SKU Rate" badgeClass="badge-pill badge-pill-primary" />
    </div>
  );
}
