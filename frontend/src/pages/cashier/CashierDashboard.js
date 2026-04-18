import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { ShoppingCart, DollarSign, Clock, TrendingUp, AlertCircle, Play, Receipt } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function CashierDashboard() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOutlet) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/cashier/dashboard', { params: { outlet_id: currentOutlet } });
        setData(res.data);
      } finally { setLoading(false); }
    };
    fetch();
    const h = setInterval(fetch, 20000);
    return () => clearInterval(h);
  }, [currentOutlet]);

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]" data-testid="cashier-dashboard-no-outlet">
      {lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet first'}
    </div>;
  }

  const stats = [
    { label: lang === 'id' ? 'Penjualan Hari Ini' : "Today's Sales", value: fmtIDR(data?.today_sales), icon: DollarSign, color: 'text-emerald-400' },
    { label: lang === 'id' ? 'Jumlah Order' : 'Orders Today', value: data?.today_orders || 0, icon: ShoppingCart, color: 'text-cyan-400' },
    { label: lang === 'id' ? 'Order Terbuka' : 'Open Orders', value: data?.open_orders || 0, icon: Receipt, color: 'text-amber-400' },
    { label: lang === 'id' ? 'Status Shift' : 'Shift Status', value: data?.current_shift ? (lang === 'id' ? 'Terbuka' : 'Open') : (lang === 'id' ? 'Tutup' : 'Closed'), icon: Clock, color: data?.current_shift ? 'text-emerald-400' : 'text-amber-400' },
  ];

  return (
    <div className="space-y-6" data-testid="cashier-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }} data-testid="cashier-dashboard-title">
          {lang === 'id' ? 'Dasbor Kasir' : 'Cashier Dashboard'}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {lang === 'id' ? 'Ringkasan aktivitas hari ini' : "Today's cashier activity"}
        </p>
      </div>

      {/* Shift alert */}
      {!data?.current_shift && !loading && (
        <Card className="bg-amber-500/10 border-amber-500/30" data-testid="cashier-shift-alert">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold text-sm">{lang === 'id' ? 'Shift belum dibuka' : 'No open shift'}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Buka shift untuk mulai bertransaksi' : 'Open a shift to start transacting'}</div>
              </div>
            </div>
            <Button onClick={() => navigate('/cashier/shift')} className="gap-2" data-testid="cashier-open-shift-cta">
              <Play className="w-4 h-4" /> {lang === 'id' ? 'Buka Shift' : 'Open Shift'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl" data-testid={`cashier-kpi-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{s.label}</div>
                    <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                  </div>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Shift */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Shift Aktif' : 'Active Shift'}</h3>
              <Button size="sm" variant="outline" onClick={() => navigate('/cashier/shift')} className="text-xs h-7" data-testid="cashier-goto-shift">
                {lang === 'id' ? 'Kelola' : 'Manage'}
              </Button>
            </div>
            {data?.current_shift ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Shift #</span><span className="font-mono">{data.current_shift.shift_number}</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Kas Pembuka' : 'Opening Cash'}</span><span>{fmtIDR(data.current_shift.opening_cash)}</span></div>
                <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Dibuka' : 'Opened'}</span><span className="text-xs">{new Date(data.current_shift.opened_at).toLocaleString('id-ID')}</span></div>
                <Badge variant="outline" className="mt-2 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">{lang === 'id' ? 'Terbuka' : 'Open'}</Badge>
              </div>
            ) : (
              <div className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">{lang === 'id' ? 'Belum ada shift aktif' : 'No active shift'}</div>
            )}
          </CardContent>
        </Card>

        {/* Top items */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? 'Menu Terlaris Hari Ini' : "Today's Top Items"}</h3>
              <TrendingUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            {data?.top_items?.length ? (
              <div className="space-y-2">
                {data.top_items.map((it, idx) => (
                  <div key={it.name} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--glass-border)] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[hsl(var(--muted-foreground))] text-xs">#{idx + 1}</span>
                      <span>{it.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">x{it.qty}</span>
                      <span className="font-medium">{fmtIDR(it.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">{lang === 'id' ? 'Belum ada penjualan' : 'No sales yet'}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
