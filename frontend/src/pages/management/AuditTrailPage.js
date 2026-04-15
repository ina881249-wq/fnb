import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ClipboardList, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

const actionColors = {
  create: 'border-green-500/30 text-green-400',
  update: 'border-cyan-500/30 text-cyan-400',
  delete: 'border-red-500/30 text-red-400',
  deactivate: 'border-red-500/30 text-red-400',
  login: 'border-blue-500/30 text-blue-400',
  approve: 'border-green-500/30 text-green-400',
  reject: 'border-red-500/30 text-red-400',
  submit: 'border-amber-500/30 text-amber-400',
  close: 'border-purple-500/30 text-purple-400',
  change_password: 'border-amber-500/30 text-amber-400',
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/core/audit-logs', { params: { module: moduleFilter, skip: page * 50, limit: 50 } });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) { toast.error('Failed to load audit logs'); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [moduleFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Audit Trail</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Complete log of all system actions ({total} entries)</p>
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[180px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Modules</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="core">Core</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="approvals">Approvals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={log.id || i} className="border-[var(--glass-border)] hover:bg-white/5">
                  <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {log.timestamp?.slice(0, 19).replace('T', ' ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[hsl(var(--primary))]" />
                      <span className="text-sm">{log.user_name || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${actionColors[log.action] || ''}`}>{log.action}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{log.module}</Badge></TableCell>
                  <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{log.entity_type}</TableCell>
                  <TableCell className="text-xs text-[hsl(var(--muted-foreground))] max-w-[200px] truncate">{log.details || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
