import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Building2, TrendingUp, TrendingDown, Trophy, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => {
  if (!val) return 'Rp 0';
  if (Math.abs(val) >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}B`;
  if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

export default function ExecOutlets() {
  const { outlets: userOutlets } = useAuth();
  const [data, setData] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [metric, setMetric] = useState('revenue');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/executive/outlet-ranking', { params: { date_from: dateFrom, date_to: dateTo, metric } });
        setData(res.data);
      } catch (err) { toast.error('Failed'); }
    };
    fetch();
  }, [dateFrom, dateTo, metric]);

  const chartData = data?.outlets?.map(o => ({
    name: o.outlet_name?.replace('Warung Nusantara - ', ''),
    value: (o[metric] || 0) / (metric === 'closing_rate' ? 1 : 1000000),
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Outlet Performance</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Compare and rank outlet performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-[130px] bg-transparent border-0 text-xs" />
          </div>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">By Revenue</SelectItem>
              <SelectItem value="profit">By Profit</SelectItem>
              <SelectItem value="expenses">By Expenses</SelectItem>
              <SelectItem value="waste_value">By Waste</SelectItem>
              <SelectItem value="closing_rate">By Closing Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => metric === 'closing_rate' ? `${v}%` : `${v.toFixed(0)}M`} />
              <Tooltip {...chartTooltipStyle} formatter={v => [metric === 'closing_rate' ? `${v.toFixed(1)}%` : formatCurrency(v * 1000000), '']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead className="w-12">#</TableHead><TableHead>Outlet</TableHead><TableHead>City</TableHead>
                <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Waste</TableHead><TableHead className="text-right">Closing Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.outlets?.map(o => (
                <TableRow key={o.outlet_id} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      o.rank === 1 ? 'bg-amber-500/20 text-amber-400' : o.rank === 2 ? 'bg-gray-300/20 text-gray-300' : o.rank === 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--glass-bg-strong)] text-[hsl(var(--muted-foreground))]'
                    }`}>{o.rank}</div>
                  </TableCell>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[hsl(var(--primary))]" />{o.outlet_name}</div></TableCell>
                  <TableCell className="text-[hsl(var(--muted-foreground))]">{o.city}</TableCell>
                  <TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.revenue)}</TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.expenses)}</TableCell>
                  <TableCell className={`text-right font-semibold ${o.profit >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.profit)}</TableCell>
                  <TableCell className={`text-right ${o.margin_pct >= 80 ? 'text-green-400' : o.margin_pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{o.margin_pct}%</TableCell>
                  <TableCell className="text-right text-red-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.waste_value)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`text-[10px] ${o.closing_rate >= 80 ? 'border-green-500/30 text-green-400' : o.closing_rate >= 50 ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'}`}>{o.closing_rate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
