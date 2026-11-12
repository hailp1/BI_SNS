import { Activity, DollarSign, Store, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatPercent, getAchievementBadgeColor } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtTreeRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sellout_val?: number;
  sellin_val?: number;
  target_so?: number;
  aso?: number;
  mcp?: number;
}

interface GtAsoRow {
  year?: string;
  month_num?: number | string;
  mien?: string;
  vung?: string;
  gsbh?: string;
  npp_code?: string;
  aso_count?: number;
}

interface GtMcpRow {
  year?: string;
  month_num?: number | string;
  mien?: string;
  vung?: string;
  gsbh?: string;
  npp_code?: string;
  mcp_count?: number;
}

interface TargetSoRow {
  year?: string;
  month?: string;
  channel?: string;
  distributor_code?: string;
  target_amt?: number;
}

interface GtSiRow {
  month?: string;
  npp_code?: string;
  sellin_val?: number;
}

interface GtDailySiRow {
  month?: string;
  date_val?: string;
  npp_code?: string;
  daily_si?: number;
}

interface GtDailySoRow {
  month?: string;
  date_val?: string;
  npp_code?: string;
  daily_so?: number;
}

interface GtStockRow {
  month?: string;
  npp_code?: string;
  stock_val?: number;
}

interface NppSummaryRow {
  nppCode: string;
  nppName: string;
  vung: string;
  gsbh: string;
  sellin: number;
  sellout: number;
  target: number;
  lySellout: number;
  achievement: number;
  yoy: number;
}

export function GtOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) =>
    Boolean(
      s.loading.GT_TREE ||
        s.loading.GT_SI ||
        s.loading.GT_STOCK ||
        s.loading.GT_ASO_M ||
        s.loading.GT_MCP_M ||
        s.loading.GT_DAILY_SI ||
        s.loading.GT_DAILY_SO,
    ),
  );

  const [gtTree, setGtTree] = useState<GtTreeRow[]>([]);
  const [gtAso, setGtAso] = useState<GtAsoRow[]>([]);
  const [gtMcp, setGtMcp] = useState<GtMcpRow[]>([]);
  const [gtSi, setGtSi] = useState<GtSiRow[]>([]);
  const [targetSo, setTargetSo] = useState<TargetSoRow[]>([]);
  const [gtDailySi, setGtDailySi] = useState<GtDailySiRow[]>([]);
  const [gtDailySo, setGtDailySo] = useState<GtDailySoRow[]>([]);
  const [gtStock, setGtStock] = useState<GtStockRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('GT_TREE', user),
      loadPayload('GT_ASO_M', user),
      loadPayload('GT_MCP_M', user),
      loadPayload('GT_SI', user),
      loadPayload('TARGET_SELLOUT', user),
      loadPayload('GT_DAILY_SI', user),
      loadPayload('GT_DAILY_SO', user),
      loadPayload('GT_STOCK', user),
    ]).then(([tree, aso, mcp, si, tgt, dSi, dSo, stk]) => {
      if (!active) return;
      if (Array.isArray(tree)) setGtTree(tree as GtTreeRow[]);
      if (Array.isArray(aso)) setGtAso(aso as GtAsoRow[]);
      if (Array.isArray(mcp)) setGtMcp(mcp as GtMcpRow[]);
      if (Array.isArray(si)) setGtSi(si as GtSiRow[]);
      if (Array.isArray(tgt)) setTargetSo(tgt as TargetSoRow[]);
      if (Array.isArray(dSi)) setGtDailySi(dSi as GtDailySiRow[]);
      if (Array.isArray(dSo)) setGtDailySo(dSo as GtDailySoRow[]);
      if (Array.isArray(stk)) setGtStock(stk as GtStockRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const { totals, regionBars, nppRows, asoCount, mcpCount } = useMemo(() => {
    const matchesGeo = (r: { mien?: string; vung?: string; cluster?: string; office?: string; gsbh?: string; gsbh_name?: string; npp_code?: string }) => {
      if (geoMien !== 'ALL' && r.mien !== geoMien) return false;
      if (geoVung !== 'ALL' && r.vung !== geoVung && r.cluster !== geoVung) return false;
      const g = String(r.office || r.gsbh || r.gsbh_name || '');
      if (geoGsbh !== 'ALL' && g !== geoGsbh) return false;
      if (geoNpp !== 'ALL' && String(r.npp_code || '') !== geoNpp) return false;
      return true;
    };

    const lyYear = String(parseInt(year, 10) - 1);
    let sellout = 0;
    let sellin = 0;
    let lySellout = 0;
    let target = 0;

    const regMap = new Map<string, number>();
    const nppMap = new Map<string, NppSummaryRow>();
    const nppGeoMap = new Map<string, { mien?: string; vung?: string; gsbh?: string; npp_code?: string }>();

    for (const r of gtTree) {
      const code = String(r.npp_code || 'UNKNOWN');
      if (!nppGeoMap.has(code)) {
        nppGeoMap.set(code, {
          mien: r.mien,
          vung: r.vung || r.cluster,
          gsbh: String(r.office || r.gsbh_name || r.gsbh || ''),
          npp_code: code,
        });
      }
      if (!matchMonthNum(r.month_num, selectedMonths) || !matchesGeo(r)) continue;
      const rYear = String(r.year || '');
      const val = Number(r.sellout_val) || 0;

      if (!nppMap.has(code)) {
        nppMap.set(code, {
          nppCode: code,
          nppName: String(r.npp_name || code),
          vung: String(r.vung || r.cluster || '-'),
          gsbh: String(r.office || r.gsbh_name || r.gsbh || '-'),
          sellout: 0,
          sellin: 0,
          target: 0,
          lySellout: 0,
          achievement: 0,
          yoy: 0,
        });
      }
      const entry = nppMap.get(code)!;

      if (rYear === year) {
        sellout += val;
        entry.sellout += val;
        const reg = String(r.vung || r.mien || 'Khác');
        regMap.set(reg, (regMap.get(reg) || 0) + val);
      } else if (rYear === lyYear) {
        lySellout += val;
        entry.lySellout += val;
      }
    }

    // Aggregate GT_SI (month: 'YYYY-MM', npp_code, sellin_val)
    for (const r of gtSi) {
      const mStr = String(r.month || '');
      if (!mStr.startsWith(year)) continue;
      const mNum = parseInt(mStr.slice(5, 7), 10);
      if (!matchMonthNum(mNum, selectedMonths)) continue;
      const code = String(r.npp_code || 'UNKNOWN');
      const geo = nppGeoMap.get(code);
      if (geo && !matchesGeo(geo)) continue;
      if (!geo && (geoMien !== 'ALL' || geoVung !== 'ALL' || geoGsbh !== 'ALL' || (geoNpp !== 'ALL' && code !== geoNpp))) continue;
      const val = Number(r.sellin_val) || 0;
      sellin += val;
      const entry = nppMap.get(code);
      if (entry) entry.sellin += val;
    }

    // Aggregate TARGET_SELLOUT for channel === 'GT'
    for (const r of targetSo) {
      if (String(r.channel || '').toUpperCase() !== 'GT') continue;
      const mStr = String(r.month || '');
      const rYear = r.year ? String(r.year) : mStr.slice(0, 4);
      if (rYear !== year) continue;
      const mNum = mStr.includes('-') ? parseInt(mStr.slice(5, 7), 10) : parseInt(mStr, 10);
      if (!matchMonthNum(mNum, selectedMonths)) continue;
      const code = String(r.distributor_code || '').trim();
      if (code) {
        const geo = nppGeoMap.get(code);
        if (geo && !matchesGeo(geo)) continue;
        if (!geo && (geoMien !== 'ALL' || geoVung !== 'ALL' || geoGsbh !== 'ALL' || (geoNpp !== 'ALL' && code !== geoNpp))) continue;
      }
      const amt = Number(r.target_amt) || 0;
      target += amt;
      if (code && nppMap.has(code)) {
        nppMap.get(code)!.target += amt;
      }
    }

    let asoTotal = 0;
    for (const r of gtAso) {
      if (String(r.year || '') !== year) continue;
      if (!matchMonthNum(r.month_num, selectedMonths) || !matchesGeo(r)) continue;
      asoTotal += Number(r.aso_count) || 0;
    }

    let mcpTotal = 0;
    for (const r of gtMcp) {
      if (String(r.year || '') !== year) continue;
      if (!matchMonthNum(r.month_num, selectedMonths) || !matchesGeo(r)) continue;
      mcpTotal += Number(r.mcp_count) || 0;
    }

    const rows = Array.from(nppMap.values())
      .map((item) => ({
        ...item,
        achievement: item.target > 0 ? (item.sellout / item.target) * 100 : 0,
        yoy: item.lySellout > 0 ? ((item.sellout - item.lySellout) / item.lySellout) * 100 : 0,
      }))
      .filter((x) => x.sellout > 0 || x.sellin > 0 || x.lySellout > 0 || x.target > 0);

    const bars = Array.from(regMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totals: {
        sellout,
        sellin,
        lySellout,
        target,
        achievement: target > 0 ? (sellout / target) * 100 : 0,
        yoy: lySellout > 0 ? ((sellout - lySellout) / lySellout) * 100 : 0,
      },
      regionBars: bars,
      nppRows: rows,
      asoCount: asoTotal,
      mcpCount: mcpTotal,
    };
  }, [gtTree, gtAso, gtMcp, gtSi, targetSo, year, selectedMonths, geoMien, geoVung, geoGsbh, geoNpp]);

  const allowedNppSet = useMemo(() => {
    if (geoMien === 'ALL' && geoVung === 'ALL' && geoGsbh === 'ALL' && geoNpp === 'ALL') {
      return null;
    }
    const s = new Set<string>();
    for (const r of gtTree) {
      if (
        (geoMien === 'ALL' || r.mien === geoMien) &&
        (geoVung === 'ALL' || r.vung === geoVung || r.cluster === geoVung) &&
        (geoGsbh === 'ALL' || String(r.office || r.gsbh || r.gsbh_name || '') === geoGsbh) &&
        (geoNpp === 'ALL' || String(r.npp_code || '') === geoNpp)
      ) {
        if (r.npp_code) s.add(String(r.npp_code));
      }
    }
    return s;
  }, [gtTree, geoMien, geoVung, geoGsbh, geoNpp]);

  const sisoDoiOption = useMemo(() => {
    const siM = new Array<number>(12).fill(0);
    const soM = new Array<number>(12).fill(0);
    const stkM = new Array<number>(12).fill(0);

    for (const r of gtTree) {
      if (String(r.year) !== year) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx >= 0 && idx < 12) soM[idx] += (Number(r.sellout_val) || 0) / 1e9;
    }
    for (const r of gtSi) {
      const mStr = String(r.month || '');
      if (!mStr.startsWith(year)) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const idx = parseInt(mStr.slice(5, 7), 10) - 1;
      if (idx >= 0 && idx < 12) siM[idx] += (Number(r.sellin_val) || 0) / 1e9;
    }
    for (const r of gtStock) {
      const mStr = String(r.month || '');
      if (!mStr.startsWith(year)) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const idx = parseInt(mStr.slice(5, 7), 10) - 1;
      if (idx >= 0 && idx < 12) stkM[idx] += (Number(r.stock_val) || 0) / 1e9;
    }
    const doiM = soM.map((so, i) => (so > 0 ? Number(((stkM[i] / (so / 30))).toFixed(1)) : 0));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell-in (Tỷ)', 'Sell-out (Tỷ)', 'DOI (Ngày)'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 44, top: 36, bottom: 28 },
      xAxis: { type: 'category' as const, data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
        { type: 'value' as const, name: 'Ngày', nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        { name: 'Sell-in (Tỷ)', type: 'bar' as const, data: siM.map((v) => Number(v.toFixed(2))), itemStyle: { color: '#38BDF8', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9 }, labelLayout: { hideOverlap: true } },
        { name: 'Sell-out (Tỷ)', type: 'bar' as const, data: soM.map((v) => Number(v.toFixed(2))), itemStyle: { color: '#34D399', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 9 }, labelLayout: { hideOverlap: true } },
        { name: 'DOI (Ngày)', type: 'line' as const, yAxisIndex: 1, smooth: true, data: doiM, itemStyle: { color: '#fde047' }, lineStyle: { width: 2.5, color: '#fde047' }, label: { show: true, position: 'top' as const, color: '#fde047', fontSize: 9 }, labelLayout: { hideOverlap: true } },
      ],
    };
  }, [gtTree, gtSi, gtStock, year, allowedNppSet]);

  const asoMcpTrendOption = useMemo(() => {
    const asoM = new Array<number>(12).fill(0);
    const mcpM = new Array<number>(12).fill(0);
    for (const r of gtAso) {
      if (String(r.year) !== year) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx >= 0 && idx < 12) asoM[idx] += Number(r.aso_count || 0);
    }
    for (const r of gtMcp) {
      if (String(r.year) !== year) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const idx = parseInt(String(r.month_num || '0'), 10) - 1;
      if (idx >= 0 && idx < 12) mcpM[idx] += Number(r.mcp_count || 0);
    }
    const activePctM = mcpM.map((m, i) => (m > 0 ? Number(((asoM[i] / m) * 100).toFixed(1)) : 0));
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['MCP', 'ASO', '% Active'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 52, right: 44, top: 36, bottom: 28 },
      xAxis: { type: 'category' as const, data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
        { type: 'value' as const, name: '%', nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        { name: 'MCP', type: 'line' as const, smooth: true, data: mcpM, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2.2, color: '#C084FC' }, label: { show: true, position: 'top' as const, color: '#F3E8FF', fontSize: 9 }, labelLayout: { hideOverlap: true } },
        { name: 'ASO', type: 'line' as const, smooth: true, data: asoM, itemStyle: { color: '#34D399' }, lineStyle: { width: 2.5, color: '#34D399' }, label: { show: true, position: 'bottom' as const, color: '#D1FAE5', fontSize: 9 }, labelLayout: { hideOverlap: true } },
        { name: '% Active', type: 'line' as const, yAxisIndex: 1, smooth: true, data: activePctM, itemStyle: { color: '#fde047' }, lineStyle: { width: 2, type: 'dashed' as const, color: '#fde047' } },
      ],
    };
  }, [gtAso, gtMcp, year, allowedNppSet]);

  const dailySisoOption = useMemo(() => {
    const map = new Map<string, { si: number; so: number }>();
    for (const r of gtDailySi) {
      const dt = String(r.date_val || '');
      if (!dt.startsWith(year) || !matchMonthNum(dt.slice(5, 7), selectedMonths)) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const e = map.get(dt) || { si: 0, so: 0 };
      e.si += (Number(r.daily_si) || 0) / 1e9;
      map.set(dt, e);
    }
    for (const r of gtDailySo) {
      const dt = String(r.date_val || '');
      if (!dt.startsWith(year) || !matchMonthNum(dt.slice(5, 7), selectedMonths)) continue;
      if (allowedNppSet && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      const e = map.get(dt) || { si: 0, so: 0 };
      e.so += (Number(r.daily_so) || 0) / 1e9;
      map.set(dt, e);
    }
    const keys = Array.from(map.keys()).sort();
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Daily Sell-in', 'Daily Sell-out'], top: 4, textStyle: { color: '#fff', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 36, bottom: 28 },
      xAxis: { type: 'category' as const, data: keys.map((k) => k.slice(5)), axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 } },
      yAxis: { type: 'value' as const, name: 'Tỷ', nameTextStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, axisLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } } },
      series: [
        { name: 'Daily Sell-in', type: 'line' as const, smooth: true, areaStyle: { color: 'rgba(56,189,248,0.18)' }, data: keys.map((k) => Number((map.get(k)?.si || 0).toFixed(2))), itemStyle: { color: '#38BDF8' }, lineStyle: { width: 2.2, color: '#38BDF8' }, label: { show: true, position: 'top' as const, color: '#E0F2FE', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'Daily Sell-out', type: 'line' as const, smooth: true, areaStyle: { color: 'rgba(253,224,71,0.16)' }, data: keys.map((k) => Number((map.get(k)?.so || 0).toFixed(2))), itemStyle: { color: '#fde047' }, lineStyle: { width: 2.5, color: '#fde047' }, label: { show: true, position: 'bottom' as const, color: '#FEF08A', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
      ],
    };
  }, [gtDailySi, gtDailySo, year, selectedMonths, allowedNppSet]);

  const regionChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      grid: { left: 60, right: 20, top: 20, bottom: 48 },
      xAxis: {
        type: 'category' as const,
        data: regionBars.map((b) => b.name),
        axisLabel: { rotate: 20, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
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
          name: 'Sell-out',
          type: 'bar' as const,
          data: regionBars.map((b) => Math.round(b.value / 1e6)),
          itemStyle: { color: 'rgba(255,255,255,0.9)', borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [regionBars],
  );

  const columns: ColumnDef<NppSummaryRow>[] = [
    {
      key: 'nppName',
      header: 'Nhà Phân Phối',
      sortValue: (r) => r.nppName,
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.nppName}</p>
          <p className="text-[11px] text-slate-400">{r.nppCode}</p>
        </div>
      ),
    },
    { key: 'vung', header: 'Vùng', sortValue: (r) => r.vung, render: (r) => r.vung },
    { key: 'gsbh', header: 'GSBH / Office', sortValue: (r) => r.gsbh, render: (r) => r.gsbh },
    {
      key: 'sellout',
      header: 'Sell-out',
      align: 'right',
      sortValue: (r) => r.sellout,
      render: (r) => <span className="font-semibold">{formatCurrencyVnd(r.sellout)}</span>,
    },
    {
      key: 'sellin',
      header: 'Sell-in',
      align: 'right',
      sortValue: (r) => r.sellin,
      render: (r) => formatCurrencyVnd(r.sellin),
    },
    {
      key: 'target',
      header: 'Mục tiêu',
      align: 'right',
      sortValue: (r) => r.target,
      render: (r) => formatCurrencyVnd(r.target),
    },
    {
      key: 'achievement',
      header: '% Đạt',
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
          <h1 className="text-xl font-bold text-slate-900">Kênh GT — Điều hành Hệ thống Nhà Phân Phối</h1>
          <p className="text-xs text-slate-500">Tổng hợp Sell-out, ASO/MCP và hiệu suất từng Nhà Phân Phối (RLS)</p>
        </div>
        <ExportExcelButton
          filename={`CJ_GT_NPP_${year}.xlsx`}
          sheetName="GT_NPP"
          rows={nppRows}
          columns={[
            { header: 'Mã NPP', key: 'nppCode' },
            { header: 'Tên NPP', key: 'nppName' },
            { header: 'Vùng', key: 'vung' },
            { header: 'GSBH', key: 'gsbh' },
            { header: 'Sell-out (VNĐ)', key: (r) => Math.round(r.sellout) },
            { header: 'Sell-in (VNĐ)', key: (r) => Math.round(r.sellin) },
            { header: 'Target (VNĐ)', key: (r) => Math.round(r.target) },
            { header: '% Đạt', key: (r) => Number(r.achievement.toFixed(1)) },
            { header: '% YoY', key: (r) => Number(r.yoy.toFixed(1)) },
          ]}
        />
      </div>

      <GeoFilterBar records={gtTree} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="GT Sell-out"
          value={loading ? '...' : formatCurrencyVnd(totals.sellout)}
          subtitle={`Sell-in: ${formatCurrencyVnd(totals.sellin)} | Cùng kỳ: ${formatCurrencyVnd(totals.lySellout)}`}
          badge={formatPercent(totals.yoy, true)}
          badgeTone={totals.yoy >= 0 ? 'positive' : 'negative'}
          accent="red"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          title="Mục tiêu GT"
          value={loading ? '...' : formatCurrencyVnd(totals.target)}
          subtitle={`Số NPP hoạt động: ${nppRows.length}`}
          badge={formatPercent(totals.achievement)}
          badgeTone={totals.achievement >= 100 ? 'positive' : 'negative'}
          accent="emerald"
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          title="Điểm bán ASO"
          value={asoCount.toLocaleString('vi-VN')}
          subtitle="Active Selling Outlets"
          accent="blue"
          icon={<Store className="h-5 w-5" />}
        />
        <KpiCard
          title="Tổng MCP"
          value={mcpCount.toLocaleString('vi-VN')}
          subtitle="Master Call Plan Coverage"
          accent="amber"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="GT Sell-in vs Sell-out & DOI (Ngày Tồn Kho)"
          subtitle="Đối sánh 12 tháng theo NPP đang lọc"
          option={sisoDoiOption}
          height={280}
          loading={loading}
          gradientClass="grad-blue"
          badgeText="SI / SO / DOI"
          badgeClass="badge-pill badge-pill-blue"
        />
        <EChartsCard
          title="Xu Hướng Độ Phủ ASO vs MCP (12 Tháng)"
          subtitle="Active Selling Outlets vs Master Call Plan"
          option={asoMcpTrendOption}
          height={280}
          loading={loading}
          gradientClass="grad-purple"
          badgeText="ASO / MCP"
          badgeClass="badge-pill badge-pill-purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard
          title="Nhịp Độ Daily Sell-in vs Daily Sell-out GT"
          subtitle="Đơn vị: Tỷ VNĐ theo ngày"
          option={dailySisoOption}
          height={280}
          loading={loading}
          gradientClass="grad-green"
          badgeText="Daily SI/SO"
          badgeClass="badge-pill badge-pill-green"
        />
        <EChartsCard
          title="Doanh số Sell-out GT theo Vùng"
          subtitle="Đơn vị: Triệu VNĐ"
          option={regionChartOption}
          height={280}
          loading={loading}
          gradientClass="grad-orange"
          badgeText="GT Regional"
          badgeClass="badge-pill badge-pill-orange"
        />
      </div>

      <DataTable
        data={nppRows}
        columns={columns}
        searchPlaceholder="Tìm mã NPP, tên NPP, GSBH..."
        searchFilter={(r, q) =>
          r.nppName.toLowerCase().includes(q) ||
          r.nppCode.toLowerCase().includes(q) ||
          r.gsbh.toLowerCase().includes(q)
        }
      />
    </div>
  );
}
