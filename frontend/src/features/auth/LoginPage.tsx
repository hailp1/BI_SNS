import { KeyRound, Lock, Mail, RefreshCw, ShieldCheck, User, Wifi } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAuthStore } from '../../shared/stores/auth.store';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const resendEmailOtp = useAuthStore((s) => s.resendEmailOtp);
  const cancelOtpChallenge = useAuthStore((s) => s.cancelOtpChallenge);
  const otpChallenge = useAuthStore((s) => s.otpChallenge);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [networkMode, setNetworkMode] = useState<'auto' | 'intranet' | 'external'>('auto');
  const [otpCode, setOtpCode] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    if (!username.trim() || !password) return;
    try {
      await login(username.trim(), password, networkMode === 'auto' ? undefined : networkMode);
    } catch {
      // Handled by store error state
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    if (!otpCode.trim()) return;
    try {
      await verifyOtp(otpCode.trim());
    } catch {
      // Handled by store error state
    }
  };

  const handleResend = async () => {
    setInfoMessage(null);
    try {
      const msg = await resendEmailOtp();
      setInfoMessage(msg);
    } catch (err) {
      setInfoMessage(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-500 text-lg font-black text-white shadow-md">
            CJ
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">CJ Foods Enterprise SNS</h1>
            <p className="text-xs text-slate-500">Hệ thống Điều hành Kênh Phân phối & Zero-Trust IAM</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-700">
            {infoMessage}
          </div>
        )}

        {!otpChallenge ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-xs font-semibold text-slate-700">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập mã nhân viên / username"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="networkMode" className="mb-1 block text-xs font-semibold text-slate-700">
                Chế độ mạng truy cập
              </label>
              <div className="relative">
                <Wifi className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  id="networkMode"
                  value={networkMode}
                  onChange={(e) => setNetworkMode(e.target.value as 'auto' | 'intranet' | 'external')}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-red-500"
                >
                  <option value="auto">Tự động nhận diện IP doanh nghiệp</option>
                  <option value="intranet">Mạng nội bộ (VPN / Văn phòng CJ)</option>
                  <option value="external">Mạng ngoài (Yêu cầu Email OTP)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Đang xác thực...' : 'Đăng nhập an toàn'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2 font-bold">
                {otpChallenge.type === 'email' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {otpChallenge.type === 'email' ? 'Xác thực Email OTP (Mạng ngoài)' : 'Xác thực 2 bước (TOTP Authenticator)'}
              </div>
              <p className="mt-1">
                {otpChallenge.message ||
                  (otpChallenge.targetEmail
                    ? `Mã OTP 6 chữ số đã được gửi tới ${otpChallenge.targetEmail}`
                    : 'Nhập mã 6 chữ số từ ứng dụng xác thực của bạn.')}
              </p>
            </div>

            <div>
              <label htmlFor="otpCode" className="mb-1 block text-xs font-semibold text-slate-700">
                Mã xác thực (6 chữ số)
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Nhập 6 số OTP"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-slate-900 outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Đang kiểm tra...' : 'Xác nhận OTP'}
              </button>
              {otpChallenge.type === 'email' && (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Gửi lại
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOtpCode('');
                cancelOtpChallenge();
              }}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Quay lại đăng nhập
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

