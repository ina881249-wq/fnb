import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Building2, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => { if (!val) return 'Rp 0'; if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`; return `Rp ${val.toLocaleString('id-ID')}`; };
const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E', '#FB923C'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

export default function ExecRevenue() {
  const { outlets } = useAuth();
  const [trend, setTrend] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [outletFilter, setOutletFilter] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/executive/revenue-trend', { params: { date_from: dateFrom, date_to: dateTo, outlet_id: outletFilter, group_by: groupBy } });
        setTrend(res.data);
      } catch (err) { toast.error('Failed'); }
    };
    fetch();
  }, [dateFrom, dateTo, outletFilter, groupBy]);

  const chartData = trend?.data?.map(d => ({ date: d.date?.length > 7 ? d.date.slice(5) : d.date, revenue: d.revenue / 1000000, cash: d.cash / 1000000, card: d.card / 1000000, online: d.online / 1000000 })) || [];
  const total = trend?.total || 0;
  const totalCash = trend?.data?.reduce((s, d) => s + d.cash, 0) || 0;
  const totalCard = trend?.data?.reduce((s, d) => s + d.card, 0) || 0;
  const totalOnline = trend?.data?.reduce((s, d) => s + d.online, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Revenue Analytics</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Detailed revenue breakdown and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
          </div>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-[110px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem></SelectContent>
          </Select>
          <Select value={outletFilter || 'all'} onValueChange={v => setOutletFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs"><Building2 className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="All Outlets" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Outlets</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Revenue</span><p className="text-2xl font-bold mt-1 text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(total)}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cash Sales</span><p className="text-2xl font-bold mt-1 text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalCash)}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Card Sales</span><p className="text-2xl font-bold mt-1 text-cyan-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalCard)}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Online Sales</span><p className="text-2xl font-bold mt-1 text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalOnline)}</p></CardContent></Card>
      </div>

      {/* Main Chart */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Revenue by Channel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revCashG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient>
                <linearGradient id="revCardG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38BDF8" stopOpacity={0.2}/><stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/></linearGradient>
                <linearGradient id="revOnlG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} axisLine={false} tickFormatter={v => `${v.toFixed(0)}M`} />
              <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="cash" stroke="#22C55E" fill="url(#revCashG)" strokeWidth={2} name="Cash" />
              <Area type="monotone" dataKey="card" stroke="#38BDF8" fill="url(#revCardG)" strokeWidth={2} name="Card" />
              <Area type="monotone" dataKey="online" stroke="#F59E0B" fill="url(#revOnlG)" strokeWidth={2} name="Online" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Channel Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[{name:'Cash',value:totalCash},{name:'Card',value:totalCard},{name:'Online',value:totalOnline}]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  <Cell fill="#22C55E" /><Cell fill="#38BDF8" /><Cell fill="#F59E0B" />
                </Pie>
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Daily Average</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
                <Bar dataKey="revenue" fill="#2DD4BF" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
