import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Button } from '../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Calendar as CalendarIcon, RotateCw } from 'lucide-react';

const toISO = (d) => {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const computeRange = (preset) => {
  const today = new Date();
  const endOf = new Date(today);
  const startOf = new Date(today);
  switch (preset) {
    case 'today': return { from: toISO(today), to: toISO(today) };
    case '7d': startOf.setDate(today.getDate() - 6); return { from: toISO(startOf), to: toISO(endOf) };
    case '30d': startOf.setDate(today.getDate() - 29); return { from: toISO(startOf), to: toISO(endOf) };
    case 'mtd': startOf.setDate(1); return { from: toISO(startOf), to: toISO(endOf) };
    case 'qtd': {
      const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      return { from: toISO(qStart), to: toISO(endOf) };
    }
    case 'ytd': return { from: `${today.getFullYear()}-01-01`, to: toISO(endOf) };
    default: startOf.setDate(today.getDate() - 29); return { from: toISO(startOf), to: toISO(endOf) };
  }
};

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'mtd', label: 'MTD' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
];

/**
 * PremiumPeriodPicker
 * Props:
 *  value: { from, to, preset, compare }
 *  onChange(value)
 *  showCompare (default true)
 */
export const PremiumPeriodPicker = ({ value, onChange, showCompare = true, showRefresh = true, onRefresh, lastRefreshed }) => {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(null);

  const isCustom = value?.preset === 'custom';

  useEffect(() => {
    if (open) {
      setDraftRange(value?.from && value?.to ? { from: new Date(value.from), to: new Date(value.to) } : undefined);
    }
  }, [open, value]);

  const handlePreset = (preset) => {
    if (!preset) return;
    const range = computeRange(preset);
    onChange({ ...range, preset, compare: value?.compare || false });
  };

  const applyCustom = () => {
    if (draftRange?.from && draftRange?.to) {
      onChange({ from: toISO(draftRange.from), to: toISO(draftRange.to), preset: 'custom', compare: value?.compare || false });
      setOpen(false);
    }
  };

  const displayLabel = useMemo(() => {
    if (isCustom && value?.from && value?.to) {
      return `${value.from} → ${value.to}`;
    }
    const found = PRESETS.find(p => p.key === value?.preset);
    return found ? `Custom range` : 'Custom';
  }, [isCustom, value]);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="exec-period-picker">
      <ToggleGroup
        type="single"
        value={isCustom ? '' : (value?.preset || '30d')}
        onValueChange={handlePreset}
        className="gap-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full p-1"
      >
        {PRESETS.map(p => (
          <ToggleGroupItem
            key={p.key}
            value={p.key}
            aria-label={p.label}
            data-testid={`exec-period-picker-preset-${p.key}`}
            className="h-7 px-3 text-xs rounded-full data-[state=on]:bg-[hsl(var(--exec-accent-blue)/0.18)] data-[state=on]:text-[hsl(var(--exec-accent-blue))] data-[state=on]:border data-[state=on]:border-[hsl(var(--exec-accent-blue)/0.35)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))]"
          >
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-9 gap-2 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--exec-hover-bg)] ${isCustom ? 'border-[hsl(var(--exec-accent-blue)/0.45)] text-[hsl(var(--exec-accent-blue))]' : 'text-[hsl(var(--muted-foreground))]'}`}
            data-testid="exec-period-picker-custom-trigger"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-xl" align="start">
          <Calendar
            mode="range"
            selected={draftRange}
            onSelect={setDraftRange}
            numberOfMonths={2}
            className="text-xs"
          />
          <Separator className="my-3 bg-[var(--glass-border)]" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {draftRange?.from ? toISO(draftRange.from) : '—'} → {draftRange?.to ? toISO(draftRange.to) : '—'}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} data-testid="exec-period-picker-custom-cancel-button">Cancel</Button>
              <Button size="sm" onClick={applyCustom} disabled={!draftRange?.from || !draftRange?.to} className="bg-[hsl(var(--exec-accent-blue))] hover:bg-[hsl(var(--exec-accent-blue)/0.85)] text-white" data-testid="exec-period-picker-custom-apply-button">
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {showCompare && (
        <div className="flex items-center gap-2 h-9 px-3 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <Switch
            checked={!!value?.compare}
            onCheckedChange={(checked) => onChange({ ...value, compare: checked })}
            className="data-[state=checked]:bg-[hsl(var(--exec-accent-blue))]"
            data-testid="exec-period-picker-compare-toggle"
          />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Compare</span>
        </div>
      )}

      {showRefresh && (
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-9 px-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="exec-period-picker-refresh">
          <RotateCw className="w-3.5 h-3.5" />
          {lastRefreshed && <span className="ml-1.5">{lastRefreshed}</span>}
        </Button>
      )}
    </div>
  );
};

export default PremiumPeriodPicker;
