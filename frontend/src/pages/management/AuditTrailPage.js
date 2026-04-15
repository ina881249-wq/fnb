import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { User, Clock } from 'lucide-react';
import { toast } from 'sonner';

const actionColors = {
  create: 'border-green-500/30 text-green-400', update: 'border-cyan-500/30 text-cyan-400',
  delete: 'border-red-500/30 text-red-400', deactivate: 'border-red-500/30 text-red-400',
  login: 'border-blue-500/30 text-blue-400', approve: 'border-green-500/30 text-green-400',
  reject: 'border-red-500/30 text-red-400', submit: 'border-amber-500/30 text-amber-400',
  close: 'border-purple-500/30 text-purple-400', post: 'border-green-500/30 text-green-400',
  reverse: 'border-red-500/30 text-red-400', start: 'border-cyan-500/30 text-cyan-400',
  complete: 'border-green-500/30 text-green-400', consume: 'border-amber-500/30 text-amber-400',
  override: 'border-red-500/30 text-red-400', change_password: 'border-amber-500/30 text-amber-400',
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/core/audit-logs', { params: { module: moduleFilter, skip: page * pageSize, limit: pageSize } });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) { toast.error('Failed to load audit logs'); }
    setLoading(false);
  }, [moduleFilter, page, pageSize]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    {
      key: 'timestamp', label: 'Timestamp', width: '180px',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <Clock className="w-3 h-3" />
          {val?.slice(0, 19).replace('T', ' ')}
        </div>
      ),
    },
    {
      key: 'user_name', label: 'User',
      render: (val) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-[hsl(var(--primary))]" />
          <span className="text-sm">{val || 'System'}</span>
        </div>
      ),
    },
    {
      key: 'action', label: 'Action',
      render: (val) => <Badge variant="outline" className={`text-[10px] ${actionColors[val] || ''}`}>{val}</Badge>,
    },
    {
      key: 'module', label: 'Module',
      render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge>,
    },
    { key: 'entity_type', label: 'Entity', cellClassName: 'text-sm text-[hsl(var(--muted-foreground))]' },
    {
      key: 'details', label: 'Details', cellClassName: 'text-xs text-[hsl(var(--muted-foreground))] max-w-[250px] truncate',
      render: (val) => val || '-',
    },
  ];

  const filters = [
    {
      key: 'module', label: 'Module', value: moduleFilter,
      onChange: (v) => { setModuleFilter(v === 'all' ? '' : v); setPage(0); },
      options: [
        { value: 'auth', label: 'Auth' }, { value: 'core', label: 'Core' },
        { value: 'finance', label: 'Finance' }, { value: 'inventory', label: 'Inventory' },
        { value: 'approvals', label: 'Approvals' }, { value: 'operations', label: 'Operations' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Audit Trail</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Complete log of all system actions ({total} entries)</p>
      </div>

      <DataTable
        data={logs}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        filters={filters}
        loading={loading}
        emptyTitle="No audit logs"
        emptyDescription="Actions will appear here as users interact with the system."
        onRowClick={(row) => setSelectedLog(row)}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-[hsl(var(--popover))] border-[var(--glass-border)] max-w-lg">
          <DialogHeader><DialogTitle>Audit Entry Details</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[hsl(var(--muted-foreground))]">Timestamp:</span><br/>{selectedLog.timestamp?.replace('T', ' ')}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">User:</span><br/>{selectedLog.user_name || 'System'}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Action:</span><br/><Badge variant="outline" className={`text-[10px] ${actionColors[selectedLog.action]}`}>{selectedLog.action}</Badge></div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Module:</span><br/><Badge variant="outline" className="text-[10px]">{selectedLog.module}</Badge></div>
              </div>
              <div><span className="text-[hsl(var(--muted-foreground))]">Entity:</span> {selectedLog.entity_type} {selectedLog.entity_id && `(${selectedLog.entity_id})`}</div>
              {selectedLog.details && <div><span className="text-[hsl(var(--muted-foreground))]">Details:</span><br/>{selectedLog.details}</div>}
              {selectedLog.before_value && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-[10px] uppercase tracking-wider text-red-400">Before</span>
                  <pre className="text-xs mt-1 overflow-auto max-h-32">{JSON.stringify(selectedLog.before_value, null, 2)}</pre>
                </div>
              )}
              {selectedLog.after_value && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-[10px] uppercase tracking-wider text-green-400">After</span>
                  <pre className="text-xs mt-1 overflow-auto max-h-32">{JSON.stringify(selectedLog.after_value, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
