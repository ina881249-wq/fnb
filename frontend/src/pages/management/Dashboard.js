import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Building2, Users, Package, DollarSign, TrendingUp, AlertTriangle, CheckSquare } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const KpiCard = ({ title, value, icon: Icon, trend, color = 'teal', index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04, duration: 0.24 }}
  >
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)] hover:bg-[var(--glass-bg-strong)] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] font-semibold">{title}</span>
          <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const chartTooltipStyle = {
  contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' },
  labelStyle: { color: '#A9B6C6' },
};

export default function Dashboard() {
  const { currentOutlet } = useAuth();
  const [summary, setSummary] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, financeRes] = await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/finance/dashboard', { params: { outlet_id: currentOutlet || '' } }),
        ]);
        setSummary(summaryRes.data);
        setFinanceData(financeRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentOutlet]);

  const formatCurrency = (val) => {
    if (!val) return 'Rp 0';
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    return `Rp ${val.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="bg-[var(--glass-bg)] border-[var(--glass-border)] animate-pulse"><CardContent className="p-5 h-24" /></Card>
          ))}
        </div>
      </div>
    );
  }

  const salesTrend = financeData?.sales_trend?.slice(0, 14).reverse().map(s => ({
    date: s.date?.slice(5),
    sales: s.total_sales / 1000000,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Executive Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Overview of operations across all outlets</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard title="Total Revenue (30d)" value={formatCurrency(summary?.total_revenue_30d)} icon={DollarSign} trend="+12.5%" index={0} />
        <KpiCard title="Bank Balance" value={formatCurrency(summary?.total_bank_balance)} icon={DollarSign} index={1} />
        <KpiCard title="Active Outlets" value={summary?.outlets_count || 0} icon={Building2} index={2} />
        <KpiCard title="Pending Approvals" value={summary?.pending_approvals || 0} icon={CheckSquare} index={3} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Sales Trend */}
        <Card className="lg:col-span-8 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Sales Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                <Tooltip {...chartTooltipStyle} formatter={(v) => [`Rp ${v.toFixed(1)}M`, 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#2DD4BF" fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card className="lg:col-span-4 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Cash Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bank Accounts</span>
              <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(financeData?.total_bank_balance)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Outlet Cash</span>
              <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(financeData?.total_cash_balance)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Petty Cash</span>
              <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(financeData?.total_petty_cash)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Active Users" value={summary?.users_count || 0} icon={Users} index={0} />
        <KpiCard title="Inventory Items" value={summary?.items_count || 0} icon={Package} index={1} />
        <KpiCard title="Petty Cash Spent" value={formatCurrency(financeData?.petty_cash_total)} icon={DollarSign} index={2} />
        <KpiCard title="Outlets" value={summary?.outlets_count || 0} icon={Building2} index={3} />
      </div>
    </div>
  );
}
