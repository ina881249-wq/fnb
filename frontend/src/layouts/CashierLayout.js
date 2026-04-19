import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import api from '../api/client';
import { Button } from '../components/ui/button';
import NotificationBell from '../components/common/NotificationBell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  LayoutDashboard, ShoppingCart, Receipt, Clock, Store,
  LogOut, ArrowLeft, Sun, Moon, Languages, Play, Square
} from 'lucide-react';

const navItems = [
  { to: '/cashier/dashboard', label: 'Dashboard', labelId: 'Dasbor', icon: LayoutDashboard },
  { to: '/cashier/pos', label: 'POS', labelId: 'POS', icon: ShoppingCart },
  { to: '/cashier/orders', label: 'Orders', labelId: 'Pesanan', icon: Receipt },
  { to: '/cashier/shift', label: 'Shift', labelId: 'Shift', icon: Clock },
];

export default function CashierLayout() {
  const { user, logout, outlets, currentOutlet, selectOutlet, hasOutletAccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, changeLang } = useLang();
  const navigate = useNavigate();
  const [currentShift, setCurrentShift] = useState(null);

  // Auto-select first accessible outlet
  useEffect(() => {
    if (!currentOutlet && outlets.length > 0) {
      const accessible = outlets.find(o => hasOutletAccess(o.id));
      if (accessible) selectOutlet(accessible.id);
    }
  }, [currentOutlet, outlets, hasOutletAccess, selectOutlet]);

  // Fetch current shift status periodically
  useEffect(() => {
    let cancelled = false;
    const fetchShift = async () => {
      if (!currentOutlet) { setCurrentShift(null); return; }
      try {
        const res = await api.get('/api/cashier/shifts/current', { params: { outlet_id: currentOutlet } });
        if (!cancelled) setCurrentShift(res.data.shift);
      } catch (e) { /* ignore */ }
    };
    fetchShift();
    const h = setInterval(fetchShift, 15000);
    return () => { cancelled = true; clearInterval(h); };
  }, [currentOutlet]);

  const currentOutletData = outlets.find(o => o.id === currentOutlet);
  const accessibleOutlets = outlets.filter(o => hasOutletAccess(o.id));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4 lg:px-6 bg-[hsl(var(--background))]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/portal-select')} className="gap-1.5" data-testid="cashier-back-to-portal">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Portal</span>
          </Button>
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[hsl(var(--primary))]" />
            {accessibleOutlets.length > 1 ? (
              <Select value={currentOutlet || ''} onValueChange={selectOutlet}>
                <SelectTrigger className="h-8 w-[220px] bg-[var(--glass-bg)] border-[var(--glass-border)] text-sm" data-testid="cashier-outlet-selector">
                  <SelectValue placeholder="Pilih Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleOutlets.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-medium">{currentOutletData?.name || (lang === 'id' ? 'Pilih Outlet' : 'Select Outlet')}</span>
            )}
          </div>

          {/* Shift indicator */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[var(--glass-border)] ml-1">
            {currentShift ? (
              <Badge variant="outline" className="gap-1.5 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10" data-testid="cashier-shift-indicator-open">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                {currentShift.shift_number}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-400 bg-amber-500/10" data-testid="cashier-shift-indicator-closed">
                <Square className="w-3 h-3" /> {lang === 'id' ? 'Shift belum dibuka' : 'Shift not started'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} className="h-8 px-2 text-xs gap-1" data-testid="cashier-lang-toggle">
            <Languages className="w-3.5 h-3.5" /><span className="hidden sm:inline uppercase font-semibold">{lang}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0" data-testid="cashier-theme-toggle">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-[hsl(var(--primary))]">{user?.name?.charAt(0)}</span>
            </div>
            <span className="text-xs hidden lg:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }} data-testid="cashier-logout">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sub-nav */}
      <nav className="border-b border-[var(--glass-border)] bg-[hsl(var(--card))]">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5'}`
                  }
                  data-testid={`cashier-nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{lang === 'id' ? item.labelId : item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto">
          <Outlet context={{ currentShift, setCurrentShift }} />
        </div>
      </main>
    </div>
  );
}
