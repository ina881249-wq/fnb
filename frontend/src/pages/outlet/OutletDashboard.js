import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  DollarSign, FileText, Receipt, Package, CheckCircle, Circle,
  AlertTriangle, Clock, ArrowRight, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const formatCurrency = (val) => {
  if (!val) return 'Rp 0';
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

export default function OutletDashboard() {
  const { currentOutlet, getOutletName } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [cashPosition, setCashPosition] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [closingStatus, setClosingStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!currentOutlet) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cpRes, salesRes, closingRes, alertsRes] = await Promise.all([
          api.get('/api/finance/cash-position', { params: { outlet_id: currentOutlet } }),
          api.get('/api/finance/sales-summaries', { params: { outlet_id: currentOutlet, limit: 7 } }),
          api.get('/api/daily-closing/status', { params: { outlet_id: currentOutlet, date: today } }).catch(() => ({ data: null })),
          api.get('/api/alerts', { params: { outlet_id: currentOutlet, resolved: 'false', limit: 5 } }).catch(() => ({ data: { alerts: [] } })),
        ]);
        setCashPosition(cpRes.data);
        setSalesData((salesRes.data.summaries || []).reverse());
        setClosingStatus(closingRes.data);
        setAlerts(alertsRes.data.alerts || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentOutlet, today]);

  if (!currentOutlet) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[hsl(var(--muted-foreground))]">Please select an outlet from the top bar</p>
      </div>
    );
  }

  const checklist = closingStatus?.checklist || {};
  const closingSt = closingStatus?.status || 'open';
  const completedTasks = ['sales_summary', 'petty_cash', 'stock_movements', 'cash_reconciliation']
    .filter(k => checklist[k]?.complete).length;
  const closingProgress = (completedTasks / 4) * 100;

  const tasks = [
    {
      key: 'sales',
      label: t('outlet.sales_summary'),
      desc: 'Record today\'s sales data',
      icon: FileText,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      complete: checklist.sales_summary?.complete,
      path: '/outlet/sales',
    },
    {
      key: 'cash',
      label: t('outlet.cash_management'),
      desc: 'Record cash movements',
      icon: DollarSign,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      complete: true, // always ok
      path: '/outlet/cash',
    },
    {
      key: 'petty',
      label: t('outlet.petty_cash'),
      desc: 'Record petty cash expenses',
      icon: Receipt,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      complete: true,
      path: '/outlet/petty-cash',
    },
    {
      key: 'inventory',
      label: 'Stock Count / Waste',
      desc: 'Update stock and record waste',
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      complete: true,
      path: '/outlet/inventory',
    },
    {
      key: 'closing',
      label: t('outlet.daily_closing'),
      desc: closingSt === 'locked' ? 'Day is locked' : 'Complete and submit closing',
      icon: CheckCircle,
      color: closingSt === 'locked' ? 'text-green-400' : 'text-gray-400',
      bg: closingSt === 'locked' ? 'bg-green-500/10' : 'bg-gray-500/10',
      complete: closingSt === 'locked' || closingSt === 'approved',
      path: '/outlet/closing',
    },
  ];

  const chartData = salesData.map(s => ({ date: s.date?.slice(5), sales: (s.total_sales || 0) / 1000000 }));
  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{t('outlet.dashboard')}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{getOutletName(currentOutlet)} - {today}</p>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium">{alerts.length} active alert{alerts.length > 1 ? 's' : ''}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">{alerts[0]?.title}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closing Progress */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                {closingSt === 'locked' ? 'Day Closed' : closingSt === 'submitted' ? 'Awaiting Approval' : 'Today\'s Progress'}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{completedTasks}/4 tasks completed</p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${closingSt === 'locked' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}`}>
              {closingSt.replace('_', ' ')}
            </Badge>
          </div>
          <Progress value={closingProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Daily Tasks */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>Today's Tasks</h3>
        <div className="space-y-2">
          {tasks.map((task, i) => {
            const Icon = task.icon;
            return (
              <motion.div key={task.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer"
                  onClick={() => navigate(task.path)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${task.bg} flex items-center justify-center flex-shrink-0`}>
                      {task.complete ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Icon className={`w-5 h-5 ${task.color}`} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.label}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('outlet.cash_in')}</span>
            <p className="text-xl font-semibold mt-1 text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.cash_in)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('outlet.cash_out')}</span>
            <p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.cash_out)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('outlet.net_cash')}</span>
            <p className={`text-xl font-semibold mt-1 ${(cashPosition?.net_cash || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.net_cash)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('outlet.today_sales')}</span>
            <p className="text-xl font-semibold mt-1 text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.sales?.total_sales)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Sales Trend (7 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="outletSalesGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#2DD4BF" fill="url(#outletSalesGrad2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Account Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cashPosition?.accounts?.map((acc, i) => (
          <Card key={i} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{acc.name}</span>
              <p className="text-lg font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(acc.current_balance)}
              </p>
              <Badge variant="outline" className="text-[9px] mt-1">{acc.type?.replace('_', ' ')}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
