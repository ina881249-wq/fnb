import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, Circle, Lock, Send, AlertTriangle, Clock, DollarSign, TrendingUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function DailyClosingOutlet() {
  const { currentOutlet, getOutletName } = useAuth();
  const { lang } = useLang();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingData, setClosingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const stepConfig = [
    { key: 'cashier_shifts', label: lang === 'id' ? 'Shift Kasir' : 'Cashier Shifts', desc: lang === 'id' ? 'Semua shift harus ditutup' : 'All shifts must be closed' },
    { key: 'sales_summary', label: lang === 'id' ? 'Ringkasan Penjualan' : 'Sales Summary', desc: lang === 'id' ? 'Catat data penjualan harian' : 'Record daily sales data' },
    { key: 'petty_cash', label: lang === 'id' ? 'Kas Kecil' : 'Petty Cash', desc: lang === 'id' ? 'Catat seluruh pengeluaran kas kecil' : 'Record petty cash expenses' },
    { key: 'stock_movements', label: lang === 'id' ? 'Pergerakan Stok' : 'Stock Movements', desc: lang === 'id' ? 'Catat waste, stock opname, adjustment' : 'Waste, counts, adjustments' },
    { key: 'cash_reconciliation', label: lang === 'id' ? 'Rekonsiliasi Kas' : 'Cash Reconciliation', desc: lang === 'id' ? 'Cek kas sesuai ekspektasi' : 'Verify cash matches expected' },
  ];

  const fetchData = async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const res = await api.get('/api/daily-closing/status', { params: { outlet_id: currentOutlet, date } });
      setClosingData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet, date]);

  const handleStart = async () => {
    try {
      await api.post(`/api/daily-closing/start?outlet_id=${currentOutlet}&date=${date}`);
      toast.success(lang === 'id' ? 'Penutupan dimulai' : 'Closing started');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/api/daily-closing/submit?outlet_id=${currentOutlet}&date=${date}`, { notes: '' });
      toast.success(lang === 'id' ? 'Berhasil dikirim untuk approval' : 'Closing submitted for approval');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const status = closingData?.status || 'open';
  const checklist = closingData?.checklist || {};
  const canSubmit = closingData?.can_submit || false;
  const completedSteps = stepConfig.filter(s => checklist[s.key]?.complete).length;
  const progress = (completedSteps / stepConfig.length) * 100;
  const shiftSummary = closingData?.shift_summary || {};
  const shifts = closingData?.shifts || [];
  const discrepancies = closingData?.discrepancies || [];

  if (!currentOutlet) {
    return <div className="flex items-center justify-center h-64"><p className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Select an outlet first'}</p></div>;
  }

  return (
    <div className="space-y-6" data-testid="daily-closing-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Penutupan Harian' : 'Daily Closing'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{getOutletName(currentOutlet)} — {date}</p>
        </div>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[160px] bg-[var(--glass-bg)] border-[var(--glass-border)]" data-testid="closing-date-picker" />
      </div>

      {/* Discrepancies banner */}
      {discrepancies.length > 0 && (
        <Card className="bg-[hsl(var(--destructive))]/5 border-[hsl(var(--destructive))]/30" data-testid="closing-discrepancies">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {lang === 'id' ? 'Temuan Sistem' : 'System Findings'}
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">{discrepancies.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {discrepancies.map((d, i) => (
                <div key={i} className={`text-xs flex items-center gap-2 p-2 rounded-lg ${
                  d.severity === 'critical' ? 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]' : 'bg-amber-500/10 text-amber-400'
                }`} data-testid={`closing-discrepancy-${i}`}>
                  {d.severity === 'critical' ? <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{d.message}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] capitalize border-current">{d.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Banner */}
      <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${status === 'locked' ? 'border-green-500/30' : status === 'submitted' ? 'border-cyan-500/30' : ''}`}>
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {status === 'locked' ? <Lock className="w-6 h-6 text-green-400" /> :
             status === 'submitted' ? <Send className="w-6 h-6 text-cyan-400" /> :
             <Circle className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />}
            <div>
              <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                {status === 'locked' ? (lang === 'id' ? 'Hari Terkunci' : 'Day Locked') :
                 status === 'submitted' ? (lang === 'id' ? 'Dikirim — Menunggu Approval' : 'Submitted — Awaiting Approval') :
                 status === 'in_progress' ? (lang === 'id' ? 'Dalam Proses' : 'Closing In Progress') :
                 (lang === 'id' ? 'Belum Dimulai' : 'Not Started')}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{completedSteps}/{stepConfig.length} {lang === 'id' ? 'tugas selesai' : 'tasks completed'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
              <motion.div className="h-full bg-[hsl(var(--primary))] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{Math.round(progress)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Shift summary (Phase 3C) */}
      {closingData?.checklist?.cashier_shifts?.has_data && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl" data-testid="closing-shift-summary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                <Clock className="w-4 h-4 text-[hsl(var(--primary))]" />
                {lang === 'id' ? 'Ringkasan Shift Kasir' : 'Cashier Shift Summary'}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  {checklist.cashier_shifts?.count || 0} {lang === 'id' ? 'ditutup' : 'closed'}
                </Badge>
                {checklist.cashier_shifts?.open_count > 0 && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
                    {checklist.cashier_shifts.open_count} {lang === 'id' ? 'masih terbuka' : 'still open'}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Order Dibayar' : 'Paid Orders'}</div>
                <div className="text-lg font-semibold">{shiftSummary.total_orders || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Total Penjualan' : 'Total Sales'}</div>
                <div className="text-lg font-semibold text-[hsl(var(--primary))]">{fmtIDR(shiftSummary.total_sales)}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Kas Ekspektasi' : 'Expected Cash'}</div>
                <div className="text-lg font-semibold">{fmtIDR(shiftSummary.expected_cash_total)}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] mb-1">{lang === 'id' ? 'Total Variance' : 'Total Variance'}</div>
                <div className={`text-lg font-semibold ${
                  (shiftSummary.variance_total || 0) === 0 ? 'text-emerald-400' :
                  (shiftSummary.variance_total || 0) > 0 ? 'text-amber-400' : 'text-[hsl(var(--destructive))]'
                }`}>
                  {(shiftSummary.variance_total || 0) >= 0 ? '+' : ''}{fmtIDR(shiftSummary.variance_total)}
                </div>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { k: 'cash_sales', label: lang === 'id' ? 'Tunai' : 'Cash' },
                { k: 'card_sales', label: lang === 'id' ? 'Kartu' : 'Card' },
                { k: 'online_sales', label: 'QRIS/Online' },
                { k: 'other_sales', label: lang === 'id' ? 'Lainnya' : 'Other' },
              ].map(pm => (
                <div key={pm.k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--glass-bg)] text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">{pm.label}</span>
                  <span className="font-medium">{fmtIDR(shiftSummary[pm.k])}</span>
                </div>
              ))}
            </div>

            {/* Shifts list */}
            {shifts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase text-[hsl(var(--muted-foreground))] tracking-wider mb-1">
                  {lang === 'id' ? 'Daftar Shift' : 'Shift List'}
                </div>
                {shifts.map(s => {
                  const v = s.variance || 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs" data-testid={`closing-shift-${s.id}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{s.shift_number}</span>
                        <span className="text-[hsl(var(--muted-foreground))]">{s.cashier_name}</span>
                        <Badge variant="outline" className={s.status === 'open' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-[var(--glass-border)]'}>
                          {s.status === 'open' ? (lang === 'id' ? 'Terbuka' : 'Open') : (lang === 'id' ? 'Ditutup' : 'Closed')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.totals?.total_sales != null && (
                          <span>{lang === 'id' ? 'Sales:' : 'Sales:'} <span className="font-medium">{fmtIDR(s.totals.total_sales)}</span></span>
                        )}
                        {s.status === 'closed' && (
                          <span className={`font-medium ${v === 0 ? 'text-emerald-400' : v > 0 ? 'text-amber-400' : 'text-[hsl(var(--destructive))]'}`}>
                            {v >= 0 ? '+' : ''}{fmtIDR(v)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist Steps */}
      <div className="space-y-3">
        {stepConfig.map((step, i) => {
          const check = checklist[step.key] || {};
          const isComplete = check.complete;
          return (
            <motion.div key={step.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${isComplete ? 'border-green-500/20' : ''}`} data-testid={`closing-step-${step.key}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-green-500/20' : 'bg-[var(--glass-bg-strong)]'}`}>
                    {isComplete ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{step.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.count !== undefined && <span className="text-xs text-[hsl(var(--muted-foreground))]">{check.count} {lang === 'id' ? 'entri' : 'entries'}</span>}
                    {check.open_count > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] gap-1"><AlertTriangle className="w-3 h-3" /> {check.open_count} open</Badge>}
                    {check.unresolved > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] gap-1"><AlertTriangle className="w-3 h-3" /> {check.unresolved} unresolved</Badge>}
                    <Badge variant="outline" className={`text-[9px] ${isComplete ? 'border-green-500/30 text-green-400' : 'border-gray-500/30 text-gray-400'}`}>
                      {isComplete ? (lang === 'id' ? 'Selesai' : 'Complete') : (lang === 'id' ? 'Pending' : 'Pending')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 items-center flex-wrap">
        {status === 'open' && (
          <Button onClick={handleStart} className="gap-2" data-testid="start-closing">{lang === 'id' ? 'Mulai Penutupan' : 'Start Closing'}</Button>
        )}
        {['open', 'in_progress'].includes(status) && (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2" data-testid="submit-closing">
            <Send className="w-4 h-4" /> {lang === 'id' ? 'Kirim untuk Persetujuan' : 'Submit for Approval'}
          </Button>
        )}
        {!canSubmit && ['open', 'in_progress'].includes(status) && (
          <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {lang === 'id' ? 'Selesaikan semua tugas & temuan sebelum submit' : 'Complete all tasks & resolve findings before submit'}</p>
        )}
      </div>
    </div>
  );
}
