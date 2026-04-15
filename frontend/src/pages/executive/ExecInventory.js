import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => { if (!val) return 'Rp 0'; if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`; return `Rp ${val.toLocaleString('id-ID')}`; };
const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E', '#FB923C'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

export default function ExecInventory() {
  const { outlets } = useAuth();
  const [data, setData] = useState(null);
  const [outletFilter, setOutletFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/executive/inventory-health', { params: { outlet_id: outletFilter } });
        setData(res.data);
      } catch (err) { toast.error('Failed'); }
    };
    fetch();
  }, [outletFilter]);

  const catData = data?.by_category?.map(c => ({ name: c.category, value: c.value / 1000000, items: c.items, low: c.low })) || [];
  const pieData = data?.by_category?.map(c => ({ name: c.category, value: c.value })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Inventory Health</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Stock value, health score, and category breakdown</p>
        </div>
        <Select value={outletFilter || 'all'} onValueChange={v => setOutletFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs"><SelectValue placeholder="All Outlets" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Outlets</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Health Score</span><p className={`text-3xl font-bold mt-1 ${(data?.health_score || 0) >= 80 ? 'text-green-400' : (data?.health_score || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{data?.health_score || 0}%</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Value</span><p className="text-3xl font-bold mt-1 text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(data?.total_value)}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Items</span><p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{data?.total_items || 0}</p></CardContent></Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${(data?.low_stock_count || 0) > 0 ? 'border-amber-500/20' : ''}`}><CardContent className="p-5"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Low Stock</span><p className="text-3xl font-bold mt-1 text-amber-400 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>{(data?.low_stock_count || 0) > 0 && <AlertTriangle className="w-6 h-6" />}{data?.low_stock_count || 0}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Value by Category (M)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={catData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>{catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Pie */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
