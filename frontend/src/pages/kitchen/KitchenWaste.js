import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const CATEGORIES = [
  { value: 'spoilage', labelEn: 'Spoilage', labelId: 'Busuk/Basi' },
  { value: 'overproduction', labelEn: 'Overproduction', labelId: 'Produksi Berlebih' },
  { value: 'error', labelEn: 'Cooking Error', labelId: 'Kesalahan Masak' },
  { value: 'expired', labelEn: 'Expired', labelId: 'Kadaluarsa' },
  { value: 'breakage', labelEn: 'Breakage', labelId: 'Pecah/Rusak' },
  { value: 'other', labelEn: 'Other', labelId: 'Lainnya' },
];

export default function KitchenWaste() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [items, setItems] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    item_id: '', item_name: '', quantity: '', uom: 'pcs',
    reason: '', category: 'spoilage', cost: '', notes: ''
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const params = { outlet_id: currentOutlet, limit: 100 };
      if (filterCategory !== 'all') params.category = filterCategory;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get('/api/kitchen/waste', { params });
      setItems(res.data.waste || []);
      setTotal(res.data.total || 0);
      setTotalCost(res.data.total_cost || 0);
    } catch (e) {
      toast.error(lang === 'id' ? 'Gagal memuat waste' : 'Failed to load waste');
    } finally { setLoading(false); }
  }, [currentOutlet, filterCategory, dateFrom, dateTo, lang]);

  useEffect(() => { load(); }, [load]);

  // Load items master for selection (optional)
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/inventory/items', { params: { limit: 200 } });
        setRawItems(res.data.items || []);
      } catch (e) { /* ignore */ }
    };
    fetch();
  }, []);

  const submit = async () => {
    if (!form.item_name.trim()) { toast.error(lang === 'id' ? 'Nama item wajib' : 'Item name required'); return; }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { toast.error(lang === 'id' ? 'Qty harus > 0' : 'Qty must be > 0'); return; }
    if (!form.reason.trim()) { toast.error(lang === 'id' ? 'Alasan wajib' : 'Reason required'); return; }
    try {
      await api.post('/api/kitchen/waste', {
        outlet_id: currentOutlet,
        item_id: form.item_id || null,
        item_name: form.item_name,
        quantity: parseFloat(form.quantity),
        uom: form.uom,
        reason: form.reason,
        category: form.category,
        cost: form.cost ? parseFloat(form.cost) : 0,
        notes: form.notes,
      });
      toast.success(lang === 'id' ? 'Waste tercatat' : 'Waste logged');
      setAddOpen(false);
      setForm({ item_id: '', item_name: '', quantity: '', uom: 'pcs', reason: '', category: 'spoilage', cost: '', notes: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const removeWaste = async (id) => {
    if (!window.confirm(lang === 'id' ? 'Hapus log waste ini?' : 'Delete this waste log?')) return;
    try {
      await api.delete(`/api/kitchen/waste/${id}`);
      toast.success(lang === 'id' ? 'Terhapus' : 'Deleted');
      load();
    } catch (e) { toast.error('Failed'); }
  };

  const pickItem = (itemId) => {
    const it = rawItems.find(i => i.id === itemId);
    if (it) setForm(f => ({ ...f, item_id: it.id, item_name: it.name, uom: it.uom || 'pcs' }));
    else setForm(f => ({ ...f, item_id: '' }));
  };

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  return (
    <div className="space-y-4" data-testid="kitchen-waste-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {lang === 'id' ? 'Pencatatan Waste' : 'Waste Log'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Catat bahan/item yang terbuang untuk pelacakan biaya' : 'Track wasted items and cost impact'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="kitchen-waste-add">
          <Plus className="w-4 h-4" /> {lang === 'id' ? 'Catat Waste' : 'Log Waste'}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Jumlah Log' : 'Total Entries'}</div>
            <div className="text-2xl font-semibold">{total}</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/30 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Total Biaya Waste' : 'Total Waste Cost'}</div>
            <div className="text-2xl font-semibold text-[hsl(var(--destructive))]">{fmtIDR(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] h-9 bg-[var(--glass-bg-strong)]" data-testid="waste-filter-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua kategori' : 'All categories'}</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{lang === 'id' ? c.labelId : c.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px] bg-[var(--glass-bg-strong)]" data-testid="waste-filter-from" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px] bg-[var(--glass-bg-strong)]" data-testid="waste-filter-to" />
        </CardContent>
      </Card>

      {/* Waste list */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Item' : 'Item'}</th>
                <th className="text-right py-2.5 px-4">Qty</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Kategori' : 'Category'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Alasan' : 'Reason'}</th>
                <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Biaya' : 'Cost'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Oleh' : 'By'}</th>
                <th className="text-right py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-10 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Memuat...' : 'Loading...'}</td></tr>}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada catatan waste' : 'No waste logs yet'}
                </td></tr>
              )}
              {!loading && items.map(w => {
                const catLabel = CATEGORIES.find(c => c.value === w.category);
                return (
                  <tr key={w.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`waste-row-${w.id}`}>
                    <td className="py-2 px-4 text-xs">{w.date}</td>
                    <td className="py-2 px-4">{w.item_name}</td>
                    <td className="py-2 px-4 text-right">{w.quantity} {w.uom}</td>
                    <td className="py-2 px-4"><Badge variant="outline" className="text-[10px] border-[var(--glass-border)] capitalize">{catLabel ? (lang === 'id' ? catLabel.labelId : catLabel.labelEn) : w.category}</Badge></td>
                    <td className="py-2 px-4 max-w-xs truncate" title={w.reason}>{w.reason}</td>
                    <td className="py-2 px-4 text-right text-[hsl(var(--destructive))]">{fmtIDR(w.cost)}</td>
                    <td className="py-2 px-4 text-xs">{w.created_by_name}</td>
                    <td className="py-2 px-4 text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--destructive))]" onClick={() => removeWaste(w.id)} data-testid={`waste-delete-${w.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-400" />{lang === 'id' ? 'Catat Waste Baru' : 'New Waste Log'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Pilih Item (opsional)' : 'Pick Item (optional)'}</Label>
              <Select value={form.item_id || 'none'} onValueChange={(v) => pickItem(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9" data-testid="waste-item-picker">
                  <SelectValue placeholder={lang === 'id' ? 'Pilih atau isi nama manual' : 'Pick or type name manually'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang === 'id' ? 'Isi manual' : 'Manual input'}</SelectItem>
                  {rawItems.map(it => (
                    <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Nama Item *' : 'Item Name *'}</Label>
              <Input value={form.item_name} onChange={(e) => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder={lang === 'id' ? 'contoh: Ayam Goreng' : 'e.g. Fried Chicken'} data-testid="waste-item-name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Jumlah *' : 'Quantity *'}</Label>
                <Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} data-testid="waste-qty" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Satuan' : 'Unit'}</Label>
                <Input value={form.uom} onChange={(e) => setForm(f => ({ ...f, uom: e.target.value }))} placeholder="pcs, kg, liter" data-testid="waste-uom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Kategori' : 'Category'}</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9" data-testid="waste-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{lang === 'id' ? c.labelId : c.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Perkiraan Biaya (opsional)' : 'Est. Cost (optional)'}</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" data-testid="waste-cost" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Alasan *' : 'Reason *'}</Label>
              <Input value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={lang === 'id' ? 'contoh: Terjatuh saat plating' : 'e.g. Dropped while plating'} data-testid="waste-reason" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Catatan Tambahan' : 'Extra Notes'}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} data-testid="waste-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submit} className="gap-2" data-testid="waste-submit"><Plus className="w-4 h-4" />{lang === 'id' ? 'Simpan' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
