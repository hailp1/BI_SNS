import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.newPassword'],
          censor: '[REDACTED]',
        },
        transport:
          process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
            ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
            : undefined,
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
