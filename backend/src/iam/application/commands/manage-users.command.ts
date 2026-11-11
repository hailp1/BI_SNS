import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuditService } from '../../../shared/audit/audit.service';
import { Email } from '../../domain/model/value-objects/email.vo';
import { PasswordPolicy } from '../../domain/model/value-objects/password.vo';
import { Username } from '../../domain/model/value-objects/username.vo';
import { UpsertUserDto } from '../../presentation/dtos/users.dto';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../ports/user.repository.port';

@Injectable()
export class ManageUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly userRepo: UserRepositoryPort,
    private readonly audit: AuditService,
  ) {}

  private generateTemporaryPassword(): string {
    return crypto.randomBytes(9).toString('base64url');
  }

  async updateEmail(
    username: string,
    newEmail: string,
    actorId: string,
    actorUsername: string,
    ip: string,
    userAgent: string,
  ) {
    let cleanEmail: string;
    try {
      cleanEmail = Email.create(newEmail).value;
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);
    }

    const duplicate = await this.userRepo.findEmailConflict(cleanEmail, user.id);
    if (duplicate) {
      throw new ConflictException(`Địa chỉ Email ${cleanEmail} đã được sử dụng bởi tài khoản @${duplicate.username}!`);
    }

    await this.userRepo.updateById(user.id, { email: cleanEmail });

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

    const user = await this.userRepo.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    await this.userRepo.updateById(user.id, {
      isActive,
      failedAttempts: isActive ? 0 : user.failedAttempts,
      lockedUntil: null,
    });

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
    let cleanPass: string;
    try {
      cleanPass = PasswordPolicy.validate(newPasswordPlain);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const user = await this.userRepo.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    const hash = await bcrypt.hash(cleanPass, 12);

    await this.userRepo.updateById(user.id, {
      passwordHash: hash,
      failedAttempts: 0,
      lockedUntil: null,
    });

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

  async upsertSingleUser(dto: UpsertUserDto, actorId: string, actorUsername: string, ip: string, userAgent: string) {
    let username: string;
    try {
      username = Username.create(dto.username).value;
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const fullName = (dto.fullName || dto.full_name || username).trim();
    const role = (dto.role || 'viewer').toLowerCase().trim();
    const channel = dto.channel || 'all';
    const scopeLevel = dto.scopeLevel || dto.scope_level || 'all';
    const scopeValue = dto.scopeValue || dto.scope_value || 'Toàn quốc';
    const email = (dto.email || `${username}@cjfoods.com.vn`).toLowerCase().trim();

    let generatedTempPassword: string | undefined;
    const existing = await this.userRepo.findByUsername(username);

    if (existing) {
      const updateData: Parameters<UserRepositoryPort['updateById']>[1] = {
        fullName,
        role,
        channel,
        scopeLevel,
        scopeValue,
        email,
        isActive: dto.isActive !== false,
      };
      if (dto.password && dto.password.trim()) {
        try {
          const cleanPass = PasswordPolicy.validate(dto.password);
          updateData.passwordHash = await bcrypt.hash(cleanPass, 12);
        } catch (e) {
          throw new BadRequestException((e as Error).message);
        }
      }
      await this.userRepo.updateById(existing.id, updateData);
    } else {
      const providedPass = dto.password ? dto.password.trim() : '';
      let rawPass: string;
      if (providedPass) {
        try {
          rawPass = PasswordPolicy.validate(providedPass);
        } catch (e) {
          throw new BadRequestException((e as Error).message);
        }
      } else {
        rawPass = this.generateTemporaryPassword();
        generatedTempPassword = rawPass;
      }

      const hash = await bcrypt.hash(rawPass, 12);
      await this.userRepo.create({
        username,
        fullName,
        role,
        channel,
        scopeLevel,
        scopeValue,
        email,
        passwordHash: hash,
        isActive: dto.isActive !== false,
      });
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

  async bulkImportUsers(
    usersList: UpsertUserDto[],
    actorId: string,
    actorUsername: string,
    ip: string,
    userAgent: string,
  ) {
    if (!Array.isArray(usersList) || usersList.length === 0) {
      return { imported: 0, updated: 0, total: 0 };
    }

    const prepared = await Promise.all(
      usersList
        .filter((u) => Boolean(u.username && u.username.trim()))
        .map(async (u) => {
          const username = u.username.toLowerCase().trim();
          const fullName = (u.full_name || u.fullName || username).trim();
          const role = (u.role || 'viewer').toLowerCase().trim();
          const channel = u.channel || 'all';
          const scopeLevel = u.scope_level || u.scopeLevel || 'all';
          const scopeValue = u.scope_value || u.scopeValue || 'Toàn quốc';
          const email = (u.email || `${username}@cjfoods.com.vn`).toLowerCase().trim();
          const providedPass = (u.password || u.raw_pass || '').trim();
          const rawPass =
            providedPass.length >= PasswordPolicy.MIN_LENGTH ? providedPass : this.generateTemporaryPassword();
          const passwordHash = await bcrypt.hash(rawPass, 12);

          return { username, fullName, role, channel, scopeLevel, scopeValue, email, passwordHash };
        }),
    );

    const summary = await this.userRepo.bulkUpsert(prepared);

    await this.audit.log({
      userId: actorId,
      username: actorUsername,
      action: 'USERS_BULK_IMPORTED',
      module: 'USER_MGMT',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: summary,
    });

    return summary;
  }

  async deleteUser(username: string, actorId: string, actorUsername: string, ip: string, userAgent: string) {
    if (username.toLowerCase() === 'admin') {
      throw new BadRequestException('Không thể xóa tài khoản Root Admin!');
    }
    const user = await this.userRepo.findByUsername(username);
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản @${username}`);

    await this.userRepo.deleteById(user.id);

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

  /** Allow an authenticated user to change their own password after verifying the current one. */
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string, ip: string, userAgent: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác!');
    }

    let cleanNewPass: string;
    try {
      cleanNewPass = PasswordPolicy.validate(newPassword);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const hash = await bcrypt.hash(cleanNewPass, 12);
    await this.userRepo.updateById(user.id, { passwordHash: hash });

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: 'USER_PASSWORD_CHANGED',
      module: 'AUTH',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    return {
      status: 'success',
      message: 'Đã đổi mật khẩu thành công!',
    };
  }
}
