import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import PortalSelector from './pages/PortalSelector';
import ComingSoon from './pages/ComingSoon';
import ManagementLayout from './layouts/ManagementLayout';
import OutletLayout from './layouts/OutletLayout';
import Dashboard from './pages/management/Dashboard';
import FinancePage from './pages/management/FinancePage';
import InventoryPage from './pages/management/InventoryPage';
import ReportsPage from './pages/management/ReportsPage';
import AdminPage from './pages/management/AdminPage';
import ApprovalsPage from './pages/management/ApprovalsPage';
import AuditTrailPage from './pages/management/AuditTrailPage';
import COAPage from './pages/management/COAPage';
import JournalEntriesPage from './pages/management/JournalEntriesPage';
import ReconciliationPage from './pages/management/ReconciliationPage';
import ClosingMonitorPage from './pages/management/ClosingMonitorPage';
import RecipeBOMPage from './pages/management/RecipeBOMPage';
import ProductionPage from './pages/management/ProductionPage';
import OutletDashboard from './pages/outlet/OutletDashboard';
import CashManagement from './pages/outlet/CashManagement';
import SalesSummary from './pages/outlet/SalesSummary';
import PettyCash from './pages/outlet/PettyCash';
import InventoryOutlet from './pages/outlet/InventoryOutlet';
import DailyClosing from './pages/outlet/DailyClosing';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/portal-select" /> : <LoginPage />} />
      <Route path="/portal-select" element={<ProtectedRoute><PortalSelector /></ProtectedRoute>} />
      
      {/* Management Portal */}
      <Route path="/management" element={<ProtectedRoute><ManagementLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="coa" element={<COAPage />} />
        <Route path="journals" element={<JournalEntriesPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="closing-monitor" element={<ClosingMonitorPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="recipes" element={<RecipeBOMPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route index element={<Navigate to="dashboard" />} />
      </Route>

      {/* Outlet Portal */}
      <Route path="/outlet" element={<ProtectedRoute><OutletLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<OutletDashboard />} />
        <Route path="cash" element={<CashManagement />} />
        <Route path="sales" element={<SalesSummary />} />
        <Route path="petty-cash" element={<PettyCash />} />
        <Route path="inventory" element={<InventoryOutlet />} />
        <Route path="closing" element={<DailyClosing />} />
        <Route index element={<Navigate to="dashboard" />} />
      </Route>

      {/* Coming Soon Portals */}
      <Route path="/portal/:portal" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="*" element={<Navigate to={user ? "/portal-select" : "/login"} />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
