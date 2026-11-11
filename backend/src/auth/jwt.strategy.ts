import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.['cj_auth_token'] || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const token = req?.cookies?.['cj_auth_token'] || (req.headers.authorization || '').replace('Bearer ', '');

    // Kiểm tra token có bị đưa vào danh sách đen (Blacklist trong Redis) sau khi logout không
    if (token) {
      const isBlacklisted = await this.db.redis.get(`blacklist:${token}`);
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
