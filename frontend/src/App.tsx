import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './state/authStore';
import { alertsApi } from './api/client';

import { Login } from './pages/Login';
import { FieldOverview } from './pages/FieldOverview';
import { WellDetail } from './pages/WellDetail';
import { CssOptimizer } from './pages/CssOptimizer';
import { SrpDiagnostics } from './pages/SrpDiagnostics';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Admin } from './pages/Admin';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  },
});

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);

  const fetchAlertCount = async () => {
    try {
      const res = await alertsApi.list(1, 1, undefined, false);
      setUnreadAlerts(res.total);
    } catch (e) {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlertCount();
      const interval = setInterval(fetchAlertCount, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar alertCount={unreadAlerts} />
      <div className="main-content">
        <Header />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<FieldOverview />} />
            <Route path="/wells/:wellId" element={<WellDetail />} />
            <Route path="/wells/:wellId/css-optimizer" element={<CssOptimizer />} />
            <Route path="/wells/:wellId/srp-diagnostics" element={<SrpDiagnostics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
