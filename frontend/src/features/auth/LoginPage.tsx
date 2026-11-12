import { KeyRound, Mail, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { CJ_LOGO_DATA_URI } from '../../shared/constants/brand';
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [networkMode, setNetworkMode] = useState<'company' | 'external'>('company');
  const [otpCode, setOtpCode] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    if (!username.trim() || !password) return;
    try {
      await login(username.trim(), password, networkMode === 'company' ? 'intranet' : 'external');
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
    <div
      className="cj-modal-backdrop active flex min-h-screen items-center justify-center p-4"
      style={{ background: '#0f172a' }}
    >
      <div
        className="cj-modal-window relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxWidth: '440px' }}
      >
        {/* 1. Top Blue Brand Header with Red Accent Line */}
        <div
          className="flex flex-col items-center justify-center px-6 pb-5 pt-7 text-center"
          style={{ backgroundColor: '#004B91', borderBottom: '4px solid #E31837' }}
        >
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-md">
            <img src={CJ_LOGO_DATA_URI} alt="CJ Foods" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-lg font-black uppercase leading-tight tracking-wide text-white">CJ FOODS VIỆT NAM</h2>
          <p className="mt-1 text-sm font-bold tracking-wide text-blue-100">SNS - Sales Network System</p>
        </div>

        {/* 2. Form Body */}
        <div className="bg-white p-6">
          <div className="mb-5 text-center">
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">ĐĂNG NHẬP HỆ THỐNG</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Vui lòng đăng nhập để truy cập dữ liệu phân quyền
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-xs font-medium text-sky-700">
              {infoMessage}
            </div>
          )}

          {!otpChallenge ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-1 block text-xs font-bold text-slate-700">
                  Tên đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm text-slate-400">👤</span>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1 block text-xs font-bold text-slate-700">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm text-slate-400">🔒</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 cursor-pointer text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    👁️
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Zero Trust Context-Aware Network Selector */}
              <div className="border-t border-slate-100 pb-1 pt-2">
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span>🛡️</span> Vị trí kết nối mạng:
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      networkMode === 'company' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {networkMode === 'company' ? '🏢 Mạng Nội Bộ Công Ty' : '🌐 Mạng Ngoài (Internet / 4G)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg p-2 transition ${
                      networkMode === 'company'
                        ? 'border-2 border-emerald-500 bg-emerald-50/70 font-bold text-slate-800'
                        : 'border border-slate-200 bg-slate-50 font-medium text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="network_mode"
                      value="company"
                      checked={networkMode === 'company'}
                      onChange={() => setNetworkMode('company')}
                      className="text-emerald-600"
                    />
                    <span>🏢 Mạng Công Ty</span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg p-2 transition ${
                      networkMode === 'external'
                        ? 'border-2 border-amber-500 bg-amber-50/70 font-bold text-slate-800'
                        : 'border border-slate-200 bg-slate-50 font-medium text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="network_mode"
                      value="external"
                      checked={networkMode === 'external'}
                      onChange={() => setNetworkMode('external')}
                      className="text-amber-600"
                    />
                    <span>🌐 Mạng Ngoài (4G/Nhà)</span>
                  </label>
                </div>
                <p
                  className={`mt-1.5 text-[10px] font-medium ${
                    networkMode === 'company' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {networkMode === 'company' ? (
                    <>
                      ✓ Đang kết nối trong mạng công ty CJ Foods: <strong>Miễn bước xác thực 2FA</strong>.
                    </>
                  ) : (
                    <>
                      ⚠️ Truy cập từ Internet bên ngoài: Bắt buộc{' '}
                      <strong>Xác thực OTP gửi qua Email cá nhân</strong> theo chuẩn Zero Trust.
                    </>
                  )}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Đăng nhập an toàn"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-60"
                  style={{ backgroundColor: '#004B91' }}
                >
                  <span>{loading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}</span> <span>➔</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2 font-bold">
                  {otpChallenge.type === 'email' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  {otpChallenge.type === 'email'
                    ? 'Xác thực Email OTP (Mạng ngoài)'
                    : 'Xác thực 2 bước (TOTP Authenticator)'}
                </div>
                <p className="mt-1">
                  {otpChallenge.message ||
                    (otpChallenge.targetEmail
                      ? `Mã OTP 6 chữ số đã được gửi tới ${otpChallenge.targetEmail}`
                      : 'Nhập mã 6 chữ số từ ứng dụng xác thực của bạn.')}
                </p>
              </div>

              <div>
                <label htmlFor="otpCode" className="mb-1 block text-xs font-bold text-slate-700">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md disabled:opacity-60"
                  style={{ backgroundColor: '#004B91' }}
                >
                  {loading ? 'ĐANG KIỂM TRA...' : 'XÁC NHẬN OTP'}
                </button>
                {otpChallenge.type === 'email' && (
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
    </div>
  );
}
