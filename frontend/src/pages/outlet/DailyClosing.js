import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, Circle, Lock, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const stepConfig = [
  { key: 'sales_summary', label: 'Sales Summary', desc: 'Record daily sales data' },
  { key: 'petty_cash', label: 'Petty Cash', desc: 'Record all petty cash expenses' },
  { key: 'stock_movements', label: 'Stock Movements', desc: 'Record waste, counts, adjustments' },
  { key: 'cash_reconciliation', label: 'Cash Reconciliation', desc: 'Verify cash matches expected' },
];

export default function DailyClosingOutlet() {
  const { currentOutlet, getOutletName } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingData, setClosingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentOutlet) return;
    setLoading(true);
    try {
      const res = await api.get('/api/daily-closing/status', { params: { outlet_id: currentOutlet, date } });
      setClosingData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet, date]);

  const handleStart = async () => {
    try {
      await api.post(`/api/daily-closing/start?outlet_id=${currentOutlet}&date=${date}`);
      toast.success('Closing started');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/api/daily-closing/submit?outlet_id=${currentOutlet}&date=${date}`, { notes: '' });
      toast.success('Closing submitted for approval');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const status = closingData?.status || 'open';
  const checklist = closingData?.checklist || {};
  const canSubmit = closingData?.can_submit || false;
  const completedSteps = stepConfig.filter(s => checklist[s.key]?.complete).length;
  const progress = (completedSteps / stepConfig.length) * 100;

  if (!currentOutlet) {
    return <div className="flex items-center justify-center h-64"><p className="text-[hsl(var(--muted-foreground))]">Select an outlet first</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Daily Closing</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{getOutletName(currentOutlet)} - {date}</p>
        </div>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[160px] bg-[var(--glass-bg)] border-[var(--glass-border)]" />
      </div>

      {/* Status Banner */}
      <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${status === 'locked' ? 'border-green-500/30' : status === 'submitted' ? 'border-cyan-500/30' : ''}`}>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'locked' ? <Lock className="w-6 h-6 text-green-400" /> :
             status === 'submitted' ? <Send className="w-6 h-6 text-cyan-400" /> :
             <Circle className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />}
            <div>
              <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                {status === 'locked' ? 'Day Locked' : status === 'submitted' ? 'Submitted - Awaiting Approval' : status === 'in_progress' ? 'Closing In Progress' : 'Not Started'}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{completedSteps}/{stepConfig.length} tasks completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="w-32 h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
              <motion.div className="h-full bg-[hsl(var(--primary))] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{Math.round(progress)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Steps */}
      <div className="space-y-3">
        {stepConfig.map((step, i) => {
          const check = checklist[step.key] || {};
          const isComplete = check.complete;
          return (
            <motion.div key={step.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${isComplete ? 'border-green-500/20' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-green-500/20' : 'bg-[var(--glass-bg-strong)]'}`}>
                    {isComplete ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{step.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.count !== undefined && <span className="text-xs text-[hsl(var(--muted-foreground))]">{check.count} entries</span>}
                    {check.unresolved > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] gap-1"><AlertTriangle className="w-3 h-3" /> {check.unresolved} unresolved</Badge>}
                    <Badge variant="outline" className={`text-[9px] ${isComplete ? 'border-green-500/30 text-green-400' : 'border-gray-500/30 text-gray-400'}`}>
                      {isComplete ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {status === 'open' && (
          <Button onClick={handleStart} className="gap-2" data-testid="start-closing">Start Closing</Button>
        )}
        {['open', 'in_progress'].includes(status) && (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2" data-testid="submit-closing">
            <Send className="w-4 h-4" /> Submit for Approval
          </Button>
        )}
        {!canSubmit && ['open', 'in_progress'].includes(status) && (
          <p className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Complete all required tasks before submitting</p>
        )}
      </div>
    </div>
  );
}
