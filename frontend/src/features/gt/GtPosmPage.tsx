import { Box, Layers, Snowflake, Store } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface PosmAssetRow extends GeoRecord {
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
  qty?: number;
  channel?: string;
  channel_name?: string;
  sales?: Record<string, number> | number | string | null;
}

function extractLatestSales(sales: PosmAssetRow['sales']): number {
  if (typeof sales === 'number') return sales;
  if (!sales) return 0;
  let obj: Record<string, unknown> | null = null;
  if (typeof sales === 'string') {
    try {
      obj = JSON.parse(sales) as Record<string, unknown>;
    } catch {
      return 0;
    }
  } else if (typeof sales === 'object') {
    obj = sales as Record<string, unknown>;
  }
  if (!obj) return 0;
  const vals = Object.values(obj).map((v) => Number(v) || 0);
  return vals.reduce((s, v) => s + v, 0);
}

function buildCountBarOption(rows: PosmAssetRow[], keyFn: (r: PosmAssetRow) => string, seriesName: string, barColor = 'rgba(255,255,255,0.9)', withAvgSalesLine = false) {
  const map = new Map<string, { qty: number; sales: number }>();
  for (const r of rows) {
    const k = keyFn(r) || 'Khác';
    const cur = map.get(k) || { qty: 0, sales: 0 };
    cur.qty += Number(r.qty || 1);
    cur.sales += extractLatestSales(r.sales);
    map.set(k, cur);
  }
  const entries = Array.from(map.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 12);
  const series: Array<Record<string, unknown>> = [
    {
      name: seriesName,
      type: 'bar',
      data: entries.map((e) => e[1].qty),
      itemStyle: { color: barColor, borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
      labelLayout: { hideOverlap: true },
    },
  ];
  const yAxis: Array<Record<string, unknown>> = [
    {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },
    },
  ];
  if (withAvgSalesLine) {
    yAxis.push({
      type: 'value',
      name: 'Tr/ĐB',
      nameTextStyle: { color: '#fde047', fontSize: 9 },
      axisLabel: { color: '#fde047', fontSize: 10 },
      splitLine: { show: false },
    });
    series.push({
      name: 'DS TB (Tr)',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: entries.map((e) => (e[1].qty > 0 ? Number((e[1].sales / e[1].qty / 1e6).toFixed(1)) : 0)),
      itemStyle: { color: '#fde047' },
      lineStyle: { width: 2.2, color: '#fde047' },
      label: { show: true, position: 'top', color: '#FEF08A', fontSize: 8.5 },
      labelLayout: { hideOverlap: true },
    });
  }
  return {
    tooltip: { trigger: 'axis' as const },
    legend: withAvgSalesLine ? { data: [seriesName, 'DS TB (Tr)'], top: 2, textStyle: { color: '#fff', fontSize: 10.5 } } : undefined,
    grid: { left: 48, right: withAvgSalesLine ? 44 : 16, top: withAvgSalesLine ? 34 : 20, bottom: 40 },
    xAxis: { type: 'category' as const, data: entries.map((e) => e[0]), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, rotate: 18 } },
    yAxis,
    series,
  };
}

function buildHorizontalCountBarOption(rows: PosmAssetRow[], keyFn: (r: PosmAssetRow) => string, seriesName: string, barColor = '#38BDF8') {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r) || 'Khác';
    map.set(k, (map.get(k) || 0) + Number(r.qty || 1));
  }
  const entries = Array.from(map.entries()).sort((a, b) => a[1] - b[1]).slice(-10);
  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 96, right: 44, top: 16, bottom: 24 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
    },
    yAxis: {
      type: 'category' as const,
      data: entries.map((e) => e[0]),
      axisLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' as const },
    },
    series: [
      {
        name: seriesName,
        type: 'bar' as const,
        barMaxWidth: 22,
        data: entries.map((e) => e[1]),
        itemStyle: { color: barColor, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' as const, color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' as const },
      },
    ],
  };
}

function buildYearTwoBarLineOption(
  rows: PosmAssetRow[],
  totalLabel: string,
  activeLabel: string,
  lineLabel: string,
  divisor: number,
  unitSuffix: string,
) {
  const map = new Map<string, { total: number; active: number; sales: number }>();
  for (const r of rows) {
    const yr = String(r.model_year || 'N/A');
    const cur = map.get(yr) || { total: 0, active: 0, sales: 0 };
    const qty = Number(r.qty || 1);
    const s = extractLatestSales(r.sales);
    cur.total += qty;
    if (s > 0) {
      cur.active += qty;
      cur.sales += s;
    }
    map.set(yr, cur);
  }
  const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return {
    tooltip: { trigger: 'axis' as const },
    legend: { data: [totalLabel, activeLabel, lineLabel], top: 2, textStyle: { color: '#fff', fontSize: 10 } },
    grid: { left: 48, right: 48, top: 38, bottom: 32 },
    xAxis: { type: 'category' as const, data: entries.map((e) => e[0]), axisLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' as const } },
    yAxis: [
      {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      {
        type: 'value' as const,
        name: unitSuffix,
        nameTextStyle: { color: '#fde047', fontSize: 9 },
        axisLabel: { color: '#fde047', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: totalLabel,
        type: 'bar' as const,
        data: entries.map((e) => e[1].total),
        itemStyle: { color: 'rgba(255,255,255,0.55)', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top' as const, color: '#fff', fontSize: 8.5 },
        labelLayout: { hideOverlap: true },
      },
      {
        name: activeLabel,
        type: 'bar' as const,
        data: entries.map((e) => e[1].active),
        itemStyle: { color: '#38BDF8', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top' as const, color: '#BAE6FD', fontSize: 8.5 },
        labelLayout: { hideOverlap: true },
      },
      {
        name: lineLabel,
        type: 'line' as const,
        yAxisIndex: 1,
        smooth: true,
        data: entries.map((e) => (e[1].active > 0 ? Number((e[1].sales / e[1].active / divisor).toFixed(1)) : 0)),
        itemStyle: { color: '#fde047' },
        lineStyle: { width: 2.2, color: '#fde047' },
        label: { show: true, position: 'top' as const, color: '#FEF08A', fontSize: 8.5 },
        labelLayout: { hideOverlap: true },
      },
    ],
  };
}

function buildDonutOption(rows: PosmAssetRow[], keyFn: (r: PosmAssetRow) => string, seriesName: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r) || 'Khác';
    map.set(k, (map.get(k) || 0) + Number(r.qty || 1));
  }
  const items = Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        name: seriesName,
        type: 'pie' as const,
        radius: ['45%', '72%'],
        data: items,
        label: { color: '#FFFFFF', fontSize: 10.5, formatter: '{b}: {c} ({d}%)' },
      },
    ],
  };
}

function buildSalesTierOption(rows: PosmAssetRow[], seriesName: string) {
  const tiers = [
    { label: '0đ', val: 0, color: '#F87171' },
    { label: '< 5Tr', val: 0, color: '#FBBF24' },
    { label: '5 - 15Tr', val: 0, color: '#38BDF8' },
    { label: '> 15Tr', val: 0, color: '#34D399' },
  ];
  for (const r of rows) {
    const s = extractLatestSales(r.sales);
    const qty = Number(r.qty || 1);
    if (s <= 0) tiers[0].val += qty;
    else if (s < 5_000_000) tiers[1].val += qty;
    else if (s <= 15_000_000) tiers[2].val += qty;
    else tiers[3].val += qty;
  }
  const total = tiers.reduce((a, b) => a + b.val, 0);
  const ordered = [...tiers].reverse();
  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 72, right: 64, top: 16, bottom: 24 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
    },
    yAxis: {
      type: 'category' as const,
      data: ordered.map((t) => t.label),
      axisLabel: { color: '#FFFFFF', fontSize: 10.5, fontWeight: 'bold' as const },
    },
    series: [
      {
        name: seriesName,
        type: 'bar' as const,
        barMaxWidth: 24,
        data: ordered.map((t) => ({ value: t.val, itemStyle: { color: t.color, borderRadius: [0, 5, 5, 0] } })),
        label: {
          show: true,
          position: 'right' as const,
          color: '#FFFFFF',
          fontSize: 9.5,
          fontWeight: 'bold' as const,
          formatter: (p: { value?: unknown }) => {
            const val = Number(p.value || 0);
            return `${val} (${total > 0 ? ((val / total) * 100).toFixed(0) : 0}%)`;
          },
        },
      },
    ],
  };
}

export function GtPosmPage() {
  const user = useAuthStore((s) => s.user);
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

  const filteredFreezers = useMemo(() => freezers.filter(matchGeo), [freezers, matchGeo]);
  const filteredStandees = useMemo(() => standees.filter(matchGeo), [standees, matchGeo]);
  const activeRows = tab === 'freezer' ? filteredFreezers : filteredStandees;

  const uniqueOutlets = useMemo(() => new Set(activeRows.map((r) => r.c_code).filter(Boolean)).size, [activeRows]);
  const uniqueNpps = useMemo(() => new Set(activeRows.map((r) => r.npp_code).filter(Boolean)).size, [activeRows]);

  const freezerChannelOption = useMemo(
    () => buildHorizontalCountBarOption(filteredFreezers, (r) => r.channel_name || r.channel || 'Khác', 'Tủ Đông', '#38BDF8'),
    [filteredFreezers],
  );
  const freezerCapacityOption = useMemo(
    () => buildCountBarOption(filteredFreezers, (r) => r.cap_group || r.capacity || 'Khác', 'Số Lượng Tủ', '#38BDF8', true),
    [filteredFreezers],
  );
  const freezerYearOption = useMemo(
    () => buildYearTwoBarLineOption(filteredFreezers, 'Tổng Số Lượng Tủ', 'Số Tủ Có Mua', 'DS / Tủ (M)', 1e6, 'M'),
    [filteredFreezers],
  );
  const freezerTierOption = useMemo(() => buildSalesTierOption(filteredFreezers, 'Tier Tủ Đông'), [filteredFreezers]);

  const standeeChannelOption = useMemo(
    () => buildDonutOption(filteredStandees, (r) => r.channel_name || r.channel || 'Khác', 'Standee theo Kênh'),
    [filteredStandees],
  );
  const standeeCategoryOption = useMemo(
    () => buildCountBarOption(filteredStandees, (r) => r.dev_type || r.dev_name || 'Khác', 'Số Kệ', '#0ea5e9', true),
    [filteredStandees],
  );
  const standeeYearOption = useMemo(
    () => buildYearTwoBarLineOption(filteredStandees, 'Tổng Số Standee', 'Standee Có Mua', 'DS / Kệ (K)', 1e3, 'K'),
    [filteredStandees],
  );
  const standeeTierOption = useMemo(() => buildSalesTierOption(filteredStandees, 'Tier Standee'), [filteredStandees]);

  const columns: ColumnDef<PosmAssetRow>[] = [
    { key: 'c_code', header: 'Mã KH', sortValue: (r) => r.c_code || '', render: (r) => <span className="font-mono-num font-semibold text-slate-900">{r.c_code}</span> },
    { key: 'c_name', header: 'Tên điểm bán', sortValue: (r) => r.c_name || '', render: (r) => r.c_name || '-' },
    { key: 'npp', header: 'NPP', sortValue: (r) => r.npp_name || '', render: (r) => r.npp_name || r.npp_code || '-' },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung || '', render: (r) => r.vung || '-' },
    { key: 'dev_type', header: 'Loại thiết bị', sortValue: (r) => r.dev_type || '', render: (r) => r.dev_type || r.dev_name || '-' },
    { key: 'cap', header: tab === 'freezer' ? 'Dung tích' : 'Số lượng', align: 'right', sortValue: (r) => String(r.capacity || r.qty || ''), render: (r) => (tab === 'freezer' ? r.capacity || '-' : String(r.qty || 1)) },
    { key: 'year', header: 'Model', align: 'center', sortValue: (r) => r.model_year || 0, render: (r) => String(r.model_year || '-') },
    { key: 'qr', header: 'QR / Serial', sortValue: (r) => r.qr || '', render: (r) => <span className="font-mono-num text-xs text-slate-500">{r.qr || r.dev_code || '-'}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">GT — Quản Lý POSM (Tủ Đông &amp; Standee)</h1>
          <p className="text-xs text-slate-500">Theo dõi phân bổ thiết bị trưng bày &amp; hiệu quả doanh số tại điểm bán GT</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTab('freezer')}
              className={`rounded-md px-3 py-1 text-xs font-bold ${tab === 'freezer' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              ❄️ Tủ Đông ({filteredFreezers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('standee')}
              className={`rounded-md px-3 py-1 text-xs font-bold ${tab === 'standee' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              🪧 Standee ({filteredStandees.length})
            </button>
          </div>
          <ExportExcelButton
            filename={`GT_POSM_${tab}.xlsx`}
            sheetName={tab}
            rows={activeRows}
            columns={[
              { header: 'Mã KH', key: (r) => r.c_code || '' },
              { header: 'Tên điểm bán', key: (r) => r.c_name || '' },
              { header: 'NPP', key: (r) => r.npp_name || '' },
              { header: 'Vùng', key: (r) => r.vung || '' },
              { header: 'Loại thiết bị', key: (r) => r.dev_type || r.dev_name || '' },
              { header: 'Model', key: (r) => r.model_year || '' },
            ]}
          />
        </div>
      </div>

      <GeoFilterBar records={tab === 'freezer' ? freezers : standees} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Tổng Tủ Đông" value={loading ? '...' : filteredFreezers.length.toLocaleString('vi-VN')} icon={<Snowflake className="h-4 w-4" />} accent="blue" />
        <KpiCard title="Tổng Standee" value={loading ? '...' : filteredStandees.length.toLocaleString('vi-VN')} icon={<Layers className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Điểm bán có POSM" value={loading ? '...' : uniqueOutlets.toLocaleString('vi-VN')} icon={<Store className="h-4 w-4" />} accent="red" />
        <KpiCard title="Số NPP quản lý" value={loading ? '...' : uniqueNpps.toLocaleString('vi-VN')} icon={<Box className="h-4 w-4" />} accent="amber" />
      </div>

      {tab === 'freezer' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EChartsCard title="Tủ Đông Theo Kênh Điểm Bán" subtitle="Phân bổ theo loại hình điểm bán" option={freezerChannelOption} height={250} loading={loading} gradientClass="grad-blue" badgeText="Channel" badgeClass="badge-pill badge-pill-blue" />
          <EChartsCard title="Tủ Đông Theo Dung Tích" subtitle="Nhóm dung tích tủ đông" option={freezerCapacityOption} height={250} loading={loading} gradientClass="grad-green" badgeText="Capacity" badgeClass="badge-pill badge-pill-green" />
          <EChartsCard title="Tủ Đông Theo Năm Sản Xuất" subtitle="Phân bổ theo Model Year" option={freezerYearOption} height={250} loading={loading} gradientClass="grad-purple" badgeText="Model Year" badgeClass="badge-pill badge-pill-purple" />
          <EChartsCard title="Hiệu Quả Doanh Số Điểm Có Tủ Đông" subtitle="Phân nhóm Tier doanh số" option={freezerTierOption} height={250} loading={loading} gradientClass="grad-orange" badgeText="Sales Tier" badgeClass="badge-pill badge-pill-orange" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EChartsCard title="Standee Theo Kênh Điểm Bán" subtitle="Phân bổ theo loại hình điểm bán" option={standeeChannelOption} height={250} loading={loading} gradientClass="grad-blue" badgeText="Channel" badgeClass="badge-pill badge-pill-blue" />
          <EChartsCard title="Standee Theo Loại Thiết Bị" subtitle="Phân loại Standee" option={standeeCategoryOption} height={250} loading={loading} gradientClass="grad-green" badgeText="Category" badgeClass="badge-pill badge-pill-green" />
          <EChartsCard title="Standee Theo Năm Sản Xuất" subtitle="Phân bổ theo Model Year" option={standeeYearOption} height={250} loading={loading} gradientClass="grad-purple" badgeText="Model Year" badgeClass="badge-pill badge-pill-purple" />
          <EChartsCard title="Hiệu Quả Doanh Số Điểm Có Standee" subtitle="Phân nhóm Tier doanh số" option={standeeTierOption} height={250} loading={loading} gradientClass="grad-orange" badgeText="Sales Tier" badgeClass="badge-pill badge-pill-orange" />
        </div>
      )}

      <div className="material-card p-4">
        <DataTable
          data={activeRows}
          columns={columns}
          searchPlaceholder="Tìm theo mã KH, tên điểm bán, NPP, QR..."
          searchFilter={(r, q) =>
            String(r.c_code || '').toLowerCase().includes(q) ||
            String(r.c_name || '').toLowerCase().includes(q) ||
            String(r.npp_name || '').toLowerCase().includes(q) ||
            String(r.qr || '').toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}
