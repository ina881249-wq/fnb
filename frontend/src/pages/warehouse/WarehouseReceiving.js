import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Package, Search, Eye, Trash2 } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function WarehouseReceiving() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [receipts, setReceipts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(null);
  const [form, setForm] = useState({ supplier_id: '', supplier_name: '', po_reference: '', invoice_number: '', notes: '', lines: [] });
  const [newLine, setNewLine] = useState({ item_id: '', item_name: '', quantity: '', unit_cost: '' });

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const params = { outlet_id: currentOutlet, limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/api/warehouse/receipts', { params });
      setReceipts(res.data.receipts || []);
      setTotal(res.data.total || 0);
    } finally { setLoading(false); }
  }, [currentOutlet, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/api/warehouse/suppliers').then(r => setSuppliers(r.data.suppliers || []));
    api.get('/api/inventory/items', { params: { limit: 300 } }).then(r => setItems(r.data.items || []));
  }, []);

  const addLine = () => {
    if (!newLine.item_id) { toast.error(lang === 'id' ? 'Pilih item dari katalog' : 'Pick item from catalog'); return; }
    if (!newLine.quantity) { toast.error(lang === 'id' ? 'Isi qty' : 'Fill qty'); return; }
    const it = items.find(i => i.id === newLine.item_id);
    setForm(f => ({ ...f, lines: [...f.lines, { ...newLine, quantity: parseFloat(newLine.quantity), unit_cost: parseFloat(newLine.unit_cost || 0), uom: it?.uom || 'pcs' }] }));
    setNewLine({ item_id: '', item_name: '', quantity: '', unit_cost: '' });
  };
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const submit = async () => {
    if (form.lines.length === 0) { toast.error(lang === 'id' ? 'Tambahkan minimal 1 item' : 'Add at least 1 line'); return; }
    try {
      const supplier = suppliers.find(s => s.id === form.supplier_id);
      await api.post('/api/warehouse/receipts', {
        outlet_id: currentOutlet,
        supplier_id: form.supplier_id || null,
        supplier_name: supplier?.name || form.supplier_name || '',
        po_reference: form.po_reference,
        invoice_number: form.invoice_number,
        lines: form.lines,
        notes: form.notes,
      });
      toast.success(lang === 'id' ? 'Penerimaan berhasil dicatat' : 'Receipt posted');
      setAddOpen(false);
      setForm({ supplier_id: '', supplier_name: '', po_reference: '', invoice_number: '', notes: '', lines: [] });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const totalValue = form.lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  return (
    <div className="space-y-4" data-testid="warehouse-receiving-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Penerimaan Barang' : 'Goods Receiving'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{total} {lang === 'id' ? 'catatan' : 'records'}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="wh-receipt-add">
          <Plus className="w-4 h-4" /> {lang === 'id' ? 'Catat Penerimaan' : 'Record Receipt'}
        </Button>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === 'id' ? 'Cari no. GRN, supplier, PO, invoice...' : 'Search GRN, supplier, PO...'} className="pl-9 h-9 bg-[var(--glass-bg-strong)]" data-testid="wh-receipt-search" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">GRN #</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="text-left py-2.5 px-4">Supplier</th>
                <th className="text-left py-2.5 px-4">PO / Invoice</th>
                <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Item' : 'Items'}</th>
                <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Nilai' : 'Value'}</th>
                <th className="text-right py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-10">{lang === 'id' ? 'Memuat...' : 'Loading...'}</td></tr>}
              {!loading && receipts.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada penerimaan' : 'No receipts yet'}
                </td></tr>
              )}
              {receipts.map(r => (
                <tr key={r.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`wh-receipt-row-${r.id}`}>
                  <td className="py-2 px-4 font-mono text-xs">{r.receipt_number}</td>
                  <td className="py-2 px-4 text-xs">{r.date}</td>
                  <td className="py-2 px-4">{r.supplier_name || '-'}</td>
                  <td className="py-2 px-4 text-xs text-[hsl(var(--muted-foreground))]">{r.po_reference || r.invoice_number || '-'}</td>
                  <td className="py-2 px-4 text-right">{r.total_items}</td>
                  <td className="py-2 px-4 text-right font-semibold text-[hsl(var(--primary))]">{fmtIDR(r.total_value)}</td>
                  <td className="py-2 px-4 text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewOpen(r)} data-testid={`wh-receipt-view-${r.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle>{lang === 'id' ? 'Catat Penerimaan Baru' : 'New Receipt'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">Supplier</Label>
                <Select value={form.supplier_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, supplier_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="h-9" data-testid="wh-receipt-supplier"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(no supplier)</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">PO Reference</Label>
                <Input value={form.po_reference} onChange={(e) => setForm(f => ({ ...f, po_reference: e.target.value }))} data-testid="wh-receipt-po" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Invoice Number</Label>
              <Input value={form.invoice_number} onChange={(e) => setForm(f => ({ ...f, invoice_number: e.target.value }))} data-testid="wh-receipt-invoice" />
            </div>

            {/* Lines */}
            <div className="border border-[var(--glass-border)] rounded-lg p-3">
              <div className="font-semibold text-xs mb-2">{lang === 'id' ? 'Item Diterima' : 'Received Items'}</div>
              {form.lines.length > 0 && (
                <div className="space-y-1 mb-3">
                  {form.lines.map((ln, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--glass-bg-strong)] text-xs">
                      <span className="flex-1">{ln.item_name}</span>
                      <span>{ln.quantity} × {fmtIDR(ln.unit_cost)}</span>
                      <span className="font-semibold text-[hsl(var(--primary))] w-24 text-right">{fmtIDR(ln.quantity * ln.unit_cost)}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[hsl(var(--destructive))]" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-12 gap-2">
                <Select value={newLine.item_id} onValueChange={(v) => {
                  const it = items.find(i => i.id === v); if (it) setNewLine(n => ({ ...n, item_id: it.id, item_name: it.name }));
                }}>
                  <SelectTrigger className="col-span-5 h-9 text-xs" data-testid="wh-line-item-picker"><SelectValue placeholder={lang === 'id' ? 'Pilih item' : 'Pick item'} /></SelectTrigger>
                  <SelectContent>
                    {items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="col-span-2 h-9 text-xs" type="number" placeholder="qty" value={newLine.quantity} onChange={(e) => setNewLine(n => ({ ...n, quantity: e.target.value }))} data-testid="wh-line-qty" />
                <Input className="col-span-4 h-9 text-xs" type="number" placeholder="unit cost" value={newLine.unit_cost} onChange={(e) => setNewLine(n => ({ ...n, unit_cost: e.target.value }))} data-testid="wh-line-cost" />
                <Button size="sm" className="col-span-1 h-9 p-0" onClick={addLine} data-testid="wh-line-add"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {form.lines.length > 0 && (
              <div className="text-right text-sm font-semibold">Total: <span className="text-[hsl(var(--primary))]">{fmtIDR(totalValue)}</span></div>
            )}
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Catatan' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submit} data-testid="wh-receipt-submit">{lang === 'id' ? 'Posting Penerimaan' : 'Post Receipt'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewOpen} onOpenChange={(o) => !o && setViewOpen(null)}>
        <DialogContent className="max-w-lg bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle>{viewOpen?.receipt_number}</DialogTitle></DialogHeader>
          {viewOpen && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[hsl(var(--muted-foreground))]">Tanggal:</span> {viewOpen.date}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Supplier:</span> {viewOpen.supplier_name}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">PO:</span> {viewOpen.po_reference || '-'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Invoice:</span> {viewOpen.invoice_number || '-'}</div>
              </div>
              <div className="border-t border-[var(--glass-border)] pt-2">
                {viewOpen.lines?.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{l.quantity}× {l.item_name}</span>
                    <span>{fmtIDR(l.total_cost || l.quantity * l.unit_cost)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--glass-border)] pt-2 flex justify-between font-semibold text-[hsl(var(--primary))]">
                <span>Total</span><span>{fmtIDR(viewOpen.total_value)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
