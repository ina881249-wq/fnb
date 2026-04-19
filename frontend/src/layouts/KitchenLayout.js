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
  LayoutDashboard, ClipboardList, Trash2, Store,
  LogOut, ArrowLeft, Sun, Moon, Languages, ChefHat
} from 'lucide-react';

const navItems = [
  { to: '/kitchen/dashboard', label: 'Dashboard', labelId: 'Dasbor', icon: LayoutDashboard },
  { to: '/kitchen/queue', label: 'Queue', labelId: 'Antrian', icon: ClipboardList },
  { to: '/kitchen/waste', label: 'Waste', labelId: 'Waste', icon: Trash2 },
];

export default function KitchenLayout() {
  const { user, logout, outlets, currentOutlet, selectOutlet, hasOutletAccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, changeLang } = useLang();
  const navigate = useNavigate();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!currentOutlet && outlets.length > 0) {
      const accessible = outlets.find(o => hasOutletAccess(o.id));
      if (accessible) selectOutlet(accessible.id);
    }
  }, [currentOutlet, outlets, hasOutletAccess, selectOutlet]);

  // Poll for active count
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (!currentOutlet) { setActiveCount(0); return; }
      try {
        const res = await api.get('/api/kitchen/queue', { params: { outlet_id: currentOutlet } });
        if (!cancelled) setActiveCount(res.data?.stats?.total_active || 0);
      } catch (e) { /* ignore */ }
    };
    fetch();
    const h = setInterval(fetch, 10000);
    return () => { cancelled = true; clearInterval(h); };
  }, [currentOutlet]);

  const currentOutletData = outlets.find(o => o.id === currentOutlet);
  const accessibleOutlets = outlets.filter(o => hasOutletAccess(o.id));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4 lg:px-6 bg-[hsl(var(--background))]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/portal-select')} className="gap-1.5" data-testid="kitchen-back-to-portal">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Portal</span>
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-[hsl(var(--primary))]" />
            {accessibleOutlets.length > 1 ? (
              <Select value={currentOutlet || ''} onValueChange={selectOutlet}>
                <SelectTrigger className="h-8 w-[220px] bg-[var(--glass-bg)] border-[var(--glass-border)] text-sm" data-testid="kitchen-outlet-selector">
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

          {activeCount > 0 && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[var(--glass-border)] ml-1">
              <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-400 bg-amber-500/10" data-testid="kitchen-active-count">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {activeCount} {lang === 'id' ? 'tiket aktif' : 'active tickets'}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} className="h-8 px-2 text-xs gap-1" data-testid="kitchen-lang-toggle">
            <Languages className="w-3.5 h-3.5" /><span className="hidden sm:inline uppercase font-semibold">{lang}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0" data-testid="kitchen-theme-toggle">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-[hsl(var(--primary))]">{user?.name?.charAt(0)}</span>
            </div>
            <span className="text-xs hidden lg:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }} data-testid="kitchen-logout">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

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
                  data-testid={`kitchen-nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{lang === 'id' ? item.labelId : item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
