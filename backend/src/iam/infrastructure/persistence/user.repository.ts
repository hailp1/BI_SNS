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
    if (items.length === 0) {
      return { imported: 0, updated: 0, total: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      const lowerNames = Array.from(new Set(items.map((i) => i.username.toLowerCase())));
      const existingRows = await tx.$queryRaw<Array<{ id: string; username: string }>>`
        SELECT id, username
        FROM iam.users
        WHERE LOWER(username) = ANY(${lowerNames}::text[])
      `;
      const existingMap = new Map(existingRows.map((r) => [r.username.toLowerCase(), r.id]));

      const toUpdate: Array<(typeof items)[number] & { id: string }> = [];
      const toInsert: typeof items = [];

      for (const item of items) {
        const existingId = existingMap.get(item.username.toLowerCase());
        if (existingId) {
          toUpdate.push({ ...item, id: existingId });
        } else {
          existingMap.set(item.username.toLowerCase(), '');
          toInsert.push(item);
        }
      }

      if (toUpdate.length > 0) {
        const ids = toUpdate.map((u) => u.id);
        const fullNames = toUpdate.map((u) => u.fullName);
        const roles = toUpdate.map((u) => u.role);
        const channels = toUpdate.map((u) => u.channel);
        const scopeLevels = toUpdate.map((u) => u.scopeLevel);
        const scopeValues = toUpdate.map((u) => u.scopeValue);
        const emails = toUpdate.map((u) => (u.email && u.email.trim() !== '' ? u.email.trim() : null));

        await tx.$executeRaw`
          UPDATE iam.users AS u
          SET full_name = v.full_name,
              role = v.role,
              channel = v.channel,
              scope_level = v.scope_level,
              scope_value = v.scope_value,
              email = COALESCE(v.email, u.email)
          FROM UNNEST(
            ${ids}::uuid[],
            ${fullNames}::text[],
            ${roles}::text[],
            ${channels}::text[],
            ${scopeLevels}::text[],
            ${scopeValues}::text[],
            ${emails}::text[]
          ) AS v(id, full_name, role, channel, scope_level, scope_value, email)
          WHERE u.id = v.id
        `;
      }

      let imported = 0;
      if (toInsert.length > 0) {
        const res = await tx.user.createMany({
          data: toInsert.map((item) => ({
            username: item.username,
            fullName: item.fullName,
            role: item.role,
            channel: item.channel,
            scopeLevel: item.scopeLevel,
            scopeValue: item.scopeValue,
            email: item.email && item.email.trim() !== '' ? item.email.trim() : null,
            passwordHash: item.passwordHash,
            isActive: true,
          })),
          skipDuplicates: true,
        });
        imported = res.count;
      }

      return { imported, updated: toUpdate.length, total: items.length };
    });
  }
}
