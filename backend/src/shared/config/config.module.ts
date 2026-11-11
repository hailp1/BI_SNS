import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfigValidationSchema } from './app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validationSchema: appConfigValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class AppConfigModule {}
