export const PERFORMANCE_REPOSITORY_PORT = Symbol('PERFORMANCE_REPOSITORY_PORT');

export interface MonthlyPerformanceRecord {
  channel: string;
  sub_channel: string;
  sellin_revenue: number;
  target_sellin: number;
  gap_sellin: number;
  achievement_rate: number;
  ly_sellin: number;
  yoy_growth_amt: number;
  yoy_growth_rate: number;
  mom_mtd_rate: number;
  ytd_revenue: number;
  channel_share: number;
}

export interface DailySalesRecord {
  sale_date: Date;
  sellin_amt: number;
  target_amt: number;
  cumulative_sellin: number;
  cumulative_target: number;
}

export interface PerformanceRepositoryPort {
  findMonthlyPerformance(month: string, channel?: string): Promise<MonthlyPerformanceRecord[]>;
  findDailySalesTrend(month: string, channel: string): Promise<DailySalesRecord[]>;
}
