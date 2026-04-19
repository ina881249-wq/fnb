import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Package, ArrowLeftRight, Settings, ClipboardCheck, TrendingUp } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function WarehouseDashboard() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!currentOutlet) return;
    const fetch = async () => {
      try {
        const res = await api.get('/api/warehouse/dashboard', { params: { outlet_id: currentOutlet } });
        setData(res.data);
      } catch (e) { /* ignore */ }
    };
    fetch();
    const h = setInterval(fetch, 20000);
    return () => clearInterval(h);
  }, [currentOutlet]);

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  const kpis = [
    { label: lang === 'id' ? 'Penerimaan 7 hari' : 'Receipts (7d)', value: data?.receipts_week || 0, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    { label: lang === 'id' ? 'Nilai Penerimaan' : 'Receipts Value', value: fmtIDR(data?.receipts_value_week), icon: TrendingUp, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30' },
    { label: lang === 'id' ? 'Transfer Keluar (transit)' : 'Out Transfers (in-transit)', value: data?.transfers_in_transit_out || 0, icon: ArrowLeftRight, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: lang === 'id' ? 'Transfer Masuk (transit)' : 'In Transfers (in-transit)', value: data?.transfers_in_transit_in || 0, icon: ArrowLeftRight, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    { label: lang === 'id' ? 'Adjustment 7 hari' : 'Adjustments (7d)', value: data?.adjustments_week || 0, icon: Settings, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
    { label: lang === 'id' ? 'Stok Opname 7 hari' : 'Count Sessions (7d)', value: data?.count_sessions_week || 0, icon: ClipboardCheck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  ];

  return (
    <div className="space-y-6" data-testid="warehouse-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          {lang === 'id' ? 'Dasbor Warehouse' : 'Warehouse Dashboard'}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {lang === 'id' ? 'Ringkasan aktivitas gudang 7 hari terakhir' : 'Warehouse activity summary (7 days)'}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={`${k.bg} border backdrop-blur-xl`} data-testid={`wh-kpi-${k.label.toLowerCase().replace(/[\s\(\)]/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{k.label}</div>
                    <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
                  </div>
                  <Icon className={`w-5 h-5 ${k.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            {lang === 'id' ? 'Variance Stok Opname 7 hari' : 'Count Variance (7d)'}
          </h3>
          <div className="text-3xl font-bold text-amber-400">{Math.abs(data?.count_variance_week || 0).toFixed(2)}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Total selisih absolut dari semua sesi opname' : 'Total absolute variance across all count sessions'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
