import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LangContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Sparkles, RefreshCw, Clock, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Lightweight markdown renderer (headings, bold, bullets) — no new deps
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      out.push(<ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1.5 my-2 text-[hsl(var(--foreground))]/90">
        {listBuffer.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}
      </ul>);
      listBuffer = [];
    }
  };
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[hsl(var(--foreground))] font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-[var(--glass-bg-strong)] text-xs">$1</code>');
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) {
      flushList();
      out.push(<h3 key={idx} className="text-base font-semibold mt-5 mb-2 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^##\s+/, '')) }} />);
    } else if (/^#\s+/.test(line)) {
      flushList();
      out.push(<h2 key={idx} className="text-lg font-semibold mt-6 mb-2" style={{ fontFamily: 'Space Grotesk' }} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^#\s+/, '')) }} />);
    } else if (/^[-*]\s+/.test(line)) {
      listBuffer.push(inline(line.replace(/^[-*]\s+/, '')));
    } else if (/^\d+\.\s+/.test(line)) {
      listBuffer.push(inline(line.replace(/^\d+\.\s+/, '')));
    } else if (line === '') {
      flushList();
      out.push(<div key={idx} className="h-2" />);
    } else {
      flushList();
      out.push(<p key={idx} className="text-sm leading-relaxed text-[hsl(var(--foreground))]/85" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  });
  flushList();
  return <div>{out}</div>;
}

export default function AIInsights() {
  const { lang } = useLang();
  const { outlets } = useAuth();
  const [outletId, setOutletId] = useState('all');
  const [periodDays, setPeriodDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const res = await api.post('/api/ai/insights', {
        outlet_id: outletId === 'all' ? null : outletId,
        period_days: periodDays,
        force_refresh: force,
      });
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || (lang === 'id' ? 'Gagal memuat AI insights' : 'Failed'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(false); /* initial fetch, prefer cached */ }, [outletId, periodDays]);

  const ctx = data?.context || {};
  const rev = ctx.revenue || {};

  return (
    <div className="space-y-5" data-testid="ai-insights-page">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <Sparkles className="w-6 h-6 text-[hsl(var(--primary))]" />
            {lang === 'id' ? 'AI Insights' : 'AI Insights'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Briefing eksekutif otomatis hasil analisa AI dari data bisnis Anda' : 'Auto-narrative executive briefing from AI analysis'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger className="h-9 w-[200px] bg-[var(--glass-bg)]" data-testid="ai-insights-outlet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua Outlet' : 'All Outlets'}</SelectItem>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(parseInt(v))}>
            <SelectTrigger className="h-9 w-[120px] bg-[var(--glass-bg)]" data-testid="ai-insights-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{lang === 'id' ? '7 hari' : '7 days'}</SelectItem>
              <SelectItem value="14">{lang === 'id' ? '14 hari' : '14 days'}</SelectItem>
              <SelectItem value="30">{lang === 'id' ? '30 hari' : '30 days'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading} className="h-9 gap-1.5" data-testid="ai-insights-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'id' ? 'Generate Ulang' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Metadata pill */}
      {data && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1.5 border-[var(--glass-border)]">
            <Clock className="w-3 h-3" />
            {new Date(data.generated_at).toLocaleString('id-ID')}
          </Badge>
          {data.cached && <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">{lang === 'id' ? 'Dari cache (hari ini)' : 'Cached (today)'}</Badge>}
          <Badge variant="outline" className="border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10">Claude Sonnet 4.5</Badge>
        </div>
      )}

      {/* KPI summary from context */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Total Revenue' : 'Total Revenue'}</div>
              <div className="text-lg font-semibold text-[hsl(var(--primary))] mt-1">{fmtIDR(rev.total)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Rata-rata Harian' : 'Avg Daily'}</div>
              <div className="text-lg font-semibold mt-1">{fmtIDR(rev.average_daily)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Variance Kas' : 'Cash Variance'}</div>
              <div className={`text-lg font-semibold mt-1 ${(ctx.cashier_variance?.total_variance || 0) < 0 ? 'text-[hsl(var(--destructive))]' : 'text-emerald-400'}`}>
                {fmtIDR(ctx.cashier_variance?.total_variance)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Alert Aktif' : 'Active Alerts'}</div>
              <div className="text-lg font-semibold mt-1 text-amber-400">{ctx.alerts?.active_total || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Narrative */}
      <Card className="bg-gradient-to-br from-[var(--glass-bg)] to-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          {loading && !data && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] py-10 justify-center">
              <Sparkles className="w-4 h-4 animate-pulse text-[hsl(var(--primary))]" />
              {lang === 'id' ? 'AI sedang menganalisa data Anda...' : 'AI is analyzing your data...'}
            </div>
          )}
          {data && (
            <div data-testid="ai-insights-narrative">
              {renderMarkdown(data.narrative)}
            </div>
          )}
          {!loading && !data && (
            <div className="text-center py-10">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground))] opacity-50" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Klik Generate Ulang untuk memulai analisa AI' : 'Click Regenerate to start AI analysis'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top outlets quick peek */}
      {ctx.sales_per_outlet?.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <TrendingUp className="w-4 h-4 text-[hsl(var(--primary))]" />
              {lang === 'id' ? 'Ranking Outlet (Data Mentah)' : 'Outlet Ranking (Raw Data)'}
            </h3>
            <div className="space-y-1.5">
              {ctx.sales_per_outlet.map((o, i) => (
                <div key={o.outlet_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--glass-bg-strong)] text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-xs text-[hsl(var(--muted-foreground))]">#{i + 1}</span>
                    <span className="font-medium">{o.outlet_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">avg/day {fmtIDR(o.avg_daily)}</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">{fmtIDR(o.total_sales)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
