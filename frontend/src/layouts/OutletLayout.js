import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  LayoutDashboard, DollarSign, FileText, Package, Receipt, Store,
  LogOut, Bell, ArrowLeft, Menu, X
} from 'lucide-react';

const outletNavItems = [
  { to: '/outlet/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/outlet/cash', label: 'Cash Management', icon: DollarSign },
  { to: '/outlet/sales', label: 'Sales Summary', icon: FileText },
  { to: '/outlet/petty-cash', label: 'Petty Cash', icon: Receipt },
  { to: '/outlet/inventory', label: 'Inventory', icon: Package },
];

export default function OutletLayout() {
  const { user, logout, outlets, currentOutlet, selectOutlet, hasOutletAccess } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auto-select first accessible outlet if none selected
  useEffect(() => {
    if (!currentOutlet && outlets.length > 0) {
      const accessible = outlets.find(o => hasOutletAccess(o.id));
      if (accessible) {
        selectOutlet(accessible.id);
      } else if (outlets.length === 1) {
        // If only one outlet visible, auto-select it
        selectOutlet(outlets[0].id);
      }
    }
  }, [currentOutlet, outlets, hasOutletAccess, selectOutlet]);

  const currentOutletData = outlets.find(o => o.id === currentOutlet);
  const accessibleOutlets = outlets.filter(o => hasOutletAccess(o.id));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4 lg:px-6 bg-[hsl(222,35%,8%)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/portal-select')} className="gap-1.5" data-testid="back-to-portal">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Portal</span>
          </Button>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[hsl(var(--primary))]" />
            {accessibleOutlets.length > 1 ? (
              <Select value={currentOutlet || ''} onValueChange={selectOutlet}>
                <SelectTrigger className="h-8 w-[200px] bg-[var(--glass-bg)] border-[var(--glass-border)] text-sm" data-testid="outlet-selector">
                  <SelectValue placeholder="Select Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleOutlets.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium">{currentOutletData?.name || 'Select Outlet'}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="outlet-notifications">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-[hsl(var(--primary))]">{user?.name?.charAt(0)}</span>
            </div>
            <span className="text-xs">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }} data-testid="outlet-logout">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sub-navigation */}
      <nav className={`border-b border-[var(--glass-border)] bg-[hsl(222,35%,7%)] ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {outletNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5'}`
                  }
                  data-testid={`outlet-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
