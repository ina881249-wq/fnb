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
import { Plus, CheckCircle, XCircle, AlertTriangle, Scale } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;
const statusColors = {
  matched: 'border-green-500/30 text-green-400',
  variance: 'border-amber-500/30 text-amber-400',
  approved: 'border-green-500/30 text-green-400',
  rejected: 'border-red-500/30 text-red-400',
};

export default function ReconciliationPage() {
  const { currentOutlet, outlets } = useAuth();
  const [recs, setRecs] = useState([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [comment, setComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ outlet_id: '', account_id: '', date: new Date().toISOString().split('T')[0], type: 'cash', expected_amount: 0, actual_amount: 0, variance_reason: '' });

  const fetchData = async () => {
    try {
      const params = { skip: page * 20, limit: 20, status: statusFilter, outlet_id: currentOutlet || '' };
      const [recRes, accRes] = await Promise.all([
        api.get('/api/reconciliation', { params }),
        api.get('/api/finance/accounts', { params: { outlet_id: currentOutlet || '' } }),
      ]);
      setRecs(recRes.data.reconciliations || []);
      setTotal(recRes.data.total || 0);
      setAccounts(accRes.data.accounts || []);
    } catch (err) { toast.error('Failed to load'); }
  };

  useEffect(() => { fetchData(); }, [page, statusFilter, currentOutlet]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/reconciliation', { ...form, expected_amount: parseFloat(form.expected_amount), actual_amount: parseFloat(form.actual_amount) });
      toast.success('Reconciliation recorded');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/reconciliation/${id}/${action}`, { comment });
      toast.success(`Reconciliation ${action}d`);
      setActionDialog(null); setComment('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const diff = parseFloat(form.actual_amount || 0) - parseFloat(form.expected_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Reconciliation</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Cash & bank reconciliation with variance tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[140px] bg-[var(--glass-bg)] border-[var(--glass-border)]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="matched">Matched</SelectItem><SelectItem value="variance">Variance</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
          </Select>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="gap-2" data-testid="create-recon-button"><Scale className="w-4 h-4" /> Reconcile</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Cash/Bank Reconciliation</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Outlet</Label>
                    <Select value={form.outlet_id} onValueChange={v => setForm({...form, outlet_id: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account</Label>
                    <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{accounts.filter(a => ['outlet_cash', 'bank', 'petty_cash'].includes(a.type)).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Expected (System)</Label><Input type="number" value={form.expected_amount} onChange={e => setForm({...form, expected_amount: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                  <div><Label>Actual (Physical)</Label><Input type="number" value={form.actual_amount} onChange={e => setForm({...form, actual_amount: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                </div>
                <div className={`p-3 rounded-lg border ${Math.abs(diff) < 0.01 ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Difference</span>
                  <p className={`text-lg font-semibold ${Math.abs(diff) < 0.01 ? 'text-green-400' : 'text-amber-400'}`} style={{ fontFamily: 'Space Grotesk' }}>
                    {formatCurrency(diff)} {Math.abs(diff) < 0.01 ? '(Matched)' : ''}
                  </p>
                </div>
                {Math.abs(diff) > 0 && (
                  <div><Label>Variance Reason</Label><Input value={form.variance_reason} onChange={e => setForm({...form, variance_reason: e.target.value})} className="bg-[hsl(var(--secondary))]" placeholder="Explain the difference..." required /></div>
                )}
                <Button type="submit" className="w-full">Submit Reconciliation</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Date</TableHead><TableHead>Outlet</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead>
              <TableHead className="text-right">Expected</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Diff</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recs.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No reconciliation records</TableCell></TableRow>
              ) : recs.map(r => (
                <TableRow key={r.id} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{r.outlet_name || '-'}</TableCell>
                  <TableCell className="text-sm">{r.account_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px]">{r.type}</Badge></TableCell>
                  <TableCell className="text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.expected_amount)}</TableCell>
                  <TableCell className="text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.actual_amount)}</TableCell>
                  <TableCell className={`text-right text-sm font-medium ${Math.abs(r.difference) < 0.01 ? 'text-green-400' : 'text-amber-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.difference)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[9px] ${statusColors[r.status]}`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'variance' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400" onClick={() => setActionDialog({...r, action: 'approve'})}><CheckCircle className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400" onClick={() => setActionDialog({...r, action: 'reject'})}><XCircle className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>{actionDialog?.action === 'approve' ? 'Approve' : 'Reject'} Variance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Diff: <span className="font-semibold text-amber-400">{formatCurrency(actionDialog?.difference)}</span></p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Reason: {actionDialog?.variance_reason}</p>
            <div><Label>Comment</Label><Input value={comment} onChange={e => setComment(e.target.value)} className="bg-[hsl(var(--secondary))]" /></div>
            <Button className={`w-full ${actionDialog?.action === 'reject' ? 'bg-red-500 hover:bg-red-600' : ''}`} onClick={() => handleAction(actionDialog?.id, actionDialog?.action)}>{actionDialog?.action === 'approve' ? 'Approve' : 'Reject'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
