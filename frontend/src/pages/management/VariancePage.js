import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

const severityConfig = {
  critical: { color: 'border-red-500/30 text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
  warning: { color: 'border-amber-500/30 text-amber-400', bg: 'bg-amber-500/10', label: 'Warning' },
  ok: { color: 'border-green-500/30 text-green-400', bg: 'bg-green-500/10', label: 'OK' },
};

export default function VariancePage() {
  const { currentOutlet } = useAuth();
  const [data, setData] = useState(null);
  const [outletData, setOutletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [varRes, outletRes] = await Promise.all([
          api.get('/api/variance', { params: { outlet_id: currentOutlet || '' } }),
          api.get('/api/variance/by-outlet'),
        ]);
        setData(varRes.data);
        setOutletData(outletRes.data);
      } catch (err) { toast.error('Failed to load variance data'); }
      setLoading(false);
    };
    fetchData();
  }, [currentOutlet]);

  const chartData = data?.items?.slice(0, 10).map(v => ({
    name: v.item_name?.substring(0, 15),
    variance: v.variance_pct,
    fill: v.severity === 'critical' ? '#EF4444' : v.severity === 'warning' ? '#F59E0B' : '#22C55E',
  })) || [];

  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Variance Report</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Theoretical vs actual consumption analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Variance</span>
            <p className={`text-xl font-semibold mt-1 ${(data?.total_variance_value || 0) > 0 ? 'text-red-400' : 'text-green-400'}`} style={{ fontFamily: 'Space Grotesk' }}>
              {formatCurrency(data?.total_variance_value)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-red-500/20">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Critical</span>
            <p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{data?.critical_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-amber-500/20">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Warning</span>
            <p className="text-xl font-semibold mt-1 text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{data?.warning_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Items Tracked</span>
            <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{data?.total_items || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Variance Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Top 10 Variance Items (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} width={100} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`${v.toFixed(1)}%`, 'Variance']} />
                <Bar dataKey="variance" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Outlet Waste Summary */}
      {outletData?.outlets?.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Waste by Outlet</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Outlet</TableHead><TableHead>City</TableHead><TableHead className="text-right">Waste Events</TableHead><TableHead className="text-right">Adjustments</TableHead><TableHead className="text-right">Waste Value</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {outletData.outlets.map(o => (
                  <TableRow key={o.outlet_id} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{o.outlet_name}</TableCell>
                    <TableCell className="text-[hsl(var(--muted-foreground))]">{o.city}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.waste_count}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.adjustment_count}</TableCell>
                    <TableCell className="text-right text-red-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(o.waste_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Variance Detail Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Item Variance Detail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Item</TableHead><TableHead>Category</TableHead>
              <TableHead className="text-right">Theoretical</TableHead><TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance Qty</TableHead><TableHead className="text-right">Variance %</TableHead>
              <TableHead className="text-right">Value Impact</TableHead><TableHead>Severity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(!data?.items || data.items.length === 0) ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No variance data. Complete production orders and record stock movements to see variance analysis.</TableCell></TableRow>
              ) : data.items.map((v, i) => {
                const sc = severityConfig[v.severity];
                return (
                  <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{v.item_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{v.category}</Badge></TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.theoretical_usage} {v.uom}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.actual_usage} {v.uom}</TableCell>
                    <TableCell className={`text-right font-medium ${v.variance_qty > 0 ? 'text-red-400' : 'text-green-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{v.variance_qty > 0 ? '+' : ''}{v.variance_qty}</TableCell>
                    <TableCell className={`text-right ${v.variance_pct > 10 ? 'text-red-400' : v.variance_pct > 5 ? 'text-amber-400' : 'text-green-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{v.variance_pct > 0 ? '+' : ''}{v.variance_pct}%</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(v.variance_value)}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${sc.color}`}>{sc.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
