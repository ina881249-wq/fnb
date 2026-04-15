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
import { Plus, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function InventoryOutlet() {
  const { currentOutlet } = useAuth();
  const [stock, setStock] = useState([]);
  const [items, setItems] = useState([]);
  const [showMovement, setShowMovement] = useState(false);
  const [form, setForm] = useState({ type: 'count', item_id: '', quantity: 0, reason: '' });

  const fetchData = async () => {
    if (!currentOutlet) return;
    try {
      const [stockRes, itemsRes] = await Promise.all([
        api.get('/api/inventory/stock', { params: { outlet_id: currentOutlet, limit: 100 } }),
        api.get('/api/inventory/items', { params: { limit: 100 } }),
      ]);
      setStock(stockRes.data.stock || []);
      setItems(itemsRes.data.items || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/stock-movements', { ...form, outlet_id: currentOutlet, quantity: parseFloat(form.quantity) });
      toast.success('Stock movement recorded');
      setShowMovement(false);
      setForm({ type: 'count', item_id: '', quantity: 0, reason: '' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const lowStockItems = stock.filter(s => s.is_low_stock);
  const totalValue = stock.reduce((sum, s) => sum + (s.value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Inventory</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Stock levels and quick actions</p>
        </div>
        <Dialog open={showMovement} onOpenChange={setShowMovement}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="outlet-stock-movement"><Plus className="w-4 h-4" /> Stock Action</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
            <DialogHeader><DialogTitle>Stock Movement</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Action</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Stock Count</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="waste">Waste / Spoilage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Item</Label>
                <Select value={form.item_id} onValueChange={v => setForm({...form, item_id: v})}>
                  <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Item" /></SelectTrigger>
                  <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              <div><Label>Reason / Notes</Label><Input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <Button type="submit" className="w-full">Submit</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Stock Value</span>
            <p className="text-xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${lowStockItems.length > 0 ? 'border-amber-400/30' : ''}`}>
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Low Stock Items</span>
            <p className="text-xl font-semibold mt-1 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              {lowStockItems.length > 0 && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {lowStockItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Quantity</TableHead>
              <TableHead>UOM</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {stock.map((s, i) => (
                <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell className="font-medium">{s.item_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.item_category}</Badge></TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{(s.quantity || 0).toFixed(1)}</TableCell>
                  <TableCell className="text-[hsl(var(--muted-foreground))]">{s.item_uom}</TableCell>
                  <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.value)}</TableCell>
                  <TableCell>{s.is_low_stock ? <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Low</Badge> : <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">OK</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
