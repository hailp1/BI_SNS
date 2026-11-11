import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { OverviewPage } from './features/dashboard/OverviewPage';
import { AppLayout } from './shared/components/AppLayout';
import { useAuthStore } from './shared/stores/auth.store';

const GtOverviewPage = lazy(() => import('./features/gt/GtOverviewPage').then((m) => ({ default: m.GtOverviewPage })));
const GtRouteMapPage = lazy(() => import('./features/gt/GtRouteMapPage').then((m) => ({ default: m.GtRouteMapPage })));
const GtStockPage = lazy(() => import('./features/gt/GtStockPage').then((m) => ({ default: m.GtStockPage })));
const GtCtkmPage = lazy(() => import('./features/gt/GtCtkmPage').then((m) => ({ default: m.GtCtkmPage })));
const MtOverviewPage = lazy(() => import('./features/mt/MtOverviewPage').then((m) => ({ default: m.MtOverviewPage })));
const B2bOverviewPage = lazy(() => import('./features/b2b/B2bOverviewPage').then((m) => ({ default: m.B2bOverviewPage })));
const KrOverviewPage = lazy(() => import('./features/kr/KrOverviewPage').then((m) => ({ default: m.KrOverviewPage })));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const UserManagementPage = lazy(() =>
  import('./features/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function RouteFallback() {
  return <div className="py-12 text-center text-sm text-slate-400">Đang tải phân hệ...</div>;
}

function AuthenticatedApp() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm font-semibold text-white">
        Đang khởi tạo phiên làm việc bảo mật CJ SNS...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="gt" element={<GtOverviewPage />} />
          <Route path="gt/routemap" element={<GtRouteMapPage />} />
          <Route path="gt/stock" element={<GtStockPage />} />
          <Route path="gt/ctkm" element={<GtCtkmPage />} />
          <Route path="mt" element={<MtOverviewPage />} />
          <Route path="b2b" element={<B2bOverviewPage />} />
          <Route path="kr" element={<KrOverviewPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin/users" element={<UserManagementPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

