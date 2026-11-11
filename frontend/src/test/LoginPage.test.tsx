import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../features/auth/LoginPage';
import { authApi } from '../shared/api/auth.api';
import { useAuthStore } from '../shared/stores/auth.store';

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, initialized: true, loading: false, otpChallenge: null, error: null });
    vi.restoreAllMocks();
  });

  it('renders login inputs and shows OTP form when login challenges with email OTP', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      status: 'pending_2fa',
      require2fa: true,
      require_email_otp: true,
      target_email: 'test@cj.vn',
      temp_token: 'tmp-abc',
      message: 'Kiểm tra email để lấy mã OTP',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/i), { target: { value: 'asm01' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập an toàn/i }));

    expect(await screen.findByText(/Xác thực Email OTP/i)).toBeInTheDocument();
  });
});

