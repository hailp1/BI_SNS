import { Boxes, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { getActiveApiMonth, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd } from '../../shared/utils/format';

interface GtStockRaw {
  month?: string;
  npp_code?: string;
  npp_name?: string;
  vung?: string;
  mien?: string;
  sku?: string;
  sku_name?: string;
  cate?: string;
  stock_val?: number;
  stock_qty?: number;
}

interface StockRow {
  nppCode: string;
  nppName: string;
  vung: string;
  stockVal: number;
  stockQty: number;
  skuCount: number;
}

export function GtStockPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_STOCK));

  const [stockRaw, setStockRaw] = useState<GtStockRaw[]>([]);
  const activeMonth = useMemo(() => getActiveApiMonth(year, selectedMonths), [year, selectedMonths]);

  useEffect(() => {
    let active = true;
    loadPayload('GT_STOCK', user).then((data) => {
      if (active && Array.isArray(data)) setStockRaw(data as GtStockRaw[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const { latestMonth, rows, totalStockVal, totalQty } = useMemo(() => {
    const months = Array.from(new Set(stockRaw.map((d) => String(d.month || '')).filter(Boolean))).sort();
    const eligible = months.filter((m) => m <= activeMonth);
    const chosenMonth = eligible.length > 0 ? eligible[eligible.length - 1] : months[months.length - 1] || activeMonth;

    const map = new Map<string, { row: StockRow; skus: Set<string> }>();
    let totalVal = 0;
    let totalQ = 0;

    for (const d of stockRaw) {
      if (d.month && d.month !== chosenMonth) continue;
      const code = String(d.npp_code || 'UNKNOWN');
      const val = Number(d.stock_val) || 0;
      const qty = Number(d.stock_qty) || 0;
      totalVal += val;
      totalQ += qty;

      if (!map.has(code)) {
        map.set(code, {
          row: {
            nppCode: code,
            nppName: String(d.npp_name || code),
            vung: String(d.vung || d.mien || '-'),
            stockVal: 0,
            stockQty: 0,
            skuCount: 0,
          },
          skus: new Set<string>(),
        });
      }
      const entry = map.get(code)!;
      entry.row.stockVal += val;
      entry.row.stockQty += qty;
      if (d.sku || d.sku_name) entry.skus.add(String(d.sku || d.sku_name));
    }

    const list = Array.from(map.values()).map(({ row, skus }) => ({
      ...row,
      skuCount: skus.size,
    }));

    return { latestMonth: chosenMonth, rows: list, totalStockVal: totalVal, totalQty: totalQ };
  }, [stockRaw, activeMonth]);

  const columns: ColumnDef<StockRow>[] = [
    { key: 'nppCode', header: 'Mã NPP', sortValue: (r) => r.nppCode, render: (r) => <span className="font-mono text-xs">{r.nppCode}</span> },
    { key: 'nppName', header: 'Tên Nhà Phân Phối', sortValue: (r) => r.nppName, render: (r) => <span className="font-semibold">{r.nppName}</span> },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'skuCount', header: 'Số SKU tồn', align: 'right', sortValue: (r) => r.skuCount, render: (r) => r.skuCount },
    { key: 'stockQty', header: 'Sản lượng tồn', align: 'right', sortValue: (r) => r.stockQty, render: (r) => r.stockQty.toLocaleString('vi-VN') },
    { key: 'stockVal', header: 'Giá trị tồn kho', align: 'right', sortValue: (r) => r.stockVal, render: (r) => <span className="font-semibold text-slate-900">{formatCurrencyVnd(r.stockVal)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tồn kho Nhà Phân Phối GT (Stock Snapshot)</h1>
          <p className="text-xs text-slate-500">Kỳ tồn kho gần nhất: {latestMonth}</p>
        </div>
        <ExportExcelButton
          filename={`CJ_GT_Stock_${latestMonth}.xlsx`}
          sheetName="GT_Stock"
          rows={rows}
          columns={[
            { header: 'Mã NPP', key: 'nppCode' },
            { header: 'Tên NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'Số SKU', key: 'skuCount' },
            { header: 'Sản lượng tồn', key: 'stockQty' },
            { header: 'Giá trị tồn (VNĐ)', key: (r) => Math.round(r.stockVal) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Tổng Giá trị Tồn kho NPP"
          value={loading ? '...' : formatCurrencyVnd(totalStockVal)}
          subtitle={`Trên ${rows.length} Nhà phân phối`}
          accent="red"
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="Tổng Sản lượng Tồn kho"
          value={loading ? '...' : totalQty.toLocaleString('vi-VN')}
          subtitle={`Snapshot tháng ${latestMonth}`}
          accent="blue"
          icon={<Boxes className="h-5 w-5" />}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Tìm mã hoặc tên NPP..."
        searchFilter={(r, q) => r.nppName.toLowerCase().includes(q) || r.nppCode.toLowerCase().includes(q)}
      />
    </div>
  );
}

