import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, Building2, Package, AlertTriangle, CheckSquare, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const formatCurrency = (val) => {
  if (!val) return 'Rp 0';
  if (Math.abs(val) >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}B`;
  if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E', '#FB923C'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

const KpiCard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, color = 'primary', index = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.3 }}>
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)] hover:bg-[var(--glass-bg-strong)] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] font-semibold">{title}</span>
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-0.5 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
          {subtitle && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ExecutiveOverview() {
  const { outlets } = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [invHealth, setInvHealth] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [outletFilter, setOutletFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const params = { date_from: dateFrom, date_to: dateTo, outlet_id: outletFilter };
        const [ovRes, trRes, alRes, ihRes] = await Promise.all([
          api.get('/api/executive/overview', { params }),
          api.get('/api/executive/revenue-trend', { params: { ...params, group_by: 'day' } }),
          api.get('/api/executive/alerts-summary'),
          api.get('/api/executive/inventory-health', { params: { outlet_id: outletFilter } }),
        ]);
        setOverview(ovRes.data);
        setTrend(trRes.data);
        setAlertsSummary(alRes.data);
        setInvHealth(ihRes.data);
      } catch (err) { toast.error('Failed to load executive data'); }
      setLoading(false);
    };
    fetchAll();
  }, [dateFrom, dateTo, outletFilter]);

  const trendData = trend?.data?.map(d => ({ date: d.date?.slice(5), revenue: d.revenue / 1000000, cash: d.cash / 1000000, card: d.card / 1000000 })) || [];
  const invCategories = invHealth?.by_category?.map(c => ({ name: c.category, value: c.value / 1000000 })) || [];
  const alertsByType = alertsSummary?.by_type || [];

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i} className="bg-[var(--glass-bg)] border-[var(--glass-border)] animate-pulse"><CardContent className="p-5 h-28" /></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Executive Overview</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Real-time business performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[140px] bg-transparent border-0 text-xs" data-testid="exec-date-from" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[140px] bg-transparent border-0 text-xs" data-testid="exec-date-to" />
          </div>
          <Select value={outletFilter || 'all'} onValueChange={v => setOutletFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs" data-testid="exec-outlet-filter">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-[hsl(var(--primary))]" />
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row 1 - Revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatCurrency(overview?.revenue?.total)} icon={DollarSign} trend={overview?.revenue?.growth_pct} trendLabel="vs prev period" subtitle={`Avg ${formatCurrency(overview?.revenue?.avg_daily)}/day`} index={0} />
        <KpiCard title="Gross Profit" value={formatCurrency(overview?.profit?.gross)} icon={TrendingUp} subtitle={`Margin: ${overview?.profit?.margin_pct}%`} index={1} />
        <KpiCard title="Total Assets" value={formatCurrency(overview?.balances?.total_assets)} icon={Building2} subtitle={`Bank: ${formatCurrency(overview?.balances?.bank)}`} index={2} />
        <KpiCard title="Total Expenses" value={formatCurrency(overview?.expenses?.total)} icon={DollarSign} index={3} />
      </div>

      {/* KPI Row 2 - Operations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Outlets" value={overview?.operations?.outlets || 0} icon={Building2} index={4} />
        <KpiCard title="Inventory Value" value={formatCurrency(overview?.balances?.inventory)} icon={Package} subtitle={`Health: ${invHealth?.health_score || 0}%`} index={5} />
        <KpiCard title="Pending Approvals" value={overview?.operations?.pending_approvals || 0} icon={CheckSquare} index={6} />
        <KpiCard title="Active Alerts" value={overview?.operations?.active_alerts || 0} icon={AlertTriangle} subtitle={`${alertsSummary?.by_priority?.critical || 0} critical`} index={7} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-8 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="execRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="execCardGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
                <Area type="monotone" dataKey="revenue" stroke="#2DD4BF" fill="url(#execRevGrad)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="cash" stroke="#22C55E" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Cash" />
                <Area type="monotone" dataKey="card" stroke="#38BDF8" fill="url(#execCardGrad)" strokeWidth={1.5} name="Card" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Split Pie */}
        <Card className="lg:col-span-4 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Revenue Split</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Cash', value: overview?.revenue?.cash || 0 },
                    { name: 'Card', value: overview?.revenue?.card || 0 },
                    { name: 'Online', value: overview?.revenue?.online || 0 },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {COLORS.slice(0, 3).map((color, i) => <Cell key={i} fill={color} />)}
                </Pie>
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs"><span className="text-[hsl(var(--muted-foreground))]">Cash</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(overview?.revenue?.cash)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[hsl(var(--muted-foreground))]">Card</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(overview?.revenue?.card)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[hsl(var(--muted-foreground))]">Online</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(overview?.revenue?.online)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts Summary */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}><AlertTriangle className="w-4 h-4 text-amber-400" /> Alert Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['critical', 'high', 'medium', 'low'].map(p => (
                <div key={p} className="text-center p-2 rounded-lg bg-[var(--glass-bg-strong)]">
                  <p className={`text-lg font-bold ${p === 'critical' ? 'text-red-400' : p === 'high' ? 'text-amber-400' : p === 'medium' ? 'text-cyan-400' : 'text-gray-400'}`}>{alertsSummary?.by_priority?.[p] || 0}</p>
                  <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{p}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {alertsSummary?.recent?.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--glass-bg-strong)] text-xs">
                  <Badge className={`text-[8px] px-1.5 ${a.priority === 'critical' ? 'bg-red-500/20 text-red-400' : a.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{a.priority}</Badge>
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-[hsl(var(--muted-foreground))] flex-shrink-0">{a.outlet_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Health */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}><Package className="w-4 h-4 text-[hsl(var(--primary))]" /> Inventory Health</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-[var(--glass-bg-strong)] flex-1">
                <p className="text-xl font-bold text-[hsl(var(--primary))]">{invHealth?.health_score || 0}%</p>
                <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Health Score</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--glass-bg-strong)] flex-1">
                <p className="text-xl font-bold">{formatCurrency(invHealth?.total_value)}</p>
                <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Value</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--glass-bg-strong)] flex-1">
                <p className="text-xl font-bold text-amber-400">{invHealth?.low_stock_count || 0}</p>
                <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Low Stock</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={invCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, 'Value']} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {invCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
