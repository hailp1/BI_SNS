import { Module } from '@nestjs/common';
import { PERFORMANCE_REPOSITORY_PORT } from './application/ports/performance.repository.port';
import { GetDailyTrendQuery } from './application/queries/get-daily-trend.query';
import { GetOverviewQuery } from './application/queries/get-overview.query';
import { PrismaPerformanceRepository } from './infrastructure/persistence/performance.repository';
import { DashboardController } from './presentation/http/dashboard.controller';
import { DataPayloadController } from './presentation/http/data-payload.controller';

@Module({
  controllers: [DashboardController, DataPayloadController],
  providers: [
    { provide: PERFORMANCE_REPOSITORY_PORT, useClass: PrismaPerformanceRepository },
    GetOverviewQuery,
    GetDailyTrendQuery,
  ],
})
export class SalesModule {}
