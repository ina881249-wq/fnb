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
import { Plus, ArrowLeftRight, Trash2, Check, X } from 'lucide-react';

export default function WarehouseTransfers() {
  const { currentOutlet, outlets, getOutletName } = useAuth();
  const { lang } = useLang();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ to_outlet_id: '', notes: '', lines: [] });
  const [newLine, setNewLine] = useState({ item_id: '', item_name: '', quantity: '' });

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const params = { outlet_id: currentOutlet, limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/api/warehouse/transfers', { params });
      setTransfers(res.data.transfers || []);
    } finally { setLoading(false); }
  }, [currentOutlet, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/api/inventory/items', { params: { limit: 300 } }).then(r => setItems(r.data.items || [])); }, []);

  const addLine = () => {
    if (!newLine.item_id) { toast.error(lang === 'id' ? 'Pilih item dari katalog' : 'Pick item from catalog'); return; }
    if (!newLine.quantity) { toast.error(lang === 'id' ? 'Isi qty' : 'Fill qty'); return; }
    const it = items.find(i => i.id === newLine.item_id);
    setForm(f => ({ ...f, lines: [...f.lines, { ...newLine, quantity: parseFloat(newLine.quantity), uom: it?.uom || 'pcs' }] }));
    setNewLine({ item_id: '', item_name: '', quantity: '' });
  };
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const submit = async () => {
    if (!form.to_outlet_id) { toast.error(lang === 'id' ? 'Pilih outlet tujuan' : 'Pick destination outlet'); return; }
    if (form.to_outlet_id === currentOutlet) { toast.error(lang === 'id' ? 'Tujuan harus berbeda' : 'Destination must differ'); return; }
    if (form.lines.length === 0) { toast.error(lang === 'id' ? 'Tambahkan item' : 'Add items'); return; }
    try {
      await api.post('/api/warehouse/transfers', {
        from_outlet_id: currentOutlet,
        to_outlet_id: form.to_outlet_id,
        lines: form.lines,
        notes: form.notes,
      });
      toast.success(lang === 'id' ? 'Transfer dibuat (in-transit)' : 'Transfer created (in-transit)');
      setAddOpen(false);
      setForm({ to_outlet_id: '', notes: '', lines: [] });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const receive = async (t) => {
    if (!window.confirm(lang === 'id' ? `Terima ${t.transfer_number}?` : `Receive ${t.transfer_number}?`)) return;
    try {
      await api.post(`/api/warehouse/transfers/${t.id}/receive`);
      toast.success(lang === 'id' ? 'Transfer diterima' : 'Received');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const cancel = async (t) => {
    if (!window.confirm(lang === 'id' ? `Batalkan ${t.transfer_number}?` : `Cancel ${t.transfer_number}?`)) return;
    try {
      await api.post(`/api/warehouse/transfers/${t.id}/cancel`);
      toast.success(lang === 'id' ? 'Transfer dibatalkan' : 'Cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const statusStyle = (s) => {
    if (s === 'in_transit') return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    if (s === 'received') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    if (s === 'cancelled') return 'border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10';
    return 'border-[var(--glass-border)]';
  };

  if (!currentOutlet) return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet' : 'Select outlet'}</div>;

  return (
    <div className="space-y-4" data-testid="warehouse-transfers-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Transfer Antar-Outlet' : 'Outlet Transfers'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{transfers.length} {lang === 'id' ? 'transfer' : 'transfers'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px] bg-[var(--glass-bg)]" data-testid="wh-transfer-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua' : 'All'}</SelectItem>
              <SelectItem value="in_transit">{lang === 'id' ? 'In-transit' : 'In-transit'}</SelectItem>
              <SelectItem value="received">{lang === 'id' ? 'Diterima' : 'Received'}</SelectItem>
              <SelectItem value="cancelled">{lang === 'id' ? 'Dibatalkan' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)} className="gap-2" data-testid="wh-transfer-add"><Plus className="w-4 h-4" />{lang === 'id' ? 'Transfer Baru' : 'New Transfer'}</Button>
        </div>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">No. Transfer</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                <th className="text-left py-2.5 px-4">Dari</th>
                <th className="text-left py-2.5 px-4">Ke</th>
                <th className="text-right py-2.5 px-4">Items</th>
                <th className="text-left py-2.5 px-4">Status</th>
                <th className="text-right py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-10">Loading...</td></tr>}
              {!loading && transfers.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada transfer' : 'No transfers'}
                </td></tr>
              )}
              {transfers.map(t => (
                <tr key={t.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`wh-transfer-row-${t.id}`}>
                  <td className="py-2 px-4 font-mono text-xs">{t.transfer_number}</td>
                  <td className="py-2 px-4 text-xs">{t.date}</td>
                  <td className="py-2 px-4 text-xs">{getOutletName(t.from_outlet_id)}</td>
                  <td className="py-2 px-4 text-xs">{getOutletName(t.to_outlet_id)}</td>
                  <td className="py-2 px-4 text-right">{t.total_items}</td>
                  <td className="py-2 px-4"><Badge variant="outline" className={statusStyle(t.status)}>{t.status}</Badge></td>
                  <td className="py-2 px-4 text-right">
                    {t.status === 'in_transit' && (
                      <div className="flex items-center justify-end gap-1">
                        {t.to_outlet_id === currentOutlet && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-emerald-400" onClick={() => receive(t)} data-testid={`wh-transfer-receive-${t.id}`}>
                            <Check className="w-3 h-3" />{lang === 'id' ? 'Terima' : 'Receive'}
                          </Button>
                        )}
                        {t.from_outlet_id === currentOutlet && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[hsl(var(--destructive))]" onClick={() => cancel(t)} data-testid={`wh-transfer-cancel-${t.id}`}>
                            <X className="w-3 h-3" />Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle>{lang === 'id' ? 'Buat Transfer Baru' : 'New Transfer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Dari' : 'From'}</Label>
                <Input disabled value={getOutletName(currentOutlet)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Ke Outlet *' : 'To Outlet *'}</Label>
                <Select value={form.to_outlet_id} onValueChange={(v) => setForm(f => ({ ...f, to_outlet_id: v }))}>
                  <SelectTrigger className="h-9" data-testid="wh-transfer-to"><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>{outlets.filter(o => o.id !== currentOutlet).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="border border-[var(--glass-border)] rounded-lg p-3">
              <div className="font-semibold text-xs mb-2">{lang === 'id' ? 'Item Ditransfer' : 'Items'}</div>
              {form.lines.map((ln, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded bg-[var(--glass-bg-strong)] text-xs">
                  <span className="flex-1">{ln.item_name}</span>
                  <span>{ln.quantity} {ln.uom}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[hsl(var(--destructive))]" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-2 mt-2">
                <Select value={newLine.item_id} onValueChange={(v) => {
                  const it = items.find(i => i.id === v); if (it) setNewLine(n => ({ ...n, item_id: it.id, item_name: it.name }));
                }}>
                  <SelectTrigger className="col-span-7 h-9 text-xs" data-testid="wh-transfer-item-picker"><SelectValue placeholder={lang === 'id' ? 'Pilih item' : 'Pick item'} /></SelectTrigger>
                  <SelectContent>
                    {items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="col-span-4 h-9 text-xs" type="number" placeholder="qty" value={newLine.quantity} onChange={(e) => setNewLine(n => ({ ...n, quantity: e.target.value }))} data-testid="wh-transfer-qty" />
                <Button size="sm" className="col-span-1 h-9 p-0" onClick={addLine} data-testid="wh-transfer-line-add"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <Textarea placeholder={lang === 'id' ? 'Catatan' : 'Notes'} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submit} data-testid="wh-transfer-submit">{lang === 'id' ? 'Kirim Transfer' : 'Send Transfer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
