import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertTriangle, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;
const severityConfig = {
  critical: { color: 'border-red-500/30 text-red-400', bg: 'bg-red-500/10' },
  warning: { color: 'border-amber-500/30 text-amber-400', bg: 'bg-amber-500/10' },
  ok: { color: 'border-green-500/30 text-green-400', bg: 'bg-green-500/10' },
};

export default function VariancePage() {
  const { currentOutlet } = useAuth();
  const [data, setData] = useState(null);
  const [outletData, setOutletData] = useState(null);
  const [reasonCodes, setReasonCodes] = useState([]);
  const [rootCauseDialog, setRootCauseDialog] = useState(null);
  const [rcForm, setRcForm] = useState({ reason_code: '', explanation: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [varRes, outletRes, rcRes] = await Promise.all([
          api.get('/api/variance', { params: { outlet_id: currentOutlet || '' } }),
          api.get('/api/variance/by-outlet'),
          api.get('/api/enhancements/variance/reason-codes'),
        ]);
        setData(varRes.data);
        setOutletData(outletRes.data);
        setReasonCodes(rcRes.data.reason_codes || []);
      } catch (err) { toast.error('Failed to load'); }
      setLoading(false);
    };
    fetchData();
  }, [currentOutlet]);

  const handleSubmitRootCause = async () => {
    if (!rootCauseDialog) return;
    try {
      await api.post('/api/enhancements/variance/root-cause', {
        item_id: rootCauseDialog.item_id,
        outlet_id: currentOutlet || '',
        reason_code: rcForm.reason_code,
        explanation: rcForm.explanation,
      });
      toast.success('Root cause recorded');
      setRootCauseDialog(null);
      setRcForm({ reason_code: '', explanation: '' });
    } catch (err) { toast.error('Failed'); }
  };

  const chartData = data?.items?.slice(0, 10).map(v => ({
    name: v.item_name?.substring(0, 12),
    variance: v.variance_pct,
    fill: v.severity === 'critical' ? '#EF4444' : v.severity === 'warning' ? '#F59E0B' : '#22C55E',
  })) || [];

  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Variance Report</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Theoretical vs actual + root cause analysis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Variance</span>
            <p className={`text-xl font-semibold mt-1 ${(data?.total_variance_value || 0) > 0 ? 'text-red-400' : 'text-green-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(data?.total_variance_value)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-red-500/20"><CardContent className="p-4"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Critical</span><p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{data?.critical_count || 0}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-amber-500/20"><CardContent className="p-4"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Warning</span><p className="text-xl font-semibold mt-1 text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{data?.warning_count || 0}</p></CardContent></Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]"><CardContent className="p-4"><span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Items Tracked</span><p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{data?.total_items || 0}</p></CardContent></Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Top Variance Items (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} width={90} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`${v.toFixed(1)}%`, 'Variance']} />
                <Bar dataKey="variance" radius={[0, 4, 4, 0]}>{chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Outlet Waste */}
      {outletData?.outlets?.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Waste by Outlet</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Outlet</TableHead><TableHead className="text-right">Waste Events</TableHead><TableHead className="text-right">Adjustments</TableHead><TableHead className="text-right">Waste Value</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {outletData.outlets.map(o => (
                  <TableRow key={o.outlet_id} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{o.outlet_name}</TableCell>
                    <TableCell className="text-right">{o.waste_count}</TableCell>
                    <TableCell className="text-right">{o.adjustment_count}</TableCell>
                    <TableCell className="text-right text-red-400">{formatCurrency(o.waste_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Variance Detail with Root Cause Action */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Item Variance Detail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Item</TableHead><TableHead className="text-right">Theoretical</TableHead><TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">%</TableHead>
              <TableHead>Severity</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(!data?.items || data.items.length === 0) ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No variance data yet. Complete production orders and record stock movements.</TableCell></TableRow>
              ) : data.items.map((v, i) => {
                const sc = severityConfig[v.severity];
                return (
                  <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{v.item_name}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.theoretical_usage} {v.uom}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.actual_usage} {v.uom}</TableCell>
                    <TableCell className={`text-right font-medium ${v.variance_qty > 0 ? 'text-red-400' : 'text-green-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{v.variance_qty > 0 ? '+' : ''}{v.variance_qty}</TableCell>
                    <TableCell className={`text-right ${Math.abs(v.variance_pct) > 10 ? 'text-red-400' : 'text-green-400'}`}>{v.variance_pct > 0 ? '+' : ''}{v.variance_pct}%</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] ${sc.color}`}>{v.severity}</Badge></TableCell>
                    <TableCell>
                      {v.severity !== 'ok' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setRootCauseDialog(v)}>
                          <MessageSquare className="w-3 h-3" /> Explain
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Root Cause Dialog */}
      <Dialog open={!!rootCauseDialog} onOpenChange={() => setRootCauseDialog(null)}>
        <DialogContent className="bg-[hsl(var(--popover))] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>Explain Variance: {rootCauseDialog?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
              Variance: <span className="font-semibold">{rootCauseDialog?.variance_qty} {rootCauseDialog?.uom}</span> ({rootCauseDialog?.variance_pct}%)
            </div>
            <div><Label>Reason Code</Label>
              <Select value={rcForm.reason_code} onValueChange={v => setRcForm({...rcForm, reason_code: v})}>
                <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{reasonCodes.map(rc => <SelectItem key={rc.code} value={rc.code}>{rc.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Explanation</Label><Input value={rcForm.explanation} onChange={e => setRcForm({...rcForm, explanation: e.target.value})} className="bg-[hsl(var(--secondary))]" placeholder="Describe what happened..." /></div>
            <Button className="w-full" onClick={handleSubmitRootCause} disabled={!rcForm.reason_code}>Submit Root Cause</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
