import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import api from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ClipboardList, Clock, CheckCircle2, Trash2, ChefHat, TrendingUp, AlertTriangle } from 'lucide-react';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function KitchenDashboard() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!currentOutlet) return;
    const fetch = async () => {
      try {
        const res = await api.get('/api/kitchen/dashboard', { params: { outlet_id: currentOutlet } });
        setData(res.data);
      } catch (e) { /* ignore */ }
    };
    fetch();
    const h = setInterval(fetch, 15000);
    return () => clearInterval(h);
  }, [currentOutlet]);

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]" data-testid="kitchen-dashboard-no-outlet">
      {lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet first'}
    </div>;
  }

  const kpis = [
    { label: lang === 'id' ? 'Tiket Antri' : 'Queued', value: data?.queued || 0, icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    { label: lang === 'id' ? 'Sedang Dibuat' : 'Preparing', value: data?.preparing || 0, icon: ChefHat, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    { label: lang === 'id' ? 'Siap Disajikan' : 'Ready', value: data?.ready || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    { label: lang === 'id' ? 'Rata-rata Prep' : 'Avg Prep', value: `${data?.avg_prep_minutes || 0}m`, icon: Clock, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30' },
  ];

  return (
    <div className="space-y-6" data-testid="kitchen-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          {lang === 'id' ? 'Dasbor Dapur' : 'Kitchen Dashboard'}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {lang === 'id' ? 'Ringkasan aktivitas dapur hari ini' : "Today's kitchen activity"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={`${k.bg} border backdrop-blur-xl`} data-testid={`kitchen-kpi-${k.label.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{k.label}</div>
                    <div className="text-3xl font-semibold tracking-tight">{k.value}</div>
                  </div>
                  <Icon className={`w-5 h-5 ${k.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(data?.queued > 0 || data?.preparing > 0) && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold text-sm">
                  {lang === 'id' ? `${data.queued + data.preparing} tiket aktif perlu perhatian` : `${data.queued + data.preparing} active tickets`}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'id' ? 'Buka Antrian untuk memulai prep' : 'Open queue to begin prep'}
                </div>
              </div>
            </div>
            <Button onClick={() => navigate('/kitchen/queue')} data-testid="kitchen-goto-queue">
              {lang === 'id' ? 'Buka Antrian' : 'Open Queue'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily summary */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-3" style={{ fontFamily: 'Space Grotesk' }}>
              {lang === 'id' ? 'Ringkasan Hari Ini' : "Today's Summary"}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-[var(--glass-border)]">
                <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Total Order Dibayar' : 'Total Paid Orders'}</span>
                <span className="font-semibold">{data?.paid_today || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--glass-border)]">
                <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Selesai Disajikan' : 'Served'}</span>
                <span className="font-semibold text-emerald-400">{data?.served || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--glass-border)]">
                <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Log Waste' : 'Waste Logs'}</span>
                <span className="font-semibold">{data?.waste_today_count || 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Biaya Waste' : 'Waste Cost'}</span>
                <span className="font-semibold text-[hsl(var(--destructive))]">{fmtIDR(data?.waste_today_cost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waste categories */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                {lang === 'id' ? 'Kategori Waste (7 hari)' : 'Waste Categories (7d)'}
              </h3>
              <TrendingUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            {data?.waste_categories_7d?.length ? (
              <div className="space-y-2">
                {data.waste_categories_7d.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--glass-border)] last:border-0">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-[hsl(var(--destructive))]/60" />
                      <span className="capitalize">{c.category}</span>
                      <Badge variant="outline" className="text-[10px] h-5 border-[var(--glass-border)]">{c.count}x</Badge>
                    </div>
                    <span className="font-medium">{fmtIDR(c.cost)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">
                {lang === 'id' ? 'Tidak ada waste dalam 7 hari' : 'No waste in last 7 days'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
