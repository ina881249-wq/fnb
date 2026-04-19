import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Clock, ChefHat, CheckCircle2, PackageCheck, ArrowRight, RefreshCw, Utensils, Maximize2, Minimize2 } from 'lucide-react';

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
const sinceMinutes = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 60000) : null;

const COLUMNS = [
  { id: 'queued', label: 'Queued', labelId: 'Antri', icon: Clock, color: 'amber', next: 'preparing', nextLabel: 'Start Prep', nextLabelId: 'Mulai Masak' },
  { id: 'preparing', label: 'Preparing', labelId: 'Sedang Dibuat', icon: ChefHat, color: 'cyan', next: 'ready', nextLabel: 'Mark Ready', nextLabelId: 'Tandai Siap' },
  { id: 'ready', label: 'Ready', labelId: 'Siap Sajikan', icon: CheckCircle2, color: 'emerald', next: 'served', nextLabel: 'Served', nextLabelId: 'Disajikan' },
  { id: 'served', label: 'Served', labelId: 'Disajikan', icon: PackageCheck, color: 'slate', next: null },
];

const colMap = {
  amber: { headerBg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', button: 'bg-amber-500 hover:bg-amber-500/90 text-white' },
  cyan: { headerBg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', button: 'bg-cyan-500 hover:bg-cyan-500/90 text-white' },
  emerald: { headerBg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-500/90 text-white' },
  slate: { headerBg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: 'text-slate-400', button: 'bg-slate-500 hover:bg-slate-500/90 text-white' },
};

export default function KitchenQueue() {
  const { currentOutlet } = useAuth();
  const { lang } = useLang();
  const [groups, setGroups] = useState({ queued: [], preparing: [], ready: [], served: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [includeServed, setIncludeServed] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const rootRef = useRef(null);

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
  useEffect(() => {
    if (!currentOutlet) return;
    const h = setInterval(load, 10000);
    return () => clearInterval(h);
  }, [currentOutlet, load]);

  // Toggle native fullscreen if available
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (rootRef.current?.requestFullscreen) await rootRef.current.requestFullscreen();
        setFullScreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        setFullScreen(false);
      }
    } catch (e) { setFullScreen(!fullScreen); }
  };

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

  if (!currentOutlet) return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;

  const visibleColumns = includeServed ? COLUMNS : COLUMNS.filter(c => c.id !== 'served');

  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-50 bg-[hsl(var(--background))] overflow-auto p-4' : ''} space-y-3 sm:space-y-4`} ref={rootRef} data-testid="kitchen-queue-page">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            {lang === 'id' ? 'Antrian Dapur' : 'Kitchen Queue'}
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] hidden sm:block">
            {lang === 'id' ? 'Tap tombol untuk pindah status' : 'Tap button to advance ticket status'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5 h-10 min-w-[44px]" data-testid="kitchen-queue-refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lang === 'id' ? 'Refresh' : 'Refresh'}</span>
          </Button>
          <Button size="sm" variant={includeServed ? 'default' : 'outline'} onClick={() => setIncludeServed(!includeServed)} className="h-10 text-xs" data-testid="kitchen-queue-toggle-served">
            {includeServed ? (lang === 'id' ? 'Sembunyikan Served' : 'Hide Served') : (lang === 'id' ? 'Tampilkan Served' : 'Show Served')}
          </Button>
          <Button size="sm" variant="outline" onClick={toggleFullScreen} className="h-10 w-10 p-0" data-testid="kitchen-queue-fullscreen" title={fullScreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Stats strip (compact on mobile) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {COLUMNS.map(col => {
          const meta = colMap[col.color];
          const Icon = col.icon;
          const count = stats[col.id] || 0;
          return (
            <Card key={col.id} className={`${meta.border} border backdrop-blur-xl ${meta.headerBg}`}>
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase text-[hsl(var(--muted-foreground))] font-medium tracking-wider">{lang === 'id' ? col.labelId : col.label}</div>
                    <div className="text-xl sm:text-2xl font-semibold leading-tight">{count}</div>
                  </div>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${meta.icon}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban — horizontal scroll-snap on mobile, grid on tablet+ */}
      <div className={`
        flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4
        md:grid md:gap-3 md:mx-0 md:px-0 md:overflow-visible
        ${includeServed ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}
      `}>
        {visibleColumns.map(col => {
          const meta = colMap[col.color];
          const Icon = col.icon;
          const orders = groups[col.id] || [];
          return (
            <div
              key={col.id}
              className={`snap-start shrink-0 w-[85vw] max-w-[420px] md:w-auto md:max-w-none rounded-xl border ${meta.border} backdrop-blur-xl flex flex-col min-h-[60vh] bg-[var(--glass-bg)]`}
              data-testid={`kitchen-col-${col.id}`}
            >
              <div className={`flex items-center justify-between px-3 py-2.5 border-b ${meta.border} ${meta.headerBg} rounded-t-xl sticky top-0 z-10`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${meta.icon}`} />
                  <span className="font-semibold text-base" style={{ fontFamily: 'Space Grotesk' }}>{lang === 'id' ? col.labelId : col.label}</span>
                  <Badge variant="outline" className="text-xs h-6 px-2 border-[var(--glass-border)]">{orders.length}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {orders.length === 0 && (
                  <div className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">
                    {lang === 'id' ? 'Tidak ada tiket' : 'No tickets'}
                  </div>
                )}
                {orders.map(o => {
                  const age = sinceMinutes(o.paid_at);
                  const urgent = age !== null && age >= 15 && col.id !== 'served';
                  const critical = age !== null && age >= 25 && col.id !== 'served';
                  return (
                    <Card key={o.id} className={`bg-[var(--glass-bg-strong)] border-2 ${critical ? 'border-[hsl(var(--destructive))]/60 animate-pulse' : urgent ? 'border-[hsl(var(--destructive))]/40' : 'border-[var(--glass-border)]'}`} data-testid={`kitchen-ticket-${o.id}`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-mono text-base font-bold">{o.order_number}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {fmtTime(o.paid_at)}
                              {age !== null && (
                                <span className={`font-semibold ${critical ? 'text-[hsl(var(--destructive))]' : urgent ? 'text-amber-400' : ''}`}>
                                  {age}m {lang === 'id' ? 'lalu' : 'ago'}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize border-[var(--glass-border)]">
                            {o.order_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {(o.table_number || o.customer_name) && (
                          <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                            {o.table_number ? `${lang === 'id' ? 'Meja' : 'Table'} ${o.table_number}` : o.customer_name}
                          </div>
                        )}
                        <div className="space-y-1 mb-3">
                          {o.lines?.map((l, i) => (
                            <div key={i} className="flex justify-between items-start text-base leading-tight">
                              <span className="flex-1">
                                <span className="font-bold text-[hsl(var(--primary))] text-lg mr-2">{l.qty}×</span>
                                {l.name}
                              </span>
                            </div>
                          ))}
                        </div>
                        {o.notes && (
                          <div className="text-sm italic text-amber-300 border-l-4 border-amber-500/60 pl-2 mb-3 bg-amber-500/5 py-1.5 rounded">
                            “{o.notes}”
                          </div>
                        )}
                        {col.next && (
                          <Button
                            size="lg"
                            className={`w-full h-14 text-base font-semibold gap-2 ${meta.button}`}
                            disabled={updating === o.id}
                            onClick={() => moveTicket(o, col.next)}
                            data-testid={`kitchen-ticket-${o.id}-next`}
                          >
                            {updating === o.id ? '...' : (
                              <>{lang === 'id' ? col.nextLabelId : col.nextLabel} <ArrowRight className="w-5 h-5" /></>
                            )}
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
