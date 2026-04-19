import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Wand2, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const typeIcons = {
  revenue_spike: TrendingUp,
  revenue_drop: TrendingDown,
  waste_spike: Trash2,
  cash_variance: DollarSign,
};

const sevStyle = (s) => {
  if (s === 'high') return 'border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10';
  if (s === 'medium') return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
  return 'border-[var(--glass-border)] text-[hsl(var(--muted-foreground))]';
};

function renderInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[hsl(var(--foreground))]">$1</strong>');
}
function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (/^##\s+/.test(line)) return <h3 key={i} className="text-base font-semibold mt-4 mb-2 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }} dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^##\s+/, '')) }} />;
    if (/^[-*]\s+/.test(line)) return <li key={i} className="ml-5 text-sm list-disc text-[hsl(var(--foreground))]/85" dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^[-*]\s+/, '')) }} />;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed text-[hsl(var(--foreground))]/85" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
  });
}

export default function AIAnomalies() {
  const { lang } = useLang();
  const { outlets } = useAuth();
  const [outletId, setOutletId] = useState('all');
  const [lookback, setLookback] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { lookback_days: lookback };
      if (outletId !== 'all') params.outlet_id = outletId;
      const res = await api.post('/api/ai/anomalies', null, { params });
      setData(res.data);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [outletId, lookback]);

  const summary = data?.summary || {};

  return (
    <div className="space-y-5" data-testid="ai-anomalies-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <Wand2 className="w-6 h-6 text-[hsl(var(--primary))]" />
            {lang === 'id' ? 'AI Anomaly Detection' : 'AI Anomaly Detection'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Deteksi otomatis pola tak biasa dengan penjelasan AI' : 'Auto-detect unusual patterns with AI explanations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger className="h-9 w-[200px] bg-[var(--glass-bg)]" data-testid="ai-anomalies-outlet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua Outlet' : 'All Outlets'}</SelectItem>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(lookback)} onValueChange={(v) => setLookback(parseInt(v))}>
            <SelectTrigger className="h-9 w-[120px] bg-[var(--glass-bg)]" data-testid="ai-anomalies-lookback">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 {lang === 'id' ? 'hari' : 'days'}</SelectItem>
              <SelectItem value="14">14 {lang === 'id' ? 'hari' : 'days'}</SelectItem>
              <SelectItem value="30">30 {lang === 'id' ? 'hari' : 'days'}</SelectItem>
              <SelectItem value="90">90 {lang === 'id' ? 'hari' : 'days'}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-9 gap-1.5" data-testid="ai-anomalies-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'id' ? 'Scan' : 'Scan'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Total Anomali' : 'Total Anomalies'}</div>
            <div className="text-2xl font-semibold mt-1">{summary.total_anomalies || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/30 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-[hsl(var(--destructive))]">{lang === 'id' ? 'High Severity' : 'High Severity'}</div>
            <div className="text-2xl font-semibold text-[hsl(var(--destructive))] mt-1">{summary.high_severity || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-amber-400">{lang === 'id' ? 'Medium Severity' : 'Medium Severity'}</div>
            <div className="text-2xl font-semibold text-amber-400 mt-1">{summary.medium_severity || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Alert Aktif' : 'Active Alerts'}</div>
            <div className="text-2xl font-semibold mt-1">{summary.active_alerts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* AI explanation */}
      {data?.explanation && (
        <Card className="bg-gradient-to-br from-[var(--glass-bg)] to-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20 backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              {lang === 'id' ? 'Analisa AI' : 'AI Analysis'}
            </h3>
            <div data-testid="ai-anomalies-explanation">{renderMarkdown(data.explanation)}</div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly list */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <AlertTriangle className="w-4 h-4" />
            {lang === 'id' ? 'Detail Anomali' : 'Anomaly Details'}
          </h3>
          {(data?.anomalies || []).length === 0 ? (
            <div className="text-center py-8 text-sm text-[hsl(var(--muted-foreground))]">
              {lang === 'id' ? '✅ Tidak ada anomali terdeteksi dalam periode ini' : '✅ No anomalies detected in this period'}
            </div>
          ) : (
            <div className="space-y-2">
              {data.anomalies.map((a, i) => {
                const Icon = typeIcons[a.type] || AlertTriangle;
                return (
                  <div key={i} className={`p-3 rounded-lg border ${sevStyle(a.severity)} flex items-start gap-3`} data-testid={`ai-anomaly-${i}`}>
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold uppercase">{a.type?.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-[9px] h-5 px-1.5 capitalize">{a.severity}</Badge>
                        {a.date && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{a.date}</span>}
                        {a.shift_number && <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{a.shift_number}</span>}
                        {a.z_score != null && <Badge variant="outline" className="text-[9px]">z = {a.z_score}</Badge>}
                      </div>
                      <div className="text-sm">{a.description}</div>
                      {a.expected_range && (
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                          {lang === 'id' ? 'Range normal' : 'Normal range'}: {fmtIDR(a.expected_range[0])} — {fmtIDR(a.expected_range[1])}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active alerts list */}
      {(data?.active_alerts || []).length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
              {lang === 'id' ? 'Alert Sistem Aktif' : 'Active System Alerts'}
            </h3>
            <div className="space-y-1.5">
              {data.active_alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                  <Badge variant="outline" className={sevStyle(a.severity === 'critical' ? 'high' : 'medium')}>{a.severity}</Badge>
                  <span className="font-mono text-[10px]">{a.type}</span>
                  <span>{a.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
