import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  DailySalesRecord,
  MonthlyPerformanceRecord,
  PerformanceRepositoryPort,
} from '../../application/ports/performance.repository.port';

@Injectable()
export class PrismaPerformanceRepository implements PerformanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findMonthlyPerformance(month: string, channel?: string): Promise<MonthlyPerformanceRecord[]> {
    const where = channel && channel !== 'all' ? { month, OR: [{ channel }, { channel: 'ALL' }] } : { month };

    const rows = await this.prisma.factMonthlyPerformance.findMany({
      where,
      orderBy: [{ channel: 'asc' }, { subChannel: 'asc' }],
    });

    return rows.map((r) => ({
      channel: r.channel,
      sub_channel: r.subChannel,
      sellin_revenue: Number(r.sellinRevenue),
      target_sellin: Number(r.targetSellin),
      gap_sellin: Number(r.gapSellin),
      achievement_rate: Number(r.achievementRate),
      ly_sellin: Number(r.lySellin),
      yoy_growth_amt: Number(r.yoyGrowthAmt),
      yoy_growth_rate: Number(r.yoyGrowthRate),
      mom_mtd_rate: Number(r.momMtdRate),
      ytd_revenue: Number(r.ytdRevenue),
      channel_share: Number(r.channelShare),
    }));
  }

  async findDailySalesTrend(month: string, channel: string): Promise<DailySalesRecord[]> {
    const rows = await this.prisma.factDailySales.findMany({
      where: { month, channel },
      orderBy: { saleDate: 'asc' },
    });

    return rows.map((r) => ({
      sale_date: r.saleDate,
      sellin_amt: Number(r.sellinAmt),
      target_amt: Number(r.targetAmt),
      cumulative_sellin: Number(r.cumulativeSellin),
      cumulative_target: Number(r.cumulativeTarget),
    }));
  }
}
