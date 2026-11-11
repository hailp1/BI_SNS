import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './shared/audit/audit.module';
import { EmailModule } from './shared/email/email.module';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
import { SalesModule } from './sales/sales.module';
import { AppConfigModule } from './shared/config/config.module';
import { SharedDatabaseModule } from './shared/database/database.module';
import { AppLoggerModule } from './shared/logger/logger.module';
import { RedisModule } from './shared/redis/redis.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    SharedDatabaseModule,
    RedisModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 600 }]),
    AuditModule,
    EmailModule,
    IamModule,
    SalesModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
