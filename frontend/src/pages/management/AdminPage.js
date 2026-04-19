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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Plus, Users, Shield, Building2, Pencil, Trash2, KeyRound, Copy, UserPlus, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { outlets, loadUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permCatalog, setPermCatalog] = useState({});
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role_ids: [], portal_access: [], outlet_access: [] });
  const [newInvite, setNewInvite] = useState({ email: '', name: '', role_ids: [], portal_access: [], outlet_access: [], expires_days: 7 });
  const [inviteResult, setInviteResult] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [], portal_access: [] });
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetCustomPw, setResetCustomPw] = useState('');
  const [resetResult, setResetResult] = useState(null);
  const [sessionsTarget, setSessionsTarget] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, permRes] = await Promise.all([
        api.get('/api/core/users'),
        api.get('/api/core/roles'),
        api.get('/api/core/settings/permissions-catalog'),
      ]);
      setUsers(usersRes.data.users || []);
      setRoles(rolesRes.data.roles || []);
      setPermCatalog(permRes.data || {});
    } catch (err) { toast.error('Failed to load admin data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', newUser);
      toast.success('User created');
      setShowCreateUser(false);
      setNewUser({ email: '', password: '', name: '', role_ids: [], portal_access: [], outlet_access: [] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/core/roles', newRole);
      toast.success('Role created');
      setShowCreateRole(false);
      setNewRole({ name: '', description: '', permissions: [], portal_access: [] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const togglePermission = (perm) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const togglePortal = (portal, setter, getter) => {
    setter(prev => ({
      ...prev,
      portal_access: prev.portal_access.includes(portal)
        ? prev.portal_access.filter(p => p !== portal)
        : [...prev.portal_access, portal]
    }));
  };

  const portals = ['management', 'outlet', 'kitchen', 'cashier', 'warehouse'];

  // ===== Admin helpers (password reset, invite, sessions) =====
  const copyToClipboard = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      toast.success('Disalin ke clipboard');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      toast.success('Disalin');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      const body = resetCustomPw ? { temp_password: resetCustomPw } : {};
      const res = await api.post(`/api/auth/admin/users/${resetTarget.id}/reset-password`, body);
      setResetResult(res.data);
      toast.success('Password direset');
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal reset'); }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/auth/admin/invite', newInvite);
      setInviteResult(res.data);
      toast.success('Invite dibuat');
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal invite'); }
  };

  const resetInviteFlow = () => {
    setShowInvite(false);
    setInviteResult(null);
    setNewInvite({ email: '', name: '', role_ids: [], portal_access: [], outlet_access: [], expires_days: 7 });
    fetchData();
  };

  const viewSessions = async (user) => {
    setSessionsTarget(user);
    setSessionsList([]);
    try {
      const res = await api.get('/api/auth/sessions', { params: { user_id: user.id, limit: 20 } });
      setSessionsList(res.data.sessions || []);
    } catch (err) { toast.error('Gagal memuat sesi'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Admin</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Users, roles, permissions, and outlets</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="outlets" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Outlets</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="flex justify-end gap-2 mb-4">
            <Dialog open={showInvite} onOpenChange={(o) => { if (!o) resetInviteFlow(); else setShowInvite(true); }}>
              <DialogTrigger asChild><Button variant="outline" className="gap-2" data-testid="invite-user-button"><UserPlus className="w-4 h-4" /> Invite User</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-lg">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-[hsl(var(--primary))]" /> Invite New User</DialogTitle></DialogHeader>
                {!inviteResult ? (
                  <form onSubmit={handleCreateInvite} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Name</Label><Input value={newInvite.name} onChange={e => setNewInvite({...newInvite, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                      <div><Label>Email</Label><Input type="email" value={newInvite.email} onChange={e => setNewInvite({...newInvite, email: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                    </div>
                    <div><Label>Role</Label>
                      <Select value={newInvite.role_ids[0] || ''} onValueChange={v => setNewInvite({...newInvite, role_ids: [v]})}>
                        <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Role" /></SelectTrigger>
                        <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Portal Access</Label>
                      <div className="flex flex-wrap gap-2">
                        {portals.map(p => (
                          <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Checkbox checked={newInvite.portal_access.includes(p)} onCheckedChange={(checked) => {
                              setNewInvite(prev => ({ ...prev, portal_access: checked ? [...prev.portal_access, p] : prev.portal_access.filter(x => x !== p) }));
                            }} />{p}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Outlet Access</Label>
                      <div className="flex flex-wrap gap-2">
                        {outlets.map(o => (
                          <label key={o.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Checkbox checked={newInvite.outlet_access.includes(o.id)} onCheckedChange={(checked) => {
                              setNewInvite(prev => ({ ...prev, outlet_access: checked ? [...prev.outlet_access, o.id] : prev.outlet_access.filter(x => x !== o.id) }));
                            }} />{o.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Expires (days)</Label><Input type="number" min="1" max="30" value={newInvite.expires_days} onChange={e => setNewInvite({...newInvite, expires_days: parseInt(e.target.value) || 7})} className="bg-[hsl(var(--secondary))]" /></div>
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] p-2 rounded bg-[var(--glass-bg-strong)]">
                      User akan menerima link undangan. Mereka set password sendiri saat pertama kali masuk.
                    </div>
                    <Button type="submit" className="w-full gap-2" data-testid="invite-submit"><UserPlus className="w-4 h-4" /> Create Invite</Button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <div>Invite dibuat untuk <strong>{inviteResult.email}</strong>. Bagikan link di bawah ke user. Link berlaku sampai {new Date(inviteResult.expires_at).toLocaleDateString('id-ID')}.</div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Link Undangan</Label>
                      <div className="flex gap-2">
                        <div className="px-3 py-2 flex-1 rounded-lg bg-[var(--glass-bg-strong)] text-xs font-mono break-all" data-testid="invite-url">
                          {window.location.origin}{inviteResult.invite_url_suffix}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(window.location.origin + inviteResult.invite_url_suffix)} data-testid="invite-copy-url">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end"><Button onClick={resetInviteFlow} data-testid="invite-done">Selesai</Button></div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
              <DialogTrigger asChild><Button className="gap-2" data-testid="create-user-button"><Plus className="w-4 h-4" /> Add User</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-lg">
                <DialogHeader><DialogTitle>Create User (with password)</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name</Label><Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                    <div><Label>Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="bg-[hsl(var(--secondary))]" required />
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Min 8 karakter, harus ada 1 huruf dan 1 angka.</p>
                  </div>
                  <div><Label>Role</Label>
                    <Select value={newUser.role_ids[0] || ''} onValueChange={v => setNewUser({...newUser, role_ids: [v]})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">Portal Access</Label>
                    <div className="flex flex-wrap gap-2">
                      {portals.map(p => (
                        <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={newUser.portal_access.includes(p)} onCheckedChange={(checked) => {
                            setNewUser(prev => ({ ...prev, portal_access: checked ? [...prev.portal_access, p] : prev.portal_access.filter(x => x !== p) }));
                          }} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Outlet Access</Label>
                    <div className="flex flex-wrap gap-2">
                      {outlets.map(o => (
                        <label key={o.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={newUser.outlet_access.includes(o.id)} onCheckedChange={(checked) => {
                            setNewUser(prev => ({ ...prev, outlet_access: checked ? [...prev.outlet_access, o.id] : prev.outlet_access.filter(x => x !== o.id) }));
                          }} />
                          {o.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Create User</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Portals</TableHead>
                    <TableHead>Outlets</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-[hsl(var(--primary))]">{u.name?.charAt(0)}</span>
                          </div>
                          {u.name} {u.is_superadmin && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">Admin</Badge>}
                          {u.must_change_password && <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30">Reset Pending</Badge>}
                          {!u.is_active && u.invite_token && <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Invited</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{u.email}</TableCell>
                      <TableCell><div className="flex gap-1 flex-wrap">{u.portal_access?.map(p => <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>)}</div></TableCell>
                      <TableCell className="text-sm">{u.outlet_access?.length || 0} outlets</TableCell>
                      <TableCell>{u.is_active ? <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">Active</Badge> : <Badge variant="destructive" className="text-[9px]">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => viewSessions(u)} data-testid={`admin-sessions-${u.id}`} title="Riwayat login">
                            <Clock className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setResetTarget(u); setResetCustomPw(''); setResetResult(null); }} data-testid={`admin-reset-pw-${u.id}`}>
                            <KeyRound className="w-3 h-3" /> Reset PW
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
              <DialogTrigger asChild><Button className="gap-2" data-testid="create-role-button"><Plus className="w-4 h-4" /> Create Role</Button></DialogTrigger>
              <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-2xl max-h-[80vh]">
                <DialogHeader><DialogTitle>Create Custom Role</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Role Name</Label><Input value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                    <div><Label>Description</Label><Input value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Portal Access</Label>
                    <div className="flex flex-wrap gap-3">
                      {portals.map(p => (
                        <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={newRole.portal_access.includes(p)} onCheckedChange={(checked) => {
                            setNewRole(prev => ({ ...prev, portal_access: checked ? [...prev.portal_access, p] : prev.portal_access.filter(x => x !== p) }));
                          }} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Permissions</Label>
                    <ScrollArea className="h-[300px] pr-4">
                      {Object.entries(permCatalog).map(([module, data]) => (
                        <div key={module} className="mb-4">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">{data.label || module}</h5>
                          <div className="grid grid-cols-2 gap-1">
                            {data.permissions?.map(perm => (
                              <label key={perm} className="flex items-center gap-1.5 text-sm cursor-pointer py-1">
                                <Checkbox checked={newRole.permissions.includes(perm)} onCheckedChange={() => togglePermission(perm)} />
                                <span className="text-xs">{perm.split('.')[1]?.replace(/_/g, ' ')}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                  <Button type="submit" className="w-full">Create Role</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{role.name}</h3>
                    {role.is_system && <Badge variant="outline" className="text-[9px]">System</Badge>}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {role.portal_access?.map(p => <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>)}
                  </div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {role.permissions?.includes('*') ? 'All permissions' : `${role.permissions?.length || 0} permissions`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Outlets Tab */}
        <TabsContent value="outlets" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Outlet</TableHead><TableHead>City</TableHead><TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outlets.map(o => (
                    <TableRow key={o.id} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                          {o.name}
                        </div>
                      </TableCell>
                      <TableCell>{o.city}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))] text-sm">{o.address}</TableCell>
                      <TableCell className="text-sm">{o.phone}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${o.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400'}`}>{o.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetResult(null); } }}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))] border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          {!resetResult ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                Reset password untuk <strong>{resetTarget?.name}</strong> ({resetTarget?.email}).
                User akan dipaksa mengganti password saat login berikutnya.
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Password Sementara (opsional - kosongkan untuk auto-generate)</Label>
                <Input value={resetCustomPw} onChange={(e) => setResetCustomPw(e.target.value)} placeholder="min 6 karakter" data-testid="admin-reset-custom-pw" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
                <Button variant="destructive" onClick={handleResetPassword} data-testid="admin-reset-submit">
                  <KeyRound className="w-4 h-4 mr-1" /> Reset Password
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs">
                ✅ Password berhasil di-reset. Berikan password sementara ini ke user.
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Email</Label>
                <div className="px-3 py-2 rounded-lg bg-[var(--glass-bg-strong)] text-sm font-mono">{resetResult.email}</div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Password Sementara</Label>
                <div className="flex gap-2">
                  <div className="px-3 py-2 flex-1 rounded-lg bg-[var(--glass-bg-strong)] text-sm font-mono font-semibold text-[hsl(var(--primary))]" data-testid="admin-reset-temp-password">
                    {resetResult.temporary_password}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(resetResult.temporary_password)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => { setResetTarget(null); setResetResult(null); fetchData(); }} data-testid="admin-reset-done">Selesai</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session history dialog */}
      <Dialog open={!!sessionsTarget} onOpenChange={(o) => { if (!o) { setSessionsTarget(null); setSessionsList([]); } }}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))] border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-[hsl(var(--primary))]" /> Riwayat Login</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">User: <strong>{sessionsTarget?.name}</strong> ({sessionsTarget?.email})</p>
            {sessionsList.length === 0 ? (
              <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Belum ada riwayat login</div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto space-y-1.5">
                {sessionsList.map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{s.timestamp ? new Date(s.timestamp).toLocaleString('id-ID') : '-'}</span>
                      <Badge variant="outline" className="text-[9px]">login</Badge>
                    </div>
                    {s.ip_address && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">IP: {s.ip_address}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
