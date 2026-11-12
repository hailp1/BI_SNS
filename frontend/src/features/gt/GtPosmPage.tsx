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
  model_year?: number;
  qr?: string;
  qty?: number;
  channel_name?: string;
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

  const uniqueOutlets = useMemo(
    () => new Set(activeRows.map((r) => r.c_code).filter(Boolean)).size,
    [activeRows],
  );
  const uniqueNpps = useMemo(
    () => new Set(activeRows.map((r) => r.npp_code).filter(Boolean)).size,
    [activeRows],
  );

  const freezerByRegionOption = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredFreezers) {
      const k = r.vung || 'Khác';
      map.set(k, (map.get(k) || 0) + 1);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 48, right: 16, top: 20, bottom: 32 },
      xAxis: { type: 'category' as const, data: entries.map((e) => e[0]), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [{ name: 'Tủ Đông', type: 'bar' as const, data: entries.map((e) => e[1]), itemStyle: { color: 'rgba(255,255,255,0.9)', borderRadius: [3, 3, 0, 0] } }],
    };
  }, [filteredFreezers]);

  const standeeByRegionOption = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredStandees) {
      const k = r.vung || 'Khác';
      map.set(k, (map.get(k) || 0) + Number(r.qty || 1));
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 48, right: 16, top: 20, bottom: 32 },
      xAxis: { type: 'category' as const, data: entries.map((e) => e[0]), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [{ name: 'Standee', type: 'bar' as const, data: entries.map((e) => e[1]), itemStyle: { color: '#fde047', borderRadius: [3, 3, 0, 0] } }],
    };
  }, [filteredStandees]);

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
          <p className="text-xs text-slate-500">Theo dõi phân bổ thiết bị trưng bày tại điểm bán GT</p>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="Phân Bổ Tủ Đông Theo Vùng"
          subtitle="Số lượng tủ đông tại điểm bán"
          option={freezerByRegionOption}
          height={260}
          loading={loading}
          gradientClass="grad-blue"
          badgeText="Freezer"
          badgeClass="badge-pill badge-pill-blue"
        />
        <EChartsCard
          title="Phân Bổ Standee Theo Vùng"
          subtitle="Số lượng standee trưng bày"
          option={standeeByRegionOption}
          height={260}
          loading={loading}
          gradientClass="grad-green"
          badgeText="Standee"
          badgeClass="badge-pill badge-pill-green"
        />
      </div>

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
