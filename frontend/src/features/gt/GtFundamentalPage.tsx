import {
  Activity,
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { KpiCard } from '../../shared/components/KpiCard';
import { useAuthStore } from '../../shared/stores/auth.store';
import { useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatNumber, formatPercent } from '../../shared/utils/format';
import { GeoFilterBar, type GeoRecord } from './GeoFilterBar';

interface GtFundTreeRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  sellout_val?: number;
}
interface GtSiRow {
  month?: string;
  npp_code?: string;
  sellin_val?: number;
}
interface GtAsoRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  aso_count?: number;
}
interface GtMcpRow extends GeoRecord {
  year?: string;
  month_num?: number | string;
  mcp_count?: number;
}
interface GtL3mRow extends GeoRecord {
  month?: string;
  l3m_aso?: number;
}
interface GtNvbhRow extends GeoRecord {
  year?: string;
  month?: string;
  month_num?: number | string;
  npp_code?: string;
  npp_name?: string;
  nvbh_name?: string;
  sellout_val?: number;
  aso_count?: number;
  order_count?: number;
  order_sku_cnt?: number;
  aso_sku_cnt?: number;
  storage?: string;
}
interface GtNvbhMcpRow extends GeoRecord {
  month?: string;
  npp_code?: string;
  npp_name?: string;
  nvbh_name?: string;
  mcp_count?: number;
}

interface MonthBucket {
  si: number;
  so: number;
  aso: number;
  mcp: number;
  l3m: number;
  nvSo: number;
  nvOrd: number;
  nvAso: number;
  ordSku: number;
  asoSku: number;
}

interface TreeNode {
  id: string;
  code?: string;
  name: string;
  displayName?: string;
  level: 1 | 2 | 3 | 4 | 5;
  sellout: number;
  mcp: number;
  aso: number;
  orders: number;
  order_skus: number;
  aso_skus: number;
  children: Record<string, TreeNode>;
}

type HealthFilterKey = 'ALL' | 'WARN_COV' | 'WARN_FREQ' | 'WARN_LPPC' | 'GOOD';

interface TerritoryInsight {
  status: HealthFilterKey | 'WARN_DS' | 'NORMAL';
  label: string;
  badgeClass: string;
  hint: string;
}

function toMonthKey(y: unknown, m: unknown): string {
  const ys = String(y || '').trim();
  const ms = String(m || '').trim().padStart(2, '0');
  if (ys.length === 4 && ms.length === 2 && ms !== '00') return `${ys}-${ms}`;
  return '';
}

function formatVND(val: number): string {
  const abs = Math.abs(val);
  if (abs === 0) return '0';
  if (abs >= 1e9) return `${(val / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(0)} K`;
  return Math.round(val).toLocaleString('vi-VN');
}

function formatExactVND(val: number): string {
  return `${Math.round(val).toLocaleString('vi-VN')} ₫`;
}

function getTerritoryInsight(node: { aso: number; mcp: number; orders: number; sellout: number; order_skus: number }): TerritoryInsight {
  const aso = Number(node.aso) || 0;
  const mcp = Number(node.mcp) || 0;
  const orders = Number(node.orders) || 0;
  const sellout = Number(node.sellout) || 0;
  const cov = mcp > 0 ? (aso / mcp) * 100 : 0;
  const freq = aso > 0 ? orders / aso : 0;
  const dropSize = orders > 0 ? sellout / orders : 0;
  const lppc = orders > 0 ? node.order_skus / orders : 0;

  if (mcp > 0 && aso === 0) {
    return {
      status: 'WARN_COV',
      label: '🔴 0 ASO (Chưa bán)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      hint: 'Chưa phát sinh doanh số trên toàn bộ tuyến',
    };
  }
  if (mcp > 0 && cov < 60) {
    return {
      status: 'WARN_COV',
      label: `🔴 Phủ thấp (${cov.toFixed(1)}%)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      hint: 'Hơn 40% điểm bán chưa mua hàng trong tháng. Cần tập trung mở rộng tuyến mua.',
    };
  }
  if (aso > 0 && freq < 1.4) {
    return {
      status: 'WARN_FREQ',
      label: `⚠️ Tần suất thấp (${freq.toFixed(1)})`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      hint: 'Khách chỉ mua ~1 lần/tháng. Cần tăng số chu kỳ viếng thăm (F2, F4).',
    };
  }
  if (orders > 0 && lppc < 1.8) {
    return {
      status: 'WARN_LPPC',
      label: `📦 Sku/order thấp (${lppc.toFixed(1)})`,
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      hint: 'Bình quân dưới 1.8 SKU/đơn. Cần tập trung chào bán chéo và đẩy combo.',
    };
  }
  if (orders > 0 && dropSize < 450000) {
    return {
      status: 'WARN_DS',
      label: `📉 Đơn nhỏ (${(dropSize / 1000).toFixed(0)}k)`,
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
      hint: 'Giá trị đơn bình quân thấp. Cần khuyến khích đơn lớn & tích lũy.',
    };
  }
  if (cov >= 70 && freq >= 1.7 && lppc >= 2.0) {
    return {
      status: 'GOOD',
      label: '🟢 Vận hành tốt',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold',
      hint: 'Độ phủ, tần suất mua và độ rộng danh mục đều đạt chuẩn tốt.',
    };
  }
  return {
    status: 'NORMAL',
    label: '⚪ Ổn định',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    hint: 'Hiệu suất nền tảng ở mức trung bình ổn định.',
  };
}

export function GtFundamentalPage() {
  const user = useAuthStore((s) => s.user);
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const geoMien = useFiltersStore((s) => s.geoMien);
  const geoVung = useFiltersStore((s) => s.geoVung);
  const geoGsbh = useFiltersStore((s) => s.geoGsbh);
  const geoNpp = useFiltersStore((s) => s.geoNpp);
  const loadPayload = usePayloadsStore((s) => s.loadPayload);
  const loading = usePayloadsStore((s) => Boolean(s.loading.GT_NVBH_M || s.loading.GT_ASO_M || s.loading.GT_NVBH_MCP_M));

  const [gtTree, setGtTree] = useState<GtFundTreeRow[]>([]);
  const [gtSi, setGtSi] = useState<GtSiRow[]>([]);
  const [gtAso, setGtAso] = useState<GtAsoRow[]>([]);
  const [gtMcp, setGtMcp] = useState<GtMcpRow[]>([]);
  const [gtL3m, setGtL3m] = useState<GtL3mRow[]>([]);
  const [gtNvbh, setGtNvbh] = useState<GtNvbhRow[]>([]);
  const [gtNvbhMcp, setGtNvbhMcp] = useState<GtNvbhMcpRow[]>([]);

  // Tree interactive state
  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set());
  const [healthFilter, setHealthFilter] = useState<HealthFilterKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('GT_TREE', user),
      loadPayload('GT_SI', user),
      loadPayload('GT_ASO_M', user),
      loadPayload('GT_MCP_M', user),
      loadPayload('GT_L3M', user),
      loadPayload('GT_NVBH_M', user),
      loadPayload('GT_NVBH_MCP_M', user),
    ]).then(([tree, si, aso, mcp, l3m, nvbh, nvbhMcp]) => {
      if (!active) return;
      if (Array.isArray(tree)) setGtTree(tree as GtFundTreeRow[]);
      if (Array.isArray(si)) setGtSi(si as GtSiRow[]);
      if (Array.isArray(aso)) setGtAso(aso as GtAsoRow[]);
      if (Array.isArray(mcp)) setGtMcp(mcp as GtMcpRow[]);
      if (Array.isArray(l3m)) setGtL3m(l3m as GtL3mRow[]);
      if (Array.isArray(nvbh)) setGtNvbh(nvbh as GtNvbhRow[]);
      if (Array.isArray(nvbhMcp)) setGtNvbhMcp(nvbhMcp as GtNvbhMcpRow[]);
    });
    return () => {
      active = false;
    };
  }, [loadPayload, user]);

  const matchGeo = useCallback(
    (r: GeoRecord) =>
      (geoMien === 'ALL' || r.mien === geoMien) &&
      (geoVung === 'ALL' || r.vung === geoVung) &&
      (geoGsbh === 'ALL' || r.gsbh === geoGsbh || r.office === geoGsbh) &&
      (geoNpp === 'ALL' || r.npp_code === geoNpp),
    [geoMien, geoVung, geoGsbh, geoNpp],
  );

  const allowedNppSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of gtTree) {
      if (matchGeo(r) && r.npp_code) s.add(String(r.npp_code));
    }
    return s;
  }, [gtTree, matchGeo]);

  // -------------------------------------------------------------
  // METRICS FOR 5 TREND CHARTS
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const map = new Map<string, MonthBucket>();
    const getB = (k: string) => {
      let b = map.get(k);
      if (!b) {
        b = { si: 0, so: 0, aso: 0, mcp: 0, l3m: 0, nvSo: 0, nvOrd: 0, nvAso: 0, ordSku: 0, asoSku: 0 };
        map.set(k, b);
      }
      return b;
    };

    for (const r of gtTree) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).so += (Number(r.sellout_val) || 0) / 1e9;
    }
    for (const r of gtSi) {
      const k = String(r.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(k)) continue;
      if (allowedNppSet.size > 0 && r.npp_code && !allowedNppSet.has(String(r.npp_code))) continue;
      getB(k).si += (Number(r.sellin_val) || 0) / 1e9;
    }
    for (const r of gtAso) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).aso += Number(r.aso_count || 0);
    }
    for (const r of gtMcp) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (k) getB(k).mcp += Number(r.mcp_count || 0);
    }
    for (const r of gtL3m) {
      if (!matchGeo(r)) continue;
      const k = String(r.month || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(k)) getB(k).l3m += Number(r.l3m_aso || 0);
    }
    for (const r of gtNvbh) {
      if (!matchGeo(r)) continue;
      const k = toMonthKey(r.year, r.month_num);
      if (!k) continue;
      const b = getB(k);
      b.nvSo += Number(r.sellout_val || 0);
      b.nvOrd += Number(r.order_count || 0);
      b.nvAso += Number(r.aso_count || 0);
      b.ordSku += Number(r.order_sku_cnt || 0);
      b.asoSku += Number(r.aso_sku_cnt || 0);
    }

    const keys = Array.from(map.keys()).filter((k) => k >= '2025-01').sort();
    const labels = keys.map((k) => `${k.slice(2, 4)}-${k.slice(5, 7)}`);

    const selKeys = selectedMonths.map((m) => `${year}-${m.padStart(2, '0')}`);
    let totSo = 0;
    let totOrd = 0;
    let totNvAso = 0;
    let totAso = 0;
    let totMcp = 0;
    let totSku = 0;
    for (const sk of selKeys) {
      const b = map.get(sk);
      if (!b) continue;
      totSo += b.nvSo;
      totOrd += b.nvOrd;
      totNvAso += b.nvAso;
      totAso += b.aso;
      totMcp += b.mcp;
      totSku += b.ordSku;
    }

    const exportRows = keys.map((k) => {
      const b = map.get(k)!;
      return {
        month: k,
        sellinB: Number(b.si.toFixed(2)),
        selloutB: Number(b.so.toFixed(2)),
        mcp: b.mcp,
        aso: b.aso,
        l3m: b.l3m,
        dropsizeM: b.nvOrd > 0 ? Number((b.nvSo / b.nvOrd / 1e6).toFixed(2)) : 0,
        vpoM: b.nvAso > 0 ? Number((b.nvSo / b.nvAso / 1e6).toFixed(2)) : 0,
        freq: b.nvAso > 0 ? Number((b.nvOrd / b.nvAso).toFixed(2)) : 0,
        skuPerOrder: b.nvOrd > 0 ? Number((b.ordSku / b.nvOrd).toFixed(2)) : 0,
      };
    });

    return {
      labels,
      si: keys.map((k) => Number(map.get(k)!.si.toFixed(2))),
      so: keys.map((k) => Number(map.get(k)!.so.toFixed(2))),
      aso: keys.map((k) => map.get(k)!.aso),
      mcp: keys.map((k) => map.get(k)!.mcp),
      l3m: keys.map((k) => map.get(k)!.l3m),
      dropsize: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvOrd > 0 ? Number((b.nvSo / b.nvOrd / 1e6).toFixed(2)) : 0;
      }),
      vpo: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.nvSo / b.nvAso / 1e6).toFixed(2)) : 0;
      }),
      freq: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.nvOrd / b.nvAso).toFixed(2)) : 0;
      }),
      skuPerOrder: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvOrd > 0 ? Number((b.ordSku / b.nvOrd).toFixed(2)) : 0;
      }),
      skuPerAso: keys.map((k) => {
        const b = map.get(k)!;
        return b.nvAso > 0 ? Number((b.asoSku / b.nvAso).toFixed(2)) : 0;
      }),
      exportRows,
      kpi: {
        dropsize: totOrd > 0 ? totSo / totOrd : 0,
        vpo: totNvAso > 0 ? totSo / totNvAso : 0,
        activePct: totMcp > 0 ? (totAso / totMcp) * 100 : 0,
        freq: totNvAso > 0 ? totOrd / totNvAso : 0,
        skuOrder: totOrd > 0 ? totSku / totOrd : 0,
      },
    };
  }, [gtTree, gtSi, gtAso, gtMcp, gtL3m, gtNvbh, year, selectedMonths, matchGeo, allowedNppSet]);

  // -------------------------------------------------------------
  // BUILD 5-LEVEL TREE FOR RTM TABLE
  // -------------------------------------------------------------
  const { tree, nationalTotals } = useMemo(() => {
    const treeObj: Record<string, TreeNode> = {};
    const natTotals = { sellout: 0, mcp: 0, aso: 0, orders: 0, order_skus: 0, aso_skus: 0 };

    const selMonths = selectedMonths.length > 0 ? selectedMonths : ['10'];
    const monthKeys = selMonths.map((m) => `${year}-${m.padStart(2, '0')}`);
    const maxMonthNum = Math.max(...selMonths.map((m) => parseInt(m, 10)))
      .toString()
      .padStart(2, '0');
    const latestMonthKey = `${year}-${maxMonthNum}`;

    // Filter GT_NVBH_M
    const filteredNvbh = gtNvbh.filter((d) => {
      const k = d.month || toMonthKey(d.year, d.month_num);
      if (!monthKeys.includes(k)) return false;
      if (!matchGeo(d)) return false;
      return true;
    });

    filteredNvbh.forEach((d) => {
      const m = String(d.mien || 'Khác').trim() || 'Khác';
      const v = String(d.vung || 'Khác').trim() || 'Khác';
      const ss = String(d.office || d.gsbh || 'Chưa phân công Office').trim() || 'Chưa phân công Office';
      const nppCode = String(d.npp_code || 'N/A').trim() || 'N/A';
      const nppName = String(d.npp_name || nppCode).trim() || nppCode;
      const nv = String(d.nvbh_name || 'Chưa phân công NVBH').trim() || 'Chưa phân công NVBH';

      const so = Number(d.sellout_val) || 0;
      const aso = Number(d.aso_count) || 0;
      const ord = Number(d.order_count) || 0;
      const ord_skus = Number(d.order_sku_cnt) || 0;
      const aso_skus = Number(d.aso_sku_cnt) || 0;

      // L1: Miền
      if (!treeObj[m]) {
        treeObj[m] = {
          id: `fund_m_${encodeURIComponent(m)}`,
          name: m,
          level: 1,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const mNode = treeObj[m];
      mNode.sellout += so;
      mNode.aso += aso;
      mNode.orders += ord;
      mNode.order_skus += ord_skus;
      mNode.aso_skus += aso_skus;

      // L2: Vùng
      if (!mNode.children[v]) {
        mNode.children[v] = {
          id: `${mNode.id}__v_${encodeURIComponent(v)}`,
          name: v,
          level: 2,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const vNode = mNode.children[v];
      vNode.sellout += so;
      vNode.aso += aso;
      vNode.orders += ord;
      vNode.order_skus += ord_skus;
      vNode.aso_skus += aso_skus;

      // L3: SS / Office
      if (!vNode.children[ss]) {
        vNode.children[ss] = {
          id: `${vNode.id}__s_${encodeURIComponent(ss)}`,
          name: ss,
          level: 3,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const sNode = vNode.children[ss];
      sNode.sellout += so;
      sNode.aso += aso;
      sNode.orders += ord;
      sNode.order_skus += ord_skus;
      sNode.aso_skus += aso_skus;

      // L4: NPP
      if (!sNode.children[nppCode]) {
        sNode.children[nppCode] = {
          id: `${sNode.id}__n_${encodeURIComponent(nppCode)}`,
          code: nppCode,
          name: nppName,
          displayName: `${nppCode} - ${nppName}`,
          level: 4,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const nppNode = sNode.children[nppCode];
      nppNode.sellout += so;
      nppNode.aso += aso;
      nppNode.orders += ord;
      nppNode.order_skus += ord_skus;
      nppNode.aso_skus += aso_skus;

      // L5: NVBH
      if (!nppNode.children[nv]) {
        nppNode.children[nv] = {
          id: `${nppNode.id}__rep_${encodeURIComponent(nv)}`,
          name: nv,
          level: 5,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const nvNode = nppNode.children[nv];
      nvNode.sellout += so;
      nvNode.aso += aso;
      nvNode.orders += ord;
      nvNode.order_skus += ord_skus;
      nvNode.aso_skus += aso_skus;

      natTotals.sellout += so;
      natTotals.aso += aso;
      natTotals.orders += ord;
      natTotals.order_skus += ord_skus;
      natTotals.aso_skus += aso_skus;
    });

    // Match MCP counts from GT_NVBH_MCP_M for latestMonthKey (with fallback)
    let mcpSource = gtNvbhMcp.filter((d) => d.month === latestMonthKey && matchGeo(d));
    if (mcpSource.length === 0 && gtNvbhMcp.length > 0) {
      const availMonths = Array.from(new Set(gtNvbhMcp.map((d) => d.month).filter(Boolean))).sort();
      const fallbackMonth = availMonths[availMonths.length - 1];
      if (fallbackMonth) {
        mcpSource = gtNvbhMcp.filter((d) => d.month === fallbackMonth && matchGeo(d));
      }
    }

    mcpSource.forEach((d) => {
      const m = String(d.mien || 'Khác').trim() || 'Khác';
      const v = String(d.vung || 'Khác').trim() || 'Khác';
      const ss = String(d.office || d.gsbh || 'Chưa phân công Office').trim() || 'Chưa phân công Office';
      const nppCode = String(d.npp_code || 'N/A').trim() || 'N/A';
      const nppName = String(d.npp_name || nppCode).trim() || nppCode;
      const nv = String(d.nvbh_name || 'Chưa phân công NVBH').trim() || 'Chưa phân công NVBH';
      const mcpVal = Number(d.mcp_count) || 0;

      if (!treeObj[m]) {
        treeObj[m] = {
          id: `fund_m_${encodeURIComponent(m)}`,
          name: m,
          level: 1,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const mNode = treeObj[m];

      if (!mNode.children[v]) {
        mNode.children[v] = {
          id: `${mNode.id}__v_${encodeURIComponent(v)}`,
          name: v,
          level: 2,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const vNode = mNode.children[v];

      if (!vNode.children[ss]) {
        vNode.children[ss] = {
          id: `${vNode.id}__s_${encodeURIComponent(ss)}`,
          name: ss,
          level: 3,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const sNode = vNode.children[ss];

      if (!sNode.children[nppCode]) {
        sNode.children[nppCode] = {
          id: `${sNode.id}__n_${encodeURIComponent(nppCode)}`,
          code: nppCode,
          name: nppName,
          displayName: `${nppCode} - ${nppName}`,
          level: 4,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const nppNode = sNode.children[nppCode];

      if (!nppNode.children[nv]) {
        nppNode.children[nv] = {
          id: `${nppNode.id}__rep_${encodeURIComponent(nv)}`,
          name: nv,
          level: 5,
          sellout: 0,
          mcp: 0,
          aso: 0,
          orders: 0,
          order_skus: 0,
          aso_skus: 0,
          children: {},
        };
      }
      const nvNode = nppNode.children[nv];

      nvNode.mcp += mcpVal;
      nppNode.mcp += mcpVal;
      sNode.mcp += mcpVal;
      vNode.mcp += mcpVal;
      mNode.mcp += mcpVal;
      natTotals.mcp += mcpVal;
    });

    return { tree: treeObj, nationalTotals: natTotals };
  }, [gtNvbh, gtNvbhMcp, year, selectedMonths, matchGeo]);

  // Default expand Level 1 on first load
  useEffect(() => {
    if (Object.keys(tree).length > 0 && openNodes.size === 0) {
      const initial = new Set<string>();
      Object.values(tree).forEach((m) => initial.add(m.id));
      setOpenNodes(initial);
    }
  }, [tree, openNodes.size]);

  // Expand / collapse helpers
  const toggleNode = useCallback((id: string) => {
    setOpenNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandToLevel = useCallback(
    (lvl: number) => {
      const next = new Set<string>();
      Object.values(tree).forEach((m) => {
        if (lvl >= 2) next.add(m.id);
        if (lvl >= 3) {
          Object.values(m.children).forEach((v) => {
            next.add(v.id);
            if (lvl >= 4) {
              Object.values(v.children).forEach((s) => {
                next.add(s.id);
                if (lvl >= 5) {
                  Object.values(s.children).forEach((n) => next.add(n.id));
                }
              });
            }
          });
        }
      });
      setOpenNodes(next);
    },
    [tree],
  );

  const expandAll = useCallback(() => {
    const next = new Set<string>();
    Object.values(tree).forEach((m) => {
      next.add(m.id);
      Object.values(m.children).forEach((v) => {
        next.add(v.id);
        Object.values(v.children).forEach((s) => {
          next.add(s.id);
          Object.values(s.children).forEach((n) => next.add(n.id));
        });
      });
    });
    setOpenNodes(next);
  }, [tree]);

  const collapseAll = useCallback(() => {
    setOpenNodes(new Set());
  }, []);

  // Search filter and auto-expand ancestors
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    setOpenNodes((prev) => {
      const next = new Set(prev);
      Object.values(tree).forEach((m) => {
        const mMatch = m.name.toLowerCase().includes(q);
        Object.values(m.children).forEach((v) => {
          const vMatch = v.name.toLowerCase().includes(q);
          Object.values(v.children).forEach((s) => {
            const sMatch = s.name.toLowerCase().includes(q);
            Object.values(s.children).forEach((n) => {
              const nMatch = (n.displayName || n.name).toLowerCase().includes(q);
              let hasRepMatch = false;
              Object.values(n.children).forEach((rep) => {
                if (rep.name.toLowerCase().includes(q)) hasRepMatch = true;
              });
              if (hasRepMatch || nMatch) {
                next.add(m.id);
                next.add(v.id);
                next.add(s.id);
                next.add(n.id);
              }
            });
            if (sMatch) {
              next.add(m.id);
              next.add(v.id);
              next.add(s.id);
            }
          });
          if (vMatch) {
            next.add(m.id);
            next.add(v.id);
          }
        });
        if (mMatch) next.add(m.id);
      });
      return next;
    });
  }, [searchQuery, tree]);

  // Export full hierarchical table to Excel
  const handleExportTreeExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('RTM_Hierarchy');

      sheet.columns = [
        { header: 'Cấp', key: 'level', width: 12 },
        { header: 'Phân Cấp / Khu Vực / Nhân Sự', key: 'name', width: 36 },
        { header: 'Doanh Số Sell-out (VNĐ)', key: 'sellout', width: 22 },
        { header: 'MCP Tuyến', key: 'mcp', width: 14 },
        { header: 'ASO Active', key: 'aso', width: 14 },
        { header: '% Active', key: 'cov', width: 14 },
        { header: 'Tần Suất (Đơn/CH)', key: 'freq', width: 16 },
        { header: 'VPO (VNĐ)', key: 'vpo', width: 18 },
        { header: 'Drop Size (VNĐ)', key: 'dropSize', width: 18 },
        { header: 'Sku/order', key: 'lppc', width: 14 },
        { header: 'Đơn Hàng', key: 'orders', width: 14 },
        { header: 'SKU / CH', key: 'skuStore', width: 14 },
        { header: 'Chẩn Đoán & Khuyến Nghị', key: 'insight', width: 32 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6B21A8' },
      };

      const appendNode = (node: TreeNode, indent: string, lvlLabel: string) => {
        const ins = getTerritoryInsight(node);
        const covVal = node.mcp > 0 ? (node.aso / node.mcp) * 100 : 0;
        const freqVal = node.aso > 0 ? node.orders / node.aso : 0;
        const vpoVal = node.aso > 0 ? node.sellout / node.aso : 0;
        const dsVal = node.orders > 0 ? node.sellout / node.orders : 0;
        const lppcVal = node.orders > 0 ? node.order_skus / node.orders : 0;
        const skuStVal = node.aso > 0 ? node.aso_skus / node.aso : 0;

        sheet.addRow({
          level: lvlLabel,
          name: `${indent}${node.displayName || node.name}`,
          sellout: Math.round(node.sellout),
          mcp: node.mcp,
          aso: node.aso,
          cov: `${covVal.toFixed(1)}%`,
          freq: freqVal.toFixed(2),
          vpo: Math.round(vpoVal),
          dropSize: Math.round(dsVal),
          lppc: lppcVal.toFixed(2),
          orders: node.orders,
          skuStore: skuStVal.toFixed(2),
          insight: `${ins.label} - ${ins.hint}`,
        });
      };

      // Add National Total row
      const natIns = getTerritoryInsight(nationalTotals);
      sheet.addRow({
        level: 'Toàn quốc',
        name: 'TỔNG CỘNG KÊNH GT',
        sellout: Math.round(nationalTotals.sellout),
        mcp: nationalTotals.mcp,
        aso: nationalTotals.aso,
        cov: `${(nationalTotals.mcp > 0 ? (nationalTotals.aso / nationalTotals.mcp) * 100 : 0).toFixed(1)}%`,
        freq: (nationalTotals.aso > 0 ? nationalTotals.orders / nationalTotals.aso : 0).toFixed(2),
        vpo: Math.round(nationalTotals.aso > 0 ? nationalTotals.sellout / nationalTotals.aso : 0),
        dropSize: Math.round(nationalTotals.orders > 0 ? nationalTotals.sellout / nationalTotals.orders : 0),
        lppc: (nationalTotals.orders > 0 ? nationalTotals.order_skus / nationalTotals.orders : 0).toFixed(2),
        orders: nationalTotals.orders,
        skuStore: (nationalTotals.aso > 0 ? nationalTotals.aso_skus / nationalTotals.aso : 0).toFixed(2),
        insight: `${natIns.label} - ${natIns.hint}`,
      });

      // Walk tree
      Object.values(tree).forEach((m) => {
        appendNode(m, '', 'Miền');
        Object.values(m.children).forEach((v) => {
          appendNode(v, '  ', 'Vùng');
          Object.values(v.children).forEach((s) => {
            appendNode(s, '    ', 'Office');
            Object.values(s.children).forEach((n) => {
              appendNode(n, '      ', 'NPP');
              Object.values(n.children).forEach((rep) => {
                appendNode(rep, '        ', 'NVBH');
              });
            });
          });
        });
      });

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GT_RTM_Hierarchy_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExportingExcel(false);
    }
  };

  // -------------------------------------------------------------
  // ECHARTS OPTIONS
  // -------------------------------------------------------------
  const xAxisBase = useMemo(
    () => ({
      type: 'category' as const,
      data: metrics.labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.4)' } },
      axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
    }),
    [metrics.labels],
  );

  const yAxisBase = useMemo(
    () => ({
      type: 'value' as const,
      axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' as const },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' as const } },
    }),
    [],
  );

  const sisoOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Sell In (SAP)', 'Sell Out (DMS)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'B ₫', nameTextStyle: { color: '#CBD5E1', fontSize: 9.5 } },
      series: [
        { name: 'Sell In (SAP)', type: 'bar' as const, barMaxWidth: 11, data: metrics.si, itemStyle: { color: '#38BDF8', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 8.5, formatter: '{c}B' }, labelLayout: { hideOverlap: true } },
        { name: 'Sell Out (DMS)', type: 'bar' as const, barMaxWidth: 11, data: metrics.so, itemStyle: { color: '#34D399', borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top' as const, color: '#fff', fontSize: 8.5, formatter: '{c}B' }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.si, metrics.so, xAxisBase, yAxisBase],
  );

  const coverageOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['MCP Tuyến', 'ASO Active', 'ASO 3 Tháng (L3M)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 52, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: yAxisBase,
      series: [
        { name: 'MCP Tuyến', type: 'line' as const, smooth: true, data: metrics.mcp, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2.2, color: '#C084FC' }, label: { show: true, position: 'top' as const, color: '#F3E8FF', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'ASO Active', type: 'line' as const, smooth: true, data: metrics.aso, itemStyle: { color: '#34D399' }, lineStyle: { width: 2.5, color: '#34D399' }, label: { show: true, position: 'top' as const, color: '#D1FAE5', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'ASO 3 Tháng (L3M)', type: 'line' as const, smooth: true, data: metrics.l3m, itemStyle: { color: '#38BDF8' }, lineStyle: { width: 2.2, color: '#38BDF8' }, label: { show: true, position: 'bottom' as const, color: '#BAE6FD', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.mcp, metrics.aso, metrics.l3m, xAxisBase, yAxisBase],
  );

  const dropsizeOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Drop Size (M/Đơn)', 'VPO (M/Điểm bán)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'M ₫', nameTextStyle: { color: '#CBD5E1', fontSize: 9.5 } },
      series: [
        { name: 'Drop Size (M/Đơn)', type: 'line' as const, smooth: true, data: metrics.dropsize, itemStyle: { color: '#FBBF24' }, lineStyle: { width: 2.4, color: '#FBBF24' }, label: { show: true, position: 'top' as const, color: '#FEF3C7', fontSize: 8.5, formatter: '{c}M' }, labelLayout: { hideOverlap: true } },
        { name: 'VPO (M/Điểm bán)', type: 'line' as const, smooth: true, data: metrics.vpo, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2.4, color: '#C084FC' }, label: { show: true, position: 'bottom' as const, color: '#F3E8FF', fontSize: 8.5, formatter: '{c}M' }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.dropsize, metrics.vpo, xAxisBase, yAxisBase],
  );

  const strikeOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['Tần Suất Mua Hàng (Đơn/CH)'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 48, right: 20, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: { ...yAxisBase, name: 'Đơn/CH', nameTextStyle: { color: '#93C5FD', fontSize: 9.5 } },
      series: [
        {
          name: 'Tần Suất Mua Hàng (Đơn/CH)',
          type: 'line' as const,
          smooth: true,
          data: metrics.freq,
          itemStyle: { color: '#38BDF8' },
          lineStyle: { width: 2.5, color: '#38BDF8' },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
                { offset: 1, color: 'rgba(56, 189, 248, 0.02)' },
              ],
            },
          },
          label: { show: true, position: 'top' as const, color: '#E0F2FE', fontSize: 8.5 },
          labelLayout: { hideOverlap: true },
        },
      ],
    }),
    [metrics.freq, xAxisBase, yAxisBase],
  );

  const skuOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['SKU/Đơn (LPPC)', 'SKU/Cửa Hàng'], top: 4, textStyle: { color: '#fff', fontSize: 11, fontWeight: 'bold' as const } },
      grid: { left: 44, right: 16, top: 38, bottom: 28 },
      xAxis: xAxisBase,
      yAxis: yAxisBase,
      series: [
        { name: 'SKU/Đơn (LPPC)', type: 'line' as const, smooth: true, data: metrics.skuPerOrder, itemStyle: { color: '#5EEAD4' }, lineStyle: { width: 2.5, color: '#5EEAD4' }, label: { show: true, position: 'top' as const, color: '#CCFBF1', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
        { name: 'SKU/Cửa Hàng', type: 'line' as const, smooth: true, data: metrics.skuPerAso, itemStyle: { color: '#FB923C' }, lineStyle: { width: 2.5, color: '#FB923C' }, label: { show: true, position: 'bottom' as const, color: '#FFEDD5', fontSize: 8.5 }, labelLayout: { hideOverlap: true } },
      ],
    }),
    [metrics.skuPerOrder, metrics.skuPerAso, xAxisBase, yAxisBase],
  );

  // Period label for table badge
  const periodBadgeText = useMemo(() => {
    if (selectedMonths.length === 0) return `Kỳ: Năm ${year}`;
    if (selectedMonths.length === 1) return `Kỳ: Tháng ${selectedMonths[0]}/${year}`;
    return `Kỳ: Tháng ${selectedMonths[0]} - ${selectedMonths[selectedMonths.length - 1]}/${year}`;
  }, [selectedMonths, year]);

  // National insight
  const natInsight = useMemo(() => getTerritoryInsight(nationalTotals), [nationalTotals]);
  const natCov = nationalTotals.mcp > 0 ? (nationalTotals.aso / nationalTotals.mcp) * 100 : 0;
  const natFreq = nationalTotals.aso > 0 ? nationalTotals.orders / nationalTotals.aso : 0;
  const natVpo = nationalTotals.aso > 0 ? nationalTotals.sellout / nationalTotals.aso / 1e6 : 0;
  const natDs = nationalTotals.orders > 0 ? nationalTotals.sellout / nationalTotals.orders / 1e6 : 0;
  const natLppc = nationalTotals.orders > 0 ? nationalTotals.order_skus / nationalTotals.orders : 0;
  const natSkuSt = nationalTotals.aso > 0 ? nationalTotals.aso_skus / nationalTotals.aso : 0;

  // Render recursive tree row helper
  const renderRow = (node: TreeNode) => {
    const insight = getTerritoryInsight(node);
    if (healthFilter !== 'ALL' && insight.status !== healthFilter) {
      return null;
    }

    const hasChildren = Object.keys(node.children).length > 0;
    const isOpen = openNodes.has(node.id);
    const covPct = node.mcp > 0 ? (node.aso / node.mcp) * 100 : 0;
    const freq = node.aso > 0 ? node.orders / node.aso : 0;
    const dropSize = node.orders > 0 ? node.sellout / node.orders / 1e6 : 0;
    const vpo = node.aso > 0 ? node.sellout / node.aso / 1e6 : 0;
    const lppc = node.orders > 0 ? node.order_skus / node.orders : 0;
    const skuStore = node.aso > 0 ? node.aso_skus / node.aso : 0;

    let levelBadge = '';
    let indentCls = 'pl-3';
    let rowBg = 'bg-white hover:bg-slate-50';

    if (node.level === 1) {
      levelBadge = 'Miền';
      indentCls = 'pl-3 font-black text-purple-950 text-xs uppercase tracking-wide';
      rowBg = 'bg-purple-100 font-black text-purple-950 border-y-2 border-purple-300 hover:bg-purple-200/80';
    } else if (node.level === 2) {
      levelBadge = 'Vùng';
      indentCls = 'pl-7 font-bold text-indigo-950 text-xs';
      rowBg = 'bg-indigo-50/80 font-bold text-indigo-950 border-b border-indigo-200 hover:bg-indigo-100/70';
    } else if (node.level === 3) {
      levelBadge = 'Office';
      indentCls = 'pl-11 font-medium text-purple-950 text-xs';
      rowBg = 'bg-purple-50/30 text-purple-950 font-medium hover:bg-purple-50/70 border-b border-slate-100';
    } else if (node.level === 4) {
      levelBadge = 'NPP';
      indentCls = 'pl-15 font-medium text-slate-800 text-xs';
      rowBg = 'bg-amber-50/25 text-slate-800 hover:bg-amber-50/60 border-b border-slate-100';
    } else if (node.level === 5) {
      levelBadge = 'NVBH';
      indentCls = 'pl-19 text-slate-600 text-[11px]';
      rowBg = 'bg-white text-slate-600 text-[11px] hover:bg-emerald-50/30 border-b border-slate-100';
    }

    let covBadgeClass = 'text-slate-400 font-normal';
    if (node.mcp > 0) {
      if (covPct >= 75) covBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      else if (covPct >= 60) covBadgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
      else covBadgeClass = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    let freqClass = 'text-slate-700';
    if (freq >= 2.0) freqClass = 'text-emerald-700 font-bold';
    else if (freq < 1.4 && freq > 0) freqClass = 'text-rose-600 font-bold';

    let lppcClass = 'text-slate-700';
    if (lppc >= 2.2) lppcClass = 'text-emerald-700 font-bold';
    else if (lppc < 1.8 && lppc > 0) lppcClass = 'text-amber-700 font-bold';

    return (
      <tr key={node.id} className={`${rowBg} transition-colors`}>
        <td className={`${indentCls} py-2 pr-3`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className="w-4 h-4 inline-flex items-center justify-center rounded bg-slate-200 hover:bg-purple-200 text-slate-700 hover:text-purple-800 font-bold mr-1 select-none transition-colors"
                title={isOpen ? 'Thu gọn' : 'Mở rộng'}
              >
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-4 inline-block text-center mr-1 text-slate-300 select-none">•</span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${
                node.level === 1
                  ? 'bg-purple-700 text-white font-black'
                  : node.level === 2
                  ? 'bg-indigo-600 text-white font-bold'
                  : node.level === 3
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : node.level === 4
                  ? 'bg-amber-100 text-amber-800 font-bold'
                  : 'bg-emerald-100 text-emerald-800 font-bold'
              }`}
            >
              {levelBadge}
            </span>
            <span
              className="whitespace-normal break-words font-medium text-[11px] leading-tight flex-1 cursor-pointer select-none"
              onClick={() => hasChildren && toggleNode(node.id)}
              title={node.displayName || node.name}
            >
              {node.displayName || node.name}
            </span>
          </div>
        </td>
        <td className="py-2 px-2 text-right font-mono text-[11px] font-semibold text-slate-800" title={formatExactVND(node.sellout)}>
          {formatVND(node.sellout)}
        </td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">{formatNumber(node.mcp)}</td>
        <td className="py-2 px-2 text-right font-mono text-[11px] font-medium text-slate-800">{formatNumber(node.aso)}</td>
        <td className="py-2 px-2 text-right font-mono text-[11px]">
          {node.mcp > 0 ? (
            <span className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold border ${covBadgeClass}`}>
              {covPct.toFixed(1)}%
            </span>
          ) : (
            <span className="text-slate-400 font-normal">-</span>
          )}
        </td>
        <td className={`py-2 px-2 text-right font-mono text-[11px] ${freqClass}`}>{node.aso > 0 ? freq.toFixed(1) : '-'}</td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">
          {node.aso > 0 ? (vpo >= 1 ? `${vpo.toFixed(1)}M` : `${(node.sellout / node.aso / 1000).toFixed(1)}K`) : '-'}
        </td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">
          {node.orders > 0 ? (dropSize >= 1 ? `${dropSize.toFixed(1)}M` : `${(node.sellout / node.orders / 1000).toFixed(1)}K`) : '-'}
        </td>
        <td className={`py-2 px-2 text-right font-mono text-[11px] ${lppcClass}`}>{node.orders > 0 ? lppc.toFixed(1) : '-'}</td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">{formatNumber(node.orders)}</td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">{node.aso > 0 ? skuStore.toFixed(1) : '-'}</td>
        <td className="py-2 px-3 text-center" title={insight.hint}>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${insight.badgeClass}`}>
            {insight.label}
          </span>
        </td>
      </tr>
    );
  };

  const renderTreeRows = () => {
    const rows: React.ReactNode[] = [];
    Object.values(tree).forEach((m) => {
      rows.push(renderRow(m));
      if (openNodes.has(m.id)) {
        Object.values(m.children).forEach((v) => {
          rows.push(renderRow(v));
          if (openNodes.has(v.id)) {
            Object.values(v.children).forEach((s) => {
              rows.push(renderRow(s));
              if (openNodes.has(s.id)) {
                Object.values(s.children).forEach((n) => {
                  rows.push(renderRow(n));
                  if (openNodes.has(n.id)) {
                    Object.values(n.children).forEach((rep) => {
                      rows.push(renderRow(rep));
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
    return rows;
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">GT — Fundamental KPIs (5 Core Pillars)</h1>
          <p className="text-xs text-slate-500">Phân tích đa tháng (2025–2026) Độ phủ, Dropsize, VPO, Tần suất &amp; SKU/Đơn hàng</p>
        </div>
        <ExportExcelButton
          filename={`GT_Fundamental_${year}.xlsx`}
          sheetName="GT_Fundamental"
          rows={metrics.exportRows}
          columns={[
            { header: 'Tháng', key: 'month' },
            { header: 'Sell-in (Tỷ)', key: 'sellinB' },
            { header: 'Sell-out (Tỷ)', key: 'selloutB' },
            { header: 'MCP', key: 'mcp' },
            { header: 'ASO', key: 'aso' },
            { header: 'L3M ASO', key: 'l3m' },
            { header: 'Dropsize (Tr)', key: 'dropsizeM' },
            { header: 'VPO (Tr)', key: 'vpoM' },
            { header: 'Tần suất', key: 'freq' },
            { header: 'SKU/Đơn', key: 'skuPerOrder' },
          ]}
        />
      </div>

      <GeoFilterBar records={gtTree} />

      {/* 5 Core Pillar KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Dropsize (TB / Đơn)" value={loading ? '...' : formatCurrencyVnd(metrics.kpi.dropsize)} icon={<ShoppingCart className="h-4 w-4" />} accent="blue" />
        <KpiCard title="VPO (TB / ASO)" value={loading ? '...' : formatCurrencyVnd(metrics.kpi.vpo)} icon={<TrendingUp className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Tỷ lệ Active (ASO/MCP)" value={loading ? '...' : formatPercent(metrics.kpi.activePct)} icon={<Store className="h-4 w-4" />} accent="red" />
        <KpiCard title="Tần suất (Đơn/ASO)" value={loading ? '...' : metrics.kpi.freq.toFixed(2)} icon={<Activity className="h-4 w-4" />} accent="amber" />
        <KpiCard title="SKU / Đơn hàng" value={loading ? '...' : metrics.kpi.skuOrder.toFixed(2)} icon={<Layers className="h-4 w-4" />} accent="slate" />
      </div>

      {/* ROW CHARTS 1: 2 CHARTS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EChartsCard title="Doanh Số Sell In vs Sell Out (21 Tháng: 2025 - 2026)" subtitle="Xu hướng xuất xưởng SAP (Sell-in) và tiêu thụ DMS (Sell-out) qua 21 tháng" option={sisoOption} height={290} loading={loading} gradientClass="grad-green" badgeText="21-Month Flow" badgeClass="badge-pill badge-pill-green" />
        <EChartsCard title="Độ Phủ: MCP, ASO & ASO 3 Tháng (21 Tháng)" subtitle="Kế hoạch viếng thăm MCP, điểm bán phát sinh doanh số ASO và ASO tích lũy 3 tháng" option={coverageOption} height={290} loading={loading} gradientClass="grad-purple" badgeText="RTM Coverage" badgeClass="badge-pill badge-pill-purple" />
      </div>

      {/* ROW CHARTS 2: 3 CHARTS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <EChartsCard title="Hiệu Suất Drop Size & VPO (21 Tháng)" subtitle="Giá trị bình quân đơn hàng (Drop size) & giá trị trên mỗi điểm bán (VPO)" option={dropsizeOption} height={270} loading={loading} gradientClass="grad-orange" badgeText="M VNĐ" badgeClass="badge-pill badge-pill-purple" />
        <EChartsCard title="Tần Suất Mua Hàng (Frequency - 21 Tháng)" subtitle="Số đơn đặt hàng bình quân trên mỗi điểm bán phát sinh doanh số (Đơn / ASO)" option={strikeOption} height={270} loading={loading} gradientClass="grad-blue" badgeText="Đơn/CH" badgeClass="badge-pill badge-pill-blue" />
        <EChartsCard title="Bình Quân SKU / Đơn & SKU / CH" subtitle="Độ rộng danh mục bán được trên mỗi đơn (LPPC) & trên mỗi cửa hàng" option={skuOption} height={270} loading={loading} gradientClass="grad-primary" badgeText="SKU Breadth" badgeClass="badge-pill badge-pill-purple" />
      </div>

      {/* ========================================================================= */}
      {/* FUNDAMENTAL TREE DRILLDOWN: MIỀN -> VÙNG -> SS -> NPP -> NVBH             */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-purple-600 rounded-full inline-block" />
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Bảng Chỉ Số Nền Tảng RTM &amp; Hiệu Suất Theo Phân Cấp Địa Lý
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 font-mono">
                {periodBadgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-4.5">
              Phân tích chuyên sâu 5 cấp (Miền → Vùng → Office → NPP → NVBH) kèm chẩn đoán sức khỏe tuyến &amp; gợi ý hành động cải thiện
            </p>
          </div>

          {/* Quick Health Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setHealthFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                healthFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('WARN_COV')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                healthFilter === 'WARN_COV' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              🔴 Phủ thấp (&lt;60%)
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('WARN_FREQ')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                healthFilter === 'WARN_FREQ' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              ⚠️ Tần suất thấp (&lt;1.4)
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('WARN_LPPC')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                healthFilter === 'WARN_LPPC' ? 'bg-white text-sky-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              📦 Sku/order thấp (&lt;1.8)
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('GOOD')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                healthFilter === 'GOOD' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              🟢 Vận hành tốt
            </button>
          </div>
        </div>

        {/* Action Bar: Search, Level Jumps, Expand/Collapse & Excel Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm Miền, Vùng, SS, NPP, NVBH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none bg-slate-50/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1">Xem đến cấp:</span>
            <button
              type="button"
              onClick={() => expandToLevel(1)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
            >
              L1: Miền
            </button>
            <button
              type="button"
              onClick={() => expandToLevel(2)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
            >
              L2: Vùng
            </button>
            <button
              type="button"
              onClick={() => expandToLevel(3)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
            >
              L3: SS
            </button>
            <button
              type="button"
              onClick={() => expandToLevel(4)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
            >
              L4: NPP
            </button>
            <button
              type="button"
              onClick={() => expandToLevel(5)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
            >
              L5: NVBH
            </button>
            <span className="text-slate-200 mx-1">|</span>
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded border border-purple-200 transition-colors"
            >
              Bung tất cả
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded border border-slate-200 transition-colors"
            >
              Thu gọn
            </button>
            <button
              type="button"
              onClick={handleExportTreeExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs transition-colors ml-1"
              title="Xuất Excel phân cấp RTM đầy đủ 5 cấp"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>

        {/* Tree Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[700px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/95 backdrop-blur sticky top-0 z-20 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 min-w-[280px]">Phân Cấp / Khu Vực / Nhân Sự</th>
                <th className="py-2.5 px-2 text-right">Doanh Số Sell-out</th>
                <th className="py-2.5 px-2 text-right">MCP Tuyến</th>
                <th className="py-2.5 px-2 text-right">ASO Active</th>
                <th className="py-2.5 px-2 text-right">% Active</th>
                <th className="py-2.5 px-2 text-right">Tần Suất (Đơn/CH)</th>
                <th className="py-2.5 px-2 text-right">VPO (Tr/Điểm)</th>
                <th className="py-2.5 px-2 text-right">Drop Size (Tr/Đơn)</th>
                <th className="py-2.5 px-2 text-right">Sku/order</th>
                <th className="py-2.5 px-2 text-right">Đơn Hàng</th>
                <th className="py-2.5 px-2 text-right">SKU / CH</th>
                <th className="py-2.5 px-3 text-center min-w-[200px]">Chẩn Đoán Nền Tảng &amp; Insight Cải Thiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* National Total Header Row */}
              <tr className="bg-gradient-to-r from-purple-100 to-indigo-100 font-black text-slate-900 border-b-2 border-purple-300 shadow-xs">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-purple-700 text-white tracking-wide flex-shrink-0">
                      TOÀN QUỐC
                    </span>
                    <span className="whitespace-normal break-words">TỔNG CỘNG KÊNH GT</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-purple-900 font-black" title={formatExactVND(nationalTotals.sellout)}>
                  {formatVND(nationalTotals.sellout)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-black">{formatNumber(nationalTotals.mcp)}</td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-black">{formatNumber(nationalTotals.aso)}</td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                  {nationalTotals.mcp > 0 ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold border text-emerald-700 bg-emerald-50 border-emerald-200">
                      {natCov.toFixed(1)}%
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold text-slate-800">
                  {nationalTotals.aso > 0 ? natFreq.toFixed(1) : '-'}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-bold">
                  {nationalTotals.aso > 0 ? (natVpo >= 1 ? `${natVpo.toFixed(1)}M` : `${(nationalTotals.sellout / nationalTotals.aso / 1000).toFixed(1)}K`) : '-'}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-bold">
                  {nationalTotals.orders > 0 ? (natDs >= 1 ? `${natDs.toFixed(1)}M` : `${(nationalTotals.sellout / nationalTotals.orders / 1000).toFixed(1)}K`) : '-'}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold text-slate-800">
                  {nationalTotals.orders > 0 ? natLppc.toFixed(1) : '-'}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-black">{formatNumber(nationalTotals.orders)}</td>
                <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-800 font-bold">
                  {nationalTotals.aso > 0 ? natSkuSt.toFixed(1) : '-'}
                </td>
                <td className="py-2.5 px-3 text-center" title={natInsight.hint}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${natInsight.badgeClass}`}>
                    {natInsight.label}
                  </span>
                </td>
              </tr>

              {/* Recursive Tree Rows */}
              {renderTreeRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
