import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../shared/api/auth.api';
import { useAuthStore } from '../shared/stores/auth.store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, initialized: true, loading: false, otpChallenge: null, error: null });
    vi.restoreAllMocks();
  });

  it('authenticates immediately when no 2FA/OTP is required', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      status: 'success',
      require2fa: false,
      payload_key: 'b'.repeat(64),
      user: {
        id: '1',
        username: 'admin',
        fullName: 'Administrator',
        email: 'admin@cj.vn',
        role: 'admin',
        channel: 'all',
        scopeLevel: 'all',
        scopeValue: 'Toàn Quốc',
      },
    });

    const outcome = await useAuthStore.getState().login('admin', 'secret1234');
    expect(outcome).toBe('authenticated');
    expect(useAuthStore.getState().user?.username).toBe('admin');
  });

  it('transitions to email OTP challenge when external network requires OTP', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      status: 'pending_2fa',
      require2fa: true,
      require_email_otp: true,
      target_email: 'user@cj.vn',
      temp_token: 'temp-123',
      message: 'OTP sent',
    });

    const outcome = await useAuthStore.getState().login('rsm_nam', 'secret1234', 'external');
    expect(outcome).toBe('otp');
    expect(useAuthStore.getState().otpChallenge?.type).toBe('email');
    expect(useAuthStore.getState().user).toBeNull();
  });
});

