import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertTriangle, AlertCircle, Bell, CheckCircle, Package, DollarSign, Clock, Trash2, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const alertTypeConfig = {
  low_stock: { icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  cash_mismatch: { icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  overdue_closing: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  missing_submission: { icon: AlertCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  unusual_expense: { icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  high_variance: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  high_waste: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function AlertsPage() {
  const { currentOutlet } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, medium: 0, by_type: {} });
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { outlet_id: currentOutlet || '', resolved: 'false', alert_type: typeFilter };
      const [alertsRes, statsRes] = await Promise.all([
        api.get('/api/alerts', { params }),
        api.get('/api/alerts/stats', { params: { outlet_id: currentOutlet || '' } }),
      ]);
      setAlerts(alertsRes.data.alerts || []);
      setStats(statsRes.data || { total: 0 });
    } catch (err) { toast.error('Failed to load alerts'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet, typeFilter]);

  const handleGenerate = async () => {
    try {
      const res = await api.post('/api/alerts/generate');
      toast.success(`Generated ${res.data.generated} alerts`);
      fetchData();
    } catch (err) { toast.error('Failed to generate alerts'); }
  };

  const handleResolve = async (id) => {
    try {
      await api.post(`/api/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      fetchData();
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Exception Alerts</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Anomaly detection and operational monitoring</p>
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[170px] bg-[var(--glass-bg)] border-[var(--glass-border)]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="cash_mismatch">Cash Mismatch</SelectItem>
              <SelectItem value="overdue_closing">Overdue Closing</SelectItem>
              <SelectItem value="high_waste">High Waste</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} variant="outline" className="gap-2 border-[var(--glass-border)]" data-testid="generate-alerts">
            <RefreshCw className="w-4 h-4" /> Scan Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="w-5 h-5 text-[hsl(var(--primary))]" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.total}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Active Alerts</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div><p className="text-xl font-semibold text-red-400" style={{ fontFamily: 'Space Grotesk' }}>{stats.critical}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Critical</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <div><p className="text-xl font-semibold text-amber-400" style={{ fontFamily: 'Space Grotesk' }}>{stats.high}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">High</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.medium}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Medium</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>All Clear</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">No active alerts. Click "Scan Now" to check for new anomalies.</p>
            </CardContent>
          </Card>
        ) : alerts.map((alert, i) => {
          const config = alertTypeConfig[alert.alert_type] || alertTypeConfig.low_stock;
          const Icon = config.icon;
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`bg-[var(--glass-bg)] ${config.border} backdrop-blur-xl hover:bg-[var(--glass-bg-strong)] transition-colors`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{alert.title}</span>
                      <Badge className={`text-[9px] ${priorityColors[alert.priority]}`}>{alert.priority}</Badge>
                      <Badge variant="outline" className="text-[9px]">{alert.alert_type?.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {alert.outlet_name && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{alert.outlet_name}</span>}
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{alert.created_at?.slice(0, 16).replace('T', ' ')}</span>
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
