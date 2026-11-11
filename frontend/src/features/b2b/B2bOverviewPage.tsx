import { Building2, DollarSign, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';

interface B2bRow {
  year?: string;
  month_num?: number | string;
  b2b_account?: string;
  b2b_customer?: string;
  sellin_val?: number;
}

interface B2bSummary {
  account: string;
  customer: string;
  sellin: number;
  lySellin: number;
  yoy: number;
}

export function B2bOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const b2bAcc = useFiltersStore((s) => s.b2bAcc);
  const b2bCust = useFiltersStore((s) => s.b2bCust);
  const setB2bFilter = useFiltersStore((s) => s.setB2bFilter);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.B2B_TREE));

  const [b2bTree, setB2bTree] = useState<B2bRow[]>([]);

  useEffect(() => {
    let active = true;
    loadPayload('B2B_TREE', user).then((data) => {
      if (active && Array.isArray(data)) setB2bTree(data as B2bRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const accounts = useMemo(
    () => Array.from(new Set(b2bTree.map((r) => String(r.b2b_account || '')).filter(Boolean))).sort(),
    [b2bTree],
  );

  const customers = useMemo(
    () =>
      Array.from(
        new Set(
          b2bTree
            .filter((r) => b2bAcc === 'ALL' || r.b2b_account === b2bAcc)
            .map((r) => String(r.b2b_customer || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [b2bTree, b2bAcc],
  );

  const { total, lyTotal, yoy, rows } = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    let sum = 0;
    let ly = 0;
    const map = new Map<string, B2bSummary>();

    for (const r of b2bTree) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      if (b2bAcc !== 'ALL' && r.b2b_account !== b2bAcc) continue;
      if (b2bCust !== 'ALL' && r.b2b_customer !== b2bCust) continue;

      const val = Number(r.sellin_val) || 0;
      const acc = String(r.b2b_account || 'Khác');
      const cust = String(r.b2b_customer || '-');
      const key = `${acc}|${cust}`;

      if (!map.has(key)) {
        map.set(key, { account: acc, customer: cust, sellin: 0, lySellin: 0, yoy: 0 });
      }
      const item = map.get(key)!;
      if (String(r.year) === year) {
        sum += val;
        item.sellin += val;
      } else if (String(r.year) === lyYear) {
        ly += val;
        item.lySellin += val;
      }
    }

    const list = Array.from(map.values())
      .map((x) => ({
        ...x,
        yoy: x.lySellin > 0 ? ((x.sellin - x.lySellin) / x.lySellin) * 100 : 0,
      }))
      .sort((a, b) => b.sellin - a.sellin);

    return {
      total: sum,
      lyTotal: ly,
      yoy: ly > 0 ? ((sum - ly) / ly) * 100 : 0,
      rows: list,
    };
  }, [b2bTree, year, selectedMonths, b2bAcc, b2bCust]);

  const chartOption = useMemo(() => {
    const top = rows.slice(0, 10);
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category' as const, data: top.map((r) => r.customer), axisLabel: { rotate: 20, fontSize: 11 } },
      yAxis: { type: 'value' as const, name: 'Triệu VNĐ' },
      series: [
        {
          name: 'Sell-in B2B',
          type: 'bar' as const,
          data: top.map((r) => Math.round(r.sellin / 1e6)),
          itemStyle: { color: '#d97706', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [rows]);

  const columns: ColumnDef<B2bSummary>[] = [
    { key: 'account', header: 'Nhóm B2B Account', sortValue: (r) => r.account, render: (r) => r.account },
    { key: 'customer', header: 'Khách hàng B2B', sortValue: (r) => r.customer, render: (r) => <span className="font-semibold">{r.customer}</span> },
    { key: 'sellin', header: `Sell-in (${year})`, align: 'right', sortValue: (r) => r.sellin, render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.sellin)}</span> },
    { key: 'lySellin', header: 'Cùng kỳ', align: 'right', sortValue: (r) => r.lySellin, render: (r) => formatCurrencyVnd(r.lySellin) },
    {
      key: 'yoy',
      header: 'YoY',
      align: 'right',
      sortValue: (r) => r.yoy,
      render: (r) => (
        <span className={r.yoy >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
          {formatPercent(r.yoy, true)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kênh B2B (Khách hàng Công nghiệp & Horeca)</h1>
          <p className="text-xs text-slate-500">Theo dõi nhóm tài khoản B2B và khách hàng trọng điểm</p>
        </div>
        <ExportExcelButton
          filename={`CJ_B2B_${year}.xlsx`}
          sheetName="B2B"
          rows={rows}
          columns={[
            { header: 'Nhóm Account', key: 'account' },
            { header: 'Khách hàng', key: 'customer' },
            { header: 'Sell-in', key: (r) => Math.round(r.sellin) },
            { header: 'LY Sell-in', key: (r) => Math.round(r.lySellin) },
            { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
        <select
          value={b2bAcc}
          onChange={(e) => setB2bFilter('b2bAcc', e.target.value)}
          aria-label="Lọc Nhóm B2B"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Nhóm B2B --</option>
          {accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={b2bCust}
          onChange={(e) => setB2bFilter('b2bCust', e.target.value)}
          aria-label="Lọc Khách hàng B2B"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Khách hàng --</option>
          {customers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Doanh số B2B"
          value={loading ? '...' : formatCurrencyVnd(total)}
          subtitle={`Cùng kỳ: ${formatCurrencyVnd(lyTotal)}`}
          badge={formatPercent(yoy, true)}
          badgeTone={yoy >= 0 ? 'positive' : 'negative'}
          accent="amber"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Số Khách hàng B2B"
          value={rows.length.toString()}
          subtitle="Khách hàng có doanh số trong kỳ"
          accent="slate"
          icon={<Building2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Tăng trưởng YoY"
          value={formatPercent(yoy, true)}
          subtitle={`So sánh cùng kỳ năm trước`}
          accent="emerald"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <EChartsCard title="Top Khách hàng B2B theo Doanh số (Triệu VNĐ)" option={chartOption} loading={loading} />

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Tìm khách hàng B2B..."
        searchFilter={(r, q) => r.customer.toLowerCase().includes(q) || r.account.toLowerCase().includes(q)}
      />
    </div>
  );
}
