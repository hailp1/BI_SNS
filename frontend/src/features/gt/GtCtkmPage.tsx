import { ExternalLink, Gift, RefreshCw, Table, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../shared/api/dashboard.api';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useFiltersStore } from '../../shared/stores/filters.store';

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

type CtkmRow = Record<string, unknown>;

export function GtCtkmPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const [viewMode, setViewMode] = useState<'app' | 'data'>('app');
  const [rawTab, setRawTab] = useState<'tien' | 'hang'>('tien');
  const [iframeKey, setIframeKey] = useState(0);

  const ctkmQuery = useQuery({
    queryKey: ['sales-apps-ctkm'],
    queryFn: () => dashboardApi.getCtkmData(),
    enabled: viewMode === 'data',
  });

  const tienRows = useMemo(() => (ctkmQuery.data?.tien_data || []) as CtkmRow[], [ctkmQuery.data]);
  const hangRows = useMemo(() => (ctkmQuery.data?.hang_data || []) as CtkmRow[], [ctkmQuery.data]);
  const activeRows = rawTab === 'tien' ? tienRows : hangRows;

  const columns = useMemo<ColumnDef<CtkmRow>[]>(() => {
    const sample = activeRows[0];
    if (!sample) return [];
    const keys = Object.keys(sample).slice(0, 10);
    return keys.map((k) => ({
      key: k,
      header: k.replace(/_/g, ' ').toUpperCase(),
      sortValue: (r) => {
        const v = r[k];
        return typeof v === 'number' ? v : String(v ?? '');
      },
      render: (r) => {
        const v = r[k];
        if (typeof v === 'number') return v.toLocaleString('vi-VN');
        return String(v ?? '-');
      },
    }));
  }, [activeRows]);

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
    return `/apps/ctkm/?${params.toString()}`;
  }, [user]);

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-sm">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              Theo Dõi Chương Trình Khuyến Mãi (CTKM) &amp; Trả Thưởng
            </h1>
            <p className="text-xs text-slate-500">
              Biểu đồ phân tích lý do pending, xu hướng theo kỳ, phân bổ vùng miền và tiến độ giải ngân claim CTKM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch View Mode: App (Full Charts) vs Data Table */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('app')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                viewMode === 'app' ? 'bg-[#004B91] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📊</span>
              <span>Ứng Dụng Biểu Đồ &amp; Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('data')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                viewMode === 'data' ? 'bg-[#004B91] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Dữ Liệu Chi Tiết (DB)</span>
            </button>
          </div>

          {viewMode === 'app' && (
            <>
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
                title="Tải lại ứng dụng CTKM"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Làm mới</span>
              </button>
              <a
                href={iframeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#004B91] shadow-xs hover:bg-sky-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Toàn màn hình</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'app' ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ height: 'clamp(580px, calc(100vh - 175px), 960px)', minHeight: '580px' }}>
          <iframe
            key={iframeKey}
            id="iframe-gt-ctkm"
            title="Theo Dõi Chương Trình Khuyến Mãi (CTKM)"
            src={iframeSrc}
            className="h-full w-full border-0"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawTab('tien')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  rawTab === 'tien' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                CTKM Tiền ({tienRows.length})
              </button>
              <button
                type="button"
                onClick={() => setRawTab('hang')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  rawTab === 'hang' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                CTKM Hàng ({hangRows.length})
              </button>
            </div>
            <ExportExcelButton<CtkmRow>
              filename={`CJ_GT_CTKM_${rawTab}_${year}.xlsx`}
              sheetName={rawTab === 'tien' ? 'CTKM_Tien' : 'CTKM_Hang'}
              rows={activeRows.slice(0, 5000)}
              columns={columns.map((c) => ({ header: c.header, key: (r: CtkmRow) => String(r[c.key] ?? '') }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              title="CTKM Trả Tiền (Tiền)"
              value={ctkmQuery.isLoading ? '...' : tienRows.length.toLocaleString('vi-VN')}
              subtitle="Số dòng chương trình trả thưởng tiền"
              accent="red"
              icon={<Tag className="h-5 w-5" />}
            />
            <KpiCard
              title="CTKM Tặng Hàng (Hàng)"
              value={ctkmQuery.isLoading ? '...' : hangRows.length.toLocaleString('vi-VN')}
              subtitle="Số dòng chương trình tặng hàng"
              accent="amber"
              icon={<Gift className="h-5 w-5" />}
            />
          </div>

          <div className="material-card p-4">
            <DataTable
              data={activeRows.slice(0, 2000)}
              columns={columns}
              searchPlaceholder="Tìm kiếm trong dữ liệu CTKM..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
