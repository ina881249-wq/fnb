import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Plus, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function SalesSummary() {
  const { currentOutlet } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    total_sales: 0, cash_sales: 0, card_sales: 0, online_sales: 0, notes: '',
  });

  const fetchData = async () => {
    if (!currentOutlet) return;
    try {
      const res = await api.get('/api/finance/sales-summaries', { params: { outlet_id: currentOutlet, limit: 30 } });
      setSummaries(res.data.summaries || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = parseFloat(form.cash_sales) + parseFloat(form.card_sales) + parseFloat(form.online_sales);
    try {
      await api.post('/api/finance/sales-summaries', {
        outlet_id: currentOutlet,
        date: form.date,
        total_sales: total,
        cash_sales: parseFloat(form.cash_sales),
        card_sales: parseFloat(form.card_sales),
        online_sales: parseFloat(form.online_sales),
        notes: form.notes,
      });
      toast.success('Sales summary saved');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Sales Summary</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Daily sales recording (manual input)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="add-sales-summary"><Plus className="w-4 h-4" /> Add Sales</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Record Daily Sales</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Cash Sales</Label><Input type="number" value={form.cash_sales} onChange={e => setForm({...form, cash_sales: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Card Sales</Label><Input type="number" value={form.card_sales} onChange={e => setForm({...form, card_sales: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Online Sales</Label><Input type="number" value={form.online_sales} onChange={e => setForm({...form, online_sales: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Total Sales</span>
                <p className="text-lg font-semibold text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>
                  {formatCurrency(parseFloat(form.cash_sales || 0) + parseFloat(form.card_sales || 0) + parseFloat(form.online_sales || 0))}
                </p>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="bg-[hsl(var(--secondary))]" placeholder="Optional notes" /></div>
              <Button type="submit" className="w-full">Save Sales Summary</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Date</TableHead><TableHead className="text-right">Cash</TableHead><TableHead className="text-right">Card</TableHead>
              <TableHead className="text-right">Online</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {summaries.map((s, i) => (
                <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell className="font-medium">{s.date}</TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.cash_sales)}</TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.card_sales)}</TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.online_sales)}</TableCell>
                  <TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.total_sales)}</TableCell>
                  <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{s.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
