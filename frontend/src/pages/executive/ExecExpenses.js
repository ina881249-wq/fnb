import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Building2, DollarSign } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => { if (!val) return 'Rp 0'; if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`; return `Rp ${val.toLocaleString('id-ID')}`; };
const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E', '#FB923C'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

export default function ExecExpenses() {
  const { outlets } = useAuth();
  const [data, setData] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [outletFilter, setOutletFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/executive/expense-breakdown', { params: { date_from: dateFrom, date_to: dateTo, outlet_id: outletFilter } });
        setData(res.data);
      } catch (err) { toast.error('Failed'); }
    };
    fetch();
  }, [dateFrom, dateTo, outletFilter]);

  const pieData = data?.by_category?.map(c => ({ name: c.category, value: c.amount })) || [];
  const trendData = data?.daily_trend?.map(d => ({ date: d.date?.slice(5), amount: d.amount / 1000000 })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Expense Analytics</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Breakdown and trends of operational expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
          </div>
          <Select value={outletFilter || 'all'} onValueChange={v => setOutletFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs"><Building2 className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Outlets</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Total */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Expenses</span>
          <p className="text-3xl font-bold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(data?.total)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Pie */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>By Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Daily Expense Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
                <Line type="monotone" dataKey="amount" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Outlet + By Category Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>By Outlet</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent"><TableHead>Outlet</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.by_outlet?.map((o, i) => (
                  <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{o.outlet_name}</TableCell>
                    <TableCell className="text-right text-red-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>By Category</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent"><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.by_category?.map((c, i) => (
                  <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.category}</Badge></TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-right text-[hsl(var(--muted-foreground))]">{c.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
