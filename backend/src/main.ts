import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('EnterpriseBootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Phân tích HttpOnly Cookie an toàn
  app.use(cookieParser());

  // 2. Cấu hình CORS chuẩn Zero-Trust (Whitelist Origins)
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8090')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true, // Bắt buộc cho phép truyền HttpOnly Cookie an toàn
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  // 3. Validation Pipe tự động làm sạch Input & chống Mass Assignment
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`  CJ FOODS ENTERPRISE API - INTERNATIONAL STANDARD     `);
  logger.log(`  Status: Running on port ${port}                      `);
  logger.log(`  Security: Bcrypt + JWT in HttpOnly Cookie + 2FA TOTP `);
  logger.log(`=======================================================`);
}
bootstrap();
