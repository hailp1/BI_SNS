import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const cleanPass = (pass || '').replace(/\s+/g, '');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const rejectUnauthorized = this.configService.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED') !== 'false';

    if (host && user && cleanPass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: cleanPass },
        tls: { rejectUnauthorized },
      });
      this.logger.log(`Đang kết nối SMTP Server: ${host}:${port} (SSL: ${secure})`);
      this.transporter.verify((error) => {
        if (error) {
          this.logger.error(`❌ Xác thực kết nối SMTP thất bại: ${error.message}`);
        } else {
          this.logger.log(`✅ Kết nối SMTP thành công! Sẵn sàng gửi thư OTP thực tế.`);
        }
      });
    } else {
      this.logger.warn('Chưa cấu hình SMTP thực tế trong môi trường. Sử dụng chế độ Smart Simulator cho Local Test.');
    }
  }

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '******@cjfoods.com.vn';
    const [name, domain] = email.split('@');
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const maskedName = name[0] + '*'.repeat(Math.max(name.length - 2, 3)) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  }

  async sendOtpEmail(toEmail: string, fullName: string, otpCode: string, ip: string, userAgent: string) {
    const masked = this.maskEmail(toEmail);
    const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15,23,42,0.08); border: 1px solid #e2e8f0; }
          .header { background: #004B91; padding: 26px 20px; text-align: center; border-bottom: 4px solid #E31837; }
          .header h1 { color: #ffffff; margin: 0; font-size: 19px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
          .header p { color: #bfdbfe; margin: 4px 0 0 0; font-size: 12px; font-weight: 500; }
          .body { padding: 32px 24px; color: #1e293b; }
          .greeting { font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
          .alert-box { background: #eff6ff; border-left: 4px solid #004B91; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-bottom: 24px; }
          .otp-box { text-align: center; margin: 28px 0; }
          .otp-digits { display: inline-block; font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #004B91; background: #f8fafc; border: 2px dashed #004B91; padding: 12px 28px; border-radius: 12px; }
          .expiry { margin-top: 8px; font-size: 12px; color: #dc2626; font-weight: 700; }
          .meta-table { width: 100%; margin-top: 24px; border-collapse: collapse; font-size: 11px; color: #64748b; background: #f8fafc; border-radius: 8px; }
          .meta-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .meta-table td:last-child { font-family: monospace; color: #334155; }
          .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CJ FOODS VIỆT NAM</h1>
            <p>Hệ Thống Mạng Lưới Bán Hàng (SNS - Sales Network System)</p>
          </div>
          <div class="body">
            <div class="greeting">Kính gửi <strong>${fullName}</strong>,</div>
            <div class="alert-box">
              Hệ thống phát hiện yêu cầu đăng nhập từ <strong>Mạng bên ngoài văn phòng</strong>. Theo tiêu chuẩn an ninh <strong>NIST Zero Trust & ISO 27001</strong>, vui lòng nhập mã xác thực OTP dưới đây để hoàn tất:
            </div>
            <div class="otp-box">
              <div class="otp-digits">${otpCode}</div>
              <div class="expiry">⏱️ Mã có hiệu lực trong vòng 05 phút</div>
            </div>
            <table class="meta-table">
              <tr><td>Thời gian yêu cầu:</td><td>${timeStr}</td></tr>
              <tr><td>Địa chỉ IP kết nối:</td><td>${ip}</td></tr>
              <tr><td>Thiết bị đăng nhập:</td><td>${userAgent.substring(0, 45)}...</td></tr>
            </table>
          </div>
          <div class="footer">
            Đây là email bảo mật tự động từ CJ Foods SNS.<br>
            Nếu bạn không thực hiện đăng nhập này, vui lòng thông báo ngay cho Bộ phận An ninh IT.
          </div>
        </div>
      </body>
      </html>
    `;

    let isLiveSent = false;
    if (this.transporter) {
      try {
        const fromAddress =
          process.env.SMTP_FROM || `"CJ Foods SNS Security" <${process.env.SMTP_USER || 'no-reply@cjfoods.com.vn'}>`;
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: '[CJ Foods SNS] Mã xác thực đăng nhập (OTP)',
          html: htmlContent,
        });
        isLiveSent = true;
        this.logger.log(`✅ Đã gửi email OTP thực tế tới: ${masked}`);
      } catch (err) {
        this.logger.error(`❌ Lỗi gửi mail SMTP tới ${masked}: ${err.message}`);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV EMAIL SIMULATOR] Mã OTP cho ${masked}: ${otpCode}`);
    } else {
      this.logger.warn(`SMTP chưa được cấu hình. Không thể gửi email OTP tới ${masked}.`);
    }

    return {
      success: true,
      toEmail,
      maskedEmail: masked,
      isLiveSent,
    };
  }
}
