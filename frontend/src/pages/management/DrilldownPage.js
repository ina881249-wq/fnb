import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ChevronRight, ArrowLeft, DollarSign, Receipt, Package, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const formatCurrency = (val) => {
  if (!val) return 'Rp 0';
  if (Math.abs(val) >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)}B`;
  if (Math.abs(val) >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

const COLORS = ['#2DD4BF', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#22C55E', '#FB923C', '#F472B6'];
const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

export default function DrilldownPage() {
  const { outlets } = useAuth();
  const [activeReport, setActiveReport] = useState('revenue');
  const [breadcrumb, setBreadcrumb] = useState([{ label: 'Global', level: 'global', params: {} }]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentLevel = breadcrumb[breadcrumb.length - 1];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/drilldown/${activeReport}`, { params: { level: currentLevel.level, ...currentLevel.params } });
      setData(res.data);
    } catch (err) { toast.error('Failed to load drill-down data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeReport, breadcrumb]);

  const drillInto = (nextLevel, params, label) => {
    setBreadcrumb(prev => [...prev, { label, level: nextLevel, params }]);
  };

  const goBack = (index) => {
    setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const resetDrill = () => {
    setBreadcrumb([{ label: 'Global', level: 'global', params: {} }]);
  };

  const chartData = data?.data?.slice(0, 10).map((d, i) => ({
    name: d.city || d.outlet_name || d.category || d.date || d.item_name || `Item ${i}`,
    value: (d.total_sales || d.total || d.total_value || 0) / 1000000,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Drill-Down Reports</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Click rows to drill deeper into data</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <Tabs value={activeReport} onValueChange={(v) => { setActiveReport(v); resetDrill(); }}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="revenue" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> Expenses</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Inventory</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
            <Button
              variant="ghost" size="sm"
              className={`h-7 px-2 text-xs ${i === breadcrumb.length - 1 ? 'text-[hsl(var(--primary))] font-semibold' : 'text-[hsl(var(--muted-foreground))]'}`}
              onClick={() => goBack(i)}
            >
              {b.label}
            </Button>
          </React.Fragment>
        ))}
      </div>

      {/* Total KPI */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total ({currentLevel.label})</span>
            <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(data?.total)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{data?.data?.length || 0} items</Badge>
            <Badge variant="outline" className="text-xs text-[hsl(var(--primary))]">{currentLevel.level}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, '']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data Table (clickable rows for drill-down) */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                {activeReport === 'revenue' && currentLevel.level === 'global' && <><TableHead>City</TableHead><TableHead className="text-right">Outlets</TableHead><TableHead className="text-right">Total Sales</TableHead><TableHead className="text-right">Avg Daily</TableHead></>}
                {activeReport === 'revenue' && currentLevel.level === 'city' && <><TableHead>Outlet</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="text-right">Total Sales</TableHead><TableHead className="text-right">Avg Daily</TableHead></>}
                {activeReport === 'revenue' && currentLevel.level === 'outlet' && <><TableHead>Date</TableHead><TableHead className="text-right">Cash</TableHead><TableHead className="text-right">Card</TableHead><TableHead className="text-right">Online</TableHead><TableHead className="text-right">Total</TableHead></>}
                {activeReport === 'expenses' && currentLevel.level === 'global' && <><TableHead>Outlet</TableHead><TableHead className="text-right">Transactions</TableHead><TableHead>Top Category</TableHead><TableHead className="text-right">Total</TableHead></>}
                {activeReport === 'expenses' && currentLevel.level === 'outlet' && <><TableHead>Category</TableHead><TableHead className="text-right">Transactions</TableHead><TableHead className="text-right">Total</TableHead></>}
                {activeReport === 'expenses' && currentLevel.level === 'category' && <><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Receipt</TableHead><TableHead className="text-right">Amount</TableHead></>}
                {activeReport === 'inventory' && currentLevel.level === 'global' && <><TableHead>Outlet</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Low Stock</TableHead><TableHead className="text-right">Value</TableHead></>}
                {activeReport === 'inventory' && currentLevel.level === 'outlet' && <><TableHead>Category</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Value</TableHead></>}
                {activeReport === 'inventory' && currentLevel.level === 'category' && <><TableHead>Item</TableHead><TableHead>Level</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Value</TableHead></>}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!data?.data || data.data.length === 0) ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No data at this level</TableCell></TableRow>
              ) : data.data.map((row, i) => {
                let cells = null;
                let nextLevel = null;
                let nextParams = {};
                let nextLabel = '';
                let canDrill = false;

                if (activeReport === 'revenue') {
                  if (currentLevel.level === 'global') {
                    cells = <><TableCell className="font-medium">{row.city}</TableCell><TableCell className="text-right">{row.outlet_count}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_sales)}</TableCell><TableCell className="text-right text-[hsl(var(--muted-foreground))]">{formatCurrency(row.avg_daily)}</TableCell></>;
                    nextLevel = 'city'; nextParams = { city: row.city }; nextLabel = row.city; canDrill = true;
                  } else if (currentLevel.level === 'city') {
                    cells = <><TableCell className="font-medium">{row.outlet_name}</TableCell><TableCell className="text-right">{row.days}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_sales)}</TableCell><TableCell className="text-right text-[hsl(var(--muted-foreground))]">{formatCurrency(row.avg_daily)}</TableCell></>;
                    nextLevel = 'outlet'; nextParams = { outlet_id: row.outlet_id }; nextLabel = row.outlet_name; canDrill = true;
                  } else {
                    cells = <><TableCell className="font-medium">{row.date}</TableCell><TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.cash_sales)}</TableCell><TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.card_sales)}</TableCell><TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.online_sales)}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_sales)}</TableCell></>;
                  }
                } else if (activeReport === 'expenses') {
                  if (currentLevel.level === 'global') {
                    cells = <><TableCell className="font-medium">{row.outlet_name}</TableCell><TableCell className="text-right">{row.count}</TableCell><TableCell><Badge variant="outline" className="text-[9px]">{row.top_category}</Badge></TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total)}</TableCell></>;
                    nextLevel = 'outlet'; nextParams = { outlet_id: row.outlet_id }; nextLabel = row.outlet_name; canDrill = true;
                  } else if (currentLevel.level === 'outlet') {
                    cells = <><TableCell className="font-medium">{row.category}</TableCell><TableCell className="text-right">{row.count}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total)}</TableCell></>;
                    nextLevel = 'category'; nextParams = { ...currentLevel.params, category: row.category }; nextLabel = row.category; canDrill = true;
                  } else {
                    cells = <><TableCell>{row.date}</TableCell><TableCell>{row.description}</TableCell><TableCell className="text-[hsl(var(--muted-foreground))]">{row.receipt_ref || '-'}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.amount)}</TableCell></>;
                  }
                } else if (activeReport === 'inventory') {
                  if (currentLevel.level === 'global') {
                    cells = <><TableCell className="font-medium">{row.outlet_name}</TableCell><TableCell className="text-right">{row.item_count}</TableCell><TableCell className="text-right">{row.low_stock > 0 ? <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">{row.low_stock}</Badge> : '0'}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_value)}</TableCell></>;
                    nextLevel = 'outlet'; nextParams = { outlet_id: row.outlet_id }; nextLabel = row.outlet_name; canDrill = true;
                  } else if (currentLevel.level === 'outlet') {
                    cells = <><TableCell className="font-medium">{row.category}</TableCell><TableCell className="text-right">{row.item_count}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_value)}</TableCell></>;
                    nextLevel = 'category'; nextParams = { ...currentLevel.params, category: row.category }; nextLabel = row.category; canDrill = true;
                  } else {
                    cells = <><TableCell className="font-medium">{row.item_name}</TableCell><TableCell><Badge variant="outline" className="text-[9px]">{row.material_level}</Badge></TableCell><TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.total_quantity?.toFixed(1)}</TableCell><TableCell>{row.uom}</TableCell><TableCell className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.total_value)}</TableCell></>;
                  }
                }

                return (
                  <TableRow
                    key={i}
                    className={`border-[var(--glass-border)] ${canDrill ? 'cursor-pointer hover:bg-white/8' : 'hover:bg-white/5'}`}
                    onClick={() => canDrill && drillInto(nextLevel, nextParams, nextLabel)}
                  >
                    {cells}
                    <TableCell>{canDrill && <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
