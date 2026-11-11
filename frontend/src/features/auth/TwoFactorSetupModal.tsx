import { QrCode, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { authApi } from '../../shared/api/auth.api';

interface TwoFactorSetupModalProps {
  onClose: () => void;
}

export function TwoFactorSetupModal({ onClose }: TwoFactorSetupModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .setup2fa()
      .then((res) => {
        if (!active) return;
        setQrCodeDataUrl(res.qrCodeDataUrl);
        setSecret(res.secret);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Không thể khởi tạo 2FA');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await authApi.verify2faSetup(code.trim());
      setStatusMsg(res.message || 'Kích hoạt 2FA thành công!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Mã TOTP không hợp lệ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <QrCode className="h-4 w-4 text-red-600" />
            Thiết lập bảo mật 2 lớp (Google Authenticator)
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Đang tạo mã QR bảo mật...</p>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {qrCodeDataUrl && (
              <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                <img src={qrCodeDataUrl} alt="2FA QR Code" className="h-44 w-44 rounded-lg bg-white p-2 shadow-sm" />
                {secret && <p className="mt-2 font-mono text-xs text-slate-600">Secret: {secret}</p>}
              </div>
            )}

            {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{errorMsg}</p>}
            {statusMsg && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{statusMsg}</p>
            )}

            <div>
              <label htmlFor="totp-code" className="mb-1 block text-xs font-semibold text-slate-700">
                Nhập mã 6 số từ ứng dụng Authenticator để xác nhận
              </label>
              <input
                id="totp-code"
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center font-mono text-base font-bold tracking-widest outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Kích hoạt 2FA
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

