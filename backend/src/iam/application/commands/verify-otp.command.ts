import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../../../shared/audit/audit.service';
import { TempTokenPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { TotpService } from '../../infrastructure/adapters/totp.service';
import { OTP_SERVICE_PORT, OtpServicePort } from '../ports/otp.service.port';
import { TOKEN_SERVICE_PORT, TokenServicePort } from '../ports/token.service.port';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly userRepo: UserRepositoryPort,
    @Inject(TOKEN_SERVICE_PORT) private readonly tokenService: TokenServicePort,
    @Inject(OTP_SERVICE_PORT) private readonly otpService: OtpServicePort,
    private readonly totpService: TotpService,
    private readonly audit: AuditService,
  ) {}

  async generate2faSecret(identifier: string) {
    const user = await this.userRepo.findByIdentifier(identifier);
    if (!user) throw new BadRequestException('User not found');

    const { secret, qrCodeDataUrl, otpauthUrl } = await this.totpService.generateSecretAndQr(user.username);
    await this.userRepo.updateById(user.id, { twoFactorSecret: secret });

    return {
      username: user.username,
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  async verifyAndEnable2fa(userId: string, code: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Chưa khởi tạo cấu hình 2FA');
    }

    const isValid = this.totpService.verifyCode(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Mã xác thực 2FA không chính xác');
    }

    await this.userRepo.updateById(user.id, { twoFactorEnabled: true });
    return { success: true, message: 'Đã kích hoạt xác thực 2 bước 2FA thành công!' };
  }

  async verify2faLogin(tempToken: string, code: string, ip: string, userAgent: string) {
    let decoded: TempTokenPayload;
    try {
      decoded = this.tokenService.verify<TempTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!decoded || !decoded.is2FaPending) {
      throw new UnauthorizedException('Token xác thực 2FA không hợp lệ.');
    }

    const user = await this.userRepo.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Tài khoản chưa được thiết lập cấu hình 2FA!');
    }

    const isValid = this.totpService.verifyCode(code, user.twoFactorSecret);
    if (!isValid) {
      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: '2FA_VERIFICATION_FAILED',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: { reason: 'Invalid OTP code' },
      });
      throw new UnauthorizedException('Mã xác thực OTP 6 số không chính xác!');
    }

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: '2FA_VERIFICATION_SUCCESS',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { role: user.role, scope: user.scopeValue },
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
      status: 'success',
      access_token: accessToken,
      user: user.toPublicProfile(),
    };
  }

  async verifyEmailOtp(tempToken: string, code: string, ip: string, userAgent: string) {
    let decoded: TempTokenPayload;
    try {
      decoded = this.tokenService.verify<TempTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('Phiên xác thực Email OTP đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!decoded || !decoded.emailPending) {
      throw new UnauthorizedException('Token xác thực Email không hợp lệ.');
    }

    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      throw new BadRequestException('Vui lòng nhập mã OTP 6 số được gửi về email!');
    }

    const user = await this.userRepo.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
    }

    const isMatched = await this.otpService.verifyEmailOtp(user.id, cleanCode);
    if (!isMatched) {
      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: 'EMAIL_OTP_VERIFICATION_FAILED',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: { reason: 'Wrong OTP code' },
      });
      throw new UnauthorizedException('Mã xác thực OTP gửi qua Email không chính xác!');
    }

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: 'EMAIL_OTP_VERIFICATION_SUCCESS',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { email: user.email, role: user.role, scope: user.scopeValue },
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
      status: 'success',
      access_token: accessToken,
      user: user.toPublicProfile(),
    };
  }

  async resendEmailOtp(tempToken: string, ip: string, userAgent: string) {
    let decoded: TempTokenPayload;
    try {
      decoded = this.tokenService.verify<TempTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const user = await this.userRepo.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new BadRequestException('User not found');
    }

    if (!user.hasValidEmail() || !user.email) {
      throw new BadRequestException('Tài khoản chưa được thiết lập Email nhận OTP!');
    }

    const mailResult = await this.otpService.generateAndSendEmailOtp({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      ip,
      userAgent,
    });

    return {
      success: true,
      target_email: mailResult.maskedEmail,
      message: `Đã gửi lại mã OTP mới tới: ${mailResult.maskedEmail}`,
    };
  }
}
