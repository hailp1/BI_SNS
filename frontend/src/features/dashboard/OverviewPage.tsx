import { useQuery } from '@tanstack/react-query';
import { Award, DollarSign, Target, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../shared/api/dashboard.api';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { getActiveApiMonth, matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import type { SellinRecord } from '../../shared/types/sales';
import { formatBillion, formatCurrencyVnd, formatPercent, getAchievementBadgeColor } from '../../shared/utils/format';

interface ChannelSummaryRow {
  channel: string;
  sellin: number;
  target: number;
  ly: number;
  achievement: number;
  yoy: number;
  share: number;
}

export function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const dashChannel = useFiltersStore((s) => s.dashChannel);
  const setDashFilter = useFiltersStore((s) => s.setDashFilter);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);

  const apiMonth = useMemo(() => getActiveApiMonth(year, selectedMonths), [year, selectedMonths]);
  const [sellinRows, setSellinRows] = useState<SellinRecord[]>([]);

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', apiMonth],
    queryFn: () => dashboardApi.getOverview(apiMonth),
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard-daily-trend', apiMonth, dashChannel],
    queryFn: () => dashboardApi.getDailyTrend(apiMonth, dashChannel),
  });

  useEffect(() => {
    let active = true;
    loadPayload('SELLIN_M', user).then((data) => {
      if (active && Array.isArray(data)) {
        setSellinRows(data as SellinRecord[]);
      }
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const channelTableRows = useMemo<ChannelSummaryRow[]>(() => {
    const channelsObj = overviewQuery.data?.channels || {};
    const apiRows = Object.entries(channelsObj).map(([ch, m]) => ({
      channel: ch,
      sellin: m.sellin_revenue || 0,
      target: m.target_sellin || 0,
      ly: m.ly_sellin || 0,
      achievement: m.achievement_rate || 0,
      yoy: m.yoy_growth_rate || 0,
      share: m.channel_share || 0,
    }));
    if (apiRows.length > 0) return apiRows;

    if (sellinRows.length === 0) return [];
    const byChan = new Map<string, { sellin: number; target: number; ly: number }>();
    const lyYear = String(parseInt(year, 10) - 1);
    for (const r of sellinRows) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      const ch = r.channel || 'OTHER';
      const entry = byChan.get(ch) || { sellin: 0, target: 0, ly: 0 };
      if (String(r.year) === year) {
        entry.sellin += Number(r.sellin_val || 0) / 1e9;
        entry.target += Number(r.target_val || 0) / 1e9;
      } else if (String(r.year) === lyYear) {
        entry.ly += Number(r.sellin_val || 0) / 1e9;
      }
      byChan.set(ch, entry);
    }
    const total = Array.from(byChan.values()).reduce((s, v) => s + v.sellin, 0);
    return Array.from(byChan.entries()).map(([channel, v]) => ({
      channel,
      sellin: v.sellin,
      target: v.target,
      ly: v.ly,
      achievement: v.target > 0 ? (v.sellin / v.target) * 100 : 0,
      yoy: v.ly > 0 ? ((v.sellin - v.ly) / v.ly) * 100 : 0,
      share: total > 0 ? (v.sellin / total) * 100 : 0,
    }));
  }, [overviewQuery.data, sellinRows, year, selectedMonths]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of sellinRows) {
      if (String(r.year) !== year || !matchMonthNum(r.month_num, selectedMonths)) continue;
      if (dashChannel !== 'ALL' && r.channel !== dashChannel) continue;
      const key = r.cate || r.ph1 || 'Khác';
      map.set(key, (map.get(key) || 0) + (Number(r.sellin_val) || 0));
    }
    return Array.from(map.entries())
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 8);
  }, [sellinRows, year, selectedMonths, dashChannel]);

  const overall = overviewQuery.data?.overall;

  const dailyChartOption = useMemo(() => {
    const pts = trendQuery.data || [];
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell-in', 'Sell-out'], bottom: 0 },
      grid: { left: 48, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category' as const, data: pts.map((p) => p.date_str) },
      yAxis: { type: 'value' as const, name: 'Tỷ VNĐ' },
      series: [
        {
          name: 'Sell-in',
          type: 'bar' as const,
          data: pts.map((p) => Number(p.sellin_revenue || 0).toFixed(2)),
          itemStyle: { color: '#dc2626', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Sell-out',
          type: 'line' as const,
          smooth: true,
          data: pts.map((p) => Number(p.sellout_revenue || 0).toFixed(2)),
          itemStyle: { color: '#2563eb' },
        },
      ],
    };
  }, [trendQuery.data]);

  const categoryChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' as const },
      series: [
        {
          name: 'Nhóm hàng',
          type: 'pie' as const,
          radius: ['42%', '72%'],
          data: topCategories.map((c) => ({ name: c.name, value: Math.round(c.val / 1e6) })),
          label: { formatter: '{b}: {d}%', fontSize: 11 },
        },
      ],
    }),
    [topCategories],
  );

  const columns: ColumnDef<ChannelSummaryRow>[] = [
    {
      key: 'channel',
      header: 'Kênh phân phối',
      sortValue: (r) => r.channel,
      render: (r) => <span className="font-bold text-slate-900">{r.channel}</span>,
    },
    {
      key: 'sellin',
      header: 'Thực đạt Sell-in',
      align: 'right',
      sortValue: (r) => r.sellin,
      render: (r) => <span className="font-semibold">{formatBillion(r.sellin)}</span>,
    },
    {
      key: 'target',
      header: 'Mục tiêu',
      align: 'right',
      sortValue: (r) => r.target,
      render: (r) => formatBillion(r.target),
    },
    {
      key: 'achievement',
      header: '% Đạt MT',
      align: 'center',
      sortValue: (r) => r.achievement,
      render: (r) => (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${getAchievementBadgeColor(r.achievement)}`}>
          {formatPercent(r.achievement)}
        </span>
      ),
    },
    {
      key: 'yoy',
      header: 'Tăng trưởng YoY',
      align: 'right',
      sortValue: (r) => r.yoy,
      render: (r) => (
        <span className={r.yoy >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
          {formatPercent(r.yoy, true)}
        </span>
      ),
    },
    {
      key: 'share',
      header: 'Tỷ trọng',
      align: 'right',
      sortValue: (r) => r.share,
      render: (r) => formatPercent(r.share),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tổng quan Doanh số Toàn hệ thống</h1>
          <p className="text-xs text-slate-500">Dữ liệu đồng bộ PostgreSQL Data Mart ({apiMonth}) & Payload RLS</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dashChannel}
            onChange={(e) => setDashFilter('dashChannel', e.target.value)}
            aria-label="Lọc kênh"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Kênh</option>
            <option value="GT">GT — General Trade</option>
            <option value="MT">MT — Modern Trade</option>
            <option value="B2B">B2B — Công nghiệp</option>
            <option value="KR">KR — Xuất khẩu</option>
          </select>
          <ExportExcelButton
            filename={`CJ_Overview_${apiMonth}.xlsx`}
            sheetName="Overview"
            rows={channelTableRows}
            columns={[
              { header: 'Kênh', key: 'channel' },
              { header: 'Sell-in (Tỷ)', key: (r) => Number(r.sellin.toFixed(2)) },
              { header: 'Target (Tỷ)', key: (r) => Number(r.target.toFixed(2)) },
              { header: '% Đạt', key: (r) => Number(r.achievement.toFixed(1)) },
              { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
              { header: 'Tỷ trọng (%)', key: (r) => Number(r.share.toFixed(1)) },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Thực đạt Sell-in"
          value={overviewQuery.isLoading ? '...' : formatBillion(overall?.sellin_revenue)}
          subtitle={`Cùng kỳ năm ngoái: ${formatBillion(overall?.ly_sellin)}`}
          badge={formatPercent(overall?.yoy_growth_rate, true)}
          badgeTone={(overall?.yoy_growth_rate || 0) >= 0 ? 'positive' : 'negative'}
          accent="red"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Mục tiêu (Target)"
          value={overviewQuery.isLoading ? '...' : formatBillion(overall?.target_sellin)}
          subtitle={`Chênh lệch (Gap): ${formatBillion(overall?.gap_sellin)}`}
          accent="slate"
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="Tỷ lệ Hoàn thành"
          value={overviewQuery.isLoading ? '...' : formatPercent(overall?.achievement_rate)}
          subtitle="Chuẩn đánh giá KPI ≥ 100%"
          badge={(overall?.achievement_rate || 0) >= 100 ? 'Đạt MT' : 'Cần đẩy số'}
          badgeTone={(overall?.achievement_rate || 0) >= 100 ? 'positive' : 'negative'}
          accent="emerald"
          icon={<Award className="h-5 w-5" />}
        />
        <KpiCard
          title="Tăng trưởng MoM (MTD)"
          value={overviewQuery.isLoading ? '...' : formatPercent(overall?.mom_mtd_rate, true)}
          subtitle={`Tăng trưởng YoY: +${formatBillion(overall?.yoy_growth_amt)}`}
          accent="blue"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EChartsCard
            title="Diễn biến Doanh số Ngày (Sell-in vs Sell-out)"
            subtitle={`Tháng ${apiMonth} — Kênh: ${dashChannel}`}
            option={dailyChartOption}
            loading={trendQuery.isLoading}
          />
        </div>
        <EChartsCard
          title="Cơ cấu Ngành hàng (SELLIN_M)"
          subtitle={topCategories.length > 0 ? 'Theo ngành hàng chính' : 'Đang đồng bộ danh mục sản phẩm...'}
          option={categoryChartOption}
        />
      </div>

      <DataTable
        data={channelTableRows}
        columns={columns}
        searchPlaceholder="Tìm theo kênh..."
        searchFilter={(r, q) => r.channel.toLowerCase().includes(q)}
      />

      {topCategories.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Top Nhóm hàng đóng góp doanh số</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {topCategories.map((c) => (
              <div key={c.name} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="truncate text-xs font-semibold text-slate-600">{c.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrencyVnd(c.val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
