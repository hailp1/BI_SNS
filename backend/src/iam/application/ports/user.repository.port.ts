import { UserEntity } from '../../domain/model/user.entity';

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');

export interface CreateUserRecord {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  channel: string;
  scopeLevel: string;
  scopeValue: string;
  isActive: boolean;
}

export interface UpdateUserRecord {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  role?: string;
  channel?: string;
  scopeLevel?: string;
  scopeValue?: string;
  isActive?: boolean;
  failedAttempts?: number;
  lockedUntil?: Date | null;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
}

export interface UserRepositoryPort {
  findAll(): Promise<UserEntity[]>;
  findById(id: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByIdentifier(identifier: string): Promise<UserEntity | null>;
  findEmailConflict(email: string, excludeUserId: string): Promise<{ id: string; username: string } | null>;
  create(data: CreateUserRecord): Promise<UserEntity>;
  updateById(id: string, data: UpdateUserRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
  bulkUpsert(
    items: Array<{
      username: string;
      email: string;
      fullName: string;
      role: string;
      channel: string;
      scopeLevel: string;
      scopeValue: string;
      passwordHash: string;
    }>,
  ): Promise<{ imported: number; updated: number; total: number }>;
}
