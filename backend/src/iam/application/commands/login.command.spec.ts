import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../../shared/audit/audit.service';
import { NetworkContextService } from '../../infrastructure/adapters/network-context.service';
import { UserEntity, UserProps } from '../../domain/model/user.entity';
import { OtpServicePort } from '../ports/otp.service.port';
import { TokenServicePort } from '../ports/token.service.port';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { LoginUseCase } from './login.command';

jest.mock('bcrypt');

function buildUser(overrides: Partial<UserProps> = {}): UserEntity {
  return new UserEntity({
    id: 'u-1',
    username: 'admin',
    email: 'admin@cjfoods.com.vn',
    passwordHash: 'hashed-pw',
    fullName: 'Administrator',
    channel: 'all',
    role: 'admin',
    scopeLevel: 'all',
    scopeValue: 'Toàn Quốc',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let tokenService: jest.Mocked<TokenServicePort>;
  let otpService: jest.Mocked<OtpServicePort>;
  let networkContext: jest.Mocked<NetworkContextService>;
  let audit: jest.Mocked<AuditService>;
  let configService: jest.Mocked<ConfigService>;

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
      signAccessToken: jest.fn().mockReturnValue('jwt-access-token'),
      signTempToken: jest.fn().mockReturnValue('jwt-temp-token'),
      verify: jest.fn(),
      blacklist: jest.fn(),
      isBlacklisted: jest.fn(),
    };
    otpService = {
      generateAndSendEmailOtp: jest.fn().mockResolvedValue({ maskedEmail: 'a***n@cjfoods.com.vn', isLiveSent: false }),
      verifyEmailOtp: jest.fn(),
    };
    networkContext = {
      checkNetworkContext: jest.fn().mockResolvedValue({ isCompany: true, networkName: 'LAN' }),
    } as unknown as jest.Mocked<NetworkContextService>;
    audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<AuditService>;
    configService = { get: jest.fn().mockReturnValue('payload-key-hex') } as unknown as jest.Mocked<ConfigService>;

    useCase = new LoginUseCase(userRepo, tokenService, otpService, networkContext, audit, configService);
  });

  it('issues JWT on valid credentials from company network', async () => {
    userRepo.findByUsername.mockResolvedValue(buildUser());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await useCase.execute({
      username: 'admin',
      passwordPlain: 'CjFoods@2026!',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(res.require2fa).toBe(false);
    expect(res.access_token).toBe('jwt-access-token');
    expect(res.payload_key).toBe('payload-key-hex');
    expect(userRepo.updateById).toHaveBeenCalledWith('u-1', expect.objectContaining({ failedAttempts: 0 }));
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    userRepo.findByUsername.mockResolvedValue(null);

    await expect(
      useCase.execute({ username: 'unknown', passwordPlain: 'pw', ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when account is locked', async () => {
    userRepo.findByUsername.mockResolvedValue(buildUser({ isActive: false }));

    await expect(
      useCase.execute({ username: 'admin', passwordPlain: 'pw', ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('locks account on 5th failed password attempt', async () => {
    userRepo.findByUsername.mockResolvedValue(buildUser({ failedAttempts: 4 }));
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ username: 'admin', passwordPlain: 'wrong', ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.updateById).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ isActive: false, failedAttempts: 5 }),
    );
  });

  it('requires Email OTP when accessing from external network without demo_otp leak', async () => {
    userRepo.findByUsername.mockResolvedValue(buildUser());
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    networkContext.checkNetworkContext.mockResolvedValue({ isCompany: false, networkName: '4G' });

    const res = await useCase.execute({
      username: 'admin',
      passwordPlain: 'CjFoods@2026!',
      ip: '203.0.113.10',
      userAgent: 'jest',
    });

    expect(res.require2fa).toBe(true);
    expect(res.require_email_otp).toBe(true);
    expect(res.temp_token).toBe('jwt-temp-token');
    expect((res as Record<string, unknown>).demo_otp).toBeUndefined();
  });

  it('throws BadRequestException on external network if user has no email', async () => {
    userRepo.findByUsername.mockResolvedValue(buildUser({ email: null }));
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    networkContext.checkNetworkContext.mockResolvedValue({ isCompany: false, networkName: '4G' });

    await expect(
      useCase.execute({ username: 'admin', passwordPlain: 'pw', ip: '203.0.113.10', userAgent: 'jest' }),
    ).rejects.toThrow(BadRequestException);
  });
});
