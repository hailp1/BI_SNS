import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public pool: Pool;
  public redis: Redis;

  onModuleInit() {
    const dbPassword = process.env.DATABASE_PASSWORD;
    const redisPassword = process.env.REDIS_PASSWORD;
    if (!dbPassword || !redisPassword) {
      throw new Error('DATABASE_PASSWORD and REDIS_PASSWORD environment variables are required.');
    }

    // 1. PostgreSQL Connection Pool
    this.pool = new Pool({
      host: process.env.DATABASE_HOST || 'standard_postgres',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      user: process.env.DATABASE_USER || 'cj_sec_admin',
      password: dbPassword,
      database: process.env.DATABASE_NAME || 'cj_enterprise_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('PostgreSQL unexpected error on idle client', err);
    });

    // 2. Redis Client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'standard_redis',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: redisPassword,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis In-Memory Cache successfully.');
    });

    this.redis.on('error', (err) => {
      this.logger.warn('Redis Connection Warning: ' + err.message);
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      this.logger.warn(`Slow query (${duration}ms): ${text}`);
    }
    return res;
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.redis.disconnect();
  }
}
