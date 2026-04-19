import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Trash2, Eye, CheckCircle2, XCircle, Send, PackageCheck, Paperclip, Upload, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';

const formatCurr = (v) => `Rp ${(Number(v) || 0).toLocaleString('id-ID')}`;

const STATUS_META = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  submitted: { label: 'Submitted', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  partial_received: { label: 'Partial Received', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  received: { label: 'Received', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  closed: { label: 'Closed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
};

export default function PurchaseOrdersPage() {
  const { currentOutlet, user } = useAuth();
  const [pos, setPos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({ supplier_id: '', supplier_name: '', expected_date: '', notes: '', lines: [] });
  const [receiveLines, setReceiveLines] = useState([]);

  const fetchPOs = useCallback(async () => {
    try {
      const params = { outlet_id: currentOutlet || '' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/api/warehouse/purchase-orders', { params });
      setPos(res.data.items || []);
    } catch { toast.error('Gagal memuat PO'); }
  }, [currentOutlet, filter]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/api/warehouse/suppliers');
      setSuppliers(res.data.suppliers || []);
    } catch { /* silent */ }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/api/items?limit=500');
      setItems(res.data.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);
  useEffect(() => { fetchSuppliers(); fetchItems(); }, [fetchSuppliers, fetchItems]);

  const resetForm = () => setForm({ supplier_id: '', supplier_name: '', expected_date: '', notes: '', lines: [] });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { item_id: '', item_name: '', qty: 1, unit_cost: 0, uom: 'pcs' }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i, patch) => setForm(f => ({ ...f, lines: f.lines.map((ln, idx) => idx === i ? { ...ln, ...patch } : ln) }));

  const lineTotal = (ln) => (Number(ln.qty) || 0) * (Number(ln.unit_cost) || 0);
  const formTotal = form.lines.reduce((a, b) => a + lineTotal(b), 0);

  const submitPO = async () => {
    if (!currentOutlet) { toast.error('Pilih outlet dulu'); return; }
    if (!form.supplier_id) { toast.error('Pilih supplier'); return; }
    if (form.lines.length === 0) { toast.error('Tambah minimal 1 item'); return; }
    try {
      const payload = { ...form, outlet_id: currentOutlet, lines: form.lines.map(ln => ({ ...ln, qty: Number(ln.qty), unit_cost: Number(ln.unit_cost) })) };
      const res = await api.post('/api/warehouse/purchase-orders', payload);
      toast.success(`PO ${res.data.po_number} dibuat (${formatCurr(res.data.total_amount)})`);
      setCreateOpen(false); resetForm(); fetchPOs();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Gagal buat PO'); }
  };

  const changeStatus = async (id, status, comment = '') => {
    try {
      await api.post(`/api/warehouse/purchase-orders/${id}/status`, { status, comment });
      toast.success(`Status PO diubah: ${status}`);
      fetchPOs();
      if (selected?.id === id) { const r = await api.get(`/api/warehouse/purchase-orders/${id}`); setSelected(r.data); }
    } catch (e) { toast.error(e?.response?.data?.detail || 'Gagal ubah status'); }
  };

  const openView = async (po) => {
    try { const r = await api.get(`/api/warehouse/purchase-orders/${po.id}`); setSelected(r.data); setViewOpen(true); }
    catch { toast.error('Gagal memuat PO'); }
  };

  const openReceive = (po) => {
    setSelected(po);
    setReceiveLines(po.lines.map(ln => ({ ...ln, qty_received_now: 0, remaining: ln.qty - (ln.received_qty || 0) })));
    setReceiveOpen(true);
  };

  const confirmReceive = async () => {
    const payload = {
      lines: receiveLines
        .filter(ln => Number(ln.qty_received_now) > 0)
        .map(ln => ({ item_id: ln.item_id, qty_received: Number(ln.qty_received_now), unit_cost: Number(ln.unit_cost) })),
      notes: '',
    };
    if (payload.lines.length === 0) { toast.error('Isi qty terima minimal 1 item'); return; }
    try {
      const res = await api.post(`/api/warehouse/purchase-orders/${selected.id}/receive`, payload);
      toast.success(`Diterima: ${res.data.receipt_number} (${formatCurr(res.data.grand_total)})`);
      setReceiveOpen(false); fetchPOs();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Gagal receive'); }
  };

  const uploadAttachment = async (file) => {
    if (!file || !selected?.id) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/api/warehouse/attachments/upload?ref_type=purchase_order&ref_id=${selected.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Attachment diunggah');
      const r = await api.get(`/api/warehouse/purchase-orders/${selected.id}`); setSelected(r.data);
    } catch { toast.error('Upload gagal'); }
  };

  const backendBase = process.env.REACT_APP_BACKEND_URL || '';

  return (
    <div className="space-y-4" data-testid="purchase-orders-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Purchase Orders</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Buat &amp; kelola pesanan pembelian, lalu terima barang sesuai PO.</p>
        </div>
        <Button className="gap-1.5" onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="create-po-button">
          <Plus className="w-4 h-4" /> Buat PO
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="all" data-testid="po-tab-all">Semua</TabsTrigger>
          <TabsTrigger value="draft" data-testid="po-tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="submitted" data-testid="po-tab-submitted">Submitted</TabsTrigger>
          <TabsTrigger value="approved" data-testid="po-tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="partial_received" data-testid="po-tab-partial">Partial</TabsTrigger>
          <TabsTrigger value="received" data-testid="po-tab-received">Received</TabsTrigger>
          <TabsTrigger value="closed" data-testid="po-tab-closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Daftar PO</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead>
              <TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pos.length === 0 && <TableRow><TableCell colSpan={7} className="text-xs text-center py-6 text-[hsl(var(--muted-foreground))]">Belum ada PO</TableCell></TableRow>}
              {pos.map(p => {
                const meta = STATUS_META[p.status] || { label: p.status, color: '' };
                return (
                  <TableRow key={p.id} className="border-[var(--glass-border)] hover:bg-white/5" data-testid={`po-row-${p.id}`}>
                    <TableCell className="font-mono text-xs">{p.po_number}</TableCell>
                    <TableCell>{p.supplier_name}</TableCell>
                    <TableCell className="text-xs">{p.expected_date || '-'}</TableCell>
                    <TableCell className="text-xs">{p.lines?.length || 0}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurr(p.total_amount)}</TableCell>
                    <TableCell><Badge variant="outline" className={meta.color}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openView(p)} data-testid={`po-view-${p.id}`}><Eye className="w-3.5 h-3.5" /></Button>
                        {p.status === 'draft' && <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => changeStatus(p.id, 'submitted')} data-testid={`po-submit-${p.id}`}><Send className="w-3 h-3 mr-1" />Submit</Button>}
                        {p.status === 'submitted' && <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-emerald-400" onClick={() => changeStatus(p.id, 'approved')} data-testid={`po-approve-${p.id}`}><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>}
                        {(p.status === 'approved' || p.status === 'partial_received') && <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-cyan-400" onClick={() => openReceive(p)} data-testid={`po-receive-${p.id}`}><PackageCheck className="w-3 h-3 mr-1" />Receive</Button>}
                        {['draft', 'submitted', 'approved'].includes(p.status) && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400" onClick={() => changeStatus(p.id, 'cancelled')} data-testid={`po-cancel-${p.id}`}><XCircle className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="create-po-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Buat Purchase Order</DialogTitle>
            <DialogDescription>Pesan ke supplier, kemudian terima barang melalui PO ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Supplier</Label>
                <Select value={form.supplier_id} onValueChange={(v) => { const s = suppliers.find(x => x.id === v); setForm(f => ({ ...f, supplier_id: v, supplier_name: s?.name || '' })); }}>
                  <SelectTrigger data-testid="po-supplier-select"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Expected Date</Label>
                <Input type="date" value={form.expected_date} onChange={(e) => setForm(f => ({ ...f, expected_date: e.target.value }))} data-testid="po-expected-date" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Item Lines</Label>
                <Button size="sm" variant="outline" className="gap-1" onClick={addLine} data-testid="po-add-line"><Plus className="w-3 h-3" /> Tambah Item</Button>
              </div>
              {form.lines.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-3">Belum ada item</p>}
              {form.lines.map((ln, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end mb-2" data-testid={`po-line-${i}`}>
                  <div className="col-span-5">
                    <Select value={ln.item_id} onValueChange={(v) => { const it = items.find(x => x.id === v); updateLine(i, { item_id: v, item_name: it?.name || '', uom: it?.uom || 'pcs', unit_cost: it?.cost_per_unit || 0 }); }}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih item" /></SelectTrigger>
                      <SelectContent>{items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="0" step="0.01" value={ln.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} className="h-9 text-xs" placeholder="Qty" />
                  </div>
                  <div className="col-span-2"><Input value={ln.uom} onChange={(e) => updateLine(i, { uom: e.target.value })} className="h-9 text-xs" placeholder="UoM" /></div>
                  <div className="col-span-2"><Input type="number" min="0" value={ln.unit_cost} onChange={(e) => updateLine(i, { unit_cost: e.target.value })} className="h-9 text-xs" placeholder="Harga" /></div>
                  <div className="col-span-1"><Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-rose-400" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                </div>
              ))}
              {form.lines.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-[var(--glass-border)]"><span className="text-sm font-semibold">Total: {formatCurr(formTotal)}</span></div>
              )}
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={submitPO} data-testid="po-submit-button">Buat PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="view-po-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <FileText className="w-4 h-4 text-cyan-400" />
              {selected?.po_number}
              {selected && <Badge variant="outline" className={STATUS_META[selected.status]?.color}>{STATUS_META[selected.status]?.label || selected.status}</Badge>}
            </DialogTitle>
            <DialogDescription>Detail purchase order beserta progress penerimaan.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Supplier</span><p className="text-xs">{selected.supplier_name}</p></div>
                <div><span className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Expected</span><p className="text-xs">{selected.expected_date || '-'}</p></div>
                <div><span className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Total</span><p className="text-xs font-semibold">{formatCurr(selected.total_amount)}</p></div>
                <div><span className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">Dibuat oleh</span><p className="text-xs">{selected.created_by_name}</p></div>
              </div>
              <Table>
                <TableHeader><TableRow className="border-[var(--glass-border)]">
                  <TableHead className="text-[10px]">Item</TableHead><TableHead className="text-[10px] text-right">Qty</TableHead><TableHead className="text-[10px] text-right">Received</TableHead><TableHead className="text-[10px] text-right">Unit</TableHead><TableHead className="text-[10px] text-right">Subtotal</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {selected.lines?.map((ln, i) => (
                    <TableRow key={i} className="border-[var(--glass-border)]">
                      <TableCell className="text-xs">{ln.item_name}</TableCell>
                      <TableCell className="text-right text-xs">{ln.qty} {ln.uom}</TableCell>
                      <TableCell className="text-right text-xs"><Badge variant="outline" className={`${(ln.received_qty || 0) >= ln.qty ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400'}`}>{ln.received_qty || 0}/{ln.qty}</Badge></TableCell>
                      <TableCell className="text-right text-xs">{formatCurr(ln.unit_cost)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurr(ln.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5"><Paperclip className="w-3 h-3" /> Attachments</Label>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])} data-testid="po-upload-input" />
                    <span className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</span>
                  </label>
                </div>
                {(selected.attachments || []).length === 0 && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Belum ada attachment</p>}
                {(selected.attachments || []).map((a, i) => (
                  <a
                    key={i}
                    href={`${backendBase}/api/warehouse/attachments/${a.file_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded text-xs"
                    data-testid={`po-attachment-${i}`}
                  >
                    <Paperclip className="w-3 h-3 text-cyan-400" />
                    <span className="truncate flex-1">{a.filename}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{(a.size / 1024).toFixed(0)}KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive PO Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-2xl" data-testid="receive-po-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}><PackageCheck className="w-4 h-4 text-emerald-400" /> Terima Barang — {selected?.po_number}</DialogTitle>
            <DialogDescription>Masukkan qty yang diterima. Sistem akan otomatis create GRN + update stok.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)]"><TableHead className="text-[10px]">Item</TableHead><TableHead className="text-[10px] text-right">Sisa</TableHead><TableHead className="text-[10px] text-right w-36">Terima Sekarang</TableHead></TableRow></TableHeader>
            <TableBody>
              {receiveLines.map((ln, i) => (
                <TableRow key={i} className="border-[var(--glass-border)]">
                  <TableCell className="text-xs">{ln.item_name}</TableCell>
                  <TableCell className="text-right text-xs"><Badge variant="outline">{ln.remaining} {ln.uom}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Input type="number" min="0" max={ln.remaining} step="0.01" value={ln.qty_received_now || 0}
                      onChange={(e) => setReceiveLines(list => list.map((l, idx) => idx === i ? { ...l, qty_received_now: e.target.value } : l))}
                      className="h-8 text-xs text-right"
                      data-testid={`receive-qty-${i}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Batal</Button>
            <Button onClick={confirmReceive} className="gap-1.5" data-testid="receive-confirm-button"><PackageCheck className="w-4 h-4" /> Konfirmasi Terima</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
