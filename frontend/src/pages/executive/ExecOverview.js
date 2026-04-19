import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import {
  DollarSign, TrendingUp, Building2, Package, AlertTriangle, CheckSquare,
  Wallet, PiggyBank, Sparkles, ArrowUpRight, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { PremiumPeriodPicker } from '../../components/executive/PremiumPeriodPicker';
import { InteractiveKpiCard } from '../../components/executive/InteractiveKpiCard';
import { KpiDetailSheet } from '../../components/executive/KpiDetailSheet';
import { DatapointDrilldownDialog } from '../../components/executive/DatapointDrilldownDialog';
import { ChartTooltip } from '../../components/executive/ChartTooltip';
import { OutletLeaderboardCard } from '../../components/executive/OutletLeaderboardCard';
import { OutletDrilldownDialog } from '../../components/executive/OutletDrilldownDialog';
import { formatCurrency, formatPercent } from '../../components/executive/formatters';

const DONUT_COLORS = ['hsl(var(--exec-accent-blue))', 'hsl(var(--primary))', 'hsl(var(--exec-warning))'];

// Derive initial period
const initialPeriod = () => {
  const to = new Date();
  const from = new Date(); from.setDate(to.getDate() - 29);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to), preset: '30d', compare: false };
};

export default function ExecutiveOverview() {
  const { outlets: authOutlets } = useAuth();
  const navigate = useNavigate();
  const outlets = authOutlets?.outlets || authOutlets || [];

  const [period, setPeriod] = useState(initialPeriod);
  const [outletFilter, setOutletFilter] = useState('');
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [invHealth, setInvHealth] = useState(null);
  const [outletRanking, setOutletRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Drill-down state
  const [kpiSheet, setKpiSheet] = useState({ open: false, metric: null, title: '', data: null, loading: false });
  const [dpDialog, setDpDialog] = useState({ open: false, metric: null, date: null, data: null, loading: false });
  const [outletDialog, setOutletDialog] = useState({ open: false, outletId: null, name: '', city: '' });

  const params = useMemo(() => ({
    date_from: period.from,
    date_to: period.to,
    outlet_id: outletFilter,
  }), [period.from, period.to, outletFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, trRes, alRes, ihRes, orRes] = await Promise.all([
        api.get('/api/executive/overview', { params }),
        api.get('/api/executive/revenue-trend', { params: { ...params, group_by: 'day' } }),
        api.get('/api/executive/alerts-summary'),
        api.get('/api/executive/inventory-health', { params: { outlet_id: outletFilter } }),
        api.get('/api/executive/outlet-ranking', { params: { date_from: period.from, date_to: period.to, metric: 'revenue' } }),
      ]);
      setOverview(ovRes.data);
      setTrend(trRes.data);
      setAlertsSummary(alRes.data);
      setInvHealth(ihRes.data);
      setOutletRanking(orRes.data?.outlets || []);
      setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      toast.error('Failed to load executive data');
    }
    setLoading(false);
  }, [params, outletFilter, period.from, period.to]);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshTick]);

  // Convert trend data (in millions for chart display)
  const trendData = useMemo(() => {
    if (!trend?.data) return [];
    return trend.data.map(d => ({
      date: d.date?.slice(5) || d.date,
      rawDate: d.date,
      revenue: d.revenue,
      cash: d.cash,
      card: d.card,
      online: d.online,
    }));
  }, [trend]);

  // Sparkline data (last 14 days)
  const sparkData = useCallback((key) => {
    if (!trend?.data) return [];
    const slice = trend.data.slice(-14);
    return slice.map(d => ({ y: d[key] || 0 }));
  }, [trend]);

  // KPI card click -> fetch detail, open sheet
  const openKpiSheet = async (metric, title) => {
    setKpiSheet({ open: true, metric, title, data: null, loading: true });
    try {
      const res = await api.get('/api/executive/kpi-detail', {
        params: { metric, date_from: period.from, date_to: period.to, outlet_id: outletFilter, compare: period.compare },
      });
      setKpiSheet(prev => ({ ...prev, data: res.data, loading: false }));
    } catch (e) {
      setKpiSheet(prev => ({ ...prev, data: null, loading: false }));
      toast.error('Failed to load KPI detail');
    }
  };

  // Chart datapoint click -> fetch breakdown, open dialog
  const openDatapointDialog = async (metric, date) => {
    if (!date) return;
    setDpDialog({ open: true, metric, date, data: null, loading: true });
    try {
      const res = await api.get('/api/executive/datapoint-breakdown', {
        params: { metric, date, outlet_id: outletFilter },
      });
      setDpDialog(prev => ({ ...prev, data: res.data, loading: false }));
    } catch (e) {
      setDpDialog(prev => ({ ...prev, data: null, loading: false }));
      toast.error('Failed to load breakdown');
    }
  };

  // Revenue split pie data
  const revenueSplit = useMemo(() => {
    if (!overview?.revenue) return [];
    return [
      { name: 'Cash', value: overview.revenue.cash || 0 },
      { name: 'Card', value: overview.revenue.card || 0 },
      { name: 'Online', value: overview.revenue.online || 0 },
    ].filter(x => x.value > 0);
  }, [overview]);

  const totalRevenueForSplit = revenueSplit.reduce((s, x) => s + x.value, 0);

  const invCategories = useMemo(() => {
    return invHealth?.by_category?.map(c => ({ name: c.category, value: c.value || 0 })) || [];
  }, [invHealth]);

  const periodLabel = `${period.from} \u2192 ${period.to}`;

  return (
    <div className="space-y-5 exec-portal-scope">
      {/* ================= HEADER ================= */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--exec-accent-blue))] exec-marker-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--exec-accent-blue))] font-semibold">Live Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            Executive Overview
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {periodLabel} &middot; {outletFilter ? outlets.find(o => o.id === outletFilter)?.name : 'All Outlets'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PremiumPeriodPicker
            value={period}
            onChange={setPeriod}
            onRefresh={() => setRefreshTick(t => t + 1)}
            lastRefreshed={lastRefreshed}
          />
          <Select value={outletFilter || 'all'} onValueChange={v => setOutletFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs" data-testid="exec-overview-outlet-filter">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-[hsl(var(--exec-accent-blue))]" />
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ================= HERO KPIs ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InteractiveKpiCard
          metricKey="revenue"
          title="Total Revenue"
          value={overview?.revenue?.total || 0}
          valueFormatter={(v) => formatCurrency(v)}
          icon={DollarSign}
          trend={overview?.revenue?.growth_pct}
          subtitle={`Avg ${formatCurrency(overview?.revenue?.avg_daily)}/day`}
          spark={sparkData('revenue')}
          loading={loading && !overview}
          index={0}
          onClick={() => openKpiSheet('revenue', 'Total Revenue')}
        />
        <InteractiveKpiCard
          metricKey="gross-profit"
          title="Gross Profit"
          value={overview?.profit?.gross || 0}
          valueFormatter={(v) => formatCurrency(v)}
          icon={TrendingUp}
          subtitle={`Margin ${overview?.profit?.margin_pct || 0}%`}
          spark={sparkData('revenue')}
          loading={loading && !overview}
          index={1}
          onClick={() => openKpiSheet('gross_profit', 'Gross Profit')}
        />
        <InteractiveKpiCard
          metricKey="total-expenses"
          title="Total Expenses"
          value={overview?.expenses?.total || 0}
          valueFormatter={(v) => formatCurrency(v)}
          icon={Wallet}
          subtitle={`${overview?.operations?.outlets || 0} outlets`}
          spark={sparkData('revenue').map(p => ({ y: p.y * 0.3 }))}
          loading={loading && !overview}
          index={2}
          onClick={() => openKpiSheet('expenses', 'Total Expenses')}
        />
        <InteractiveKpiCard
          metricKey="total-assets"
          title="Total Assets"
          value={overview?.balances?.total_assets || 0}
          valueFormatter={(v) => formatCurrency(v)}
          icon={PiggyBank}
          subtitle={`Bank ${formatCurrency(overview?.balances?.bank)}`}
          loading={loading && !overview}
          index={3}
          onClick={() => navigate('/management/finance')}
        />
      </div>

      {/* ================= OPERATIONS STRIP ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InteractiveKpiCard
          metricKey="active-outlets"
          title="Active Outlets"
          displayValue={overview?.operations?.outlets || 0}
          icon={Building2}
          subtitle="All locations"
          loading={loading && !overview}
          index={4}
          accent="teal"
          onClick={() => navigate('/management/finance')}
        />
        <InteractiveKpiCard
          metricKey="inventory-value"
          title="Inventory Value"
          value={overview?.balances?.inventory || 0}
          valueFormatter={(v) => formatCurrency(v)}
          icon={Package}
          subtitle={`Health ${invHealth?.health_score || 0}%`}
          loading={loading && !overview}
          index={5}
          accent="teal"
          onClick={() => navigate('/executive/inventory')}
        />
        <InteractiveKpiCard
          metricKey="pending-approvals"
          title="Pending Approvals"
          displayValue={overview?.operations?.pending_approvals || 0}
          icon={CheckSquare}
          subtitle="Awaiting review"
          loading={loading && !overview}
          index={6}
          accent="teal"
          onClick={() => navigate('/management/approvals')}
        />
        <InteractiveKpiCard
          metricKey="active-alerts"
          title="Active Alerts"
          displayValue={overview?.operations?.active_alerts || 0}
          icon={AlertTriangle}
          subtitle={`${alertsSummary?.by_priority?.critical || 0} critical`}
          loading={loading && !overview}
          index={7}
          accent="teal"
          onClick={() => navigate('/executive/control-tower')}
        />
      </div>

      {/* ================= CHARTS ROW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-8 rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                <Activity className="w-4 h-4 text-[hsl(var(--exec-accent-blue))]" />
                Revenue Trend
              </CardTitle>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Click any point to see the day's transactions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/executive/revenue')} className="text-xs gap-1 h-8" data-testid="exec-overview-revenue-details">
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading && !trendData.length ? (
              <Skeleton className="h-[300px] w-full" />
            ) : trendData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No revenue data in selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  onClick={(state) => {
                    if (state?.activeLabel) {
                      const item = trendData.find(d => d.date === state.activeLabel);
                      if (item) openDatapointDialog('revenue', item.rawDate);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="execRevenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="execRevenueCard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--exec-grid))" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip valueFormatter={(v) => formatCurrency(v)} />} cursor={{ stroke: 'hsl(var(--exec-accent-blue) / 0.35)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--exec-accent-blue))" strokeWidth={2.5} fill="url(#execRevenueArea)" name="Total" activeDot={{ r: 5, fill: 'hsl(var(--exec-accent-blue))', stroke: 'white', strokeWidth: 2, style: { cursor: 'pointer' } }} />
                  <Area type="monotone" dataKey="card" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#execRevenueCard)" name="Card" />
                  <Area type="monotone" dataKey="cash" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Cash" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Split Donut */}
        <Card className="lg:col-span-4 rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Sparkles className="w-4 h-4 text-[hsl(var(--exec-accent-blue))]" />
              Revenue Mix
            </CardTitle>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Channel split for the period</p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && !overview ? (
              <Skeleton className="h-[240px] w-full" />
            ) : revenueSplit.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No revenue data</div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={revenueSplit} cx="50%" cy="50%" innerRadius={62} outerRadius={86} paddingAngle={3} dataKey="value" stroke="none">
                      {revenueSplit.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Total</span>
                  <span className="text-xl font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalRevenueForSplit)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2 mt-3">
              {revenueSplit.map((r, i) => (
                <button
                  key={r.name}
                  onClick={() => openKpiSheet(`${r.name.toLowerCase()}_sales`, `${r.name} Sales`)}
                  className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-md hover:bg-[var(--exec-hover-bg)] transition-colors"
                  data-testid={`exec-overview-revenue-split-${r.name.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span>{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{((r.value / totalRevenueForSplit) * 100).toFixed(0)}%</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(r.value)}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= LEADERBOARD + ALERTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <OutletLeaderboardCard
            title="Top Performing Outlets"
            subtitle="By revenue in selected period"
            rows={outletRanking.slice(0, 8).map(o => ({
              outlet_id: o.outlet_id,
              outlet_name: o.outlet_name,
              city: o.city,
              value: o.revenue,
              trend: null,
              secondaryMetrics: [
                { label: 'Margin', value: `${(o.margin_pct || 0).toFixed(1)}%` },
                { label: 'Closing', value: `${(o.closing_rate || 0).toFixed(0)}%` },
              ],
            }))}
            loading={loading && !outletRanking.length}
            valueFormatter={formatCurrency}
            onRowClick={(r) => setOutletDialog({ open: true, outletId: r.outlet_id, name: r.outlet_name, city: r.city })}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/executive/outlets')} className="text-xs gap-1 h-8" data-testid="exec-overview-outlets-see-all">
                See all <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            }
          />
        </div>

        {/* Alerts preview */}
        <Card className="lg:col-span-5 rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--exec-warning))]" />
                Alert Summary
              </CardTitle>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Open alerts across all outlets</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/executive/control-tower')} className="text-xs gap-1 h-8" data-testid="exec-overview-alerts-see-all">
              Control Tower <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'critical', label: 'Critical', color: 'text-[hsl(var(--exec-negative))]', bg: 'bg-[hsl(var(--exec-negative)/0.12)]' },
                { key: 'high', label: 'High', color: 'text-[hsl(var(--exec-warning))]', bg: 'bg-[hsl(var(--exec-warning)/0.12)]' },
                { key: 'medium', label: 'Medium', color: 'text-[hsl(var(--exec-accent-blue))]', bg: 'bg-[hsl(var(--exec-accent-blue)/0.12)]' },
                { key: 'low', label: 'Low', color: 'text-[hsl(var(--muted-foreground))]', bg: 'bg-white/5' },
              ].map(p => (
                <div key={p.key} className={`rounded-lg ${p.bg} border border-[var(--glass-border)] p-2.5 text-center`}>
                  <div className={`text-xl font-semibold tabular-nums ${p.color}`} style={{ fontFamily: 'Space Grotesk' }}>
                    {alertsSummary?.by_priority?.[p.key] || 0}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-0.5">{p.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              {(alertsSummary?.recent || []).slice(0, 5).map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/executive/control-tower')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--exec-hover-bg)] text-xs text-left transition-colors"
                  data-testid={`exec-overview-recent-alert-${i}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.priority === 'critical' ? 'bg-[hsl(var(--exec-negative))]' :
                    a.priority === 'high' ? 'bg-[hsl(var(--exec-warning))]' :
                    a.priority === 'medium' ? 'bg-[hsl(var(--exec-accent-blue))]' : 'bg-white/30'
                  }`} />
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex-shrink-0">{a.outlet_name || '-'}</span>
                </button>
              ))}
              {(!alertsSummary?.recent || alertsSummary.recent.length === 0) && (
                <div className="text-center text-xs text-[hsl(var(--muted-foreground))] py-6">All clear &mdash; no active alerts</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================= INVENTORY HEALTH ================= */}
      <Card className="rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Package className="w-4 h-4 text-[hsl(var(--exec-accent-blue))]" />
              Inventory Health
            </CardTitle>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Snapshot across categories</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/executive/inventory')} className="text-xs gap-1 h-8" data-testid="exec-overview-inventory-details">
            Details <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="grid grid-cols-3 gap-2 lg:col-span-1 lg:grid-cols-1">
              <div className="rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] p-3">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] font-semibold">Health Score</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ fontFamily: 'Space Grotesk', color: 'hsl(var(--exec-positive))' }}>
                  {invHealth?.health_score || 0}%
                </div>
              </div>
              <div className="rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] p-3">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] font-semibold">Total Value</div>
                <div className="text-lg font-semibold mt-1 tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
                  {formatCurrency(invHealth?.total_value)}
                </div>
              </div>
              <div className="rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] p-3">
                <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] font-semibold">Low Stock</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ fontFamily: 'Space Grotesk', color: 'hsl(var(--exec-warning))' }}>
                  {invHealth?.low_stock_count || 0}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] p-3">
              {loading && !invCategories.length ? (
                <Skeleton className="h-[180px] w-full" />
              ) : invCategories.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No inventory data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={invCategories} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="execInvBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0.55} />
                        <stop offset="95%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0.18} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--exec-grid))" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={{ fill: 'hsl(var(--exec-accent-blue) / 0.06)' }} />
                    <Bar dataKey="value" fill="url(#execInvBar)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============== DRILLDOWNS ============== */}
      <KpiDetailSheet
        open={kpiSheet.open}
        onOpenChange={(open) => setKpiSheet(prev => ({ ...prev, open }))}
        title={kpiSheet.title}
        description={`${periodLabel} \u2022 ${outletFilter ? outlets.find(o => o.id === outletFilter)?.name || '' : 'All Outlets'}`}
        metric={{
          value: kpiSheet.data?.total,
          compareValue: kpiSheet.data?.compare_total,
          trend: kpiSheet.data?.trend_pct,
        }}
        series={kpiSheet.data?.series || []}
        topContributors={kpiSheet.data?.top_contributors || []}
        loading={kpiSheet.loading}
        onViewReport={() => {
          setKpiSheet(prev => ({ ...prev, open: false }));
          const metricToRoute = {
            revenue: '/executive/revenue',
            cash_sales: '/executive/revenue',
            card_sales: '/executive/revenue',
            online_sales: '/executive/revenue',
            expenses: '/executive/expenses',
            gross_profit: '/executive/revenue',
          };
          navigate(metricToRoute[kpiSheet.metric] || '/executive/revenue');
        }}
        viewReportLabel="Open Full Report"
      />

      <DatapointDrilldownDialog
        open={dpDialog.open}
        onOpenChange={(open) => setDpDialog(prev => ({ ...prev, open }))}
        title={`Revenue breakdown — ${dpDialog.date || ''}`}
        subtitle={outletFilter ? outlets.find(o => o.id === outletFilter)?.name : 'All Outlets'}
        rows={dpDialog.data?.rows || []}
        total={dpDialog.data?.total}
        count={dpDialog.data?.count}
        loading={dpDialog.loading}
        onPrimary={() => {
          setDpDialog(prev => ({ ...prev, open: false }));
          navigate('/management/journals');
        }}
        primaryLabel="Open in Journals"
      />

      <OutletDrilldownDialog
        open={outletDialog.open}
        onOpenChange={(open) => setOutletDialog(prev => ({ ...prev, open }))}
        outletId={outletDialog.outletId}
        outletName={outletDialog.name}
        city={outletDialog.city}
        dateFrom={period.from}
        dateTo={period.to}
        onViewOutlet={() => {
          setOutletDialog(prev => ({ ...prev, open: false }));
          navigate('/executive/outlets');
        }}
      />
    </div>
  );
}
