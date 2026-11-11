import {
  BarChart3,
  Building2,
  Globe2,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Package,
  Shield,
  ShoppingBag,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { MonthYearBar } from './MonthYearBar';
import { TwoFactorSetupModal } from '../../features/auth/TwoFactorSetupModal';

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan (Overview)', icon: BarChart3, end: true },
  { to: '/gt', label: 'Kênh GT — Tổng quan', icon: Store },
  { to: '/gt/routemap', label: 'Kênh GT — Route Map', icon: MapPin },
  { to: '/gt/stock', label: 'Kênh GT — Tồn kho NPP', icon: Package },
  { to: '/gt/ctkm', label: 'Kênh GT — Theo dõi CTKM', icon: Tag },
  { to: '/mt', label: 'Kênh MT (Siêu thị)', icon: ShoppingBag },
  { to: '/b2b', label: 'Kênh B2B (Công nghiệp)', icon: Building2 },
  { to: '/kr', label: 'Kênh KR (Xuất khẩu / HQ)', icon: Globe2 },
  { to: '/reports', label: 'Báo cáo & Xuất Excel', icon: Layers },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);

  const isAdmin = ['admin', 'bod', 'director'].includes((user?.role || '').toLowerCase());

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-orange-500 text-sm font-black text-white shadow">
            CJ
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">CJ Enterprise SNS</p>
            <p className="text-[11px] text-slate-400">Sales Network System v2</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 cj-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-800" />
            <NavLink
              to="/admin/users"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Quản trị IAM / Phân quyền</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-2.5 rounded-lg bg-slate-800/80 px-3 py-2">
          <p className="truncate text-xs font-bold text-white">{user?.fullName || user?.username}</p>
          <p className="truncate text-[11px] text-slate-400">
            {(user?.role || 'USER').toUpperCase()} • {user?.scopeValue || 'Toàn quốc'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setShow2faModal(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
          >
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            Cài 2FA
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-950/60"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-64">{sidebarContent}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-slate-900">CJ Enterprise SNS</span>
          <span className="text-xs font-semibold text-red-600">{user?.username}</span>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 p-4 sm:p-6">
          <MonthYearBar />
          <Outlet />
        </main>
      </div>

      {show2faModal && <TwoFactorSetupModal onClose={() => setShow2faModal(false)} />}
    </div>
  );
}

