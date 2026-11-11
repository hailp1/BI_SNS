import { useMemo } from 'react';
import { useFiltersStore } from '../../shared/stores/filters.store';

export interface GeoRecord {
  mien?: string;
  vung?: string;
  cluster?: string;
  office?: string;
  gsbh?: string;
  gsbh_name?: string;
  npp_code?: string;
  npp_name?: string;
  [key: string]: unknown;
}

interface GeoFilterBarProps {
  records: GeoRecord[];
}

export function GeoFilterBar({ records }: GeoFilterBarProps) {
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const setGeoFilter = useFiltersStore((s) => s.setGeoFilter);

  const miens = useMemo(
    () => Array.from(new Set(records.map((r) => String(r.mien || '')).filter(Boolean))).sort(),
    [records],
  );

  const vungs = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .filter((r) => geoMien === 'ALL' || r.mien === geoMien)
            .map((r) => String(r.vung || r.cluster || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [records, geoMien],
  );

  const gsbhs = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .filter(
              (r) =>
                (geoMien === 'ALL' || r.mien === geoMien) &&
                (geoVung === 'ALL' || r.vung === geoVung || r.cluster === geoVung),
            )
            .map((r) => String(r.office || r.gsbh || r.gsbh_name || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [records, geoMien, geoVung],
  );

  const npps = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (geoMien !== 'ALL' && r.mien !== geoMien) continue;
      if (geoVung !== 'ALL' && r.vung !== geoVung && r.cluster !== geoVung) continue;
      const g = String(r.office || r.gsbh || r.gsbh_name || '');
      if (geoGsbh !== 'ALL' && g !== geoGsbh) continue;
      if (r.npp_code) {
        map.set(String(r.npp_code), String(r.npp_name || r.npp_code));
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  }, [records, geoMien, geoVung, geoGsbh]);

  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <select
        value={geoMien}
        onChange={(e) => setGeoFilter('geoMien', e.target.value)}
        aria-label="Chọn Miền"
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="ALL">-- Tất cả Miền --</option>
        {miens.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={geoVung}
        onChange={(e) => setGeoFilter('geoVung', e.target.value)}
        aria-label="Chọn Vùng"
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="ALL">-- Tất cả Vùng --</option>
        {vungs.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <select
        value={geoGsbh}
        onChange={(e) => setGeoFilter('geoGsbh', e.target.value)}
        aria-label="Chọn GSBH"
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="ALL">-- Tất cả GSBH / Office --</option>
        {gsbhs.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        value={geoNpp}
        onChange={(e) => setGeoFilter('geoNpp', e.target.value)}
        aria-label="Chọn NPP"
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="ALL">-- Tất cả Nhà Phân Phối --</option>
        {npps.map(([code, name]) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </select>
    </div>
  );
}

