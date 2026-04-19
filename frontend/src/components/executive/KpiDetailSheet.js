import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { Skeleton } from '../ui/skeleton';
import { ArrowUpRight, X } from 'lucide-react';
import { formatCurrency, formatPercent } from './formatters';

/**
 * KpiDetailSheet — slide-over panel opened when an InteractiveKpiCard is clicked.
 *
 * Props:
 *  open, onOpenChange
 *  title, description
 *  metric: { value, compareValue, trend, unit }
 *  series: [{ date, value, compare? }]
 *  topContributors: [{ label, value, pct, outlet_id? }]
 *  loading, error
 *  onViewReport() → navigate
 *  valueFormatter
 *  chartType: 'area' | 'bar'
 */
export const KpiDetailSheet = ({
  open,
  onOpenChange,
  title,
  description,
  metric = {},
  series = [],
  topContributors = [],
  loading = false,
  error = null,
  onViewReport,
  viewReportLabel = 'View Full Report',
  valueFormatter = formatCurrency,
  chartType = 'area',
  secondaryAction,
}) => {
  const accent = 'hsl(var(--exec-accent-blue))';
  const delta = metric.trend;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[540px] lg:max-w-[640px] bg-[var(--glass-bg-strong)] backdrop-blur-2xl border-l border-[var(--glass-border)] p-0 overflow-hidden flex flex-col"
        data-testid="exec-kpi-detail-sheet"
      >
        <SheetHeader className="px-5 py-4 border-b border-[var(--glass-border)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{title}</SheetTitle>
              {description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>}
            </div>
            <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md hover:bg-[var(--exec-hover-bg)] flex items-center justify-center" data-testid="exec-kpi-detail-sheet-close-button">
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Metric hero */}
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            ) : error ? (
              <div className="text-sm text-[hsl(var(--destructive))]">{error}</div>
            ) : (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold tabular-nums tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                    {valueFormatter(metric.value || 0)}
                  </span>
                  {delta !== null && delta !== undefined && (
                    <Badge className={`${delta >= 0 ? 'bg-[hsl(var(--exec-positive)/0.18)] text-[hsl(var(--exec-positive))]' : 'bg-[hsl(var(--exec-negative)/0.18)] text-[hsl(var(--exec-negative))]'} border-0 text-[11px] font-semibold`}>
                      {formatPercent(delta)}
                    </Badge>
                  )}
                </div>
                {metric.compareValue !== undefined && metric.compareValue !== null && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Previous period: <span className="tabular-nums font-medium text-[hsl(var(--foreground))]">{valueFormatter(metric.compareValue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Chart */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] font-semibold mb-2">Trend</div>
              <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3">
                {loading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : series.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No data for selected period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    {chartType === 'bar' ? (
                      <BarChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="kpiBarFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accent} stopOpacity={0.55} />
                            <stop offset="95%" stopColor={accent} stopOpacity={0.18} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--exec-grid))" strokeDasharray="3 6" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => valueFormatter(v).replace('Rp ', '')} />
                        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: 'hsl(var(--exec-accent-blue) / 0.06)' }} />
                        <Bar dataKey="value" fill="url(#kpiBarFill)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="kpiAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accent} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--exec-grid))" strokeDasharray="3 6" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground) / 0.85)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => valueFormatter(v).replace('Rp ', '')} />
                        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: 'hsl(var(--exec-accent-blue) / 0.35)', strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#kpiAreaFill)" activeDot={{ r: 5, fill: accent, stroke: 'white', strokeWidth: 2 }} />
                        {series[0]?.compare !== undefined && (
                          <Area type="monotone" dataKey="compare" stroke="hsl(var(--muted-foreground) / 0.45)" strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
                        )}
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top contributors */}
            {topContributors && topContributors.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] font-semibold mb-2">Top Contributors</div>
                <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
                  {topContributors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--exec-hover-bg)] transition-colors" data-testid={`exec-kpi-detail-sheet-contributor-${i}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] w-6 tabular-nums">#{i + 1}</span>
                        <span className="text-sm font-medium truncate">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {c.pct !== undefined && <span className="text-[11px] text-[hsl(var(--muted-foreground))] tabular-nums">{c.pct.toFixed(1)}%</span>}
                        <span className="text-sm font-semibold tabular-nums">{valueFormatter(c.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[var(--glass-border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--glass-bg)]">
          {secondaryAction || <span />}
          {onViewReport && (
            <Button
              onClick={onViewReport}
              className="gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-[hsl(var(--primary-foreground))]"
              data-testid="exec-kpi-detail-sheet-view-report-button"
            >
              {viewReportLabel}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KpiDetailSheet;
