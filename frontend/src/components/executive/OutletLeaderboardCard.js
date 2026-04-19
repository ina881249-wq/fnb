import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Trophy, Building2, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from './formatters';

/**
 * OutletLeaderboardCard
 *
 * Props:
 *  title (string)
 *  rows: [{ outlet_id, outlet_name, city, value, trend, compareValue, secondaryMetrics: [{label, value}] }]
 *  onRowClick(row)
 *  loading, error
 *  metricLabel (eg 'Revenue'), valueFormatter
 *  maxRows
 */
export const OutletLeaderboardCard = ({
  title = 'Outlet Performance',
  subtitle,
  rows = [],
  onRowClick,
  loading = false,
  error = null,
  metricLabel = 'Value',
  valueFormatter = formatCurrency,
  maxRows = 8,
  action,
}) => {
  const displayRows = rows.slice(0, maxRows);
  const maxValue = Math.max(...displayRows.map(r => Math.abs(r.value || 0)), 1);

  return (
    <Card className="rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl" data-testid="exec-outlet-leaderboard-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <Trophy className="w-4 h-4 text-[hsl(var(--exec-accent-blue))]" />
            {title}
          </CardTitle>
          {subtitle && <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-[hsl(var(--destructive))]">{error}</div>
        ) : displayRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No outlets in scope</div>
        ) : (
          <div className="space-y-1">
            {displayRows.map((r, i) => {
              const pct = (Math.abs(r.value || 0) / maxValue) * 100;
              const trendIcon = r.trend === null || r.trend === undefined ? null
                : r.trend > 0.01 ? <TrendingUp className="w-3 h-3" />
                : r.trend < -0.01 ? <TrendingDown className="w-3 h-3" />
                : <Minus className="w-3 h-3" />;
              const trendColor = r.trend === null || r.trend === undefined ? 'text-[hsl(var(--muted-foreground))]'
                : r.trend > 0.01 ? 'text-[hsl(var(--exec-positive))]'
                : r.trend < -0.01 ? 'text-[hsl(var(--exec-negative))]'
                : 'text-[hsl(var(--muted-foreground))]';
              const rank = i + 1;
              const rankBg = rank === 1 ? 'bg-[hsl(var(--exec-accent-blue)/0.22)] text-[hsl(var(--exec-accent-blue))] border-[hsl(var(--exec-accent-blue)/0.4)]'
                : rank === 2 ? 'bg-white/8 text-[hsl(var(--foreground))] border-white/12'
                : rank === 3 ? 'bg-white/5 text-[hsl(var(--foreground))] border-white/10'
                : 'bg-transparent text-[hsl(var(--muted-foreground))] border-white/8';

              return (
                <button
                  key={r.outlet_id || i}
                  onClick={() => onRowClick && onRowClick(r)}
                  onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(r); } }}
                  className="w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--exec-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))] transition-[background-color] duration-150 text-left"
                  data-testid={`exec-outlet-leaderboard-row-${r.outlet_id || i}`}
                >
                  <span className={`h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold tabular-nums border flex-shrink-0 ${rankBg}`}>
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{r.outlet_name}</span>
                      {r.city && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-[var(--glass-border)] text-[hsl(var(--muted-foreground))]">
                          <Building2 className="w-2.5 h-2.5 mr-0.5" />{r.city}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-white/6 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, hsl(var(--exec-accent-blue)) 0%, hsl(var(--exec-accent-blue) / 0.55) 100%)' }} />
                    </div>
                    {r.secondaryMetrics && r.secondaryMetrics.length > 0 && (
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {r.secondaryMetrics.map((m, j) => (
                          <span key={j}><span className="uppercase tracking-wider">{m.label}</span> <span className="font-semibold text-[hsl(var(--foreground))] tabular-nums">{m.value}</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>{valueFormatter(r.value)}</span>
                    {r.trend !== null && r.trend !== undefined && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${trendColor}`}>
                        {trendIcon}
                        {r.trend > 0 ? '+' : ''}{Number(r.trend).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutletLeaderboardCard;
