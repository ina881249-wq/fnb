import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Clock, ChefHat, CheckCircle2, PackageCheck, ArrowRight, RefreshCw, Utensils } from 'lucide-react';

const fmtTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const sinceMinutes = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 60000);
};

const COLUMNS = [
  { id: 'queued', label: 'Queued', labelId: 'Antri', icon: Clock, color: 'amber', next: 'preparing', nextLabel: 'Start', nextLabelId: 'Mulai' },
  { id: 'preparing', label: 'Preparing', labelId: 'Dibuat', icon: ChefHat, color: 'cyan', next: 'ready', nextLabel: 'Mark Ready', nextLabelId: 'Siap' },
  { id: 'ready', label: 'Ready', labelId: 'Siap Sajikan', icon: CheckCircle2, color: 'emerald', next: 'served', nextLabel: 'Mark Served', nextLabelId: 'Disajikan' },
  { id: 'served', label: 'Served', labelId: 'Disajikan', icon: PackageCheck, color: 'slate', next: null },
];

const colMap = {
  amber: { headerBg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', dot: 'bg-amber-400' },
  cyan: { headerBg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', dot: 'bg-cyan-400' },
  emerald: { headerBg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  slate: { headerBg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: 'text-slate-400', dot: 'bg-slate-400' },
};

export default function KitchenQueue() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [groups, setGroups] = useState({ queued: [], preparing: [], ready: [], served: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [includeServed, setIncludeServed] = useState(false);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const res = await api.get('/api/kitchen/queue', { params: { outlet_id: currentOutlet, include_served: includeServed } });
      setGroups(res.data.groups || {});
      setStats(res.data.stats || {});
    } catch (e) {
      toast.error(lang === 'id' ? 'Gagal memuat antrian' : 'Failed to load queue');
    } finally { setLoading(false); }
  }, [currentOutlet, includeServed, lang]);

  useEffect(() => { load(); }, [load]);
  // Auto refresh every 10s
  useEffect(() => {
    if (!currentOutlet) return;
    const h = setInterval(load, 10000);
    return () => clearInterval(h);
  }, [currentOutlet, load]);

  const moveTicket = async (order, newStatus) => {
    setUpdating(order.id);
    try {
      await api.post(`/api/kitchen/tickets/${order.id}/status`, { status: newStatus });
      const labelMap = { preparing: lang === 'id' ? 'sedang dibuat' : 'preparing', ready: lang === 'id' ? 'siap' : 'ready', served: lang === 'id' ? 'disajikan' : 'served' };
      toast.success(`${order.order_number} → ${labelMap[newStatus] || newStatus}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setUpdating(null); }
  };

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  const visibleColumns = includeServed ? COLUMNS : COLUMNS.filter(c => c.id !== 'served');

  return (
    <div className="space-y-4" data-testid="kitchen-queue-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {lang === 'id' ? 'Antrian Dapur' : 'Kitchen Queue'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Perbarui status tiket saat mulai dan selesai' : 'Update ticket status as you start and finish'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5 h-8" data-testid="kitchen-queue-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'id' ? 'Muat Ulang' : 'Refresh'}
          </Button>
          <Button size="sm" variant={includeServed ? 'default' : 'outline'} onClick={() => setIncludeServed(!includeServed)} className="h-8" data-testid="kitchen-queue-toggle-served">
            {includeServed ? (lang === 'id' ? 'Sembunyikan Served' : 'Hide Served') : (lang === 'id' ? 'Tampilkan Served' : 'Show Served')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const meta = colMap[col.color];
          const Icon = col.icon;
          const count = stats[col.id] || 0;
          return (
            <Card key={col.id} className={`${meta.border} border backdrop-blur-xl ${meta.headerBg}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))] font-medium tracking-wider">{lang === 'id' ? col.labelId : col.label}</div>
                    <div className="text-2xl font-semibold">{count}</div>
                  </div>
                  <Icon className={`w-5 h-5 ${meta.icon}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban */}
      <div className={`grid gap-3 ${includeServed ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        {visibleColumns.map(col => {
          const meta = colMap[col.color];
          const Icon = col.icon;
          const orders = groups[col.id] || [];
          return (
            <div key={col.id} className={`rounded-xl border ${meta.border} backdrop-blur-xl flex flex-col min-h-[60vh] bg-[var(--glass-bg)]`} data-testid={`kitchen-col-${col.id}`}>
              <div className={`flex items-center justify-between px-3 py-2 border-b ${meta.border} ${meta.headerBg} rounded-t-xl`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${meta.icon}`} />
                  <span className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? col.labelId : col.label}</span>
                  <Badge variant="outline" className="text-[10px] h-5 border-[var(--glass-border)]">{orders.length}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {orders.length === 0 && (
                  <div className="text-center py-10 text-xs text-[hsl(var(--muted-foreground))]">
                    {lang === 'id' ? 'Tidak ada tiket' : 'No tickets'}
                  </div>
                )}
                {orders.map(o => {
                  const age = sinceMinutes(o.paid_at);
                  const urgent = age !== null && age >= 15 && col.id !== 'served';
                  return (
                    <Card key={o.id} className={`bg-[var(--glass-bg-strong)] border ${urgent ? 'border-[hsl(var(--destructive))]/40' : 'border-[var(--glass-border)]'}`} data-testid={`kitchen-ticket-${o.id}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-mono text-xs font-semibold">{o.order_number}</div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {fmtTime(o.paid_at)}
                              {age !== null && (
                                <span className={urgent ? 'text-[hsl(var(--destructive))] font-semibold' : ''}>
                                  ({age}m {lang === 'id' ? 'lalu' : 'ago'})
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] h-5 px-1.5 capitalize border-[var(--glass-border)]">
                            {o.order_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {(o.table_number || o.customer_name) && (
                          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
                            <Utensils className="w-3 h-3" />
                            {o.table_number ? `${lang === 'id' ? 'Meja' : 'Table'} ${o.table_number}` : o.customer_name}
                          </div>
                        )}
                        <div className="space-y-0.5 mb-2 text-sm">
                          {o.lines?.map((l, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="truncate"><span className="font-semibold text-[hsl(var(--primary))] mr-1">{l.qty}×</span>{l.name}</span>
                            </div>
                          ))}
                        </div>
                        {o.notes && (
                          <div className="text-[11px] italic text-[hsl(var(--muted-foreground))] border-l-2 border-amber-500/40 pl-2 mb-2">"{o.notes}"</div>
                        )}
                        {col.next && (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs gap-1"
                            disabled={updating === o.id}
                            onClick={() => moveTicket(o, col.next)}
                            data-testid={`kitchen-ticket-${o.id}-next`}
                          >
                            {lang === 'id' ? col.nextLabelId : col.nextLabel} <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
