export interface UserProps {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  fullName: string;
  channel: string;
  role: string;
  scopeLevel: string;
  scopeValue: string;
  isActive: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  static readonly MAX_FAILED_ATTEMPTS = 5;
  static readonly LOCK_DURATION_MINUTES = 30;

  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get username(): string {
    return this.props.username;
  }
  get email(): string | null {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get channel(): string {
    return this.props.channel;
  }
  get role(): string {
    return this.props.role;
  }
  get scopeLevel(): string {
    return this.props.scopeLevel;
  }
  get scopeValue(): string {
    return this.props.scopeValue;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get failedAttempts(): number {
    return this.props.failedAttempts;
  }
  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }
  get twoFactorSecret(): string | null {
    return this.props.twoFactorSecret;
  }
  get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled;
  }
  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }
  get lastLoginIp(): string | null {
    return this.props.lastLoginIp;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isLocked(now: Date = new Date()): boolean {
    if (!this.props.isActive) return true;
    return this.props.lockedUntil !== null && this.props.lockedUntil > now;
  }

  hasValidEmail(): boolean {
    return Boolean(this.props.email && this.props.email.includes('@'));
  }

  recordFailedLogin(now: Date = new Date()): { lockedNow: boolean; remainingAttempts: number } {
    this.props.failedAttempts += 1;
    if (this.props.failedAttempts >= UserEntity.MAX_FAILED_ATTEMPTS) {
      this.props.isActive = false;
      this.props.lockedUntil = new Date(now.getTime() + UserEntity.LOCK_DURATION_MINUTES * 60_000);
      return { lockedNow: true, remainingAttempts: 0 };
    }
    return {
      lockedNow: false,
      remainingAttempts: UserEntity.MAX_FAILED_ATTEMPTS - this.props.failedAttempts,
    };
  }

  recordSuccessfulLogin(ip: string, now: Date = new Date()): void {
    this.props.failedAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = now;
    this.props.lastLoginIp = ip;
  }

  toPublicProfile() {
    return {
      id: this.props.id,
      username: this.props.username,
      fullName: this.props.fullName,
      role: this.props.role,
      channel: this.props.channel,
      scopeLevel: this.props.scopeLevel,
      scopeValue: this.props.scopeValue,
    };
  }

  toAdminView() {
    return {
      id: this.props.id,
      username: this.props.username,
      full_name: this.props.fullName,
      email: this.props.email,
      role: this.props.role,
      channel: this.props.channel,
      scope_level: this.props.scopeLevel,
      scope_value: this.props.scopeValue,
      is_active: this.props.isActive,
      failed_attempts: this.props.failedAttempts,
      last_login_at: this.props.lastLoginAt,
      updated_at: this.props.updatedAt,
      created_at: this.props.createdAt,
    };
  }
}
