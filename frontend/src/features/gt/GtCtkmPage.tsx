import { Gift, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd } from '../../shared/utils/format';

interface CustProdSaleRaw {
  year?: string;
  month_num?: number | string;
  npp_code?: string;
  npp_name?: string;
  cust_code?: string;
  cust_name?: string;
  sku?: string;
  sku_name?: string;
  cate?: string;
  sellout_val?: number;
  promo_val?: number;
}

export function GtCtkmPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_CUST_PROD_SALES));

  const [sales, setSales] = useState<CustProdSaleRaw[]>([]);

  useEffect(() => {
    let active = true;
    loadPayload('GT_CUST_PROD_SALES', user).then((data) => {
      if (active && Array.isArray(data)) setSales(data as CustProdSaleRaw[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const filtered = useMemo(
    () =>
      sales.filter(
        (r) =>
          (!r.year || String(r.year) === year) &&
          (!r.month_num || matchMonthNum(r.month_num, selectedMonths)),
      ),
    [sales, year, selectedMonths],
  );

  const totalSellout = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.sellout_val) || 0), 0),
    [filtered],
  );

  const columns: ColumnDef<CustProdSaleRaw>[] = [
    { key: 'npp_name', header: 'NPP', render: (r) => r.npp_name || r.npp_code || '-' },
    { key: 'cust_name', header: 'Khách hàng / Điểm bán', render: (r) => <span className="font-semibold">{r.cust_name || r.cust_code || '-'}</span> },
    { key: 'sku_name', header: 'Sản phẩm / SKU', render: (r) => r.sku_name || r.sku || '-' },
    { key: 'cate', header: 'Ngành hàng', render: (r) => r.cate || '-' },
    { key: 'sellout_val', header: 'Doanh số', align: 'right', sortValue: (r) => Number(r.sellout_val) || 0, render: (r) => formatCurrencyVnd(r.sellout_val) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Theo dõi Chương trình Khuyến mãi & Điểm bán GT</h1>
          <p className="text-xs text-slate-500">Chi tiết sức mua theo Điểm bán và SKU (GT_CUST_PROD_SALES)</p>
        </div>
        <ExportExcelButton
          filename={`CJ_GT_CTKM_${year}.xlsx`}
          sheetName="GT_CTKM"
          rows={filtered.slice(0, 5000)}
          columns={[
            { header: 'NPP', key: (r) => String(r.npp_name || r.npp_code || '') },
            { header: 'Khách hàng', key: (r) => String(r.cust_name || r.cust_code || '') },
            { header: 'SKU', key: (r) => String(r.sku_name || r.sku || '') },
            { header: 'Ngành hàng', key: (r) => String(r.cate || '') },
            { header: 'Doanh số', key: (r) => Math.round(Number(r.sellout_val) || 0) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Tổng doanh số Khách hàng GT"
          value={loading ? '...' : formatCurrencyVnd(totalSellout)}
          subtitle={`${filtered.length.toLocaleString('vi-VN')} giao dịch SKU-Điểm bán`}
          accent="red"
          icon={<Tag className="h-5 w-5" />}
        />
        <KpiCard
          title="Độ phủ Điểm bán & SKU"
          value={filtered.length.toLocaleString('vi-VN')}
          subtitle="Dữ liệu bảo vệ RLS theo phạm vi tài khoản"
          accent="amber"
          icon={<Gift className="h-5 w-5" />}
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Tìm điểm bán, NPP, SKU..."
        searchFilter={(r, q) =>
          String(r.cust_name || '').toLowerCase().includes(q) ||
          String(r.npp_name || '').toLowerCase().includes(q) ||
          String(r.sku_name || '').toLowerCase().includes(q)
        }
      />
    </div>
  );
}

