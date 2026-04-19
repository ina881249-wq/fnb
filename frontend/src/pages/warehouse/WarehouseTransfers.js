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
import { Plus, ArrowLeftRight, Trash2, Check, X, ThumbsUp, ThumbsDown, PackageCheck } from 'lucide-react';

export default function WarehouseTransfers() {
  const { currentOutlet, outlets, getOutletName } = useAuth();
  const { lang } = useLang();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ to_outlet_id: '', notes: '', requires_approval: true, lines: [] });
  const [newLine, setNewLine] = useState({ item_id: '', item_name: '', quantity: '' });
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveLines, setReceiveLines] = useState([]);
  const [actionDialog, setActionDialog] = useState(null); // {t, action}
  const [actionComment, setActionComment] = useState('');

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
      const res = await api.post('/api/warehouse/transfers', {
        from_outlet_id: currentOutlet,
        to_outlet_id: form.to_outlet_id,
        lines: form.lines,
        notes: form.notes,
        requires_approval: form.requires_approval,
      });
      const st = res.data.status;
      toast.success(lang === 'id' ? `Transfer dibuat (${st})` : `Transfer created (${st})`);
      setAddOpen(false);
      setForm({ to_outlet_id: '', notes: '', requires_approval: true, lines: [] });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const approve = async () => {
    if (!actionDialog) return;
    try {
      await api.post(`/api/warehouse/transfers/${actionDialog.t.id}/approve`, { comment: actionComment });
      toast.success(lang === 'id' ? 'Transfer disetujui' : 'Approved');
      setActionDialog(null); setActionComment('');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const reject = async () => {
    if (!actionDialog) return;
    if (!actionComment) { toast.error(lang === 'id' ? 'Alasan wajib' : 'Reason required'); return; }
    try {
      await api.post(`/api/warehouse/transfers/${actionDialog.t.id}/reject`, { comment: actionComment });
      toast.success(lang === 'id' ? 'Transfer ditolak' : 'Rejected');
      setActionDialog(null); setActionComment('');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const openReceive = (t) => {
    setReceiveTarget(t);
    // Pre-fill with full expected qty (less already received)
    setReceiveLines(t.lines.map(l => ({
      item_id: l.item_id,
      item_name: l.item_name,
      uom: l.uom,
      expected: l.quantity,
      prev_received: l.received_qty || 0,
      received_qty: l.quantity, // default full
    })));
  };

  const submitReceive = async () => {
    try {
      const payload = { lines: receiveLines.map(l => ({ item_id: l.item_id, received_qty: parseFloat(l.received_qty || 0) })) };
      const res = await api.post(`/api/warehouse/transfers/${receiveTarget.id}/receive`, payload);
      toast.success(lang === 'id' ? `Transfer ${res.data.status}` : `Transfer ${res.data.status}`);
      setReceiveTarget(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const receive = (t) => openReceive(t); // replace old confirm

  const cancel = async (t) => {
    if (!window.confirm(lang === 'id' ? `Batalkan ${t.transfer_number}?` : `Cancel ${t.transfer_number}?`)) return;
    try {
      await api.post(`/api/warehouse/transfers/${t.id}/cancel`);
      toast.success(lang === 'id' ? 'Transfer dibatalkan' : 'Cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const statusStyle = (s) => {
    if (s === 'requested') return 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10';
    if (s === 'in_transit') return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    if (s === 'partially_received') return 'border-blue-500/40 text-blue-400 bg-blue-500/10';
    if (s === 'received') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    if (s === 'rejected' || s === 'cancelled') return 'border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10';
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
              <SelectItem value="requested">{lang === 'id' ? 'Diminta' : 'Requested'}</SelectItem>
              <SelectItem value="in_transit">{lang === 'id' ? 'In-transit' : 'In-transit'}</SelectItem>
              <SelectItem value="partially_received">{lang === 'id' ? 'Diterima Sebagian' : 'Partially Received'}</SelectItem>
              <SelectItem value="received">{lang === 'id' ? 'Diterima' : 'Received'}</SelectItem>
              <SelectItem value="rejected">{lang === 'id' ? 'Ditolak' : 'Rejected'}</SelectItem>
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
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'requested' && t.from_outlet_id === currentOutlet && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-emerald-400" onClick={() => { setActionDialog({ t, action: 'approve' }); setActionComment(''); }} data-testid={`wh-transfer-approve-${t.id}`}>
                            <ThumbsUp className="w-3 h-3" />{lang === 'id' ? 'Setujui' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-[hsl(var(--destructive))]" onClick={() => { setActionDialog({ t, action: 'reject' }); setActionComment(''); }} data-testid={`wh-transfer-reject-${t.id}`}>
                            <ThumbsDown className="w-3 h-3" />{lang === 'id' ? 'Tolak' : 'Reject'}
                          </Button>
                        </>
                      )}
                      {(t.status === 'in_transit' || t.status === 'partially_received') && t.to_outlet_id === currentOutlet && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-emerald-400" onClick={() => receive(t)} data-testid={`wh-transfer-receive-${t.id}`}>
                          <PackageCheck className="w-3 h-3" />{lang === 'id' ? 'Terima' : 'Receive'}
                        </Button>
                      )}
                      {(t.status === 'in_transit' || t.status === 'requested') && t.from_outlet_id === currentOutlet && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[hsl(var(--destructive))]" onClick={() => cancel(t)} data-testid={`wh-transfer-cancel-${t.id}`}>
                          <X className="w-3 h-3" />Cancel
                        </Button>
                      )}
                    </div>
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
            <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
              <input type="checkbox" checked={form.requires_approval} onChange={(e) => setForm(f => ({ ...f, requires_approval: e.target.checked }))} data-testid="wh-transfer-requires-approval" />
              <span>{lang === 'id' ? 'Perlu approval source outlet sebelum stok dipotong' : 'Require approval from source outlet before stock is deducted'}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submit} data-testid="wh-transfer-submit">{lang === 'id' ? (form.requires_approval ? 'Ajukan Transfer' : 'Kirim Transfer') : (form.requires_approval ? 'Request Transfer' : 'Send Transfer')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setActionComment(''); }}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.action === 'approve' ? <ThumbsUp className="w-5 h-5 text-emerald-400" /> : <ThumbsDown className="w-5 h-5 text-[hsl(var(--destructive))]" />}
              {actionDialog?.action === 'approve' ? (lang === 'id' ? 'Setujui Transfer' : 'Approve Transfer') : (lang === 'id' ? 'Tolak Transfer' : 'Reject Transfer')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">{actionDialog?.t?.transfer_number} — {actionDialog?.t?.total_items} items</p>
            <Label className="text-xs">{actionDialog?.action === 'reject' ? (lang === 'id' ? 'Alasan *' : 'Reason *') : (lang === 'id' ? 'Catatan' : 'Comment')}</Label>
            <Textarea value={actionComment} onChange={(e) => setActionComment(e.target.value)} rows={2} data-testid="wh-transfer-action-comment" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={actionDialog?.action === 'approve' ? approve : reject} className={actionDialog?.action === 'approve' ? '' : 'bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90'} data-testid="wh-transfer-action-submit">
              {actionDialog?.action === 'approve' ? (lang === 'id' ? 'Setujui' : 'Approve') : (lang === 'id' ? 'Tolak' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive (partial) dialog */}
      <Dialog open={!!receiveTarget} onOpenChange={() => setReceiveTarget(null)}>
        <DialogContent className="max-w-xl bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackageCheck className="w-5 h-5 text-emerald-400" />
              {lang === 'id' ? 'Terima Transfer' : 'Receive Transfer'} — {receiveTarget?.transfer_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Sesuaikan qty diterima per item (default: full). Jika kurang dari expected, transfer akan tercatat sebagai "partially received".' : 'Adjust received qty per item (default: full).'}</p>
            {receiveLines.map((rl, i) => (
              <div key={rl.item_id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <span className="col-span-5 text-sm">{rl.item_name}</span>
                <span className="col-span-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Expected: {rl.expected} {rl.uom}
                  {rl.prev_received > 0 && <span className="block text-cyan-400">Sudah: {rl.prev_received}</span>}
                </span>
                <Input type="number" min="0" max={rl.expected} step="0.01" value={rl.received_qty}
                  onChange={(e) => setReceiveLines(prev => { const next = [...prev]; next[i] = { ...next[i], received_qty: e.target.value }; return next; })}
                  className="col-span-3 h-9 text-sm" data-testid={`wh-receive-qty-${rl.item_id}`} />
                <span className="col-span-1 text-xs">{rl.uom}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveTarget(null)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={submitReceive} data-testid="wh-receive-submit"><Check className="w-4 h-4 mr-1" />{lang === 'id' ? 'Simpan Penerimaan' : 'Submit Receipt'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
