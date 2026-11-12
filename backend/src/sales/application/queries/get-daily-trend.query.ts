import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { PERFORMANCE_REPOSITORY_PORT, PerformanceRepositoryPort } from '../ports/performance.repository.port';

@Injectable()
export class GetDailyTrendQuery {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY_PORT) private readonly performanceRepo: PerformanceRepositoryPort,
    private readonly redis: RedisService,
  ) {}

  async execute(month: string, channel = 'ALL', user?: AuthenticatedUser) {
    const role = (user?.role || '').toLowerCase();
    const userChan = (user?.channel || 'ALL').toUpperCase().trim();
    const isUnrestricted = !user || role === 'admin' || role === 'director' || role === 'bod' || userChan === 'ALL';

    const requestedChan = (channel || 'ALL').toUpperCase().trim();
    if (!isUnrestricted && requestedChan !== 'ALL' && requestedChan !== userChan) {
      throw new ForbiddenException('Không có quyền xem dữ liệu kênh khác!');
    }
    const effectiveChannel = isUnrestricted ? requestedChan : userChan;
    const cacheKey = `cache:daily:${month}:${effectiveChannel}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as Record<string, unknown>;
      }
    } catch {
      // Fall through to DB
    }

    const records = await this.performanceRepo.findDailySalesTrend(month, effectiveChannel);
    const result = { month, channel: effectiveChannel, records };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 600);
    } catch {
      // Non-fatal cache write failure
    }

    return result;
  }
}
