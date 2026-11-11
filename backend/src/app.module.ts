import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { DataPayloadModule } from './data-payload/data-payload.module';

@Module({
  imports: [DatabaseModule, AuditModule, EmailModule, AuthModule, DashboardModule, UsersModule, DataPayloadModule],
})
export class AppModule {}
