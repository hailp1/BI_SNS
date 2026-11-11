import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly redis: RedisService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.['cj_auth_token'] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const token = req?.cookies?.['cj_auth_token'] || (req.headers.authorization || '').replace('Bearer ', '').trim();

    if (token) {
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi hoặc đã đăng xuất.');
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role,
      channel: payload.channel,
      scopeLevel: payload.scopeLevel,
      scopeValue: payload.scopeValue,
    };
  }
}
