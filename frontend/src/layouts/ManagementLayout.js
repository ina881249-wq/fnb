import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import {
  LayoutDashboard, DollarSign, Package, FileText, Settings, CheckSquare,
  ClipboardList, ChevronLeft, ChevronRight, LogOut, Bell, Building2, ChefHat, Menu, X, Factory
} from 'lucide-react';

const navItems = [
  { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Executive' },
  { to: '/management/coa', label: 'Chart of Accounts', icon: DollarSign, section: 'Finance' },
  { to: '/management/journals', label: 'Journal Entries', icon: DollarSign, section: 'Finance' },
  { to: '/management/finance', label: 'Cash & Bank', icon: DollarSign, section: 'Finance' },
  { to: '/management/reconciliation', label: 'Reconciliation', icon: DollarSign, section: 'Finance' },
  { to: '/management/inventory', label: 'Items & Stock', icon: Package, section: 'Inventory' },
  { to: '/management/recipes', label: 'Recipe & BOM', icon: ChefHat, section: 'Inventory' },
  { to: '/management/production', label: 'Production Orders', icon: Factory, section: 'Inventory' },
  { to: '/management/reports', label: 'Reports', icon: FileText, section: 'Reports' },
  { to: '/management/closing-monitor', label: 'Closing Monitor', icon: CheckSquare, section: 'Operations' },
  { to: '/management/approvals', label: 'Approvals', icon: CheckSquare, section: 'Operations' },
  { to: '/management/admin', label: 'Admin', icon: Settings, section: 'Admin' },
  { to: '/management/audit', label: 'Audit Trail', icon: ClipboardList, section: 'Admin' },
];

export default function ManagementLayout() {
  const { user, logout, outlets, currentOutlet, selectOutlet } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  let currentSection = '';

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen z-50 transition-all duration-300 bg-[hsl(222,35%,8%)] border-r border-[var(--glass-border)] flex flex-col
        ${collapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-[var(--topbar-height)] flex items-center px-4 gap-3 border-b border-[var(--glass-border)]">
          <div className="w-9 h-9 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>F&B ERP</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Management</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-2 space-y-0.5">
            {navItems.map((item) => {
              const showSection = item.section !== currentSection;
              currentSection = item.section;
              const Icon = item.icon;
              return (
                <React.Fragment key={item.to}>
                  {showSection && !collapsed && (
                    <div className="px-3 pt-4 pb-1">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] font-semibold">{item.section}</span>
                    </div>
                  )}
                  <NavLink
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative
                      ${isActive
                        ? 'bg-white/8 text-[hsl(var(--foreground))] font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:rounded-full before:bg-[hsl(var(--primary))]'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5'}`
                    }
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </React.Fragment>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse toggle */}
        <div className="border-t border-[var(--glass-border)] p-2 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-[hsl(var(--muted-foreground))]"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[var(--topbar-height)] border-b border-[var(--glass-border)] flex items-center justify-between px-4 lg:px-6 bg-[hsl(222,35%,8%)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <Select value={currentOutlet || 'all'} onValueChange={(val) => selectOutlet(val === 'all' ? null : val)}>
              <SelectTrigger className="w-[220px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-sm" data-testid="outlet-scope-chip">
                <Building2 className="w-3.5 h-3.5 mr-2 text-[hsl(var(--primary))]" />
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative" data-testid="notifications-bell">
              <Bell className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 bg-[var(--glass-border)]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-[hsl(var(--primary))]">{user?.name?.charAt(0)}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium">{user?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }} data-testid="topbar-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
