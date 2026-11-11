import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailService } from '../../../shared/email/email.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { OtpDispatchResult, OtpServicePort } from '../../application/ports/otp.service.port';

@Injectable()
export class EmailOtpService implements OtpServicePort {
  private static readonly OTP_TTL_SECONDS = 300;

  constructor(
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  async generateAndSendEmailOtp(params: {
    userId: string;
    email: string;
    fullName: string;
    ip: string;
    userAgent: string;
  }): Promise<OtpDispatchResult> {
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    await this.redis.set(`otp:email:${params.userId}`, otpCode, EmailOtpService.OTP_TTL_SECONDS);

    const mailResult = await this.emailService.sendOtpEmail(
      params.email.trim(),
      params.fullName,
      otpCode,
      params.ip,
      params.userAgent,
    );

    return {
      maskedEmail: mailResult.maskedEmail,
      isLiveSent: mailResult.isLiveSent,
    };
  }

  async verifyEmailOtp(userId: string, code: string): Promise<boolean> {
    const cachedOtp = await this.redis.get(`otp:email:${userId}`);
    const cleanCode = (code || '').trim();
    if (!cachedOtp || !cleanCode || cachedOtp !== cleanCode) {
      return false;
    }
    await this.redis.del(`otp:email:${userId}`);
    return true;
  }
}
