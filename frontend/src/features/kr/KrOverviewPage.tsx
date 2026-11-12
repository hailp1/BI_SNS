import { DollarSign, Globe2, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';

interface KrRow {
  year?: string;
  month_num?: number | string;
  sub_channel?: string;
  account_code?: string;
  kr_chain?: string;
  sellin_val?: number;
}

interface TargetSellinRow {
  year?: string;
  month?: string;
  channel?: string;
  target_amt?: number;
}

interface KrSummary {
  subChannel: string;
  krChain: string;
  sellin: number;
  lySellin: number;
  yoy: number;
}

export function KrOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const krSubChan = useFiltersStore((s) => s.krSubChan);
  const krChain = useFiltersStore((s) => s.krChain);
  const setKrFilter = useFiltersStore((s) => s.setKrFilter);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.KR_TREE));

  const [krTree, setKrTree] = useState<KrRow[]>([]);
  const [targetRows, setTargetRows] = useState<TargetSellinRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([loadPayload('KR_TREE', user), loadPayload('TARGET_SELLIN', user)]).then(([data, tgt]) => {
      if (!active) return;
      if (Array.isArray(data)) setKrTree(data as KrRow[]);
      if (Array.isArray(tgt)) setTargetRows(tgt as TargetSellinRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const subChannels = useMemo(
    () => Array.from(new Set(krTree.map((r) => String(r.sub_channel || '')).filter(Boolean))).sort(),
    [krTree],
  );

  const chains = useMemo(
    () =>
      Array.from(
        new Set(
          krTree
            .filter((r) => krSubChan === 'ALL' || r.sub_channel === krSubChan)
            .map((r) => String(r.kr_chain || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [krTree, krSubChan],
  );

  const { total, lyTotal, yoy, target, achievement, rows } = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    let sum = 0;
    let ly = 0;
    let tgt = 0;
    const map = new Map<string, KrSummary>();

    for (const r of krTree) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      if (krSubChan !== 'ALL' && r.sub_channel !== krSubChan) continue;
      if (krChain !== 'ALL' && r.kr_chain !== krChain) continue;

      const val = Number(r.sellin_val) || 0;
      const sub = String(r.sub_channel || 'Khác');
      const ch = String(r.kr_chain || '-');
      const key = `${sub}|${ch}`;

      if (!map.has(key)) {
        map.set(key, { subChannel: sub, krChain: ch, sellin: 0, lySellin: 0, yoy: 0 });
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

    for (const r of targetRows) {
      if (String(r.channel || '').toUpperCase() !== 'KR') continue;
      const mStr = String(r.month || '');
      const rYear = r.year ? String(r.year) : mStr.slice(0, 4);
      if (rYear !== year) continue;
      const mNum = mStr.includes('-') ? parseInt(mStr.slice(5, 7), 10) : parseInt(mStr, 10);
      if (!matchMonthNum(mNum, selectedMonths)) continue;
      tgt += Number(r.target_amt) || 0;
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
      target: tgt,
      achievement: tgt > 0 ? (sum / tgt) * 100 : 0,
      rows: list,
    };
  }, [krTree, targetRows, year, selectedMonths, krSubChan, krChain]);

  const chartOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' as const },
      series: [
        {
          name: 'KR Chain',
          type: 'pie' as const,
          radius: ['42%', '72%'],
          data: rows.slice(0, 8).map((r) => ({ name: r.krChain, value: Math.round(r.sellin / 1e6) })),
          label: { formatter: '{b}: {d}%', fontSize: 11 },
        },
      ],
    }),
    [rows],
  );

  const columns: ColumnDef<KrSummary>[] = [
    { key: 'subChannel', header: 'Phân kênh KR', sortValue: (r) => r.subChannel, render: (r) => r.subChannel },
    { key: 'krChain', header: 'Chuỗi / Đối tác KR', sortValue: (r) => r.krChain, render: (r) => <span className="font-semibold">{r.krChain}</span> },
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
          <h1 className="text-xl font-bold text-slate-900">Kênh KR (Hàn Quốc & Xuất khẩu)</h1>
          <p className="text-xs text-slate-500">Theo dõi chuỗi K-Market, hệ thống đối tác Hàn Quốc & xuất khẩu</p>
        </div>
        <ExportExcelButton
          filename={`CJ_KR_${year}.xlsx`}
          sheetName="KR"
          rows={rows}
          columns={[
            { header: 'Phân kênh', key: 'subChannel' },
            { header: 'Chuỗi KR', key: 'krChain' },
            { header: 'Sell-in', key: (r) => Math.round(r.sellin) },
            { header: 'LY Sell-in', key: (r) => Math.round(r.lySellin) },
            { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
        <select
          value={krSubChan}
          onChange={(e) => setKrFilter('krSubChan', e.target.value)}
          aria-label="Lọc Sub-channel KR"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Phân kênh KR --</option>
          {subChannels.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={krChain}
          onChange={(e) => setKrFilter('krChain', e.target.value)}
          aria-label="Lọc Chuỗi KR"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Chuỗi KR --</option>
          {chains.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Doanh số Kênh KR"
          value={loading ? '...' : formatCurrencyVnd(total)}
          subtitle={`Target: ${formatCurrencyVnd(target)} (${formatPercent(achievement)}) | Cùng kỳ: ${formatCurrencyVnd(lyTotal)}`}
          badge={formatPercent(yoy, true)}
          badgeTone={yoy >= 0 ? 'positive' : 'negative'}
          accent="emerald"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Số đối tác / Chuỗi KR"
          value={rows.length.toString()}
          subtitle="Chuỗi đang hoạt động"
          accent="blue"
          icon={<Globe2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Tăng trưởng YoY"
          value={formatPercent(yoy, true)}
          subtitle="So sánh cùng kỳ năm trước"
          accent="red"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <EChartsCard title="Cơ cấu Doanh số theo Chuỗi KR" option={chartOption} loading={loading} />

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Tìm chuỗi KR..."
        searchFilter={(r, q) => r.krChain.toLowerCase().includes(q) || r.subChannel.toLowerCase().includes(q)}
      />
    </div>
  );
}
