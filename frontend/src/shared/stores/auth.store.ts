import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import type { AuthUser, LoginResponse } from '../types/auth';
import { clearPayloadIdbCache, clearPayloadKeyHex, setPayloadKeyHex } from '../utils/crypto';

export type OtpChallengeState = {
  type: 'email' | 'totp';
  tempToken: string;
  targetEmail?: string;
  networkName?: string;
  message?: string;
} | null;

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  loading: boolean;
  otpChallenge: OtpChallengeState;
  error: string | null;
  checkSession: () => Promise<void>;
  login: (username: string, password: string, networkMode?: string) => Promise<'authenticated' | 'otp'>;
  verifyOtp: (code: string) => Promise<void>;
  resendEmailOtp: () => Promise<string>;
  cancelOtpChallenge: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  loading: false,
  otpChallenge: null,
  error: null,

  checkSession: async () => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.me();
      if (res.authenticated && res.user) {
        if (res.payload_key) setPayloadKeyHex(res.payload_key);
        set({ user: res.user, initialized: true, loading: false, otpChallenge: null });
      } else {
        set({ user: null, initialized: true, loading: false });
      }
    } catch {
      set({ user: null, initialized: true, loading: false });
    }
  },

  login: async (username, password, networkMode) => {
    set({ loading: true, error: null });
    try {
      const res: LoginResponse = await authApi.login({ username, password, network_mode: networkMode });
      if (res.require2fa && res.temp_token) {
        set({
          loading: false,
          otpChallenge: {
            type: res.require_email_otp ? 'email' : 'totp',
            tempToken: res.temp_token,
            targetEmail: res.target_email,
            networkName: res.network_name,
            message: res.message,
          },
        });
        return 'otp';
      }

      if (res.payload_key) setPayloadKeyHex(res.payload_key);
      set({ user: res.user || null, loading: false, otpChallenge: null });
      return 'authenticated';
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Đăng nhập thất bại' });
      throw err;
    }
  },

  verifyOtp: async (code) => {
    const challenge = get().otpChallenge;
    if (!challenge) throw new Error('Không có phiên xác thực OTP');
    set({ loading: true, error: null });
    try {
      const res =
        challenge.type === 'email'
          ? await authApi.verifyEmailOtp({ temp_token: challenge.tempToken, code })
          : await authApi.verify2faLogin({ temp_token: challenge.tempToken, code });
      if (res.payload_key) setPayloadKeyHex(res.payload_key);
      set({ user: res.user, otpChallenge: null, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Mã OTP không hợp lệ' });
      throw err;
    }
  },

  resendEmailOtp: async () => {
    const challenge = get().otpChallenge;
    if (!challenge || challenge.type !== 'email') {
      throw new Error('Không có phiên Email OTP');
    }
    const res = await authApi.resendEmailOtp({ temp_token: challenge.tempToken });
    return res.message || 'Đã gửi lại mã OTP';
  },

  cancelOtpChallenge: () => set({ otpChallenge: null, error: null }),

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout network error
    }
    clearPayloadKeyHex();
    await clearPayloadIdbCache();
    set({ user: null, otpChallenge: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

