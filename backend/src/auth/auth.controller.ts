import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { LoginDto, ResendEmailOtpDto, Verify2faDto, Verify2faLoginDto, VerifyEmailOtpDto } from './dto/auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly db: DatabaseService,
  ) {}

  private extractClientIp(req: Request): string {
    return String(req.ip || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1');
  }

  private setAuthCookie(res: Response, token: string): void {
    res.cookie('cj_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = this.extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.authService.login(body.username, body.password, ip, userAgent, body.network_mode);

    if (result.access_token) {
      this.setAuthCookie(res, result.access_token);
    }

    return {
      status: result.require2fa ? 'pending_2fa' : 'success',
      require2fa: result.require2fa,
      require_email_otp: result.require_email_otp,
      target_email: result.target_email,
      network_type: result.network_type,
      network_name: result.network_name,
      temp_token: result.temp_token,
      access_token: result.access_token,
      payload_key: result.require2fa ? undefined : process.env.PAYLOAD_KEY,
      user: result.user,
      message: result.message || 'Đăng nhập hệ thống thành công (Phiên làm việc bảo vệ bởi HttpOnly Cookie).',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['cj_auth_token'];
    if (token) {
      try {
        await this.db.redis.set(`blacklist:${token}`, '1', 'EX', 8 * 3600);
      } catch (_) {}
    }

    res.clearCookie('cj_auth_token', { path: '/' });

    return {
      status: 'success',
      message: 'Đã đăng xuất khỏi hệ thống an toàn.',
    };
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    const token = req.cookies?.['cj_auth_token'] || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return { authenticated: false };
    }

    const isBlacklisted = await this.db.redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return { authenticated: false };
    }

    try {
      const decoded: any = this.authService.verifyToken(token);
      return {
        authenticated: true,
        payload_key: process.env.PAYLOAD_KEY,
        user: decoded,
      };
    } catch (_) {
      return { authenticated: false };
    }
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  async setup2fa(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.authService.generate2faSecret(userId);
  }

  @Post('2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  async verify2fa(@Body() body: Verify2faDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.authService.verifyAndEnable2fa(userId, body.code);
  }

  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  async verify2faLogin(
    @Body() body: Verify2faLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.authService.verify2faLogin(body.temp_token, body.code, ip, userAgent);

    if (result.access_token) {
      this.setAuthCookie(res, result.access_token);
    }

    return result;
  }

  @Post('email-otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOtp(
    @Body() body: VerifyEmailOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.authService.verifyEmailOtp(body.temp_token, body.code, ip, userAgent);

    if (result.access_token) {
      this.setAuthCookie(res, result.access_token);
    }

    return result;
  }

  @Post('email-otp/resend')
  @HttpCode(HttpStatus.OK)
  async resendEmailOtp(@Body() body: ResendEmailOtpDto, @Req() req: Request) {
    const ip = this.extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');
    return this.authService.resendEmailOtp(body.temp_token, ip, userAgent);
  }
}
