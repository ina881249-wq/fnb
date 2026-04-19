import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { FileSpreadsheet, FileText, Database, BookOpen, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(Number(val) || 0).toLocaleString('id-ID')}`;

// Default: current month
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const { currentOutlet, user } = useAuth();
  const [activeReport, setActiveReport] = useState('pnl');
  const [pnlData, setPnlData] = useState(null);
  const [cashflowData, setCashflowData] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [invValuation, setInvValuation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(today());

  const [backfillOpen, setBackfillOpen] = useState(false);
  const [coverage, setCoverage] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  const isSuperadmin = user?.is_superadmin === true;

  const fetchReport = async (type) => {
    setLoading(true);
    try {
      const params = {
        outlet_id: currentOutlet || '',
        period_start: periodStart,
        period_end: periodEnd,
      };
      if (type === 'pnl') {
        const res = await api.get('/api/reports/pnl', { params });
        setPnlData(res.data);
      } else if (type === 'cashflow') {
        const res = await api.get('/api/reports/cashflow', { params });
        setCashflowData(res.data);
      } else if (type === 'balance-sheet') {
        const res = await api.get('/api/reports/balance-sheet', { params: { as_of: periodEnd, outlet_id: currentOutlet || '' } });
        setBalanceSheet(res.data);
      } else if (type === 'trial-balance') {
        const res = await api.get('/api/reports/trial-balance', { params });
        setTrialBalance(res.data);
      } else if (type === 'inv-valuation') {
        const res = await api.get('/api/reports/inventory-valuation', { params: { outlet_id: currentOutlet || '' } });
        setInvValuation(res.data);
      }
    } catch {
      toast.error('Gagal memuat laporan');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReport(activeReport); /* eslint-disable-next-line */ }, [activeReport, currentOutlet, periodStart, periodEnd]);

  const fetchCoverage = async () => {
    try {
      const res = await api.get('/api/admin/journals/coverage');
      setCoverage(res.data);
    } catch {
      toast.error('Gagal cek coverage journal');
    }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await api.post('/api/admin/journals/backfill', { date_from: '', date_to: '' });
      toast.success(`Backfill selesai: ${res.data.report.sales_summary.posted + res.data.report.petty_cash.posted + res.data.report.cash_movement.posted} jurnal baru`);
      await fetchCoverage();
      await fetchReport(activeReport);
    } catch {
      toast.error('Backfill gagal');
    }
    setBackfilling(false);
  };

  const handleExport = async (reportType, format) => {
    try {
      const params = {
        format,
        outlet_id: currentOutlet || '',
        period_start: periodStart,
        period_end: periodEnd,
      };
      const res = await api.get(`/api/reports/export/${reportType}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} exported`);
    } catch {
      toast.error('Export failed');
    }
  };

  const chartTooltipStyle = {
    contentStyle: {
      background: 'var(--glass-bg-strong, rgba(20,25,35,0.95))',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
      fontSize: '12px',
    },
  };

  const JournalSourceBadge = ({ data }) => {
    if (!data) return null;
    const journalCount = data.journal_count ?? 0;
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5 text-[10px] border-cyan-500/40 text-cyan-400 bg-cyan-500/10" data-testid="journal-source-badge">
          <Database className="w-3 h-3" />
          Journal-driven
        </Badge>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]" data-testid="journal-count">
          {journalCount} journals
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Reports</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Journal-driven financial reports &mdash; single source of truth
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Dari</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="h-8 w-36 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)]"
              data-testid="report-period-start"
            />
            <Label className="text-xs text-[hsl(var(--muted-foreground))]">Sampai</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="h-8 w-36 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)]"
              data-testid="report-period-end"
            />
          </div>
          {isSuperadmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-[var(--glass-border)]"
              onClick={() => { setBackfillOpen(true); fetchCoverage(); }}
              data-testid="open-backfill-dialog-button"
            >
              <Settings className="w-3.5 h-3.5" />
              Journal Coverage
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)] flex-wrap h-auto">
          <TabsTrigger value="pnl" data-testid="tab-pnl">P&L</TabsTrigger>
          <TabsTrigger value="cashflow" data-testid="tab-cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="trial-balance" data-testid="tab-trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="inv-valuation" data-testid="tab-inv-valuation">Inventory Valuation</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pnl" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Profit &amp; Loss Statement</CardTitle>
                <JournalSourceBadge data={pnlData} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('pnl', 'excel')} data-testid="report-export-excel-button">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('pnl', 'pdf')} data-testid="report-export-pdf-button">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading...</p>}
              {pnlData && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="pnl-revenue-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Revenue</span>
                      <p className="text-lg font-semibold mt-1 text-emerald-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.total_revenue)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="pnl-cogs-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">COGS</span>
                      <p className="text-lg font-semibold mt-1 text-orange-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.total_cogs)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="pnl-expenses-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Expenses</span>
                      <p className="text-lg font-semibold mt-1 text-rose-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.total_expenses)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="pnl-net-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net Profit</span>
                      <p className={`text-lg font-semibold mt-1 ${pnlData.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.net_profit)}</p>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Margin: {pnlData.margin_percentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Revenue Breakdown */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Revenue Breakdown</h4>
                      <div className="space-y-1.5" data-testid="pnl-revenue-breakdown">
                        {pnlData.revenue_breakdown?.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">-</p>}
                        {pnlData.revenue_breakdown?.map((r, i) => (
                          <div key={i} className="flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs">
                            <span>{r.account_code} {r.account_name}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }} className="text-emerald-400">{formatCurrency(r.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* COGS Breakdown */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">COGS Breakdown</h4>
                      <div className="space-y-1.5" data-testid="pnl-cogs-breakdown">
                        {pnlData.cogs_breakdown?.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">Tidak ada COGS dari jurnal</p>}
                        {pnlData.cogs_breakdown?.map((r, i) => (
                          <div key={i} className="flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs">
                            <span>{r.account_code} {r.account_name}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }} className="text-orange-400">{formatCurrency(r.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Expense Breakdown */}
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Expense Breakdown</h4>
                      <div className="space-y-1.5" data-testid="pnl-expense-breakdown">
                        {pnlData.expense_breakdown?.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">-</p>}
                        {pnlData.expense_breakdown?.map((r, i) => (
                          <div key={i} className="flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs">
                            <span>{r.account_code} {r.account_name}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }} className="text-rose-400">{formatCurrency(r.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {pnlData.revenue_by_outlet?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Revenue by Outlet</h4>
                      <Table>
                        <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                          <TableHead>Outlet</TableHead><TableHead className="text-right">Revenue</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {pnlData.revenue_by_outlet.map((r, i) => (
                            <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5" data-testid={`revenue-outlet-row-${i}`}>
                              <TableCell>{r.outlet_name}</TableCell>
                              <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cashflow */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Cashflow Statement</CardTitle>
                <JournalSourceBadge data={cashflowData} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('cashflow', 'excel')} data-testid="cashflow-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('cashflow', 'pdf')} data-testid="cashflow-export-pdf-button"><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              {cashflowData && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-inflow-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Inflow</span>
                      <p className="text-lg font-semibold mt-1 text-emerald-400">{formatCurrency(cashflowData.total_inflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-outflow-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Outflow</span>
                      <p className="text-lg font-semibold mt-1 text-rose-400">{formatCurrency(cashflowData.total_outflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid="cashflow-net-card">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net Cashflow</span>
                      <p className={`text-lg font-semibold mt-1 ${cashflowData.net_cashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(cashflowData.net_cashflow)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Operating</span>
                      <p className="text-sm font-semibold mt-1">{formatCurrency(cashflowData.by_category?.operating)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Financing</span>
                      <p className="text-sm font-semibold mt-1">{formatCurrency(cashflowData.by_category?.financing)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Investing</span>
                      <p className="text-sm font-semibold mt-1">{formatCurrency(cashflowData.by_category?.investing)}</p>
                    </div>
                  </div>

                  {cashflowData.daily_cashflow?.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cashflowData.daily_cashflow.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                        <Bar dataKey="inflow" fill="#10B981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="outflow" fill="#F43F5E" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Inflow Sources (Top)</h4>
                      <div className="space-y-1.5" data-testid="cashflow-inflow-breakdown">
                        {cashflowData.inflow_breakdown?.slice(0, 8).map((r, i) => (
                          <div key={i} className="flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs">
                            <span>{r.account_code} {r.account_name}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }} className="text-emerald-400">{formatCurrency(r.amount)}</span>
                          </div>
                        )) || <p className="text-xs text-[hsl(var(--muted-foreground))]">-</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Outflow Categories (Top)</h4>
                      <div className="space-y-1.5" data-testid="cashflow-outflow-breakdown">
                        {cashflowData.outflow_breakdown?.slice(0, 8).map((r, i) => (
                          <div key={i} className="flex justify-between py-1.5 px-2 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs">
                            <span>{r.account_code} {r.account_name}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }} className="text-rose-400">{formatCurrency(r.amount)}</span>
                          </div>
                        )) || <p className="text-xs text-[hsl(var(--muted-foreground))]">-</p>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                  Balance Sheet {balanceSheet && <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">as of {balanceSheet.as_of}</span>}
                </CardTitle>
                <JournalSourceBadge data={balanceSheet} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('balance-sheet', 'excel')} data-testid="bs-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {balanceSheet && (
                <>
                  {balanceSheet.balance_check && (
                    <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg text-xs border ${balanceSheet.balance_check.is_balanced ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`} data-testid="bs-balance-check">
                      {balanceSheet.balance_check.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>
                        Assets ({formatCurrency(balanceSheet.balance_check.assets)}) = Liabilities + Equity ({formatCurrency(balanceSheet.balance_check.liabilities_plus_equity)})
                        {!balanceSheet.balance_check.is_balanced && <> &mdash; Diff: {formatCurrency(balanceSheet.balance_check.difference)}</>}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div data-testid="bs-assets">
                      <h4 className="text-sm font-semibold mb-2 text-emerald-400">Assets</h4>
                      {balanceSheet.assets.accounts?.map((a) => (
                        <div key={a.account_id} className="flex justify-between py-1.5 border-b border-[var(--glass-border)] text-xs">
                          <span className="text-[hsl(var(--muted-foreground))]">{a.account_code} {a.account_name}</span>
                          <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-semibold text-sm">
                        <span>Total Assets</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.assets.total)}</span>
                      </div>
                    </div>
                    <div data-testid="bs-liabilities">
                      <h4 className="text-sm font-semibold mb-2 text-rose-400">Liabilities</h4>
                      {balanceSheet.liabilities.accounts?.length > 0 ? balanceSheet.liabilities.accounts.map((a) => (
                        <div key={a.account_id} className="flex justify-between py-1.5 border-b border-[var(--glass-border)] text-xs">
                          <span className="text-[hsl(var(--muted-foreground))]">{a.account_code} {a.account_name}</span>
                          <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
                        </div>
                      )) : <p className="text-xs text-[hsl(var(--muted-foreground))]">-</p>}
                      <div className="flex justify-between py-2 font-semibold text-sm">
                        <span>Total Liabilities</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.liabilities.total)}</span>
                      </div>
                    </div>
                    <div data-testid="bs-equity">
                      <h4 className="text-sm font-semibold mb-2 text-cyan-400">Equity</h4>
                      {balanceSheet.equity.accounts?.map((a) => (
                        <div key={a.account_id} className="flex justify-between py-1.5 border-b border-[var(--glass-border)] text-xs">
                          <span className="text-[hsl(var(--muted-foreground))]">{a.account_code} {a.account_name}</span>
                          <span className="font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 border-b border-[var(--glass-border)] text-xs">
                        <span className="text-[hsl(var(--muted-foreground))] italic">Retained (current period)</span>
                        <span className="font-medium italic" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.equity.retained_earnings_current_period)}</span>
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

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  <BookOpen className="w-4 h-4" /> Trial Balance
                </CardTitle>
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
                    <span>
                      Debit: {formatCurrency(trialBalance.total_debit)} | Credit: {formatCurrency(trialBalance.total_credit)}
                      {!trialBalance.is_balanced && <> &mdash; Diff: {formatCurrency(trialBalance.difference)}</>}
                      {trialBalance.is_balanced && <> &mdash; Balanced ✓</>}
                    </span>
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
                        <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5" data-testid={`tb-row-${i}`}>
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

        {/* Inventory Valuation */}
        <TabsContent value="inv-valuation" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Inventory Valuation</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('inventory-valuation', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('inventory-valuation', 'pdf')}><FileText className="w-3.5 h-3.5" /> PDF</Button>
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

      {/* Backfill Dialog */}
      <Dialog open={backfillOpen} onOpenChange={setBackfillOpen}>
        <DialogContent className="bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl max-w-xl" data-testid="backfill-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Journal Coverage &amp; Backfill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Laporan keuangan menggunakan <b>posted journals</b> sebagai sumber kebenaran tunggal. Jika ada transaksi operasional historis yang belum memiliki jurnal (mis. data seeded), gunakan backfill.
            </p>
            {coverage && (
              <div className="space-y-2">
                {[
                  { key: 'sales_summary', label: 'Sales Summaries' },
                  { key: 'petty_cash', label: 'Petty Cash' },
                  { key: 'cash_movement', label: 'Cash Movements' },
                ].map(({ key, label }) => {
                  const c = coverage[key];
                  const covered = c?.coverage_pct ?? 0;
                  const complete = covered >= 100;
                  return (
                    <div key={key} className="p-2 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-between" data-testid={`coverage-${key}`}>
                      <div>
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{c?.posted_journals ?? 0} / {c?.total_ops ?? 0} journals posted</p>
                      </div>
                      <Badge variant={complete ? 'default' : 'outline'} className={complete ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-amber-500/30 text-amber-400'}>
                        {covered}%
                      </Badge>
                    </div>
                  );
                })}
                <div className="p-2 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs flex items-center justify-between">
                  <span>Warehouse + Kitchen journals</span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Receipts: {coverage.warehouse_receipt?.posted_journals ?? 0} |
                    Adj: {coverage.warehouse_adjustment?.posted_journals ?? 0} |
                    Waste: {coverage.kitchen_waste?.posted_journals ?? 0}
                  </span>
                </div>
                <div className="p-2 rounded border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 flex items-center justify-between">
                  <span>Total posted journals</span>
                  <span className="font-semibold">{coverage.total_journals_posted ?? 0}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBackfillOpen(false)} data-testid="backfill-close-button">Tutup</Button>
            <Button size="sm" className="gap-1.5" disabled={backfilling} onClick={runBackfill} data-testid="backfill-run-button">
              <Database className="w-3.5 h-3.5" />
              {backfilling ? 'Processing...' : 'Run Backfill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
