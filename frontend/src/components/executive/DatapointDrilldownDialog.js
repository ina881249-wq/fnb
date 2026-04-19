import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { ArrowUpRight, Download } from 'lucide-react';
import { formatCurrency } from './formatters';

/**
 * DatapointDrilldownDialog
 * Props:
 *  open, onOpenChange
 *  title, subtitle
 *  rows: array of row objects {time, outlet, source, amount, reference}
 *  total (number), count (number)
 *  loading, error
 *  onPrimary(), primaryLabel
 *  onSecondary(), secondaryLabel
 *  columns: [{key, label, align, render(row)}]
 */
export const DatapointDrilldownDialog = ({
  open,
  onOpenChange,
  title,
  subtitle,
  rows = [],
  total,
  count,
  loading = false,
  error = null,
  onPrimary,
  primaryLabel = 'Open in Reports',
  onSecondary,
  secondaryLabel = 'Export CSV',
  columns,
}) => {
  const defaultCols = [
    { key: 'time', label: 'Time', align: 'left', render: (r) => r.time || '-' },
    { key: 'outlet', label: 'Outlet', align: 'left', render: (r) => r.outlet || '-' },
    { key: 'source', label: 'Source', align: 'left', render: (r) => <Badge variant="outline" className="text-[10px] font-medium">{r.source || '-'}</Badge> },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.amount)}</span> },
    { key: 'reference', label: 'Reference', align: 'left', render: (r) => <span className="text-xs text-[hsl(var(--muted-foreground))]">{r.reference || '-'}</span> },
  ];
  const cols = columns || defaultCols;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] bg-[var(--glass-bg-strong)] backdrop-blur-2xl border-[var(--glass-border)] p-0 rounded-2xl overflow-hidden" data-testid="exec-drilldown-dialog">
        <DialogHeader className="px-5 py-4 border-b border-[var(--glass-border)]">
          <DialogTitle className="text-base font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</DialogDescription>}
          <div className="flex items-center gap-3 mt-2">
            {total !== undefined && <span className="text-xs"><span className="text-[hsl(var(--muted-foreground))]">Total:</span> <span className="font-semibold tabular-nums">{formatCurrency(total)}</span></span>}
            {count !== undefined && <span className="text-xs"><span className="text-[hsl(var(--muted-foreground))]">Entries:</span> <span className="font-semibold tabular-nums">{count}</span></span>}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[420px]">
          <div className="px-5 py-3">
            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-[hsl(var(--destructive))]">{error}</div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No transactions found for this datapoint</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    {cols.map(c => (
                      <th key={c.key} className={`py-2 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--glass-border)] hover:bg-[var(--exec-hover-bg)] transition-colors" data-testid={`exec-drilldown-dialog-row-${i}`}>
                      {cols.map(c => (
                        <td key={c.key} className={`py-2.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.render(row)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-[var(--glass-border)] px-5 py-3 flex items-center justify-between bg-[var(--glass-bg)]">
          <div>
            {onSecondary && (
              <Button variant="ghost" size="sm" onClick={onSecondary} className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />{secondaryLabel}
              </Button>
            )}
          </div>
          {onPrimary && (
            <Button onClick={onPrimary} size="sm" className="gap-1.5 bg-[hsl(var(--exec-accent-blue))] hover:bg-[hsl(var(--exec-accent-blue)/0.85)] text-white" data-testid="exec-drilldown-dialog-primary-button">
              {primaryLabel}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatapointDrilldownDialog;
