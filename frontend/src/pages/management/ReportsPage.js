import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function ReportsPage() {
  const { currentOutlet, outlets } = useAuth();
  const [activeReport, setActiveReport] = useState('pnl');
  const [pnlData, setPnlData] = useState(null);
  const [cashflowData, setCashflowData] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [invValuation, setInvValuation] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (type) => {
    setLoading(true);
    try {
      const params = currentOutlet ? { outlet_id: currentOutlet } : {};
      if (type === 'pnl') {
        const res = await api.get('/api/reports/pnl', { params });
        setPnlData(res.data);
      } else if (type === 'cashflow') {
        const res = await api.get('/api/reports/cashflow', { params });
        setCashflowData(res.data);
      } else if (type === 'balance-sheet') {
        const res = await api.get('/api/reports/balance-sheet');
        setBalanceSheet(res.data);
      } else if (type === 'inv-valuation') {
        const res = await api.get('/api/reports/inventory-valuation', { params });
        setInvValuation(res.data);
      }
    } catch (err) { toast.error('Failed to load report'); }
    setLoading(false);
  };

  useEffect(() => { fetchReport(activeReport); }, [activeReport, currentOutlet]);

  const handleExport = async (reportType, format) => {
    try {
      const params = { format, outlet_id: currentOutlet || '' };
      const res = await api.get(`/api/reports/export/${reportType}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} exported`);
    } catch (err) { toast.error('Export failed'); }
  };

  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Reports</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Financial and inventory reports with export</p>
        </div>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="pnl">P&L</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="inv-valuation">Inventory Valuation</TabsTrigger>
        </TabsList>

        {/* P&L Report */}
        <TabsContent value="pnl" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Profit & Loss Statement</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('pnl', 'excel')} data-testid="report-export-excel-button"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('pnl', 'pdf')} data-testid="report-export-pdf-button"><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pnlData && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Revenue</span>
                      <p className="text-xl font-semibold mt-1 text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.total_revenue)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">COGS</span>
                      <p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.total_cogs)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net Profit</span>
                      <p className={`text-xl font-semibold mt-1 ${pnlData.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(pnlData.net_profit)}</p>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Margin: {pnlData.margin_percentage}%</span>
                    </div>
                  </div>
                  {pnlData.revenue_by_outlet?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>Revenue by Outlet</h4>
                      <Table>
                        <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                          <TableHead>Outlet</TableHead><TableHead className="text-right">Revenue</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {pnlData.revenue_by_outlet.map((r, i) => (
                            <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
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

        {/* Cashflow Report */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Cashflow Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('cashflow', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--glass-border)]" onClick={() => handleExport('cashflow', 'pdf')}><FileText className="w-3.5 h-3.5" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              {cashflowData && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Inflow</span>
                      <p className="text-lg font-semibold mt-1 text-green-400">{formatCurrency(cashflowData.total_inflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Outflow</span>
                      <p className="text-lg font-semibold mt-1 text-red-400">{formatCurrency(cashflowData.total_outflow)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net Cashflow</span>
                      <p className={`text-lg font-semibold mt-1 ${cashflowData.net_cashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(cashflowData.net_cashflow)}</p>
                    </div>
                  </div>
                  {cashflowData.daily_cashflow?.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cashflowData.daily_cashflow.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                        <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), '']} />
                        <Bar dataKey="inflow" fill="#22C55E" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="outflow" fill="#EF4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Balance Sheet</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => handleExport('balance-sheet', 'excel')}><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              {balanceSheet && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-green-400">Assets</h4>
                    {Object.entries(balanceSheet.assets).filter(([k]) => k !== 'total').map(([key, val]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-[var(--glass-border)]">
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        <span className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(val)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-semibold">
                      <span>Total Assets</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceSheet.assets.total)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-red-400">Liabilities</h4>
                    <div className="flex justify-between py-2 font-semibold">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(balanceSheet.liabilities.total)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-cyan-400">Equity</h4>
                    <div className="flex justify-between py-2 font-semibold">
                      <span>Total Equity</span>
                      <span>{formatCurrency(balanceSheet.equity.total)}</span>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}
