import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Shield, TrendingUp, XCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const priorityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle },
  medium: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Bell },
  low: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Shield },
};

export default function ControlTower() {
  const [summary, setSummary] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/executive/alerts-summary');
        setSummary(res.data);
      } catch (err) { toast.error('Failed'); }
    };
    fetch();
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.post(`/api/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      const res = await api.get('/api/executive/alerts-summary');
      setSummary(res.data);
    } catch (err) { toast.error('Failed'); }
  };

  const handleGenerate = async () => {
    try {
      const res = await api.post('/api/alerts/generate');
      toast.success(`Scanned: ${res.data.generated} new alerts`);
      const sumRes = await api.get('/api/executive/alerts-summary');
      setSummary(sumRes.data);
    } catch (err) { toast.error('Failed'); }
  };

  const filtered = typeFilter ? summary?.recent?.filter(a => a.alert_type === typeFilter) : summary?.recent;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Control Tower</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Exception monitoring and operational alerts</p>
        </div>
        <Button onClick={handleGenerate} className="gap-2"><AlertTriangle className="w-4 h-4" /> Scan System</Button>
      </div>

      {/* Priority Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map(p => {
          const conf = priorityConfig[p];
          const Icon = conf.icon;
          const count = summary?.by_priority?.[p] || 0;
          return (
            <motion.div key={p} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`bg-[var(--glass-bg)] ${conf.border} hover:bg-[var(--glass-bg-strong)] transition-colors`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${conf.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${conf.color}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${conf.color}`} style={{ fontFamily: 'Space Grotesk' }}>{count}</p>
                    <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{p}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* By Type */}
      {summary?.by_type?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant={!typeFilter ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setTypeFilter('')}>All ({summary?.total || 0})</Button>
          {summary.by_type.map(t => (
            <Button key={t.type} variant={typeFilter === t.type ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1 border-[var(--glass-border)]" onClick={() => setTypeFilter(typeFilter === t.type ? '' : t.type)}>
              {t.type?.replace('_', ' ')} <Badge variant="outline" className="text-[9px] ml-0.5">{t.count}</Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Alert Feed */}
      <div className="space-y-2">
        {(!filtered || filtered.length === 0) ? (
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>All Clear</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">No active alerts. System is running smoothly.</p>
            </CardContent>
          </Card>
        ) : filtered.map((alert, i) => {
          const conf = priorityConfig[alert.priority] || priorityConfig.low;
          const Icon = conf.icon;
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`bg-[var(--glass-bg)] ${conf.border} hover:bg-[var(--glass-bg-strong)] transition-colors`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${conf.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${conf.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{alert.title}</span>
                      <Badge className={`text-[8px] ${conf.bg} ${conf.color} border-0`}>{alert.priority}</Badge>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {alert.outlet_name && <span>{alert.outlet_name}</span>}
                      <span>{alert.created_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-green-400 hover:bg-green-500/10 flex-shrink-0" onClick={() => handleResolve(alert.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
