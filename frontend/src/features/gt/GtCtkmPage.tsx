import { useQuery } from '@tanstack/react-query';
import { Gift, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { dashboardApi } from '../../shared/api/dashboard.api';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useFiltersStore } from '../../shared/stores/filters.store';

type CtkmRow = Record<string, unknown>;

export function GtCtkmPage() {
  const year = useFiltersStore((s) => s.year);
  const [activeTab, setActiveTab] = useState<'tien' | 'hang'>('tien');

  const ctkmQuery = useQuery({
    queryKey: ['sales-apps-ctkm'],
    queryFn: () => dashboardApi.getCtkmData(),
  });

  const tienRows = useMemo(() => (ctkmQuery.data?.tien_data || []) as CtkmRow[], [ctkmQuery.data]);
  const hangRows = useMemo(() => (ctkmQuery.data?.hang_data || []) as CtkmRow[], [ctkmQuery.data]);
  const activeRows = activeTab === 'tien' ? tienRows : hangRows;

  const columns = useMemo<ColumnDef<CtkmRow>[]>(() => {
    const sample = activeRows[0];
    if (!sample) return [];
    const keys = Object.keys(sample).slice(0, 8);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Theo dõi Chương trình Khuyến mãi (CTKM)</h1>
          <p className="text-xs text-slate-500">Dữ liệu đồng bộ PostgreSQL (/api/v1/sales/apps/ctkm) với phân quyền RLS</p>
        </div>
        <ExportExcelButton<CtkmRow>
          filename={`CJ_GT_CTKM_${activeTab}_${year}.xlsx`}
          sheetName={activeTab === 'tien' ? 'CTKM_Tien' : 'CTKM_Hang'}
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('tien')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            activeTab === 'tien' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          CTKM Tiền ({tienRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hang')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            activeTab === 'hang' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          CTKM Hàng ({hangRows.length})
        </button>
      </div>

      <DataTable
        data={activeRows.slice(0, 2000)}
        columns={columns}
        searchPlaceholder="Tìm kiếm trong dữ liệu CTKM..."
        searchFilter={(r, q) =>
          Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
        }
      />
    </div>
  );
}
