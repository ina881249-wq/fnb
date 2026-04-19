import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { Button } from '../components/ui/button';
import NotificationBell from '../components/common/NotificationBell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import {
  BarChart3, TrendingUp, DollarSign, Building2, Package, AlertTriangle,
  LogOut, Bell, Sun, Moon, Languages, ArrowLeft, PieChart, Activity,
  Sparkles, MessageCircle, LineChart, Wand2
} from 'lucide-react';

const navItems = [
  { to: '/executive/overview', label: 'Overview', icon: BarChart3 },
  { to: '/executive/revenue', label: 'Revenue Analytics', icon: TrendingUp },
  { to: '/executive/expenses', label: 'Expense Analytics', icon: DollarSign },
  { to: '/executive/outlets', label: 'Outlet Performance', icon: Building2 },
  { to: '/executive/inventory', label: 'Inventory Health', icon: Package },
  { to: '/executive/control-tower', label: 'Control Tower', icon: AlertTriangle },
  { to: '/executive/ai-insights', label: 'AI Insights', icon: Sparkles, ai: true },
  { to: '/executive/ai-chat', label: 'AI Chat', icon: MessageCircle, ai: true },
  { to: '/executive/ai-forecast', label: 'AI Forecast', icon: LineChart, ai: true },
  { to: '/executive/ai-anomalies', label: 'AI Anomalies', icon: Wand2, ai: true },
];

export default function ExecutiveLayout() {
  const { user, logout, outlets } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, changeLang } = useLang();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-4 lg:px-8 bg-[hsl(var(--background))]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/portal-select')} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Portal</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk' }}>Executive Portal</h2>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Data Analytics & Control Tower</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} className="h-8 px-2 text-xs gap-1">
            <Languages className="w-3.5 h-3.5" /><span className="hidden sm:inline uppercase font-semibold">{lang}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <NotificationBell />
          <Separator orientation="vertical" className="h-6 bg-[var(--glass-border)]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-[hsl(var(--primary))]">{user?.name?.charAt(0)}</span>
            </div>
            <span className="hidden sm:inline text-xs font-medium">{user?.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      {/* Sub navigation */}
      <nav className="border-b border-[var(--glass-border)] bg-[hsl(var(--card))]">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? (item.ai ? 'bg-gradient-to-r from-[hsl(var(--primary))]/15 to-purple-500/15 text-[hsl(var(--primary))] font-medium border border-[hsl(var(--primary))]/30' : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium')
                      : (item.ai ? 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--glass-bg)]')}`
                  }
                  data-testid={`exec-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Icon className={`w-4 h-4 ${item.ai ? 'text-[hsl(var(--primary))]' : ''}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
