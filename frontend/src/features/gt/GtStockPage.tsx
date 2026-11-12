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
  storage?: string;
  cate?: string;
  ph1?: string;
  ph2?: string;
  sku_name?: string;
  stock_val?: number;
}

interface DimGeoRow {
  mien?: string;
  vung?: string;
  gsbh?: string;
  npp_code?: string;
  npp_name?: string;
}

interface StockRow {
  nppCode: string;
  nppName: string;
  vung: string;
  stockVal: number;
  skuCount: number;
  lineCount: number;
}

export function GtStockPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_STOCK));

  const [stockRaw, setStockRaw] = useState<GtStockRaw[]>([]);
  const [dimGeo, setDimGeo] = useState<DimGeoRow[]>([]);
  const [storageFilter, setStorageFilter] = useState('ALL');
  const activeMonth = useMemo(() => getActiveApiMonth(year, selectedMonths), [year, selectedMonths]);

  useEffect(() => {
    let active = true;
    Promise.all([loadPayload('GT_STOCK', user), loadPayload('DIM_GEO_HIER', user)]).then(([stock, geo]) => {
      if (!active) return;
      if (Array.isArray(stock)) setStockRaw(stock as GtStockRaw[]);
      if (Array.isArray(geo)) setDimGeo(geo as DimGeoRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const storages = useMemo(
    () => Array.from(new Set(stockRaw.map((d) => String(d.storage || '')).filter(Boolean))).sort(),
    [stockRaw],
  );

  const { latestMonth, rows, totalStockVal } = useMemo(() => {
    const geoMap = new Map<string, DimGeoRow>();
    for (const g of dimGeo) {
      if (g.npp_code) geoMap.set(String(g.npp_code), g);
    }

    const months = Array.from(new Set(stockRaw.map((d) => String(d.month || '')).filter(Boolean))).sort();
    const eligible = months.filter((m) => m <= activeMonth);
    const chosenMonth = eligible.length > 0 ? eligible[eligible.length - 1] : months[months.length - 1] || activeMonth;

    const map = new Map<string, { row: StockRow; skus: Set<string> }>();
    let totalVal = 0;

    for (const d of stockRaw) {
      if (d.month && d.month !== chosenMonth) continue;
      if (storageFilter !== 'ALL' && String(d.storage || '') !== storageFilter) continue;
      const code = String(d.npp_code || 'UNKNOWN');
      const val = Number(d.stock_val) || 0;
      totalVal += val;

      const geo = geoMap.get(code);
      if (!map.has(code)) {
        map.set(code, {
          row: {
            nppCode: code,
            nppName: String(geo?.npp_name || code),
            vung: String(geo?.vung || geo?.mien || '-'),
            stockVal: 0,
            skuCount: 0,
            lineCount: 0,
          },
          skus: new Set<string>(),
        });
      }
      const entry = map.get(code)!;
      entry.row.stockVal += val;
      entry.row.lineCount += 1;
      if (d.sku_name) entry.skus.add(String(d.sku_name));
    }

    const list = Array.from(map.values())
      .map(({ row, skus }) => ({
        ...row,
        skuCount: skus.size,
      }))
      .sort((a, b) => b.stockVal - a.stockVal);

    return { latestMonth: chosenMonth, rows: list, totalStockVal: totalVal };
  }, [stockRaw, dimGeo, activeMonth, storageFilter]);

  const columns: ColumnDef<StockRow>[] = [
    { key: 'nppCode', header: 'Mã NPP', sortValue: (r) => r.nppCode, render: (r) => <span className="font-mono text-xs">{r.nppCode}</span> },
    { key: 'nppName', header: 'Tên Nhà phân phối', sortValue: (r) => r.nppName, render: (r) => <span className="font-semibold">{r.nppName}</span> },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'skuCount', header: 'Số SKU tồn', align: 'right', sortValue: (r) => r.skuCount, render: (r) => r.skuCount.toLocaleString('vi-VN') },
    { key: 'stockVal', header: 'Giá trị Tồn kho', align: 'right', sortValue: (r) => r.stockVal, render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.stockVal)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tồn kho Nhà Phân Phối (GT Stock)</h1>
          <p className="text-xs text-slate-500">Kỳ tồn kho gần nhất: {latestMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={storageFilter}
            onChange={(e) => setStorageFilter(e.target.value)}
            aria-label="Lọc kho bảo quản"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Kho</option>
            {storages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ExportExcelButton
            filename={`CJ_GT_Stock_${latestMonth}.xlsx`}
            sheetName="GT_Stock"
            rows={rows}
            columns={[
              { header: 'Mã NPP', key: 'nppCode' },
              { header: 'Tên NPP', key: 'nppName' },
              { header: 'Vùng', key: 'vung' },
              { header: 'Số SKU', key: 'skuCount' },
              { header: 'Giá trị tồn', key: (r) => Math.round(r.stockVal) },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Tổng giá trị Tồn kho"
          value={loading ? '...' : formatCurrencyVnd(totalStockVal)}
          subtitle={`Tại ${rows.length} Nhà phân phối`}
          accent="blue"
          icon={<Package className="h-5 w-5" />}
        />
        <KpiCard
          title="Số NPP có tồn kho"
          value={rows.length.toLocaleString('vi-VN')}
          subtitle={`Kỳ dữ liệu: ${latestMonth}`}
          accent="amber"
          icon={<Boxes className="h-5 w-5" />}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Tìm mã hoặc tên NPP..."
        searchFilter={(r, q) =>
          r.nppName.toLowerCase().includes(q) || r.nppCode.toLowerCase().includes(q) || r.vung.toLowerCase().includes(q)
        }
      />
    </div>
  );
}
