import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LangProvider } from './context/LangContext';
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
import VariancePage from './pages/management/VariancePage';
import AlertsPage from './pages/management/AlertsPage';
import BudgetingPage from './pages/management/BudgetingPage';
import RecurringPage from './pages/management/RecurringPage';
import DrilldownPage from './pages/management/DrilldownPage';
import ApprovalRulesPage from './pages/management/ApprovalRulesPage';
import OutletDashboard from './pages/outlet/OutletDashboard';
import CashManagement from './pages/outlet/CashManagement';
import SalesSummary from './pages/outlet/SalesSummary';
import PettyCash from './pages/outlet/PettyCash';
import InventoryOutlet from './pages/outlet/InventoryOutlet';
import DailyClosing from './pages/outlet/DailyClosing';
import ExecutiveLayout from './layouts/ExecutiveLayout';
import ExecOverview from './pages/executive/ExecOverview';
import ExecRevenue from './pages/executive/ExecRevenue';
import ExecExpenses from './pages/executive/ExecExpenses';
import ExecOutlets from './pages/executive/ExecOutlets';
import ExecInventory from './pages/executive/ExecInventory';
import ControlTower from './pages/executive/ControlTower';
import AIInsights from './pages/executive/AIInsights';
import AIChat from './pages/executive/AIChat';
import AIForecast from './pages/executive/AIForecast';
import AIAnomalies from './pages/executive/AIAnomalies';
import CashierLayout from './layouts/CashierLayout';
import CashierDashboard from './pages/cashier/CashierDashboard';
import POSPage from './pages/cashier/POSPage';
import OrdersPage from './pages/cashier/OrdersPage';
import ShiftPage from './pages/cashier/ShiftPage';
import KitchenLayout from './layouts/KitchenLayout';
import KitchenDashboard from './pages/kitchen/KitchenDashboard';
import KitchenQueue from './pages/kitchen/KitchenQueue';
import KitchenWaste from './pages/kitchen/KitchenWaste';
import WarehouseLayout from './layouts/WarehouseLayout';
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard';
import WarehouseReceiving from './pages/warehouse/WarehouseReceiving';
import WarehouseTransfers from './pages/warehouse/WarehouseTransfers';
import WarehouseAdjustments from './pages/warehouse/WarehouseAdjustments';
import WarehouseCounts from './pages/warehouse/WarehouseCounts';
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
        <Route path="budgeting" element={<BudgetingPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="closing-monitor" element={<ClosingMonitorPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="recipes" element={<RecipeBOMPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="variance" element={<VariancePage />} />
        <Route path="drilldown" element={<DrilldownPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="approval-rules" element={<ApprovalRulesPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route index element={<Navigate to="dashboard" />} />
      </Route>

      {/* Executive Portal */}
      <Route path="/executive" element={<ProtectedRoute><ExecutiveLayout /></ProtectedRoute>}>
        <Route path="overview" element={<ExecOverview />} />
        <Route path="revenue" element={<ExecRevenue />} />
        <Route path="expenses" element={<ExecExpenses />} />
        <Route path="outlets" element={<ExecOutlets />} />
        <Route path="inventory" element={<ExecInventory />} />
        <Route path="control-tower" element={<ControlTower />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="ai-forecast" element={<AIForecast />} />
        <Route path="ai-anomalies" element={<AIAnomalies />} />
        <Route index element={<Navigate to="overview" />} />
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

      {/* Cashier Portal */}
      <Route path="/cashier" element={<ProtectedRoute><CashierLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<CashierDashboard />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="shift" element={<ShiftPage />} />
        <Route index element={<Navigate to="dashboard" />} />
      </Route>

      {/* Kitchen Portal */}
      <Route path="/kitchen" element={<ProtectedRoute><KitchenLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<KitchenDashboard />} />
        <Route path="queue" element={<KitchenQueue />} />
        <Route path="waste" element={<KitchenWaste />} />
        <Route index element={<Navigate to="queue" />} />
      </Route>

      {/* Warehouse Portal */}
      <Route path="/warehouse" element={<ProtectedRoute><WarehouseLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<WarehouseDashboard />} />
        <Route path="receiving" element={<WarehouseReceiving />} />
        <Route path="transfers" element={<WarehouseTransfers />} />
        <Route path="adjustments" element={<WarehouseAdjustments />} />
        <Route path="counts" element={<WarehouseCounts />} />
        <Route index element={<Navigate to="dashboard" />} />
      </Route>

      {/* Coming Soon Portals */}
      <Route path="/portal/:portal" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="*" element={<Navigate to={user ? "/portal-select" : "/login"} />} />
    </Routes>
  );
}

import CommandPalette from './components/common/CommandPalette';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
              <AppRoutes />
              <CommandPalette />
              <Toaster position="top-right" richColors />
            </div>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
