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
import { Plus, Play, CheckCircle, XCircle, Clock, AlertTriangle, Factory } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  draft: { color: 'border-gray-500/30 text-gray-400', bg: 'bg-gray-500/10' },
  planned: { color: 'border-cyan-500/30 text-cyan-400', bg: 'bg-cyan-500/10' },
  in_progress: { color: 'border-amber-500/30 text-amber-400', bg: 'bg-amber-500/10' },
  completed: { color: 'border-green-500/30 text-green-400', bg: 'bg-green-500/10' },
  closed: { color: 'border-purple-500/30 text-purple-400', bg: 'bg-purple-500/10' },
  cancelled: { color: 'border-red-500/30 text-red-400', bg: 'bg-red-500/10' },
};

const priorityColors = { low: 'text-gray-400', normal: 'text-cyan-400', high: 'text-amber-400', urgent: 'text-red-400' };

export default function ProductionPage() {
  const { currentOutlet, outlets } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [completeForm, setCompleteForm] = useState({ actual_output: 0, waste_quantity: 0, notes: '' });
  const [newOrder, setNewOrder] = useState({ recipe_id: '', outlet_id: '', planned_quantity: 1, planned_date: new Date().toISOString().split('T')[0], priority: 'normal', notes: '' });

  const fetchData = async () => {
    try {
      const params = { outlet_id: currentOutlet || '', status: statusFilter };
      const [ordRes, statsRes, recRes] = await Promise.all([
        api.get('/api/production', { params }),
        api.get('/api/production/stats', { params: { outlet_id: currentOutlet || '' } }),
        api.get('/api/recipes'),
      ]);
      setOrders(ordRes.data.orders || []);
      setStats(statsRes.data || {});
      setRecipes(recRes.data.recipes || []);
    } catch (err) { toast.error('Failed'); }
  };

  useEffect(() => { fetchData(); }, [currentOutlet, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/production', { ...newOrder, planned_quantity: parseFloat(newOrder.planned_quantity) });
      toast.success('Production order created');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleStart = async (id) => {
    try {
      const res = await api.post(`/api/production/${id}/start`);
      toast.success(`Production started. ${res.data.consumed?.length} materials consumed.`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleComplete = async () => {
    if (!completeDialog) return;
    try {
      const res = await api.post(`/api/production/${completeDialog.id}/complete`, { ...completeForm, actual_output: parseFloat(completeForm.actual_output), waste_quantity: parseFloat(completeForm.waste_quantity) });
      toast.success(`Production completed. Yield: ${res.data.yield_percentage?.toFixed(1)}%`);
      setCompleteDialog(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/api/production/${id}/cancel`);
      toast.success('Production cancelled');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Production / Prep Orders</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage production batches and prep workflows</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="create-production-button"><Plus className="w-4 h-4" /> Production Order</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Create Production Order</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Recipe</Label>
                <Select value={newOrder.recipe_id} onValueChange={v => setNewOrder({...newOrder, recipe_id: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select recipe" /></SelectTrigger>
                  <SelectContent>{recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Outlet</Label>
                  <Select value={newOrder.outlet_id} onValueChange={v => setNewOrder({...newOrder, outlet_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Planned Qty</Label><Input type="number" value={newOrder.planned_quantity} onChange={e => setNewOrder({...newOrder, planned_quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={newOrder.planned_date} onChange={e => setNewOrder({...newOrder, planned_date: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Priority</Label>
                  <Select value={newOrder.priority} onValueChange={v => setNewOrder({...newOrder, priority: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Input value={newOrder.notes} onChange={e => setNewOrder({...newOrder, notes: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <Button type="submit" className="w-full">Create Order</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {['draft', 'planned', 'in_progress', 'completed', 'closed', 'cancelled'].map(s => {
          const sc = statusConfig[s];
          return (
            <Card key={s} className={`bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-bg-strong)] ${statusFilter === s ? 'border-[hsl(var(--primary))]/50' : ''}`} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              <CardContent className="p-3 text-center">
                <Badge variant="outline" className={`text-[9px] mb-1 ${sc.color}`}>{s.replace('_', ' ')}</Badge>
                <p className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats[s] || 0}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Orders - Kanban-style cards */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-8 text-center">
              <Factory className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
              <p className="text-[hsl(var(--muted-foreground))]">No production orders{statusFilter ? ` with status "${statusFilter}"` : ''}. Create one to start!</p>
            </CardContent>
          </Card>
        ) : orders.map(po => {
          const sc = statusConfig[po.status] || statusConfig.draft;
          return (
            <Card key={po.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${sc.bg} flex items-center justify-center`}>
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[hsl(var(--primary))]">{po.po_number}</span>
                        <Badge variant="outline" className={`text-[9px] ${sc.color}`}>{po.status?.replace('_', ' ')}</Badge>
                        <span className={`text-[10px] font-semibold ${priorityColors[po.priority] || ''}`}>{po.priority?.toUpperCase()}</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{po.recipe_name} {po.output_item_name ? `→ ${po.output_item_name}` : ''}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{po.outlet_name} · Planned: {po.planned_quantity} · Date: {po.planned_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {po.yield_percentage > 0 && <Badge variant="outline" className="text-[9px]">Yield: {po.yield_percentage?.toFixed(0)}%</Badge>}
                    {['draft', 'planned'].includes(po.status) && (
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => handleStart(po.id)} data-testid={`start-po-${po.id}`}>
                        <Play className="w-3 h-3" /> Start
                      </Button>
                    )}
                    {po.status === 'in_progress' && (
                      <Button size="sm" className="h-8 gap-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => { setCompleteDialog(po); setCompleteForm({ actual_output: po.planned_quantity, waste_quantity: 0, notes: '' }); }}>
                        <CheckCircle className="w-3 h-3" /> Complete
                      </Button>
                    )}
                    {!['completed', 'closed', 'cancelled'].includes(po.status) && (
                      <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:bg-red-500/10" onClick={() => handleCancel(po.id)}>
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>Complete Production</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Completing: <span className="font-semibold">{completeDialog?.recipe_name}</span> ({completeDialog?.po_number})</p>
            <div><Label>Actual Output</Label><Input type="number" value={completeForm.actual_output} onChange={e => setCompleteForm({...completeForm, actual_output: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <div><Label>Waste Quantity</Label><Input type="number" value={completeForm.waste_quantity} onChange={e => setCompleteForm({...completeForm, waste_quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <div><Label>Notes</Label><Input value={completeForm.notes} onChange={e => setCompleteForm({...completeForm, notes: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <Button className="w-full" onClick={handleComplete}>Complete Production</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
