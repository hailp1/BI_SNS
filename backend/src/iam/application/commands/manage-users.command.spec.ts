import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { UserEntity } from '../../domain/model/user.entity';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { ManageUsersUseCase } from './manage-users.command';

function makeUser(username = 'nvbh_01') {
  return new UserEntity({
    id: 'u-2',
    username,
    email: `${username}@cjfoods.com.vn`,
    passwordHash: 'hash',
    fullName: 'User Test',
    channel: 'GT',
    role: 'nvbh',
    scopeLevel: 'npp',
    scopeValue: 'NPP01',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ManageUsersUseCase', () => {
  let useCase: ManageUsersUseCase;
  let userRepo: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    userRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByIdentifier: jest.fn(),
      findEmailConflict: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      bulkUpsert: jest.fn(),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    useCase = new ManageUsersUseCase(userRepo, audit);
  });

  it('generates a random temporary password when creating user without password', async () => {
    userRepo.findByUsername.mockResolvedValue(null);
    userRepo.create.mockResolvedValue(makeUser('new_user'));

    const res = await useCase.upsertSingleUser(
      { username: 'new_user', role: 'nvbh', channel: 'GT' },
      'admin-id',
      'admin',
      '127.0.0.1',
      'jest',
    );

    expect(res.status).toBe('success');
    expect(res.temporaryPassword).toBeDefined();
    expect(res.temporaryPassword?.length).toBeGreaterThanOrEqual(8);
    expect(res.temporaryPassword).not.toBe('cj@2026');
  });

  it('rejects password shorter than 8 characters on resetPassword', async () => {
    await expect(useCase.resetPassword('nvbh_01', '123456', 'admin-id', 'admin', '127.0.0.1', 'jest')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents locking or deleting root admin account', async () => {
    await expect(useCase.updateStatus('admin', false, 'admin-id', 'admin', '127.0.0.1', 'jest')).rejects.toThrow(
      BadRequestException,
    );

    await expect(useCase.deleteUser('admin', 'admin-id', 'admin', '127.0.0.1', 'jest')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws ConflictException when updating to duplicate email', async () => {
    userRepo.findByUsername.mockResolvedValue(makeUser('nvbh_01'));
    userRepo.findEmailConflict.mockResolvedValue({ id: 'u-9', username: 'other' });

    await expect(
      useCase.updateEmail('nvbh_01', 'taken@cjfoods.com.vn', 'admin-id', 'admin', '127.0.0.1', 'jest'),
    ).rejects.toThrow(ConflictException);
  });
});
