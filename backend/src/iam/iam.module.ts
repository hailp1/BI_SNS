import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { LoginUseCase } from './application/commands/login.command';
import { ManageUsersUseCase } from './application/commands/manage-users.command';
import { VerifyOtpUseCase } from './application/commands/verify-otp.command';
import { OTP_SERVICE_PORT } from './application/ports/otp.service.port';
import { TOKEN_SERVICE_PORT } from './application/ports/token.service.port';
import { USER_REPOSITORY_PORT } from './application/ports/user.repository.port';
import { GetUsersQuery } from './application/queries/get-users.query';
import { EmailOtpService } from './infrastructure/adapters/email-otp.service';
import { JwtTokenService } from './infrastructure/adapters/jwt-token.service';
import { NetworkContextService } from './infrastructure/adapters/network-context.service';
import { TotpService } from './infrastructure/adapters/totp.service';
import { PrismaUserRepository } from './infrastructure/persistence/user.repository';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthController } from './presentation/http/auth.controller';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    JwtStrategy,
    NetworkContextService,
    TotpService,
    { provide: USER_REPOSITORY_PORT, useClass: PrismaUserRepository },
    { provide: TOKEN_SERVICE_PORT, useClass: JwtTokenService },
    { provide: OTP_SERVICE_PORT, useClass: EmailOtpService },
    LoginUseCase,
    VerifyOtpUseCase,
    ManageUsersUseCase,
    GetUsersQuery,
  ],
  exports: [USER_REPOSITORY_PORT, TOKEN_SERVICE_PORT],
})
export class IamModule {}
