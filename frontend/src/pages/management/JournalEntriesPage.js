import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, BookOpen, Check, Search, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

const statusColors = {
  draft: 'border-amber-500/30 text-amber-400',
  posted: 'border-green-500/30 text-green-400',
  reversed: 'border-red-500/30 text-red-400',
};

export default function JournalEntriesPage() {
  const { currentOutlet, outlets } = useAuth();
  const [journals, setJournals] = useState([]);
  const [total, setTotal] = useState(0);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newJournal, setNewJournal] = useState({
    posting_date: new Date().toISOString().split('T')[0],
    description: '',
    outlet_id: '',
    lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { skip: page * 20, limit: 20, search, status: statusFilter, outlet_id: currentOutlet || '' };
      const [jRes, coaRes] = await Promise.all([
        api.get('/api/journals', { params }),
        api.get('/api/coa', { params: { active_only: true } }),
      ]);
      setJournals(jRes.data.journals || []);
      setTotal(jRes.data.total || 0);
      setCoaAccounts(coaRes.data.accounts?.filter(a => !a.is_header) || []);
    } catch (err) { toast.error('Failed to load journals'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, search, statusFilter, currentOutlet]);

  const addLine = () => {
    setNewJournal(prev => ({ ...prev, lines: [...prev.lines, { account_id: '', debit: 0, credit: 0, description: '' }] }));
  };

  const removeLine = (idx) => {
    if (newJournal.lines.length <= 2) return;
    setNewJournal(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx, field, value) => {
    setNewJournal(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  };

  const totalDebit = newJournal.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = newJournal.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isBalanced) { toast.error('Journal must be balanced'); return; }
    try {
      const lines = newJournal.lines.map(l => {
        const acc = coaAccounts.find(a => a.id === l.account_id);
        return { ...l, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, account_code: acc?.code || '', account_name: acc?.name || '' };
      });
      await api.post('/api/journals', { ...newJournal, lines, source_type: 'manual' });
      toast.success('Journal created');
      setShowCreate(false);
      setNewJournal({ posting_date: new Date().toISOString().split('T')[0], description: '', outlet_id: '', lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handlePost = async (id) => {
    try {
      await api.post(`/api/journals/${id}/post`);
      toast.success('Journal posted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleReverse = async (id) => {
    try {
      await api.post(`/api/journals/${id}/reverse`);
      toast.success('Journal reversed');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await api.get(`/api/journals/${id}`);
      setSelectedJournal(res.data);
    } catch (err) { toast.error('Failed to load journal'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Journal Entries</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Double-entry accounting journal ({total} entries)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="create-journal-button"><Plus className="w-4 h-4" /> Journal</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Journal Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={newJournal.posting_date} onChange={e => setNewJournal({...newJournal, posting_date: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Outlet</Label>
                  <Select value={newJournal.outlet_id || 'none'} onValueChange={v => setNewJournal({...newJournal, outlet_id: v === 'none' ? '' : v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="HQ" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Head Office</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Input value={newJournal.description} onChange={e => setNewJournal({...newJournal, description: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Journal Lines</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addLine} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Line</Button>
                </div>
                <div className="space-y-2">
                  {newJournal.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select value={line.account_id || ''} onValueChange={v => updateLine(idx, 'account_id', v)}>
                          <SelectTrigger className="bg-[hsl(var(--secondary))] h-9 text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                          <SelectContent>{coaAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3"><Input type="number" placeholder="Debit" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', e.target.value)} className="bg-[hsl(var(--secondary))] h-9 text-xs" /></div>
                      <div className="col-span-3"><Input type="number" placeholder="Credit" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', e.target.value)} className="bg-[hsl(var(--secondary))] h-9 text-xs" /></div>
                      <div className="col-span-1">{newJournal.lines.length > 2 && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => removeLine(idx)}>×</Button>}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                  <div className="flex gap-6">
                    <div><span className="text-xs text-[hsl(var(--muted-foreground))]">Total Debit</span><p className="font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalDebit)}</p></div>
                    <div><span className="text-xs text-[hsl(var(--muted-foreground))]">Total Credit</span><p className="font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalCredit)}</p></div>
                  </div>
                  <Badge className={`${isBalanced ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {isBalanced ? 'Balanced' : `Diff: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                  </Badge>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!isBalanced}>Create Journal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <Input placeholder="Search journals..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10 bg-[hsl(var(--secondary))] border-[var(--glass-border)]" />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger className="w-[150px] bg-[var(--glass-bg)] border-[var(--glass-border)]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="posted">Posted</SelectItem><SelectItem value="reversed">Reversed</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Journals Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead>Journal #</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead>
                <TableHead>Source</TableHead><TableHead>Outlet</TableHead>
                <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-[hsl(var(--muted-foreground))]">No journal entries yet. Create your first journal or record a financial transaction.</TableCell></TableRow>
              ) : journals.map(j => (
                <TableRow key={j.id} className="border-[var(--glass-border)] hover:bg-white/5 cursor-pointer" onClick={() => viewDetail(j.id)}>
                  <TableCell className="font-mono text-xs text-[hsl(var(--primary))]">{j.journal_number}</TableCell>
                  <TableCell className="text-sm">{j.posting_date}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{j.description}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px]">{j.source_type}</Badge></TableCell>
                  <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">{j.outlet_name || 'HQ'}</TableCell>
                  <TableCell className="text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(j.total_debit)}</TableCell>
                  <TableCell className="text-right text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(j.total_credit)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[9px] ${statusColors[j.status] || ''}`}>{j.status}</Badge></TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {j.status === 'draft' && <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-500/10" onClick={() => handlePost(j.id)} title="Post"><Check className="w-3.5 h-3.5" /></Button>}
                      {j.status === 'posted' && <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" onClick={() => handleReverse(j.id)} title="Reverse"><RotateCcw className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Showing {page * 20 + 1}-{Math.min((page + 1) * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-[var(--glass-border)]">Previous</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)} className="border-[var(--glass-border)]">Next</Button>
          </div>
        </div>
      )}

      {/* Journal Detail Dialog */}
      <Dialog open={!!selectedJournal} onOpenChange={() => setSelectedJournal(null)}>
        <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-[hsl(var(--primary))]" /> {selectedJournal?.journal_number}</DialogTitle></DialogHeader>
          {selectedJournal && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-[hsl(var(--muted-foreground))]">Date:</span> {selectedJournal.posting_date}</div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Source:</span> <Badge variant="outline" className="text-[9px]">{selectedJournal.source_type}</Badge></div>
                <div><span className="text-[hsl(var(--muted-foreground))]">Status:</span> <Badge variant="outline" className={`text-[9px] ${statusColors[selectedJournal.status]}`}>{selectedJournal.status}</Badge></div>
              </div>
              <p className="text-sm">{selectedJournal.description}</p>
              <Table>
                <TableHeader><TableRow className="border-[var(--glass-border)]">
                  <TableHead>#</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {selectedJournal.lines?.map((l, i) => (
                    <TableRow key={i} className="border-[var(--glass-border)]">
                      <TableCell className="text-xs">{l.line_number}</TableCell>
                      <TableCell><span className="font-mono text-xs text-[hsl(var(--primary))] mr-2">{l.account_code}</span>{l.account_name}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{l.debit > 0 ? formatCurrency(l.debit) : ''}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{l.credit > 0 ? formatCurrency(l.credit) : ''}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-[var(--glass-border)] font-semibold">
                    <TableCell /><TableCell>Total</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(selectedJournal.total_debit)}</TableCell>
                    <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(selectedJournal.total_credit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
