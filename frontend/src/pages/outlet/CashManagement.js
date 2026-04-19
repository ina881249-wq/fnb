import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '../../components/common/DataTable';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function CashManagement() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newMovement, setNewMovement] = useState({ type: 'cash_in', to_account_id: '', amount: 0, reference: '', description: '' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async () => {
    if (!currentOutlet) return;
    try {
      const [accRes, movRes] = await Promise.all([
        api.get('/api/finance/accounts', { params: { outlet_id: currentOutlet } }),
        api.get('/api/finance/cash-movements', { params: { outlet_id: currentOutlet, limit: 30 } }),
      ]);
      setAccounts(accRes.data.accounts || []);
      setMovements(movRes.data.movements || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(m.description?.toLowerCase().includes(s) || m.reference?.toLowerCase().includes(s) || m.date?.includes(s))) return false;
      }
      return true;
    });
  }, [movements, typeFilter, search]);

  const columns = [
    { key: 'date', label: lang === 'id' ? 'Tanggal' : 'Date', sortable: true, width: '120px',
      render: (v) => <span className="text-xs">{v}</span> },
    { key: 'type', label: lang === 'id' ? 'Tipe' : 'Type', width: '130px',
      render: (v) => (
        <div className="flex items-center gap-1.5">
          {v === 'cash_in' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
          <Badge variant="outline" className={`text-[10px] ${v === 'cash_in' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>{v?.replace('_', ' ')}</Badge>
        </div>
      )
    },
    { key: 'description', label: lang === 'id' ? 'Deskripsi' : 'Description',
      render: (v, row) => v || row.reference || '-' },
    { key: 'reference', label: 'Ref', width: '140px',
      render: (v) => <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{v || '-'}</span> },
    { key: 'amount', label: 'Amount', align: 'right', sortable: true, width: '140px',
      render: (v) => <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', width: '100px',
      render: (v) => <Badge variant="outline" className="text-[10px]">{v}</Badge> },
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/finance/cash-movements', { ...newMovement, outlet_id: currentOutlet, amount: parseFloat(newMovement.amount) });
      toast.success('Cash movement recorded');
      setShowCreate(false);
      setNewMovement({ type: 'cash_in', to_account_id: '', amount: 0, reference: '', description: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Cash Management</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Daily cash position and movements</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="outlet-cash-add"><Plus className="w-4 h-4" /> Record</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Record Cash Movement</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Type</Label>
                <Select value={newMovement.type} onValueChange={v => setNewMovement({...newMovement, type: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash_in">Cash In</SelectItem><SelectItem value="cash_out">Cash Out</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Account</Label>
                <Select value={newMovement.to_account_id} onValueChange={v => setNewMovement({...newMovement, to_account_id: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={newMovement.amount} onChange={e => setNewMovement({...newMovement, amount: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              <div><Label>Reference</Label><Input value={newMovement.reference} onChange={e => setNewMovement({...newMovement, reference: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <div><Label>Description</Label><Input value={newMovement.description} onChange={e => setNewMovement({...newMovement, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <Button type="submit" className="w-full" data-testid="outlet-cash-close-submit">Record</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {accounts.map(acc => (
          <Card key={acc.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{acc.name}</span>
              <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(acc.current_balance)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Movements */}
      <DataTable
        data={filteredMovements}
        columns={columns}
        total={filteredMovements.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder={lang === 'id' ? 'Cari deskripsi, ref, tanggal...' : 'Search description, ref, date...'}
        filters={[
          { key: 'type', label: lang === 'id' ? 'Tipe' : 'Type', value: typeFilter, onChange: (v) => { setTypeFilter(v); setPage(0); }, options: [
            { value: 'cash_in', label: 'Cash In' },
            { value: 'cash_out', label: 'Cash Out' },
          ]},
        ]}
        emptyTitle={lang === 'id' ? 'Belum ada pergerakan kas' : 'No cash movements'}
        emptyDescription={lang === 'id' ? 'Pergerakan kas akan tampil di sini' : 'Cash movements will appear here'}
      />
    </div>
  );
}
