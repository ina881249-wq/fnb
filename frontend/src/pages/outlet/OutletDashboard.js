import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DollarSign, TrendingUp, Receipt, Package, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const formatCurrency = (val) => {
  if (!val) return 'Rp 0';
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
  return `Rp ${val.toLocaleString('id-ID')}`;
};

export default function OutletDashboard() {
  const { currentOutlet, getOutletName } = useAuth();
  const navigate = useNavigate();
  const [cashPosition, setCashPosition] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOutlet) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cpRes, salesRes] = await Promise.all([
          api.get('/api/finance/cash-position', { params: { outlet_id: currentOutlet } }),
          api.get('/api/finance/sales-summaries', { params: { outlet_id: currentOutlet, limit: 7 } }),
        ]);
        setCashPosition(cpRes.data);
        setSalesData((salesRes.data.summaries || []).reverse());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentOutlet]);

  const quickActions = [
    { label: 'Cash Management', icon: DollarSign, to: '/outlet/cash', color: 'text-teal-400' },
    { label: 'Sales Summary', icon: FileText, to: '/outlet/sales', color: 'text-cyan-400' },
    { label: 'Petty Cash', icon: Receipt, to: '/outlet/petty-cash', color: 'text-amber-400' },
    { label: 'Inventory', icon: Package, to: '/outlet/inventory', color: 'text-purple-400' },
  ];

  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };
  const chartData = salesData.map(s => ({ date: s.date?.slice(5), sales: (s.total_sales || 0) / 1000000 }));

  if (!currentOutlet) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[hsl(var(--muted-foreground))]">Please select an outlet from the top bar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Outlet Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{getOutletName(currentOutlet)} - Today's overview</p>
      </div>

      {/* Today Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cash In</span>
              <p className="text-xl font-semibold mt-1 text-green-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.cash_in)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cash Out</span>
              <p className="text-xl font-semibold mt-1 text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.cash_out)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Net Cash</span>
              <p className={`text-xl font-semibold mt-1 ${(cashPosition?.net_cash || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.net_cash)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Today Sales</span>
              <p className="text-xl font-semibold mt-1 text-[hsl(var(--primary))]" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(cashPosition?.sales?.total_sales)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.to}
              className="bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer hover:-translate-y-0.5 hover:bg-[var(--glass-bg-strong)] transition-all duration-200"
              onClick={() => navigate(action.to)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sales Trend */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Sales Trend (7 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="outletSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#2DD4BF" fill="url(#outletSalesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Account Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cashPosition?.accounts?.map((acc, i) => (
          <Card key={i} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{acc.name}</span>
              <p className="text-lg font-semibold mt-1" style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(acc.current_balance)}
              </p>
              <Badge variant="outline" className="text-[9px] mt-1">{acc.type?.replace('_', ' ')}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
