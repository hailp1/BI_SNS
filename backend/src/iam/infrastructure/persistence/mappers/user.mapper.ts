import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../../domain/model/user.entity';

export class UserMapper {
  static toDomain(row: PrismaUser): UserEntity {
    return new UserEntity({
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      channel: row.channel,
      role: row.role,
      scopeLevel: row.scopeLevel,
      scopeValue: row.scopeValue,
      isActive: row.isActive,
      failedAttempts: row.failedAttempts,
      lockedUntil: row.lockedUntil,
      twoFactorSecret: row.twoFactorSecret,
      twoFactorEnabled: row.twoFactorEnabled,
      lastLoginAt: row.lastLoginAt,
      lastLoginIp: row.lastLoginIp,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
