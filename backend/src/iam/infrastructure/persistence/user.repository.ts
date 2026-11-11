import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CreateUserRecord, UpdateUserRecord, UserRepositoryPort } from '../../application/ports/user.repository.port';
import { UserEntity } from '../../domain/model/user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserEntity[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
    });
    return rows.map(UserMapper.toDomain);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByIdentifier(identifier: string): Promise<UserEntity | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const row = await this.prisma.user.findFirst({
      where: isUuid
        ? { OR: [{ id: identifier }, { username: { equals: identifier, mode: 'insensitive' } }] }
        : { username: { equals: identifier, mode: 'insensitive' } },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findEmailConflict(email: string, excludeUserId: string): Promise<{ id: string; username: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        NOT: { id: excludeUserId },
      },
      select: { id: true, username: true },
    });
  }

  async create(data: CreateUserRecord): Promise<UserEntity> {
    const created = await this.prisma.user.create({ data });
    return UserMapper.toDomain(created);
  }

  async updateById(id: string, data: UpdateUserRecord): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async bulkUpsert(
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
  ): Promise<{ imported: number; updated: number; total: number }> {
    return this.prisma.$transaction(async (tx) => {
      const usernames = items.map((i) => i.username);
      const existingRows = await tx.user.findMany({
        where: { username: { in: usernames } },
        select: { id: true, username: true },
      });
      const existingMap = new Map(existingRows.map((r) => [r.username.toLowerCase(), r.id]));

      let imported = 0;
      let updated = 0;

      for (const item of items) {
        const existingId = existingMap.get(item.username.toLowerCase());
        if (existingId) {
          await tx.user.update({
            where: { id: existingId },
            data: {
              fullName: item.fullName,
              role: item.role,
              channel: item.channel,
              scopeLevel: item.scopeLevel,
              scopeValue: item.scopeValue,
              email: item.email,
            },
          });
          updated++;
        } else {
          await tx.user.create({
            data: {
              username: item.username,
              fullName: item.fullName,
              role: item.role,
              channel: item.channel,
              scopeLevel: item.scopeLevel,
              scopeValue: item.scopeValue,
              email: item.email,
              passwordHash: item.passwordHash,
              isActive: true,
            },
          });
          imported++;
        }
      }

      return { imported, updated, total: items.length };
    });
  }
}
