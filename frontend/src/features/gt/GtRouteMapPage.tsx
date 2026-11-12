import { ExternalLink, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useAuthStore } from '../../shared/stores/auth.store';

const GT_AREA_TO_VUNG_MAP: Record<string, string> = {
  'Hà Nội': 'Hà Nội',
  'Tây Bắc': 'Hà Nội',
  'Hải Phòng': 'Hải Phòng',
  'DH & BMT': 'Hải Phòng',
  'Đà Nẵng 1': 'Đà Nẵng',
  'Đà Nẵng 2': 'Đà Nẵng',
  'Đông Nam Bộ': 'Nha Trang',
  'Nha Trang': 'Nha Trang',
  HCM: 'HCM',
  'Cần Thơ': 'Cần Thơ',
  'Tiền Giang': 'Cần Thơ',
};

export function GtRouteMapPage() {
  const user = useAuthStore((s) => s.user);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (user) {
      const role = (user.role || '').toLowerCase();
      const scopeLvl = (user.scopeLevel || '').toLowerCase();
      const scopeVal = (user.scopeValue || '').trim();
      if (
        role !== 'admin' &&
        role !== 'bod' &&
        role !== 'director' &&
        scopeVal &&
        scopeVal.toLowerCase() !== 'all' &&
        scopeVal !== 'Toàn Quốc'
      ) {
        let vung = '';
        let area = '';
        let office = '';
        if (scopeLvl === 'office' || role === 'gsbh') {
          office = scopeVal;
        } else if (scopeLvl === 'area' || GT_AREA_TO_VUNG_MAP[scopeVal]) {
          area = scopeVal;
          vung = GT_AREA_TO_VUNG_MAP[scopeVal] || '';
        } else if (
          scopeLvl === 'vung' ||
          ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Nha Trang', 'HCM', 'Cần Thơ'].includes(scopeVal)
        ) {
          vung = scopeVal;
        } else {
          vung = scopeVal;
        }
        if (vung) params.set('vung', vung);
        if (area) params.set('area', area);
        if (office) params.set('office', office);
        if (role === 'rsm_north') params.set('mien', 'North');
        if (role === 'rsm_south') params.set('mien', 'South');
        params.set('lock', '1');
      }
    }
    params.set('v', '20261112c');
    return `/apps/routemap/?${params.toString()}`;
  }, [user]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#004B91]">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Bản Đồ Tuyến Bán Hàng &amp; Golden Store</h1>
            <p className="text-xs text-slate-500">
              Bản đồ điểm bán DMS, phân cụm Golden Store &amp; lộ trình tuyến trực quan
            </p>
          </div>
        </div>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#004B91] shadow-sm hover:bg-sky-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mở toàn màn hình
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          id="iframe-gt-routemap"
          title="Bản Đồ Tuyến Bán Hàng & Golden Store"
          src={iframeSrc}
          className="h-[calc(100vh-195px)] min-h-[680px] w-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}
