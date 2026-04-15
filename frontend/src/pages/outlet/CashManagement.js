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
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function CashManagement() {
  const { currentOutlet } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newMovement, setNewMovement] = useState({ type: 'cash_in', to_account_id: '', amount: 0, reference: '', description: '' });

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
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Recent Movements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movements.map(m => (
                <TableRow key={m.id} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell className="text-sm">{m.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {m.type === 'cash_in' ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                      <Badge variant="outline" className={`text-[10px] ${m.type === 'cash_in' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>{m.type?.replace('_', ' ')}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{m.description || m.reference || '-'}</TableCell>
                  <TableCell className="text-right font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(m.amount)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{m.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
