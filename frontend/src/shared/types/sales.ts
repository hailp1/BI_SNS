export interface ChannelKpi {
  channel: string;
  sellin_revenue: number;
  target_sellin: number;
  achievement_rate: number;
  ly_sellin: number;
  yoy_growth_rate: number;
  yoy_growth_amt: number;
  mom_mtd_rate: number;
  gap_sellin: number;
  channel_share?: number;
}

export interface OverviewApiResponse {
  month: string;
  overall: ChannelKpi;
  channels: Record<string, ChannelKpi>;
}

export interface DailyTrendPoint {
  date_str: string;
  channel?: string;
  sellin_revenue?: number;
  sellout_revenue?: number;
  target_daily?: number;
}

export interface SellinRecord {
  year: string;
  month_num: number;
  channel?: string;
  sub_channel?: string;
  account_code?: string;
  account_name?: string;
  mien?: string;
  vung?: string;
  cluster?: string;
  area?: string;
  office?: string;
  gsbh?: string;
  gsbh_name?: string;
  npp_code?: string;
  npp_name?: string;
  storage?: string;
  cate?: string;
  ph1?: string;
  ph2?: string;
  sku?: string;
  sku_name?: string;
  sellin_val?: number;
  sellout_val?: number;
  target_val?: number;
  ly_val?: number;
  [key: string]: unknown;
}

export type PayloadName =
  | 'SELLIN_M'
  | 'DAILY_DATA'
  | 'GT_DAILY_SI'
  | 'GT_DAILY_SO'
  | 'PROD_TREE'
  | 'CHAN_TREE'
  | 'GT_TREE'
  | 'GT_SI'
  | 'GT_STOCK'
  | 'GT_ASO_M'
  | 'GT_MCP_M'
  | 'GT_L3M'
  | 'GT_NVBH_M'
  | 'GT_NVBH_MCP_M'
  | 'GT_SUBCHAN_M'
  | 'GT_CUST_PROD_SALES'
  | 'GT_FREEZER_DATA'
  | 'GT_STANDEE_DATA'
  | 'GT_SALESMAN_ACTIVE'
  | 'GT_ROUTE_SUMMARY'
  | 'GT_CUST_ROUTES'
  | 'GT_VISIT_MTD'
  | 'GT_VISIT_DAILY'
  | 'MT_TREE'
  | 'MT_DAILY_DATA'
  | 'MT_STORE_DATA'
  | 'B2B_TREE'
  | 'KR_TREE'
  | 'TARGET_SELLIN'
  | 'TARGET_SELLOUT'
  | 'DIM_COMM_HIER'
  | 'DIM_GEO_HIER'
  | 'DIM_PROD_HIER';
