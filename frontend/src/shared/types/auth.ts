export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  channel: string;
  scopeLevel: string;
  scopeValue: string;
  twoFactorEnabled?: boolean;
}

export interface LoginResponse {
  status: 'success' | 'pending_2fa';
  require2fa?: boolean;
  require_email_otp?: boolean;
  target_email?: string;
  network_type?: string;
  network_name?: string;
  temp_token?: string;
  access_token?: string;
  payload_key?: string;
  user?: AuthUser;
  message?: string;
}

export interface MeResponse {
  authenticated: boolean;
  payload_key?: string;
  user?: AuthUser;
}

export interface VerifyOtpResponse {
  status: 'success';
  access_token: string;
  payload_key?: string;
  user: AuthUser;
  message?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  channel: string;
  role: string;
  scope_level: string;
  scope_value: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
}

export interface UpsertUserPayload {
  username: string;
  email?: string;
  full_name: string;
  role: string;
  channel: string;
  scope_level: string;
  scope_value: string;
  password?: string;
}

