import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, Play, CheckCircle, XCircle, Pause, Factory, Clock } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  draft: { color: 'border-gray-500/30 text-gray-400', bg: 'bg-gray-500/10', label: 'Draft' },
  planned: { color: 'border-cyan-500/30 text-cyan-400', bg: 'bg-cyan-500/10', label: 'Planned' },
  in_progress: { color: 'border-amber-500/30 text-amber-400', bg: 'bg-amber-500/10', label: 'In Progress' },
  completed: { color: 'border-green-500/30 text-green-400', bg: 'bg-green-500/10', label: 'Completed' },
  closed: { color: 'border-purple-500/30 text-purple-400', bg: 'bg-purple-500/10', label: 'Closed' },
  cancelled: { color: 'border-red-500/30 text-red-400', bg: 'bg-red-500/10', label: 'Cancelled' },
};

const KANBAN_COLUMNS = ['draft', 'planned', 'in_progress', 'completed'];

export default function ProductionPage() {
  const { currentOutlet, outlets } = useAuth();
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [showCreate, setShowCreate] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(null);
  const [completeForm, setCompleteForm] = useState({ actual_output: 0, waste_quantity: 0, notes: '' });
  const [newOrder, setNewOrder] = useState({ recipe_id: '', outlet_id: '', planned_quantity: 1, planned_date: new Date().toISOString().split('T')[0], priority: 'normal', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      const [ordRes, recRes] = await Promise.all([
        api.get('/api/production', { params: { outlet_id: currentOutlet || '' } }),
        api.get('/api/recipes'),
      ]);
      setOrders(ordRes.data.orders || []);
      setRecipes(recRes.data.recipes || []);
    } catch (err) { toast.error('Failed'); }
  }, [currentOutlet]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      await api.post(`/api/production/${id}/start`);
      toast.success('Production started');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleComplete = async () => {
    if (!completeDialog) return;
    try {
      await api.post(`/api/production/${completeDialog.id}/complete`, { ...completeForm, actual_output: parseFloat(completeForm.actual_output), waste_quantity: parseFloat(completeForm.waste_quantity) });
      toast.success('Production completed');
      setCompleteDialog(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/api/production/${id}/cancel`);
      toast.success('Cancelled');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const priorityColors = { low: 'text-gray-400', normal: 'text-cyan-400', high: 'text-amber-400', urgent: 'text-red-400' };

  const KanbanCard = ({ po }) => {
    const sc = statusConfig[po.status] || statusConfig.draft;
    return (
      <Card className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] mb-2 hover:border-[hsl(var(--primary))]/30 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-[hsl(var(--primary))]">{po.po_number}</span>
            <span className={`text-[9px] font-bold ${priorityColors[po.priority] || ''}`}>{po.priority?.toUpperCase()}</span>
          </div>
          <p className="text-xs font-medium mb-1">{po.recipe_name}</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">{po.outlet_name} | Qty: {po.planned_quantity}</p>
          <div className="flex gap-1">
            {['draft', 'planned'].includes(po.status) && (
              <Button size="sm" className="h-6 text-[10px] gap-0.5 px-2" onClick={() => handleStart(po.id)}>
                <Play className="w-2.5 h-2.5" /> Start
              </Button>
            )}
            {po.status === 'in_progress' && (
              <Button size="sm" className="h-6 text-[10px] gap-0.5 px-2 bg-green-600" onClick={() => { setCompleteDialog(po); setCompleteForm({ actual_output: po.planned_quantity, waste_quantity: 0, notes: '' }); }}>
                <CheckCircle className="w-2.5 h-2.5" /> Done
              </Button>
            )}
            {!['completed', 'closed', 'cancelled'].includes(po.status) && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-red-400" onClick={() => handleCancel(po.id)}>
                <XCircle className="w-2.5 h-2.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Production / Prep Orders</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage production batches</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg p-0.5">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="h-7 px-3 text-xs">Kanban</Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 px-3 text-xs">List</Button>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Order</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(var(--popover))] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Create Production Order</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Recipe</Label>
                  <Select value={newOrder.recipe_id} onValueChange={v => setNewOrder({...newOrder, recipe_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <div><Label>Qty</Label><Input type="number" value={newOrder.planned_quantity} onChange={e => setNewOrder({...newOrder, planned_quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
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
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map(status => {
            const sc = statusConfig[status];
            const columnOrders = orders.filter(o => o.status === status);
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{columnOrders.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {columnOrders.length === 0 ? (
                    <div className="p-4 border border-dashed border-[var(--glass-border)] rounded-lg text-center">
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">No orders</p>
                    </div>
                  ) : columnOrders.map(po => <KanbanCard key={po.id} po={po} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {orders.length === 0 ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-8 text-center">
                <Factory className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
                <p className="text-[hsl(var(--muted-foreground))]">No production orders. Create one to start!</p>
              </CardContent>
            </Card>
          ) : orders.map(po => {
            const sc = statusConfig[po.status] || statusConfig.draft;
            return (
              <Card key={po.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${sc.bg} flex items-center justify-center`}><Factory className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[hsl(var(--primary))]">{po.po_number}</span>
                      <Badge variant="outline" className={`text-[9px] ${sc.color}`}>{sc.label}</Badge>
                      <span className={`text-[9px] font-bold ${priorityColors[po.priority]}`}>{po.priority?.toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-medium">{po.recipe_name} {po.output_item_name ? `→ ${po.output_item_name}` : ''}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{po.outlet_name} | Qty: {po.planned_quantity} | {po.planned_date}</p>
                  </div>
                  <div className="flex gap-1">
                    {['draft', 'planned'].includes(po.status) && <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => handleStart(po.id)}><Play className="w-3 h-3" /> Start</Button>}
                    {po.status === 'in_progress' && <Button size="sm" className="h-8 gap-1 text-xs bg-green-600" onClick={() => { setCompleteDialog(po); setCompleteForm({ actual_output: po.planned_quantity, waste_quantity: 0, notes: '' }); }}><CheckCircle className="w-3 h-3" /> Complete</Button>}
                    {!['completed', 'closed', 'cancelled'].includes(po.status) && <Button size="sm" variant="ghost" className="h-8 text-red-400" onClick={() => handleCancel(po.id)}><XCircle className="w-3.5 h-3.5" /></Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent className="bg-[hsl(var(--popover))] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>Complete Production</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">{completeDialog?.recipe_name} ({completeDialog?.po_number})</p>
            <div><Label>Actual Output</Label><Input type="number" value={completeForm.actual_output} onChange={e => setCompleteForm({...completeForm, actual_output: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <div><Label>Waste</Label><Input type="number" value={completeForm.waste_quantity} onChange={e => setCompleteForm({...completeForm, waste_quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <div><Label>Notes</Label><Input value={completeForm.notes} onChange={e => setCompleteForm({...completeForm, notes: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
            <Button className="w-full" onClick={handleComplete}>Complete Production</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
