import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EChartsCard } from '../../shared/components/EChartsCard';
import { ExportExcelButton } from '../../shared/components/ExportExcelButton';
import { useAuthStore } from '../../shared/stores/auth.store';
import { matchMonthNum, useFiltersStore } from '../../shared/stores/filters.store';
import { usePayloadsStore } from '../../shared/stores/payloads.store';
import { formatCurrencyVnd, formatNumber, formatPercent } from '../../shared/utils/format';

interface B2bRow {
  month?: string;
  year?: string;
  month_num?: number | string;
  sub_channel?: string;
  b2b_account?: string;
  b2b_customer?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  ph2?: string;
  sku_name?: string;
  sellin_val?: number;
}

interface TargetSellinRow {
  year?: string;
  month?: string;
  channel?: string;
  sub_channel?: string;
  account_npp?: string;
  distributor_code?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  target_amt?: number;
}

interface SellinRow {
  year?: string;
  month_num?: number | string;
  channel?: string;
  sellin_val?: number;
}

interface TreeNode {
  id: string;
  name: string;
  level: number;
  val: number;
  lyVal: number;
  target: number;
  share: number;
  yoy: number;
  achieve: number;
  children?: Record<string, TreeNode>;
}

function formatBnVn(num: number): string {
  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
  }
  return num.toLocaleString('vi-VN') + ' đ';
}

function formatMnVn(num: number): string {
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
  }
  return num.toLocaleString('vi-VN') + ' đ';
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
  const [targetRows, setTargetRows] = useState<TargetSellinRow[]>([]);
  const [sellinRows, setSellinRows] = useState<SellinRow[]>([]);

  // Tree collapse states
  const [openProdNodes, setOpenProdNodes] = useState<Set<string>>(new Set());
  const [openCustNodes, setOpenCustNodes] = useState<Set<string>>(new Set());
  const [prodSearch, setProdSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPayload('B2B_TREE', user),
      loadPayload('TARGET_SELLIN', user),
      loadPayload('SELLIN_M', user),
    ]).then(([data, tgt, si]) => {
      if (!active) return;
      if (Array.isArray(data)) setB2bTree(data as B2bRow[]);
      if (Array.isArray(tgt)) setTargetRows(tgt as TargetSellinRow[]);
      if (Array.isArray(si)) setSellinRows(si as SellinRow[]);
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

  const lyYear = String(parseInt(year, 10) - 1);

  // YTD months
  const ytdMonths = useMemo(() => {
    const list: string[] = [];
    const maxM = Math.max(...selectedMonths.map((m) => parseInt(m, 10)), 1);
    for (let i = 1; i <= maxM; i++) list.push(String(i).padStart(2, '0'));
    return list;
  }, [selectedMonths]);

  // Previous period months (PoP / MoM)
  const popMonths = useMemo(() => {
    const minM = Math.min(...selectedMonths.map((m) => parseInt(m, 10)));
    const cnt = selectedMonths.length;
    const list: string[] = [];
    for (let i = 1; i <= cnt; i++) {
      const targetM = minM - i;
      if (targetM >= 1) list.push(String(targetM).padStart(2, '0'));
    }
    return list;
  }, [selectedMonths]);

  // Working day progress (standard 26 workdays)
  const workdayProgress = useMemo(() => {
    const d = new Date();
    const currDay = Math.min(d.getDate(), 26);
    return Math.min(100, Math.round((currDay / 26) * 1000) / 10);
  }, []);

  // Aggregated KPIs
  const {
    total,
    lyTotal,
    yoy,
    ytdTotal,
    ytdGrowth,
    target,
    achievement,
    gap,
    activeAccounts,
    vpo,
    companyShare,
    popTotal,
    popGrowth,
    topCustomers,
    monthlyTrend,
    productTreeData,
    customerTreeData,
  } = useMemo(() => {
    let sum = 0;
    let ly = 0;
    let ytdSum = 0;
    let ytdLySum = 0;
    let popSum = 0;
    let tgt = 0;
    let companySum = 0;

    const custSet = new Set<string>();
    const custMap = new Map<string, { val: number; lyVal: number; account: string }>();
    const monthTrendMap: Record<string, { cy: number; ly: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const k = String(m).padStart(2, '0');
      monthTrendMap[k] = { cy: 0, ly: 0 };
    }

    // Raw trees
    const prodMap: Record<string, TreeNode> = {};
    const custTreeMap: Record<string, TreeNode> = {};

    for (const r of b2bTree) {
      const val = Number(r.sellin_val) || 0;
      const rYear = String(r.year || '');
      const mNum = String(r.month_num || '').padStart(2, '0');
      const acc = String(r.b2b_account || 'Khác');
      const cust = String(r.b2b_customer || '-');
      const stor = String(r.storage || 'Hàng Khô');
      const cate = String(r.cate || 'Khác');
      const ph1 = String(r.ph1 || 'Khác');
      const ph2 = String(r.ph2 || 'Khác');

      // Filter matches
      if (b2bAcc !== 'ALL' && acc !== b2bAcc) continue;
      if (b2bCust !== 'ALL' && cust !== b2bCust) continue;

      // 12-Month trend
      if (rYear === year && monthTrendMap[mNum]) monthTrendMap[mNum].cy += val;
      if (rYear === lyYear && monthTrendMap[mNum]) monthTrendMap[mNum].ly += val;

      // Selected months
      const isSel = matchMonthNum(mNum, selectedMonths);
      if (isSel) {
        if (rYear === year) {
          sum += val;
          if (val > 0) custSet.add(cust !== '-' ? cust : acc);

          // Top customers
          const cur = custMap.get(cust) || { val: 0, lyVal: 0, account: acc };
          cur.val += val;
          custMap.set(cust, cur);

          // Build Product Tree (Storage -> Cate -> PH1 -> PH2)
          if (!prodMap[stor]) {
            prodMap[stor] = { id: `stor_${stor}`, name: stor, level: 0, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0, children: {} };
          }
          prodMap[stor].val += val;
          const cateChildren = prodMap[stor].children!;
          if (!cateChildren[cate]) {
            cateChildren[cate] = { id: `cate_${stor}_${cate}`, name: cate, level: 1, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0, children: {} };
          }
          cateChildren[cate].val += val;
          const ph1Children = cateChildren[cate].children!;
          if (!ph1Children[ph1]) {
            ph1Children[ph1] = { id: `ph1_${stor}_${cate}_${ph1}`, name: ph1, level: 2, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0, children: {} };
          }
          ph1Children[ph1].val += val;
          const ph2Children = ph1Children[ph1].children!;
          if (!ph2Children[ph2]) {
            ph2Children[ph2] = { id: `ph2_${stor}_${cate}_${ph1}_${ph2}`, name: ph2, level: 3, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0 };
          }
          ph2Children[ph2].val += val;

          // Build Customer Tree (Account -> Customer)
          if (!custTreeMap[acc]) {
            custTreeMap[acc] = { id: `acc_${acc}`, name: acc, level: 0, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0, children: {} };
          }
          custTreeMap[acc].val += val;
          const accChildren = custTreeMap[acc].children!;
          if (!accChildren[cust]) {
            accChildren[cust] = { id: `cust_${acc}_${cust}`, name: cust, level: 1, val: 0, lyVal: 0, target: 0, share: 0, yoy: 0, achieve: 0 };
          }
          accChildren[cust].val += val;
        } else if (rYear === lyYear) {
          ly += val;
          const cur = custMap.get(cust) || { val: 0, lyVal: 0, account: acc };
          cur.lyVal += val;
          custMap.set(cust, cur);

          // LY in Product Tree
          if (prodMap[stor]) {
            prodMap[stor].lyVal += val;
            if (prodMap[stor].children?.[cate]) {
              prodMap[stor].children![cate].lyVal += val;
              if (prodMap[stor].children![cate].children?.[ph1]) {
                prodMap[stor].children![cate].children![ph1].lyVal += val;
                if (prodMap[stor].children![cate].children![ph1].children?.[ph2]) {
                  prodMap[stor].children![cate].children![ph1].children![ph2].lyVal += val;
                }
              }
            }
          }

          // LY in Customer Tree
          if (custTreeMap[acc]) {
            custTreeMap[acc].lyVal += val;
            if (custTreeMap[acc].children?.[cust]) {
              custTreeMap[acc].children![cust].lyVal += val;
            }
          }
        }
      }

      // YTD
      if (ytdMonths.includes(mNum)) {
        if (rYear === year) ytdSum += val;
        else if (rYear === lyYear) ytdLySum += val;
      }

      // PoP
      if (popMonths.includes(mNum) && rYear === year) {
        popSum += val;
      }
    }

    // Target Sell-in
    for (const r of targetRows) {
      if (String(r.channel || '').toUpperCase() !== 'B2B') continue;
      const mStr = String(r.month || '');
      const rYear = r.year ? String(r.year) : mStr.slice(0, 4);
      if (rYear !== year) continue;
      const mNum = mStr.includes('-') ? mStr.slice(5, 7) : mStr.padStart(2, '0');
      if (!selectedMonths.includes(mNum)) continue;

      if (b2bAcc !== 'ALL') {
        const accMatch =
          (r.account_npp && r.account_npp.toLowerCase().trim() === b2bAcc.toLowerCase().trim()) ||
          (r.sub_channel && r.sub_channel.toLowerCase().trim() === b2bAcc.toLowerCase().trim());
        if (!accMatch) continue;
      }

      const tAmt = Number(r.target_amt) || 0;
      tgt += tAmt;

      // Assign to Product Tree if storage matches
      const stor = String(r.storage || '');
      if (stor && prodMap[stor]) prodMap[stor].target += tAmt;

      // Assign to Customer Tree if account matches
      const acc = String(r.account_npp || r.sub_channel || '');
      if (acc && custTreeMap[acc]) custTreeMap[acc].target += tAmt;
    }

    // Total Company Sell-in from SELLIN_M
    for (const r of sellinRows) {
      if (String(r.year) !== year) continue;
      const mNum = String(r.month_num || '').padStart(2, '0');
      if (selectedMonths.includes(mNum)) {
        companySum += Number(r.sellin_val) || 0;
      }
    }

    // Post-process Product Tree
    const computeTreeMetrics = (node: TreeNode, rootSum: number) => {
      node.share = rootSum > 0 ? (node.val / rootSum) * 100 : 0;
      node.yoy = node.lyVal > 0 ? ((node.val - node.lyVal) / node.lyVal) * 100 : 0;
      node.achieve = node.target > 0 ? (node.val / node.target) * 100 : 0;
      if (node.children) {
        Object.values(node.children).forEach((ch) => computeTreeMetrics(ch, rootSum));
      }
    };
    Object.values(prodMap).forEach((nd) => computeTreeMetrics(nd, sum));
    Object.values(custTreeMap).forEach((nd) => computeTreeMetrics(nd, sum));

    const topList = Array.from(custMap.entries())
      .map(([name, data]) => ({
        customer: name,
        account: data.account,
        sellin: data.val,
        lySellin: data.lyVal,
        yoy: data.lyVal > 0 ? ((data.val - data.lyVal) / data.lyVal) * 100 : 0,
      }))
      .sort((a, b) => b.sellin - a.sellin);

    const activeCnt = custSet.size;

    return {
      total: sum,
      lyTotal: ly,
      yoy: ly > 0 ? ((sum - ly) / ly) * 100 : 0,
      ytdTotal: ytdSum,
      ytdLyTotal: ytdLySum,
      ytdGrowth: ytdLySum > 0 ? ((ytdSum - ytdLySum) / ytdLySum) * 100 : 0,
      target: tgt,
      achievement: tgt > 0 ? (sum / tgt) * 100 : 0,
      gap: sum - tgt,
      activeAccounts: activeCnt,
      vpo: activeCnt > 0 ? Math.round(sum / activeCnt) : 0,
      companyShare: companySum > 0 ? (sum / companySum) * 100 : 0,
      popTotal: popSum,
      popGrowth: popSum > 0 ? ((sum - popSum) / popSum) * 100 : 0,
      topCustomers: topList,
      monthlyTrend: monthTrendMap,
      productTreeData: Object.values(prodMap).sort((a, b) => b.val - a.val),
      customerTreeData: Object.values(custTreeMap).sort((a, b) => b.val - a.val),
    };
  }, [b2bTree, targetRows, sellinRows, year, lyYear, selectedMonths, ytdMonths, popMonths, b2bAcc, b2bCust]);

  // EChart 1: Xu Hướng 12 Tháng Sell-in B2B (2026 vs 2025)
  const monthlyTrendOption = useMemo(() => {
    const xLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const cyData = xLabels.map((_, i) => Math.round((monthlyTrend[String(i + 1).padStart(2, '0')]?.cy || 0) / 1e6));
    const lyData = xLabels.map((_, i) => Math.round((monthlyTrend[String(i + 1).padStart(2, '0')]?.ly || 0) / 1e6));

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          let s = `<b>Tháng ${params[0]?.name}</b><br/>`;
          for (const p of params) {
            s += `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString('vi-VN')} Tr</b><br/>`;
          }
          return s;
        },
      },
      legend: { data: [`Năm ${year}`, `Năm ${lyYear} (Cùng kỳ)`], bottom: 0 },
      grid: { left: 55, right: 20, top: 25, bottom: 45 },
      xAxis: { type: 'category' as const, data: xLabels },
      yAxis: {
        type: 'value' as const,
        name: 'Triệu VNĐ',
        axisLabel: { formatter: '{value}' },
        splitLine: { lineStyle: { type: 'dashed' as const } },
      },
      series: [
        {
          name: `Năm ${year}`,
          type: 'bar' as const,
          data: cyData,
          itemStyle: { color: '#004B91', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: `Năm ${lyYear} (Cùng kỳ)`,
          type: 'line' as const,
          data: lyData,
          itemStyle: { color: '#eab308' },
          lineStyle: { width: 3 },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };
  }, [monthlyTrend, year, lyYear]);

  // EChart 2: Top 10 Khách Hàng Doanh Nghiệp
  const topCustOption = useMemo(() => {
    const top10 = topCustomers.slice(0, 10).reverse();
    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          const p = params[0];
          return `<b>${p.name}</b><br/>${p.marker} Doanh số: <b>${Number(p.value).toLocaleString('vi-VN')} Tr</b>`;
        },
      },
      grid: { left: 160, right: 30, top: 15, bottom: 25 },
      xAxis: {
        type: 'value' as const,
        axisLabel: { formatter: '{value} Tr' },
        splitLine: { lineStyle: { type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: top10.map((r) => r.customer),
        axisLabel: {
          width: 145,
          overflow: 'truncate' as const,
          fontSize: 10.5,
          fontWeight: 'bold' as const,
        },
      },
      series: [
        {
          name: 'Doanh Số B2B',
          type: 'bar' as const,
          data: top10.map((r) => Math.round(r.sellin / 1e6)),
          itemStyle: {
            color: '#2563eb',
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right' as const,
            formatter: '{c} Tr',
            fontSize: 10,
            fontWeight: 'bold' as const,
          },
        },
      ],
    };
  }, [topCustomers]);

  // Tree Toggle functions
  const toggleProdNode = (id: string) => {
    setOpenProdNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllProdNodes = () => {
    if (openProdNodes.size > 0) {
      setOpenProdNodes(new Set());
    } else {
      const all = new Set<string>();
      const addKeys = (list: TreeNode[]) => {
        for (const n of list) {
          all.add(n.id);
          if (n.children) addKeys(Object.values(n.children));
        }
      };
      addKeys(productTreeData);
      setOpenProdNodes(all);
    }
  };

  const toggleCustNode = (id: string) => {
    setOpenCustNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCustNodes = () => {
    if (openCustNodes.size > 0) {
      setOpenCustNodes(new Set());
    } else {
      const all = new Set<string>();
      const addKeys = (list: TreeNode[]) => {
        for (const n of list) {
          all.add(n.id);
          if (n.children) addKeys(Object.values(n.children));
        }
      };
      addKeys(customerTreeData);
      setOpenCustNodes(all);
    }
  };

  // Flattened Tree Rows for rendering
  const flatProdRows = useMemo(() => {
    const res: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      if (prodSearch && !node.name.toLowerCase().includes(prodSearch.toLowerCase())) {
        // Check if any children match
        const hasMatch = Object.values(node.children || {}).some((c) =>
          c.name.toLowerCase().includes(prodSearch.toLowerCase()),
        );
        if (!hasMatch) return;
      }
      res.push(node);
      if (openProdNodes.has(node.id) && node.children) {
        Object.values(node.children).forEach(traverse);
      }
    };
    productTreeData.forEach(traverse);
    return res;
  }, [productTreeData, openProdNodes, prodSearch]);

  const flatCustRows = useMemo(() => {
    const res: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      if (custSearch && !node.name.toLowerCase().includes(custSearch.toLowerCase())) {
        const hasMatch = Object.values(node.children || {}).some((c) =>
          c.name.toLowerCase().includes(custSearch.toLowerCase()),
        );
        if (!hasMatch) return;
      }
      res.push(node);
      if (openCustNodes.has(node.id) && node.children) {
        Object.values(node.children).forEach(traverse);
      }
    };
    customerTreeData.forEach(traverse);
    return res;
  }, [customerTreeData, openCustNodes, custSearch]);

  const isB2bOnTrack = target > 0 && achievement >= workdayProgress;

  return (
    <div className="space-y-4">
      {/* Title & Channel Scope Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-2xl text-purple-700 border border-purple-100 shadow-2xs">
            🍽️
          </span>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              KÊNH B2B (FOOD SERVICE & DOANH NGHIỆP)
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800">
                Lũy Kế {selectedMonths.length > 1 ? `${selectedMonths.length} Tháng` : `Tháng T${selectedMonths[0]}`}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Theo dõi chi tiết xuất bán Sell-in, chỉ tiêu Target và phân cấp ngành hàng Food Service
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton
            filename={`CJ_B2B_Report_${year}.xlsx`}
            sheetName="B2B_Top_Customers"
            rows={topCustomers}
            columns={[
              { header: 'Phân Nhóm B2B', key: 'account' },
              { header: 'Khách Hàng B2B', key: 'customer' },
              { header: 'Doanh Số Sell-in (VND)', key: (r) => Math.round(r.sellin) },
              { header: 'Cùng Kỳ Năm Trước (VND)', key: (r) => Math.round(r.lySellin) },
              { header: '% Tăng Trưởng YoY', key: (r) => Number(r.yoy.toFixed(1)) },
            ]}
          />
        </div>
      </div>

      {/* Header Dropdown Filter Bar */}
      <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0">🍽️ Phân Nhóm B2B:</span>
          <select
            value={b2bAcc}
            onChange={(e) => setB2bFilter('b2bAcc', e.target.value)}
            aria-label="Lọc Nhóm B2B"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-purple-900 focus:bg-white focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">-- Tất cả Phân Nhóm B2B ({accounts.length}) --</option>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0">🏢 Khách Hàng:</span>
          <select
            value={b2bCust}
            onChange={(e) => setB2bFilter('b2bCust', e.target.value)}
            aria-label="Lọc Khách hàng B2B"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500"
          >
            <option value="ALL">-- Tất cả Khách Hàng ({customers.length}) --</option>
            {customers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ROW 1: 5 CORE B2B KPI CARDS matching web_app 1:1 */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Doanh số Sell-in B2B */}
        <div
          className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #2563eb' }}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">DOANH SỐ SELL-IN B2B</span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : formatBnVn(total)}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                YoY:{' '}
                <b className={yoy >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {formatPercent(yoy, true)}
                </b>
              </span>
              <span className="text-[10px] text-slate-400 font-mono-num">(Cùng kỳ: {formatBnVn(lyTotal)})</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="text-slate-500">
                YTD:{' '}
                <b className={ytdGrowth >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {formatPercent(ytdGrowth, true)}
                </b>
              </span>
              <span className="text-[10px] text-slate-400 font-mono-num">(Lũy kế: {formatBnVn(ytdTotal)})</span>
            </div>
          </div>
        </div>

        {/* Card 2: Chỉ Tiêu Target B2B */}
        <div
          className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #8b5cf6' }}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">CHỈ TIÊU TARGET B2B</span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-purple-700">
              {loading ? '...' : target > 0 ? formatBnVn(target) : 'Chưa giao'}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chênh lệch (Gap):</span>
              <b className={gap >= 0 ? 'text-emerald-600 font-bold font-mono-num' : 'text-rose-600 font-bold font-mono-num'}>
                {target > 0 ? `${gap >= 0 ? '+' : ''}${formatBnVn(gap)}` : '--'}
              </b>
            </div>
            <div className="mt-0.5 text-slate-400 font-medium">Kế hoạch Food Service {year}</div>
          </div>
        </div>

        {/* Card 3: Tỷ Lệ Đạt Target B2B */}
        <div
          className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #10b981' }}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">TỶ LỆ ĐẠT TARGET B2B</span>
            <div
              className={`my-1 font-mono-num text-2xl font-black tracking-tight ${
                target > 0 ? (isB2bOnTrack ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-400'
              }`}
            >
              {loading ? '...' : target > 0 ? `${achievement.toFixed(1)}%` : '--%'}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tiến độ:</span>
              <b className={isB2bOnTrack ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {target > 0
                  ? isB2bOnTrack
                    ? `Đạt tiến độ (${workdayProgress}%)`
                    : `Chậm tiến độ (${workdayProgress}%)`
                  : 'Đang theo dõi'}
              </b>
            </div>
            <div className="mt-0.5 text-slate-400 font-medium">Chuẩn 26 ngày làm việc</div>
          </div>
        </div>

        {/* Card 4: Cùng Kỳ Năm Trước (LY) */}
        <div
          className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #f59e0b' }}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">CÙNG KỲ NĂM TRƯỚC (LY)</span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : formatBnVn(lyTotal)}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tăng trưởng YoY:</span>
              <b className={total - lyTotal >= 0 ? 'text-emerald-600 font-bold font-mono-num' : 'text-rose-600 font-bold font-mono-num'}>
                {total - lyTotal >= 0 ? '+' : ''}
                {formatBnVn(total - lyTotal)}
              </b>
            </div>
            <div className="mt-0.5 text-slate-400 font-medium">Doanh số B2B {lyYear}</div>
          </div>
        </div>

        {/* Card 5: Khách Hàng B2B Hoạt Động */}
        <div
          className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
          style={{ borderLeft: '5px solid #64748b' }}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">KHÁCH HÀNG B2B</span>
            <div className="my-1 font-mono-num text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : `${formatNumber(activeAccounts)} Doanh Nghiệp`}
            </div>
          </div>
          <div className="border-t border-slate-100/90 pt-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Doanh số TB / Khách:</span>
              <b className="font-mono-num text-slate-800">{formatMnVn(vpo)}</b>
            </div>
            <div className="mt-0.5 text-slate-400 font-medium truncate">
              {b2bCust !== 'ALL' ? b2bCust : b2bAcc !== 'ALL' ? b2bAcc : 'Tất cả khách hàng B2B'}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: 3 EFFICIENCY & METRIC CARDS matching web_app */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-center shadow-2xs transition-all hover:bg-slate-100/80">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            DOANH SỐ TB / KHÁCH (VPO B2B)
          </span>
          <span className="my-0.5 font-mono-num text-2xl font-black text-blue-600">{formatMnVn(vpo)}</span>
          <span className="text-[11px] font-medium text-slate-400">Bình quân trên 1 khách hàng B2B</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-center shadow-2xs transition-all hover:bg-slate-100/80">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            TỶ TRỌNG TRÊN TOÀN CÔNG TY
          </span>
          <span className="my-0.5 font-mono-num text-2xl font-black text-amber-500">{companyShare.toFixed(1)}%</span>
          <span className="text-[11px] font-medium text-slate-400">Đóng góp vào tổng Sell-in công ty</span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-center shadow-2xs transition-all hover:bg-slate-100/80">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            SO VỚI KỲ TRƯỚC (PoP / MoM)
          </span>
          <span
            className={`my-0.5 font-mono-num text-2xl font-black ${
              popGrowth >= 0 ? 'text-slate-800' : 'text-rose-600'
            }`}
          >
            {formatPercent(popGrowth, true)}
          </span>
          <span className="text-[11px] font-medium text-slate-400">Kỳ liền kề: {formatBnVn(popTotal)}</span>
        </div>
      </div>

      {/* 2 ECHARTS: Monthly Trend 12T & Top 10 Customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EChartsCard
          title={`Xu Hướng Doanh Số B2B 12 Tháng (${year} vs ${lyYear})`}
          subtitle="So sánh đối ứng doanh số từng tháng với cùng kỳ năm trước"
          option={monthlyTrendOption}
          loading={loading}
        />
        <EChartsCard
          title="Top 10 Khách Hàng Doanh Nghiệp Lớn Nhất"
          subtitle="Xếp hạng theo tổng doanh số tiêu thụ trong kỳ (Triệu VNĐ)"
          option={topCustOption}
          loading={loading}
        />
      </div>

      {/* 2 EXPANDABLE HIERARCHY TABLES (B2B PRODUCT TREE & CUSTOMER TREE) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* CỘT TRÁI: PHÂN CẤP SẢN PHẨM B2B (Storage -> Cate -> PH1 -> PH2) */}
        <div className="material-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-purple-700" />
                Phân Cấp Sản Phẩm B2B (Storage ➔ Cate ➔ PH1 ➔ PH2)
              </h3>
              <p className="text-xs text-slate-400">Bung mở từng cấp danh mục Food Service</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllProdNodes}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
              >
                Bung / Đóng Hết
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo ngành hàng, nhãn hiệu, sản phẩm..."
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="max-h-[500px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Cơ Cấu Sản Phẩm</th>
                  <th className="p-2 text-right">Doanh Số Sell-in</th>
                  <th className="p-2 text-right">Target</th>
                  <th className="p-2 text-center">% Đạt</th>
                  <th className="p-2 text-right">Tỷ Trọng %</th>
                  <th className="p-2 text-right">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatProdRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-slate-400 italic">
                      Không tìm thấy dữ liệu sản phẩm phù hợp.
                    </td>
                  </tr>
                ) : (
                  flatProdRows.map((n) => {
                    const hasChildren = Boolean(n.children && Object.keys(n.children).length > 0);
                    const isOpen = openProdNodes.has(n.id);
                    const padLeft = n.level * 16 + 8;
                    const isRoot = n.level === 0;

                    return (
                      <tr
                        key={n.id}
                        className={`transition-colors ${
                          isRoot
                            ? 'bg-purple-50/70 font-black text-purple-950'
                            : n.level === 1
                            ? 'bg-slate-50/60 font-bold text-slate-800'
                            : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        <td className="p-2" style={{ paddingLeft: `${padLeft}px` }}>
                          <div className="flex items-center gap-1.5">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleProdNode(n.id)}
                                className="h-4 w-4 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500"
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 inline-block text-center text-slate-300">•</span>
                            )}
                            <span className="truncate max-w-[200px]" title={n.name}>
                              {n.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono-num font-bold text-purple-900">
                          {formatCurrencyVnd(n.val)}
                        </td>
                        <td className="p-2 text-right font-mono-num text-slate-500">
                          {n.target > 0 ? formatCurrencyVnd(n.target) : '--'}
                        </td>
                        <td className="p-2 text-center font-mono-num">
                          {n.target > 0 ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                n.achieve >= 100
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {n.achieve.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">--</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono-num font-medium text-slate-600">
                          {n.share.toFixed(1)}%
                        </td>
                        <td className="p-2 text-right font-mono-num font-bold">
                          <span className={n.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {n.lyVal > 0 ? formatPercent(n.yoy, true) : '--'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHẢI: PHÂN CẤP KHÁCH HÀNG B2B */}
        <div className="material-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-700" />
                Phân Cấp Khách Hàng B2B (Phân Nhóm ➔ Doanh Nghiệp)
              </h3>
              <p className="text-xs text-slate-400">Danh mục tài khoản và đối tác tiêu thụ trọng điểm</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllCustNodes}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer"
              >
                Bung / Đóng Hết
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo phân nhóm, tên khách hàng..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="max-h-[500px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Khách Hàng B2B</th>
                  <th className="p-2 text-right">Doanh Số (VND)</th>
                  <th className="p-2 text-right">Target</th>
                  <th className="p-2 text-center">% Đạt</th>
                  <th className="p-2 text-right">Tỷ Trọng %</th>
                  <th className="p-2 text-right">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatCustRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-slate-400 italic">
                      Không tìm thấy dữ liệu khách hàng phù hợp.
                    </td>
                  </tr>
                ) : (
                  flatCustRows.map((n) => {
                    const hasChildren = Boolean(n.children && Object.keys(n.children).length > 0);
                    const isOpen = openCustNodes.has(n.id);
                    const padLeft = n.level * 16 + 8;
                    const isRoot = n.level === 0;

                    return (
                      <tr
                        key={n.id}
                        className={`transition-colors ${
                          isRoot
                            ? 'bg-blue-50/70 font-black text-blue-950 border-t border-blue-200'
                            : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        <td className="p-2" style={{ paddingLeft: `${padLeft}px` }}>
                          <div className="flex items-center gap-1.5">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleCustNode(n.id)}
                                className="h-4 w-4 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500"
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 inline-block text-center text-slate-300">•</span>
                            )}
                            <span className="truncate max-w-[200px]" title={n.name}>
                              {isRoot ? `PHÂN NHÓM: ${n.name}` : n.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono-num font-bold text-blue-900">
                          {formatCurrencyVnd(n.val)}
                        </td>
                        <td className="p-2 text-right font-mono-num text-slate-500">
                          {n.target > 0 ? formatCurrencyVnd(n.target) : '--'}
                        </td>
                        <td className="p-2 text-center font-mono-num">
                          {n.target > 0 ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                n.achieve >= 100
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {n.achieve.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">--</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono-num font-medium text-slate-600">
                          {n.share.toFixed(1)}%
                        </td>
                        <td className="p-2 text-right font-mono-num font-bold">
                          <span className={n.yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {n.lyVal > 0 ? formatPercent(n.yoy, true) : '--'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
