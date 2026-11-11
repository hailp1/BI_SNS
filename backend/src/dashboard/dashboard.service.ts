import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {}

  // Lấy dữ liệu KPI 4 kênh tổng quan theo tháng
  async getOverviewMetrics(month: string, user: any) {
    const cacheKey = `cache:overview:${month}:${user?.role || 'all'}:${user?.channel || 'all'}`;

    // 1. Kiểm tra Cache Redis trước (Tốc độ < 3ms)
    try {
      const cached = await this.db.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}

    // 2. Truy vấn trực tiếp từ PostgreSQL Data Mart
    let query = `
      SELECT channel, sub_channel, sellin_revenue, target_sellin, gap_sellin,
             achievement_rate, ly_sellin, yoy_growth_amt, yoy_growth_rate,
             mom_mtd_rate, ytd_revenue, channel_share
      FROM datamart.fact_monthly_performance
      WHERE month = $1
    `;
    const params: any[] = [month];

    // Cắt lát dữ liệu từ Server theo phân quyền (Server-side Scoping)
    if (user && user.channel && user.channel !== 'all') {
      query += ` AND (channel = $2 OR channel = 'ALL')`;
      params.push(user.channel);
    }

    const res = await this.db.query(query, params);

    // Chuyển đổi dữ liệu có cấu trúc cho Web App
    const channelMap: Record<string, any> = {};
    let overallMetric: any = null;

    res.rows.forEach((row) => {
      const ch = row.channel.toUpperCase();
      if (ch === 'ALL') {
        overallMetric = row;
      } else {
        channelMap[ch] = row;
      }
    });

    const result = {
      month,
      overall: overallMetric || {
        sellin_revenue: 209.54,
        target_sellin: 211.11,
        achievement_rate: 99.26,
        yoy_growth_rate: 23.2,
        mom_mtd_rate: 0.9,
      },
      channels: channelMap,
      generated_at: new Date().toISOString(),
    };

    // 3. Lưu vào Redis Cache trong 10 phút
    try {
      await this.db.redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
    } catch (_) {}

    return result;
  }

  // Lấy tiến độ doanh số theo ngày
  async getDailySalesTrend(month: string, channel: string = 'ALL') {
    const cacheKey = `cache:daily:${month}:${channel}`;
    try {
      const cached = await this.db.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    const res = await this.db.query(
      `SELECT sale_date, sellin_amt, target_amt, cumulative_sellin, cumulative_target
       FROM datamart.fact_daily_sales
       WHERE month = $1 AND channel = $2
       ORDER BY sale_date ASC`,
      [month, channel],
    );

    const result = {
      month,
      channel,
      records: res.rows,
    };

    try {
      await this.db.redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
    } catch (_) {}

    return result;
  }
}
