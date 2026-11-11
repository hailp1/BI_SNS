import { FileSpreadsheet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import type { SellinRecord } from '../../shared/types/sales';
import { formatCurrencyVnd } from '../../shared/utils/format';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);

  const [channel, setChannel] = useState('ALL');
  const [rows, setRows] = useState<SellinRecord[]>([]);

  useEffect(() => {
    let active = true;
    loadPayload('SELLIN_M', user).then((data) => {
      if (active && Array.isArray(data)) setRows(data as SellinRecord[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          String(r.year) === year &&
          matchMonthNum(r.month_num, selectedMonths) &&
          (channel === 'ALL' || r.channel === channel),
      ),
    [rows, year, selectedMonths, channel],
  );

  const columns: ColumnDef<SellinRecord>[] = [
    { key: 'channel', header: 'Kênh', render: (r) => r.channel || '-' },
    { key: 'sub_channel', header: 'Phân kênh', render: (r) => r.sub_channel || '-' },
    { key: 'account_name', header: 'Tài khoản / NPP', render: (r) => r.account_name || r.account_code || '-' },
    { key: 'cate', header: 'Ngành hàng', render: (r) => r.cate || '-' },
    { key: 'sku_name', header: 'SKU', render: (r) => r.sku_name || r.sku || '-' },
    {
      key: 'sellin_val',
      header: 'Doanh số Sell-in',
      align: 'right',
      sortValue: (r) => Number(r.sellin_val) || 0,
      render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.sellin_val)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Trung tâm Báo cáo & Xuất dữ liệu Excel</h1>
            <p className="text-xs text-slate-500">Xuất báo cáo chi tiết đa kênh chuẩn ExcelJS (Áp dụng bảo mật RLS)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            aria-label="Chọn kênh xuất báo cáo"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">Tất cả Kênh</option>
            <option value="GT">GT</option>
            <option value="MT">MT</option>
            <option value="B2B">B2B</option>
            <option value="KR">KR</option>
          </select>
          <ExportExcelButton
            filename={`CJ_BaoCao_${channel}_${year}.xlsx`}
            sheetName="Sellin_Detail"
            rows={filtered.slice(0, 10000)}
            columns={[
              { header: 'Năm', key: 'year' },
              { header: 'Tháng', key: (r) => Number(r.month_num) },
              { header: 'Kênh', key: (r) => String(r.channel || '') },
              { header: 'Phân kênh', key: (r) => String(r.sub_channel || '') },
              { header: 'Tài khoản / NPP', key: (r) => String(r.account_name || r.account_code || '') },
              { header: 'Ngành hàng', key: (r) => String(r.cate || '') },
              { header: 'SKU', key: (r) => String(r.sku_name || r.sku || '') },
              { header: 'Doanh số (VNĐ)', key: (r) => Math.round(Number(r.sellin_val) || 0) },
            ]}
          />
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Tìm tài khoản, SKU, ngành hàng..."
        searchFilter={(r, q) =>
          String(r.account_name || '').toLowerCase().includes(q) ||
          String(r.sku_name || '').toLowerCase().includes(q) ||
          String(r.cate || '').toLowerCase().includes(q)
        }
      />
    </div>
  );
}

