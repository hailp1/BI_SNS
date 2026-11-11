import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../../shared/redis/redis.service';
import { TokenServicePort } from '../../application/ports/token.service.port';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: {
    sub: string;
    username: string;
    fullName: string;
    role: string;
    channel: string;
    scopeLevel: string;
    scopeValue: string;
  }): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
    });
  }

  signTempToken(payload: Record<string, unknown>, expiresIn = '5m'): string {
    return this.jwtService.sign(payload, { expiresIn });
  }

  verify<T extends object = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify<T>(token);
  }

  async blacklist(token: string, ttlSeconds = 8 * 3600): Promise<void> {
    await this.redis.set(`blacklist:${token}`, '1', ttlSeconds);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const val = await this.redis.get(`blacklist:${token}`);
    return Boolean(val);
  }
}
