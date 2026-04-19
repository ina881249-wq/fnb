import React from 'react';
import { formatCurrency } from './formatters';

/**
 * Custom glass tooltip for Recharts.
 * Props forwarded by Recharts: active, payload, label
 * Extra props: titleFormatter, valueFormatter, unit
 */
export const ChartTooltip = ({ active, payload, label, titleFormatter, valueFormatter, unit }) => {
  if (!active || !payload || !payload.length) return null;
  const title = titleFormatter ? titleFormatter(label) : label;
  const fmt = valueFormatter || ((v) => formatCurrency(v));
  return (
    <div className="exec-tooltip-surface px-3 py-2" data-testid="exec-chart-tooltip">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] mb-1">{title}</div>
      <div className="space-y-0.5">
        {payload.filter(p => p.value !== undefined && p.value !== null).map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.stroke || 'hsl(var(--exec-accent-blue))' }} />
            <span className="text-[hsl(var(--muted-foreground))] mr-2 capitalize">{p.name || p.dataKey}</span>
            <span className="font-semibold tabular-nums ml-auto">{fmt(p.value)}{unit || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
