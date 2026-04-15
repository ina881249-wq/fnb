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
import { Plus, Shield, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalRulesPage() {
  const [rules, setRules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', transaction_type: 'cash_movement', condition_field: 'amount',
    condition_operator: 'gte', condition_value: 0, approver_role_ids: [],
    requires_comment: false, auto_approve_below: 0, escalation_hours: 24,
    description: '',
  });

  const fetchData = async () => {
    try {
      const [rulesRes, rolesRes] = await Promise.all([
        api.get('/api/approval-rules'),
        api.get('/api/core/roles'),
      ]);
      setRules(rulesRes.data.rules || []);
      setRoles(rolesRes.data.roles || []);
    } catch (err) { toast.error('Failed'); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/approval-rules', { ...form, condition_value: parseFloat(form.condition_value), auto_approve_below: parseFloat(form.auto_approve_below) || null, escalation_hours: parseInt(form.escalation_hours) });
      toast.success('Approval rule created');
      setShowCreate(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDeactivate = async (id) => {
    await api.delete(`/api/approval-rules/${id}`);
    toast.success('Rule deactivated');
    fetchData();
  };

  const toggleRole = (roleId) => {
    setForm(prev => ({
      ...prev,
      approver_role_ids: prev.approver_role_ids.includes(roleId)
        ? prev.approver_role_ids.filter(r => r !== roleId)
        : [...prev.approver_role_ids, roleId]
    }));
  };

  const txTypes = ['cash_movement', 'petty_cash', 'stock_movement', 'settlement', 'period_close', 'budget_override'];
  const operators = [{ v: 'gte', l: '>=' }, { v: 'gt', l: '>' }, { v: 'lte', l: '<=' }, { v: 'lt', l: '<' }, { v: 'eq', l: '=' }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Approval Rules</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Configure when transactions require approval</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="create-approval-rule"><Plus className="w-4 h-4" /> Rule</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-lg">
            <DialogHeader><DialogTitle>Create Approval Rule</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required placeholder="High value cash movement" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Transaction Type</Label>
                  <Select value={form.transaction_type} onValueChange={v => setForm({...form, transaction_type: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent>{txTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Condition</Label>
                  <div className="flex gap-1">
                    <Select value={form.condition_operator} onValueChange={v => setForm({...form, condition_operator: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))] w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>{operators.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" value={form.condition_value} onChange={e => setForm({...form, condition_value: e.target.value})} className="bg-[hsl(var(--secondary))] flex-1" placeholder="Amount" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Auto-approve Below</Label><Input type="number" value={form.auto_approve_below} onChange={e => setForm({...form, auto_approve_below: e.target.value})} className="bg-[hsl(var(--secondary))]" placeholder="0 = disabled" /></div>
                <div><Label>Escalation (hours)</Label><Input type="number" value={form.escalation_hours} onChange={e => setForm({...form, escalation_hours: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              </div>
              <div>
                <Label className="mb-2 block">Approver Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox checked={form.approver_role_ids.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.requires_comment} onCheckedChange={v => setForm({...form, requires_comment: v})} />
                <span className="text-sm">Require comment when approving</span>
              </label>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              <Button type="submit" className="w-full">Create Rule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
            <p className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>No Approval Rules</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create rules to control when transactions need approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(rule => (
            <Card key={rule.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{rule.name}</h3>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400" onClick={() => handleDeactivate(rule.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-[9px]">{rule.transaction_type?.replace('_', ' ')}</Badge>
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">
                    {rule.condition_field} {rule.condition_operator} {(rule.condition_value || 0).toLocaleString()}
                  </Badge>
                  {rule.auto_approve_below > 0 && (
                    <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400">Auto &lt; {rule.auto_approve_below?.toLocaleString()}</Badge>
                  )}
                  {rule.requires_comment && <Badge variant="outline" className="text-[9px]">Comment required</Badge>}
                </div>
                {rule.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{rule.description}</p>}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] mr-1">Approvers:</span>
                  {rule.approver_role_names?.map(r => <Badge key={r} variant="outline" className="text-[9px]">{r}</Badge>)}
                  {(!rule.approver_role_names || rule.approver_role_names.length === 0) && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Any approver</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
