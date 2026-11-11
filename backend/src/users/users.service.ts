import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private generateTemporaryPassword(): string {
    return crypto.randomBytes(9).toString('base64url'); // 12 random URL-safe chars
  }

  async findAll() {
    const res = await this.db.query(
      `SELECT id, username, full_name, email, role, channel, scope_level, scope_value, 
              is_active, failed_attempts, last_login_at, updated_at, created_at 
       FROM iam.users 
       ORDER BY role, username ASC`,
    );
    return res.rows;
  }

  async findByUsername(username: string) {
    const res = await this.db.query(
      `SELECT id, username, full_name, email, role, channel, scope_level, scope_value, 
              is_active, failed_attempts, last_login_at, updated_at, created_at 
       FROM iam.users 
       WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async updateEmail(
    username: string,
    newEmail: string,
    actorId: string,
    actorUsername: string,
    ip: string,
    userAgent: string,
  ) {
    const cleanEmail = (newEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new BadRequestException('Địa chỉ Email không hợp lệ!');
    }

    const user = await this.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);
    }

    // Kiểm tra trùng lặp email với user khác
    const duplicate = await this.db.query(
      `SELECT id, username FROM iam.users WHERE LOWER(email) = LOWER($1) AND id != $2`,
      [cleanEmail, user.id],
    );
    if (duplicate.rows.length > 0) {
      throw new ConflictException(
        `Địa chỉ Email ${cleanEmail} đã được sử dụng bởi tài khoản @${duplicate.rows[0].username}!`,
      );
    }

    // Cập nhật vào DB
    await this.db.query(`UPDATE iam.users SET email = $1, updated_at = NOW() WHERE id = $2`, [cleanEmail, user.id]);

    // Ghi Audit Log ISO 27001
    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: 'USER_EMAIL_UPDATED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { target_user: user.username, old_email: user.email, new_email: cleanEmail },
    });

    return {
      status: 'success',
      message: `Đã cập nhật thành công Email nhận OTP cho tài khoản @${user.username}`,
      user: {
        username: user.username,
        email: cleanEmail,
      },
    };
  }

  async updateStatus(
    username: string,
    isActive: boolean,
    actorId: string,
    actorUsername: string,
    ip: string,
    userAgent: string,
  ) {
    if (username.toLowerCase() === 'admin') {
      throw new BadRequestException('Không thể khóa tài khoản Root Admin!');
    }

    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    await this.db.query(
      `UPDATE iam.users 
       SET is_active = $1, failed_attempts = $2, locked_until = NULL, updated_at = NOW() 
       WHERE id = $3`,
      [isActive, isActive ? 0 : user.failed_attempts, user.id],
    );

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: isActive ? 'USER_UNLOCKED' : 'USER_LOCKED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { target_user: user.username, is_active: isActive },
    });

    return {
      status: 'success',
      message: `Tài khoản @${user.username} đã được ${isActive ? 'mở khóa' : 'khóa'}!`,
    };
  }

  async resetPassword(
    username: string,
    newPasswordPlain: string,
    actorId: string,
    actorUsername: string,
    ip: string,
    userAgent: string,
  ) {
    const cleanPass = (newPasswordPlain || '').trim();
    if (cleanPass.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 8 ký tự!');
    }

    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    const hash = await bcrypt.hash(cleanPass, 12);

    await this.db.query(
      `UPDATE iam.users 
       SET password_hash = $1, failed_attempts = 0, locked_until = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [hash, user.id],
    );

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { target_user: user.username },
    });

    return {
      status: 'success',
      message: `Đã cấp lại mật khẩu mới cho @${user.username}! Mật khẩu đã được mã hóa Bcrypt 12 rounds.`,
    };
  }

  async upsertSingleUser(dto: any, actorId: string, actorUsername: string, ip: string, userAgent: string) {
    const username = (dto.username || '').toLowerCase().trim();
    if (!username) throw new BadRequestException('Username không được để trống!');

    const fullName = (dto.fullName || dto.full_name || username).trim();
    const role = (dto.role || 'viewer').toLowerCase().trim();
    const channel = dto.channel || 'all';
    const scopeLevel = dto.scopeLevel || dto.scope_level || 'all';
    const scopeValue = dto.scopeValue || dto.scope_value || 'Toàn quốc';
    const email = (dto.email || `${username}@cjfoods.com.vn`).toLowerCase().trim();

    let generatedTempPassword: string | undefined;
    const existing = await this.findByUsername(username);
    if (existing) {
      if (dto.password && dto.password.trim()) {
        const cleanPass = dto.password.trim();
        if (cleanPass.length < 8) {
          throw new BadRequestException('Mật khẩu phải có tối thiểu 8 ký tự!');
        }
        const hash = await bcrypt.hash(cleanPass, 12);
        await this.db.query(
          `UPDATE iam.users 
           SET full_name = $1, role = $2, channel = $3, scope_level = $4, scope_value = $5, 
               email = $6, password_hash = $7, is_active = $8, updated_at = NOW() 
           WHERE id = $9`,
          [fullName, role, channel, scopeLevel, scopeValue, email, hash, dto.isActive !== false, existing.id],
        );
      } else {
        await this.db.query(
          `UPDATE iam.users 
           SET full_name = $1, role = $2, channel = $3, scope_level = $4, scope_value = $5, 
               email = $6, is_active = $7, updated_at = NOW() 
           WHERE id = $8`,
          [fullName, role, channel, scopeLevel, scopeValue, email, dto.isActive !== false, existing.id],
        );
      }
    } else {
      const providedPass = dto.password && dto.password.trim() ? dto.password.trim() : '';
      if (providedPass && providedPass.length < 8) {
        throw new BadRequestException('Mật khẩu phải có tối thiểu 8 ký tự!');
      }
      const rawPass = providedPass || (generatedTempPassword = this.generateTemporaryPassword());
      const hash = await bcrypt.hash(rawPass, 12);
      await this.db.query(
        `INSERT INTO iam.users (username, full_name, role, channel, scope_level, scope_value, email, password_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [username, fullName, role, channel, scopeLevel, scopeValue, email, hash, dto.isActive !== false],
      );
    }

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: existing ? 'USER_UPDATED' : 'USER_CREATED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { username, role, email },
    });

    return {
      status: 'success',
      username,
      email,
      ...(generatedTempPassword ? { temporaryPassword: generatedTempPassword } : {}),
    };
  }

  async bulkImportUsers(usersList: any[], actorId: string, actorUsername: string, ip: string, userAgent: string) {
    if (!Array.isArray(usersList) || usersList.length === 0) {
      return { imported: 0, updated: 0, total: 0 };
    }
    let imported = 0;
    let updated = 0;
    for (const u of usersList) {
      const username = (u.username || '').toLowerCase().trim();
      if (!username) continue;
      const fullName = (u.full_name || u.fullName || username).trim();
      const role = (u.role || 'viewer').toLowerCase().trim();
      const channel = u.channel || 'all';
      const scopeLevel = u.scope_level || u.scopeLevel || 'all';
      const scopeValue = u.scope_value || u.scopeValue || 'Toàn quốc';
      const email = (u.email || `${username}@cjfoods.com.vn`).toLowerCase().trim();
      const providedPass = (u.password || u.raw_pass || '').trim();
      const rawPass = providedPass.length >= 8 ? providedPass : this.generateTemporaryPassword();

      const existing = await this.findByUsername(username);
      if (existing) {
        await this.db.query(
          `UPDATE iam.users 
           SET full_name = $1, role = $2, channel = $3, scope_level = $4, scope_value = $5, email = $6, updated_at = NOW() 
           WHERE id = $7`,
          [fullName, role, channel, scopeLevel, scopeValue, email, existing.id],
        );
        updated++;
      } else {
        const hash = await bcrypt.hash(rawPass, 12);
        await this.db.query(
          `INSERT INTO iam.users (username, full_name, role, channel, scope_level, scope_value, email, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [username, fullName, role, channel, scopeLevel, scopeValue, email, hash],
        );
        imported++;
      }
    }

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: 'USERS_BULK_IMPORTED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { imported, updated, total: usersList.length },
    });

    return { imported, updated, total: usersList.length };
  }

  async deleteUser(username: string, actorId: string, actorUsername: string, ip: string, userAgent: string) {
    if (username.toLowerCase() === 'admin') {
      throw new BadRequestException('Không thể xóa tài khoản Root Admin!');
    }
    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    await this.db.query(`DELETE FROM iam.users WHERE id = $1`, [user.id]);

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: 'USER_DELETED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: { deleted_username: username },
    });

    return { status: 'success', message: `Đã xóa tài khoản @${username}` };
  }
}
