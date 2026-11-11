export const TOKEN_SERVICE_PORT = Symbol('TOKEN_SERVICE_PORT');

export interface TokenServicePort {
  signAccessToken(payload: {
    sub: string;
    username: string;
    fullName: string;
    role: string;
    channel: string;
    scopeLevel: string;
    scopeValue: string;
  }): string;
  signTempToken(payload: Record<string, unknown>, expiresIn?: string): string;
  verify<T extends object = Record<string, unknown>>(token: string): T;
  blacklist(token: string, ttlSeconds?: number): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
}
