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
import { Plus, ClipboardCheck, CheckCircle2 } from 'lucide-react';

export default function WarehouseCounts() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ count_type: 'full', notes: '', lines: [] });
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const res = await api.get('/api/warehouse/counts', { params: { outlet_id: currentOutlet, limit: 50 } });
      setCounts(res.data.counts || []);
    } finally { setLoading(false); }
  }, [currentOutlet]);

  useEffect(() => { load(); }, [load]);

  const loadStock = async () => {
    if (!currentOutlet) return;
    const res = await api.get('/api/warehouse/stock-snapshot', { params: { outlet_id: currentOutlet } });
    const rows = res.data.stock || [];
    setStock(rows);
    // Pre-fill all items as lines (for full count)
    setForm(f => ({
      ...f,
      lines: rows.map(s => ({
        item_id: s.item_id,
        item_name: s.item_name || 'Unknown',
        expected_qty: s.quantity || 0,
        counted_qty: '',
        uom: s.uom || 'pcs',
        notes: '',
      })),
    }));
  };

  const openAdd = async () => {
    setForm({ count_type: 'full', notes: '', lines: [] });
    await loadStock();
    setAddOpen(true);
  };

  const updLine = (i, patch) => setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));

  const submit = async () => {
    const filled = form.lines.filter(l => l.counted_qty !== '' && l.counted_qty !== null);
    if (filled.length === 0) { toast.error(lang === 'id' ? 'Isi minimal 1 hitungan' : 'Fill at least 1 count'); return; }
    try {
      const res = await api.post('/api/warehouse/counts', {
        outlet_id: currentOutlet,
        count_type: form.count_type,
        notes: form.notes,
        lines: filled.map(l => ({ ...l, expected_qty: parseFloat(l.expected_qty || 0), counted_qty: parseFloat(l.counted_qty) })),
      });
      setResult(res.data);
      toast.success(`${res.data.count_number} — ${res.data.matches} match, ${res.data.variances} variance`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (!currentOutlet) return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet' : 'Select outlet'}</div>;

  return (
    <div className="space-y-4" data-testid="warehouse-counts-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Stok Opname' : 'Inventory Count'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{counts.length} {lang === 'id' ? 'sesi' : 'sessions'}</p>
        </div>
        <Button onClick={openAdd} className="gap-2" data-testid="wh-count-add"><Plus className="w-4 h-4" />{lang === 'id' ? 'Mulai Stok Opname' : 'Start Count'}</Button>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">No. COUNT</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tipe' : 'Type'}</th>
                <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Item Dihitung' : 'Items Counted'}</th>
                <th className="text-right py-2.5 px-4">Match</th>
                <th className="text-right py-2.5 px-4">Variance</th>
                <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Total Variance' : 'Total Variance'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-10">Loading...</td></tr>}
              {!loading && counts.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada stok opname' : 'No counts yet'}
                </td></tr>
              )}
              {counts.map(c => (
                <tr key={c.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`wh-count-row-${c.id}`}>
                  <td className="py-2 px-4 font-mono text-xs">{c.count_number}</td>
                  <td className="py-2 px-4 text-xs">{c.date}</td>
                  <td className="py-2 px-4"><Badge variant="outline" className="text-[10px] capitalize">{c.count_type}</Badge></td>
                  <td className="py-2 px-4 text-right">{c.total_items}</td>
                  <td className="py-2 px-4 text-right text-emerald-400">{c.matches}</td>
                  <td className="py-2 px-4 text-right text-amber-400">{c.variances}</td>
                  <td className={`py-2 px-4 text-right font-medium ${(c.total_variance || 0) < 0 ? 'text-[hsl(var(--destructive))]' : 'text-emerald-400'}`}>{(c.total_variance || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setResult(null); }}>
        <DialogContent className="max-w-3xl bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle>{lang === 'id' ? 'Sesi Stok Opname' : 'Inventory Count Session'}</DialogTitle></DialogHeader>
          {result ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-semibold">{result.count_number}</div>
                  <div className="text-xs">Match: {result.matches} • Variance: {result.variances} • Total: {result.total_variance.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {lang === 'id' ? 'Stok telah diselaraskan ke hasil hitung fisik. Stock movement tercatat sebagai count_adjustment.' : 'Stock has been reconciled to the counted quantities.'}
              </div>
              <DialogFooter>
                <Button onClick={() => { setAddOpen(false); setResult(null); }}>Selesai</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Tipe Opname' : 'Count Type'}</Label>
                    <Select value={form.count_type} onValueChange={(v) => setForm(f => ({ ...f, count_type: v }))}>
                      <SelectTrigger className="h-9" data-testid="wh-count-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">{lang === 'id' ? 'Full (semua item)' : 'Full'}</SelectItem>
                        <SelectItem value="cycle">Cycle</SelectItem>
                        <SelectItem value="spot">Spot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'id' ? `${form.lines.length} item siap dihitung. Isi jumlah fisik yang dihitung — hanya baris terisi akan diproses.` : `${form.lines.length} items ready. Fill counted qty — only filled rows are posted.`}
                </div>
                <div className="border border-[var(--glass-border)] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--glass-bg-strong)]">
                      <tr><th className="text-left p-2">Item</th><th className="p-2 w-20">UOM</th><th className="p-2 w-24">{lang === 'id' ? 'Sistem' : 'System'}</th><th className="p-2 w-24">{lang === 'id' ? 'Hitungan' : 'Counted'}</th><th className="p-2 w-16">Δ</th></tr>
                    </thead>
                    <tbody>
                      {form.lines.map((l, i) => {
                        const filled = l.counted_qty !== '' && l.counted_qty !== null;
                        const delta = filled ? parseFloat(l.counted_qty) - parseFloat(l.expected_qty || 0) : null;
                        return (
                          <tr key={i} className="border-t border-[var(--glass-border)]">
                            <td className="p-2">{l.item_name}</td>
                            <td className="p-2 text-[hsl(var(--muted-foreground))]">{l.uom}</td>
                            <td className="p-2">{l.expected_qty}</td>
                            <td className="p-2"><Input className="h-7 text-xs" type="number" value={l.counted_qty} onChange={(e) => updLine(i, { counted_qty: e.target.value })} data-testid={`wh-count-line-${i}`} /></td>
                            <td className={`p-2 font-semibold ${delta == null ? 'text-[hsl(var(--muted-foreground))]' : delta === 0 ? 'text-emerald-400' : delta > 0 ? 'text-amber-400' : 'text-[hsl(var(--destructive))]'}`}>{delta == null ? '—' : (delta > 0 ? '+' : '') + delta.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {form.lines.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Tidak ada stok untuk dihitung' : 'No stock to count'}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <Textarea placeholder={lang === 'id' ? 'Catatan' : 'Notes'} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
                <Button onClick={submit} data-testid="wh-count-submit">{lang === 'id' ? 'Submit & Rekonsiliasi' : 'Submit & Reconcile'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
