import { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { PerformanceRepositoryPort } from '../ports/performance.repository.port';
import { GetOverviewQuery } from './get-overview.query';

describe('GetOverviewQuery', () => {
  let query: GetOverviewQuery;
  let performanceRepo: jest.Mocked<PerformanceRepositoryPort>;
  let redis: jest.Mocked<RedisService>;

  const sampleUser: AuthenticatedUser = {
    id: 'u-1',
    username: 'head_gt',
    fullName: 'Head GT',
    role: 'head_gt',
    channel: 'GT',
    scopeLevel: 'all',
    scopeValue: 'Toàn Quốc',
  };

  beforeEach(() => {
    performanceRepo = {
      findMonthlyPerformance: jest.fn(),
      findDailySalesTrend: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ping: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    query = new GetOverviewQuery(performanceRepo, redis);
  });

  it('returns cached overview when present in Redis', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ month: '2026-10', cached: true }));
    const result = await query.execute('2026-10', sampleUser);

    expect(result).toEqual({ month: '2026-10', cached: true });
    expect(performanceRepo.findMonthlyPerformance).not.toHaveBeenCalled();
  });

  it('queries repository scoped by user channel and populates Redis cache on miss', async () => {
    redis.get.mockResolvedValue(null);
    performanceRepo.findMonthlyPerformance.mockResolvedValue([
      {
        channel: 'ALL',
        sub_channel: 'ALL',
        sellin_revenue: 210,
        target_sellin: 200,
        gap_sellin: 10,
        achievement_rate: 105,
        ly_sellin: 180,
        yoy_growth_amt: 30,
        yoy_growth_rate: 16.6,
        mom_mtd_rate: 1.2,
        ytd_revenue: 2000,
        channel_share: 100,
      },
      {
        channel: 'GT',
        sub_channel: 'GT',
        sellin_revenue: 44.22,
        target_sellin: 47.68,
        gap_sellin: -3.46,
        achievement_rate: 92.74,
        ly_sellin: 40.55,
        yoy_growth_amt: 3.67,
        yoy_growth_rate: 9.05,
        mom_mtd_rate: 15.5,
        ytd_revenue: 489.74,
        channel_share: 21.1,
      },
      {
        channel: 'GT',
        sub_channel: 'ALL',
        sellin_revenue: 120,
        target_sellin: 110,
        gap_sellin: 10,
        achievement_rate: 109,
        ly_sellin: 100,
        yoy_growth_amt: 20,
        yoy_growth_rate: 20,
        mom_mtd_rate: 2.1,
        ytd_revenue: 1100,
        channel_share: 57,
      },
    ]);

    const result = (await query.execute('2026-10', sampleUser)) as {
      overall: { sellin_revenue: number };
      channels: Record<string, { sellin_revenue: number; sub_channel: string }>;
    };

    expect(performanceRepo.findMonthlyPerformance).toHaveBeenCalledWith('2026-10', 'GT');
    expect(result.overall.sellin_revenue).toBe(210);
    expect(result.channels.GT).toBeDefined();
    expect(result.channels.GT.sub_channel).toBe('ALL');
    expect(result.channels.GT.sellin_revenue).toBe(120);
    expect(redis.set).toHaveBeenCalledWith('cache:overview:2026-10:head_gt:GT', expect.any(String), 600);
  });
});
