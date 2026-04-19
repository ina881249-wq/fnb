import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { DataTable } from '../../components/common/DataTable';
import { CheckCircle, XCircle, Scale } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ outlet_id: '', account_id: '', date: new Date().toISOString().split('T')[0], type: 'cash', expected_amount: 0, actual_amount: 0, variance_reason: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { skip: page * pageSize, limit: pageSize, outlet_id: currentOutlet || '' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [recRes, accRes] = await Promise.all([
        api.get('/api/reconciliation', { params }),
        api.get('/api/finance/accounts', { params: { outlet_id: currentOutlet || '' } }),
      ]);
      setRecs(recRes.data.reconciliations || []);
      setTotal(recRes.data.total || 0);
      setAccounts(accRes.data.accounts || []);
    } catch (err) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter, currentOutlet]);

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

  // Client-side filter (search, type) on top of server-side status+outlet
  const filteredRecs = useMemo(() => {
    let rows = recs;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.outlet_name || '').toLowerCase().includes(q) || (r.account_name || '').toLowerCase().includes(q) || (r.variance_reason || '').toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') rows = rows.filter(r => r.type === typeFilter);
    return rows;
  }, [recs, search, typeFilter]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => <span className="text-sm">{v}</span> },
    { key: 'outlet_name', label: 'Outlet', render: (v) => <span className="text-sm">{v || '-'}</span> },
    { key: 'account_name', label: 'Account', render: (v) => <span className="text-sm">{v || '-'}</span> },
    { key: 'type', label: 'Type', render: (v) => <Badge variant="outline" className="text-[9px]">{v}</Badge> },
    { key: 'expected_amount', label: 'Expected', align: 'right', render: (v) => <span className="text-sm">{formatCurrency(v)}</span> },
    { key: 'actual_amount', label: 'Actual', align: 'right', render: (v) => <span className="text-sm">{formatCurrency(v)}</span> },
    {
      key: 'difference', label: 'Diff', align: 'right',
      render: (v) => <span className={`text-sm font-medium ${Math.abs(v) < 0.01 ? 'text-green-400' : 'text-amber-400'}`}>{formatCurrency(v)}</span>,
    },
    { key: 'status', label: 'Status', render: (v) => <Badge variant="outline" className={`text-[9px] ${statusColors[v] || ''}`}>{v}</Badge> },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row.status === 'variance' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400" onClick={(e) => { e.stopPropagation(); setActionDialog({...row, action: 'approve'}); }} data-testid={`recon-approve-${row.id}`}><CheckCircle className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400" onClick={(e) => { e.stopPropagation(); setActionDialog({...row, action: 'reject'}); }} data-testid={`recon-reject-${row.id}`}><XCircle className="w-3.5 h-3.5" /></Button>
        </div>
      ) : null,
    },
  ];

  const filters = [
    { key: 'status', label: 'Status', value: statusFilter, onChange: (v) => { setStatusFilter(v); setPage(0); }, options: [
        { value: 'matched', label: 'Matched' }, { value: 'variance', label: 'Variance' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
    ]},
    { key: 'type', label: 'Type', value: typeFilter, onChange: setTypeFilter, options: [
        { value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank' },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Reconciliation</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Cash & bank reconciliation with variance tracking ({total} records)</p>
        </div>
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

      <DataTable
        data={filteredRecs}
        columns={columns}
        total={filteredRecs.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder="Search outlet, account, reason..."
        filters={filters}
        loading={loading}
        emptyIcon={<Scale className="w-10 h-10 opacity-30" />}
        emptyTitle="No reconciliation records"
        emptyDescription="Start a new cash/bank reconciliation."
      />

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
