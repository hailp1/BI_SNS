import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // Kiểm tra địa chỉ IP thuộc mạng công ty hay mạng ngoài (Zero Trust Conditional Access)
  async checkNetworkContext(ip: string, simulatedMode?: string): Promise<{ isCompany: boolean; networkName: string }> {
    if (simulatedMode === 'external') {
      return { isCompany: false, networkName: 'Mạng Ngoài Công Ty (External Internet / 4G)' };
    }
    if (simulatedMode === 'company') {
      return { isCompany: true, networkName: 'Mạng Nội Bộ Công Ty (LAN / Wi-Fi Trụ Sở)' };
    }

    const cleanIp = ip.replace(/^::ffff:/, '');

    try {
      const res = await this.db.query(
        `SELECT network_name 
         FROM iam.trusted_networks 
         WHERE is_active = TRUE AND $1::inet <<= cidr_or_ip::inet 
         LIMIT 1`,
        [cleanIp],
      );
      if (res.rows.length > 0) {
        return { isCompany: true, networkName: res.rows[0].network_name };
      }
    } catch (e) {
      this.logger.warn(`Lỗi kiểm tra CIDR cho ${cleanIp}: ${e.message}`);
    }

    return { isCompany: false, networkName: 'Mạng Ngoài Công Ty (Internet / Di Động)' };
  }

  async login(username: string, passwordPlain: string, ip: string, userAgent: string, networkMode?: string) {
    // 1. Tìm user trong database
    const res = await this.db.query(
      `SELECT id, username, email, password_hash, full_name, channel, role, scope_level, scope_value, 
              is_active, failed_attempts, locked_until, two_factor_enabled, two_factor_secret
       FROM iam.users WHERE LOWER(username) = LOWER($1)`,
      [username],
    );

    if (res.rows.length === 0) {
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

    const user = res.rows[0];

    // 2. Kiểm tra tài khoản có bị khóa không
    if (user.is_active === false || (user.locked_until && new Date(user.locked_until) > new Date())) {
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

    // 3. So khớp mật khẩu với Bcrypt Hash (Tuyệt đối KHÔNG có mật khẩu dự phòng / fallback)
    const isMatch = await bcrypt.compare(passwordPlain, user.password_hash);

    if (!isMatch) {
      const attempts = (user.failed_attempts || 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (attempts >= MAX_ATTEMPTS) {
        // Tự động khóa tài khoản 30 phút theo chuẩn NIST SP 800-63B
        await this.db.query(
          `UPDATE iam.users 
           SET failed_attempts = $1, is_active = FALSE, locked_until = NOW() + INTERVAL '30 minutes' 
           WHERE id = $2`,
          [attempts, user.id],
        );

        await this.audit.log({
          userId: user.id,
          username: user.username,
          action: 'ACCOUNT_LOCKED_BRUTE_FORCE',
          module: 'AUTH',
          ipAddress: ip,
          userAgent,
          status: 'FORBIDDEN',
          details: { attempts, locked_minutes: 30 },
        });

        throw new ForbiddenException('Tài khoản đã bị khóa 30 phút do nhập sai mật khẩu quá 5 lần liên tiếp!');
      } else {
        await this.db.query(`UPDATE iam.users SET failed_attempts = $1 WHERE id = $2`, [attempts, user.id]);

        await this.audit.log({
          userId: user.id,
          username: user.username,
          action: 'LOGIN_FAILED_WRONG_PASSWORD',
          module: 'AUTH',
          ipAddress: ip,
          userAgent,
          status: 'FAILED',
          details: { failed_attempts: attempts, remaining: MAX_ATTEMPTS - attempts },
        });

        throw new UnauthorizedException(
          `Tài khoản hoặc mật khẩu không chính xác. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử!`,
        );
      }
    }

    // 4. KIỂM TRA MẠNG THEO CHÍNH SÁCH ZERO TRUST (ADAPTIVE CONDITIONAL ACCESS)
    const netContext = await this.checkNetworkContext(ip, networkMode);

    // QUY TẮC:
    // - NẾU TRUY CẬP TỪ MẠNG NGOÀI: BẮT BUỘC XÁC THỰC 2 BƯỚC (EMAIL OTP) CHO TẤT CẢ USER!
    // - NẾU CÓ CỜ two_factor_enabled RIÊNG: LUÔN BẮT BUỘC 2FA.
    if (!netContext.isCompany || user.two_factor_enabled) {
      // Ràng buộc nghiêm ngặt: User bắt buộc phải có Email được cấu hình trong bảng iam.users
      if (!user.email || !user.email.includes('@')) {
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

      // 1. Sinh ngẫu nhiên mã OTP 6 số bảo mật
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Lưu mã OTP vào Redis Cache trong 5 phút (300 giây)
      await this.db.redis.set(`otp:email:${user.id}`, emailOtp, 'EX', 300);

      // 3. Gửi Email chứa mã OTP về đúng hộp thư riêng của nhân viên
      const targetEmail = user.email.trim();
      const mailResult = await this.emailService.sendOtpEmail(targetEmail, user.full_name, emailOtp, ip, userAgent);

      const tempToken = this.jwtService.sign(
        { sub: user.id, username: user.username, emailPending: true, networkName: netContext.networkName },
        { expiresIn: '5m' },
      );

      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: 'EMAIL_OTP_DISPATCHED',
        module: 'AUTH',
        ipAddress: ip,
        userAgent,
        status: 'PENDING',
        details: { to: mailResult.maskedEmail, network: netContext.networkName, is_company: netContext.isCompany },
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

    // NẾU LÀ MẠNG NỘI BỘ CÔNG TY (INTRANET / LAN / WI-FI VĂN PHÒNG): MIỄN XÁC THỰC 2 BƯỚC (2FA BYPASSED)!
    // 5. Đăng nhập thành công: Reset số lần sai về 0, cập nhật last_login
    await this.db.query(
      `UPDATE iam.users 
       SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1 
       WHERE id = $2`,
      [ip, user.id],
    );

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUCCESS_COMPANY_NETWORK',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { network: netContext.networkName, '2fa_bypassed': true, role: user.role, scope: user.scope_value },
    });

    // 6. Phát hành JSON Web Token (JWT RFC 7519)
    const payload = {
      sub: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      channel: user.channel,
      scopeLevel: user.scope_level,
      scopeValue: user.scope_value,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    return {
      require2fa: false,
      network_type: 'COMPANY',
      network_name: netContext.networkName,
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        channel: user.channel,
        scopeLevel: user.scope_level,
        scopeValue: user.scope_value,
      },
    };
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token);
  }
  async generate2faSecret(identifier: string) {
    const res = await this.db.query(
      `SELECT id, username, email FROM iam.users WHERE id::text = $1 OR LOWER(username) = LOWER($1)`,
      [identifier],
    );
    if (res.rows.length === 0) throw new BadRequestException('User not found');

    const user = res.rows[0];
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.username, 'CJ Foods SNS', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    await this.db.query(`UPDATE iam.users SET two_factor_secret = $1 WHERE id = $2`, [secret, user.id]);

    return {
      username: user.username,
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  // Xác minh và kích hoạt 2FA
  async verifyAndEnable2fa(userId: string, code: string) {
    const res = await this.db.query(`SELECT two_factor_secret FROM iam.users WHERE id = $1`, [userId]);
    if (res.rows.length === 0 || !res.rows[0].two_factor_secret) {
      throw new BadRequestException('Chưa khởi tạo cấu hình 2FA');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: res.rows[0].two_factor_secret,
    });

    if (!isValid) {
      throw new BadRequestException('Mã xác thực 2FA không chính xác');
    }

    await this.db.query(`UPDATE iam.users SET two_factor_enabled = TRUE WHERE id = $1`, [userId]);
    return { success: true, message: 'Đã kích hoạt xác thực 2 bước 2FA thành công!' };
  }

  // Xác minh OTP để hoàn tất đăng nhập bước 2 (2FA Login)
  async verify2faLogin(tempToken: string, code: string, ip: string, userAgent: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(tempToken);
    } catch (_) {
      throw new UnauthorizedException('Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!decoded || !decoded.is2FaPending) {
      throw new UnauthorizedException('Token xác thực 2FA không hợp lệ.');
    }

    const res = await this.db.query(
      `SELECT id, username, full_name, channel, role, scope_level, scope_value, two_factor_secret 
       FROM iam.users WHERE id = $1 AND is_active = TRUE`,
      [decoded.sub],
    );

    if (res.rows.length === 0) throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
    const user = res.rows[0];

    if (!user.two_factor_secret) {
      throw new BadRequestException('Tài khoản chưa được thiết lập cấu hình 2FA!');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret,
    });

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
      details: { role: user.role, scope: user.scope_value },
    });

    const payload = {
      sub: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      channel: user.channel,
      scopeLevel: user.scope_level,
      scopeValue: user.scope_value,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    return {
      status: 'success',
      access_token: accessToken,
      payload_key: process.env.PAYLOAD_KEY,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        channel: user.channel,
        scopeLevel: user.scope_level,
        scopeValue: user.scope_value,
      },
    };
  }

  // Xác thực mã OTP gửi về Email của nhân viên
  async verifyEmailOtp(tempToken: string, code: string, ip: string, userAgent: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(tempToken);
    } catch (_) {
      throw new UnauthorizedException('Phiên xác thực Email OTP đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!decoded || !decoded.emailPending) {
      throw new UnauthorizedException('Token xác thực Email không hợp lệ.');
    }

    const userId = decoded.sub;
    const cachedOtp = await this.db.redis.get(`otp:email:${userId}`);

    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      throw new BadRequestException('Vui lòng nhập mã OTP 6 số được gửi về email!');
    }

    const isMatched = cachedOtp && cachedOtp === cleanCode;

    const res = await this.db.query(
      `SELECT id, username, full_name, email, channel, role, scope_level, scope_value 
       FROM iam.users WHERE id = $1 AND is_active = TRUE`,
      [userId],
    );

    if (res.rows.length === 0) throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
    const user = res.rows[0];

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

    // Xóa mã OTP khỏi Redis sau khi dùng thành công
    await this.db.redis.del(`otp:email:${userId}`);

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: 'EMAIL_OTP_VERIFICATION_SUCCESS',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { email: user.email, role: user.role, scope: user.scope_value },
    });

    const payload = {
      sub: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      channel: user.channel,
      scopeLevel: user.scope_level,
      scopeValue: user.scope_value,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    return {
      status: 'success',
      access_token: accessToken,
      payload_key: process.env.PAYLOAD_KEY,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        channel: user.channel,
        scopeLevel: user.scope_level,
        scopeValue: user.scope_value,
      },
    };
  }

  // Gửi lại mã OTP qua Email
  async resendEmailOtp(tempToken: string, ip: string, userAgent: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(tempToken);
    } catch (_) {
      throw new UnauthorizedException('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const userId = decoded.sub;
    const res = await this.db.query(
      `SELECT id, username, full_name, email FROM iam.users WHERE id = $1 AND is_active = TRUE`,
      [userId],
    );
    if (res.rows.length === 0) throw new BadRequestException('User not found');
    const user = res.rows[0];

    if (!user.email || !user.email.includes('@')) {
      throw new BadRequestException('Tài khoản chưa được thiết lập Email nhận OTP!');
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.db.redis.set(`otp:email:${user.id}`, newOtp, 'EX', 300);

    const mailResult = await this.emailService.sendOtpEmail(user.email.trim(), user.full_name, newOtp, ip, userAgent);

    return {
      success: true,
      target_email: mailResult.maskedEmail,
      message: `Đã gửi lại mã OTP mới tới: ${mailResult.maskedEmail}`,
    };
  }
}
