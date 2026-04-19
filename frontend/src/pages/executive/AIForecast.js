import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { LineChart as LineChartIcon, TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

function renderInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[hsl(var(--foreground))]">$1</strong>');
}
function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (/^##\s+/.test(line)) return <h3 key={i} className="text-base font-semibold mt-4 mb-2" style={{ fontFamily: 'Space Grotesk' }} dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^##\s+/, '')) }} />;
    if (/^[-*]\s+/.test(line)) return <li key={i} className="ml-5 text-sm list-disc text-[hsl(var(--foreground))]/85" dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^[-*]\s+/, '')) }} />;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed text-[hsl(var(--foreground))]/85" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
  });
}

export default function AIForecast() {
  const { lang } = useLang();
  const { outlets } = useAuth();
  const [outletId, setOutletId] = useState('all');
  const [horizon, setHorizon] = useState(7);
  const [lookback, setLookback] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/ai/forecast', {
        outlet_id: outletId === 'all' ? null : outletId,
        horizon_days: horizon,
        lookback_days: lookback,
      });
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [outletId, horizon, lookback]);

  // Build chart data: merge historical + forecast
  const chartData = [];
  (data?.historical || []).forEach(h => chartData.push({ date: h.date, historical: h.revenue }));
  (data?.forecast || []).forEach(f => chartData.push({ date: f.date, forecast: f.predicted_revenue }));

  const lastHistDate = data?.historical?.length ? data.historical[data.historical.length - 1].date : null;

  return (
    <div className="space-y-5" data-testid="ai-forecast-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <LineChartIcon className="w-6 h-6 text-[hsl(var(--primary))]" />
            {lang === 'id' ? 'AI Forecast' : 'AI Forecast'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {lang === 'id' ? 'Proyeksi revenue berdasarkan trend + seasonality, dengan narasi dari AI' : 'Revenue projection with trend + seasonality, AI narration'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger className="h-9 w-[200px] bg-[var(--glass-bg)]" data-testid="ai-forecast-outlet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'id' ? 'Semua Outlet' : 'All Outlets'}</SelectItem>
              {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(parseInt(v))}>
            <SelectTrigger className="h-9 w-[150px] bg-[var(--glass-bg)]" data-testid="ai-forecast-horizon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{lang === 'id' ? '7 hari kedepan' : 'Next 7 days'}</SelectItem>
              <SelectItem value="14">{lang === 'id' ? '14 hari kedepan' : 'Next 14 days'}</SelectItem>
              <SelectItem value="30">{lang === 'id' ? '30 hari kedepan' : 'Next 30 days'}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-9 gap-1.5" data-testid="ai-forecast-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'id' ? 'Refresh' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Rata-rata Historis' : 'Historical Avg/Day'}</div>
              <div className="text-lg font-semibold mt-1">{fmtIDR(data.historical_avg_daily)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[hsl(var(--primary))]/15 to-purple-500/10 border-[hsl(var(--primary))]/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--primary))]">{lang === 'id' ? `Proyeksi ${horizon} Hari` : `${horizon}-Day Forecast`}</div>
              <div className="text-lg font-semibold text-[hsl(var(--primary))] mt-1">{fmtIDR(data.total_forecast)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Rata-rata Proyeksi/Hari' : 'Avg Forecast/Day'}</div>
              <div className="text-lg font-semibold mt-1">{fmtIDR(data.total_forecast ? Math.round(data.total_forecast / horizon) : 0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <TrendingUp className="w-4 h-4" />
            {lang === 'id' ? 'Historis + Proyeksi' : 'Historical + Forecast'}
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  formatter={(v) => [fmtIDR(v), '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {lastHistDate && <ReferenceLine x={lastHistDate} stroke="hsl(var(--primary))" strokeDasharray="5 3" label={{ value: lang === 'id' ? 'Hari ini' : 'Today', fontSize: 10, fill: 'hsl(var(--primary))' }} />}
                <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name={lang === 'id' ? 'Historis' : 'Historical'} />
                <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} name={lang === 'id' ? 'Proyeksi AI' : 'AI Forecast'} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI narrative */}
      {data?.narrative && (
        <Card className="bg-gradient-to-br from-[var(--glass-bg)] to-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20 backdrop-blur-xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              {lang === 'id' ? 'Narasi AI' : 'AI Narrative'}
            </h3>
            <div data-testid="ai-forecast-narrative">{renderMarkdown(data.narrative)}</div>
            <div className="mt-4 text-[10px] text-[hsl(var(--muted-foreground))] italic">
              {data.model_note}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast table */}
      {data?.forecast?.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--glass-bg-strong)] text-xs uppercase text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                  <th className="text-left py-2.5 px-4">{lang === 'id' ? 'Hari' : 'Weekday'}</th>
                  <th className="text-right py-2.5 px-4">{lang === 'id' ? 'Proyeksi Revenue' : 'Predicted Revenue'}</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.map(f => (
                  <tr key={f.date} className="border-t border-[var(--glass-border)]" data-testid={`ai-forecast-row-${f.date}`}>
                    <td className="py-2 px-4 font-mono text-xs">{f.date}</td>
                    <td className="py-2 px-4 text-xs text-[hsl(var(--muted-foreground))]">{f.weekday}</td>
                    <td className="py-2 px-4 text-right font-semibold text-[hsl(var(--primary))]">{fmtIDR(f.predicted_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
