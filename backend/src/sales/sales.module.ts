import { Module } from '@nestjs/common';
import { PERFORMANCE_REPOSITORY_PORT } from './application/ports/performance.repository.port';
import { GetDailyTrendQuery } from './application/queries/get-daily-trend.query';
import { GetOverviewQuery } from './application/queries/get-overview.query';
import { DatamartService } from './infrastructure/persistence/datamart.service';
import { PrismaPerformanceRepository } from './infrastructure/persistence/performance.repository';
import { DashboardController } from './presentation/http/dashboard.controller';
import { SalesAppsController } from './presentation/http/sales-apps.controller';
import { SalesDatasetController } from './presentation/http/sales-dataset.controller';

@Module({
  controllers: [DashboardController, SalesDatasetController, SalesAppsController],
  providers: [
    { provide: PERFORMANCE_REPOSITORY_PORT, useClass: PrismaPerformanceRepository },
    DatamartService,
    GetOverviewQuery,
    GetDailyTrendQuery,
  ],
})
export class SalesModule {}
