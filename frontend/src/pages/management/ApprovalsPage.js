import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, statsRes] = await Promise.all([
        api.get('/api/approvals', { params: { status: filter, limit: 50 } }),
        api.get('/api/approvals/stats'),
      ]);
      setApprovals(appRes.data.approvals || []);
      setStats(statsRes.data || {});
    } catch (err) { toast.error('Failed to load approvals'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/approvals/${id}/${action}`, { comment });
      toast.success(`Request ${action}d`);
      setSelectedApproval(null);
      setComment('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Action failed'); }
  };

  const statusColors = {
    pending: 'border-amber-500/30 text-amber-400',
    approved: 'border-green-500/30 text-green-400',
    rejected: 'border-red-500/30 text-red-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Approvals</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Review and manage approval requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-bg-strong)]" onClick={() => setFilter('pending')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.pending || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Pending</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-bg-strong)]" onClick={() => setFilter('approved')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.approved || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Approved</span></div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-bg-strong)]" onClick={() => setFilter('rejected')}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.rejected || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Rejected</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Approvals Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Requester</TableHead>
                <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No {filter} approvals</TableCell></TableRow>
              ) : approvals.map(a => (
                <TableRow key={a.id} className="border-[var(--glass-border)] hover:bg-white/5" data-testid="approvals-inbox-item">
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.type}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate">{a.description}</TableCell>
                  <TableCell>{a.requester_name || '-'}</TableCell>
                  <TableCell style={{ fontVariantNumeric: 'tabular-nums' }}>{a.amount ? `Rp ${a.amount.toLocaleString()}` : '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[a.status]}`}>{a.status}</Badge></TableCell>
                  <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{a.created_at?.slice(0, 10)}</TableCell>
                  <TableCell>
                    {a.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-500/10" onClick={() => setSelectedApproval({...a, action: 'approve'})} data-testid={`approve-button-${a.id}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" onClick={() => setSelectedApproval({...a, action: 'reject'})} data-testid={`reject-button-${a.id}`}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>{selectedApproval?.action === 'approve' ? 'Approve' : 'Reject'} Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">{selectedApproval?.description}</p>
            <div><Label>Comment (optional)</Label><Input value={comment} onChange={e => setComment(e.target.value)} className="bg-[hsl(var(--secondary))]" placeholder="Add a comment..." /></div>
            <div className="flex gap-2">
              <Button className={`flex-1 ${selectedApproval?.action === 'approve' ? '' : 'bg-red-500 hover:bg-red-600'}`} onClick={() => handleAction(selectedApproval?.id, selectedApproval?.action)}>
                {selectedApproval?.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
              <Button variant="outline" className="flex-1 border-[var(--glass-border)]" onClick={() => setSelectedApproval(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
