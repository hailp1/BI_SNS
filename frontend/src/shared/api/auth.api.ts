import { apiClient } from './client';
import type {
  LoginResponse,
  MeResponse,
  TwoFactorSetupResponse,
  VerifyOtpResponse,
} from '../types/auth';

export const authApi = {
  async login(payload: {
    username: string;
    password: string;
    network_mode?: string;
  }): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<MeResponse> {
    const { data } = await apiClient.get<MeResponse>('/auth/me');
    return data;
  },

  async verify2faLogin(payload: { temp_token: string; code: string }): Promise<VerifyOtpResponse> {
    const { data } = await apiClient.post<VerifyOtpResponse>('/auth/2fa/verify-login', payload);
    return data;
  },

  async verifyEmailOtp(payload: { temp_token: string; code: string }): Promise<VerifyOtpResponse> {
    const { data } = await apiClient.post<VerifyOtpResponse>('/auth/email-otp/verify', payload);
    return data;
  },

  async resendEmailOtp(payload: { temp_token: string }): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post<{ status: string; message: string }>('/auth/email-otp/resend', payload);
    return data;
  },

  async setup2fa(): Promise<TwoFactorSetupResponse> {
    const { data } = await apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup');
    return data;
  },

  async verify2faSetup(code: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post<{ status: string; message: string }>('/auth/2fa/verify', { code });
    return data;
  },
};

