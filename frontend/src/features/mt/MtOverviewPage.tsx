import { DollarSign, ShoppingBag, Store } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent } from '../../shared/utils/format';

interface MtTreeRow {
  year?: string;
  month_num?: number | string;
  sub_channel?: string;
  key_account?: string;
  cluster?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  sku_name?: string;
  sellin_val?: number;
}

interface MtStoreRow {
  m?: number;
  id?: string;
  acc?: string;
  name?: string;
  sc?: string;
  cl?: string;
  addr?: string;
  val?: number;
  lm?: number;
  ly?: number;
  sku?: number;
  lm_sku?: number;
}

interface MtDailyRow {
  month?: string;
  date_val?: string;
  sub_channel?: string;
  key_account?: string;
  val?: number;
}

interface ChainSummary {
  subChannel: string;
  keyAccount: string;
  sellin: number;
  lySellin: number;
  yoy: number;
}

export function MtOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const mtSubChan = useFiltersStore((s) => s.mtSubChan);
  const mtChain = useFiltersStore((s) => s.mtChain);
  const setMtFilter = useFiltersStore((s) => s.setMtFilter);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.MT_TREE));

  const [mtTree, setMtTree] = useState<MtTreeRow[]>([]);
  const [mtStores, setMtStores] = useState<MtStoreRow[]>([]);
  const [mtDaily, setMtDaily] = useState<MtDailyRow[]>([]);
  const [mtCluster, setMtCluster] = useState('ALL');
  const [viewMode, setViewMode] = useState<'chains' | 'stores'>('chains');

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('MT_TREE', user),
      loadPayload('MT_STORE_DATA', user),
      loadPayload('MT_DAILY_DATA', user),
    ]).then(([tree, stores, daily]) => {
      if (!active) return;
      if (Array.isArray(tree)) setMtTree(tree as MtTreeRow[]);
      if (Array.isArray(stores)) setMtStores(stores as MtStoreRow[]);
      if (Array.isArray(daily)) setMtDaily(daily as MtDailyRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const subChannels = useMemo(
    () => Array.from(new Set(mtTree.map((r) => String(r.sub_channel || '')).filter(Boolean))).sort(),
    [mtTree],
  );

  const chains = useMemo(
    () =>
      Array.from(
        new Set(
          mtTree
            .filter((r) => mtSubChan === 'ALL' || r.sub_channel === mtSubChan)
            .map((r) => String(r.key_account || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [mtTree, mtSubChan],
  );

  const clusters = useMemo(
    () =>
      Array.from(
        new Set(
          mtTree
            .filter(
              (r) =>
                (mtSubChan === 'ALL' || r.sub_channel === mtSubChan) &&
                (mtChain === 'ALL' || r.key_account === mtChain),
            )
            .map((r) => String(r.cluster || ''))
            .filter(Boolean),
        ),
      ).sort(),
    [mtTree, mtSubChan, mtChain],
  );

  const { totalSellin, lySellin, yoy, chainRows } = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    let total = 0;
    let ly = 0;
    const map = new Map<string, ChainSummary>();

    for (const r of mtTree) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      if (mtSubChan !== 'ALL' && r.sub_channel !== mtSubChan) continue;
      if (mtChain !== 'ALL' && r.key_account !== mtChain) continue;
      if (mtCluster !== 'ALL' && r.cluster !== mtCluster) continue;

      const val = Number(r.sellin_val) || 0;
      const ka = String(r.key_account || 'Khác');
      const sub = String(r.sub_channel || '-');
      const key = `${sub}|${ka}`;

      if (!map.has(key)) {
        map.set(key, { subChannel: sub, keyAccount: ka, sellin: 0, lySellin: 0, yoy: 0 });
      }
      const item = map.get(key)!;
      if (String(r.year) === year) {
        total += val;
        item.sellin += val;
      } else if (String(r.year) === lyYear) {
        ly += val;
        item.lySellin += val;
      }
    }

    const rows = Array.from(map.values())
      .map((c) => ({
        ...c,
        yoy: c.lySellin > 0 ? ((c.sellin - c.lySellin) / c.lySellin) * 100 : 0,
      }))
      .sort((a, b) => b.sellin - a.sellin);

    return {
      totalSellin: total,
      lySellin: ly,
      yoy: ly > 0 ? ((total - ly) / ly) * 100 : 0,
      chainRows: rows,
    };
  }, [mtTree, year, selectedMonths, mtSubChan, mtChain, mtCluster]);

  const filteredStores = useMemo(() => {
    const monthNums = new Set(selectedMonths.map((m) => parseInt(m, 10)));
    return mtStores
      .filter((s) => {
        if (s.m && !monthNums.has(Number(s.m))) return false;
        if (mtSubChan !== 'ALL' && s.sc !== mtSubChan) return false;
        if (mtChain !== 'ALL' && s.acc !== mtChain) return false;
        if (mtCluster !== 'ALL' && s.cl !== mtCluster) return false;
        return true;
      })
      .sort((a, b) => (Number(b.val) || 0) - (Number(a.val) || 0));
  }, [mtStores, selectedMonths, mtSubChan, mtChain, mtCluster]);

  const activeStoreCount = useMemo(() => {
    const set = new Set<string>();
    for (const s of filteredStores) {
      if ((Number(s.val) || 0) > 0 && (s.id || s.name)) {
        set.add(String(s.id || s.name));
      }
    }
    return set.size;
  }, [filteredStores]);

  const dailyChartOption = useMemo(() => {
    const targetMonthKeys = new Set(selectedMonths.map((m) => `${year}-${m}`));
    const byDate = new Map<string, number>();
    for (const d of mtDaily) {
      if (d.month && !targetMonthKeys.has(d.month)) continue;
      if (mtSubChan !== 'ALL' && d.sub_channel !== mtSubChan) continue;
      if (mtChain !== 'ALL' && d.key_account !== mtChain) continue;
      if (!d.date_val) continue;
      byDate.set(d.date_val, (byDate.get(d.date_val) || 0) + (Number(d.val) || 0));
    }
    const pts = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 56, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category' as const, data: pts.map((p) => p[0].slice(5)), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: {
        type: 'value' as const,
        name: 'Triệu',
        nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        {
          name: 'Daily Sell-in MT',
          type: 'line' as const,
          smooth: true,
          areaStyle: { color: 'rgba(255,255,255,0.18)' },
          data: pts.map((p) => Math.round(p[1] / 1e6)),
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.5, color: '#fde047' },
        },
      ],
    };
  }, [mtDaily, year, selectedMonths, mtSubChan, mtChain]);

  const chartOption = useMemo(() => {
    const top = chainRows.slice(0, 12);
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 60, right: 20, top: 20, bottom: 56 },
      xAxis: {
        type: 'category' as const,
        data: top.map((c) => c.keyAccount),
        axisLabel: { rotate: 25, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Triệu',
        nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        {
          name: 'Sell-in',
          type: 'bar' as const,
          data: top.map((c) => Math.round(c.sellin / 1e6)),
          itemStyle: { color: 'rgba(255,255,255,0.9)', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [chainRows]);

  const monthlyTrendOption = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    const cyM = new Array<number>(12).fill(0);
    const lyM = new Array<number>(12).fill(0);
    for (const r of mtTree) {
      if (mtSubChan !== 'ALL' && r.sub_channel !== mtSubChan) continue;
      if (mtChain !== 'ALL' && r.key_account !== mtChain) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx < 0 || idx > 11) continue;
      const valB = (Number(r.sellin_val) || 0) / 1e9;
      if (String(r.year) === year) cyM[idx] += valB;
      else if (String(r.year) === lyYear) lyM[idx] += valB;
    }
    const yoyM = cyM.map((c, i) => (lyM[i] > 0 ? Number((((c - lyM[i]) / lyM[i]) * 100).toFixed(1)) : 0));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: [year, lyYear, '% YoY'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 44, top: 36, bottom: 28 },
      xAxis: { type: 'category' as const, data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, name: 'Tỷ', nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
        { type: 'value' as const, name: '%', nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        { name: lyYear, type: 'bar' as const, data: lyM.map((v) => Number(v.toFixed(2))), itemStyle: { color: 'rgba(255,255,255,0.45)', borderRadius: [3, 3, 0, 0] } },
        { name: year, type: 'bar' as const, data: cyM.map((v) => Number(v.toFixed(2))), itemStyle: { color: 'rgba(255,255,255,0.92)', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9 }, labelLayout: { hideOverlap: true } },
        { name: '% YoY', type: 'line' as const, yAxisIndex: 1, smooth: true, data: yoyM, itemStyle: { color: '#fde047' }, lineStyle: { width: 2.5, color: '#fde047' }, label: { show: true, position: 'top' as const, color: '#fde047', fontSize: 9, formatter: '{c}%' }, labelLayout: { hideOverlap: true } },
      ],
    };
  }, [mtTree, year, mtSubChan, mtChain]);

  const subchanOption = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of chainRows) {
      map.set(r.subChannel, (map.get(r.subChannel) || 0) + r.sellin);
    }
    const items = Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value / 1e6) }));
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} Tr ({d}%)' },
      series: [
        {
          name: 'Phân kênh MT',
          type: 'pie' as const,
          radius: ['42%', '72%'],
          data: items,
          label: { color: '#ffffff', fontSize: 11, formatter: '{b}: {d}%' },
        },
      ],
    };
  }, [chainRows]);

  const columns: ColumnDef<ChainSummary>[] = [
    { key: 'subChannel', header: 'Phân kênh MT', sortValue: (r) => r.subChannel, render: (r) => r.subChannel },
    { key: 'keyAccount', header: 'Chuỗi Siêu thị (Key Account)', sortValue: (r) => r.keyAccount, render: (r) => <span className="font-semibold text-slate-900">{r.keyAccount}</span> },
    { key: 'sellin', header: `Sell-in (${year})`, align: 'right', sortValue: (r) => r.sellin, render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.sellin)}</span> },
    { key: 'lySellin', header: 'Cùng kỳ năm trước', align: 'right', sortValue: (r) => r.lySellin, render: (r) => formatCurrencyVnd(r.lySellin) },
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
          <h1 className="text-xl font-bold text-slate-900">Kênh MT (Modern Trade — Siêu thị & CVS)</h1>
          <p className="text-xs text-slate-500">Phân tích doanh số chuỗi Key Account & độ phủ cửa hàng</p>
        </div>
        <ExportExcelButton
          filename={`CJ_MT_${year}.xlsx`}
          sheetName="MT_Chains"
          rows={chainRows}
          columns={[
            { header: 'Phân kênh', key: 'subChannel' },
            { header: 'Chuỗi', key: 'keyAccount' },
            { header: 'Sell-in', key: (r) => Math.round(r.sellin) },
            { header: 'LY Sell-in', key: (r) => Math.round(r.lySellin) },
            { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
        <select
          value={mtSubChan}
          onChange={(e) => {
            setMtFilter('mtSubChan', e.target.value);
            setMtCluster('ALL');
          }}
          aria-label="Lọc Sub-channel MT"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Phân kênh MT --</option>
          {subChannels.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={mtChain}
          onChange={(e) => {
            setMtFilter('mtChain', e.target.value);
            setMtCluster('ALL');
          }}
          aria-label="Lọc Chuỗi Siêu thị"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Chuỗi Siêu thị --</option>
          {chains.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={mtCluster}
          onChange={(e) => setMtCluster(e.target.value)}
          aria-label="Lọc Cụm vùng MT"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">-- Tất cả Cụm vùng --</option>
          {clusters.map((cl) => (
            <option key={cl} value={cl}>
              {cl}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Doanh số Sell-in MT"
          value={loading ? '...' : formatCurrencyVnd(totalSellin)}
          subtitle={`Cùng kỳ: ${formatCurrencyVnd(lySellin)}`}
          badge={formatPercent(yoy, true)}
          badgeTone={yoy >= 0 ? 'positive' : 'negative'}
          accent="blue"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Chuỗi Key Account"
          value={chainRows.length.toString()}
          subtitle="Chuỗi có phát sinh doanh số"
          accent="red"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <KpiCard
          title="Cửa hàng (MT Store)"
          value={activeStoreCount.toLocaleString('vi-VN')}
          subtitle="Tổng điểm bán MT đang theo dõi"
          accent="emerald"
          icon={<Store className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="Xu Hướng Sell-in MT 12 Tháng (YoY)"
          subtitle={`Đối sánh ${year} vs ${parseInt(year, 10) - 1} (Tỷ VNĐ)`}
          option={monthlyTrendOption}
          loading={loading}
          gradientClass="grad-blue"
          badgeText="Monthly YoY"
          badgeClass="badge-pill badge-pill-blue"
        />
        <EChartsCard
          title="Top Chuỗi Siêu thị theo Doanh số (Triệu VNĐ)"
          subtitle="Đóng góp Sell-in theo Key Account MT"
          option={chartOption}
          loading={loading}
          gradientClass="grad-purple"
          badgeText="MT Chains"
          badgeClass="badge-pill badge-pill-purple"
        />
        <EChartsCard
          title="Cơ Cấu Doanh Số Theo Phân Kênh MT"
          subtitle="Tỷ trọng Sub-channel (CVS, Hyper, Super...)"
          option={subchanOption}
          loading={loading}
          gradientClass="grad-orange"
          badgeText="Sub-channel"
          badgeClass="badge-pill badge-pill-orange"
        />
        <EChartsCard
          title="Xu hướng Sell-in MT theo Ngày (Triệu VNĐ)"
          subtitle="Nhịp độ xuất hóa đơn MT hàng ngày"
          option={dailyChartOption}
          loading={loading}
          gradientClass="grad-green"
          badgeText="Daily Trend"
          badgeClass="badge-pill badge-pill-green"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode('chains')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            viewMode === 'chains' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          Theo Chuỗi Key Account ({chainRows.length})
        </button>
        <button
          type="button"
          onClick={() => setViewMode('stores')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            viewMode === 'stores' ? 'bg-[#004B91] text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          Chi tiết Cửa hàng MT ({filteredStores.length})
        </button>
      </div>

      {viewMode === 'chains' ? (
        <DataTable
          data={chainRows}
          columns={columns}
          searchPlaceholder="Tìm chuỗi siêu thị..."
          searchFilter={(r, q) =>
            r.keyAccount.toLowerCase().includes(q) || r.subChannel.toLowerCase().includes(q)
          }
        />
      ) : (
        <DataTable
          data={filteredStores.slice(0, 500)}
          columns={[
            { key: 'id', header: 'Mã CH', sortValue: (r) => r.id || '', render: (r) => r.id || '-' },
            { key: 'name', header: 'Tên Cửa hàng', sortValue: (r) => r.name || '', render: (r) => <span className="font-semibold">{r.name || '-'}</span> },
            { key: 'acc', header: 'Chuỗi', sortValue: (r) => r.acc || '', render: (r) => r.acc || '-' },
            { key: 'cl', header: 'Cụm', sortValue: (r) => r.cl || '', render: (r) => r.cl || '-' },
            { key: 'val', header: 'Doanh số', align: 'right', sortValue: (r) => Number(r.val) || 0, render: (r) => <span className="font-semibold">{formatCurrencyVnd(Number(r.val) || 0)}</span> },
            { key: 'sku', header: 'SKU', align: 'right', sortValue: (r) => Number(r.sku) || 0, render: (r) => Number(r.sku) || 0 },
          ]}
          searchPlaceholder="Tìm mã hoặc tên cửa hàng..."
          searchFilter={(r, q) =>
            String(r.id || '').toLowerCase().includes(q) ||
            String(r.name || '').toLowerCase().includes(q) ||
            String(r.acc || '').toLowerCase().includes(q)
          }
        />
      )}
    </div>
  );
}
