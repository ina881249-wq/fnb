import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Play, Square, Clock, TrendingUp, AlertCircle, History, CheckCircle2 } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function ShiftPage() {
  const { currentOutlet, user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [openOpen, setOpenOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const loadAll = useCallback(async () => {
    if (!currentOutlet) { setLoading(false); return; }
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        api.get('/api/cashier/shifts/current', { params: { outlet_id: currentOutlet } }),
        api.get('/api/cashier/shifts', { params: { outlet_id: currentOutlet, limit: 15 } }),
      ]);
      setCurrent(curRes.data.shift);
      if (ctx.setCurrentShift) ctx.setCurrentShift(curRes.data.shift);
      setHistory(histRes.data.shifts || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [currentOutlet]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const doOpen = async () => {
    try {
      await api.post('/api/cashier/shifts/open', {
        outlet_id: currentOutlet,
        opening_cash: parseFloat(openingCash || 0),
        notes: openingNotes,
      });
      toast.success(lang === 'id' ? 'Shift dibuka' : 'Shift opened');
      setOpenOpen(false);
      setOpeningCash('');
      setOpeningNotes('');
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const doClose = async () => {
    if (!current) return;
    if (!actualCash) { toast.error(lang === 'id' ? 'Kas aktual wajib diisi' : 'Actual cash required'); return; }
    try {
      const res = await api.post(`/api/cashier/shifts/${current.id}/close`, {
        actual_cash: parseFloat(actualCash),
        notes: closingNotes,
      });
      const v = res.data.variance;
      if (Math.abs(v) < 1) toast.success(lang === 'id' ? 'Shift ditutup. Kas seimbang.' : 'Shift closed. Cash balanced.');
      else if (v < 0) toast.warning(lang === 'id' ? `Shift ditutup. Kurang ${fmtIDR(Math.abs(v))}` : `Shift closed. Short by ${fmtIDR(Math.abs(v))}`);
      else toast.success(lang === 'id' ? `Shift ditutup. Lebih ${fmtIDR(v)}` : `Shift closed. Over by ${fmtIDR(v)}`);
      setCloseOpen(false);
      setActualCash('');
      setClosingNotes('');
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  const totals = current?.totals || {};
  const expectedCash = (current?.opening_cash || 0) + (totals.cash_sales || 0);

  return (
    <div className="space-y-4" data-testid="shift-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          {lang === 'id' ? 'Manajemen Shift' : 'Shift Management'}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {lang === 'id' ? 'Buka/tutup shift kasir dan pantau ringkasan' : 'Open/close cashier shifts and review summaries'}
        </p>
      </div>

      {/* Current shift card */}
      {current ? (
        <Card className="bg-gradient-to-br from-[hsl(var(--primary))]/10 to-[hsl(var(--accent))]/5 border-[hsl(var(--primary))]/30 backdrop-blur-xl" data-testid="shift-current-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <h2 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Shift Aktif' : 'Active Shift'}</h2>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open
                  </Badge>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{current.shift_number}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{lang === 'id' ? 'Dibuka' : 'Opened'}: {new Date(current.opened_at).toLocaleString('id-ID')}</div>
              </div>
              <Button variant="destructive" onClick={() => { setCloseOpen(true); setActualCash(String(expectedCash)); }} className="gap-2" data-testid="shift-close-btn">
                <Square className="w-4 h-4" /> {lang === 'id' ? 'Tutup Shift' : 'Close Shift'}
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Kas Pembuka' : 'Opening Cash'}</div>
                <div className="text-lg font-semibold">{fmtIDR(current.opening_cash)}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Order' : 'Orders'}</div>
                <div className="text-lg font-semibold">{totals.total_orders || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Total Penjualan' : 'Total Sales'}</div>
                <div className="text-lg font-semibold text-[hsl(var(--primary))]">{fmtIDR(totals.total_sales || 0)}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Kas Ekspektasi' : 'Expected Cash'}</div>
                <div className="text-lg font-semibold">{fmtIDR(expectedCash)}</div>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { k: 'cash_sales', label: lang === 'id' ? 'Tunai' : 'Cash' },
                { k: 'card_sales', label: lang === 'id' ? 'Kartu' : 'Card' },
                { k: 'online_sales', label: 'QRIS/Online' },
                { k: 'other_sales', label: lang === 'id' ? 'Lainnya' : 'Other' },
              ].map(pm => (
                <div key={pm.k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--glass-bg)] text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">{pm.label}</span>
                  <span className="font-medium">{fmtIDR(totals[pm.k] || 0)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Button size="sm" variant="outline" onClick={() => navigate('/cashier/pos')} className="gap-1.5 h-7" data-testid="shift-goto-pos">
                <TrendingUp className="w-3 h-3" /> POS
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/cashier/orders')} className="gap-1.5 h-7" data-testid="shift-goto-orders">
                <History className="w-3 h-3" /> {lang === 'id' ? 'Order' : 'Orders'}
              </Button>
              <span className="ml-auto">{totals.voided_orders || 0} voided</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl" data-testid="shift-open-card">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Belum ada shift aktif' : 'No active shift'}</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{lang === 'id' ? 'Buka shift untuk mulai melakukan transaksi POS' : 'Open a shift to begin POS transactions'}</p>
            <Button onClick={() => setOpenOpen(true)} className="gap-2" data-testid="shift-open-btn">
              <Play className="w-4 h-4" /> {lang === 'id' ? 'Buka Shift' : 'Open Shift'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Riwayat Shift' : 'Shift History'}</h3>
            <Badge variant="outline" className="border-[var(--glass-border)]">{history.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="text-left py-2 px-3">Shift #</th>
                  <th className="text-left py-2 px-3">{lang === 'id' ? 'Kasir' : 'Cashier'}</th>
                  <th className="text-left py-2 px-3">{lang === 'id' ? 'Dibuka' : 'Opened'}</th>
                  <th className="text-left py-2 px-3">{lang === 'id' ? 'Ditutup' : 'Closed'}</th>
                  <th className="text-right py-2 px-3">Orders</th>
                  <th className="text-right py-2 px-3">Sales</th>
                  <th className="text-right py-2 px-3">Variance</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Belum ada riwayat' : 'No history yet'}</td></tr>
                )}
                {history.map(s => {
                  const t = s.totals || {};
                  const variance = s.variance;
                  return (
                    <tr key={s.id} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]/50" data-testid={`shift-history-row-${s.id}`}>
                      <td className="py-2 px-3 font-mono text-xs">{s.shift_number}</td>
                      <td className="py-2 px-3">{s.cashier_name}</td>
                      <td className="py-2 px-3 text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.opened_at).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-xs text-[hsl(var(--muted-foreground))]">{s.closed_at ? new Date(s.closed_at).toLocaleString('id-ID') : '-'}</td>
                      <td className="py-2 px-3 text-right">{t.total_orders || 0}</td>
                      <td className="py-2 px-3 text-right font-medium">{fmtIDR(t.total_sales || 0)}</td>
                      <td className={`py-2 px-3 text-right font-medium ${variance == null ? '' : variance === 0 ? 'text-emerald-400' : variance > 0 ? 'text-amber-400' : 'text-[hsl(var(--destructive))]'}`}>
                        {variance == null ? '-' : (variance >= 0 ? '+' : '') + fmtIDR(variance)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={s.status === 'open' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-[var(--glass-border)] text-[hsl(var(--muted-foreground))]'}>{s.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Open shift dialog */}
      <Dialog open={openOpen} onOpenChange={setOpenOpen}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle>{lang === 'id' ? 'Buka Shift Baru' : 'Open New Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Kas Pembuka (Opening Float)' : 'Opening Cash'}</Label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0" className="h-10" data-testid="shift-opening-cash" />
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{lang === 'id' ? 'Jumlah tunai awal di laci kasir' : 'Initial cash amount in drawer'}</div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Catatan' : 'Notes'}</Label>
              <Textarea value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} rows={2} data-testid="shift-opening-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button onClick={doOpen} className="gap-2" data-testid="shift-open-confirm"><Play className="w-4 h-4" />{lang === 'id' ? 'Buka' : 'Open'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close shift dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))]">
          <DialogHeader>
            <DialogTitle>{lang === 'id' ? 'Tutup Shift' : 'Close Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Kas Ekspektasi' : 'Expected Cash'}</span>
                <span className="font-semibold">{fmtIDR(expectedCash)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">= Opening {fmtIDR(current?.opening_cash || 0)} + Cash Sales {fmtIDR(totals.cash_sales || 0)}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Kas Aktual (hitung di laci)' : 'Actual Cash (drawer count)'}</Label>
              <Input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="h-10" data-testid="shift-actual-cash" />
              {actualCash !== '' && (
                <div className={`text-xs mt-1.5 font-medium ${parseFloat(actualCash) - expectedCash === 0 ? 'text-emerald-400' : parseFloat(actualCash) - expectedCash > 0 ? 'text-amber-400' : 'text-[hsl(var(--destructive))]'}`}>
                  {lang === 'id' ? 'Variance' : 'Variance'}: {fmtIDR(parseFloat(actualCash) - expectedCash)}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Catatan' : 'Notes'}</Label>
              <Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} rows={2} data-testid="shift-closing-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={doClose} className="gap-2" data-testid="shift-close-confirm">
              <CheckCircle2 className="w-4 h-4" /> {lang === 'id' ? 'Tutup & Kirim' : 'Close & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
