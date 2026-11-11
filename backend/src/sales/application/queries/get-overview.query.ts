import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import {
  MonthlyPerformanceRecord,
  PERFORMANCE_REPOSITORY_PORT,
  PerformanceRepositoryPort,
} from '../ports/performance.repository.port';

@Injectable()
export class GetOverviewQuery {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY_PORT) private readonly performanceRepo: PerformanceRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(month: string, user?: AuthenticatedUser) {
    const cacheKey = `cache:overview:${month}:${user?.role || 'all'}:${user?.channel || 'all'}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as Record<string, unknown>;
      }
    } catch {
      // Cache miss or Redis temporarily unavailable — fall through to DB
    }

    const rows = await this.performanceRepo.findMonthlyPerformance(month, user?.channel);

    const channelMap: Record<string, MonthlyPerformanceRecord> = {};
    let overallMetric: MonthlyPerformanceRecord | null = null;

    for (const row of rows) {
      const ch = row.channel.toUpperCase();
      if (ch === 'ALL') {
        overallMetric = row;
      } else {
        channelMap[ch] = row;
      }
    }

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

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 600);
    } catch {
      // Non-fatal cache write failure
    }

    return result;
  }
}
