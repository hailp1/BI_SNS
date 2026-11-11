import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ExcelJS from 'exceljs';
import { Key, Lock, Plus, Trash2, Unlock, Upload, UserCheck, X } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { usersApi } from '../../shared/api/users.api';
import { DataTable, type ColumnDef } from '../../shared/components/DataTable';
import type { ManagedUser, UpsertUserPayload } from '../../shared/types/auth';

const EMPTY_FORM: UpsertUserPayload = {
  username: '',
  full_name: '',
  email: '',
  role: 'staff',
  channel: 'GT',
  scope_level: 'office',
  scope_value: '',
  password: '',
};

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<UpsertUserPayload>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.list(),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertUserPayload) => usersApi.upsert(payload),
    onSuccess: (res) => {
      invalidate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
      const msg = res.temporaryPassword
        ? `${res.message} — Mật khẩu tạm: ${res.temporaryPassword}`
        : res.message || 'Lưu tài khoản thành công';
      setFeedback({ tone: 'ok', text: msg });
    },
    onError: (err: Error) => setFeedback({ tone: 'err', text: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ username, isActive }: { username: string; isActive: boolean }) =>
      usersApi.updateStatus(username, isActive),
    onSuccess: (res) => {
      invalidate();
      setFeedback({ tone: 'ok', text: res.message });
    },
    onError: (err: Error) => setFeedback({ tone: 'err', text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (username: string) => usersApi.remove(username),
    onSuccess: (res) => {
      invalidate();
      setFeedback({ tone: 'ok', text: res.message });
    },
    onError: (err: Error) => setFeedback({ tone: 'err', text: err.message }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (!payload.email) delete payload.email;
    upsertMutation.mutate(payload);
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('File Excel không có sheet hợp lệ');

      const importedUsers: UpsertUserPayload[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const username = String(row.getCell(1).value || '').trim();
        const fullName = String(row.getCell(2).value || '').trim();
        if (!username || !fullName) return;
        importedUsers.push({
          username,
          full_name: fullName,
          email: String(row.getCell(3).value || '').trim() || undefined,
          role: String(row.getCell(4).value || 'staff').trim(),
          channel: String(row.getCell(5).value || 'all').trim(),
          scope_level: String(row.getCell(6).value || 'all').trim(),
          scope_value: String(row.getCell(7).value || 'Toàn Quốc').trim(),
        });
      });

      if (importedUsers.length === 0) {
        throw new Error('Không tìm thấy dòng nhân viên hợp lệ (Cột: username, full_name, email, role, channel, scope_level, scope_value)');
      }

      const res = await usersApi.bulkImport(importedUsers);
      invalidate();
      setFeedback({ tone: 'ok', text: res.message || `Đã nhập ${importedUsers.length} tài khoản` });
    } catch (err) {
      setFeedback({ tone: 'err', text: err instanceof Error ? err.message : 'Lỗi đọc file Excel' });
    }
  };

  const handleResetPassword = async (username: string) => {
    const newPwd = window.prompt(`Nhập mật khẩu mới (tối thiểu 8 ký tự) cho ${username}:`);
    if (!newPwd) return;
    if (newPwd.length < 8) {
      setFeedback({ tone: 'err', text: 'Mật khẩu phải có ít nhất 8 ký tự.' });
      return;
    }
    try {
      const res = await usersApi.resetPassword(username, newPwd);
      setFeedback({ tone: 'ok', text: res.message });
    } catch (err) {
      setFeedback({ tone: 'err', text: err instanceof Error ? err.message : 'Lỗi đặt lại mật khẩu' });
    }
  };

  const columns: ColumnDef<ManagedUser>[] = [
    {
      key: 'username',
      header: 'Username',
      sortValue: (u) => u.username,
      render: (u) => <span className="font-mono text-xs font-bold text-slate-900">{u.username}</span>,
    },
    { key: 'full_name', header: 'Họ tên', sortValue: (u) => u.full_name, render: (u) => u.full_name },
    { key: 'email', header: 'Email OTP', render: (u) => u.email || <span className="text-slate-400">Chưa gắn</span> },
    {
      key: 'role',
      header: 'Vai trò / Kênh',
      render: (u) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {u.role.toUpperCase()} • {u.channel}
        </span>
      ),
    },
    {
      key: 'scope_value',
      header: 'Phạm vi RLS',
      render: (u) => `${u.scope_level}: ${u.scope_value}`,
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      align: 'center',
      render: (u) =>
        u.is_active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
            <UserCheck className="h-3 w-3" /> Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
            <Lock className="h-3 w-3" /> Đã khóa
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (u) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            title="Đặt lại mật khẩu"
            onClick={() => void handleResetPassword(u.username)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Key className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
            onClick={() => statusMutation.mutate({ username: u.username, isActive: !u.is_active })}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
          >
            {u.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title="Xóa tài khoản"
            onClick={() => {
              if (window.confirm(`Xóa tài khoản ${u.username}?`)) {
                deleteMutation.mutate(u.username);
              }
            }}
            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản trị Người dùng & Phân quyền Zero-Trust (IAM)</h1>
          <p className="text-xs text-slate-500">Quản lý RBAC, Scope RLS và Bulk Import từ Excel</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleExcelUpload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm / Cập nhật User
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            feedback.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <DataTable
        data={usersQuery.data || []}
        columns={columns}
        searchPlaceholder="Tìm username, họ tên, phạm vi..."
        searchFilter={(u, q) =>
          u.username.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q) ||
          u.scope_value.toLowerCase().includes(q)
        }
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Tạo / Cập nhật Tài khoản IAM</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Username *</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Họ và tên *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Email (nhận OTP)</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Mật khẩu (tùy chọn, ≥ 8 ký tự)</label>
                <input
                  type="password"
                  minLength={8}
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Bỏ trống để hệ thống tự sinh"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Vai trò (Role)</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="admin">admin</option>
                  <option value="bod">bod</option>
                  <option value="director">director</option>
                  <option value="rsm">rsm</option>
                  <option value="asm">asm</option>
                  <option value="gsbh">gsbh</option>
                  <option value="npp">npp</option>
                  <option value="staff">staff</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kênh</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="all">ALL</option>
                  <option value="GT">GT</option>
                  <option value="MT">MT</option>
                  <option value="B2B">B2B</option>
                  <option value="KR">KR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Cấp phạm vi (Scope Level)</label>
                <select
                  value={form.scope_level}
                  onChange={(e) => setForm({ ...form, scope_level: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="all">all</option>
                  <option value="mien">mien</option>
                  <option value="vung">vung</option>
                  <option value="area">area</option>
                  <option value="office">office</option>
                  <option value="npp">npp</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Giá trị phạm vi *</label>
                <input
                  required
                  value={form.scope_value}
                  onChange={(e) => setForm({ ...form, scope_value: e.target.value })}
                  placeholder="VD: HCM 1, MIỀN NAM, Toàn Quốc"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  {upsertMutation.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

