import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Globe,
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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { TwoFactorSetupModal } from '../../features/auth/TwoFactorSetupModal';
import { useAuthStore } from '../stores/auth.store';
import { usePayloadsStore } from '../stores/payloads.store';
import { MonthYearBar } from './MonthYearBar';

const GT_SUB_ITEMS = [
  { to: '/gt', label: '2.1 Tổng quan GT', icon: Store, end: true },
  { to: '/gt/routemap', label: '2.2 Route Map DMS', icon: MapPin, end: false },
  { to: '/gt/stock', label: '2.3 Tồn kho NPP', icon: Package, end: false },
  { to: '/gt/ctkm', label: '2.4 Theo dõi CTKM', icon: Tag, end: false },
];

const ROUTE_TITLES: Record<string, { breadcrumb: string; title: string }> = {
  '/': { breadcrumb: 'Pages / Dashboard', title: 'Commercial Overview (Sell-in 4 Kênh: GT, MT, B2B, KR)' },
  '/gt': { breadcrumb: 'Pages / Kênh GT / Tổng quan', title: 'Kênh GT — Phân tích Hiệu quả Bán hàng' },
  '/gt/routemap': { breadcrumb: 'Pages / Kênh GT / Route Map', title: 'Kênh GT — Bản đồ Tuyến bán hàng DMS' },
  '/gt/stock': { breadcrumb: 'Pages / Kênh GT / Tồn kho', title: 'Kênh GT — Tồn kho Nhà phân phối' },
  '/gt/ctkm': { breadcrumb: 'Pages / Kênh GT / CTKM', title: 'Kênh GT — Theo dõi Chương trình Khuyến mãi' },
  '/mt': { breadcrumb: 'Pages / Kênh MT', title: 'Kênh MT — Hệ thống Siêu thị & Key Accounts' },
  '/b2b': { breadcrumb: 'Pages / Kênh B2B', title: 'Kênh B2B — Khách hàng Công nghiệp & Thực phẩm' },
  '/kr': { breadcrumb: 'Pages / Kênh KR', title: 'Kênh KR — Xuất khẩu & Đối tác Hàn Quốc' },
  '/reports': { breadcrumb: 'Pages / Báo cáo', title: 'Tổng hợp Báo cáo & Xuất Excel' },
  '/admin/users': { breadcrumb: 'Pages / Quản trị IAM', title: 'Quản trị Người dùng, Phân quyền & Bảo mật' },
};

export function AppLayout() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const dbRefreshDate = usePayloadsStore((s) => s.dbRefreshDate);
  const syncMetadata = usePayloadsStore((s) => s.syncMetadata);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [gtExpanded, setGtExpanded] = useState(true);
  const [show2faModal, setShow2faModal] = useState(false);

  useEffect(() => {
    void syncMetadata();
  }, [syncMetadata]);

  const isAdmin = ['admin', 'bod', 'director'].includes((user?.role || '').toLowerCase());
  const routeMeta = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/'];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
      isActive
        ? 'bg-[#004B91] text-white shadow-sm'
        : 'text-slate-600 hover:bg-sky-50 hover:text-[#004B91]'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#004B91] text-sm font-black text-white shadow-sm ring-2 ring-[#E31837]/20">
            CJ
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black tracking-tight text-slate-800">SNS - Sales Network System</p>
            <p className="truncate text-[11px] font-semibold text-slate-500">CJ Foods Vietnam • v2 React</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 cj-scrollbar">
        <NavLink to="/" end onClick={() => setMobileOpen(false)} className={navLinkClass}>
          <BarChart3 className="h-4 w-4 shrink-0" />
          <span>1. Dashboard</span>
        </NavLink>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setGtExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-sky-50 hover:text-[#004B91]"
          >
            <span className="flex items-center gap-2.5">
              <Store className="h-4 w-4 shrink-0 text-purple-600" />
              <span>2. Kênh GT</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-700">
                {GT_SUB_ITEMS.length}
              </span>
              {gtExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          </button>

          {gtExpanded && (
            <div className="ml-3 space-y-0.5 border-l-2 border-slate-100 pl-2">
              {GT_SUB_ITEMS.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    end={sub.end}
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass}
                  >
                    <SubIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{sub.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        <NavLink to="/mt" onClick={() => setMobileOpen(false)} className={navLinkClass}>
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span>3. Kênh MT</span>
        </NavLink>

        <NavLink to="/b2b" onClick={() => setMobileOpen(false)} className={navLinkClass}>
          <Building2 className="h-4 w-4 shrink-0" />
          <span>4. Kênh B2B</span>
        </NavLink>

        <NavLink to="/kr" onClick={() => setMobileOpen(false)} className={navLinkClass}>
          <Globe2 className="h-4 w-4 shrink-0" />
          <span>5. Kênh KR</span>
        </NavLink>

        <NavLink to="/reports" onClick={() => setMobileOpen(false)} className={navLinkClass}>
          <Layers className="h-4 w-4 shrink-0" />
          <span>6. Báo cáo & Xuất Excel</span>
        </NavLink>

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-200" />
            <NavLink to="/admin/users" onClick={() => setMobileOpen(false)} className={navLinkClass}>
              <Users className="h-4 w-4 shrink-0" />
              <span>Quản trị IAM / Phân quyền</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="truncate text-xs font-bold text-slate-900">{user?.fullName || user?.username}</p>
          <p className="truncate text-[11px] font-medium text-slate-500">
            {(user?.role || 'USER').toUpperCase()} • {user?.scopeValue || 'Toàn quốc'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setShow2faModal(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#004B91]"
          >
            <Shield className="h-3.5 w-3.5 text-[#004B91]" />
            Cài 2FA
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-[#E31837] hover:bg-red-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
        <a
          href="/"
          className="mt-2 block text-center text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-[#004B91] hover:underline"
        >
          ← Mở giao diện Classic (/)
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f7fe]">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-64">{sidebarContent}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-700 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="rounded border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-sky-800">
                    {routeMeta.breadcrumb}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">● Trực Tuyến</span>
                  {dbRefreshDate && (
                    <span className="hidden text-[11px] font-medium text-slate-500 sm:inline">
                      • Cập nhật DB: {dbRefreshDate}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-black tracking-tight text-slate-900 md:text-base">{routeMeta.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <select
                  aria-label="Language"
                  value={i18n.language}
                  onChange={(e) => void i18n.changeLanguage(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="vi">VI</option>
                  <option value="en">EN</option>
                  <option value="ko">KO</option>
                </select>
              </div>
              <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#004B91] sm:inline-block">
                {user?.username}
              </span>
            </div>
          </div>
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
