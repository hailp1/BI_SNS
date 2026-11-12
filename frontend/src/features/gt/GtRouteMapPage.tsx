import { MapPin, Route, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd } from '../../shared/utils/format';

type RouteTuple = unknown[];

interface OutletRow {
  code: string;
  name: string;
  address: string;
  route: string;
  salesman: string;
  distributor: string;
  nppCode: string;
  gsbh: string;
  vung: string;
  mien: string;
  isActive: boolean;
  sellout: number;
  freq: string;
  daysStr: string;
}

export function GtRouteMapPage() {
  const user = useAuthStore((s) => s.user);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_CUST_ROUTES));

  const [rawRoutes, setRawRoutes] = useState<RouteTuple[]>([]);
  const [selectedMien, setSelectedMien] = useState('ALL');
  const [selectedVung, setSelectedVung] = useState('ALL');
  const [selectedNpp, setSelectedNpp] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');

  useEffect(() => {
    let active = true;
    loadPayload('GT_CUST_ROUTES', user).then((data) => {
      if (active && Array.isArray(data)) {
        setRawRoutes(data as RouteTuple[]);
      }
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  // GT_CUST_ROUTES tuple order from PostgreSQL DatamartService:
  // [0]month, [1]c_code, [2]c_name, [3]addr, [4]route, [5]nvbh, [6]npp_name,
  // [7]npp_code, [8]gsbh, [9]vung, [10]mien, [11]is_active, [12]sellout,
  // [13]freq, [14]week_type, [15]days_str, [16]emp_code, [17]is_target
  const miens = useMemo(
    () => Array.from(new Set(rawRoutes.map((r) => String(r[10] || '')).filter(Boolean))).sort(),
    [rawRoutes],
  );

  const vungs = useMemo(
    () =>
      Array.from(
        new Set(
          rawRoutes
            .filter((r) => selectedMien === 'ALL' || String(r[10] || '') === selectedMien)
            .map((r) => String(r[9] || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [rawRoutes, selectedMien],
  );

  const npps = useMemo(
    () =>
      Array.from(
        new Set(
          rawRoutes
            .filter(
              (r) =>
                (selectedMien === 'ALL' || String(r[10] || '') === selectedMien) &&
                (selectedVung === 'ALL' || String(r[9] || '') === selectedVung),
            )
            .map((r) => String(r[6] || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [rawRoutes, selectedMien, selectedVung],
  );

  const filteredOutlets = useMemo<OutletRow[]>(() => {
    const result: OutletRow[] = [];
    for (const r of rawRoutes) {
      const mien = String(r[10] || '');
      const vung = String(r[9] || '');
      const nppName = String(r[6] || '');
      const daysStr = String(r[15] || '');

      if (selectedMien !== 'ALL' && mien !== selectedMien) continue;
      if (selectedVung !== 'ALL' && vung !== selectedVung) continue;
      if (selectedNpp !== 'ALL' && nppName !== selectedNpp) continue;
      if (selectedDay !== 'ALL' && !daysStr.toUpperCase().includes(selectedDay)) continue;

      result.push({
        code: String(r[1] || ''),
        name: String(r[2] || ''),
        address: String(r[3] || ''),
        route: String(r[4] || ''),
        salesman: String(r[5] || ''),
        distributor: nppName,
        nppCode: String(r[7] || ''),
        gsbh: String(r[8] || ''),
        vung,
        mien,
        isActive: Number(r[11]) === 1,
        sellout: Number(r[12]) || 0,
        freq: String(r[13] || ''),
        daysStr,
      });
    }
    return result;
  }, [rawRoutes, selectedMien, selectedVung, selectedNpp, selectedDay]);

  const activeCount = useMemo(() => filteredOutlets.filter((o) => o.isActive).length, [filteredOutlets]);
  const routeCount = useMemo(
    () => new Set(filteredOutlets.map((o) => `${o.nppCode}|${o.route}`).filter(Boolean)).size,
    [filteredOutlets],
  );

  const columns: ColumnDef<OutletRow>[] = [
    { key: 'code', header: 'Mã KH', sortValue: (r) => r.code, render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'name', header: 'Tên Điểm bán', sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'distributor', header: 'NPP', sortValue: (r) => r.distributor, render: (r) => r.distributor },
    { key: 'salesman', header: 'NVBH', sortValue: (r) => r.salesman, render: (r) => r.salesman },
    { key: 'route', header: 'Tuyến', sortValue: (r) => r.route, render: (r) => r.route },
    { key: 'daysStr', header: 'Thứ viếng thăm', render: (r) => r.daysStr || '-' },
    { key: 'sellout', header: 'Sell-out', align: 'right', sortValue: (r) => r.sellout, render: (r) => formatCurrencyVnd(r.sellout) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tuyến Bán Hàng GT (MCP & Route Map)</h1>
          <p className="text-xs text-slate-500">
            Hiển thị {filteredOutlets.length.toLocaleString('vi-VN')} điểm bán thuộc {routeCount.toLocaleString('vi-VN')} tuyến DMS
          </p>
        </div>
        <ExportExcelButton
          filename="CJ_GT_Routes.xlsx"
          sheetName="GT_Routes"
          rows={filteredOutlets.slice(0, 5000)}
          columns={[
            { header: 'Mã KH', key: 'code' },
            { header: 'Tên Điểm bán', key: 'name' },
            { header: 'NPP', key: 'distributor' },
            { header: 'NVBH', key: 'salesman' },
            { header: 'Tuyến', key: 'route' },
            { header: 'Thứ', key: 'daysStr' },
            { header: 'Địa chỉ', key: 'address' },
            { header: 'Sell-out', key: (r) => Math.round(r.sellout) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Tổng Điểm bán (MCP)"
          value={loading ? '...' : filteredOutlets.length.toLocaleString('vi-VN')}
          subtitle="Điểm bán theo phạm vi phân quyền"
          accent="blue"
          icon={<MapPin className="h-5 w-5" />}
        />
        <KpiCard
          title="Điểm bán Active"
          value={loading ? '...' : activeCount.toLocaleString('vi-VN')}
          subtitle="Có phát sinh đơn hàng"
          accent="emerald"
          icon={<Store className="h-5 w-5" />}
        />
        <KpiCard
          title="Tổng số Tuyến"
          value={loading ? '...' : routeCount.toLocaleString('vi-VN')}
          subtitle="Số tuyến bán hàng đang quản lý"
          accent="amber"
          icon={<Route className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4">
        <select
          value={selectedMien}
          onChange={(e) => {
            setSelectedMien(e.target.value);
            setSelectedVung('ALL');
            setSelectedNpp('ALL');
          }}
          aria-label="Lọc Miền"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Miền --</option>
          {miens.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={selectedVung}
          onChange={(e) => {
            setSelectedVung(e.target.value);
            setSelectedNpp('ALL');
          }}
          aria-label="Lọc Vùng"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Vùng --</option>
          {vungs.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <select
          value={selectedNpp}
          onChange={(e) => setSelectedNpp(e.target.value)}
          aria-label="Lọc NPP"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả NPP --</option>
          {npps.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          aria-label="Lọc Thứ viếng thăm"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả các thứ --</option>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <DataTable
        data={filteredOutlets.slice(0, 1000)}
        columns={columns}
        searchPlaceholder="Tìm mã KH, tên cửa hàng, NVBH, địa chỉ..."
        searchFilter={(r, q) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.salesman.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
        }
      />
    </div>
  );
}
