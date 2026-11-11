#!/usr/bin/env node
/**
 * CJ Enterprise SNS - High-Speed PostgreSQL Datamart ETL Loader
 * Loads all 33 business datasets (~580 MB raw JSON, ~2.46M rows) into
 * PostgreSQL schema `datamart.*` using native `COPY` for sub-minute ingestion.
 *
 * Usage:
 *   node scripts/etl_load_postgres.js                 # Extract from D:\Data Web Performance\dashboard_web\index.html & stage CSV
 *   node scripts/etl_load_postgres.js --from-enc      # Extract from ./data_payloads/*.enc & stage CSV
 *   node scripts/etl_load_postgres.js --apply         # Also docker cp + psql load into standard_postgres
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_HTML = 'D:/Data Web Performance/dashboard_web/index.html';
const STAGE_DIR = path.join(ROOT_DIR, '.tmp_etl');

function parseArgs() {
  const args = process.argv.slice(2);
  let htmlPath = DEFAULT_HTML;
  let fromEnc = false;
  let apply = false;
  let refreshDate = '';
  for (const a of args) {
    if (a === '--from-enc') fromEnc = true;
    else if (a === '--apply') apply = true;
    else if (a.startsWith('--html=')) htmlPath = a.slice('--html='.length);
    else if (a.startsWith('--date=')) refreshDate = a.slice('--date='.length);
  }
  return { htmlPath, fromEnc, apply, refreshDate };
}

function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function tryInflate(buf) {
  try { return zlib.inflateSync(buf); } catch (_) {}
  try { return zlib.inflateRawSync(buf); } catch (_) {}
  return zlib.gunzipSync(buf);
}

function buildKeystreamTable(keyHexStr, ivBytes) {
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(keyHexStr.substr(i * 2, 2), 16) & 0xff;
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + keyBytes[i & 31] + ivBytes[i & 15]) & 0xff;
      const tmp = S[i]; S[i] = S[j]; S[j] = tmp;
    }
  }
  const table = new Uint8Array(65536);
  let a = 0, b = 0;
  for (let k = 0; k < 65536; k++) {
    a = (a + 1) & 0xff;
    b = (b + S[a]) & 0xff;
    const tmp = S[a]; S[a] = S[b]; S[b] = tmp;
    table[k] = S[(S[a] + S[b]) & 0xff];
  }
  return table;
}

function decryptEnc(buf, keyHex) {
  const iv = buf.subarray(0, 16);
  const cipher = buf.subarray(16);
  const table = buildKeystreamTable(keyHex, iv);
  const dec = Buffer.allocUnsafe(cipher.length);
  for (let i = 0; i < cipher.length; i++) {
    dec[i] = cipher[i] ^ table[i & 65535] ^ ((i >>> 16) & 0xff);
  }
  return JSON.parse(tryInflate(dec).toString('utf8'));
}

function csvCell(v) {
  if (v === null || v === undefined) return '\\N';
  const s = String(v).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');
  if (s === '') return '""';
  return '"' + s.replace(/"/g, '""') + '"';
}

function numVal(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function intOrNull(v) {
  if (v === null || v === undefined || v === '') return '\\N';
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? String(n) : '\\N';
}

function writeCsv(filePath, rows, mapRow) {
  const fd = fs.openSync(filePath, 'w');
  let buf = '';
  for (let i = 0; i < rows.length; i++) {
    const vals = mapRow(rows[i]);
    if (!vals) continue;
    buf += vals.map(csvCell).join(',') + '\n';
    if (buf.length >= 262144) {
      fs.writeSync(fd, buf);
      buf = '';
    }
  }
  if (buf.length > 0) fs.writeSync(fd, buf);
  fs.closeSync(fd);
}

const DATASET_SPECS = [
  {
    name: 'DIM_GEO_HIER',
    table: 'datamart.dim_geo_distributors',
    cols: ['npp_code', 'npp_name', 'mien', 'vung', 'gsbh'],
    dedupe: (rows) => {
      const m = new Map();
      for (const r of rows) {
        const k = String(r.npp_code || '').trim();
        if (!k) continue;
        m.set(k, {
          npp_code: k,
          npp_name: String(r.npp_name || ''),
          mien: String(r.mien || ''),
          vung: String(r.vung || ''),
          gsbh: String(r.gsbh || ''),
        });
      }
      return [...m.values()];
    },
    map: (r) => [r.npp_code, r.npp_name, r.mien, r.vung, r.gsbh],
  },
  {
    name: 'DIM_PROD_HIER',
    table: 'datamart.dim_product_catalog',
    cols: ['sku_name', 'storage', 'cate', 'ph1', 'ph2'],
    dedupe: (rows) => {
      const m = new Map();
      for (const r of rows) {
        const k = String(r.sku_name || '').trim();
        if (!k) continue;
        m.set(k, r);
      }
      return [...m.values()];
    },
    map: (r) => [String(r.sku_name || '').trim(), r.storage || 'Ambient', r.cate || '', r.ph1 || '', r.ph2 || ''],
  },
  {
    name: 'DIM_COMM_HIER',
    table: 'datamart.dim_commercial_hierarchy',
    cols: ['channel', 'sub_channel', 'account_name'],
    dedupe: (rows) => {
      const m = new Map();
      for (const r of rows) {
        const key = `${r.channel || ''}|${r.sub_channel || ''}|${r.account_name || ''}`;
        if (!m.has(key)) m.set(key, r);
      }
      return [...m.values()];
    },
    map: (r) => [r.channel || '', r.sub_channel || '', r.account_name || ''],
  },
  {
    name: 'SELLIN_M',
    table: 'datamart.fact_sellin_monthly',
    cols: ['month', 'year', 'month_num', 'channel', 'sub_channel', 'account_code', 'account_name', 'mien', 'cluster', 'gsbh', 'office', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.channel || '', r.sub_channel || '', r.account_code || '', r.account_name || '', r.mien || '', r.cluster || '', r.gsbh || '', r.office || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'DAILY_DATA',
    table: 'datamart.fact_daily_sellin',
    cols: ['month', 'date_val', 'channel', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'daily_sellin'],
    map: (r) => [r.month, r.date_val, r.channel || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.daily_sellin, 0)],
    metricField: 'daily_sellin',
  },
  {
    name: 'PROD_TREE',
    table: 'datamart.fact_prod_tree',
    cols: ['month', 'year', 'month_num', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'CHAN_TREE',
    table: 'datamart.fact_chan_tree',
    cols: ['month', 'year', 'month_num', 'channel', 'sub_channel', 'account_code', 'account_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.channel || '', r.sub_channel || '', r.account_code || '', r.account_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'TARGET_SELLIN',
    table: 'datamart.fact_target_sellin',
    cols: ['year', 'month', 'channel', 'sub_channel', 'account_npp', 'distributor_code', 'storage', 'ph1', 'target_amt'],
    map: (r) => [numVal(r.year, 0), r.month, r.channel || '', r.sub_channel || '', r.account_npp || '', r.distributor_code || '', r.storage || '', r.ph1 || '', numVal(r.target_amt, 0)],
    metricField: 'target_amt',
  },
  {
    name: 'TARGET_SELLOUT',
    table: 'datamart.fact_target_sellout',
    cols: ['year', 'month', 'channel', 'distributor_code', 'employee_name', 'storage', 'ph1', 'target_amt'],
    map: (r) => [numVal(r.year, 0), r.month, r.channel || 'GT', r.distributor_code || '', r.employee_name || '', r.storage || '', r.ph1 || '', numVal(r.target_amt, 0)],
    metricField: 'target_amt',
  },
  {
    name: 'MT_TREE',
    table: 'datamart.fact_mt_tree',
    cols: ['month', 'year', 'month_num', 'sub_channel', 'key_account', 'cluster', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.sub_channel || '', r.key_account || '', r.cluster || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'MT_STORE_DATA',
    table: 'datamart.fact_mt_store',
    cols: ['m', 'store_id', 'acc', 'name', 'sc', 'cl', 'addr', 'val', 'lm', 'ly', 'sku', 'lm_sku'],
    map: (r) => [numVal(r.m, 0), r.id || '', r.acc || '', r.name || '', r.sc || '', r.cl || '', r.addr || '', numVal(r.val, 0), numVal(r.lm, 0), numVal(r.ly, 0), Math.round(numVal(r.sku, 0)), Math.round(numVal(r.lm_sku, 0))],
    metricField: 'val',
  },
  {
    name: 'MT_DAILY_DATA',
    table: 'datamart.fact_mt_daily',
    cols: ['month', 'date_val', 'sub_channel', 'key_account', 'val'],
    map: (r) => [r.month, r.date_val, r.sub_channel || '', r.key_account || '', numVal(r.val, 0)],
    metricField: 'val',
  },
  {
    name: 'B2B_TREE',
    table: 'datamart.fact_b2b_tree',
    cols: ['month', 'year', 'month_num', 'sub_channel', 'b2b_account', 'b2b_customer', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.sub_channel || '', r.b2b_account || '', r.b2b_customer || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'KR_TREE',
    table: 'datamart.fact_kr_tree',
    cols: ['month', 'year', 'month_num', 'sub_channel', 'account_code', 'kr_chain', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellin_val'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.sub_channel || '', r.account_code || '', r.kr_chain || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'GT_TREE',
    table: 'datamart.fact_gt_tree',
    cols: ['month', 'year', 'month_num', 'mien', 'vung', 'gsbh_name', 'npp_code', 'npp_name', 'nvbh_name', 'office', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sellout_val', 'aso_count', 'order_count', 'order_sku_cnt', 'aso_sku_cnt', 'sku_count', 'line_count'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.mien || '', r.vung || '', r.gsbh_name || '', r.npp_code || '', r.npp_name || '', r.nvbh_name || '', r.office || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.sellout_val, 0), Math.round(numVal(r.aso_count, 0)), Math.round(numVal(r.order_count, 0)), Math.round(numVal(r.order_sku_cnt, 0)), Math.round(numVal(r.aso_sku_cnt, 0)), Math.round(numVal(r.sku_count, 0)), Math.round(numVal(r.line_count, 0))],
    metricField: 'sellout_val',
  },
  {
    name: 'GT_DAILY_SI',
    table: 'datamart.fact_gt_daily_si',
    cols: ['month', 'date_val', 'npp_code', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'daily_si'],
    map: (r) => [r.month, r.date_val, r.npp_code || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.daily_si, 0)],
    metricField: 'daily_si',
  },
  {
    name: 'GT_DAILY_SO',
    table: 'datamart.fact_gt_daily_so',
    cols: ['month', 'date_val', 'npp_code', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'daily_so'],
    map: (r) => [r.month, r.date_val, r.npp_code || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.daily_so, 0)],
    metricField: 'daily_so',
  },
  {
    name: 'GT_SI',
    table: 'datamart.fact_gt_si',
    cols: ['month', 'npp_code', 'sellin_val'],
    map: (r) => [r.month, r.npp_code || '', numVal(r.sellin_val, 0)],
    metricField: 'sellin_val',
  },
  {
    name: 'GT_STOCK',
    table: 'datamart.fact_gt_stock',
    cols: ['month', 'npp_code', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'stock_val'],
    map: (r) => [r.month, r.npp_code || '', r.storage || '', r.cate || '', r.ph1 || '', r.ph2 || '', r.sku_name || '', numVal(r.stock_val, 0)],
    metricField: 'stock_val',
  },
  {
    name: 'GT_ASO_M',
    table: 'datamart.fact_gt_aso_m',
    cols: ['month', 'year', 'month_num', 'npp_code', 'storage', 'aso_count', 'order_count', 'mien', 'vung', 'gsbh'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.npp_code || '', r.storage || '', Math.round(numVal(r.aso_count, 0)), Math.round(numVal(r.order_count, 0)), r.mien || '', r.vung || '', r.gsbh || ''],
    metricField: 'aso_count',
  },
  {
    name: 'GT_MCP_M',
    table: 'datamart.fact_gt_mcp_m',
    cols: ['month', 'year', 'month_num', 'mien', 'vung', 'gsbh', 'npp_code', 'mcp_count'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.mien || '', r.vung || '', r.gsbh || '', r.npp_code || '', Math.round(numVal(r.mcp_count, 0))],
    metricField: 'mcp_count',
  },
  {
    name: 'GT_NVBH_M',
    table: 'datamart.fact_gt_nvbh_m',
    cols: ['month', 'year', 'month_num', 'npp_code', 'nvbh_name', 'storage', 'sellout_val', 'aso_count', 'order_count', 'order_sku_cnt', 'aso_sku_cnt', 'npp_name', 'mien', 'vung', 'gsbh', 'office'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.npp_code || '', r.nvbh_name || '', r.storage || '', numVal(r.sellout_val, 0), Math.round(numVal(r.aso_count, 0)), Math.round(numVal(r.order_count, 0)), Math.round(numVal(r.order_sku_cnt, 0)), Math.round(numVal(r.aso_sku_cnt, 0)), r.npp_name || '', r.mien || '', r.vung || '', r.gsbh || '', r.office || ''],
    metricField: 'sellout_val',
  },
  {
    name: 'GT_NVBH_MCP_M',
    table: 'datamart.fact_gt_nvbh_mcp_m',
    cols: ['month', 'npp_code', 'nvbh_name', 'mcp_count', 'npp_name', 'mien', 'vung', 'gsbh', 'office'],
    map: (r) => [r.month, r.npp_code || '', r.nvbh_name || '', Math.round(numVal(r.mcp_count, 0)), r.npp_name || '', r.mien || '', r.vung || '', r.gsbh || '', r.office || ''],
    metricField: 'mcp_count',
  },
  {
    name: 'GT_SALESMAN_ACTIVE',
    table: 'datamart.fact_gt_salesman_active',
    cols: ['year', 'month_num', 'mien', 'vung', 'gsbh', 'npp_code', 'npp_name', 'office', 'emp_code', 'emp_name', 'is_active_target', 'is_active_in_month'],
    map: (r) => [numVal(r.year, 0), r.month_num || '01', r.mien || '', r.vung || '', r.gsbh || '', r.npp_code || '', r.npp_name || '', r.office || '', r.emp_code || '', r.emp_name || '', Math.round(numVal(r.is_active_target, 0)), Math.round(numVal(r.is_active_in_month, 0))],
    metricField: 'is_active_target',
  },
  {
    name: 'GT_L3M',
    table: 'datamart.fact_gt_l3m',
    cols: ['month', 'mien', 'vung', 'gsbh', 'npp_code', 'storage', 'l3m_aso'],
    map: (r) => [r.month, r.mien || '', r.vung || '', r.gsbh || '', r.npp_code || '', r.storage || '', Math.round(numVal(r.l3m_aso, 0))],
    metricField: 'l3m_aso',
  },
  {
    name: 'GT_SUBCHAN_M',
    table: 'datamart.fact_gt_subchan_m',
    cols: ['month', 'year', 'month_num', 'sub_chan', 'npp_code', 'total_so', 'cold_so', 'dry_so', 'aso_count', 'nv_count', 'mien', 'vung', 'gsbh'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.sub_chan || '', r.npp_code || '', numVal(r.total_so, 0), numVal(r.cold_so, 0), numVal(r.dry_so, 0), Math.round(numVal(r.aso_count, 0)), Math.round(numVal(r.nv_count, 0)), r.mien || '', r.vung || '', r.gsbh || ''],
    metricField: 'total_so',
  },
  {
    name: 'GT_ROUTE_SUMMARY',
    table: 'datamart.fact_gt_route_summary',
    cols: ['month', 'year', 'month_num', 'mien', 'vung', 'gsbh', 'npp_code', 'npp_name', 'nvbh', 'route', 'total_mcp', 'active_aso', 'sellout_val', 'office'],
    map: (r) => [r.month, numVal(r.year, 0), r.month_num || '01', r.mien || '', r.vung || '', r.gsbh || '', r.npp_code || '', r.npp_name || '', r.nvbh || '', r.route || '', Math.round(numVal(r.total_mcp, 0)), Math.round(numVal(r.active_aso, 0)), numVal(r.sellout_val, 0), r.office || ''],
    metricField: 'sellout_val',
  },
  {
    name: 'GT_CUST_ROUTES',
    table: 'datamart.fact_gt_cust_routes',
    cols: ['month', 'c_code', 'c_name', 'addr', 'route', 'nvbh', 'npp_name', 'npp_code', 'gsbh', 'vung', 'mien', 'is_active', 'sellout', 'freq', 'week_type', 'days_str', 'emp_code', 'is_target'],
    map: (r) => [r[0] || '', r[1] || '', r[2] || '', r[3] || '', r[4] || '', r[5] || '', r[6] || '', r[7] || '', r[8] || '', r[9] || '', r[10] || '', Math.round(numVal(r[11], 0)), numVal(r[12], 0), r[13] || '', r[14] || '', r[15] || '', r[16] || '', Math.round(numVal(r[17], 1))],
    metricIndex: 12,
  },
  {
    name: 'GT_CUST_PROD_SALES',
    table: 'datamart.fact_gt_cust_prod_sales',
    cols: ['month_num', 'c_code', 'storage', 'cate', 'ph1', 'ph2', 'sku_name', 'sales'],
    map: (r) => [String(r[0] || '').padStart(2, '0'), r[1] || '', r[2] || '', r[3] || '', r[4] || '', r[5] || '', r[6] || '', numVal(r[7], 0)],
    metricIndex: 7,
  },
  {
    name: 'GT_VISIT_MTD',
    table: 'datamart.fact_gt_visit_mtd',
    cols: ['month', 'npp_code', 'nvbh', 'days', 'call_plan', 'visit', 'visit_out', 'work_mins', 'orders', 'sales', 'mien', 'vung', 'gsbh', 'npp_name'],
    map: (r) => [r[0] || '', r[1] || '', r[2] || '', Math.round(numVal(r[3], 0)), Math.round(numVal(r[4], 0)), Math.round(numVal(r[5], 0)), Math.round(numVal(r[6], 0)), Math.round(numVal(r[7], 0)), Math.round(numVal(r[8], 0)), numVal(r[9], 0), r[10] || '', r[11] || '', r[12] || '', r[13] || ''],
    metricIndex: 9,
  },
  {
    name: 'GT_VISIT_DAILY',
    table: 'datamart.fact_gt_visit_daily',
    cols: ['month', 'day_num', 'npp_code', 'nvbh', 'call_plan', 'visit', 'visit_out', 'work_mins', 'orders', 'sales', 'mien', 'vung', 'gsbh', 'npp_name', 'emp_code', 'is_target'],
    map: (r) => [r[0] || '', Math.round(numVal(r[1], 0)), r[2] || '', r[3] || '', Math.round(numVal(r[4], 0)), Math.round(numVal(r[5], 0)), Math.round(numVal(r[6], 0)), Math.round(numVal(r[7], 0)), Math.round(numVal(r[8], 0)), numVal(r[9], 0), r[10] || '', r[11] || '', r[12] || '', r[13] || '', r[14] || '', Math.round(numVal(r[15], 1))],
    metricIndex: 9,
  },
  {
    name: 'GT_FREEZER_DATA',
    table: 'datamart.fact_gt_freezer',
    cols: ['mien', 'vung', 'gsbh', 'gsbh_code', 'npp_code', 'npp_name', 'emp_code', 'emp_name', 'c_code', 'c_name', 'addr', 'lng', 'lat', 'dev_code', 'dev_name', 'dev_type', 'capacity', 'cap_group', 'model_year', 'qr', 'serial', 'channel', 'channel_name', 'month', 'year', 'month_num', 'office', 'sales_json'],
    map: (r) => [r.mien || '', r.vung || '', r.gsbh || '', r.gsbh_code || '', r.npp_code || '', r.npp_name || '', r.emp_code || '', r.emp_name || '', r.c_code || '', r.c_name || '', r.addr || '', String(r.lng ?? ''), String(r.lat ?? ''), r.dev_code || '', r.dev_name || '', r.dev_type || '', r.capacity || '', r.cap_group || '', intOrNull(r.model_year), r.qr || '', r.serial || '', r.channel || '', r.channel_name || '', r.month || '', intOrNull(r.year), intOrNull(r.month_num), r.office || '', JSON.stringify(r.sales || {})],
  },
  {
    name: 'GT_STANDEE_DATA',
    table: 'datamart.fact_gt_standee',
    cols: ['mien', 'vung', 'gsbh', 'gsbh_code', 'npp_code', 'npp_name', 'emp_code', 'emp_name', 'c_code', 'c_name', 'addr', 'lng', 'lat', 'dev_code', 'dev_name', 'dev_type', 'model_year', 'qr', 'serial', 'qty', 'channel', 'channel_name', 'month', 'year', 'month_num', 'office', 'sales_json'],
    map: (r) => [r.mien || '', r.vung || '', r.gsbh || '', r.gsbh_code || '', r.npp_code || '', r.npp_name || '', r.emp_code || '', r.emp_name || '', r.c_code || '', r.c_name || '', r.addr || '', String(r.lng ?? ''), String(r.lat ?? ''), r.dev_code || '', r.dev_name || '', r.dev_type || '', intOrNull(r.model_year), r.qr || '', r.serial || '', Math.round(numVal(r.qty, 1)), r.channel || '', r.channel_name || '', r.month || '', intOrNull(r.year), intOrNull(r.month_num), r.office || '', JSON.stringify(r.sales || {})],
  },
];

function extractFromHtml(htmlPath) {
  console.log(`Reading source HTML: ${htmlPath}`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  let detectedDate = '';
  const mDate = html.match(/Ngày xuất dữ liệu:\s*<\/span><strong[^>]*>([^<]+)</);
  if (mDate) detectedDate = mDate[1].trim();

  const payloads = new Map();
  let pos = 0;
  while (true) {
    const idx = html.indexOf("defineLazyPayload('", pos);
    if (idx === -1) break;
    const nStart = idx + "defineLazyPayload('".length;
    const nEnd = html.indexOf("'", nStart);
    const name = html.slice(nStart, nEnd);
    const qStart = html.indexOf('"', nEnd);
    const qEnd = html.indexOf('"', qStart + 1);
    pos = qEnd + 1;
    if (qEnd - qStart < 10) continue;
    const raw = tryInflate(Buffer.from(html.slice(qStart + 1, qEnd), 'base64'));
    payloads.set(name, JSON.parse(raw.toString('utf8')));
  }
  return { payloads, detectedDate };
}

function extractFromEnc(env) {
  const keyHex = env.PAYLOAD_KEY;
  if (!keyHex) throw new Error('PAYLOAD_KEY missing in .env');
  const dir = path.join(ROOT_DIR, 'data_payloads');
  const payloads = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.enc'))) {
    const name = f.replace(/\.enc$/, '');
    payloads.set(name, decryptEnc(fs.readFileSync(path.join(dir, f)), keyHex));
  }
  return { payloads, detectedDate: '' };
}

function main() {
  const opts = parseArgs();
  const env = loadEnv();
  const t0 = Date.now();
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  const { payloads, detectedDate } = opts.fromEnc
    ? extractFromEnc(env)
    : extractFromHtml(opts.htmlPath);
  const refreshDate = opts.refreshDate || detectedDate || '10/11/2026 09:46:19';
  console.log(`Extracted ${payloads.size} payloads (data_refresh_date="${refreshDate}") in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const sqlLines = [
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    `TRUNCATE ${DATASET_SPECS.map((s) => s.table).join(', ')} RESTART IDENTITY;`,
  ];

  const statsRows = [];
  for (const spec of DATASET_SPECS) {
    let rows = payloads.get(spec.name) || [];
    if (spec.dedupe) rows = spec.dedupe(rows);
    const csvName = `${spec.name}.csv`;
    const csvPath = path.join(STAGE_DIR, csvName);
    writeCsv(csvPath, rows, spec.map);

    let minMonth = '';
    let maxMonth = '';
    let metricSum = 0;
    for (const r of rows) {
      const m = Array.isArray(r) ? (typeof r[0] === 'string' ? r[0] : '') : (r.month || (r.year && r.month_num ? `${r.year}-${r.month_num}` : ''));
      if (m && (!minMonth || m < minMonth)) minMonth = m;
      if (m && (!maxMonth || m > maxMonth)) maxMonth = m;
      if (spec.metricField) metricSum += numVal(r[spec.metricField], 0);
      else if (typeof spec.metricIndex === 'number') metricSum += numVal(r[spec.metricIndex], 0);
    }

    statsRows.push([spec.name, spec.table, rows.length, minMonth || null, maxMonth || null, metricSum.toFixed(2)]);
    sqlLines.push(`\\copy ${spec.table} (${spec.cols.join(',')}) FROM '/tmp/etl/${csvName}' WITH (FORMAT csv, NULL '\\N', ENCODING 'UTF8')`);
    console.log(`Staged ${spec.name.padEnd(20)} -> ${String(rows.length).padStart(7)} rows (${csvName})`);
  }

  // Also stage legacy-compatible dimensions & summary tables computed via SQL right inside the transaction!
  const statsCsv = path.join(STAGE_DIR, 'ETL_STATS.csv');
  writeCsv(statsCsv, statsRows, (r) => r);
  sqlLines.push('TRUNCATE datamart.etl_dataset_stats;');
  sqlLines.push(`\\copy datamart.etl_dataset_stats (dataset_name,table_name,row_count,min_month,max_month,metric_sum) FROM '/tmp/etl/ETL_STATS.csv' WITH (FORMAT csv, NULL '\\N', ENCODING 'UTF8')`);

  const metaCsv = path.join(STAGE_DIR, 'ETL_META.csv');
  const totalRows = statsRows.reduce((s, r) => s + r[2], 0);
  writeCsv(metaCsv, [
    ['data_refresh_date', refreshDate],
    ['total_datasets', String(statsRows.length)],
    ['total_rows', String(totalRows)],
    ['source_mode', opts.fromEnc ? 'enc' : 'dashboard_web_html'],
  ], (r) => r);
  sqlLines.push(`INSERT INTO datamart.etl_metadata (meta_key, meta_value, updated_at) VALUES ('_tmp', '_tmp', NOW()) ON CONFLICT DO NOTHING;`);
  sqlLines.push(`DELETE FROM datamart.etl_metadata WHERE meta_key IN ('data_refresh_date','total_datasets','total_rows','source_mode','_tmp');`);
  sqlLines.push(`\\copy datamart.etl_metadata (meta_key, meta_value) FROM '/tmp/etl/ETL_META.csv' WITH (FORMAT csv, NULL '\\N', ENCODING 'UTF8')`);

  // Sync legacy/core compatibility tables from newly loaded facts:
  sqlLines.push(`
    -- 1) Sync datamart.dim_geo_hierarchy
    INSERT INTO datamart.dim_geo_hierarchy (region_code, region_name, vung_code, area_code, office_name)
    SELECT DISTINCT
      CASE
        WHEN mien ILIKE '%BẮC%' THEN 'BẮC'
        WHEN mien ILIKE '%TRUNG%' THEN 'TRUNG'
        WHEN mien ILIKE '%NAM%' THEN 'NAM'
        ELSE COALESCE(NULLIF(LEFT(mien, 20), ''), 'OTHER')
      END AS region_code,
      COALESCE(NULLIF(LEFT(mien, 50), ''), 'Khác') AS region_name,
      COALESCE(NULLIF(LEFT(vung, 50), ''), 'Khác') AS vung_code,
      COALESCE(NULLIF(LEFT(gsbh, 50), ''), 'Khác') AS area_code,
      MAX(npp_name) AS office_name
    FROM datamart.dim_geo_distributors
    GROUP BY 1, 2, 3, 4
    ON CONFLICT (region_code, vung_code, area_code) DO UPDATE SET office_name = EXCLUDED.office_name;

    -- 2) Sync datamart.dim_product_hierarchy
    INSERT INTO datamart.dim_product_hierarchy (sku_code, sku_name, storage_type, category, ph1, ph2)
    SELECT
      UPPER(SUBSTR(MD5(sku_name), 1, 24)) AS sku_code,
      LEFT(sku_name, 200),
      LEFT(COALESCE(NULLIF(storage, ''), 'Ambient'), 50),
      LEFT(COALESCE(NULLIF(cate, ''), 'Other'), 100),
      LEFT(ph1, 100),
      LEFT(ph2, 100)
    FROM datamart.dim_product_catalog
    ON CONFLICT (sku_code) DO UPDATE
      SET storage_type = EXCLUDED.storage_type, category = EXCLUDED.category, ph1 = EXCLUDED.ph1, ph2 = EXCLUDED.ph2;

    -- 3) Recompute datamart.fact_monthly_performance (unified in VND across all months & channels)
    TRUNCATE datamart.fact_monthly_performance RESTART IDENTITY;
    WITH monthly_si AS (
      SELECT year::INT AS year, month, channel, SUM(sellin_val) AS rev
      FROM datamart.fact_sellin_monthly
      GROUP BY year, month, channel
      UNION ALL
      SELECT year::INT AS year, month, 'ALL' AS channel, SUM(sellin_val) AS rev
      FROM datamart.fact_sellin_monthly
      GROUP BY year, month
    ),
    monthly_tgt AS (
      SELECT month, channel, SUM(target_amt) AS tgt
      FROM datamart.fact_target_sellin
      GROUP BY month, channel
      UNION ALL
      SELECT month, 'ALL' AS channel, SUM(target_amt) AS tgt
      FROM datamart.fact_target_sellin
      GROUP BY month
    ),
    combined AS (
      SELECT
        s.year,
        s.month,
        s.channel,
        'ALL'::VARCHAR(100) AS sub_channel,
        ROUND(s.rev, 2) AS sellin_revenue,
        ROUND(COALESCE(t.tgt, 0), 2) AS target_sellin,
        ROUND(s.rev - COALESCE(t.tgt, 0), 2) AS gap_sellin,
        CASE WHEN COALESCE(t.tgt, 0) > 0 THEN LEAST(ROUND((s.rev / t.tgt) * 100, 2), 999.99) ELSE 0 END AS achievement_rate,
        ROUND(COALESCE(ly.rev, 0), 2) AS ly_sellin,
        ROUND(s.rev - COALESCE(ly.rev, 0), 2) AS yoy_growth_amt,
        CASE WHEN COALESCE(ly.rev, 0) > 0 THEN LEAST(GREATEST(ROUND(((s.rev - ly.rev) / ly.rev) * 100, 2), -999.99), 999.99) ELSE 0 END AS yoy_growth_rate,
        CASE WHEN COALESCE(pm.rev, 0) > 0 THEN LEAST(GREATEST(ROUND(((s.rev - pm.rev) / pm.rev) * 100, 2), -999.99), 999.99) ELSE 0 END AS mom_mtd_rate,
        ROUND(SUM(s.rev) OVER (PARTITION BY s.year, s.channel ORDER BY s.month), 2) AS ytd_revenue,
        CASE WHEN COALESCE(tot.rev, 0) > 0 THEN LEAST(ROUND((s.rev / tot.rev) * 100, 2), 100.00) ELSE 0 END AS channel_share
      FROM monthly_si s
      LEFT JOIN monthly_tgt t ON t.month = s.month AND t.channel = s.channel
      LEFT JOIN monthly_si ly ON ly.year = s.year - 1 AND SUBSTR(ly.month, 6, 2) = SUBSTR(s.month, 6, 2) AND ly.channel = s.channel
      LEFT JOIN monthly_si pm ON pm.month = TO_CHAR((TO_DATE(s.month || '-01', 'YYYY-MM-DD') - INTERVAL '1 month'), 'YYYY-MM') AND pm.channel = s.channel
      LEFT JOIN monthly_si tot ON tot.month = s.month AND tot.channel = 'ALL'
    )
    INSERT INTO datamart.fact_monthly_performance (
      year, month, channel, sub_channel, sellin_revenue, target_sellin, gap_sellin,
      achievement_rate, ly_sellin, yoy_growth_amt, yoy_growth_rate, mom_mtd_rate,
      ytd_revenue, channel_share
    )
    SELECT * FROM combined;

    -- 4) Recompute datamart.fact_daily_sales
    TRUNCATE datamart.fact_daily_sales RESTART IDENTITY;
    WITH daily_agg AS (
      SELECT date_val AS sale_date, EXTRACT(YEAR FROM date_val)::INT AS year, month, channel, SUM(daily_sellin) AS amt
      FROM datamart.fact_daily_sellin
      GROUP BY date_val, month, channel
      UNION ALL
      SELECT date_val AS sale_date, EXTRACT(YEAR FROM date_val)::INT AS year, month, 'ALL' AS channel, SUM(daily_sellin) AS amt
      FROM datamart.fact_daily_sellin
      GROUP BY date_val, month
    )
    INSERT INTO datamart.fact_daily_sales (sale_date, year, month, channel, sellin_amt, target_amt, cumulative_sellin, cumulative_target)
    SELECT
      sale_date,
      year,
      month,
      channel,
      ROUND(amt, 2),
      0,
      ROUND(SUM(amt) OVER (PARTITION BY month, channel ORDER BY sale_date), 2),
      0
    FROM daily_agg;

    -- 5) Recompute datamart.fact_stock_doi from GT_STOCK + L3M avg monthly sellout (fact_gt_tree)
    TRUNCATE datamart.fact_stock_doi RESTART IDENTITY;
    WITH stk AS (
      SELECT month, npp_code, SUM(stock_val) AS stock_amt
      FROM datamart.fact_gt_stock
      GROUP BY month, npp_code
    ),
    monthly_so AS (
      SELECT month, npp_code, SUM(sellout_val) AS so_amt, MAX(mien) AS mien, MAX(vung) AS vung
      FROM datamart.fact_gt_tree
      GROUP BY month, npp_code
    ),
    l3m_so AS (
      SELECT
        s.month,
        s.npp_code,
        COALESCE(AVG(p.so_amt), 0) AS l3m_val,
        MAX(p.mien) AS mien,
        MAX(p.vung) AS vung
      FROM stk s
      LEFT JOIN monthly_so p
        ON p.npp_code = s.npp_code
       AND TO_DATE(p.month || '-01', 'YYYY-MM-DD') >= (TO_DATE(s.month || '-01', 'YYYY-MM-DD') - INTERVAL '3 months')
       AND TO_DATE(p.month || '-01', 'YYYY-MM-DD') < TO_DATE(s.month || '-01', 'YYYY-MM-DD')
      GROUP BY s.month, s.npp_code
    )
    INSERT INTO datamart.fact_stock_doi (report_month, channel, region, area, npp_code, npp_name, stock_amt, l3m_avg_monthly, doi_days, doi_status)
    SELECT
      s.month,
      'GT',
      LEFT(COALESCE(NULLIF(g.mien, ''), NULLIF(l.mien, ''), 'Khác'), 50),
      LEFT(COALESCE(NULLIF(g.vung, ''), NULLIF(l.vung, ''), 'Khác'), 50),
      LEFT(s.npp_code, 50),
      LEFT(COALESCE(NULLIF(g.npp_name, ''), s.npp_code), 150),
      ROUND(s.stock_amt, 2),
      ROUND(COALESCE(l.l3m_val, 0), 2),
      CASE WHEN COALESCE(l.l3m_val, 0) > 0 THEN LEAST(ROUND((s.stock_amt / l.l3m_val) * 26, 1), 9999.9) ELSE 0 END,
      CASE
        WHEN COALESCE(l.l3m_val, 0) > 0 AND (s.stock_amt / l.l3m_val) * 26 > 35 THEN 'Danger_High'
        WHEN COALESCE(l.l3m_val, 0) > 0 AND (s.stock_amt / l.l3m_val) * 26 < 10 THEN 'Low_Stock'
        ELSE 'Normal'
      END
    FROM stk s
    LEFT JOIN l3m_so l ON l.month = s.month AND l.npp_code = s.npp_code
    LEFT JOIN datamart.dim_geo_distributors g ON g.npp_code = s.npp_code
    ON CONFLICT (report_month, npp_code) DO NOTHING;

    COMMIT;
    ANALYZE;
  `);

  const loadSqlPath = path.join(STAGE_DIR, 'load_all.sql');
  fs.writeFileSync(loadSqlPath, sqlLines.join('\n'), 'utf8');
  console.log(`\nPrepared ${statsRows.length} CSVs (${totalRows.toLocaleString()} total rows) in ${STAGE_DIR}`);
  console.log(`Generated loader SQL: ${loadSqlPath}`);

  if (opts.apply) {
    const dbName = env.POSTGRES_DB || 'cj_enterprise_db';
    const dbUser = env.POSTGRES_USER || 'cj_sec_admin';
    const redisPass = env.REDIS_PASSWORD || '';
    console.log('\nApplying to Docker PostgreSQL container `standard_postgres`...');
    execFileSync('docker', ['exec', 'standard_postgres', 'rm', '-rf', '/tmp/etl'], { stdio: 'inherit' });
    execFileSync('docker', ['cp', STAGE_DIR, 'standard_postgres:/tmp/etl'], { stdio: 'inherit' });
    execFileSync('docker', ['exec', 'standard_postgres', 'psql', '-U', dbUser, '-d', dbName, '-f', '/tmp/etl/load_all.sql'], { stdio: 'inherit' });
    if (redisPass) {
      try {
        execFileSync('docker', ['exec', 'standard_redis', 'redis-cli', '--no-auth-warning', '-a', redisPass, 'FLUSHDB'], { stdio: 'inherit' });
        console.log('Flushed Redis cache (`FLUSHDB`).');
      } catch (e) {
        console.warn('Redis flush warning:', e.message);
      }
    }
    console.log(`\nETL completed cleanly in ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
  }
}

main();
