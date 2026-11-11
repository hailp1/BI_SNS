import { Activity, DollarSign, Store, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent, getAchievementBadgeColor } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtTreeRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sellout_val?: number;
  sellin_val?: number;
  target_so?: number;
  aso?: number;
  mcp?: number;
}

interface NppSummaryRow {
  nppCode: string;
  nppName: string;
  vung: string;
  gsbh: string;
  sellout: number;
  target: number;
  lySellout: number;
  achievement: number;
  yoy: number;
}

export function GtOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_TREE));

  const [gtTree, setGtTree] = useState<GtTreeRow[]>([]);
  const [asoCount, setAsoCount] = useState(0);
  const [mcpCount, setMcpCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('GT_TREE', user),
      loadPayload('GT_ASO_M', user),
      loadPayload('GT_MCP_M', user),
    ]).then(([tree, aso, mcp]) => {
      if (!active) return;
      if (Array.isArray(tree)) setGtTree(tree as GtTreeRow[]);
      if (Array.isArray(aso)) setAsoCount(aso.length);
      if (Array.isArray(mcp)) setMcpCount(mcp.length);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const { totals, regionBars, nppRows } = useMemo(() => {
    const matchesGeo = (r: GtTreeRow) => {
      if (geoMien !== 'ALL' && r.mien !== geoMien) return false;
      if (geoVung !== 'ALL' && r.vung !== geoVung && r.cluster !== geoVung) return false;
      const g = String(r.office || r.gsbh || r.gsbh_name || '');
      if (geoGsbh !== 'ALL' && g !== geoGsbh) return false;
      if (geoNpp !== 'ALL' && String(r.npp_code || '') !== geoNpp) return false;
      return true;
    };

    const lyYear = String(parseInt(year, 10) - 1);
    let sellout = 0;
    let lySellout = 0;
    let target = 0;

    const regMap = new Map<string, number>();
    const nppMap = new Map<string, NppSummaryRow>();

    for (const r of gtTree) {
      if (!matchMonthNum(r.month_num, selectedMonths) || !matchesGeo(r)) continue;
      const rYear = String(r.year || '');
      const val = Number(r.sellout_val) || 0;
      const tgt = Number(r.target_so) || 0;
      const code = String(r.npp_code || 'UNKNOWN');

      if (!nppMap.has(code)) {
        nppMap.set(code, {
          nppCode: code,
          nppName: String(r.npp_name || code),
          vung: String(r.vung || r.cluster || '-'),
          gsbh: String(r.office || r.gsbh_name || r.gsbh || '-'),
          sellout: 0,
          target: 0,
          lySellout: 0,
          achievement: 0,
          yoy: 0,
        });
      }
      const entry = nppMap.get(code)!;

      if (rYear === year) {
        sellout += val;
        target += tgt;
        entry.sellout += val;
        entry.target += tgt;
        const reg = String(r.vung || r.mien || 'Khác');
        regMap.set(reg, (regMap.get(reg) || 0) + val);
      } else if (rYear === lyYear) {
        lySellout += val;
        entry.lySellout += val;
      }
    }

    const rows = Array.from(nppMap.values())
      .map((item) => ({
        ...item,
        achievement: item.target > 0 ? (item.sellout / item.target) * 100 : 0,
        yoy: item.lySellout > 0 ? ((item.sellout - item.lySellout) / item.lySellout) * 100 : 0,
      }))
      .filter((x) => x.sellout > 0 || x.lySellout > 0 || x.target > 0);

    const bars = Array.from(regMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totals: {
        sellout,
        lySellout,
        target,
        achievement: target > 0 ? (sellout / target) * 100 : 0,
        yoy: lySellout > 0 ? ((sellout - lySellout) / lySellout) * 100 : 0,
      },
      regionBars: bars,
      nppRows: rows,
    };
  }, [gtTree, year, selectedMonths, geoMien, geoVung, geoGsbh, geoNpp]);

  const regionChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      grid: { left: 60, right: 20, top: 20, bottom: 48 },
      xAxis: {
        type: 'category' as const,
        data: regionBars.map((b) => b.name),
        axisLabel: { rotate: 20, fontSize: 11 },
      },
      yAxis: { type: 'value' as const, name: 'Triệu VNĐ' },
      series: [
        {
          name: 'Sell-out',
          type: 'bar' as const,
          data: regionBars.map((b) => Math.round(b.value / 1e6)),
          itemStyle: { color: '#dc2626', borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [regionBars],
  );

  const columns: ColumnDef<NppSummaryRow>[] = [
    {
      key: 'nppName',
      header: 'Nhà Phân Phối',
      sortValue: (r) => r.nppName,
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.nppName}</p>
          <p className="text-[11px] text-slate-400">{r.nppCode}</p>
        </div>
      ),
    },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'gsbh', header: 'GSBH / Office', sortValue: (r) => r.gsbh, render: (r) => r.gsbh },
    {
      key: 'sellout',
      header: 'Sell-out',
      align: 'right',
      sortValue: (r) => r.sellout,
      render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.sellout)}</span>,
    },
    {
      key: 'target',
      header: 'Mục tiêu',
      align: 'right',
      sortValue: (r) => r.target,
      render: (r) => formatCurrencyVnd(r.target),
    },
    {
      key: 'achievement',
      header: '% Đạt',
      align: 'center',
      sortValue: (r) => r.achievement,
      render: (r) => (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${getAchievementBadgeColor(r.achievement)}`}>
          {formatPercent(r.achievement)}
        </span>
      ),
    },
    {
      key: 'yoy',
      header: 'YoY',
      align: 'right',
      sortValue: (r) => r.yoy,
      render: (r) => (
        <span className={r.yoy >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
          {formatPercent(r.yoy, true)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kênh GT — Điều hành Hệ thống Nhà Phân Phối</h1>
          <p className="text-xs text-slate-500">Tổng hợp Sell-out, ASO/MCP và hiệu suất từng Nhà Phân Phối (RLS)</p>
        </div>
        <ExportExcelButton
          filename={`CJ_GT_NPP_${year}.xlsx`}
          sheetName="GT_NPP"
          rows={nppRows}
          columns={[
            { header: 'Mã NPP', key: 'nppCode' },
            { header: 'Tên NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'GSBH', key: 'gsbh' },
            { header: 'Sell-out (VNĐ)', key: (r) => Math.round(r.sellout) },
            { header: 'Target (VNĐ)', key: (r) => Math.round(r.target) },
            { header: '% Đạt', key: (r) => Number(r.achievement.toFixed(1)) },
            { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
          ]}
        />
      </div>

      <GeoFilterBar records={gtTree} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="GT Sell-out"
          value={loading ? '...' : formatCurrencyVnd(totals.sellout)}
          subtitle={`Cùng kỳ: ${formatCurrencyVnd(totals.lySellout)}`}
          badge={formatPercent(totals.yoy, true)}
          badgeTone={totals.yoy >= 0 ? 'positive' : 'negative'}
          accent="red"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Mục tiêu GT"
          value={loading ? '...' : formatCurrencyVnd(totals.target)}
          subtitle={`Số NPP hoạt động: ${nppRows.length}`}
          badge={formatPercent(totals.achievement)}
          badgeTone={totals.achievement >= 100 ? 'positive' : 'negative'}
          accent="emerald"
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="Bản ghi ASO"
          value={asoCount.toLocaleString('vi-VN')}
          subtitle="Active Selling Outlets"
          accent="blue"
          icon={<Store className="h-5 w-5" />}
        />
        <KpiCard
          title="Bản ghi MCP"
          value={mcpCount.toLocaleString('vi-VN')}
          subtitle="Master Call Plan Coverage"
          accent="amber"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <EChartsCard
        title="Doanh số Sell-out GT theo Vùng"
        subtitle="Đơn vị: Triệu VNĐ"
        option={regionChartOption}
        loading={loading}
      />

      <DataTable
        data={nppRows}
        columns={columns}
        searchPlaceholder="Tìm mã NPP, tên NPP, GSBH..."
        searchFilter={(r, q) =>
          r.nppName.toLowerCase().includes(q) ||
          r.nppCode.toLowerCase().includes(q) ||
          r.gsbh.toLowerCase().includes(q)
        }
      />
    </div>
  );
}
