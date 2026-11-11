import { UserEntity, UserProps } from './user.entity';
import { Email } from './value-objects/email.vo';
import { PasswordPolicy } from './value-objects/password.vo';
import { Username } from './value-objects/username.vo';

function makeUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: 'user-1',
    username: 'nvbh_01',
    email: 'nvbh01@cjfoods.com.vn',
    passwordHash: 'hashed',
    fullName: 'Nguyen Van A',
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
    ...overrides,
  };
}

describe('IAM Domain Entities & Value Objects', () => {
  describe('UserEntity', () => {
    it('detects inactive or future lockedUntil as locked', () => {
      const inactive = new UserEntity(makeUserProps({ isActive: false }));
      expect(inactive.isLocked()).toBe(true);

      const future = new Date(Date.now() + 60_000);
      const locked = new UserEntity(makeUserProps({ lockedUntil: future }));
      expect(locked.isLocked()).toBe(true);

      const active = new UserEntity(makeUserProps());
      expect(active.isLocked()).toBe(false);
    });

    it('locks account for 30 minutes on 5th failed login attempt', () => {
      const user = new UserEntity(makeUserProps({ failedAttempts: 3 }));
      const now = new Date('2026-11-11T10:00:00Z');

      const attempt4 = user.recordFailedLogin(now);
      expect(attempt4).toEqual({ lockedNow: false, remainingAttempts: 1 });
      expect(user.isActive).toBe(true);

      const attempt5 = user.recordFailedLogin(now);
      expect(attempt5).toEqual({ lockedNow: true, remainingAttempts: 0 });
      expect(user.isActive).toBe(false);
      expect(user.lockedUntil?.getTime()).toBe(now.getTime() + 30 * 60_000);
    });

    it('resets failed attempts and lock on successful login', () => {
      const user = new UserEntity(makeUserProps({ failedAttempts: 4, lockedUntil: new Date(Date.now() + 10_000) }));
      const now = new Date();
      user.recordSuccessfulLogin('10.0.0.5', now);

      expect(user.failedAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
      expect(user.lastLoginIp).toBe('10.0.0.5');
      expect(user.lastLoginAt).toBe(now);
    });
  });

  describe('Value Objects', () => {
    it('normalizes and masks Email', () => {
      const email = Email.create('  Admin.Test@CJFoods.com.vn ');
      expect(email.value).toBe('admin.test@cjfoods.com.vn');
      expect(Email.mask('admin@cjfoods.com.vn')).toBe('a***n@cjfoods.com.vn');
      expect(() => Email.create('invalid-email')).toThrow();
    });

    it('enforces PasswordPolicy minimum 8 chars', () => {
      expect(PasswordPolicy.validate('StrongPass1!')).toBe('StrongPass1!');
      expect(() => PasswordPolicy.validate('short')).toThrow();
    });

    it('normalizes Username and enforces min 3 chars', () => {
      expect(Username.create('  Admin_01 ').value).toBe('admin_01');
      expect(() => Username.create('ab')).toThrow();
    });
  });
});
