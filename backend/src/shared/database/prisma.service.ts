import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const explicitUrl = configService.get<string>('DATABASE_URL');
    const host = configService.get<string>('DATABASE_HOST', 'standard_postgres');
    const port = configService.get<number>('DATABASE_PORT', 5432);
    const user = configService.get<string>('DATABASE_USER', 'cj_sec_admin');
    const password = configService.get<string>('DATABASE_PASSWORD') ?? '';
    const dbName = configService.get<string>('DATABASE_NAME', 'cj_enterprise_db');

    const url =
      explicitUrl ||
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?schema=iam`;

    super({
      datasources: {
        db: { url },
      },
    });
  }

  async onModuleInit() {
    // Allow app startup even if DB connection is lazily established in tests;
    // in runtime, Terminus healthcheck verifies live connectivity.
    if (process.env.NODE_ENV !== 'test') {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL via Prisma ORM.');
      } catch (err) {
        this.logger.warn(`Initial Prisma connection warning: ${(err as Error).message}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
