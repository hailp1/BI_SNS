import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../../shared/audit/audit.service';
import { UserEntity } from '../../domain/model/user.entity';
import { TotpService } from '../../infrastructure/adapters/totp.service';
import { OtpServicePort } from '../ports/otp.service.port';
import { TokenServicePort } from '../ports/token.service.port';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { VerifyOtpUseCase } from './verify-otp.command';

function makeUser(secret: string | null = 'BASE32SECRET') {
  return new UserEntity({
    id: 'u-1',
    username: 'admin',
    email: 'admin@cjfoods.com.vn',
    passwordHash: 'hash',
    fullName: 'Admin',
    channel: 'all',
    role: 'admin',
    scopeLevel: 'all',
    scopeValue: 'Toàn Quốc',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    twoFactorSecret: secret,
    twoFactorEnabled: true,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('VerifyOtpUseCase', () => {
  let useCase: VerifyOtpUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let tokenService: jest.Mocked<TokenServicePort>;
  let otpService: jest.Mocked<OtpServicePort>;
  let totpService: jest.Mocked<TotpService>;

  beforeEach(() => {
    userRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByIdentifier: jest.fn(),
      findEmailConflict: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      bulkUpsert: jest.fn(),
    };
    tokenService = {
      signAccessToken: jest.fn().mockReturnValue('final-jwt'),
      signTempToken: jest.fn(),
      verify: jest.fn(),
      blacklist: jest.fn(),
      isBlacklisted: jest.fn(),
    };
    otpService = {
      generateAndSendEmailOtp: jest.fn().mockResolvedValue({ maskedEmail: 'a***n@cjfoods.com.vn', isLiveSent: true }),
      verifyEmailOtp: jest.fn(),
    };
    totpService = {
      generateSecretAndQr: jest.fn(),
      verifyCode: jest.fn(),
    } as unknown as jest.Mocked<TotpService>;

    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const configService = { get: jest.fn().mockReturnValue('payload-key') } as unknown as ConfigService;

    useCase = new VerifyOtpUseCase(userRepo, tokenService, otpService, totpService, audit, configService);
  });

  it('rejects hardcoded 123456 bypass code when TOTP verification returns false', async () => {
    tokenService.verify.mockReturnValue({ sub: 'u-1', username: 'admin', is2FaPending: true });
    userRepo.findById.mockResolvedValue(makeUser('REAL_SECRET'));
    totpService.verifyCode.mockReturnValue(false);

    await expect(useCase.verify2faLogin('temp', '123456', '127.0.0.1', 'jest')).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException if user has no twoFactorSecret', async () => {
    tokenService.verify.mockReturnValue({ sub: 'u-1', username: 'admin', is2FaPending: true });
    userRepo.findById.mockResolvedValue(makeUser(null));

    await expect(useCase.verify2faLogin('temp', '654321', '127.0.0.1', 'jest')).rejects.toThrow(BadRequestException);
  });

  it('issues JWT when TOTP code is valid', async () => {
    tokenService.verify.mockReturnValue({ sub: 'u-1', username: 'admin', is2FaPending: true });
    userRepo.findById.mockResolvedValue(makeUser('REAL_SECRET'));
    totpService.verifyCode.mockReturnValue(true);

    const res = await useCase.verify2faLogin('temp', '654321', '127.0.0.1', 'jest');
    expect(res.status).toBe('success');
    expect(res.access_token).toBe('final-jwt');
  });

  it('verifies Email OTP and issues JWT', async () => {
    tokenService.verify.mockReturnValue({ sub: 'u-1', username: 'admin', emailPending: true });
    userRepo.findById.mockResolvedValue(makeUser());
    otpService.verifyEmailOtp.mockResolvedValue(true);

    const res = await useCase.verifyEmailOtp('temp', '888999', '127.0.0.1', 'jest');
    expect(res.status).toBe('success');
    expect(res.access_token).toBe('final-jwt');
  });
});
