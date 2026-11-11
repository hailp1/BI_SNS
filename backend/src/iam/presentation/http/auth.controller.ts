import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthenticatedUser, JwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { extractClientIp } from '../../../shared/utils/request.util';
import { LoginUseCase } from '../../application/commands/login.command';
import { VerifyOtpUseCase } from '../../application/commands/verify-otp.command';
import { TOKEN_SERVICE_PORT, TokenServicePort } from '../../application/ports/token.service.port';
import { LoginDto, ResendEmailOtpDto, Verify2faDto, Verify2faLoginDto, VerifyEmailOtpDto } from '../dtos/auth.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    @Inject(TOKEN_SERVICE_PORT) private readonly tokenService: TokenServicePort,
    private readonly configService: ConfigService,
  ) {}

  private setAuthCookie(res: Response, token: string): void {
    res.cookie('cj_auth_token', token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with password and Zero-Trust network policy' })
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.loginUseCase.execute({
      username: body.username,
      passwordPlain: body.password,
      ip,
      userAgent,
      networkMode: body.network_mode,
    });

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
      payload_key: result.require2fa ? undefined : result.payload_key,
      user: result.user,
      message: result.message || 'Đăng nhập hệ thống thành công (Phiên làm việc bảo vệ bởi HttpOnly Cookie).',
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke JWT in Redis blacklist and clear HttpOnly cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['cj_auth_token'];
    if (token) {
      try {
        await this.tokenService.blacklist(token, 8 * 3600);
      } catch {
        // Ignore Redis disconnect during logout cleanup
      }
    }

    res.clearCookie('cj_auth_token', { path: '/' });

    return {
      status: 'success',
      message: 'Đã đăng xuất khỏi hệ thống an toàn.',
    };
  }

  @Get('me')
  @Public()
  @ApiOperation({ summary: 'Validate current session from HttpOnly cookie or Bearer header' })
  async getProfile(@Req() req: Request) {
    const token = req.cookies?.['cj_auth_token'] || (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) {
      return { authenticated: false };
    }

    const isBlacklisted = await this.tokenService.isBlacklisted(token);
    if (isBlacklisted) {
      return { authenticated: false };
    }

    try {
      const decoded = this.tokenService.verify<JwtPayload>(token);
      return {
        authenticated: true,
        payload_key: this.configService.get<string>('PAYLOAD_KEY'),
        user: decoded,
      };
    } catch {
      return { authenticated: false };
    }
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('cj_auth_token')
  @ApiOperation({ summary: 'Generate TOTP 2FA secret and QR code for current user' })
  async setup2fa(@CurrentUser() user: AuthenticatedUser) {
    return this.verifyOtpUseCase.generate2faSecret(user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('cj_auth_token')
  @ApiOperation({ summary: 'Verify TOTP code and enable 2FA for current user' })
  async verify2fa(@Body() body: Verify2faDto, @CurrentUser() user: AuthenticatedUser) {
    return this.verifyOtpUseCase.verifyAndEnable2fa(user.id, body.code);
  }

  @Post('2fa/verify-login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete step-2 login using TOTP code' })
  async verify2faLogin(
    @Body() body: Verify2faLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.verifyOtpUseCase.verify2faLogin(body.temp_token, body.code, ip, userAgent);

    if (result.access_token) {
      this.setAuthCookie(res, result.access_token);
    }

    return result;
  }

  @Post('email-otp/verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete step-2 login using Email OTP' })
  async verifyEmailOtp(
    @Body() body: VerifyEmailOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');

    const result = await this.verifyOtpUseCase.verifyEmailOtp(body.temp_token, body.code, ip, userAgent);

    if (result.access_token) {
      this.setAuthCookie(res, result.access_token);
    }

    return result;
  }

  @Post('email-otp/resend')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend Email OTP code' })
  async resendEmailOtp(@Body() body: ResendEmailOtpDto, @Req() req: Request) {
    const ip = extractClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '');
    return this.verifyOtpUseCase.resendEmailOtp(body.temp_token, ip, userAgent);
  }
}
