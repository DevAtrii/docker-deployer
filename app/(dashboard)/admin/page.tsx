'use client';

import { useState } from 'react';
import {
  useUsers,
  useAdminUserContainers, useAdminUserImages, useAdminUserTokens,
  useAdminContainerAction, useImpersonate,
} from '@/src/useCases/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  UserPlus, Trash2, Loader2, Eye, Box, Image as ImageIcon,
  KeyRound, Square, Pause, Pencil, MonitorSmartphone,
  ShieldCheck, Activity, Database, Cpu, HardDrive, Hash, Lock, Search
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/data/api';
import { User } from '@/src/domain/entities';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminPage() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const qc = useQueryClient();
  const router = useRouter();

  // ── Create user ───────────────────────────────────────────────────────────
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [form, setForm] = useState({
    username: '', password: '',
    port_range: '12000-13000', storage_limit_mb: '5120', cpu_limit: '0', ram_limit_mb: '1024',
  });

  const createUserMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/users', {
      username: form.username, password: form.password,
      port_range: form.port_range,
      storage_limit_mb: parseInt(form.storage_limit_mb) || 5120,
      cpu_limit: parseFloat(form.cpu_limit) || 0,
      ram_limit_mb: parseInt(form.ram_limit_mb) || 1024,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setAddUserOpen(false);
      setForm({ username: '', password: '', port_range: '12000-13000', storage_limit_mb: '5120', cpu_limit: '0', ram_limit_mb: '1024' });
      toast.success(`User ${form.username} created successfully`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user.'),
  });

  // ── Edit user ─────────────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    port_range: '', storage_limit_mb: '', cpu_limit: '', ram_limit_mb: '', password: '',
  });

  const updateUserMutation = useMutation({
    mutationFn: () => apiClient.patch(`/admin/users/${editUser?.id}`, {
      port_range: editForm.port_range || undefined,
      storage_limit_mb: editForm.storage_limit_mb ? parseInt(editForm.storage_limit_mb) : undefined,
      cpu_limit: editForm.cpu_limit !== '' ? parseFloat(editForm.cpu_limit) : undefined,
      ram_limit_mb: editForm.ram_limit_mb !== '' ? parseInt(editForm.ram_limit_mb) : undefined,
      password: editForm.password || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
      toast.success('User updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update user.'),
  });

  // ── Delete user ───────────────────────────────────────────────────────────
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/admin/users/${userId}`),
    onSuccess: () => {
       qc.invalidateQueries({ queryKey: ['admin-users'] });
       toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user')
  });

  // ── Impersonation ─────────────────────────────────────────────────────────
  const impersonateMutation = useImpersonate();

  const handleImpersonate = async (user: User) => {
    try {
      const data = await impersonateMutation.mutateAsync(user.id);
      const currentToken = localStorage.getItem('token')!;
      localStorage.setItem('admin_token', currentToken);
      localStorage.setItem('impersonating_user', JSON.stringify({ username: user.username, id: user.id }));
      localStorage.setItem('token', data.token);
      toast.success(`Switching to ${user.username}...`);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Impersonation failed.');
    }
  };

  // ── Inspect user ──────────────────────────────────────────────────────────
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const { data: userContainers } = useAdminUserContainers(inspectUser?.id ?? null);
  const { data: userImages } = useAdminUserImages(inspectUser?.id ?? null);
  const { data: userTokens } = useAdminUserTokens(inspectUser?.id ?? null);
  const containerActionMutation = useAdminContainerAction();

  const formatCpu = (cpu: number) => cpu === 0 ? '∞ Unlimited' : `${cpu} vCPU${cpu !== 1 ? 's' : ''}`;
  const formatStorage = (mb: number) => mb === 0 ? '∞ Unlimited' : `${mb} MB`;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Terminal</h2>
          <p className="text-muted-foreground">Manage global infrastructure and user access control.</p>
        </div>
        <Button onClick={() => setAddUserOpen(true)} className="w-full md:w-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Provision User
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> System Users
            </CardTitle>
            {usersLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="pl-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Identity</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Ports</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Resource Quotas</TableHead>
                <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 && !usersLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No registered tenants found</TableCell>
                </TableRow>
              )}
              {users?.map(u => (
                <tr key={u.id} className="group hover:bg-muted/20 transition-colors border-b border-border/40">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm">{u.username}</span>
                      <Badge variant={u.role === 'admin' ? "default" : "outline"} className="w-fit text-[9px] h-4 uppercase font-bold tracking-tighter">
                        {u.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Hash className="h-3 w-3 opacity-50" />
                      {u.port_range}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                       <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 border-none rounded-sm font-mono text-[9px]">
                         CPU: {formatCpu(u.cpu_limit)}
                       </Badge>
                       <Badge variant="secondary" className="bg-pink-500/10 text-pink-500 border-none rounded-sm font-mono text-[9px]">
                         RAM: {formatStorage(u.ram_limit_mb)}
                       </Badge>
                       <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none rounded-sm font-mono text-[9px]">
                         DISK: {formatStorage(u.storage_limit_mb)}
                       </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInspectUser(u)} title="Deep Inspect">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {u.role !== 'admin' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/5" onClick={() => handleImpersonate(u)} title="Impersonate">
                            <MonitorSmartphone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditUser(u);
                            setEditForm({ 
                              port_range: u.port_range, 
                              storage_limit_mb: String(u.storage_limit_mb), 
                              cpu_limit: String(u.cpu_limit), 
                              ram_limit_mb: String(u.ram_limit_mb),
                              password: '' 
                            });
                          }} title="Configure">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => { if (confirm(`Remove access for ${u.username}?`)) deleteUserMutation.mutate(u.id); }} title="Revoke Access">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Provision User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle>Provision New Tenant</DialogTitle>
            <DialogDescription>Initialize a new workspace with dedicated resource quotas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createUserMutation.mutate(); }}>
            <div className="grid gap-6 py-6 font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="un">Username</Label>
                  <Input id="un" autoFocus required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="acme_corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">Password</Label>
                  <Input id="pw" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr">Global Port Range</Label>
                <Input id="pr" value={form.port_range} onChange={e => setForm({ ...form, port_range: e.target.value })} placeholder="12000-13000" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="cl" className="text-xs">vCPUs</Label>
                  <Input id="cl" type="number" step="0.5" min="0" value={form.cpu_limit} onChange={e => setForm({ ...form, cpu_limit: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="rl" className="text-xs">RAM (MB)</Label>
                  <Input id="rl" type="number" value={form.ram_limit_mb} onChange={e => setForm({ ...form, ram_limit_mb: e.target.value })} placeholder="1024" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="sl" className="text-xs">Storage (MB)</Label>
                  <Input id="sl" type="number" value={form.storage_limit_mb} onChange={e => setForm({ ...form, storage_limit_mb: e.target.value })} placeholder="5120" />
                </div>
              </div>
            </div>
            <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t border-border/50">
               <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={createUserMutation.isPending}>
                 {createUserMutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                 Deploy Credentials
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Configure User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(val) => { if(!val) setEditUser(null) }}>
        <DialogContent className="sm:max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle>Configure Tenant: {editUser?.username}</DialogTitle>
            <DialogDescription>Modify workspace limits or rotate security credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateUserMutation.mutate(); }}>
            <div className="grid gap-6 py-4 font-medium">
              <div className="space-y-2">
                <Label htmlFor="epr">Port Allocation Range</Label>
                <Input id="epr" value={editForm.port_range} onChange={e => setEditForm({ ...editForm, port_range: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">CPU Core Limit</Label>
                  <Input type="number" step="0.5" min="0" value={editForm.cpu_limit} onChange={e => setEditForm({ ...editForm, cpu_limit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">RAM Limit (MB)</Label>
                  <Input type="number" value={editForm.ram_limit_mb} onChange={e => setEditForm({ ...editForm, ram_limit_mb: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Disk Quota (MB)</Label>
                  <Input type="number" value={editForm.storage_limit_mb} onChange={e => setEditForm({ ...editForm, storage_limit_mb: e.target.value })} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="epw">Reset Password <span className="font-normal text-muted-foreground">(Optional)</span></Label>
                <Input id="epw" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
              </div>
            </div>
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
               <Button type="submit" disabled={updateUserMutation.isPending}>
                 {updateUserMutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                 Commit Changes
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deep Inspection Dialog */}
      <Dialog open={!!inspectUser} onOpenChange={(val) => { if(!val) setInspectUser(null) }}>
        <DialogContent className="sm:max-w-[700px] border-border/50 p-0 overflow-hidden shadow-2xl">
          <div className="p-6 pb-0">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                   <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <DialogTitle>Deep Inspection: {inspectUser?.username}</DialogTitle>
                   <DialogDescription>Live monitoring of tenant resources and running processes.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 pt-4">
            <ScrollArea className="h-[450px] pr-4">
               <div className="space-y-8">
                  {/* Quota Summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                     <InspectionStat label="Core Allocation" value={formatCpu(inspectUser?.cpu_limit ?? 0)} icon={<Cpu className="h-4 w-4 text-indigo-500" />} />
                     <InspectionStat label="Memory Pool" value={formatStorage(inspectUser?.ram_limit_mb ?? 0)} icon={<CardTitle className="p-0 m-0"><HardDrive className="h-4 w-4 text-pink-500" /></CardTitle>} />
                     <InspectionStat label="Disk Slice" value={formatStorage(inspectUser?.storage_limit_mb ?? 0)} icon={<Database className="h-4 w-4 text-orange-500" />} />
                  </div>

                  <Separator className="opacity-50" />

                  {/* Operational Data */}
                  <Tabs defaultValue="containers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-xl p-1 h-11">
                      <TabsTrigger value="containers" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Containers</TabsTrigger>
                      <TabsTrigger value="images" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Images</TabsTrigger>
                      <TabsTrigger value="tokens" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Auth</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="containers" className="pt-4 space-y-3">
                       {!userContainers?.length ? (
                          <div className="text-center py-10 text-muted-foreground italic text-xs bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">No active workloads</div>
                       ) : (
                          userContainers.map(c => (
                            <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all group">
                               <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                     <Box className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-sm font-bold">{c.name}</span>
                                     <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                                        <div className={`h-1.5 w-1.5 rounded-full ${c.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-destructive'}`} />
                                        {c.status} · {c.image.substring(0, 20)}...
                                     </span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-1">
                                  {containerActionMutation.isPending && containerActionMutation.variables?.id === c.id ? (
                                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                     <>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => containerActionMutation.mutate({ id: c.id, action: 'stop' })}><Square size={12} /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if(confirm('Force remove process?')) containerActionMutation.mutate({ id: c.id, action: 'delete' }) }}><Trash2 size={12} /></Button>
                                     </>
                                  )}
                               </div>
                            </div>
                          ))
                       )}
                    </TabsContent>

                    <TabsContent value="images" className="pt-4">
                       <div className="flex flex-wrap gap-1.5">
                          {userImages?.map(img => (
                            <Badge key={img.id} variant="secondary" className="bg-muted hover:bg-muted font-mono text-[10px] h-6 px-2.5 rounded-md border border-border/50">
                               {img.tags[0] || img.id.substring(7, 19)}
                            </Badge>
                          ))}
                          {!userImages?.length && <p className="text-xs text-muted-foreground w-full text-center py-6 italic">Repository is clean</p>}
                       </div>
                    </TabsContent>

                    <TabsContent value="tokens" className="pt-4">
                        <div className="grid grid-cols-2 gap-2">
                           {userTokens?.map(alias => (
                              <div key={alias} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/50 text-[11px] font-bold">
                                 <KeyRound className="h-3 w-3 text-primary" />
                                 {alias}
                              </div>
                           ))}
                           {!userTokens?.length && <p className="text-xs text-muted-foreground w-full text-center py-6 italic col-span-2">No stored credentials</p>}
                        </div>
                    </TabsContent>
                  </Tabs>
               </div>
            </ScrollArea>
          </div>

          <DialogFooter className="bg-muted/30 p-6 border-t border-border/50 mt-2">
             <div className="flex flex-col w-full gap-3">
                {inspectUser?.role !== 'admin' && (
                   <Button onClick={() => { setInspectUser(null); handleImpersonate(inspectUser!); }} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all">
                      <MonitorSmartphone className="mr-2 h-4 w-4" />
                      Switch Context to {inspectUser?.username}
                   </Button>
                )}
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground px-2">
                   <span>ID: {inspectUser?.id}</span>
                   <span>Status: Verified Tenant</span>
                </div>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InspectionStat({ label, value, icon }: any) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex flex-col gap-1 hover:bg-muted/50 transition-colors">
       <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">{label}</span>
          {icon}
       </div>
       <span className="text-sm font-bold truncate">{value}</span>
    </div>
  )
}
