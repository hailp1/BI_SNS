import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { Public } from '../shared/decorators/public.decorator';
import { PrismaService } from '../shared/database/prisma.service';
import { RedisService } from '../shared/redis/redis.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check PostgreSQL and Redis connectivity' })
  check() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { postgres: { status: 'up' } };
      },
      async (): Promise<HealthIndicatorResult> => {
        const pong = await this.redis.ping();
        return { redis: { status: pong === 'PONG' ? 'up' : 'down' } };
      },
    ]);
  }
}
