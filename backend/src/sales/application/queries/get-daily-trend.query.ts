import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis/redis.service';
import { PERFORMANCE_REPOSITORY_PORT, PerformanceRepositoryPort } from '../ports/performance.repository.port';

@Injectable()
export class GetDailyTrendQuery {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY_PORT) private readonly performanceRepo: PerformanceRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(month: string, channel = 'ALL') {
    const cacheKey = `cache:daily:${month}:${channel}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as Record<string, unknown>;
      }
    } catch {
      // Fall through to DB
    }

    const records = await this.performanceRepo.findDailySalesTrend(month, channel);
    const result = { month, channel, records };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 600);
    } catch {
      // Non-fatal cache write failure
    }

    return result;
  }
}
