import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { Building2, ArrowUpRight, DollarSign, Percent, AlertTriangle, CheckSquare } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { formatCurrency, formatPercent } from './formatters';
import api from '../../api/client';

/**
 * OutletDrilldownDialog
 * Fetches /api/executive/outlet-profile?outlet_id=...&date_from=...&date_to=...
 *
 * Props: open, onOpenChange, outletId, outletName, city, dateFrom, dateTo, onViewOutlet
 */
export const OutletDrilldownDialog = ({ open, onOpenChange, outletId, outletName, city, dateFrom, dateTo, onViewOutlet }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !outletId) return;
    const fetch = async () => {
      setLoading(true); setError(null);
      try {
        const res = await api.get('/api/executive/outlet-profile', { params: { outlet_id: outletId, date_from: dateFrom, date_to: dateTo } });
        setData(res.data);
      } catch (e) {
        setError('Failed to load outlet profile');
      }
      setLoading(false);
    };
    fetch();
  }, [open, outletId, dateFrom, dateTo]);

  const metrics = data?.metrics || {};
  const series = data?.trend || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] bg-[var(--glass-bg-strong)] backdrop-blur-2xl border-[var(--glass-border)] rounded-2xl p-0 overflow-hidden" data-testid="exec-outlet-drilldown-dialog">
        <DialogHeader className="px-5 py-4 border-b border-[var(--glass-border)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--exec-accent-blue)/0.18)] border border-[hsl(var(--exec-accent-blue)/0.35)] grid place-items-center">
                <Building2 className="w-5 h-5 text-[hsl(var(--exec-accent-blue))]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{outletName}</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {city && <Badge variant="outline" className="text-[10px] h-5 border-[var(--glass-border)] text-[hsl(var(--muted-foreground))]">{city}</Badge>}
                  {dateFrom && dateTo && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{dateFrom} → {dateTo}</span>}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[520px]">
          <div className="px-5 py-4 space-y-4">
            {/* Metric tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'revenue', label: 'Revenue', icon: DollarSign, value: metrics.revenue, fmt: formatCurrency, color: 'blue' },
                { key: 'margin', label: 'Margin', icon: Percent, value: metrics.margin_pct, fmt: (v) => `${(v || 0).toFixed(1)}%`, color: 'teal' },
                { key: 'closing', label: 'Closing Rate', icon: CheckSquare, value: metrics.closing_rate, fmt: (v) => `${(v || 0).toFixed(0)}%`, color: 'green' },
                { key: 'waste', label: 'Waste', icon: AlertTriangle, value: metrics.waste_value, fmt: formatCurrency, color: 'amber' },
              ].map((m, i) => (
                <div key={m.key} className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] font-semibold">{m.label}</span>
                    <m.icon className="w-3.5 h-3.5 text-[hsl(var(--exec-accent-blue))]" />
                  </div>
                  {loading ? <Skeleton className="h-6 w-20" /> : (
                    <div className="text-lg font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
                      {m.value !== null && m.value !== undefined ? m.fmt(m.value) : '-'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Trend chart */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] font-semibold mb-2">Revenue Trend</div>
              <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3">
                {loading ? <Skeleton className="h-[220px] w-full" /> : series.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="outletDrillFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--exec-accent-blue))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--exec-grid))" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                      <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={{ stroke: 'hsl(var(--exec-accent-blue) / 0.35)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--exec-accent-blue))" strokeWidth={2} fill="url(#outletDrillFill)" activeDot={{ r: 4, fill: 'hsl(var(--exec-accent-blue))', stroke: 'white', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent alerts / activity */}
            {data?.recent_alerts && data.recent_alerts.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] font-semibold mb-2">Recent Alerts</div>
                <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
                  {data.recent_alerts.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.priority === 'critical' ? 'bg-red-400' : a.priority === 'high' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                        <span className="truncate">{a.title}</span>
                      </div>
                      <span className="text-[hsl(var(--muted-foreground))] flex-shrink-0">{a.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-[var(--glass-border)] px-5 py-3 flex items-center justify-end gap-2 bg-[var(--glass-bg)]">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          {onViewOutlet && (
            <Button size="sm" onClick={onViewOutlet} className="gap-1.5 bg-[hsl(var(--exec-accent-blue))] hover:bg-[hsl(var(--exec-accent-blue)/0.85)] text-white" data-testid="exec-outlet-drilldown-view-full">
              View Full Analytics
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OutletDrilldownDialog;
