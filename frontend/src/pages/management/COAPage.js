import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Plus, ChevronRight, ChevronDown, FolderTree, Search } from 'lucide-react';
import { toast } from 'sonner';

const typeColors = {
  asset: 'border-green-500/30 text-green-400',
  liability: 'border-red-500/30 text-red-400',
  equity: 'border-purple-500/30 text-purple-400',
  revenue: 'border-cyan-500/30 text-cyan-400',
  expense: 'border-amber-500/30 text-amber-400',
  cogs: 'border-orange-500/30 text-orange-400',
  contra: 'border-gray-500/30 text-gray-400',
};

// Flatten tree into indented list to avoid recursive rendering
function flattenTree(nodes, level = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, level + 1));
    }
  }
  return result;
}

export default function COAPage() {
  const [tree, setTree] = useState([]);
  const [flatList, setFlatList] = useState([]);
  const [viewMode, setViewMode] = useState('tree');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState({
    code: '', name: '', account_type: 'expense', parent_id: '', description: '', is_header: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [treeRes, listRes] = await Promise.all([
        api.get('/api/coa/tree'),
        api.get('/api/coa', { params: { search } }),
      ]);
      setTree(treeRes.data.tree || []);
      setFlatList(listRes.data.accounts || []);
    } catch (err) { toast.error('Failed to load COA'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/coa', newAccount);
      toast.success('Account created');
      setShowCreate(false);
      setNewAccount({ code: '', name: '', account_type: 'expense', parent_id: '', description: '', is_header: false });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs', 'contra'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Chart of Accounts</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage account hierarchy for double-entry bookkeeping</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg p-0.5">
            <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('tree')} className="h-7 px-3 text-xs">
              <FolderTree className="w-3 h-3 mr-1" /> Tree
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 px-3 text-xs">
              List
            </Button>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button className="gap-2" data-testid="create-coa-button"><Plus className="w-4 h-4" /> Account</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Create COA Account</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={newAccount.code} onChange={e => setNewAccount({...newAccount, code: e.target.value})} className="bg-[hsl(var(--secondary))] font-mono" placeholder="6100" required /></div>
                  <div><Label>Type</Label>
                    <Select value={newAccount.account_type} onValueChange={v => setNewAccount({...newAccount, account_type: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                      <SelectContent>{accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Name</Label><Input value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                <div><Label>Parent Account</Label>
                  <Select value={newAccount.parent_id || 'none'} onValueChange={v => setNewAccount({...newAccount, parent_id: v === 'none' ? '' : v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="None (root)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (root level)</SelectItem>
                      {flatList.filter(a => a.is_header).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Input value={newAccount.description} onChange={e => setNewAccount({...newAccount, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={newAccount.is_header} onCheckedChange={v => setNewAccount({...newAccount, is_header: v})} />
                  <span className="text-sm">Header account (cannot receive postings)</span>
                </label>
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[hsl(var(--secondary))] border-[var(--glass-border)]" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
        {accountTypes.map(t => {
          const count = flatList.filter(a => a.account_type === t).length;
          return (
            <Card key={t} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-3 text-center">
                <Badge variant="outline" className={`text-[9px] mb-1 ${typeColors[t]}`}>{t}</Badge>
                <p className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tree or List View */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-4">
          {viewMode === 'tree' ? (
            tree.length > 0 ? (
              <div className="space-y-0">
                {flattenTree(tree).map(node => (
                  <div key={node.id}
                    className="flex items-center gap-2 py-2 px-3 hover:bg-white/5 rounded-lg"
                    style={{ paddingLeft: `${node.level * 24 + 12}px` }}
                  >
                    <span className="text-xs font-mono text-[hsl(var(--primary))] w-12 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{node.code}</span>
                    <span className={`text-sm ${node.is_header ? 'font-semibold' : ''}`}>{node.name}</span>
                    <Badge variant="outline" className={`text-[9px] ml-auto ${typeColors[node.account_type] || ''}`}>{node.account_type}</Badge>
                    {node.is_header && <Badge variant="outline" className="text-[9px] border-white/20">Header</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-[hsl(var(--muted-foreground))]">No accounts found</p>
            )
          ) : (
            <div className="space-y-0">
              {flatList.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded-lg border-b border-[var(--glass-border)] last:border-0">
                  <span className="text-xs font-mono text-[hsl(var(--primary))] w-12" style={{ fontVariantNumeric: 'tabular-nums' }}>{acc.code}</span>
                  <span className={`text-sm flex-1 ${acc.is_header ? 'font-semibold' : ''}`}>{acc.name}</span>
                  <Badge variant="outline" className={`text-[9px] ${typeColors[acc.account_type] || ''}`}>{acc.account_type}</Badge>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{acc.normal_balance}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
