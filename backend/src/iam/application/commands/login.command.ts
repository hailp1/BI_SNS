import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../../shared/audit/audit.service';
import { NetworkContextService } from '../../infrastructure/adapters/network-context.service';
import { OTP_SERVICE_PORT, OtpServicePort } from '../ports/otp.service.port';
import { TOKEN_SERVICE_PORT, TokenServicePort } from '../ports/token.service.port';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly userRepo: UserRepositoryPort,
    @Inject(TOKEN_SERVICE_PORT) private readonly tokenService: TokenServicePort,
    @Inject(OTP_SERVICE_PORT) private readonly otpService: OtpServicePort,
    private readonly networkContext: NetworkContextService,
    private readonly audit: AuditService,
  ) {}

  async execute(params: {
    username: string;
    passwordPlain: string;
    ip: string;
    userAgent: string;
    networkMode?: string;
  }) {
    const { username, passwordPlain, ip, userAgent, networkMode } = params;
    const user = await this.userRepo.findByUsername(username);

    if (!user) {
      await this.audit.log({
        username,
        action: 'LOGIN_FAILED_NOT_FOUND',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: { reason: 'User does not exist' },
      });
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (user.isLocked()) {
      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_BLOCKED_LOCKED',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'FORBIDDEN',
        details: { reason: 'Account is locked' },
      });
      throw new ForbiddenException(
        'Tài khoản đã bị tạm khóa do vi phạm chính sách bảo mật. Vui lòng liên hệ IT Quản trị!',
      );
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      const outcome = user.recordFailedLogin();
      await this.userRepo.updateById(user.id, {
        failedAttempts: user.failedAttempts,
        isActive: user.isActive,
        lockedUntil: user.lockedUntil,
      });

      if (outcome.lockedNow) {
        await this.audit.log({
          userId: user.id,
          username: user.username,
          action: 'ACCOUNT_LOCKED_BRUTE_FORCE',
          module: 'AUTH',
          ipAddress: ip,
          userAgent,
          status: 'FORBIDDEN',
          details: { attempts: user.failedAttempts, locked_minutes: 30 },
        });
        throw new ForbiddenException('Tài khoản đã bị khóa 30 phút do nhập sai mật khẩu quá 5 lần liên tiếp!');
      }

      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED_WRONG_PASSWORD',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: { failed_attempts: user.failedAttempts, remaining: outcome.remainingAttempts },
      });
      throw new UnauthorizedException(
        `Tài khoản hoặc mật khẩu không chính xác. Bạn còn ${outcome.remainingAttempts} lần thử!`,
      );
    }

    const netContext = await this.networkContext.checkNetworkContext(ip, networkMode);

    if (!netContext.isCompany || user.twoFactorEnabled) {
      if (!user.hasValidEmail() || !user.email) {
        await this.audit.log({
          userId: user.id,
          username: user.username,
          action: 'LOGIN_FAILED_NO_EMAIL',
          module: 'AUTH',
          ipAddress: ip,
          userAgent,
          status: 'FAILED',
          details: { reason: 'User has no bound email for OTP verification' },
        });
        throw new BadRequestException(
          'Tài khoản của bạn chưa được thiết lập địa chỉ Email nhận mã xác thực OTP. Vui lòng liên hệ Quản trị viên IT để bổ sung Email hồ sơ nhân viên!',
        );
      }

      const mailResult = await this.otpService.generateAndSendEmailOtp({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        ip,
        userAgent,
      });

      const tempToken = this.tokenService.signTempToken(
        { sub: user.id, username: user.username, emailPending: true, networkName: netContext.networkName },
        '5m',
      );

      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: 'EMAIL_OTP_DISPATCHED',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'PENDING',
        details: {
          to: mailResult.maskedEmail,
          network: netContext.networkName,
          is_company: netContext.isCompany,
        },
      });

      return {
        require2fa: true,
        require_email_otp: true,
        network_type: netContext.isCompany ? 'COMPANY' : 'EXTERNAL',
        network_name: netContext.networkName,
        temp_token: tempToken,
        target_email: mailResult.maskedEmail,
        message: `Mã xác thực OTP 6 số đã được gửi tới hòm thư cá nhân: ${mailResult.maskedEmail}`,
      };
    }

    user.recordSuccessfulLogin(ip);
    await this.userRepo.updateById(user.id, {
      failedAttempts: user.failedAttempts,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt ?? new Date(),
      lastLoginIp: ip,
    });

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUCCESS_COMPANY_NETWORK',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: {
        network: netContext.networkName,
        '2fa_bypassed': true,
        role: user.role,
        scope: user.scopeValue,
      },
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      channel: user.channel,
      scopeLevel: user.scopeLevel,
      scopeValue: user.scopeValue,
    });

    return {
      require2fa: false,
      network_type: 'COMPANY',
      network_name: netContext.networkName,
      access_token: accessToken,
      user: user.toPublicProfile(),
    };
  }
}
