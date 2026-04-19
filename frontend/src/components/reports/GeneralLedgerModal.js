import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(Number(val) || 0).toLocaleString('id-ID')}`;

export default function GeneralLedgerModal({ open, onClose, accountId, accountLabel = '', outletId = '', periodStart = '', periodEnd = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 25;

  const fetchLedger = async (skipVal = 0) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await api.get('/api/reports/general-ledger', {
        params: {
          account_id: accountId,
          outlet_id: outletId || '',
          period_start: periodStart || '',
          period_end: periodEnd || '',
          skip: skipVal,
          limit,
        },
      });
      setData(res.data);
    } catch {
      toast.error('Gagal memuat General Ledger');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && accountId) {
      setSkip(0);
      fetchLedger(0);
    }
    // eslint-disable-next-line
  }, [open, accountId, outletId, periodStart, periodEnd]);

  const totalPages = data ? Math.ceil((data.total || 0) / limit) : 1;
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="gl-modal">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            General Ledger — {data?.account?.code || ''} {data?.account?.name || accountLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Seluruh mutasi debit/credit untuk akun ini dalam periode terpilih.
          </DialogDescription>
        </DialogHeader>
        {loading && <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading...</p>}
        {data && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Debit</span>
                <p className="text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.total_debit)}</p>
              </div>
              <div className="p-2 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Credit</span>
                <p className="text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.total_credit)}</p>
              </div>
              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400">Balance</span>
                <p className="text-sm font-semibold text-cyan-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.balance)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-[var(--glass-bg-strong)] z-10">
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead className="text-[10px]">Tanggal</TableHead>
                    <TableHead className="text-[10px]">Jurnal</TableHead>
                    <TableHead className="text-[10px]">Deskripsi</TableHead>
                    <TableHead className="text-[10px] text-right">Debit</TableHead>
                    <TableHead className="text-[10px] text-right">Credit</TableHead>
                    <TableHead className="text-[10px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lines?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-xs text-center text-[hsl(var(--muted-foreground))] py-8">Tidak ada transaksi untuk periode ini</TableCell></TableRow>
                  )}
                  {data.lines?.map((l, i) => (
                    <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5 text-xs" data-testid={`gl-row-${i}`}>
                      <TableCell className="font-mono text-[10px]">{l.posting_date}</TableCell>
                      <TableCell className="font-mono text-[10px] text-cyan-400">{l.journal_number}</TableCell>
                      <TableCell className="truncate max-w-[260px]">{l.journal_description || l.description}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{l.debit ? formatCurrency(l.debit) : '-'}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{l.credit ? formatCurrency(l.credit) : '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{(l.source_type || '').replace(/_/g, ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]" data-testid="gl-pagination-info">
                Page {currentPage} of {totalPages} · {data.total || 0} entries
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-[var(--glass-border)]" disabled={skip === 0} onClick={() => { const s = Math.max(0, skip - limit); setSkip(s); fetchLedger(s); }} data-testid="gl-prev-btn">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-[var(--glass-border)]" disabled={currentPage >= totalPages} onClick={() => { const s = skip + limit; setSkip(s); fetchLedger(s); }} data-testid="gl-next-btn">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
