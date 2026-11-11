import { Request } from 'express';

export function extractClientIp(req: Request): string {
  const realIp = req.headers['x-real-ip'];
  const headerIp = Array.isArray(realIp) ? realIp[0] : realIp;
  return String(req.ip || headerIp || req.socket?.remoteAddress || '127.0.0.1');
}
