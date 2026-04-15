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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Plus, DollarSign, Building2, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const accountTypeIcons = {
  bank: CreditCard,
  outlet_cash: DollarSign,
  petty_cash: Wallet,
  clearing: Building2,
};

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function FinancePage() {
  const { currentOutlet, outlets } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts');
  const [showCreate, setShowCreate] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', outlet_id: '', currency: 'IDR', opening_balance: 0, bank_name: '', account_number: '', description: '' });
  const [newMovement, setNewMovement] = useState({ type: 'cash_in', from_account_id: '', to_account_id: '', amount: 0, outlet_id: '', reference: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = currentOutlet ? { outlet_id: currentOutlet } : {};
      const [accRes, movRes] = await Promise.all([
        api.get('/api/finance/accounts', { params }),
        api.get('/api/finance/cash-movements', { params: { ...params, limit: 50 } }),
      ]);
      setAccounts(accRes.data.accounts || []);
      setMovements(movRes.data.movements || []);
    } catch (err) {
      toast.error('Failed to load finance data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/finance/accounts', newAccount);
      toast.success('Account created');
      setShowCreate(false);
      setNewAccount({ name: '', type: 'bank', outlet_id: '', currency: 'IDR', opening_balance: 0, bank_name: '', account_number: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create account');
    }
  };

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/finance/cash-movements', { ...newMovement, amount: parseFloat(newMovement.amount) });
      toast.success('Cash movement recorded');
      setShowMovement(false);
      setNewMovement({ type: 'cash_in', from_account_id: '', to_account_id: '', amount: 0, outlet_id: '', reference: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record movement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Finance & Accounting</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage accounts, cash movements, and settlements</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="create-account-button"><Plus className="w-4 h-4" /> Account</Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div><Label>Name</Label><Input value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                <div><Label>Type</Label>
                  <Select value={newAccount.type} onValueChange={v => setNewAccount({...newAccount, type: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="outlet_cash">Outlet Cash</SelectItem>
                      <SelectItem value="petty_cash">Petty Cash</SelectItem>
                      <SelectItem value="clearing">Clearing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Outlet</Label>
                  <Select value={newAccount.outlet_id} onValueChange={v => setNewAccount({...newAccount, outlet_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Head Office</SelectItem>
                      {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Opening Balance</Label><Input type="number" value={newAccount.opening_balance} onChange={e => setNewAccount({...newAccount, opening_balance: parseFloat(e.target.value) || 0})} className="bg-[hsl(var(--secondary))]" /></div>
                {newAccount.type === 'bank' && (
                  <><div><Label>Bank Name</Label><Input value={newAccount.bank_name} onChange={e => setNewAccount({...newAccount, bank_name: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                  <div><Label>Account Number</Label><Input value={newAccount.account_number} onChange={e => setNewAccount({...newAccount, account_number: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div></>
                )}
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showMovement} onOpenChange={setShowMovement}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-[var(--glass-border)]" data-testid="create-movement-button"><Plus className="w-4 h-4" /> Movement</Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Record Cash Movement</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateMovement} className="space-y-4">
                <div><Label>Type</Label>
                  <Select value={newMovement.type} onValueChange={v => setNewMovement({...newMovement, type: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_in">Cash In</SelectItem>
                      <SelectItem value="cash_out">Cash Out</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="settlement">Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Outlet</Label>
                  <Select value={newMovement.outlet_id} onValueChange={v => setNewMovement({...newMovement, outlet_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                    <SelectContent>
                      {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" value={newMovement.amount} onChange={e => setNewMovement({...newMovement, amount: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                <div><Label>To Account</Label>
                  <Select value={newMovement.to_account_id} onValueChange={v => setNewMovement({...newMovement, to_account_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Reference</Label><Input value={newMovement.reference} onChange={e => setNewMovement({...newMovement, reference: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Description</Label><Input value={newMovement.description} onChange={e => setNewMovement({...newMovement, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <Button type="submit" className="w-full">Record Movement</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="movements">Cash Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => {
                    const Icon = accountTypeIcons[acc.type] || DollarSign;
                    return (
                      <TableRow key={acc.id} className="border-[var(--glass-border)] hover:bg-white/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                            {acc.name}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{acc.type?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-[hsl(var(--muted-foreground))]">{acc.outlet_name || 'Head Office'}</TableCell>
                        <TableCell className="text-right font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(acc.current_balance)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="text-sm">{m.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          m.type === 'cash_in' ? 'border-green-500/30 text-green-400' :
                          m.type === 'cash_out' ? 'border-red-500/30 text-red-400' :
                          'border-cyan-500/30 text-cyan-400'
                        }`}>{m.type?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{m.description || '-'}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))] text-xs">{m.reference || '-'}</TableCell>
                      <TableCell className="text-right font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(m.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
