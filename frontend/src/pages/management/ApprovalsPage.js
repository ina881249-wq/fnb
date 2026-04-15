import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { DataTable } from '../../components/common/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  pending: 'border-amber-500/30 text-amber-400',
  approved: 'border-green-500/30 text-green-400',
  rejected: 'border-red-500/30 text-red-400',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filter, setFilter] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, statsRes] = await Promise.all([
        api.get('/api/approvals', { params: { status: filter, skip: page * pageSize, limit: pageSize } }),
        api.get('/api/approvals/stats'),
      ]);
      setApprovals(appRes.data.approvals || []);
      setTotal(appRes.data.total || 0);
      setStats(statsRes.data || {});
    } catch (err) { toast.error('Failed to load approvals'); }
    setLoading(false);
  }, [filter, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/approvals/${id}/${action}`, { comment });
      toast.success(`Request ${action}d`);
      setSelectedApproval(null);
      setComment('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Action failed'); }
  };

  const handleBulkApprove = async (ids) => {
    let success = 0;
    for (const id of ids) {
      try {
        await api.post(`/api/approvals/${id}/approve`, { comment: 'Bulk approved' });
        success++;
      } catch (e) { /* skip */ }
    }
    toast.success(`${success} approvals approved`);
    setSelectedIds([]);
    fetchData();
  };

  const columns = [
    { key: 'type', label: 'Type', render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge> },
    { key: 'description', label: 'Description', cellClassName: 'max-w-[250px] truncate' },
    { key: 'requester_name', label: 'Requester' },
    {
      key: 'amount', label: 'Amount', align: 'right',
      render: (val) => val ? `Rp ${val.toLocaleString()}` : '-',
    },
    {
      key: 'status', label: 'Status',
      render: (val) => <Badge variant="outline" className={`text-[10px] ${statusColors[val]}`}>{val}</Badge>,
    },
    {
      key: 'created_at', label: 'Date', cellClassName: 'text-sm text-[hsl(var(--muted-foreground))]',
      render: (val) => val?.slice(0, 10),
    },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row.status === 'pending' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setSelectedApproval({...row, action: 'approve'}); }}>
            <CheckCircle className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setSelectedApproval({...row, action: 'reject'}); }}>
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : '-',
    },
  ];

  const filters = [
    {
      key: 'status', label: 'Status', value: filter,
      onChange: (v) => { setFilter(v === 'all' ? '' : v); setPage(0); },
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ];

  const bulkActions = filter === 'pending' ? [
    { label: 'Approve Selected', icon: CheckCircle, onClick: handleBulkApprove },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Approvals</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Review and manage approval requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer ${filter === 'pending' ? 'border-[hsl(var(--primary))]/50' : ''}`} onClick={() => { setFilter('pending'); setPage(0); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.pending || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Pending</span></div>
          </CardContent>
        </Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer ${filter === 'approved' ? 'border-[hsl(var(--primary))]/50' : ''}`} onClick={() => { setFilter('approved'); setPage(0); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.approved || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Approved</span></div>
          </CardContent>
        </Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] cursor-pointer ${filter === 'rejected' ? 'border-[hsl(var(--primary))]/50' : ''}`} onClick={() => { setFilter('rejected'); setPage(0); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div><p className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{stats.rejected || 0}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Rejected</span></div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={approvals}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        filters={filters}
        loading={loading}
        selectable={filter === 'pending'}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        bulkActions={bulkActions}
        emptyTitle={`No ${filter || ''} approvals`}
        emptyDescription="Approval requests will appear here."
      />

      {/* Action Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="bg-[hsl(var(--popover))] border-[var(--glass-border)]">
          <DialogHeader><DialogTitle>{selectedApproval?.action === 'approve' ? 'Approve' : 'Reject'} Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">{selectedApproval?.description}</p>
            {selectedApproval?.amount && <p className="text-sm">Amount: <span className="font-semibold">Rp {selectedApproval.amount.toLocaleString()}</span></p>}
            <div><Label>Comment</Label><Input value={comment} onChange={e => setComment(e.target.value)} className="bg-[hsl(var(--secondary))]" placeholder="Add a comment..." /></div>
            <div className="flex gap-2">
              <Button className={`flex-1 ${selectedApproval?.action === 'reject' ? 'bg-red-500 hover:bg-red-600' : ''}`} onClick={() => handleAction(selectedApproval?.id, selectedApproval?.action)}>
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
