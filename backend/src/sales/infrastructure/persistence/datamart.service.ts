import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';

export interface OverviewFilterParams {
  year?: string;
  months?: string[];
  channel?: string;
  subChannel?: string;
  account?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  ph2?: string;
  sku?: string;
}

interface DatasetQueryConfig {
  table: string;
  selectSql: string;
  rowMode?: 'array';
  orderBy?: string;
  implicitChannel?: 'GT' | 'MT' | 'B2B' | 'KR';
  isDimension?: boolean;
  hasChannelCol?: boolean;
  geoCols?: {
    mien?: string;
    vung?: string;
    gsbh?: string;
    office?: string;
    nppCode?: string;
    nppName?: string;
  };
}

const DATASET_CONFIGS: Record<string, DatasetQueryConfig> = {
  DIM_GEO_HIER: {
    table: 'datamart.dim_geo_distributors',
    selectSql: 'mien, vung, gsbh, npp_code, npp_name',
    orderBy: 'npp_code',
    isDimension: true,
  },
  DIM_PROD_HIER: {
    table: 'datamart.dim_product_catalog',
    selectSql: 'storage, cate, ph1, ph2, sku_name',
    orderBy: 'storage, cate, sku_name',
    isDimension: true,
  },
  DIM_COMM_HIER: {
    table: 'datamart.dim_commercial_hierarchy',
    selectSql: 'channel, sub_channel, account_name',
    orderBy: 'channel, sub_channel, account_name',
    isDimension: true,
  },
  PROD_TREE: {
    table: 'datamart.fact_prod_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, storage, cate, ph1, ph2, sku_name, sellin_val::float8 AS sellin_val',
    isDimension: true,
  },
  CHAN_TREE: {
    table: 'datamart.fact_chan_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, channel, sub_channel, account_code, account_name, sellin_val::float8 AS sellin_val',
    isDimension: true,
  },
  SELLIN_M: {
    table: 'datamart.fact_sellin_monthly',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, channel, sub_channel, account_code, account_name, mien, cluster, gsbh, office, storage, cate, ph1, ph2, sku_name, sellin_val::float8 AS sellin_val',
    hasChannelCol: true,
    geoCols: {
      mien: 'mien',
      vung: 'cluster',
      gsbh: 'gsbh',
      office: 'office',
      nppCode: 'account_code',
      nppName: 'account_name',
    },
  },
  DAILY_DATA: {
    table: 'datamart.fact_daily_sellin',
    selectSql:
      "month, TO_CHAR(date_val, 'YYYY-MM-DD') AS date_val, channel, storage, cate, ph1, ph2, sku_name, daily_sellin::float8 AS daily_sellin",
    hasChannelCol: true,
  },
  TARGET_SELLIN: {
    table: 'datamart.fact_target_sellin',
    selectSql:
      'year::text AS year, month, channel, sub_channel, account_npp, distributor_code, storage, ph1, target_amt::float8 AS target_amt',
    hasChannelCol: true,
    geoCols: { nppCode: 'distributor_code', nppName: 'account_npp' },
  },
  TARGET_SELLOUT: {
    table: 'datamart.fact_target_sellout',
    selectSql:
      'year::text AS year, month, channel, distributor_code, employee_name, storage, ph1, target_amt::float8 AS target_amt',
    hasChannelCol: true,
    geoCols: { nppCode: 'distributor_code' },
  },
  MT_TREE: {
    table: 'datamart.fact_mt_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, sub_channel, key_account, cluster, storage, cate, ph1, ph2, sku_name, sellin_val::float8 AS sellin_val',
    implicitChannel: 'MT',
    geoCols: { vung: 'cluster' },
  },
  MT_STORE_DATA: {
    table: 'datamart.fact_mt_store',
    selectSql:
      'm::int AS m, store_id AS id, acc, name, sc, cl, addr, val::float8 AS val, lm::float8 AS lm, ly::float8 AS ly, sku::int AS sku, lm_sku::int AS lm_sku',
    implicitChannel: 'MT',
    geoCols: { vung: 'cl' },
  },
  MT_DAILY_DATA: {
    table: 'datamart.fact_mt_daily',
    selectSql: "month, TO_CHAR(date_val, 'YYYY-MM-DD') AS date_val, sub_channel, key_account, val::float8 AS val",
    implicitChannel: 'MT',
  },
  B2B_TREE: {
    table: 'datamart.fact_b2b_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, sub_channel, b2b_account, b2b_customer, storage, cate, ph1, ph2, sku_name, sellin_val::float8 AS sellin_val',
    implicitChannel: 'B2B',
  },
  KR_TREE: {
    table: 'datamart.fact_kr_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, sub_channel, account_code, kr_chain, storage, cate, ph1, ph2, sku_name, sellin_val::float8 AS sellin_val',
    implicitChannel: 'KR',
  },
  GT_TREE: {
    table: 'datamart.fact_gt_tree',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, mien, vung, gsbh_name, npp_code, npp_name, nvbh_name, office, storage, cate, ph1, ph2, sku_name, sellout_val::float8 AS sellout_val, aso_count::int AS aso_count, order_count::int AS order_count, order_sku_cnt::int AS order_sku_cnt, aso_sku_cnt::int AS aso_sku_cnt, sku_count::int AS sku_count, line_count::int AS line_count',
    implicitChannel: 'GT',
    geoCols: {
      mien: 'mien',
      vung: 'vung',
      gsbh: 'gsbh_name',
      office: 'office',
      nppCode: 'npp_code',
      nppName: 'npp_name',
    },
  },
  GT_DAILY_SI: {
    table: 'datamart.fact_gt_daily_si',
    selectSql:
      "month, TO_CHAR(date_val, 'YYYY-MM-DD') AS date_val, npp_code, storage, cate, ph1, ph2, sku_name, daily_si::float8 AS daily_si",
    implicitChannel: 'GT',
    geoCols: { nppCode: 'npp_code' },
  },
  GT_DAILY_SO: {
    table: 'datamart.fact_gt_daily_so',
    selectSql:
      "month, TO_CHAR(date_val, 'YYYY-MM-DD') AS date_val, npp_code, storage, cate, ph1, ph2, sku_name, daily_so::float8 AS daily_so",
    implicitChannel: 'GT',
    geoCols: { nppCode: 'npp_code' },
  },
  GT_SI: {
    table: 'datamart.fact_gt_si',
    selectSql: 'month, npp_code, sellin_val::float8 AS sellin_val',
    implicitChannel: 'GT',
    geoCols: { nppCode: 'npp_code' },
  },
  GT_STOCK: {
    table: 'datamart.fact_gt_stock',
    selectSql: 'month, npp_code, storage, cate, ph1, ph2, sku_name, stock_val::float8 AS stock_val',
    implicitChannel: 'GT',
    geoCols: { nppCode: 'npp_code' },
  },
  GT_ASO_M: {
    table: 'datamart.fact_gt_aso_m',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, npp_code, storage, aso_count::int AS aso_count, order_count::int AS order_count, mien, vung, gsbh',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code' },
  },
  GT_MCP_M: {
    table: 'datamart.fact_gt_mcp_m',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, mien, vung, gsbh, npp_code, mcp_count::int AS mcp_count',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code' },
  },
  GT_NVBH_M: {
    table: 'datamart.fact_gt_nvbh_m',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, npp_code, nvbh_name, storage, sellout_val::float8 AS sellout_val, aso_count::int AS aso_count, order_count::int AS order_count, order_sku_cnt::int AS order_sku_cnt, aso_sku_cnt::int AS aso_sku_cnt, npp_name, mien, vung, gsbh, office',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_NVBH_MCP_M: {
    table: 'datamart.fact_gt_nvbh_mcp_m',
    selectSql: 'month, npp_code, nvbh_name, mcp_count::int AS mcp_count, npp_name, mien, vung, gsbh, office',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_SALESMAN_ACTIVE: {
    table: 'datamart.fact_gt_salesman_active',
    selectSql:
      'year::text AS year, TRIM(month_num) AS month_num, mien, vung, gsbh, npp_code, npp_name, office, emp_code, emp_name, is_active_target::int AS is_active_target, is_active_in_month::text AS is_active_in_month',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_L3M: {
    table: 'datamart.fact_gt_l3m',
    selectSql: 'month, mien, vung, gsbh, npp_code, storage, l3m_aso::int AS l3m_aso',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code' },
  },
  GT_SUBCHAN_M: {
    table: 'datamart.fact_gt_subchan_m',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, sub_chan, npp_code, total_so::float8 AS total_so, cold_so::float8 AS cold_so, dry_so::float8 AS dry_so, aso_count::int AS aso_count, nv_count::int AS nv_count, mien, vung, gsbh',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code' },
  },
  GT_ROUTE_SUMMARY: {
    table: 'datamart.fact_gt_route_summary',
    selectSql:
      'month, year::text AS year, TRIM(month_num) AS month_num, mien, vung, gsbh, npp_code, npp_name, nvbh, route, total_mcp::int AS total_mcp, active_aso::int AS active_aso, sellout_val::float8 AS sellout_val, office',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_CUST_ROUTES: {
    table: 'datamart.fact_gt_cust_routes',
    selectSql:
      'month, c_code, c_name, addr, route, nvbh, npp_name, npp_code, gsbh, vung, mien, is_active::int, sellout::float8, freq, week_type, days_str, emp_code, is_target::int',
    rowMode: 'array',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_CUST_PROD_SALES: {
    table: 'datamart.fact_gt_cust_prod_sales',
    selectSql: 'TRIM(month_num), c_code, storage, cate, ph1, ph2, sku_name, sales::float8',
    rowMode: 'array',
    implicitChannel: 'GT',
  },
  GT_VISIT_MTD: {
    table: 'datamart.fact_gt_visit_mtd',
    selectSql:
      'month, npp_code, nvbh, days::int, call_plan::int, visit::int, visit_out::int, work_mins::int, orders::int, sales::float8, mien, vung, gsbh, npp_name',
    rowMode: 'array',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_VISIT_DAILY: {
    table: 'datamart.fact_gt_visit_daily',
    selectSql:
      'month, day_num::int, npp_code, nvbh, call_plan::int, visit::int, visit_out::int, work_mins::int, orders::int, sales::float8, mien, vung, gsbh, npp_name, emp_code, is_target::int',
    rowMode: 'array',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_FREEZER_DATA: {
    table: 'datamart.fact_gt_freezer',
    selectSql:
      'mien, vung, gsbh, gsbh_code, npp_code, npp_name, emp_code, emp_name, c_code, c_name, addr, lng, lat, dev_code, dev_name, dev_type, capacity, cap_group, model_year::int AS model_year, qr, serial, channel, channel_name, month, year::int AS year, month_num::int AS month_num, office, sales_json AS sales',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  GT_STANDEE_DATA: {
    table: 'datamart.fact_gt_standee',
    selectSql:
      'mien, vung, gsbh, gsbh_code, npp_code, npp_name, emp_code, emp_name, c_code, c_name, addr, lng, lat, dev_code, dev_name, dev_type, model_year::int AS model_year, qr, serial, qty::int AS qty, channel, channel_name, month, year::int AS year, month_num::int AS month_num, office, sales_json AS sales',
    implicitChannel: 'GT',
    geoCols: { mien: 'mien', vung: 'vung', gsbh: 'gsbh', office: 'office', nppCode: 'npp_code', nppName: 'npp_name' },
  },
  DMS_CJ_DATA: {
    table: 'datamart.fact_dms_cj_outlets',
    selectSql:
      'row_seq, outlet_code, outlet_name, lat, lon, salesman, distributor, route_code, route_name, vung, gsbh, freq, week, t2, t3, t4, t5, t6, t7, cn, addr, phone, province',
    rowMode: 'array',
    orderBy: 'id',
    implicitChannel: 'GT',
    geoCols: { vung: 'vung', gsbh: 'gsbh', nppName: 'distributor' },
  },
  DMS_POT_DATA: {
    table: 'datamart.fact_dms_pot_outlets',
    selectSql:
      'row_seq, outlet_code, outlet_name, lat, lon, salesman, distributor, province, addr, score::float8, vung',
    rowMode: 'array',
    orderBy: 'id',
    implicitChannel: 'GT',
    geoCols: { vung: 'vung', nppName: 'distributor' },
  },
  CTKM_TIEN_DATA: {
    table: 'datamart.fact_ctkm_tien',
    selectSql:
      'nam::int AS nam, thang::int AS thang, khu_vuc, mien, vung, office, area, group_ct, ten_ct, code_npp, ten_npp, full_name_npp, code_gsbh, ten_gsbh, amount::float8 AS amount, reason, reason_detail, missing_docs, aging',
    orderBy: 'id',
    implicitChannel: 'GT',
    geoCols: {
      mien: 'mien',
      vung: 'vung',
      gsbh: 'ten_gsbh',
      office: 'office',
      nppCode: 'code_npp',
      nppName: 'ten_npp',
    },
  },
  CTKM_HANG_DATA: {
    table: 'datamart.fact_ctkm_hang',
    selectSql:
      'nam::int AS nam, thang::int AS thang, khu_vuc, mien, vung, office, area, group_ct, ten_ct, code_npp, ten_npp, full_name_npp, code_gsbh, ten_gsbh, ea::float8 AS ea, gia_npp::float8 AS gia_npp, amount::float8 AS amount, ma_sp, ten_sp, storage, cate, reason, reason_detail, missing_docs, aging',
    orderBy: 'id',
    implicitChannel: 'GT',
    geoCols: {
      mien: 'mien',
      vung: 'vung',
      gsbh: 'ten_gsbh',
      office: 'office',
      nppCode: 'code_npp',
      nppName: 'ten_npp',
    },
  },
};

@Injectable()
export class DatamartService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatamartService.name);
  private pool!: Pool;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.pool = new Pool({
      host: this.configService.get<string>('DATABASE_HOST', 'standard_postgres'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      user: this.configService.get<string>('DATABASE_USER', 'cj_sec_admin'),
      password: this.configService.get<string>('DATABASE_PASSWORD') ?? '',
      database: this.configService.get<string>('DATABASE_NAME', 'cj_enterprise_db'),
      max: 12,
      idleTimeoutMillis: 30000,
    });
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  public isAllowedDataset(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(DATASET_CONFIGS, name);
  }

  async getMetadata() {
    const cacheKey = 'cache:datamart:meta:v1';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore redis read miss
    }

    const [metaRes, statsRes, monthsRes] = await Promise.all([
      this.pool.query('SELECT meta_key, meta_value, updated_at FROM datamart.etl_metadata'),
      this.pool.query(
        'SELECT dataset_name, table_name, row_count, min_month, max_month FROM datamart.etl_dataset_stats ORDER BY dataset_name',
      ),
      this.pool.query('SELECT DISTINCT month FROM datamart.fact_monthly_performance ORDER BY month'),
    ]);

    const metaMap: Record<string, string> = {};
    for (const row of metaRes.rows) {
      metaMap[row.meta_key] = row.meta_value;
    }

    const result = {
      data_refresh_date: metaMap.data_refresh_date || '10/11/2026 09:46:19',
      total_datasets: Number(metaMap.total_datasets || statsRes.rows.length),
      total_rows: Number(metaMap.total_rows || 0),
      source_mode: metaMap.source_mode || 'postgresql',
      available_months: monthsRes.rows.map((r) => r.month),
      datasets: statsRes.rows,
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 300);
    } catch {
      // non-fatal
    }
    return result;
  }

  private buildRlsWhere(
    cfg: DatasetQueryConfig,
    user?: AuthenticatedUser,
  ): { whereSql: string; params: unknown[]; denied: boolean } {
    if (!user || cfg.isDimension) {
      return { whereSql: '', params: [], denied: false };
    }
    const role = (user.role || '').toLowerCase();
    const scopeLvl = (user.scopeLevel || 'all').toLowerCase();
    const scopeVal = (user.scopeValue || 'all').trim();
    const userChan = (user.channel || 'all').toUpperCase().trim();

    if (
      role === 'admin' ||
      role === 'director' ||
      role === 'bod' ||
      (scopeLvl === 'all' && (scopeVal.toLowerCase() === 'all' || scopeVal === 'Toàn Quốc') && userChan === 'ALL')
    ) {
      return { whereSql: '', params: [], denied: false };
    }

    if (cfg.implicitChannel && userChan !== 'ALL' && cfg.implicitChannel !== userChan) {
      return { whereSql: '1 = 0', params: [], denied: true };
    }

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (cfg.hasChannelCol && userChan !== 'ALL') {
      params.push(userChan);
      clauses.push(`UPPER(channel) IN ($${params.length}, 'ALL')`);
    }

    const hasGeoConstraint =
      scopeLvl !== 'all' && scopeVal && scopeVal.toLowerCase() !== 'all' && scopeVal !== 'Toàn Quốc';
    if (hasGeoConstraint && cfg.geoCols) {
      if (scopeLvl === 'npp' && (cfg.geoCols.nppCode || cfg.geoCols.nppName)) {
        params.push(scopeVal);
        const pIdx = `$${params.length}`;
        const parts: string[] = [];
        if (cfg.geoCols.nppCode) parts.push(`LOWER(TRIM(${cfg.geoCols.nppCode})) = LOWER(${pIdx})`);
        if (cfg.geoCols.nppName) parts.push(`LOWER(TRIM(${cfg.geoCols.nppName})) = LOWER(${pIdx})`);
        clauses.push(`(${parts.join(' OR ')})`);
      } else if (
        (scopeLvl === 'office' || scopeLvl === 'gsbh') &&
        (cfg.geoCols.office || cfg.geoCols.gsbh || cfg.geoCols.nppCode || cfg.geoCols.vung)
      ) {
        params.push(scopeVal);
        const pIdx = `$${params.length}`;
        const parts: string[] = [];
        if (cfg.geoCols.office) parts.push(`LOWER(TRIM(${cfg.geoCols.office})) = LOWER(${pIdx})`);
        if (cfg.geoCols.gsbh) parts.push(`LOWER(TRIM(${cfg.geoCols.gsbh})) = LOWER(${pIdx})`);
        if (cfg.geoCols.nppCode) {
          parts.push(
            `${cfg.geoCols.nppCode} IN (SELECT npp_code FROM datamart.dim_geo_distributors WHERE LOWER(TRIM(gsbh)) = LOWER(${pIdx}))`,
          );
        } else if (!cfg.geoCols.gsbh && cfg.geoCols.vung) {
          parts.push(
            `${cfg.geoCols.vung} IN (SELECT DISTINCT vung FROM datamart.dim_geo_distributors WHERE LOWER(TRIM(gsbh)) = LOWER(${pIdx}))`,
          );
        }
        clauses.push(`(${parts.join(' OR ')})`);
      } else if (scopeLvl === 'vung' && (cfg.geoCols.vung || cfg.geoCols.nppCode)) {
        params.push(scopeVal);
        const pIdx = `$${params.length}`;
        const parts: string[] = [];
        if (cfg.geoCols.vung) parts.push(`LOWER(TRIM(${cfg.geoCols.vung})) = LOWER(${pIdx})`);
        if (cfg.geoCols.nppCode) {
          parts.push(
            `${cfg.geoCols.nppCode} IN (SELECT npp_code FROM datamart.dim_geo_distributors WHERE LOWER(TRIM(vung)) = LOWER(${pIdx}))`,
          );
        }
        clauses.push(`(${parts.join(' OR ')})`);
      } else if (
        (scopeLvl === 'region' || scopeLvl === 'mien') &&
        (cfg.geoCols.mien || cfg.geoCols.nppCode || cfg.geoCols.vung)
      ) {
        params.push(scopeVal);
        const pIdx = `$${params.length}`;
        const parts: string[] = [];
        if (cfg.geoCols.mien) parts.push(`LOWER(TRIM(${cfg.geoCols.mien})) = LOWER(${pIdx})`);
        if (cfg.geoCols.nppCode) {
          parts.push(
            `${cfg.geoCols.nppCode} IN (SELECT npp_code FROM datamart.dim_geo_distributors WHERE LOWER(TRIM(mien)) = LOWER(${pIdx}))`,
          );
        } else if (!cfg.geoCols.mien && cfg.geoCols.vung) {
          parts.push(
            `${cfg.geoCols.vung} IN (SELECT DISTINCT vung FROM datamart.dim_geo_distributors WHERE LOWER(TRIM(mien)) = LOWER(${pIdx}))`,
          );
        }
        clauses.push(`(${parts.join(' OR ')})`);
      }
    }

    return {
      whereSql: clauses.join(' AND '),
      params,
      denied: false,
    };
  }

  async queryDataset(name: string, user?: AuthenticatedUser): Promise<unknown[]> {
    const cfg = DATASET_CONFIGS[name];
    if (!cfg) {
      throw new BadRequestException(`Unknown datamart dataset: ${name}`);
    }

    const rls = this.buildRlsWhere(cfg, user);
    if (rls.denied) {
      return [];
    }

    const sql =
      `SELECT ${cfg.selectSql} FROM ${cfg.table}` +
      (rls.whereSql ? ` WHERE ${rls.whereSql}` : '') +
      (cfg.orderBy ? ` ORDER BY ${cfg.orderBy}` : '');

    const res =
      cfg.rowMode === 'array'
        ? await this.pool.query({ text: sql, values: rls.params, rowMode: 'array' })
        : await this.pool.query(sql, rls.params);

    return res.rows;
  }

  /**
   * Returns single-column JSON text rows built inside PostgreSQL C code (`row_to_json` / `json_build_array`)
   * so large fact tables stream without allocating millions of intermediate JS objects or running JSON.stringify.
   */
  async queryDatasetRawJsonRows(name: string, user?: AuthenticatedUser): Promise<string[][]> {
    const cfg = DATASET_CONFIGS[name];
    if (!cfg) {
      throw new BadRequestException(`Unknown datamart dataset: ${name}`);
    }

    const rls = this.buildRlsWhere(cfg, user);
    if (rls.denied) {
      return [];
    }

    const whereClause = rls.whereSql ? ` WHERE ${rls.whereSql}` : '';
    const orderClause = cfg.orderBy ? ` ORDER BY ${cfg.orderBy}` : '';
    const sql =
      cfg.rowMode === 'array'
        ? `SELECT json_build_array(${cfg.selectSql})::text FROM ${cfg.table}${whereClause}${orderClause}`
        : `SELECT row_to_json(t)::text FROM (SELECT ${cfg.selectSql} FROM ${cfg.table}${whereClause}${orderClause}) t`;

    const res = await this.pool.query<string[]>({
      text: sql,
      values: rls.params,
      rowMode: 'array',
    });
    return res.rows;
  }

  async getCtkmData(user?: AuthenticatedUser) {
    const [metaRes, tienRows, hangRows] = await Promise.all([
      this.pool.query('SELECT metadata_json FROM datamart.app_ctkm_metadata WHERE id = 1'),
      this.queryDataset('CTKM_TIEN_DATA', user),
      this.queryDataset('CTKM_HANG_DATA', user),
    ]);

    return {
      metadata: metaRes.rows[0]?.metadata_json || {},
      tien_data: tienRows,
      hang_data: hangRows,
    };
  }

  async getOverviewSummary(filters: OverviewFilterParams, user?: AuthenticatedUser) {
    const year = parseInt(filters.year || '2026', 10) || 2026;
    const months = (filters.months && filters.months.length > 0 ? filters.months : ['10']).map((m) =>
      m.padStart(2, '0'),
    );
    const lyYear = year - 1;

    const params: unknown[] = [year, months, lyYear];
    const conds: string[] = ['year IN ($1, $3)', 'month_num = ANY($2::bpchar[])'];

    const userChan = (user?.channel || 'all').toUpperCase().trim();
    const role = (user?.role || '').toLowerCase();
    const scopeLvl = (user?.scopeLevel || 'all').toLowerCase();
    const scopeVal = (user?.scopeValue || 'all').trim();
    const isUnrestricted =
      role === 'admin' || role === 'director' || role === 'bod' || (scopeLvl === 'all' && userChan === 'ALL');

    if (!isUnrestricted && userChan !== 'ALL') {
      params.push(userChan);
      conds.push(`UPPER(channel) = $${params.length}`);
    } else if (filters.channel && filters.channel !== 'ALL') {
      params.push(filters.channel);
      conds.push(`channel = $${params.length}`);
    }

    if (!isUnrestricted && scopeLvl !== 'all' && scopeVal && scopeVal !== 'Toàn Quốc') {
      if (scopeLvl === 'region' || scopeLvl === 'mien') {
        params.push(scopeVal);
        conds.push(`LOWER(TRIM(mien)) = LOWER($${params.length})`);
      } else if (scopeLvl === 'vung') {
        params.push(scopeVal);
        conds.push(`LOWER(TRIM(cluster)) = LOWER($${params.length})`);
      } else if (scopeLvl === 'office' || scopeLvl === 'gsbh') {
        params.push(scopeVal);
        conds.push(`(LOWER(TRIM(office)) = LOWER($${params.length}) OR LOWER(TRIM(gsbh)) = LOWER($${params.length}))`);
      } else if (scopeLvl === 'npp') {
        params.push(scopeVal);
        conds.push(
          `(LOWER(TRIM(account_code)) = LOWER($${params.length}) OR LOWER(TRIM(account_name)) = LOWER($${params.length}))`,
        );
      }
    }

    if (filters.subChannel && filters.subChannel !== 'ALL') {
      params.push(filters.subChannel);
      conds.push(`sub_channel = $${params.length}`);
    }
    if (filters.account && filters.account !== 'ALL') {
      params.push(filters.account);
      conds.push(`(account_name = $${params.length} OR account_code = $${params.length})`);
    }
    if (filters.storage && filters.storage !== 'ALL') {
      params.push(filters.storage);
      conds.push(`storage = $${params.length}`);
    }
    if (filters.cate && filters.cate !== 'ALL') {
      params.push(filters.cate);
      conds.push(`cate = $${params.length}`);
    }
    if (filters.ph1 && filters.ph1 !== 'ALL') {
      params.push(filters.ph1);
      conds.push(`ph1 = $${params.length}`);
    }
    if (filters.ph2 && filters.ph2 !== 'ALL') {
      params.push(filters.ph2);
      conds.push(`ph2 = $${params.length}`);
    }
    if (filters.sku && filters.sku !== 'ALL') {
      params.push(filters.sku);
      conds.push(`sku_name = $${params.length}`);
    }

    const where = conds.join(' AND ');
    const sql = `
      SELECT
        channel,
        SUM(CASE WHEN year = $1 THEN sellin_val ELSE 0 END)::float8 AS cy_sellin,
        SUM(CASE WHEN year = $3 THEN sellin_val ELSE 0 END)::float8 AS ly_sellin
      FROM datamart.fact_sellin_monthly
      WHERE ${where}
      GROUP BY channel
      ORDER BY cy_sellin DESC
    `;

    const tgtMonths = months.map((m) => `${year}-${m}`);
    const tgtConds: string[] = ['month = ANY($1)'];
    const tgtParams: unknown[] = [tgtMonths];
    if (filters.channel && filters.channel !== 'ALL') {
      tgtParams.push(filters.channel);
      tgtConds.push(`channel = $${tgtParams.length}`);
    } else if (!isUnrestricted && userChan !== 'ALL') {
      tgtParams.push(userChan);
      tgtConds.push(`UPPER(channel) = $${tgtParams.length}`);
    }
    if (filters.subChannel && filters.subChannel !== 'ALL') {
      tgtParams.push(filters.subChannel);
      tgtConds.push(`sub_channel = $${tgtParams.length}`);
    }
    if (filters.storage && filters.storage !== 'ALL') {
      tgtParams.push(filters.storage);
      tgtConds.push(`storage = $${tgtParams.length}`);
    }
    if (filters.ph1 && filters.ph1 !== 'ALL') {
      tgtParams.push(filters.ph1);
      tgtConds.push(`ph1 = $${tgtParams.length}`);
    }

    const tgtSql = `
      SELECT channel, SUM(target_amt)::float8 AS target_amt
      FROM datamart.fact_target_sellin
      WHERE ${tgtConds.join(' AND ')}
      GROUP BY channel
    `;

    const [revRes, tgtRes] = await Promise.all([this.pool.query(sql, params), this.pool.query(tgtSql, tgtParams)]);

    const tgtByChan: Record<string, number> = {};
    for (const r of tgtRes.rows) tgtByChan[r.channel] = r.target_amt || 0;

    let totalCy = 0;
    let totalLy = 0;
    let totalTgt = 0;
    const channels = revRes.rows.map((r) => {
      const tgt = tgtByChan[r.channel] || 0;
      totalCy += r.cy_sellin || 0;
      totalLy += r.ly_sellin || 0;
      totalTgt += tgt;
      return {
        channel: r.channel,
        cy_sellin: r.cy_sellin || 0,
        ly_sellin: r.ly_sellin || 0,
        target_amt: tgt,
        ach_pct: tgt > 0 ? Number(((r.cy_sellin / tgt) * 100).toFixed(2)) : 0,
        yoy_pct: r.ly_sellin > 0 ? Number((((r.cy_sellin - r.ly_sellin) / r.ly_sellin) * 100).toFixed(2)) : 0,
      };
    });

    return {
      year: String(year),
      months,
      total_sellin: totalCy,
      total_ly_sellin: totalLy,
      total_target: totalTgt,
      ach_pct: totalTgt > 0 ? Number(((totalCy / totalTgt) * 100).toFixed(2)) : 0,
      yoy_pct: totalLy > 0 ? Number((((totalCy - totalLy) / totalLy) * 100).toFixed(2)) : 0,
      channels,
    };
  }

  private shiftSqlParams(whereSql: string, offset: number): string {
    return offset > 0 ? whereSql.replace(/\$(\d+)/g, (_, idx) => `$${Number(idx) + offset}`) : whereSql;
  }

  async getChannelSummary(
    channelKey: 'MT' | 'B2B' | 'KR' | 'GT',
    yearStr: string,
    monthsArr: string[],
    user?: AuthenticatedUser,
  ) {
    const role = (user?.role || '').toLowerCase();
    const userChan = (user?.channel || 'all').toUpperCase().trim();
    const isUnrestricted = !user || role === 'admin' || role === 'director' || role === 'bod' || userChan === 'ALL';
    if (!isUnrestricted && userChan !== channelKey) {
      throw new ForbiddenException('Không có quyền truy cập dữ liệu kênh khác!');
    }

    const year = parseInt(yearStr || '2026', 10) || 2026;
    const months = (monthsArr && monthsArr.length > 0 ? monthsArr : ['10']).map((m) => m.padStart(2, '0'));
    const lyYear = year - 1;

    if (channelKey === 'GT') {
      const siRls = this.buildRlsWhere(DATASET_CONFIGS.GT_SI, user);
      const soRls = this.buildRlsWhere(DATASET_CONFIGS.GT_TREE, user);
      if (siRls.denied || soRls.denied) {
        throw new ForbiddenException('Không có quyền truy cập phạm vi dữ liệu này!');
      }

      const siWhere = siRls.whereSql ? ` AND ${this.shiftSqlParams(siRls.whereSql, 1)}` : '';
      const soWhere = soRls.whereSql ? ` AND ${this.shiftSqlParams(soRls.whereSql, 3)}` : '';

      const [siRes, soRes] = await Promise.all([
        this.pool.query(
          `SELECT SUM(sellin_val)::float8 AS sellin FROM datamart.fact_gt_si WHERE month = ANY($1)${siWhere}`,
          [months.map((m) => `${year}-${m}`), ...siRls.params],
        ),
        this.pool.query(
          `SELECT
             SUM(CASE WHEN year = $1 THEN sellout_val ELSE 0 END)::float8 AS cy_so,
             SUM(CASE WHEN year = $3 THEN sellout_val ELSE 0 END)::float8 AS ly_so
           FROM datamart.fact_gt_tree
           WHERE year IN ($1, $3) AND month_num = ANY($2::bpchar[])${soWhere}`,
          [year, months, lyYear, ...soRls.params],
        ),
      ]);
      return {
        channel: 'GT',
        year: String(year),
        months,
        sellin: siRes.rows[0]?.sellin || 0,
        sellout: soRes.rows[0]?.cy_so || 0,
        ly_sellout: soRes.rows[0]?.ly_so || 0,
      };
    }

    const tableMap = {
      MT: { table: 'datamart.fact_mt_tree', groupCol: 'sub_channel', cfgKey: 'MT_TREE' },
      B2B: { table: 'datamart.fact_b2b_tree', groupCol: 'b2b_account', cfgKey: 'B2B_TREE' },
      KR: { table: 'datamart.fact_kr_tree', groupCol: 'account_code', cfgKey: 'KR_TREE' },
    } as const;

    const { table, groupCol, cfgKey } = tableMap[channelKey];
    const rls = this.buildRlsWhere(DATASET_CONFIGS[cfgKey], user);
    if (rls.denied) {
      throw new ForbiddenException('Không có quyền truy cập phạm vi dữ liệu này!');
    }
    const extraWhere = rls.whereSql ? ` AND ${this.shiftSqlParams(rls.whereSql, 3)}` : '';

    const res = await this.pool.query(
      `SELECT
         ${groupCol} AS segment,
         SUM(CASE WHEN year = $1 THEN sellin_val ELSE 0 END)::float8 AS cy_sellin,
         SUM(CASE WHEN year = $3 THEN sellin_val ELSE 0 END)::float8 AS ly_sellin
       FROM ${table}
       WHERE year IN ($1, $3) AND month_num = ANY($2::bpchar[])${extraWhere}
       GROUP BY ${groupCol}
       ORDER BY cy_sellin DESC`,
      [year, months, lyYear, ...rls.params],
    );

    const totalCy = res.rows.reduce((s, r) => s + (r.cy_sellin || 0), 0);
    const totalLy = res.rows.reduce((s, r) => s + (r.ly_sellin || 0), 0);
    return {
      channel: channelKey,
      year: String(year),
      months,
      total_sellin: totalCy,
      total_ly_sellin: totalLy,
      segments: res.rows,
    };
  }
}
