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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '../../components/common/DataTable';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function PettyCash() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ account_id: '', amount: 0, description: '', category: 'operational', receipt_ref: '' });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async () => {
    if (!currentOutlet) return;
    try {
      const [expRes, accRes] = await Promise.all([
        api.get('/api/finance/petty-cash', { params: { outlet_id: currentOutlet } }),
        api.get('/api/finance/accounts', { params: { outlet_id: currentOutlet, type: 'petty_cash' } }),
      ]);
      setExpenses(expRes.data.expenses || []);
      setAccounts(accRes.data.accounts || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/finance/petty-cash', { ...form, outlet_id: currentOutlet, amount: parseFloat(form.amount) });
      toast.success('Petty cash expense recorded');
      setShowCreate(false);
      setForm({ account_id: '', amount: 0, description: '', category: 'operational', receipt_ref: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categories = ['operational', 'transport', 'supplies', 'cleaning', 'maintenance', 'other'];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(e.description?.toLowerCase().includes(q) || e.receipt_ref?.toLowerCase().includes(q) || e.date?.includes(q))) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, search]);

  const columns = [
    { key: 'date', label: lang === 'id' ? 'Tanggal' : 'Date', sortable: true, width: '120px',
      render: (v) => <span className="text-xs">{v}</span> },
    { key: 'description', label: lang === 'id' ? 'Deskripsi' : 'Description',
      render: (v) => v || '-' },
    { key: 'category', label: lang === 'id' ? 'Kategori' : 'Category', width: '130px',
      render: (v) => <Badge variant="outline" className="text-[10px] capitalize">{v}</Badge> },
    { key: 'receipt_ref', label: lang === 'id' ? 'Nota' : 'Receipt', width: '120px',
      render: (v) => <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{v || '-'}</span> },
    { key: 'amount', label: 'Amount', align: 'right', sortable: true, width: '140px',
      render: (v) => <span className="font-medium text-red-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(v)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Petty Cash</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage petty cash expenses</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="add-petty-cash"><Plus className="w-4 h-4" /> Add Expense</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Record Petty Cash Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Account</Label>
                <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Petty Cash Account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Receipt Ref</Label><Input value={form.receipt_ref} onChange={e => setForm({...form, receipt_ref: e.target.value})} className="bg-[hsl(var(--secondary))]" placeholder="PC-001" /></div>
              <Button type="submit" className="w-full">Record Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Spent</span>
            <p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Transactions</span>
            <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filteredExpenses}
        columns={columns}
        total={filteredExpenses.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder={lang === 'id' ? 'Cari deskripsi, nota, tanggal...' : 'Search description, receipt, date...'}
        filters={[
          { key: 'category', label: lang === 'id' ? 'Kategori' : 'Category', value: categoryFilter, onChange: (v) => { setCategoryFilter(v); setPage(0); }, options: categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })) },
        ]}
        emptyTitle={lang === 'id' ? 'Belum ada pengeluaran' : 'No petty cash expenses'}
        emptyDescription={lang === 'id' ? 'Tambahkan pengeluaran untuk memulai' : 'Add an expense to start'}
      />
    </div>
  );
}
