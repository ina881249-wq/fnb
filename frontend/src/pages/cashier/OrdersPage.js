import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Search, CreditCard, XCircle, Eye, Receipt } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const statusStyle = (s) => {
  if (s === 'paid') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
  if (s === 'voided') return 'border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10';
  return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
};

export default function OrdersPage() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE = 20;

  const [payOpen, setPayOpen] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [voidOpen, setVoidOpen] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [viewOrder, setViewOrder] = useState(null);

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const params = {
        outlet_id: currentOutlet,
        skip: page * PAGE,
        limit: PAGE,
      };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      if (dateFilter) params.date = dateFilter;
      const res = await api.get('/api/cashier/orders', { params });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error(lang === 'id' ? 'Gagal memuat order' : 'Failed to load orders');
    } finally { setLoading(false); }
  }, [currentOutlet, page, filter, search, dateFilter, lang]);

  useEffect(() => { load(); }, [load]);

  const doPay = async () => {
    if (!payOpen) return;
    try {
      await api.post(`/api/cashier/orders/${payOpen.id}/pay`, {
        payment_method: payMethod,
        amount_tendered: parseFloat(tendered || payOpen.total),
      });
      toast.success(lang === 'id' ? 'Pembayaran berhasil' : 'Payment successful');
      setPayOpen(null);
      setTendered('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const doVoid = async () => {
    if (!voidOpen) return;
    if (!voidReason.trim()) { toast.error(lang === 'id' ? 'Alasan wajib diisi' : 'Reason required'); return; }
    try {
      await api.post(`/api/cashier/orders/${voidOpen.id}/void`, { reason: voidReason });
      toast.success(lang === 'id' ? 'Order dibatalkan' : 'Order voided');
      setVoidOpen(null);
      setVoidReason('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  return (
    <div className="space-y-4" data-testid="orders-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {lang === 'id' ? 'Pesanan' : 'Orders'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Kelola order, pembayaran, dan pembatalan' : 'Manage orders, payments and voids'}
          </p>
        </div>
        <Badge variant="outline" className="border-[var(--glass-border)]">{total} {lang === 'id' ? 'order' : 'orders'}</Badge>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={lang === 'id' ? 'Cari nomor order / pelanggan / meja' : 'Search order # / customer / table'} className="pl-9 h-9 bg-[var(--glass-bg-strong)]" data-testid="orders-search" />
          </div>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--glass-bg-strong)]" data-testid="orders-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua status' : 'All statuses'}</SelectItem>
              <SelectItem value="open">{lang === 'id' ? 'Terbuka' : 'Open'}</SelectItem>
              <SelectItem value="paid">{lang === 'id' ? 'Dibayar' : 'Paid'}</SelectItem>
              <SelectItem value="voided">{lang === 'id' ? 'Dibatalkan' : 'Voided'}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(0); }} className="h-9 w-[160px] bg-[var(--glass-bg-strong)]" data-testid="orders-filter-date" />
        </CardContent>
      </Card>

      {/* Orders list */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'No Order' : 'Order #'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tipe' : 'Type'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Pelanggan/Meja' : 'Customer/Table'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Item' : 'Items'}</th>
                <th className="text-right py-2.5 px-4">Total</th>
                <th className="text-left py-2.5 px-4">Status</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Bayar' : 'Payment'}</th>
                <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Waktu' : 'Time'}</th>
                <th className="text-right py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="text-center py-10 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Memuat...' : 'Loading...'}</td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {lang === 'id' ? 'Belum ada order' : 'No orders yet'}
                </td></tr>
              )}
              {!loading && orders.map(o => (
                <tr key={o.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`order-row-${o.id}`}>
                  <td className="py-2 px-4 font-mono text-xs">{o.order_number}</td>
                  <td className="py-2 px-4 capitalize">{o.order_type?.replace('_', ' ')}</td>
                  <td className="py-2 px-4">{o.customer_name || (o.table_number ? `Meja ${o.table_number}` : '-')}</td>
                  <td className="py-2 px-4">{o.lines?.length || 0}</td>
                  <td className="py-2 px-4 text-right font-semibold">{fmtIDR(o.total)}</td>
                  <td className="py-2 px-4"><Badge variant="outline" className={statusStyle(o.status)}>{o.status}</Badge></td>
                  <td className="py-2 px-4"><span className="text-xs uppercase">{o.payment_status}{o.payment_method ? ` · ${o.payment_method}` : ''}</span></td>
                  <td className="py-2 px-4 text-xs text-[hsl(var(--muted-foreground))]">{new Date(o.created_at).toLocaleString('id-ID')}</td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewOrder(o)} data-testid={`order-view-${o.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {o.status === 'open' && o.payment_status !== 'paid' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--primary))]" onClick={() => { setPayOpen(o); setTendered(String(o.total)); setPayMethod('cash'); }} data-testid={`order-pay-${o.id}`}>
                            <CreditCard className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--destructive))]" onClick={() => setVoidOpen(o)} data-testid={`order-void-${o.id}`}>
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {total > PAGE && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--glass-border)] text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">{page * PAGE + 1}-{Math.min((page + 1) * PAGE, total)} / {total}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{lang === 'id' ? 'Sebelum' : 'Prev'}</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>{lang === 'id' ? 'Lanjut' : 'Next'}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Pay dialog */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle>{lang === 'id' ? 'Bayar Order' : 'Pay Order'} {payOpen?.order_number}</DialogTitle>
          </DialogHeader>
          {payOpen && (
            <div className="space-y-4">
              <div className="flex justify-between p-3 rounded-lg bg-[var(--glass-bg-strong)] font-semibold">
                <span>Total</span>
                <span className="text-[hsl(var(--primary))]">{fmtIDR(payOpen.total)}</span>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Metode' : 'Method'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'card', 'qris', 'online'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} className={`py-2 text-sm rounded-lg border transition-colors capitalize ${payMethod === m ? 'bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]' : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'}`} data-testid={`orders-pay-method-${m}`}>{m}</button>
                  ))}
                </div>
              </div>
              {payMethod === 'cash' && (
                <div>
                  <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Uang Diterima' : 'Amount Tendered'}</Label>
                  <Input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} className="h-10" data-testid="orders-pay-tendered" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={doPay} data-testid="orders-pay-confirm">{lang === 'id' ? 'Konfirmasi' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void dialog */}
      <Dialog open={!!voidOpen} onOpenChange={(o) => !o && setVoidOpen(null)}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle>{lang === 'id' ? 'Batalkan Order' : 'Void Order'} {voidOpen?.order_number}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Alasan' : 'Reason'}</Label>
            <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} data-testid="orders-void-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(null)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={doVoid} data-testid="orders-void-confirm">{lang === 'id' ? 'Batalkan' : 'Void'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle>{viewOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Tipe' : 'Type'}:</span> <span className="capitalize">{viewOrder.order_type?.replace('_', ' ')}</span></div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Status:</span> <span className="uppercase">{viewOrder.status}</span></div>
                <div><span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Meja/Pelanggan' : 'Table/Customer'}:</span> {viewOrder.table_number || viewOrder.customer_name || '-'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Kasir' : 'Cashier'}:</span> {viewOrder.cashier_name}</div>
              </div>
              <div className="border-t border-[var(--glass-border)] pt-2 space-y-1">
                {viewOrder.lines?.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{l.qty}× {l.name}</span>
                    <span>{fmtIDR(l.qty * l.price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--glass-border)] pt-2 flex justify-between font-semibold text-[hsl(var(--primary))]">
                <span>Total</span>
                <span>{fmtIDR(viewOrder.total)}</span>
              </div>
              {viewOrder.notes && <div className="text-xs text-[hsl(var(--muted-foreground))] italic">"{viewOrder.notes}"</div>}
              {viewOrder.status === 'voided' && (
                <div className="text-xs p-2 rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 text-[hsl(var(--destructive))]">
                  <div className="font-semibold">{lang === 'id' ? 'Dibatalkan' : 'Voided'}</div>
                  <div>{viewOrder.void_reason}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
