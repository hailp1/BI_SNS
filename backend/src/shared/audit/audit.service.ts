import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface AuditLogInput {
  userId?: string;
  username: string;
  action: string;
  module: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  status?: string;
  details?: Record<string, unknown>;
  executionTimeMs?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          username: data.username,
          action: data.action,
          module: data.module,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent || '',
          endpoint: data.endpoint || '',
          method: data.method || 'POST',
          status: data.status || 'SUCCESS',
          details: (data.details || {}) as Prisma.InputJsonValue,
          executionTimeMs: data.executionTimeMs || 0,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log:', err);
    }
  }
}
