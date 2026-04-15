import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Building2, CheckCircle, Clock, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  open: { color: 'border-gray-500/30 text-gray-400', icon: Clock, label: 'Open' },
  in_progress: { color: 'border-amber-500/30 text-amber-400', icon: Clock, label: 'In Progress' },
  submitted: { color: 'border-cyan-500/30 text-cyan-400', icon: Clock, label: 'Submitted' },
  approved: { color: 'border-green-500/30 text-green-400', icon: CheckCircle, label: 'Approved' },
  locked: { color: 'border-green-500/30 text-green-400', icon: Lock, label: 'Locked' },
};

export default function ClosingMonitorPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/daily-closing/monitor', { params: { date } });
      setOutlets(res.data.outlets || []);
    } catch (err) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [date]);

  const handleApprove = async (outletId) => {
    try {
      await api.post(`/api/daily-closing/approve?outlet_id=${outletId}&date=${date}`, { comment: 'Approved from monitor' });
      toast.success('Closing approved & locked');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const lockedCount = outlets.filter(o => o.closing_status === 'locked').length;
  const submittedCount = outlets.filter(o => o.closing_status === 'submitted').length;
  const openCount = outlets.filter(o => ['open', 'in_progress'].includes(o.closing_status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Outlet Closing Monitor</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Monitor daily closing status across all outlets</p>
        </div>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[180px] bg-[var(--glass-bg)] border-[var(--glass-border)]" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-green-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{lockedCount}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Locked</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{submittedCount}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Awaiting Approval</span></div>
          </CardContent>
        </Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${openCount > 0 ? 'border-amber-400/30' : ''}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${openCount > 0 ? 'text-amber-400' : 'text-gray-400'}`} />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{openCount}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Not Closed</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Outlets Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-[var(--glass-border)] hover:bg-transparent">
              <TableHead>Outlet</TableHead><TableHead>City</TableHead><TableHead>Status</TableHead>
              <TableHead>Submitted By</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {outlets.map(o => {
                const sc = statusConfig[o.closing_status] || statusConfig.open;
                const Icon = sc.icon;
                return (
                  <TableRow key={o.id} className="border-[var(--glass-border)] hover:bg-white/5">
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[hsl(var(--primary))]" />{o.name}</div></TableCell>
                    <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{o.city}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] gap-1 ${sc.color}`}><Icon className="w-3 h-3" /> {sc.label}</Badge></TableCell>
                    <TableCell className="text-sm">{o.closing?.submitted_by || '-'}</TableCell>
                    <TableCell>
                      {o.closing_status === 'submitted' && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleApprove(o.id)}>
                          <CheckCircle className="w-3 h-3" /> Approve & Lock
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
