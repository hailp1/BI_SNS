import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { useAuthStore } from '../../shared/stores/auth.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';

type RouteTuple = unknown[];

interface OutletRow {
  code: string;
  name: string;
  lat: number;
  lon: number;
  salesman: string;
  distributor: string;
  area: string;
  office: string;
  freq: string;
  address: string;
  phone: string;
}

const MAX_MAP_POINTS = 600;

export function GtRouteMapPage() {
  const user = useAuthStore((s) => s.user);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_CUST_ROUTES));

  const [rawRoutes, setRawRoutes] = useState<RouteTuple[]>([]);
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedOffice, setSelectedOffice] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

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

  const areas = useMemo(
    () => Array.from(new Set(rawRoutes.map((r) => String(r[9] || '')).filter(Boolean))).sort(),
    [rawRoutes],
  );

  const offices = useMemo(
    () =>
      Array.from(
        new Set(
          rawRoutes
            .filter((r) => selectedArea === 'ALL' || String(r[9] || '') === selectedArea)
            .map((r) => String(r[10] || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [rawRoutes, selectedArea],
  );

  const filteredOutlets = useMemo<OutletRow[]>(() => {
    const dayColMap: Record<string, number> = {
      t2: 13,
      t3: 14,
      t4: 15,
      t5: 16,
      t6: 17,
      t7: 18,
      cn: 19,
    };

    const result: OutletRow[] = [];
    for (const r of rawRoutes) {
      if (selectedArea !== 'ALL' && String(r[9] || '') !== selectedArea) continue;
      if (selectedOffice !== 'ALL' && String(r[10] || '') !== selectedOffice) continue;
      if (selectedDay !== 'ALL' && !r[dayColMap[selectedDay]]) continue;
      const lat = Number(r[3]);
      const lon = Number(r[4]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) continue;
      result.push({
        code: String(r[1] || ''),
        name: String(r[2] || ''),
        lat,
        lon,
        salesman: String(r[5] || ''),
        distributor: String(r[6] || ''),
        area: String(r[9] || ''),
        office: String(r[10] || ''),
        freq: String(r[11] || ''),
        address: String(r[20] || ''),
        phone: String(r[21] || ''),
      });
    }
    return result;
  }, [rawRoutes, selectedArea, selectedOffice, selectedDay]);

  const visibleMarkers = useMemo(() => filteredOutlets.slice(0, MAX_MAP_POINTS), [filteredOutlets]);

  const columns: ColumnDef<OutletRow>[] = [
    { key: 'code', header: 'Mã KH', sortValue: (r) => r.code, render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'name', header: 'Tên cửa hàng', sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'distributor', header: 'NPP', sortValue: (r) => r.distributor, render: (r) => r.distributor },
    { key: 'salesman', header: 'NVBH', sortValue: (r) => r.salesman, render: (r) => r.salesman },
    { key: 'freq', header: 'Tần suất', render: (r) => r.freq },
    { key: 'address', header: 'Địa chỉ', render: (r) => <span className="max-w-xs truncate block">{r.address}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bản đồ Tuyến Bán Hàng GT (Route Map)</h1>
          <p className="text-xs text-slate-500">
            Hiển thị {visibleMarkers.length.toLocaleString('vi-VN')} / {filteredOutlets.length.toLocaleString('vi-VN')} điểm bán có tọa độ GPS hợp lệ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
        <select
          value={selectedArea}
          onChange={(e) => {
            setSelectedArea(e.target.value);
            setSelectedOffice('ALL');
          }}
          aria-label="Lọc Vùng Route"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Vùng --</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
          aria-label="Lọc Office Route"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Office --</option>
          {offices.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          aria-label="Lọc Ngày viếng thăm"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả ngày trong tuần --</option>
          <option value="t2">Thứ 2</option>
          <option value="t3">Thứ 3</option>
          <option value="t4">Thứ 4</option>
          <option value="t5">Thứ 5</option>
          <option value="t6">Thứ 6</option>
          <option value="t7">Thứ 7</option>
          <option value="cn">Chủ nhật</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-[420px] items-center justify-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4 animate-bounce text-red-600" />
            Đang giải mã dữ liệu tọa độ GT_CUST_ROUTES...
          </div>
        ) : (
          <MapContainer center={[16.047, 108.206]} zoom={6} className="h-[440px] w-full">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visibleMarkers.map((m, idx) => (
              <CircleMarker
                key={`${m.code}-${idx}`}
                center={[m.lat, m.lon]}
                radius={5}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.75, weight: 1 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{m.name}</p>
                    <p className="text-slate-600">Mã KH: {m.code}</p>
                    <p>NPP: {m.distributor}</p>
                    <p>NVBH: {m.salesman}</p>
                    <p className="text-slate-500">{m.address}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <DataTable
        data={filteredOutlets}
        columns={columns}
        searchPlaceholder="Tìm cửa hàng, địa chỉ, NVBH..."
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
