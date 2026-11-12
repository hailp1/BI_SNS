import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // Trust immediate reverse proxy (Nginx) so req.ip and secure cookie detection use X-Forwarded-* accurately.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());

  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:8090')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Defense-in-depth CSRF Origin verification for mutating cookie-authenticated requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      return next();
    }
    const originHeader = req.headers.origin;
    if (originHeader) {
      const reqHost = req.get('host');
      let sameHost = false;
      try {
        sameHost = Boolean(reqHost && new URL(originHeader).host === reqHost);
      } catch {
        sameHost = false;
      }
      if (!sameHost && !allowedOrigins.includes(originHeader)) {
        return res.status(403).json({
          type: 'https://httpstatuses.com/403',
          title: 'Forbidden',
          status: 403,
          detail: 'Cross-site request origin rejected by CSRF guard.',
        });
      }
    }
    return next();
  });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new ProblemDetailsFilter());

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const enableSwagger = configService.get<string>('ENABLE_SWAGGER') === 'true';
  if (nodeEnv !== 'production' || enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CJ Enterprise SNS API')
      .setDescription('CJ Foods Vietnam - Enterprise Sales Network System API (Clean Architecture)')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('cj_auth_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`CJ Foods Enterprise API running on port ${port} (Swagger: /api/docs, Health: /api/v1/health)`);
}
bootstrap();
