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
import { Plus, Settings, Trash2 } from 'lucide-react';

const CATEGORIES = ['manual', 'correction', 'damage', 'theft', 'expired', 'other'];

export default function WarehouseAdjustments() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ category: 'manual', reason: '', notes: '', lines: [] });

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const res = await api.get('/api/warehouse/adjustments', { params: { outlet_id: currentOutlet, limit: 50 } });
      setAdjustments(res.data.adjustments || []);
    } finally { setLoading(false); }
  }, [currentOutlet]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!currentOutlet) return;
    api.get('/api/warehouse/stock-snapshot', { params: { outlet_id: currentOutlet } }).then(r => setStock(r.data.stock || []));
  }, [currentOutlet]);

  const addLine = (s) => {
    if (form.lines.find(l => l.item_id === s.item_id)) return;
    setForm(f => ({ ...f, lines: [...f.lines, { item_id: s.item_id, item_name: s.item_name || 'Unknown', current_qty: s.quantity || 0, new_qty: s.quantity || 0, uom: s.uom || 'pcs', reason: '', notes: '' }] }));
  };
  const updLine = (i, patch) => setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const submit = async () => {
    if (!form.reason) { toast.error(lang === 'id' ? 'Alasan wajib' : 'Reason required'); return; }
    if (form.lines.length === 0) { toast.error(lang === 'id' ? 'Tambah item' : 'Add items'); return; }
    const valid = form.lines.every(l => l.reason && l.new_qty !== '');
    if (!valid) { toast.error(lang === 'id' ? 'Isi alasan tiap item' : 'Fill reason per line'); return; }
    try {
      await api.post('/api/warehouse/adjustments', {
        outlet_id: currentOutlet,
        category: form.category, reason: form.reason,
        notes: form.notes,
        lines: form.lines.map(l => ({ ...l, current_qty: parseFloat(l.current_qty), new_qty: parseFloat(l.new_qty) })),
      });
      toast.success(lang === 'id' ? 'Adjustment tercatat' : 'Adjustment posted');
      setAddOpen(false);
      setForm({ category: 'manual', reason: '', notes: '', lines: [] });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (!currentOutlet) return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet' : 'Select outlet'}</div>;

  return (
    <div className="space-y-4" data-testid="warehouse-adjustments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Penyesuaian Stok' : 'Stock Adjustments'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{adjustments.length} {lang === 'id' ? 'catatan' : 'records'}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="wh-adj-add"><Plus className="w-4 h-4" />{lang === 'id' ? 'Adjustment Baru' : 'New Adjustment'}</Button>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">No. ADJ</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Kategori' : 'Category'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Alasan' : 'Reason'}</th>
                <th className="text-right py-2.5 px-4">Items</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Oleh' : 'By'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-10">Loading...</td></tr>}
              {!loading && adjustments.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada adjustment' : 'No adjustments'}
                </td></tr>
              )}
              {adjustments.map(a => (
                <tr key={a.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`wh-adj-row-${a.id}`}>
                  <td className="py-2 px-4 font-mono text-xs">{a.adjustment_number}</td>
                  <td className="py-2 px-4 text-xs">{a.date}</td>
                  <td className="py-2 px-4"><Badge variant="outline" className="text-[10px] capitalize border-[var(--glass-border)]">{a.category}</Badge></td>
                  <td className="py-2 px-4 max-w-xs truncate" title={a.reason}>{a.reason}</td>
                  <td className="py-2 px-4 text-right">{a.total_items}</td>
                  <td className="py-2 px-4 text-xs">{a.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle>{lang === 'id' ? 'Adjustment Baru' : 'New Adjustment'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Kategori' : 'Category'}</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9" data-testid="wh-adj-category"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Alasan Utama *' : 'Main Reason *'}</Label>
                <Input value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} data-testid="wh-adj-reason" />
              </div>
            </div>

            {/* Pick items from stock */}
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Tambah Item dari Stok' : 'Pick from Stock'}</Label>
              <Select value="" onValueChange={(v) => { const s = stock.find(x => x.item_id === v); if (s) addLine(s); }}>
                <SelectTrigger className="h-9" data-testid="wh-adj-item-picker"><SelectValue placeholder="— pilih item —" /></SelectTrigger>
                <SelectContent>
                  {stock.slice(0, 100).map(s => (
                    <SelectItem key={s.item_id} value={s.item_id}>{s.item_name} ({s.quantity || 0} {s.uom || 'pcs'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.lines.length > 0 && (
              <div className="border border-[var(--glass-border)] rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--glass-bg-strong)]">
                    <tr><th className="text-left p-2">Item</th><th className="p-2 w-20">Current</th><th className="p-2 w-20">New</th><th className="p-2 w-16">Delta</th><th className="text-left p-2">Reason</th><th className="w-8"></th></tr>
                  </thead>
                  <tbody>
                    {form.lines.map((l, i) => {
                      const delta = (parseFloat(l.new_qty || 0) - parseFloat(l.current_qty || 0));
                      return (
                        <tr key={i} className="border-t border-[var(--glass-border)]">
                          <td className="p-2">{l.item_name}</td>
                          <td className="p-2">{l.current_qty}</td>
                          <td className="p-2"><Input className="h-7 text-xs" type="number" value={l.new_qty} onChange={(e) => updLine(i, { new_qty: e.target.value })} data-testid={`wh-adj-line-new-${i}`} /></td>
                          <td className={`p-2 font-semibold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>{delta > 0 ? '+' : ''}{delta.toFixed(2)}</td>
                          <td className="p-2"><Input className="h-7 text-xs" value={l.reason} onChange={(e) => updLine(i, { reason: e.target.value })} placeholder={lang === 'id' ? 'alasan' : 'reason'} data-testid={`wh-adj-line-reason-${i}`} /></td>
                          <td className="p-2"><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Textarea placeholder={lang === 'id' ? 'Catatan tambahan' : 'Additional notes'} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submit} data-testid="wh-adj-submit">{lang === 'id' ? 'Posting' : 'Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
