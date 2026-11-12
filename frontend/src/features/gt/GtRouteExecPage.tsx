import { CheckCircle2, Map as MapIcon, Navigation, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtRouteRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  nvbh?: string;
  route?: string;
  total_mcp?: number;
  active_aso?: number;
  sellout_val?: number;
}

interface RouteSummaryAgg {
  route: string;
  nvbh: string;
  nppName: string;
  vung: string;
  mcp: number;
  aso: number;
  sellout: number;
  coverage: number;
}

export function GtRouteExecPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_ROUTE_SUMMARY));

  const [routeRows, setRouteRows] = useState<GtRouteRow[]>([]);

  useEffect(() => {
    let active = true;
    loadPayload('GT_ROUTE_SUMMARY', user).then((data) => {
      if (active && Array.isArray(data)) setRouteRows(data as GtRouteRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const { kpis, rows, byRegion } = useMemo(() => {
    const filtered = routeRows.filter(
      (r) =>
        String(r.year) === year &&
        matchMonthNum(r.month_num, selectedMonths) &&
        (geoMien === 'ALL' || r.mien === geoMien) &&
        (geoVung === 'ALL' || r.vung === geoVung) &&
        (geoGsbh === 'ALL' || r.gsbh === geoGsbh) &&
        (geoNpp === 'ALL' || r.npp_code === geoNpp),
    );

    const list: RouteSummaryAgg[] = filtered
      .map((r) => {
        const mcp = Number(r.total_mcp || 0);
        const aso = Number(r.active_aso || 0);
        return {
          route: r.route || 'N/A',
          nvbh: r.nvbh || 'N/A',
          nppName: r.npp_name || r.npp_code || '',
          vung: r.vung || 'Khác',
          mcp,
          aso,
          sellout: Number(r.sellout_val || 0),
          coverage: mcp > 0 ? (aso / mcp) * 100 : 0,
        };
      })
      .sort((a, b) => b.sellout - a.sellout);

    const regMap = new Map<string, { mcp: number; aso: number; sellout: number }>();
    for (const r of list) {
      const cur = regMap.get(r.vung) || { mcp: 0, aso: 0, sellout: 0 };
      cur.mcp += r.mcp;
      cur.aso += r.aso;
      cur.sellout += r.sellout;
      regMap.set(r.vung, cur);
    }

    const totalMcp = list.reduce((s, r) => s + r.mcp, 0);
    const totalAso = list.reduce((s, r) => s + r.aso, 0);
    const totalSellout = list.reduce((s, r) => s + r.sellout, 0);

    return {
      kpis: {
        routes: list.length,
        totalMcp,
        totalAso,
        totalSellout,
        coverage: totalMcp > 0 ? (totalAso / totalMcp) * 100 : 0,
      },
      rows: list,
      byRegion: Array.from(regMap.entries())
        .map(([vung, v]) => ({ vung, ...v, coverage: v.mcp > 0 ? (v.aso / v.mcp) * 100 : 0 }))
        .sort((a, b) => b.sellout - a.sellout),
    };
  }, [routeRows, year, selectedMonths, geoMien, geoVung, geoGsbh, geoNpp]);

  const routeChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['MCP', 'Active ASO'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 36, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: byRegion.map((r) => r.vung),
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        { name: 'MCP', type: 'bar' as const, data: byRegion.map((r) => r.mcp), itemStyle: { color: 'rgba(255,255,255,0.45)' } },
        { name: 'Active ASO', type: 'bar' as const, data: byRegion.map((r) => r.aso), itemStyle: { color: 'rgba(255,255,255,0.92)' } },
      ],
    }),
    [byRegion],
  );

  const covChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: byRegion.map((r) => r.vung),
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
      },
      yAxis: {
        type: 'value' as const,
        name: '%',
        nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        {
          name: '% Độ phủ tuyến',
          type: 'line' as const,
          smooth: true,
          data: byRegion.map((r) => Number(r.coverage.toFixed(1))),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 3, color: '#fde047' },
        },
      ],
    }),
    [byRegion],
  );

  const columns: ColumnDef<RouteSummaryAgg>[] = [
    { key: 'route', header: 'Tuyến (Route)', sortValue: (r) => r.route, render: (r) => <span className="font-semibold text-slate-900">{r.route}</span> },
    { key: 'nvbh', header: 'NVBH', sortValue: (r) => r.nvbh, render: (r) => r.nvbh },
    { key: 'npp', header: 'NPP', sortValue: (r) => r.nppName, render: (r) => r.nppName },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'mcp', header: 'MCP', align: 'right', sortValue: (r) => r.mcp, render: (r) => r.mcp.toLocaleString('vi-VN') },
    { key: 'aso', header: 'Active ASO', align: 'right', sortValue: (r) => r.aso, render: (r) => r.aso.toLocaleString('vi-VN') },
    { key: 'cov', header: '% Độ phủ', align: 'right', sortValue: (r) => r.coverage, render: (r) => formatPercent(r.coverage) },
    { key: 'sellout', header: 'Sell-out', align: 'right', sortValue: (r) => r.sellout, render: (r) => <span className="font-mono-num font-semibold">{formatCurrencyVnd(r.sellout)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">GT — Route &amp; Visit Execution</h1>
          <p className="text-xs text-slate-500">Hiệu suất thực thi tuyến bán hàng (MCP vs Active ASO)</p>
        </div>
        <ExportExcelButton
          filename={`GT_Route_Exec_${year}.xlsx`}
          sheetName="Route_Execution"
          rows={rows}
          columns={[
            { header: 'Route', key: 'route' },
            { header: 'NVBH', key: 'nvbh' },
            { header: 'NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'MCP', key: 'mcp' },
            { header: 'Active ASO', key: 'aso' },
            { header: '% Độ phủ', key: (r) => Number(r.coverage.toFixed(1)) },
            { header: 'Sell-out', key: 'sellout' },
          ]}
        />
      </div>

      <GeoFilterBar records={routeRows} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Tổng số Tuyến" value={loading ? '...' : kpis.routes.toLocaleString('vi-VN')} icon={<MapIcon className="h-4 w-4" />} accent="red" />
        <KpiCard title="Tổng MCP / Active ASO" value={loading ? '...' : `${kpis.totalMcp.toLocaleString('vi-VN')} / ${kpis.totalAso.toLocaleString('vi-VN')}`} icon={<Navigation className="h-4 w-4" />} accent="blue" />
        <KpiCard title="Tỷ lệ Phủ Tuyến" value={loading ? '...' : formatPercent(kpis.coverage)} icon={<CheckCircle2 className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Sell-out Theo Tuyến" value={loading ? '...' : formatCurrencyVnd(kpis.totalSellout)} icon={<ShoppingCart className="h-4 w-4" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="MCP vs Active ASO Theo Vùng"
          subtitle="So sánh điểm bán kế hoạch và điểm bán phát sinh đơn"
          option={routeChartOption}
          height={280}
          loading={loading}
          gradientClass="grad-purple"
          badgeText="Route Coverage"
          badgeClass="badge-pill badge-pill-purple"
        />
        <EChartsCard
          title="Tỷ Lệ Độ Phủ Tuyến (%) Theo Vùng"
          subtitle="Active ASO / MCP (%)"
          option={covChartOption}
          height={280}
          loading={loading}
          gradientClass="grad-orange"
          badgeText="Execution %"
          badgeClass="badge-pill badge-pill-orange"
        />
      </div>

      <div className="material-card p-4">
        <DataTable
          data={rows}
          columns={columns}
          searchPlaceholder="Tìm theo tuyến, NVBH, NPP..."
          searchFilter={(r, q) =>
            r.route.toLowerCase().includes(q) || r.nvbh.toLowerCase().includes(q) || r.nppName.toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}

