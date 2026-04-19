import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  ComposedChart, Treemap, LabelList, ReferenceLine,
} from 'recharts';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
const formatCompact = (val) => {
  const n = Number(val || 0);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};

const tooltipStyle = {
  contentStyle: {
    background: 'var(--glass-bg-strong, rgba(15,20,30,0.95))',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(20px)',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
    fontSize: '11px',
    padding: '6px 10px',
  },
  labelStyle: { fontSize: '11px', fontWeight: 600 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

/**
 * Waterfall chart using ComposedChart: stacked bars with invisible "base" bar.
 * Accepts rows: [{ label, amount, type: 'start' | 'add' | 'sub' | 'summary' | 'end' }]
 */
export function WaterfallChart({ rows = [], height = 320 }) {
  // Compute positions (base + value) for a classic waterfall
  const data = [];
  let running = 0;
  rows.forEach((row, idx) => {
    const amount = Number(row.amount || 0);
    if (row.type === 'start') {
      data.push({ label: row.label, base: 0, value: amount, type: row.type, total: amount, displayValue: amount });
      running = amount;
    } else if (row.type === 'end' || row.type === 'summary') {
      data.push({ label: row.label, base: 0, value: row.type === 'end' ? running : amount, type: row.type, total: row.type === 'end' ? running : running, displayValue: row.type === 'end' ? running : amount });
    } else if (amount >= 0) {
      data.push({ label: row.label, base: running, value: amount, type: row.type, total: running + amount, displayValue: amount });
      running += amount;
    } else {
      data.push({ label: row.label, base: running + amount, value: -amount, type: row.type, total: running + amount, displayValue: amount });
      running += amount;
    }
  });

  const colorFor = (type) => {
    switch (type) {
      case 'start':
      case 'end':
        return '#06B6D4';
      case 'summary':
        return '#8B5CF6';
      case 'sub':
        return '#F43F5E';
      case 'add':
      default:
        return '#10B981';
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 28, right: 12, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={formatCompact} />
        <Tooltip
          {...tooltipStyle}
          formatter={(val, name, ctx) => [formatCurrency(ctx.payload.displayValue), ctx.payload.label]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor(d.type)} />
          ))}
          <LabelList dataKey="displayValue" position="top" formatter={formatCompact} style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Revenue vs Expense stacked area with net profit line
 */
export function RevenueExpenseTrend({ data = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} minTickGap={20} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={formatCompact} />
        <Tooltip {...tooltipStyle} formatter={formatCurrency} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" fill="url(#expFill)" strokeWidth={2} />
        <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Donut chart for composition (e.g. revenue by outlet)
 */
export function CompositionDonut({ data = [], dataKey = 'value', nameKey = 'name', colors = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#EC4899'], height = 240, innerRadius = 55, outerRadius = 85 }) {
  const total = data.reduce((a, b) => a + (b[dataKey] || 0), 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="rgba(0,0,0,0.2)"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle}
          formatter={(val, name) => [formatCurrency(val) + (total ? ` (${((val / total) * 100).toFixed(1)}%)` : ''), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Cashflow stacked area (inflow/outflow over time)
 */
export function CashflowArea({ data = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} minTickGap={15} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={formatCompact} />
        <Tooltip {...tooltipStyle} formatter={formatCurrency} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10B981" fill="url(#inFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#F43F5E" fill="url(#outFill)" strokeWidth={2} />
        <Line type="monotone" dataKey="net" name="Net" stroke="#06B6D4" strokeWidth={2.5} dot={false} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Running cash balance from daily cashflow data.
 */
export function RunningBalance({ data = [], startingBalance = 0, height = 220 }) {
  let running = startingBalance;
  const seq = data.map(d => {
    running += (d.inflow || 0) - (d.outflow || 0);
    return { date: d.date, balance: Math.round(running) };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={seq} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} minTickGap={15} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={formatCompact} />
        <Tooltip {...tooltipStyle} formatter={formatCurrency} />
        <Area type="monotone" dataKey="balance" name="Running Cash" stroke="#06B6D4" fill="url(#balFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Treemap for asset composition
 */
export function AssetTreemap({ data = [], height = 280 }) {
  const colors = ['#06B6D4', '#0EA5E9', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#F59E0B', '#10B981'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))}
        dataKey="size"
        nameKey="name"
        aspectRatio={4 / 3}
        stroke="rgba(15,20,30,0.8)"
        content={<TreemapCell />}
      />
    </ResponsiveContainer>
  );
}
// eslint-disable-next-line react/prop-types
const TreemapCell = (props) => {
  const { depth, x, y, width, height, name, size, fill } = props;
  if (depth !== 1) return null;
  const showLabel = width > 60 && height > 40;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: 'rgba(15,20,30,0.8)', strokeWidth: 2 }} />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 18} fill="#fff" style={{ fontSize: 11, fontWeight: 600 }}>{name}</text>
          <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.85)" style={{ fontSize: 10 }}>
            {size ? formatCurrency(size) : ''}
          </text>
        </>
      )}
    </g>
  );
};

/**
 * Period comparison bar chart
 */
export function ComparisonBars({ current = {}, previous = {}, metrics = [], height = 220 }) {
  const data = metrics.map(m => ({
    name: m.label,
    current: current[m.key] || 0,
    previous: previous[m.key] || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={formatCompact} />
        <Tooltip {...tooltipStyle} formatter={formatCurrency} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="previous" name="Prev. period" fill="#64748B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="current" name="Current" fill="#06B6D4" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
