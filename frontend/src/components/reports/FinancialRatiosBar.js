import React from 'react';
import { Card } from '../ui/card';
import { TrendingUp, TrendingDown, Percent, Scale, Wallet, Activity, Coins, AlertTriangle } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const formatPct = (v) => `${(v ?? 0).toFixed(2)}%`;
const formatNum = (v) => (v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const formatCurr = (v) => `Rp ${(v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

const KPI = ({ icon: Icon, label, value, trend, color = 'cyan', hint, testId }) => {
  const trendIcon = trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 text-rose-400" /> : null;
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };
  return (
    <TooltipProvider delayDuration={200}>
      <UITooltip>
        <TooltipTrigger asChild>
          <div
            className="relative flex-1 min-w-[140px] p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:border-white/20 transition-colors cursor-default"
            data-testid={testId}
          >
            <div className={`w-7 h-7 rounded-md border inline-flex items-center justify-center ${colorMap[color]}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-2 truncate">{label}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-base font-semibold truncate" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
              {trendIcon}
            </div>
          </div>
        </TooltipTrigger>
        {hint && (
          <TooltipContent className="max-w-[260px] text-xs">{hint}</TooltipContent>
        )}
      </UITooltip>
    </TooltipProvider>
  );
};

export default function FinancialRatiosBar({ ratios }) {
  if (!ratios) {
    return (
      <Card className="p-3 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] animate-pulse h-[92px]" />
          ))}
        </div>
      </Card>
    );
  }

  const { profitability, liquidity, solvency, returns, cashflow_health } = ratios;
  const isProfitable = (profitability.net_margin_pct || 0) > 0;
  const liquidOk = (liquidity.current_ratio || 0) >= 1.0;

  return (
    <Card className="p-3 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl" data-testid="financial-ratios-bar">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <KPI
          icon={Percent}
          label="Gross Margin"
          value={formatPct(profitability.gross_margin_pct)}
          trend={profitability.gross_margin_pct > 0 ? 'up' : 'down'}
          color="emerald"
          testId="ratio-gross-margin"
          hint="Gross Margin = (Revenue - COGS) / Revenue. Menunjukkan efisiensi produksi."
        />
        <KPI
          icon={TrendingUp}
          label="Net Margin"
          value={formatPct(profitability.net_margin_pct)}
          trend={isProfitable ? 'up' : 'down'}
          color={isProfitable ? 'emerald' : 'rose'}
          testId="ratio-net-margin"
          hint="Net Margin = Net Profit / Revenue. Profitabilitas setelah semua biaya."
        />
        <KPI
          icon={Activity}
          label="OpEx Ratio"
          value={formatPct(profitability.opex_ratio_pct)}
          color="amber"
          testId="ratio-opex"
          hint="OpEx Ratio = Operating Expenses / Revenue. Semakin rendah semakin efisien."
        />
        <KPI
          icon={Scale}
          label="Current Ratio"
          value={formatNum(liquidity.current_ratio)}
          trend={liquidOk ? 'up' : 'down'}
          color={liquidOk ? 'emerald' : 'rose'}
          testId="ratio-current"
          hint="Current Ratio = Current Assets / Current Liabilities. Ideal >= 1.5x."
        />
        <KPI
          icon={Wallet}
          label="Cash on Hand"
          value={formatCurr(liquidity.cash_and_equivalents)}
          color="cyan"
          testId="ratio-cash"
          hint="Kas + Bank + Petty Cash. Total likuiditas siap pakai."
        />
        <KPI
          icon={Coins}
          label="Debt / Equity"
          value={formatNum(solvency.debt_to_equity)}
          color="violet"
          testId="ratio-de"
          hint="Debt to Equity Ratio. Semakin kecil semakin sedikit ketergantungan pada utang."
        />
        <KPI
          icon={TrendingUp}
          label="ROE (annualized)"
          value={formatPct(returns.roe_pct)}
          trend={returns.roe_pct > 0 ? 'up' : 'down'}
          color={returns.roe_pct > 0 ? 'emerald' : 'rose'}
          testId="ratio-roe"
          hint="Return on Equity (annualized) = Net Profit annualized / Total Equity."
        />
        <KPI
          icon={cashflow_health.runway_months ? AlertTriangle : Activity}
          label={cashflow_health.runway_months ? 'Runway (mo)' : 'Cashflow Margin'}
          value={cashflow_health.runway_months ? `${cashflow_health.runway_months}` : formatPct(cashflow_health.cashflow_margin_pct)}
          color={cashflow_health.runway_months && cashflow_health.runway_months < 6 ? 'rose' : 'emerald'}
          testId="ratio-runway"
          hint={cashflow_health.runway_months ? 'Runway = Cash / Monthly Burn. Berapa lama kas bertahan dengan pola pengeluaran saat ini.' : 'Cashflow Margin = Net Cashflow / Revenue.'}
        />
      </div>
    </Card>
  );
}
