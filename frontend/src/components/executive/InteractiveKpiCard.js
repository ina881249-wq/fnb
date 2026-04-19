import React from 'react';
import { Card } from '../ui/card';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { CountUpNumber } from './CountUpNumber';
import { Skeleton } from '../ui/skeleton';

/**
 * InteractiveKpiCard
 * Props:
 *  metricKey (string) — used for data-testid
 *  title, value (number or string), valueFormatter (fn for count-up), displayValue (pre-formatted string override)
 *  icon: Lucide icon component
 *  trend (number | null) — percentage change
 *  subtitle / secondaryChip
 *  spark: array of {x, y}
 *  onClick() → triggers slide-over sheet
 *  index for stagger
 *  loading, error, onRetry
 *  isPulsing (bool) — websocket update flash
 *  compareValue (number) — baseline value for compare mode
 */
export const InteractiveKpiCard = ({
  metricKey,
  title,
  value,
  displayValue,
  valueFormatter = (v) => Math.round(v).toLocaleString('id-ID'),
  icon: Icon,
  trend = null,
  trendLabel = 'vs prev',
  subtitle,
  spark = [],
  onClick,
  index = 0,
  loading = false,
  error = null,
  onRetry,
  isPulsing = false,
  compareValue,
  accent = 'blue', // 'blue' | 'teal' | 'amber' | 'red'
}) => {
  const accentVar = accent === 'teal' ? 'var(--primary)' : 'var(--exec-accent-blue)';
  const accentHsl = `hsl(${accentVar === 'var(--primary)' ? 'var(--primary)' : 'var(--exec-accent-blue)'})`;

  const trendIcon = trend === null || trend === undefined ? null
    : trend > 0.01 ? <TrendingUp className="w-3 h-3" />
    : trend < -0.01 ? <TrendingDown className="w-3 h-3" />
    : <Minus className="w-3 h-3" />;
  const trendColor = trend === null || trend === undefined ? 'text-[hsl(var(--muted-foreground))]'
    : trend > 0.01 ? 'text-[hsl(var(--exec-positive))]'
    : trend < -0.01 ? 'text-[hsl(var(--exec-negative))]'
    : 'text-[hsl(var(--muted-foreground))]';

  if (loading) {
    return (
      <Card className="rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl p-4 h-[148px]">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border-destructive/40 backdrop-blur-xl p-4 h-[148px] flex flex-col justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{title}</div>
        <div className="text-xs text-[hsl(var(--destructive))]">Failed to load</div>
        {onRetry && (
          <button onClick={onRetry} className="self-start text-xs text-[hsl(var(--exec-accent-blue))] hover:underline" data-testid={`exec-kpi-retry-${metricKey}`}>
            Retry
          </button>
        )}
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Card
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
        data-testid={`exec-kpi-card-${metricKey}`}
        className={`group relative overflow-hidden rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl p-4 shadow-[var(--glass-shadow-soft)] transition-[background-color,border-color,box-shadow] duration-200 ease-out
          ${onClick ? 'cursor-pointer hover:bg-[var(--exec-hover-bg)] hover:border-[hsl(var(--exec-accent-blue)/0.35)] hover:shadow-[var(--exec-glow-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))]' : ''}
          ${isPulsing ? 'exec-kpi-pulse' : ''}
        `}
      >
        {/* Glow blob on hover */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[hsl(var(--exec-accent-blue)/0.18)] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] font-semibold">{title}</span>
          <div className="flex items-center gap-1.5">
            {Icon && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: `hsl(var(--exec-accent-blue) / 0.12)`, borderColor: `hsl(var(--exec-accent-blue) / 0.28)` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: accentHsl }} />
              </div>
            )}
          </div>
        </div>

        {/* Value */}
        <div className="relative flex items-baseline gap-2 mb-1" data-testid={`exec-kpi-card-${metricKey}-value`}>
          <span className="text-[28px] sm:text-[30px] font-semibold tracking-tight tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>
            {displayValue !== undefined
              ? displayValue
              : (typeof value === 'number'
                  ? <CountUpNumber value={value} format={valueFormatter} />
                  : value)
            }
          </span>
          {onClick && <ChevronRight className="w-4 h-4 ml-auto text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>

        {/* Trend + subtitle */}
        <div className="relative flex items-center gap-2 text-[11px] mb-2">
          {trend !== null && trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${trendColor}`} data-testid={`exec-kpi-card-${metricKey}-trend-badge`}>
              {trendIcon}
              {trend > 0 ? '+' : ''}{Number(trend).toFixed(1)}%
            </span>
          )}
          {trend !== null && trend !== undefined && subtitle && <span className="text-[hsl(var(--muted-foreground))]">•</span>}
          {subtitle && <span className="text-[hsl(var(--muted-foreground))] truncate">{subtitle}</span>}
        </div>

        {/* Compare baseline */}
        {compareValue !== undefined && compareValue !== null && (
          <div className="relative text-[10px] text-[hsl(var(--muted-foreground))] mb-1">
            Prev: <span className="tabular-nums font-medium">{valueFormatter(compareValue)}</span>
          </div>
        )}

        {/* Sparkline */}
        {spark && spark.length > 1 && (
          <div className="relative -mx-1 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sparkFill-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentHsl} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={accentHsl} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip cursor={false} content={() => null} />
                <Area type="monotone" dataKey="y" stroke={accentHsl} strokeWidth={2} fill={`url(#sparkFill-${metricKey})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default InteractiveKpiCard;
