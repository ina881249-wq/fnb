import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

const fmt = (d) => d.toISOString().slice(0, 10);

/**
 * Quick period presets for finance reports.
 * Calls onChange({ period_start, period_end, label }) when user picks a preset.
 */
export const PERIOD_PRESETS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'last_week', label: 'Minggu Lalu' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'quarter', label: 'Kuartal Ini' },
  { key: 'last_quarter', label: 'Kuartal Lalu' },
  { key: 'ytd', label: 'Year-to-Date' },
  { key: 'last_year', label: 'Tahun Lalu' },
  { key: 'last_30', label: '30 Hari Terakhir' },
  { key: 'last_90', label: '90 Hari Terakhir' },
];

export function computePreset(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const tz = now.getTimezoneOffset();
  const today = new Date(y, m, d);
  let start, end;
  switch (key) {
    case 'today':
      start = today; end = today; break;
    case 'yesterday': {
      const yd = new Date(y, m, d - 1);
      start = yd; end = yd; break;
    }
    case 'week': {
      const dow = today.getDay() || 7; // Mon=1..Sun=7
      start = new Date(y, m, d - (dow - 1));
      end = today;
      break;
    }
    case 'last_week': {
      const dow = today.getDay() || 7;
      end = new Date(y, m, d - dow);
      start = new Date(y, m, d - dow - 6);
      break;
    }
    case 'month':
      start = new Date(y, m, 1); end = today; break;
    case 'last_month':
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 0); // day 0 of current = last day of prev
      break;
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3;
      start = new Date(y, qStart, 1); end = today; break;
    }
    case 'last_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      start = new Date(y, qStart - 3, 1);
      end = new Date(y, qStart, 0);
      break;
    }
    case 'ytd':
      start = new Date(y, 0, 1); end = today; break;
    case 'last_year':
      start = new Date(y - 1, 0, 1);
      end = new Date(y - 1, 11, 31);
      break;
    case 'last_30':
      start = new Date(y, m, d - 29); end = today; break;
    case 'last_90':
      start = new Date(y, m, d - 89); end = today; break;
    default:
      start = new Date(y, m, 1); end = today;
  }
  void tz;
  return { period_start: fmt(start), period_end: fmt(end) };
}

export function previousPeriod({ period_start, period_end }) {
  if (!period_start || !period_end) return { period_start: '', period_end: '' };
  const s = new Date(period_start);
  const e = new Date(period_end);
  const dur = (e - s) / (1000 * 60 * 60 * 24) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (dur - 1));
  return { period_start: fmt(prevStart), period_end: fmt(prevEnd) };
}

export default function PeriodPicker({ periodStart, periodEnd, onChange, presetKey = 'month', onPresetChange }) {
  const [open, setOpen] = React.useState(false);
  const currentLabel = PERIOD_PRESETS.find(p => p.key === presetKey)?.label || 'Custom';

  const handlePreset = (key) => {
    const range = computePreset(key);
    onChange({ ...range, key });
    if (onPresetChange) onPresetChange(key);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="period-picker">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 border-[var(--glass-border)]" data-testid="period-preset-trigger">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="text-xs">{currentLabel}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-2 w-56 bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-1" data-testid="period-preset-grid">
            {PERIOD_PRESETS.map(p => (
              <button
                key={p.key}
                className={`text-left text-xs px-2 py-1.5 rounded hover:bg-white/5 transition-colors ${presetKey === p.key ? 'bg-cyan-500/20 text-cyan-400' : ''}`}
                onClick={() => handlePreset(p.key)}
                data-testid={`period-preset-${p.key}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-1.5">
        <Label className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Dari</Label>
        <Input
          type="date"
          value={periodStart}
          onChange={(e) => { onChange({ period_start: e.target.value, period_end: periodEnd, key: 'custom' }); if (onPresetChange) onPresetChange('custom'); }}
          className="h-8 w-36 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)]"
          data-testid="period-start-input"
        />
        <Label className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Sampai</Label>
        <Input
          type="date"
          value={periodEnd}
          onChange={(e) => { onChange({ period_start: periodStart, period_end: e.target.value, key: 'custom' }); if (onPresetChange) onPresetChange('custom'); }}
          className="h-8 w-36 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)]"
          data-testid="period-end-input"
        />
      </div>
    </div>
  );
}
