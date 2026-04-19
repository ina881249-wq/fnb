import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { FileSpreadsheet, FileText, Database, BookOpen, CheckCircle2, AlertCircle, Settings, GitBranch, Wallet, TrendingUp, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';
import PeriodPicker, { computePreset, previousPeriod } from '../../components/reports/PeriodPicker';
import FinancialRatiosBar from '../../components/reports/FinancialRatiosBar';
import GeneralLedgerModal from '../../components/reports/GeneralLedgerModal';
import { WaterfallChart, RevenueExpenseTrend, CompositionDonut, CashflowArea, RunningBalance, AssetTreemap, ComparisonBars } from '../../components/reports/ReportCharts';

const formatCurrency = (val) => `Rp ${(Number(val) || 0).toLocaleString('id-ID')}`;
const formatPct = (a, b) => (b ? `${(((a - b) / Math.abs(b)) * 100).toFixed(1)}%` : '—');

export default function ReportsPage() {
  const { currentOutlet, user } = useAuth();
  const [activeReport, setActiveReport] = useState('pnl');

  // Period state
  const initialPreset = computePreset('month');
  const [periodStart, setPeriodStart] = useState(initialPreset.period_start);
  const [periodEnd, setPeriodEnd] = useState(initialPreset.period_end);
  const [presetKey, setPresetKey] = useState('month');
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Data
  const [ratios, setRatios] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [pnlPrev, setPnlPrev] = useState(null);
  const [cashflowData, setCashflowData] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [equityChanges, setEquityChanges] = useState(null);
  const [invValuation, setInvValuation] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState(null);

  // Drill-down
  const [glOpen, setGlOpen] = useState(false);
  const [glAccount, setGlAccount] = useState(null);

  // Admin
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const isSuperadmin = user?.is_superadmin === true;

  const paramsBase = useMemo(() => ({
    outlet_id: currentOutlet || '',
    period_start: periodStart,
    period_end: periodEnd,
  }), [currentOutlet, periodStart, periodEnd]);

  const prevRange = useMemo(() => previousPeriod({ period_start: periodStart, period_end: periodEnd }), [periodStart, periodEnd]);

  const fetchRatios = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/financial-ratios', { params: paramsBase });
      setRatios(res.data);
    } catch { /* silent */ }
  }, [paramsBase]);

  const fetchPnl = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/pnl', { params: paramsBase });
      setPnlData(res.data);
      if (compareEnabled) {
        const prev = await api.get('/api/reports/pnl', { params: { ...paramsBase, ...prevRange } });
        setPnlPrev(prev.data);
      } else {
        setPnlPrev(null);
      }
    } catch { toast.error('Gagal memuat P&L'); }
  }, [paramsBase, compareEnabled, prevRange]);

  const fetchCashflow = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/cashflow', { params: paramsBase });
      setCashflowData(res.data);
    } catch { toast.error('Gagal memuat Cashflow'); }
  }, [paramsBase]);

  const fetchBS = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/balance-sheet', { params: { as_of: periodEnd, outlet_id: currentOutlet || '' } });
      setBalanceSheet(res.data);
    } catch { toast.error('Gagal memuat Balance Sheet'); }
  }, [periodEnd, currentOutlet]);

  const fetchTB = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/trial-balance', { params: paramsBase });
      setTrialBalance(res.data);
    } catch { toast.error('Gagal memuat Trial Balance'); }
  }, [paramsBase]);

  const fetchEquity = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/equity-changes', { params: paramsBase });
      setEquityChanges(res.data);
    } catch { toast.error('Gagal memuat Perubahan Ekuitas'); }
  }, [paramsBase]);

  const fetchTrend = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/revenue-trend', { params: { ...paramsBase, granularity: 'day' } });
      setRevenueTrend(res.data);
    } catch { /* silent */ }
  }, [paramsBase]);

  const fetchInv = useCallback(async () => {
    try {
      const res = await api.get('/api/reports/inventory-valuation', { params: { outlet_id: currentOutlet || '' } });
      setInvValuation(res.data);
    } catch { toast.error('Gagal memuat Inventory Valuation'); }
  }, [currentOutlet]);

  useEffect(() => { fetchRatios(); }, [fetchRatios]);

  useEffect(() => {
    if (activeReport === 'pnl') { fetchPnl(); fetchTrend(); }
    else if (activeReport === 'cashflow') fetchCashflow();
    else if (activeReport === 'balance-sheet') fetchBS();
    else if (activeReport === 'trial-balance') fetchTB();
    else if (activeReport === 'equity') fetchEquity();
    else if (activeReport === 'inv-valuation') fetchInv();
  }, [activeReport, fetchPnl, fetchTrend, fetchCashflow, fetchBS, fetchTB, fetchEquity, fetchInv]);

  const handlePeriodChange = ({ period_start, period_end, key }) => {
    if (period_start) setPeriodStart(period_start);
    if (period_end) setPeriodEnd(period_end);
    if (key) setPresetKey(key);
  };

  const openGL = (accountId, label) => {
    setGlAccount({ id: accountId, label });
    setGlOpen(true);
  };

  const fetchCoverage = async () => {
    try { const r = await api.get('/api/admin/journals/coverage'); setCoverage(r.data); } catch { toast.error('Gagal cek coverage'); }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await api.post('/api/admin/journals/backfill', { date_from: '', date_to: '' });
      const r = res.data.report;
      const totalPosted = (r.sales_summary?.posted || 0) + (r.petty_cash?.posted || 0) + (r.cash_movement?.posted || 0);
      toast.success(`Backfill selesai: ${totalPosted} jurnal baru`);
      await fetchCoverage();
      await Promise.all([fetchRatios(), fetchPnl(), fetchCashflow(), fetchBS(), fetchTB(), fetchEquity()]);
    } catch { toast.error('Backfill gagal'); }
    setBackfilling(false);
  };

  const handleExport = async (reportType, format) => {
    try {
      const params = { format, ...paramsBase };
      const res = await api.get(`/api/reports/export/${reportType}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} exported`);
    } catch { toast.error('Export failed'); }
  };

  const JournalSourceBadge = ({ data }) => {
    if (!data) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1.5 text-[10px] border-cyan-500/40 text-cyan-400 bg-cyan-500/10" data-testid="journal-source-badge">
          <Database className="w-3 h-3" /> Journal-driven
        </Badge>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]" data-testid="journal-count">
          {data.journal_count ?? 0} journals · {periodStart} → {periodEnd}
        </span>
      </div>
    );
  };

  // Revenue by outlet donut data
  const revenueDonut = useMemo(() => {
    if (!pnlData?.revenue_by_outlet) return [];
    return pnlData.revenue_by_outlet.map(r => ({ name: r.outlet_name, value: r.revenue }));
  }, [pnlData]);

  const expenseDonut = useMemo(() => {
    if (!pnlData?.expense_categories) return [];
    return pnlData.expense_categories.slice(0, 8).map(r => ({ name: r.category, value: r.amount }));
  }, [pnlData]);

  // P&L waterfall data
  const pnlWaterfall = useMemo(() => {
    if (!pnlData) return [];
    return [
      { label: 'Revenue', amount: pnlData.total_revenue, type: 'start' },
      { label: 'COGS', amount: -(pnlData.total_cogs || 0), type: 'sub' },
      { label: 'Gross Profit', amount: pnlData.gross_profit, type: 'summary' },
      { label: 'OpEx', amount: -(pnlData.total_expenses || 0), type: 'sub' },
      { label: 'Net Profit', amount: pnlData.net_profit, type: 'end' },
    ];
  }, [pnlData]);

  // BS composition donut
  const bsComposition = useMemo(() => {
    if (!balanceSheet) return [];
    return [
      { name: 'Assets', value: Math.abs(balanceSheet.assets?.total || 0) },
      { name: 'Liabilities', value: Math.abs(balanceSheet.liabilities?.total || 0) },
      { name: 'Equity', value: Math.abs(balanceSheet.equity?.total || 0) },
    ].filter(x => x.value > 0);
  }, [balanceSheet]);

  const bsTreemap = useMemo(() => {
    if (!balanceSheet?.assets?.accounts) return [];
    return balanceSheet.assets.accounts
      .map(a => ({ name: `${a.account_code} ${a.account_name}`, size: Math.max(Math.abs(a.balance), 1) }))
      .filter(a => a.size > 0);
  }, [balanceSheet]);

  const cashflowDonut = useMemo(() => {
    if (!cashflowData) return [];
    const out = [];
    if (cashflowData.by_category?.operating) out.push({ name: 'Operating', value: Math.abs(cashflowData.by_category.operating) });
    if (cashflowData.by_category?.financing) out.push({ name: 'Financing', value: Math.abs(cashflowData.by_category.financing) });
    if (cashflowData.by_category?.investing) out.push({ name: 'Investing', value: Math.abs(cashflowData.by_category.investing) });
    return out;
  }, [cashflowData]);

  return (
    <div className="space-y-4" data-testid="reports-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Reports</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Laporan keuangan berbasis journal — single source of truth
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodPicker
            periodStart={periodStart}
            periodEnd={periodEnd}
            presetKey={presetKey}
            onChange={handlePeriodChange}
            onPresetChange={setPresetKey}
          />
          <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--glass-border)]">
            <Label className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Compare</Label>
            <Switch checked={compareEnabled} onCheckedChange={setCompareEnabled} data-testid="compare-toggle" />
          </div>
          {isSuperadmin && (
            <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => { setBackfillOpen(true); fetchCoverage(); }} data-testid="open-backfill-dialog-button">
              <Settings className="w-3.5 h-3.5" /> Coverage
            </Button>
          )}
        </div>
      </div>

      {/* Financial Ratios KPI Bar */}
      <FinancialRatiosBar ratios={ratios} />

      {/* Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)] flex-wrap h-auto">
          <TabsTrigger value="pnl" data-testid="tab-pnl">Laba Rugi</TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Neraca</TabsTrigger>
          <TabsTrigger value="equity" data-testid="tab-equity">Perubahan Ekuitas</TabsTrigger>
          <TabsTrigger value="cashflow" data-testid="tab-cashflow">Arus Kas</TabsTrigger>
          <TabsTrigger value="trial-balance" data-testid="tab-trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="inv-valuation" data-testid="tab-inv-valuation">Inventory Val.</TabsTrigger>
        </TabsList>

        {/* ============ P&L / Laba Rugi ============ */}
        <TabsContent value="pnl" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Laba Rugi (Profit &amp; Loss)</CardTitle>
                <JournalSourceBadge data={pnlData} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('pnl', 'excel')} data-testid="report-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('pnl', 'pdf')} data-testid="report-export-pdf-button"><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {pnlData && (
                <>
                  {/* KPI Cards with comparison */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Revenue', key: 'total_revenue', color: 'emerald', testId: 'pnl-revenue-card' },
                      { label: 'COGS', key: 'total_cogs', color: 'orange', testId: 'pnl-cogs-card' },
                      { label: 'Expenses', key: 'total_expenses', color: 'rose', testId: 'pnl-expenses-card' },
                      { label: 'Net Profit', key: 'net_profit', color: pnlData.net_profit >= 0 ? 'emerald' : 'rose', testId: 'pnl-net-card' },
                    ].map(m => {
                      const current = pnlData[m.key] || 0;
                      const prev = pnlPrev?.[m.key];
                      const delta = prev !== undefined ? formatPct(current, prev) : null;
                      const deltaPositive = prev !== undefined && current >= prev;
                      return (
                        <div key={m.key} className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid={m.testId}>
                          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{m.label}</span>
                          <p className={`text-xl font-semibold mt-1 text-${m.color}-400`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(current)}</p>
                          {compareEnabled && prev !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className={`text-[10px] ${deltaPositive ? 'border-emerald-500/40 text-emerald-400' : 'border-rose-500/40 text-rose-400'}`}>
                                {deltaPositive ? '↑' : '↓'} {delta}
                              </Badge>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">vs prev.</span>
                            </div>
                          )}
                          {m.key === 'net_profit' && <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-1">Margin: {pnlData.margin_percentage}%</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Waterfall Chart */}
                  <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                    <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">P&amp;L Waterfall</h4>
                    <WaterfallChart rows={pnlWaterfall} />
                  </div>

                  {/* Revenue trend + donut split */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Revenue vs Expense Trend</h4>
                      {revenueTrend?.data?.length > 0 ? <RevenueExpenseTrend data={revenueTrend.data} /> : <p className="text-xs text-[hsl(var(--muted-foreground))] py-8 text-center">Tidak ada data</p>}
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Revenue by Outlet</h4>
                      {revenueDonut.length > 0 ? <CompositionDonut data={revenueDonut} /> : <p className="text-xs text-[hsl(var(--muted-foreground))] py-8 text-center">-</p>}
                    </div>
                  </div>

                  {/* Comparison bars (only if enabled) */}
                  {compareEnabled && pnlPrev && (
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="pnl-comparison-chart">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Current vs Previous Period</h4>
                      <ComparisonBars
                        current={pnlData}
                        previous={pnlPrev}
                        metrics={[
                          { key: 'total_revenue', label: 'Revenue' },
                          { key: 'total_cogs', label: 'COGS' },
                          { key: 'total_expenses', label: 'OpEx' },
                          { key: 'net_profit', label: 'Net Profit' },
                        ]}
                      />
                    </div>
                  )}

                  {/* Breakdowns */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <BreakdownList title="Revenue Breakdown" items={pnlData.revenue_breakdown} colorClass="text-emerald-400" onRowClick={openGL} testId="pnl-revenue-breakdown" />
                    <BreakdownList title="Expense by Category" items={expenseDonut.length ? expenseDonut.map((e, i) => ({ account_code: String(i + 1).padStart(2, '0'), account_name: e.name, balance: e.value })) : []} colorClass="text-rose-400" testId="pnl-expense-category" />
                    <BreakdownList title="Expense Breakdown" items={pnlData.expense_breakdown} colorClass="text-rose-400" onRowClick={openGL} testId="pnl-expense-breakdown" />
                  </div>

                  {pnlData.revenue_by_outlet?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Revenue by Outlet</h4>
                      <Table>
                        <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                          <TableHead>Outlet</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">%</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {pnlData.revenue_by_outlet.map((r, i) => {
                            const pct = pnlData.total_revenue > 0 ? (r.revenue / pnlData.total_revenue * 100).toFixed(1) : 0;
                            return (
                              <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5" data-testid={`revenue-outlet-row-${i}`}>
                                <TableCell>{r.outlet_name}</TableCell>
                                <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.revenue)}</TableCell>
                                <TableCell className="text-right text-[hsl(var(--muted-foreground))]">{pct}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Balance Sheet / Neraca ============ */}
        <TabsContent value="balance-sheet" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  <Wallet className="w-4 h-4" /> Neraca (Balance Sheet)
                  {balanceSheet && <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">as of {balanceSheet.as_of}</span>}
                </CardTitle>
                <JournalSourceBadge data={balanceSheet} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('balance-sheet', 'excel')} data-testid="bs-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceSheet && (
                <>
                  {balanceSheet.balance_check && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${balanceSheet.balance_check.is_balanced ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`} data-testid="bs-balance-check">
                      {balanceSheet.balance_check.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>Assets ({formatCurrency(balanceSheet.balance_check.assets)}) = Liabilities + Equity ({formatCurrency(balanceSheet.balance_check.liabilities_plus_equity)})</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Komposisi Balance Sheet</h4>
                      {bsComposition.length > 0 ? <CompositionDonut data={bsComposition} colors={['#06B6D4', '#F43F5E', '#8B5CF6']} /> : <p className="text-xs text-center py-8 text-[hsl(var(--muted-foreground))]">-</p>}
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Asset Composition (Treemap)</h4>
                      {bsTreemap.length > 0 ? <AssetTreemap data={bsTreemap} /> : <p className="text-xs text-center py-8 text-[hsl(var(--muted-foreground))]">-</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <BreakdownList title="Aktiva (Assets)" items={balanceSheet.assets.accounts} colorClass="text-emerald-400" totalLabel="Total Assets" total={balanceSheet.assets.total} onRowClick={openGL} testId="bs-assets" />
                    <BreakdownList title="Kewajiban (Liabilities)" items={balanceSheet.liabilities.accounts} colorClass="text-rose-400" totalLabel="Total Liabilities" total={balanceSheet.liabilities.total} onRowClick={openGL} testId="bs-liabilities" />
                    <div data-testid="bs-equity">
                      <BreakdownList title="Ekuitas (Equity)" items={balanceSheet.equity.accounts} colorClass="text-cyan-400" totalLabel={null} total={null} onRowClick={openGL} />
                      <div className="flex justify-between py-1.5 border-b border-[var(--glass-border)] text-xs italic">
                        <span className="text-[hsl(var(--muted-foreground))]">Retained (current period)</span>
                        <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.equity.retained_earnings_current_period)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-semibold text-sm">
                        <span>Total Equity</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.equity.total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Perubahan Ekuitas ============ */}
        <TabsContent value="equity" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  <GitBranch className="w-4 h-4" /> Laporan Perubahan Ekuitas
                </CardTitle>
                <JournalSourceBadge data={equityChanges?.period} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {equityChanges && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="equity-beginning-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Saldo Awal</span>
                      <p className="text-lg font-semibold mt-1 text-cyan-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(equityChanges.beginning.total_equity)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="equity-change-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Perubahan Periode</span>
                      <p className={`text-lg font-semibold mt-1 ${equityChanges.net_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(equityChanges.net_change)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="equity-ending-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Saldo Akhir</span>
                      <p className="text-lg font-semibold mt-1 text-violet-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(equityChanges.ending_equity)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                    <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Bridge: Saldo Awal → Saldo Akhir</h4>
                    <WaterfallChart rows={equityChanges.rows} height={340} />
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equityChanges.rows.map((r, i) => (
                        <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5 text-sm" data-testid={`equity-row-${i}`}>
                          <TableCell>
                            <span className={`${r.type === 'summary' || r.type === 'end' ? 'font-semibold' : ''}`}>{r.label}</span>
                            {r.type === 'add' && <Badge variant="outline" className="ml-2 text-[9px] border-emerald-500/40 text-emerald-400">+</Badge>}
                            {r.type === 'sub' && <Badge variant="outline" className="ml-2 text-[9px] border-rose-500/40 text-rose-400">−</Badge>}
                          </TableCell>
                          <TableCell className={`text-right ${r.amount < 0 ? 'text-rose-400' : r.type === 'start' || r.type === 'end' ? 'text-cyan-400 font-semibold' : r.type === 'summary' ? 'text-violet-400 font-semibold' : 'text-emerald-400'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Cashflow / Arus Kas ============ */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}><ArrowDownUp className="w-4 h-4" /> Laporan Arus Kas</CardTitle>
                <JournalSourceBadge data={cashflowData} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('cashflow', 'excel')} data-testid="cashflow-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('cashflow', 'pdf')} data-testid="cashflow-export-pdf-button"><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cashflowData && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-inflow-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Inflow</span>
                      <p className="text-lg font-semibold mt-1 text-emerald-400">{formatCurrency(cashflowData.total_inflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-outflow-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Outflow</span>
                      <p className="text-lg font-semibold mt-1 text-rose-400">{formatCurrency(cashflowData.total_outflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-net-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net</span>
                      <p className={`text-lg font-semibold mt-1 ${cashflowData.net_cashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(cashflowData.net_cashflow)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {['operating', 'financing', 'investing'].map(cat => (
                      <div key={cat} className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                        <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{cat}</span>
                        <p className="text-sm font-semibold mt-1">{formatCurrency(cashflowData.by_category?.[cat])}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Daily Inflow / Outflow</h4>
                      <CashflowArea data={cashflowData.daily_cashflow?.slice(-60) || []} />
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Cashflow by Category</h4>
                      {cashflowDonut.length > 0 ? <CompositionDonut data={cashflowDonut} colors={['#10B981', '#8B5CF6', '#F59E0B']} /> : <p className="text-xs text-center py-8 text-[hsl(var(--muted-foreground))]">-</p>}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                    <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Running Cash Balance</h4>
                    <RunningBalance data={cashflowData.daily_cashflow || []} startingBalance={0} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <BreakdownList title="Sumber Inflow (Top)" items={(cashflowData.inflow_breakdown || []).slice(0, 10).map(x => ({ ...x, balance: x.amount }))} colorClass="text-emerald-400" testId="cashflow-inflow-breakdown" />
                    <BreakdownList title="Penggunaan Outflow (Top)" items={(cashflowData.outflow_breakdown || []).slice(0, 10).map(x => ({ ...x, balance: x.amount }))} colorClass="text-rose-400" testId="cashflow-outflow-breakdown" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Trial Balance ============ */}
        <TabsContent value="trial-balance" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}><BookOpen className="w-4 h-4" /> Trial Balance</CardTitle>
                <JournalSourceBadge data={trialBalance} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('trial-balance', 'excel')} data-testid="tb-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {trialBalance && (
                <>
                  <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg text-xs border ${trialBalance.is_balanced ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`} data-testid="tb-balance-status">
                    {trialBalance.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>Debit: {formatCurrency(trialBalance.total_debit)} | Credit: {formatCurrency(trialBalance.total_credit)} {trialBalance.is_balanced && '— Balanced ✓'}</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.rows?.map((r, i) => (
                        <TableRow
                          key={i}
                          className="border-[var(--glass-border)] hover:bg-white/5 cursor-pointer"
                          onClick={() => openGL(r.account_id, `${r.account_code} ${r.account_name}`)}
                          data-testid={`tb-row-${i}`}
                        >
                          <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                          <TableCell>{r.account_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.account_type}</Badge></TableCell>
                          <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.debit)}</TableCell>
                          <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.credit)}</TableCell>
                          <TableCell className="text-right font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ Inventory Valuation ============ */}
        <TabsContent value="inv-valuation" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Inventory Valuation</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('inventory-valuation', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {invValuation && (
                <>
                  <div className="p-4 mb-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] inline-block">
                    <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Valuation</span>
                    <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(invValuation.total_value)}</p>
                  </div>
                  <Table>
                    <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                      <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Outlet</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost/Unit</TableHead><TableHead className="text-right">Value</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {invValuation.items?.slice(0, 50).map((item, i) => (
                        <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                          <TableCell className="text-[hsl(var(--muted-foreground))]">{item.outlet_name || '-'}</TableCell>
                          <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{item.quantity?.toFixed(1)}</TableCell>
                          <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.cost_per_unit)}</TableCell>
                          <TableCell className="text-right font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Journal Coverage dialog */}
      <Dialog open={backfillOpen} onOpenChange={setBackfillOpen}>
        <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-xl" data-testid="backfill-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Journal Coverage &amp; Backfill</DialogTitle>
            <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
              Status jurnal yang sudah diposting per kategori transaksi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Laporan keuangan dihitung dari <b>posted journals</b> sebagai single source of truth. Jalankan backfill untuk men-generate jurnal dari data operasional historis.
            </p>
            {coverage && (
              <div className="space-y-2">
                {[{ key: 'sales_summary', label: 'Sales Summaries' }, { key: 'petty_cash', label: 'Petty Cash' }, { key: 'cash_movement', label: 'Cash Movements' }].map(({ key, label }) => {
                  const c = coverage[key];
                  const covered = c?.coverage_pct ?? 0;
                  const complete = covered >= 100;
                  return (
                    <div key={key} className="p-2 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-between" data-testid={`coverage-${key}`}>
                      <div>
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{c?.posted_journals ?? 0} / {c?.total_ops ?? 0} journals posted</p>
                      </div>
                      <Badge variant={complete ? 'default' : 'outline'} className={complete ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-amber-500/30 text-amber-400'}>{covered}%</Badge>
                    </div>
                  );
                })}
                <div className="p-2 rounded border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 flex items-center justify-between">
                  <span>Total posted journals</span><span className="font-semibold">{coverage.total_journals_posted ?? 0}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBackfillOpen(false)} data-testid="backfill-close-button">Tutup</Button>
            <Button size="sm" className="gap-1.5" disabled={backfilling} onClick={runBackfill} data-testid="backfill-run-button">
              <Database className="w-3.5 h-3.5" />{backfilling ? 'Processing...' : 'Run Backfill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Ledger Drill-down */}
      <GeneralLedgerModal
        open={glOpen}
        onClose={() => setGlOpen(false)}
        accountId={glAccount?.id}
        accountLabel={glAccount?.label}
        outletId={currentOutlet || ''}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </div>
  );
}

// ============================================================================
// Reusable sub-components
// ============================================================================
// eslint-disable-next-line react/prop-types
function BreakdownList({ title, items = [], colorClass = '', totalLabel, total, onRowClick, testId }) {
  return (
    <div data-testid={testId}>
      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">{title}</h4>
      <div className="space-y-1.5">
        {(!items || items.length === 0) && <p className="text-xs text-[hsl(var(--muted-foreground))] py-2">-</p>}
        {items?.map((r, i) => (
          <div
            key={i}
            className={`flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs ${onRowClick && r.account_id ? 'cursor-pointer hover:border-cyan-500/30 transition-colors' : ''}`}
            onClick={() => (onRowClick && r.account_id ? onRowClick(r.account_id, `${r.account_code} ${r.account_name}`) : null)}
          >
            <span className="truncate pr-2">{r.account_code} {r.account_name}</span>
            <span className={`font-medium ${colorClass}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{`Rp ${(Number(r.balance) || 0).toLocaleString('id-ID')}`}</span>
          </div>
        ))}
        {totalLabel && total !== null && total !== undefined && (
          <div className="flex justify-between py-2 px-2 font-semibold text-sm border-t border-[var(--glass-border)] mt-1">
            <span>{totalLabel}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{`Rp ${(Number(total) || 0).toLocaleString('id-ID')}`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
