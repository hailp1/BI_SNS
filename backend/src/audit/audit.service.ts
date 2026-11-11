import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  async log(data: {
    userId?: string;
    username: string;
    action: string;
    module: string;
    ipAddress: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    status?: string;
    details?: any;
    executionTimeMs?: number;
  }) {
    try {
      await this.db.query(
        `INSERT INTO iam.audit_logs 
         (user_id, username, action, module, ip_address, user_agent, endpoint, method, status, details, execution_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          data.userId || null,
          data.username,
          data.action,
          data.module,
          data.ipAddress,
          data.userAgent || '',
          data.endpoint || '',
          data.method || 'POST',
          data.status || 'SUCCESS',
          JSON.stringify(data.details || {}),
          data.executionTimeMs || 0,
        ],
      );
    } catch (err) {
      this.logger.error('Failed to write audit log:', err);
    }
  }
}
