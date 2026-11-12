import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../shared/api/dashboard.api';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { useAuthStore } from '../../shared/stores/auth.store';
import { getActiveApiMonth, matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import type { SellinRecord } from '../../shared/types/sales';
import { formatBillion, formatPercent, getAchievementBadgeColor } from '../../shared/utils/format';

interface DailyRecord {
  date_val?: string;
  channel?: string;
  sub_channel?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  daily_sellin?: number;
  daily_sellout?: number;
}

interface ChannelSummaryRow {
  channel: string;
  sellin: number;
  target: number;
  ly: number;
  ytdCy: number;
  ytdLy: number;
  ytdPct: number;
  momMtdPct: number | null;
  achievement: number;
  yoy: number;
  share: number;
}

interface HierarchyAccountNode {
  name: string;
  sellin: number;
  target: number;
  ly: number;
}

interface HierarchySubNode {
  name: string;
  sellin: number;
  target: number;
  ly: number;
  accounts: HierarchyAccountNode[];
}

interface HierarchyChannelNode {
  name: string;
  sellin: number;
  target: number;
  ly: number;
  subs: HierarchySubNode[];
}

interface CategoryPh1Node {
  name: string;
  sellin: number;
  ly: number;
}

interface CategoryTreeNode {
  name: string;
  sellin: number;
  ly: number;
  ph1s: CategoryPh1Node[];
}

export function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const dashChannel = useFiltersStore((s) => s.dashChannel);
  const dashSubChannel = useFiltersStore((s) => s.dashSubChannel);
  const dashAccount = useFiltersStore((s) => s.dashAccount);
  const prodStorage = useFiltersStore((s) => s.prodStorage);
  const prodCate = useFiltersStore((s) => s.prodCate);
  const prodPh1 = useFiltersStore((s) => s.prodPh1);
  const setDashFilter = useFiltersStore((s) => s.setDashFilter);
  const setProdFilter = useFiltersStore((s) => s.setProdFilter);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);

  const apiMonth = useMemo(() => getActiveApiMonth(year, selectedMonths), [year, selectedMonths]);
  const [sellinRows, setSellinRows] = useState<SellinRecord[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRecord[]>([]);
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});
  const [expandedCates, setExpandedCates] = useState<Record<string, boolean>>({});

  const dimensionsQuery = useQuery({
    queryKey: ['dashboard-dimensions'],
    queryFn: () => dashboardApi.getDimensions(),
  });

  const summaryQuery = useQuery({
    queryKey: [
      'dashboard-overview-summary',
      year,
      selectedMonths.join(','),
      dashChannel,
      dashSubChannel,
      dashAccount,
      prodStorage,
      prodCate,
      prodPh1,
    ],
    queryFn: () =>
      dashboardApi.getOverviewSummary({
        year,
        months: selectedMonths.join(','),
        channel: dashChannel !== 'ALL' ? dashChannel : undefined,
        subChannel: dashSubChannel !== 'ALL' ? dashSubChannel : undefined,
        account: dashAccount !== 'ALL' ? dashAccount : undefined,
        storage: prodStorage !== 'ALL' ? prodStorage : undefined,
        cate: prodCate !== 'ALL' ? prodCate : undefined,
        ph1: prodPh1 !== 'ALL' ? prodPh1 : undefined,
      }),
  });

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
    loadPayload('DAILY_DATA', user).then((data) => {
      if (active && Array.isArray(data)) {
        setDailyRows(data as DailyRecord[]);
      }
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const ytdMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of sellinRows) {
      if (String(r.year) === year && Number(r.sellin_val || 0) !== 0) {
        set.add(String(r.month_num).padStart(2, '0'));
      }
    }
    if (set.size === 0) {
      return selectedMonths.map((m) => m.padStart(2, '0'));
    }
    return Array.from(set).sort();
  }, [sellinRows, year, selectedMonths]);

  const momMtdStats = useMemo(() => {
    const empty = { overall: null as number | null, byChannel: {} as Record<string, number | null> };
    if (selectedMonths.length !== 1 || dailyRows.length === 0) return empty;

    const selM = selectedMonths[0].padStart(2, '0');
    const curYearNum = parseInt(year, 10);
    const curMonthNum = parseInt(selM, 10);
    const curPrefix = `${year}-${selM}`;

    let maxDay = 0;
    for (const d of dailyRows) {
      const dt = String(d.date_val || '');
      if (dt.startsWith(curPrefix) && (Number(d.daily_sellin) || 0) > 0) {
        const day = parseInt(dt.substring(8, 10), 10);
        if (day > maxDay) maxDay = day;
      }
    }
    if (maxDay === 0) return empty;

    const priorMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;
    const priorYearNum = curMonthNum === 1 ? curYearNum - 1 : curYearNum;
    const priorPrefix = `${priorYearNum}-${String(priorMonthNum).padStart(2, '0')}`;

    const curByCh: Record<string, number> = { GT: 0, MT: 0, B2B: 0, KR: 0 };
    const priorByCh: Record<string, number> = { GT: 0, MT: 0, B2B: 0, KR: 0 };
    let curTotal = 0;
    let priorTotal = 0;

    for (const d of dailyRows) {
      const val = Number(d.daily_sellin) || 0;
      if (val === 0) continue;
      if (dashChannel !== 'ALL' && d.channel !== dashChannel) continue;
      if (prodStorage !== 'ALL' && d.storage !== prodStorage) continue;
      if (prodCate !== 'ALL' && d.cate !== prodCate) continue;
      if (prodPh1 !== 'ALL' && d.ph1 !== prodPh1) continue;

      const dt = String(d.date_val || '');
      const day = parseInt(dt.substring(8, 10), 10);
      if (Number.isNaN(day) || day > maxDay) continue;
      const ch = String(d.channel || '').toUpperCase();

      if (dt.startsWith(curPrefix)) {
        curTotal += val;
        if (ch in curByCh) curByCh[ch] += val;
      } else if (dt.startsWith(priorPrefix)) {
        priorTotal += val;
        if (ch in priorByCh) priorByCh[ch] += val;
      }
    }

    const calcPct = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : null);
    return {
      overall: calcPct(curTotal, priorTotal),
      byChannel: {
        GT: calcPct(curByCh.GT, priorByCh.GT),
        MT: calcPct(curByCh.MT, priorByCh.MT),
        B2B: calcPct(curByCh.B2B, priorByCh.B2B),
        KR: calcPct(curByCh.KR, priorByCh.KR),
      },
    };
  }, [dailyRows, year, selectedMonths, dashChannel, prodStorage, prodCate, prodPh1]);

  const ytdByChannel = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    let totalCy = 0;
    let totalLy = 0;
    const map = new Map<string, { cy: number; ly: number }>();

    for (const r of sellinRows) {
      if (!matchMonthNum(r.month_num, ytdMonths)) continue;
      if (dashChannel !== 'ALL' && r.channel !== dashChannel) continue;
      if (dashSubChannel !== 'ALL' && r.sub_channel !== dashSubChannel) continue;
      if (dashAccount !== 'ALL' && r.account_name !== dashAccount && r.account_code !== dashAccount) continue;
      if (prodStorage !== 'ALL' && r.storage !== prodStorage) continue;
      if (prodCate !== 'ALL' && r.cate !== prodCate) continue;
      if (prodPh1 !== 'ALL' && r.ph1 !== prodPh1) continue;

      const valB = (Number(r.sellin_val) || 0) / 1e9;
      const ch = String(r.channel || 'OTHER').toUpperCase();
      const entry = map.get(ch) || { cy: 0, ly: 0 };

      if (String(r.year) === year) {
        totalCy += valB;
        entry.cy += valB;
      } else if (String(r.year) === lyYear) {
        totalLy += valB;
        entry.ly += valB;
      }
      map.set(ch, entry);
    }

    return {
      totalCy,
      totalLy,
      totalPct: totalLy > 0 ? ((totalCy - totalLy) / totalLy) * 100 : 0,
      map,
    };
  }, [sellinRows, year, ytdMonths, dashChannel, dashSubChannel, dashAccount, prodStorage, prodCate, prodPh1]);

  const channelTableRows = useMemo<ChannelSummaryRow[]>(() => {
    const summaryData = summaryQuery.data as
      | {
          total_sellin?: number;
          channels?: Array<{
            channel: string;
            cy_sellin: number;
            ly_sellin: number;
            target_amt: number;
            ach_pct: number;
            yoy_pct: number;
          }>;
        }
      | undefined;

    if (summaryData?.channels && summaryData.channels.length > 0) {
      const total = summaryData.total_sellin || summaryData.channels.reduce((s, c) => s + (c.cy_sellin || 0), 0);
      return summaryData.channels.map((c) => {
        const chKey = c.channel.toUpperCase();
        const ytdEntry = ytdByChannel.map.get(chKey) || { cy: 0, ly: 0 };
        const ytdPct = ytdEntry.ly > 0 ? ((ytdEntry.cy - ytdEntry.ly) / ytdEntry.ly) * 100 : 0;
        return {
          channel: c.channel,
          sellin: (c.cy_sellin || 0) / 1e9,
          target: (c.target_amt || 0) / 1e9,
          ly: (c.ly_sellin || 0) / 1e9,
          ytdCy: ytdEntry.cy,
          ytdLy: ytdEntry.ly,
          ytdPct,
          momMtdPct: momMtdStats.byChannel[chKey] ?? null,
          achievement: c.ach_pct || 0,
          yoy: c.yoy_pct || 0,
          share: total > 0 ? ((c.cy_sellin || 0) / total) * 100 : 0,
        };
      });
    }

    const channelsObj = overviewQuery.data?.channels || {};
    const apiRows = Object.entries(channelsObj).map(([ch, m]) => {
      const chKey = ch.toUpperCase();
      const ytdEntry = ytdByChannel.map.get(chKey) || { cy: 0, ly: 0 };
      const ytdPct = ytdEntry.ly > 0 ? ((ytdEntry.cy - ytdEntry.ly) / ytdEntry.ly) * 100 : 0;
      return {
        channel: ch,
        sellin: m.sellin_revenue || 0,
        target: m.target_sellin || 0,
        ly: m.ly_sellin || 0,
        ytdCy: ytdEntry.cy,
        ytdLy: ytdEntry.ly,
        ytdPct,
        momMtdPct: momMtdStats.byChannel[chKey] ?? null,
        achievement: m.achievement_rate || 0,
        yoy: m.yoy_growth_rate || 0,
        share: m.channel_share || 0,
      };
    });
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
    return Array.from(byChan.entries()).map(([channel, v]) => {
      const chKey = channel.toUpperCase();
      const ytdEntry = ytdByChannel.map.get(chKey) || { cy: 0, ly: 0 };
      const ytdPct = ytdEntry.ly > 0 ? ((ytdEntry.cy - ytdEntry.ly) / ytdEntry.ly) * 100 : 0;
      return {
        channel,
        sellin: v.sellin,
        target: v.target,
        ly: v.ly,
        ytdCy: ytdEntry.cy,
        ytdLy: ytdEntry.ly,
        ytdPct,
        momMtdPct: momMtdStats.byChannel[chKey] ?? null,
        achievement: v.target > 0 ? (v.sellin / v.target) * 100 : 0,
        yoy: v.ly > 0 ? ((v.sellin - v.ly) / v.ly) * 100 : 0,
        share: total > 0 ? (v.sellin / total) * 100 : 0,
      };
    });
  }, [summaryQuery.data, overviewQuery.data, sellinRows, year, selectedMonths, ytdByChannel, momMtdStats]);

  const dimOptions = useMemo(() => {
    const comm = dimensionsQuery.data?.commercial || [];
    const prod = dimensionsQuery.data?.product || [];
    const subChannels = Array.from(
      new Set(
        comm
          .filter((r) => dashChannel === 'ALL' || String(r.channel || '') === dashChannel)
          .map((r) => String(r.sub_channel || ''))
          .filter(Boolean),
      ),
    ).sort();
    const accounts = Array.from(
      new Set(
        comm
          .filter(
            (r) =>
              (dashChannel === 'ALL' || String(r.channel || '') === dashChannel) &&
              (dashSubChannel === 'ALL' || String(r.sub_channel || '') === dashSubChannel),
          )
          .map((r) => String(r.account_name || ''))
          .filter(Boolean),
      ),
    ).sort();
    const storages = Array.from(new Set(prod.map((r) => String(r.storage || '')).filter(Boolean))).sort();
    const cates = Array.from(
      new Set(
        prod
          .filter((r) => prodStorage === 'ALL' || String(r.storage || '') === prodStorage)
          .map((r) => String(r.cate || ''))
          .filter(Boolean),
      ),
    ).sort();
    const ph1s = Array.from(
      new Set(
        prod
          .filter(
            (r) =>
              (prodStorage === 'ALL' || String(r.storage || '') === prodStorage) &&
              (prodCate === 'ALL' || String(r.cate || '') === prodCate),
          )
          .map((r) => String(r.ph1 || ''))
          .filter(Boolean),
      ),
    ).sort();
    return { subChannels, accounts, storages, cates, ph1s };
  }, [dimensionsQuery.data, dashChannel, dashSubChannel, prodStorage, prodCate]);

  const channelHierarchyTree = useMemo<HierarchyChannelNode[]>(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    const chanMap = new Map<
      string,
      {
        sellin: number;
        target: number;
        ly: number;
        subs: Map<
          string,
          { sellin: number; target: number; ly: number; accounts: Map<string, { sellin: number; target: number; ly: number }> }
        >;
      }
    >();

    for (const r of sellinRows) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      if (dashChannel !== 'ALL' && r.channel !== dashChannel) continue;
      if (dashSubChannel !== 'ALL' && r.sub_channel !== dashSubChannel) continue;
      if (dashAccount !== 'ALL' && r.account_name !== dashAccount && r.account_code !== dashAccount) continue;
      if (prodStorage !== 'ALL' && r.storage !== prodStorage) continue;
      if (prodCate !== 'ALL' && r.cate !== prodCate) continue;
      if (prodPh1 !== 'ALL' && r.ph1 !== prodPh1) continue;

      const ch = r.channel || 'Khác';
      const sc = r.sub_channel || 'Khác';
      const acc = r.account_name || r.account_code || 'Khác';

      if (!chanMap.has(ch)) chanMap.set(ch, { sellin: 0, target: 0, ly: 0, subs: new Map() });
      const chNode = chanMap.get(ch)!;
      if (!chNode.subs.has(sc)) chNode.subs.set(sc, { sellin: 0, target: 0, ly: 0, accounts: new Map() });
      const scNode = chNode.subs.get(sc)!;
      if (!scNode.accounts.has(acc)) scNode.accounts.set(acc, { sellin: 0, target: 0, ly: 0 });
      const accNode = scNode.accounts.get(acc)!;

      const valB = (Number(r.sellin_val) || 0) / 1e9;
      const tgtB = (Number(r.target_val) || 0) / 1e9;
      if (String(r.year) === year) {
        chNode.sellin += valB;
        chNode.target += tgtB;
        scNode.sellin += valB;
        scNode.target += tgtB;
        accNode.sellin += valB;
        accNode.target += tgtB;
      } else if (String(r.year) === lyYear) {
        chNode.ly += valB;
        scNode.ly += valB;
        accNode.ly += valB;
      }
    }

    return Array.from(chanMap.entries())
      .map(([name, ch]) => ({
        name,
        sellin: ch.sellin,
        target: ch.target,
        ly: ch.ly,
        subs: Array.from(ch.subs.entries())
          .map(([scName, sc]) => ({
            name: scName,
            sellin: sc.sellin,
            target: sc.target,
            ly: sc.ly,
            accounts: Array.from(sc.accounts.entries())
              .map(([accName, acc]) => ({ name: accName, sellin: acc.sellin, target: acc.target, ly: acc.ly }))
              .sort((a, b) => b.sellin - a.sellin),
          }))
          .sort((a, b) => b.sellin - a.sellin),
      }))
      .sort((a, b) => b.sellin - a.sellin);
  }, [sellinRows, year, selectedMonths, dashChannel, dashSubChannel, dashAccount, prodStorage, prodCate, prodPh1]);

  const categoryTree = useMemo<CategoryTreeNode[]>(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    const map = new Map<string, { sellin: number; ly: number; ph1s: Map<string, { sellin: number; ly: number }> }>();

    for (const r of sellinRows) {
      if (!matchMonthNum(r.month_num, selectedMonths)) continue;
      if (dashChannel !== 'ALL' && r.channel !== dashChannel) continue;
      if (dashSubChannel !== 'ALL' && r.sub_channel !== dashSubChannel) continue;
      if (dashAccount !== 'ALL' && r.account_name !== dashAccount && r.account_code !== dashAccount) continue;
      if (prodStorage !== 'ALL' && r.storage !== prodStorage) continue;
      if (prodCate !== 'ALL' && r.cate !== prodCate) continue;
      if (prodPh1 !== 'ALL' && r.ph1 !== prodPh1) continue;

      const cate = r.cate || 'Khác';
      const ph1 = r.ph1 || 'Khác';
      if (!map.has(cate)) map.set(cate, { sellin: 0, ly: 0, ph1s: new Map() });
      const cNode = map.get(cate)!;
      if (!cNode.ph1s.has(ph1)) cNode.ph1s.set(ph1, { sellin: 0, ly: 0 });
      const pNode = cNode.ph1s.get(ph1)!;

      const valB = (Number(r.sellin_val) || 0) / 1e9;
      if (String(r.year) === year) {
        cNode.sellin += valB;
        pNode.sellin += valB;
      } else if (String(r.year) === lyYear) {
        cNode.ly += valB;
        pNode.ly += valB;
      }
    }

    return Array.from(map.entries())
      .map(([name, c]) => ({
        name,
        sellin: c.sellin,
        ly: c.ly,
        ph1s: Array.from(c.ph1s.entries())
          .map(([pName, p]) => ({ name: pName, sellin: p.sellin, ly: p.ly }))
          .sort((a, b) => b.sellin - a.sellin),
      }))
      .sort((a, b) => b.sellin - a.sellin);
  }, [sellinRows, year, selectedMonths, dashChannel, dashSubChannel, dashAccount, prodStorage, prodCate, prodPh1]);

  const totalCategorySellin = useMemo(
    () => categoryTree.reduce((sum, c) => sum + c.sellin, 0),
    [categoryTree],
  );
  const totalChannelTreeSellin = useMemo(
    () => channelHierarchyTree.reduce((sum, c) => sum + c.sellin, 0),
    [channelHierarchyTree],
  );

  const summaryOverall = summaryQuery.data as
    | { total_sellin?: number; total_target?: number; ach_pct?: number; total_ly_sellin?: number; yoy_pct?: number }
    | undefined;
  const legacyOverall = overviewQuery.data?.overall;
  const overall = summaryOverall?.total_sellin !== undefined
    ? {
        channel: 'ALL',
        sellin_revenue: (summaryOverall.total_sellin || 0) / 1e9,
        target_sellin: (summaryOverall.total_target || 0) / 1e9,
        achievement_rate: summaryOverall.ach_pct || 0,
        ly_sellin: (summaryOverall.total_ly_sellin || 0) / 1e9,
        yoy_growth_rate: summaryOverall.yoy_pct || 0,
        gap_sellin: ((summaryOverall.total_sellin || 0) - (summaryOverall.total_target || 0)) / 1e9,
        yoy_growth_amt: ((summaryOverall.total_sellin || 0) - (summaryOverall.total_ly_sellin || 0)) / 1e9,
        mom_mtd_rate: momMtdStats.overall ?? legacyOverall?.mom_mtd_rate ?? null,
      }
    : legacyOverall
      ? {
          ...legacyOverall,
          mom_mtd_rate: momMtdStats.overall ?? legacyOverall.mom_mtd_rate ?? null,
        }
      : undefined;

  const dailyChartOption = useMemo(() => {
    let labels: string[] = [];
    let sellinVals: number[] = [];
    let selloutVals: number[] = [];

    if (dailyRows.length > 0) {
      const byDate = new Map<string, { si: number; so: number }>();
      for (const d of dailyRows) {
        const dtStr = String(d.date_val || '');
        if (!dtStr.startsWith(year)) continue;
        const m = dtStr.substring(5, 7);
        if (!selectedMonths.includes(m) && !selectedMonths.includes(String(parseInt(m, 10)))) continue;
        if (dashChannel !== 'ALL' && d.channel !== dashChannel) continue;
        if (prodStorage !== 'ALL' && d.storage !== prodStorage) continue;
        if (prodCate !== 'ALL' && d.cate !== prodCate) continue;
        if (prodPh1 !== 'ALL' && d.ph1 !== prodPh1) continue;
        const entry = byDate.get(dtStr) || { si: 0, so: 0 };
        entry.si += (Number(d.daily_sellin) || 0) / 1e9;
        entry.so += (Number(d.daily_sellout) || 0) / 1e9;
        byDate.set(dtStr, entry);
      }
      const sorted = Array.from(byDate.keys()).sort();
      labels = sorted.map((dt) => dt.substring(5));
      sellinVals = sorted.map((dt) => Number((byDate.get(dt)?.si || 0).toFixed(2)));
      selloutVals = sorted.map((dt) => Number((byDate.get(dt)?.so || 0).toFixed(2)));
    } else {
      const pts = trendQuery.data || [];
      labels = pts.map((p) => p.date_str.slice(5));
      sellinVals = pts.map((p) => Number((p.sellin_revenue || 0).toFixed(2)));
      selloutVals = pts.map((p) => Number((p.sellout_revenue || 0).toFixed(2)));
    }

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell-in', 'Sell-out'], top: 4, textStyle: { color: '#ffffff', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 36, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: labels,
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Tỷ',
        nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        {
          name: 'Sell-in',
          type: 'bar' as const,
          data: sellinVals,
          itemStyle: { color: 'rgba(255,255,255,0.88)', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Sell-out',
          type: 'line' as const,
          smooth: true,
          data: selloutVals,
          itemStyle: { color: '#fde047' },
          lineStyle: { width: 2.5, color: '#fde047' },
        },
      ],
    };
  }, [dailyRows, trendQuery.data, year, selectedMonths, dashChannel, prodStorage, prodCate, prodPh1]);

  const monthlyYoYChartOption = useMemo(() => {
    const lyYear = String(parseInt(year, 10) - 1);
    const cyMonths = new Array<number>(12).fill(0);
    const lyMonths = new Array<number>(12).fill(0);

    for (const r of sellinRows) {
      if (dashChannel !== 'ALL' && r.channel !== dashChannel) continue;
      if (dashSubChannel !== 'ALL' && r.sub_channel !== dashSubChannel) continue;
      if (dashAccount !== 'ALL' && r.account_name !== dashAccount && r.account_code !== dashAccount) continue;
      if (prodStorage !== 'ALL' && r.storage !== prodStorage) continue;
      if (prodCate !== 'ALL' && r.cate !== prodCate) continue;
      if (prodPh1 !== 'ALL' && r.ph1 !== prodPh1) continue;
      const mIdx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (mIdx < 0 || mIdx > 11) continue;
      const valB = (Number(r.sellin_val) || 0) / 1e9;
      if (String(r.year) === year) cyMonths[mIdx] += valB;
      else if (String(r.year) === lyYear) lyMonths[mIdx] += valB;
    }

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: [year, lyYear], top: 4, textStyle: { color: '#ffffff', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 36, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Tỷ',
        nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
      },
      series: [
        {
          name: year,
          type: 'bar' as const,
          data: cyMonths.map((v) => Number(v.toFixed(2))),
          itemStyle: { color: 'rgba(255,255,255,0.92)', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: lyYear,
          type: 'line' as const,
          smooth: true,
          data: lyMonths.map((v) => Number(v.toFixed(2))),
          itemStyle: { color: '#fef08a' },
          lineStyle: { width: 2.5, color: '#fef08a', type: 'dashed' as const },
        },
      ],
    };
  }, [sellinRows, year, dashChannel, dashSubChannel, dashAccount, prodStorage, prodCate, prodPh1]);

  const channelCardMap = useMemo(() => {
    const map = new Map<string, ChannelSummaryRow>();
    for (const r of channelTableRows) {
      map.set(r.channel.toUpperCase(), r);
    }
    return map;
  }, [channelTableRows]);

  const CHANNEL_CARDS = [
    { key: 'GT', label: 'KÊNH GT', border: '#2563eb', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'MT', label: 'KÊNH MT', border: '#7c3aed', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'B2B', label: 'KÊNH B2B', border: '#f59e0b', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'KR', label: 'KÊNH KR', border: '#10b981', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const isLoadingOverview = summaryQuery.isLoading && overviewQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Dynamic Filter Bar matching web_app/index.html */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 whitespace-nowrap text-[10px] font-black uppercase text-sky-800">🏷️ KÊNH &amp; KH:</span>
          <select
            value={dashChannel}
            onChange={(e) => setDashFilter('dashChannel', e.target.value)}
            aria-label="Lọc kênh"
            className="header-dropdown font-bold text-sky-700"
          >
            <option value="ALL">Tất cả Kênh (4 Kênh)</option>
            <option value="GT">Kênh GT</option>
            <option value="MT">Kênh MT</option>
            <option value="B2B">Kênh B2B</option>
            <option value="KR">Kênh KR</option>
          </select>
          <select
            value={dashSubChannel}
            onChange={(e) => setDashFilter('dashSubChannel', e.target.value)}
            aria-label="Sub-channel"
            className="header-dropdown font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Sub-channel</option>
            {dimOptions.subChannels.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={dashAccount}
            onChange={(e) => setDashFilter('dashAccount', e.target.value)}
            aria-label="Tài khoản"
            className="header-dropdown max-w-[160px] font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Account</option>
            {dimOptions.accounts.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={prodStorage}
            onChange={(e) => setProdFilter('prodStorage', e.target.value)}
            aria-label="Kho bảo quản"
            className="header-dropdown font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Kho</option>
            {dimOptions.storages.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <select
            value={prodCate}
            onChange={(e) => setProdFilter('prodCate', e.target.value)}
            aria-label="Ngành hàng"
            className="header-dropdown font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả Ngành hàng</option>
            {dimOptions.cates.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={prodPh1}
            onChange={(e) => setProdFilter('prodPh1', e.target.value)}
            aria-label="Nhóm PH1"
            className="header-dropdown font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả PH1</option>
            {dimOptions.ph1s.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
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
            { header: '% YTD', key: (r) => Number(r.ytdPct.toFixed(1)) },
            { header: 'Tỷ trọng (%)', key: (r) => Number(r.share.toFixed(1)) },
          ]}
        />
      </div>

      {/* EXECUTIVE COMMERCIAL SELL-IN & TARGET OVERVIEW (ROW 1 + ROW 2) */}
      <div className="space-y-3">
        {/* ROW 1: 4 CORE COMMERCIAL SELL-IN CARDS */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: DOANH SỐ SELL-IN */}
          <div
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
            style={{ borderLeft: '5px solid #2563eb' }}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">DOANH SỐ SELL-IN</div>
              <div className="font-mono-num mb-1 mt-1 text-2xl font-black tracking-tight text-slate-900">
                {isLoadingOverview ? '...' : formatBillion(overall?.sellin_revenue)}
              </div>
            </div>
            <div className="kpi-growth-footer">
              <div className="kpi-growth-col-left">
                <div className="kpi-growth-item">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="text-[10.5px] text-slate-500">YoY:</span>
                    <b
                      className={`font-mono-num font-bold ${
                        (overall?.yoy_growth_rate || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(overall?.yoy_growth_rate, true)}
                    </b>
                  </div>
                  <div className="kpi-growth-subtext">(vs cùng kỳ: {formatBillion(overall?.ly_sellin)})</div>
                </div>
                <div className="kpi-growth-item mt-0.5">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="text-[10.5px] text-slate-500">YTD:</span>
                    <b
                      className={`font-mono-num font-bold ${
                        ytdByChannel.totalPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatPercent(ytdByChannel.totalPct, true)}
                    </b>
                  </div>
                  <div className="kpi-growth-subtext">(Lũy kế YTD: {formatBillion(ytdByChannel.totalCy)})</div>
                </div>
              </div>
              <div className="kpi-growth-col-right">
                <div className="text-[10px] font-bold uppercase leading-none tracking-wider text-slate-400">MoM MTD</div>
                <div className="my-auto py-0.5">
                  <b
                    className={`font-mono-num text-xs font-bold ${
                      overall?.mom_mtd_rate == null
                        ? 'text-slate-400'
                        : overall.mom_mtd_rate >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {overall?.mom_mtd_rate == null ? '--' : formatPercent(overall.mom_mtd_rate, true)}
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: CHỈ TIÊU TARGET SELL-IN */}
          <div
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
            style={{ borderLeft: '5px solid #8b5cf6' }}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">CHỈ TIÊU TARGET SELL-IN</div>
              <div className="font-mono-num mb-1 mt-1 text-2xl font-black tracking-tight text-purple-700">
                {isLoadingOverview ? '...' : formatBillion(overall?.target_sellin)}
              </div>
            </div>
            <div className="space-y-0.5 border-t border-slate-100/80 pt-1.5 text-[11px] font-semibold">
              <div>
                <span>Chênh lệch (Gap)</span>:{' '}
                <b className={(overall?.gap_sellin || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatBillion(overall?.gap_sellin)}
                </b>
              </div>
              <div className="font-medium text-slate-500">Kế hoạch kinh doanh</div>
            </div>
          </div>

          {/* Card 3: TỶ LỆ ĐẠT CHỈ TIÊU (% TARGET) */}
          <div
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
            style={{ borderLeft: '5px solid #10b981' }}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                TỶ LỆ ĐẠT CHỈ TIÊU (% TARGET)
              </div>
              <div className="font-mono-num mb-1 mt-1 text-2xl font-black tracking-tight text-emerald-600">
                {isLoadingOverview ? '...' : formatPercent(overall?.achievement_rate)}
              </div>
            </div>
            <div className="space-y-0.5 border-t border-slate-100/80 pt-1.5 text-[11px] font-semibold">
              <div>
                <span>Tiến độ</span>:{' '}
                <b className={(overall?.achievement_rate || 0) >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                  {(overall?.achievement_rate || 0) >= 100 ? 'Đạt mục tiêu' : 'Đang theo dõi'}
                </b>
              </div>
            </div>
          </div>

          {/* Card 4: CÙNG KỲ NĂM TRƯỚC (LY) */}
          <div
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
            style={{ borderLeft: '5px solid #f59e0b' }}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">CÙNG KỲ NĂM TRƯỚC (LY)</div>
              <div className="font-mono-num mb-1 mt-1 text-2xl font-black tracking-tight text-slate-900">
                {isLoadingOverview ? '...' : formatBillion(overall?.ly_sellin)}
              </div>
            </div>
            <div className="space-y-0.5 border-t border-slate-100/80 pt-1.5 text-[11px] font-semibold">
              <div>
                <span>Tăng trưởng YoY</span>:{' '}
                <b className={(overall?.yoy_growth_amt || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatBillion(overall?.yoy_growth_amt)}
                </b>
              </div>
              <div className="font-medium text-slate-500">Kỳ tham chiếu: {parseInt(year, 10) - 1}</div>
            </div>
          </div>
        </div>

        {/* ROW 2: 4 CHANNEL CONTRIBUTION CARDS */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNEL_CARDS.map((cfg) => {
            const c = channelCardMap.get(cfg.key);
            const si = c?.sellin || 0;
            const tgt = c?.target || 0;
            const ly = c?.ly || 0;
            const ach = c?.achievement || 0;
            const yoy = c?.yoy || 0;
            const ytdCy = c?.ytdCy || 0;
            const ytdPct = c?.ytdPct || 0;
            const momMtd = c?.momMtdPct ?? null;
            const share = c?.share || 0;
            return (
              <div
                key={cfg.key}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
                style={{ borderLeft: `4px solid ${cfg.border}` }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{cfg.label}</span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                      Tỷ trọng: {formatPercent(share)}
                    </span>
                  </div>
                  <div className="mb-1 mt-1 flex items-center justify-between gap-1">
                    <div className={`font-mono-num text-2xl font-black tracking-tight ${cfg.text}`}>
                      {formatBillion(si)}
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num whitespace-nowrap text-[9px] font-semibold leading-tight text-slate-600">
                        Target: {formatBillion(tgt)} (Đạt {ach.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="kpi-growth-footer">
                  <div className="kpi-growth-col-left">
                    <div className="kpi-growth-item">
                      <div className="flex items-center gap-1 font-semibold">
                        <span className="text-[10.5px] text-slate-500">YoY:</span>
                        <b className={`font-mono-num font-bold ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(yoy, true)}
                        </b>
                      </div>
                      <div className="kpi-growth-subtext">(vs cùng kỳ: {formatBillion(ly)})</div>
                    </div>
                    <div className="kpi-growth-item mt-0.5">
                      <div className="flex items-center gap-1 font-semibold">
                        <span className="text-[10.5px] text-slate-500">YTD:</span>
                        <b className={`font-mono-num font-bold ${ytdPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(ytdPct, true)}
                        </b>
                      </div>
                      <div className="kpi-growth-subtext">(Lũy kế YTD: {formatBillion(ytdCy)})</div>
                    </div>
                  </div>
                  <div className="kpi-growth-col-right">
                    <div className="text-[10px] font-bold uppercase leading-none tracking-wider text-slate-400">MoM MTD</div>
                    <div className="my-auto py-0.5">
                      <b
                        className={`font-mono-num text-xs font-bold ${
                          momMtd == null
                            ? 'text-slate-400'
                            : momMtd >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {momMtd == null ? '--' : formatPercent(momMtd, true)}
                      </b>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2 EXPANDED MATERIAL CHARTS (50% - 50%) matching web_app/index.html */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="material-card flex flex-col p-4 pt-0">
          <div className="floating-chart-header grad-green">
            <ReactECharts option={dailyChartOption} style={{ height: '290px', width: '100%' }} notMerge lazyUpdate />
          </div>
          <div className="flex items-start justify-between px-2 pt-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Daily Sell-in Trend &amp; Nhịp Độ Hàng Ngày</h4>
              <p className="mt-0.5 text-xs text-slate-400">
                Tiến độ xuất hóa đơn SAP thực tế ({apiMonth} — Kênh: {dashChannel})
              </p>
            </div>
            <span className="badge-pill badge-pill-green">SAP Sell-in</span>
          </div>
        </div>

        <div className="material-card flex flex-col p-4 pt-0">
          <div className="floating-chart-header grad-orange">
            <ReactECharts option={monthlyYoYChartOption} style={{ height: '290px', width: '100%' }} notMerge lazyUpdate />
          </div>
          <div className="flex items-start justify-between px-2 pt-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Đối Sánh 12 Tháng {year} vs {parseInt(year, 10) - 1} (YoY Comparison)
              </h4>
              <p className="mt-0.5 text-xs text-slate-400">
                Doanh số thực tế {year} vs cùng kỳ {parseInt(year, 10) - 1} theo bộ lọc đang chọn
              </p>
            </div>
            <span className="badge-pill badge-pill-orange">YoY Trend</span>
          </div>
        </div>
      </div>

      {/* 2 EXPANDABLE HIERARCHY TABLES (50% - 50%) matching web_app/index.html */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Channel -> Sub-Channel -> Account Hierarchy */}
        <div className="material-card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-800">Phân Tích Doanh Số Theo Kênh (Channel Tree)</h4>
            <span className="text-[11px] font-semibold text-slate-400">Kênh → Sub-channel → Account</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-2.5 py-2">Kênh / Sub-channel / Account</th>
                  <th className="px-2 py-2 text-right">Sell-in</th>
                  <th className="px-2 py-2 text-right">Target</th>
                  <th className="px-2 py-2 text-center">% Đạt</th>
                  <th className="px-2 py-2 text-right">YoY</th>
                  <th className="px-2 py-2 text-right">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channelHierarchyTree.map((ch) => {
                  const isChOpen = !!expandedChannels[ch.name];
                  const ach = ch.target > 0 ? (ch.sellin / ch.target) * 100 : 0;
                  const yoy = ch.ly > 0 ? ((ch.sellin - ch.ly) / ch.ly) * 100 : 0;
                  const share = totalChannelTreeSellin > 0 ? (ch.sellin / totalChannelTreeSellin) * 100 : 0;
                  return (
                    <Fragment key={`ch-${ch.name}`}>
                      <tr
                        onClick={() => setExpandedChannels((p) => ({ ...p, [ch.name]: !p[ch.name] }))}
                        className="cursor-pointer bg-slate-50/70 font-bold text-slate-900 hover:bg-blue-50/60"
                      >
                        <td className="px-2.5 py-2">
                          <span className="mr-1.5 inline-block w-3 text-[10px] text-slate-500">{isChOpen ? '▼' : '▶'}</span>
                          {ch.name}
                        </td>
                        <td className="font-mono-num px-2 py-2 text-right">{formatBillion(ch.sellin)}</td>
                        <td className="font-mono-num px-2 py-2 text-right text-slate-500">{formatBillion(ch.target)}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${getAchievementBadgeColor(ach)}`}>
                            {formatPercent(ach)}
                          </span>
                        </td>
                        <td className={`font-mono-num px-2 py-2 text-right ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(yoy, true)}
                        </td>
                        <td className="font-mono-num px-2 py-2 text-right text-slate-600">{formatPercent(share)}</td>
                      </tr>
                      {isChOpen &&
                        ch.subs.map((sc) => {
                          const subKey = `${ch.name}::${sc.name}`;
                          const isSubOpen = !!expandedSubs[subKey];
                          const scAch = sc.target > 0 ? (sc.sellin / sc.target) * 100 : 0;
                          const scYoy = sc.ly > 0 ? ((sc.sellin - sc.ly) / sc.ly) * 100 : 0;
                          const scShare = totalChannelTreeSellin > 0 ? (sc.sellin / totalChannelTreeSellin) * 100 : 0;
                          return (
                            <Fragment key={`sc-${subKey}`}>
                              <tr
                                onClick={() => setExpandedSubs((p) => ({ ...p, [subKey]: !p[subKey] }))}
                                className="cursor-pointer bg-white font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <td className="py-1.5 pl-6 pr-2">
                                  <span className="mr-1.5 inline-block w-3 text-[10px] text-slate-400">
                                    {isSubOpen ? '▼' : '▶'}
                                  </span>
                                  {sc.name}
                                </td>
                                <td className="font-mono-num px-2 py-1.5 text-right">{formatBillion(sc.sellin)}</td>
                                <td className="font-mono-num px-2 py-1.5 text-right text-slate-400">{formatBillion(sc.target)}</td>
                                <td className="px-2 py-1.5 text-center text-[11px]">{formatPercent(scAch)}</td>
                                <td className={`font-mono-num px-2 py-1.5 text-right ${scYoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatPercent(scYoy, true)}
                                </td>
                                <td className="font-mono-num px-2 py-1.5 text-right text-slate-500">{formatPercent(scShare)}</td>
                              </tr>
                              {isSubOpen &&
                                sc.accounts.slice(0, 15).map((acc) => {
                                  const accYoy = acc.ly > 0 ? ((acc.sellin - acc.ly) / acc.ly) * 100 : 0;
                                  const accShare = totalChannelTreeSellin > 0 ? (acc.sellin / totalChannelTreeSellin) * 100 : 0;
                                  return (
                                    <tr key={`acc-${subKey}-${acc.name}`} className="bg-slate-50/40 text-[11px] text-slate-600">
                                      <td className="py-1 pl-11 pr-2">• {acc.name}</td>
                                      <td className="font-mono-num px-2 py-1 text-right">{formatBillion(acc.sellin)}</td>
                                      <td className="font-mono-num px-2 py-1 text-right text-slate-400">{formatBillion(acc.target)}</td>
                                      <td className="px-2 py-1 text-center text-slate-400">--</td>
                                      <td className={`font-mono-num px-2 py-1 text-right ${accYoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatPercent(accYoy, true)}
                                      </td>
                                      <td className="font-mono-num px-2 py-1 text-right text-slate-400">{formatPercent(accShare)}</td>
                                    </tr>
                                  );
                                })}
                            </Fragment>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Category -> PH1 Hierarchy */}
        <div className="material-card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-800">Cơ Cấu Doanh Số Theo Ngành Hàng</h4>
            <span className="text-[11px] font-semibold text-slate-400">Category → PH1</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-2.5 py-2">Ngành hàng / PH1</th>
                  <th className="px-2 py-2 text-right">Sell-in</th>
                  <th className="px-2 py-2 text-right">Cùng kỳ (LY)</th>
                  <th className="px-2 py-2 text-right">YoY</th>
                  <th className="px-2 py-2 text-right">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryTree.map((cate) => {
                  const isOpen = !!expandedCates[cate.name];
                  const yoy = cate.ly > 0 ? ((cate.sellin - cate.ly) / cate.ly) * 100 : 0;
                  const share = totalCategorySellin > 0 ? (cate.sellin / totalCategorySellin) * 100 : 0;
                  return (
                    <Fragment key={`cate-${cate.name}`}>
                      <tr
                        onClick={() => setExpandedCates((p) => ({ ...p, [cate.name]: !p[cate.name] }))}
                        className="cursor-pointer bg-slate-50/70 font-bold text-slate-900 hover:bg-blue-50/60"
                      >
                        <td className="px-2.5 py-2">
                          <span className="mr-1.5 inline-block w-3 text-[10px] text-slate-500">{isOpen ? '▼' : '▶'}</span>
                          {cate.name}
                        </td>
                        <td className="font-mono-num px-2 py-2 text-right">{formatBillion(cate.sellin)}</td>
                        <td className="font-mono-num px-2 py-2 text-right text-slate-500">{formatBillion(cate.ly)}</td>
                        <td className={`font-mono-num px-2 py-2 text-right ${yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPercent(yoy, true)}
                        </td>
                        <td className="font-mono-num px-2 py-2 text-right text-slate-600">{formatPercent(share)}</td>
                      </tr>
                      {isOpen &&
                        cate.ph1s.map((ph1) => {
                          const pYoy = ph1.ly > 0 ? ((ph1.sellin - ph1.ly) / ph1.ly) * 100 : 0;
                          const pShare = totalCategorySellin > 0 ? (ph1.sellin / totalCategorySellin) * 100 : 0;
                          return (
                            <tr key={`ph1-${cate.name}-${ph1.name}`} className="bg-white text-[11px] text-slate-600">
                              <td className="py-1.5 pl-7 pr-2">• {ph1.name}</td>
                              <td className="font-mono-num px-2 py-1.5 text-right">{formatBillion(ph1.sellin)}</td>
                              <td className="font-mono-num px-2 py-1.5 text-right text-slate-400">{formatBillion(ph1.ly)}</td>
                              <td className={`font-mono-num px-2 py-1.5 text-right ${pYoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatPercent(pYoy, true)}
                              </td>
                              <td className="font-mono-num px-2 py-1.5 text-right text-slate-400">{formatPercent(pShare)}</td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
