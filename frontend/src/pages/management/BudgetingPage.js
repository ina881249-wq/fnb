import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function BudgetingPage() {
  const { currentOutlet, outlets } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [bvaData, setBvaData] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState({
    outlet_id: '', period: new Date().toISOString().slice(0, 7), name: '',
    lines: [
      { account_code: 'operational', account_name: 'Operational', amount: 0 },
      { account_code: 'transport', account_name: 'Transport', amount: 0 },
      { account_code: 'supplies', account_name: 'Supplies', amount: 0 },
      { account_code: 'maintenance', account_name: 'Maintenance', amount: 0 },
      { account_code: 'cleaning', account_name: 'Cleaning', amount: 0 },
    ],
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetRes, bvaRes] = await Promise.all([
        api.get('/api/budgets', { params: { outlet_id: currentOutlet || '', period: selectedPeriod } }),
        api.get('/api/budgets/vs-actual', { params: { outlet_id: currentOutlet || '', period: selectedPeriod } }),
      ]);
      setBudgets(budgetRes.data.budgets || []);
      setBvaData(bvaRes.data);
    } catch (err) { toast.error('Failed to load budget data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet, selectedPeriod]);

  const updateLine = (idx, value) => {
    setNewBudget(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], amount: parseFloat(value) || 0 };
      return { ...prev, lines };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const total = newBudget.lines.reduce((s, l) => s + l.amount, 0);
      await api.post('/api/budgets', { ...newBudget, total_budget: total });
      toast.success('Budget created');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const chartData = bvaData?.expense_by_category?.map(c => ({
    name: c.category,
    actual: c.amount / 1000000,
  })) || [];

  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Budgeting</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Budget vs actual by outlet and period</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="w-[160px] bg-[var(--glass-bg)] border-[var(--glass-border)]" />
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="gap-2" data-testid="create-budget-button"><Plus className="w-4 h-4" /> Budget</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-lg">
              <DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Outlet</Label>
                    <Select value={newBudget.outlet_id} onValueChange={v => setNewBudget({...newBudget, outlet_id: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Period</Label><Input type="month" value={newBudget.period} onChange={e => setNewBudget({...newBudget, period: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                </div>
                <div>
                  <Label className="mb-2 block">Budget Lines</Label>
                  <div className="space-y-2">
                    {newBudget.lines.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm w-32 text-[hsl(var(--muted-foreground))]">{line.account_name}</span>
                        <Input type="number" value={line.amount || ''} onChange={e => updateLine(idx, e.target.value)} className="bg-[hsl(var(--secondary))] flex-1" placeholder="0" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Total Budget</span>
                    <p className="text-lg font-semibold text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>
                      {formatCurrency(newBudget.lines.reduce((s, l) => s + l.amount, 0))}
                    </p>
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Budget</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget vs Actual Summary */}
      {bvaData && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Budget</span>
              <p className="text-xl font-semibold mt-1 text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(bvaData.total_budget)}</p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Actual Spent</span>
              <p className="text-xl font-semibold mt-1 text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(bvaData.total_actual)}</p>
            </CardContent>
          </Card>
          <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${bvaData.is_over_budget ? 'border-red-500/30' : ''}`}>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Variance</span>
              <p className={`text-xl font-semibold mt-1 ${bvaData.variance >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: 'Space Grotesk' }}>
                {formatCurrency(bvaData.variance)}
              </p>
            </CardContent>
          </Card>
          <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${bvaData.burn_rate > 100 ? 'border-red-500/30' : ''}`}>
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Burn Rate</span>
              <p className={`text-xl font-semibold mt-1 flex items-center gap-1 ${bvaData.burn_rate > 100 ? 'text-red-400' : bvaData.burn_rate > 80 ? 'text-amber-400' : 'text-green-400'}`} style={{ fontFamily: 'Space Grotesk' }}>
                {bvaData.burn_rate > 100 && <AlertTriangle className="w-4 h-4" />}
                {bvaData.burn_rate}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Revenue</span>
              <p className="text-xl font-semibold mt-1 text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(bvaData.revenue_total)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Expense by Category (Millions)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => `${v}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, 'Actual']} />
                <Bar dataKey="actual" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget List */}
      {budgets.length === 0 ? (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
            <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>No Budgets Set</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create a budget to start tracking spending vs targets.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Active Budgets</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Outlet</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Budget</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {budgets.map(b => (
                  <TableRow key={b.id} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium">{b.outlet_name || 'All'}</TableCell>
                    <TableCell>{b.period}</TableCell>
                    <TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(b.total_budget)}</TableCell>
                    <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{b.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
