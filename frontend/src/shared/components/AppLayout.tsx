import { ChevronDown, Globe, LogOut, Menu, Shield, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TwoFactorSetupModal } from '../../features/auth/TwoFactorSetupModal';
import { CJ_LOGO_DATA_URI } from '../constants/brand';
import { useAuthStore } from '../stores/auth.store';
import { useFiltersStore } from '../stores/filters.store';
import { usePayloadsStore } from '../stores/payloads.store';
import { MonthYearBar } from './MonthYearBar';

const GT_SUB_ITEMS = [
  { to: '/gt', label: 'Tổng quan GT', icon: '📑', end: true },
  { to: '/gt/fundamental', label: 'Fundamental', icon: '📊', end: false },
  { to: '/gt/productivity', label: 'Hiệu Suất', icon: '⚡', end: false },
  { to: '/gt/route', label: 'Thực Thi Tuyến', icon: '🗺️', end: false },
  { to: '/gt/routemap', label: 'Bản Đồ Tuyến & Golden', icon: '📍', end: false },
  { to: '/gt/posm', label: 'Hiệu Quả POSM', icon: '📦', end: false },
  { to: '/gt/ctkm', label: 'Theo Dõi CTKM', icon: '🎁', end: false },
];

const ROUTE_TITLES: Record<string, { breadcrumb: string; title: string }> = {
  '/': { breadcrumb: 'Pages / Dashboard', title: 'Commercial Overview (Sell-in 4 Kênh: GT, MT, B2B, KR)' },
  '/gt': { breadcrumb: 'Pages / Kênh GT / Tổng quan', title: 'Kênh GT — Phân tích Hiệu quả Bán hàng' },
  '/gt/fundamental': { breadcrumb: 'Pages / Kênh GT / Fundamental', title: 'Kênh GT — Chỉ số Fundamental' },
  '/gt/productivity': { breadcrumb: 'Pages / Kênh GT / Hiệu Suất', title: 'Kênh GT — Hiệu suất Đội ngũ NVBH' },
  '/gt/route': { breadcrumb: 'Pages / Kênh GT / Thực Thi Tuyến', title: 'Kênh GT — Thực thi Tuyến bán hàng' },
  '/gt/routemap': { breadcrumb: 'Pages / Kênh GT / Route Map', title: 'Kênh GT — Bản đồ Tuyến bán hàng & Golden' },
  '/gt/posm': { breadcrumb: 'Pages / Kênh GT / POSM & Tồn kho', title: 'Kênh GT — Hiệu quả POSM & Tồn kho NPP' },
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
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const year = useFiltersStore((s) => s.year);
  const setYear = useFiltersStore((s) => s.setYear);
  const dbRefreshDate = usePayloadsStore((s) => s.dbRefreshDate);
  const syncMetadata = usePayloadsStore((s) => s.syncMetadata);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [gtExpanded, setGtExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);

  useEffect(() => {
    void syncMetadata();
  }, [syncMetadata]);

  useEffect(() => {
    if (location.pathname.startsWith('/gt')) {
      setGtExpanded(true);
    }
  }, [location.pathname]);

  const isAdmin = ['admin', 'bod', 'director'].includes((user?.role || '').toLowerCase());
  const routeMeta = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/'];

  const navItemClass = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`;
  const gtSubItemClass = ({ isActive }: { isActive: boolean }) => `gt-tree-subitem ${isActive ? 'active' : ''}`;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white shadow-xl">
      {/* Brand Header matching web_app/index.html */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={CJ_LOGO_DATA_URI} alt="CJ Logo" className="h-9 w-auto shrink-0 object-contain" />
          <div className="min-w-0">
            <span
              className="block truncate text-xs font-black tracking-tight text-slate-800"
              title="SNS - Sales Network System"
            >
              SNS - Sales Network System
            </span>
            <span
              style={{ fontSize: '13px', lineHeight: '16px' }}
              className="mt-0.5 block truncate font-semibold tracking-tight text-slate-500"
              title="Copyright © 2026 Hien SE"
            >
              Copyright © 2026 Hien SE
            </span>
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

      {/* Exact 5 Navigation Items matching web_app/index.html */}
      <nav className="cj-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink to="/" end onClick={() => setMobileOpen(false)} className={navItemClass}>
          <span>📊</span> <span>1. Dashboard</span>
        </NavLink>

        {/* 2. KÊNH GT TREE ACCORDION */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setGtExpanded((v) => !v)}
            className={`nav-item group flex w-full cursor-pointer items-center justify-between ${
              location.pathname.startsWith('/gt') ? 'active' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span>📍</span> <span>2. Kênh GT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="gt-tree-badge rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-700 transition-colors">
                7
              </span>
              <svg
                id="nav-gt-chevron"
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
                  gtExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {gtExpanded && (
            <div className="ml-3 space-y-1 border-l-2 border-purple-200 py-1 pl-2.5">
              {GT_SUB_ITEMS.map((sub) => (
                <NavLink
                  key={sub.to}
                  to={sub.to}
                  end={sub.end}
                  onClick={() => setMobileOpen(false)}
                  className={gtSubItemClass}
                  title={sub.label}
                >
                  <span className="tree-icon">{sub.icon}</span>
                  <span className="truncate">{sub.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/mt" onClick={() => setMobileOpen(false)} className={navItemClass}>
          <span>🏬</span> <span>3. Kênh MT</span>
        </NavLink>

        <NavLink to="/b2b" onClick={() => setMobileOpen(false)} className={navItemClass}>
          <span>🍽️</span> <span>4. Kênh B2B</span>
        </NavLink>

        <NavLink to="/kr" onClick={() => setMobileOpen(false)} className={navItemClass}>
          <span>🏪</span> <span>5. Kênh KR</span>
        </NavLink>
      </nav>

      {/* Clean Footer matching web_app/index.html */}
      <div className="border-t border-slate-100 p-4 text-center text-[10px] text-slate-400">
        <p className="font-bold text-slate-600">CJ Foods Vietnam</p>
        <p>4 Kênh Chuẩn: GT | MT | B2B | KR</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <aside id="sidebar-nav" className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white shadow-xl">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-60">{sidebarContent}</div>
        </div>
      )}

      <div className="main-content-wrapper ml-60 flex min-h-screen min-w-0 flex-1 flex-col">
        <header id="top-header-filter" className="top-header-filter flex w-full flex-col gap-2.5 px-6 py-3">
          {/* Row 1: Title, Year, Export & User Menu */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-700 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="hidden rounded border border-sky-200 bg-sky-100 px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-sky-800 sm:inline-block">
                    {routeMeta.breadcrumb}
                  </span>
                  <span className="hidden text-[10px] font-bold text-emerald-600 sm:inline">● Trực Tuyến</span>
                  {dbRefreshDate && (
                    <span className="hidden text-[10px] font-medium text-slate-500 md:inline">
                      • DB: {dbRefreshDate}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-black leading-snug tracking-tight text-slate-900 md:text-base">
                  {routeMeta.title}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label="Chọn năm"
                className="header-dropdown border-sky-300 bg-sky-50/50 font-black text-sky-800 shadow-sm"
              >
                <option value="2026">Năm 2026</option>
                <option value="2025">Năm 2025</option>
              </select>

              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black text-white shadow-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#FFFFFF' }}
                title="Xuất báo cáo Excel (.xlsx)"
              >
                <span>📥</span> <span>Xuất Báo Cáo</span>
              </button>

              {/* User Account Dropdown (IAM, 2FA, Language, Classic, Logout) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#004B91] text-[10px] font-black text-white">
                    {(user?.username || 'U').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[90px] truncate sm:inline">{user?.username}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="mb-1.5 border-b border-slate-100 px-2.5 pb-2">
                      <p className="truncate text-xs font-black text-slate-800">{user?.fullName || user?.username}</p>
                      <p className="truncate text-[10px] font-semibold text-slate-500">
                        {(user?.role || 'USER').toUpperCase()} • {user?.scopeValue || 'Toàn Quốc'}
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/admin/users');
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#004B91]"
                      >
                        <Users className="h-3.5 w-3.5 text-purple-600" />
                        Quản trị IAM / Phân quyền
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShow2faModal(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-[#004B91]"
                    >
                      <Shield className="h-3.5 w-3.5 text-[#004B91]" />
                      Cài đặt bảo mật 2FA
                    </button>

                    <div className="my-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-slate-500" /> Ngôn ngữ
                      </span>
                      <select
                        aria-label="Language"
                        value={i18n.language}
                        onChange={(e) => void i18n.changeLanguage(e.target.value)}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-bold text-slate-800"
                      >
                        <option value="vi">VI</option>
                        <option value="en">EN</option>
                        <option value="ko">KO</option>
                      </select>
                    </div>

                    <a
                      href="/"
                      className="block rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                    >
                      ← Mở bản Classic (/)
                    </a>

                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-2.5 pt-2 pb-1.5 text-left text-xs font-bold text-[#E31837] hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <MonthYearBar />
        </header>

        <main className="mx-auto w-full max-w-full flex-1 space-y-6 px-4 pb-6 pt-3 lg:px-8">
          <Outlet />
        </main>
      </div>

      {show2faModal && <TwoFactorSetupModal onClose={() => setShow2faModal(false)} />}
    </div>
  );
}
