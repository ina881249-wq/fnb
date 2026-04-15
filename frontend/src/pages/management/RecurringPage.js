import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Plus, Calendar, Pause, Play, Trash2, Clock, DollarSign, Repeat } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;
const freqColors = { daily: 'border-green-500/30 text-green-400', weekly: 'border-cyan-500/30 text-cyan-400', monthly: 'border-purple-500/30 text-purple-400' };
const statusColors = { active: 'border-green-500/30 text-green-400', paused: 'border-amber-500/30 text-amber-400', expired: 'border-red-500/30 text-red-400' };

export default function RecurringPage() {
  const { outlets } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', transaction_type: 'cash_movement', frequency: 'monthly',
    amount: 0, outlet_id: '', description: '',
    day_of_month: 1, auto_approve: false,
  });

  const fetchData = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        api.get('/api/recurring'),
        api.get('/api/recurring/stats'),
      ]);
      setItems(itemsRes.data.recurring || []);
      setStats(statsRes.data || {});
    } catch (err) { toast.error('Failed'); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/recurring', { ...form, amount: parseFloat(form.amount), day_of_month: parseInt(form.day_of_month) });
      toast.success('Recurring transaction created');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handlePause = async (id) => {
    await api.post(`/api/recurring/${id}/pause`);
    toast.success('Paused');
    fetchData();
  };

  const handleResume = async (id) => {
    await api.post(`/api/recurring/${id}/resume`);
    toast.success('Resumed');
    fetchData();
  };

  const handleDelete = async (id) => {
    await api.delete(`/api/recurring/${id}`);
    toast.success('Expired');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Recurring Transactions</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Automated scheduled transactions</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="create-recurring-button"><Plus className="w-4 h-4" /> Schedule</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Create Recurring Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required placeholder="Monthly rent payment" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.transaction_type} onValueChange={v => setForm({...form, transaction_type: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash_movement">Cash Movement</SelectItem><SelectItem value="petty_cash">Petty Cash</SelectItem><SelectItem value="settlement">Settlement</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                {form.frequency === 'monthly' && (
                  <div><Label>Day of Month</Label><Input type="number" min={1} max={28} value={form.day_of_month} onChange={e => setForm({...form, day_of_month: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                )}
              </div>
              <div><Label>Outlet</Label>
                <Select value={form.outlet_id || 'none'} onValueChange={v => setForm({...form, outlet_id: v === 'none' ? '' : v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">All / HQ</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.auto_approve} onCheckedChange={v => setForm({...form, auto_approve: v})} />
                <span className="text-sm">Auto-approve generated transactions</span>
              </label>
              <Button type="submit" className="w-full">Create Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {['active', 'paused', 'expired'].map(s => (
          <Card key={s} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <Badge variant="outline" className={`text-[9px] mb-1 ${statusColors[s]}`}>{s}</Badge>
              <p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats[s]?.count || 0}</p>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatCurrency(stats[s]?.total_amount || 0)}/cycle</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-8 text-center">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
              <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>No Recurring Transactions</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Schedule transactions to automate routine payments.</p>
            </CardContent>
          </Card>
        ) : items.map(item => (
          <Card key={item.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)] transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <Badge variant="outline" className={`text-[9px] ${freqColors[item.frequency]}`}>{item.frequency}</Badge>
                  <Badge variant="outline" className={`text-[9px] ${statusColors[item.status]}`}>{item.status}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {item.transaction_type?.replace('_', ' ')} · {formatCurrency(item.amount)} · {item.outlet_name || 'All outlets'}
                </p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Next: {item.next_run || 'N/A'} · Runs: {item.run_count || 0}
                </p>
              </div>
              <div className="flex gap-1">
                {item.status === 'active' && (
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-amber-400 hover:bg-amber-500/10" onClick={() => handlePause(item.id)} title="Pause">
                    <Pause className="w-3.5 h-3.5" />
                  </Button>
                )}
                {item.status === 'paused' && (
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-green-400 hover:bg-green-500/10" onClick={() => handleResume(item.id)} title="Resume">
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                )}
                {item.status !== 'expired' && (
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(item.id)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
