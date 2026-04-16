'use client';

import { useState } from 'react';
import {
  useUsers,
  useAdminUserContainers, useAdminUserImages, useAdminUserTokens,
  useAdminContainerAction, useImpersonate,
} from '@/src/useCases/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  UserPlus, Trash2, Loader2, Eye, Box, Image as ImageIcon,
  KeyRound, Square, Pause, Pencil, MonitorSmartphone,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/data/api';
import { User } from '@/src/domain/entities';
import { useRouter } from 'next/navigation';

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
  const [formError, setFormError] = useState('');

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
      setFormError('');
    },
    onError: (err: any) => setFormError(err.response?.data?.message || 'Failed to create user.'),
  });

  // ── Edit user ─────────────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    port_range: '', storage_limit_mb: '', cpu_limit: '', ram_limit_mb: '', password: '',
  });
  const [editError, setEditError] = useState('');

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
      setEditError('');
    },
    onError: (err: any) => setEditError(err.response?.data?.message || 'Failed to update user.'),
  });

  // ── Delete user ───────────────────────────────────────────────────────────
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/admin/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  // ── Impersonation ─────────────────────────────────────────────────────────
  const impersonateMutation = useImpersonate();

  const handleImpersonate = async (user: User) => {
    try {
      const data = await impersonateMutation.mutateAsync(user.id);
      // Save admin token for recovery
      const currentToken = localStorage.getItem('token')!;
      localStorage.setItem('admin_token', currentToken);
      // Store impersonation context
      localStorage.setItem('impersonating_user', JSON.stringify({ username: user.username, id: user.id }));
      // Switch to user token
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Impersonation failed.');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Admin Panel</h2>
          <p className="text-slate-400 text-sm">Manage users and system resources.</p>
        </div>
        <Button onClick={() => setAddUserOpen(true)} className="flex items-center gap-2">
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <h3 className="font-medium text-slate-200">Registered Users</h3>
          {usersLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Username</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Port Range</th>
                <th className="px-5 py-3">CPU</th>
                <th className="px-5 py-3">RAM</th>
                <th className="px-5 py-3">Storage</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.length === 0 && (
                <tr><td colSpan={6} className="text-center p-6 text-slate-500">No users found.</td></tr>
              )}
              {users?.map(u => (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs border ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{u.port_range}</td>
                  <td className="px-5 py-3 text-xs">{formatCpu(u.cpu_limit)}</td>
                  <td className="px-5 py-3 text-xs">{formatStorage(u.ram_limit_mb)}</td>
                  <td className="px-5 py-3 text-xs">{formatStorage(u.storage_limit_mb)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Inspect overview */}
                      <button onClick={() => setInspectUser(u)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors" title="View Resources Overview">
                        <Eye size={15} />
                      </button>
                      {u.role !== 'admin' && (
                        <>
                          {/* Full impersonation */}
                          <button
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonateMutation.isPending}
                            className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                            title="View App as This User"
                          >
                            <MonitorSmartphone size={15} />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditUser(u);
                              setEditForm({ 
                                port_range: u.port_range, 
                                storage_limit_mb: String(u.storage_limit_mb), 
                                cpu_limit: String(u.cpu_limit), 
                                ram_limit_mb: String(u.ram_limit_mb),
                                password: '' 
                              });
                              setEditError('');
                            }}
                            className="p-1.5 text-slate-500 hover:text-yellow-400 transition-colors" title="Edit User"
                          >
                            <Pencil size={15} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => { if (confirm(`Delete "${u.username}"?`)) deleteUserMutation.mutate(u.id); }}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      <Modal isOpen={addUserOpen} onClose={() => { setAddUserOpen(false); setFormError(''); }} title="Add New User">
        <form onSubmit={e => { e.preventDefault(); createUserMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Username</label>
              <Input autoFocus required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Password</label>
              <Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Port Range</label>
            <Input value={form.port_range} onChange={e => setForm({ ...form, port_range: e.target.value })} placeholder="12000-13000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">CPU Limit (vCPUs)</label>
              <Input type="number" step="0.5" min="0" value={form.cpu_limit} onChange={e => setForm({ ...form, cpu_limit: e.target.value })} placeholder="0 = unlimited" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">RAM Limit (MB)</label>
              <Input type="number" value={form.ram_limit_mb} onChange={e => setForm({ ...form, ram_limit_mb: e.target.value })} placeholder="1024" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Storage Limit (MB)</label>
              <Input type="number" value={form.storage_limit_mb} onChange={e => setForm({ ...form, storage_limit_mb: e.target.value })} placeholder="5120" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Set CPU, RAM or Storage to <strong>0</strong> for unlimited.</p>
          {formError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{formError}</p>}
          <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Creating...</> : 'Create User'}
          </Button>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); setEditError(''); }} title={`Edit: ${editUser?.username}`}>
        <form onSubmit={e => { e.preventDefault(); updateUserMutation.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Port Range</label>
            <Input value={editForm.port_range} onChange={e => setEditForm({ ...editForm, port_range: e.target.value })} placeholder="12000-13000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">CPU Limit (vCPUs)</label>
              <Input type="number" step="0.5" min="0" value={editForm.cpu_limit} onChange={e => setEditForm({ ...editForm, cpu_limit: e.target.value })} placeholder="0 = unlimited" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">RAM Limit (MB)</label>
              <Input type="number" value={editForm.ram_limit_mb} onChange={e => setEditForm({ ...editForm, ram_limit_mb: e.target.value })} placeholder="1024" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Storage Limit (MB)</label>
              <Input type="number" value={editForm.storage_limit_mb} onChange={e => setEditForm({ ...editForm, storage_limit_mb: e.target.value })} placeholder="5120" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">New Password <span className="text-slate-600">(leave blank to keep)</span></label>
            <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" />
          </div>
          {editError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{editError}</p>}
          <Button type="submit" className="w-full" disabled={updateUserMutation.isPending}>
            {updateUserMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Changes'}
          </Button>
        </form>
      </Modal>

      {/* Inspect Overview Modal */}
      <Modal isOpen={!!inspectUser} onClose={() => setInspectUser(null)} title={`Overview: ${inspectUser?.username}`} className="max-w-2xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Quick Stats */}
          {inspectUser && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Port Range', value: inspectUser.port_range },
                { label: 'CPU Limit', value: formatCpu(inspectUser.cpu_limit) },
                { label: 'RAM Limit', value: formatStorage(inspectUser.ram_limit_mb) },
                { label: 'Storage', value: formatStorage(inspectUser.storage_limit_mb) },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-sm font-medium text-slate-200">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Containers */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
              <Box size={16} className="text-blue-400" /> Containers ({userContainers?.length ?? 0})
            </h4>
            {!userContainers?.length ? (
              <p className="text-xs text-slate-500">No containers deployed.</p>
            ) : (
              <div className="space-y-2">
                {userContainers.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.image} · <span className="capitalize">{c.status}</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      {containerActionMutation.isPending && containerActionMutation.variables?.id === c.id ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1">
                          <Loader2 size={14} className="animate-spin text-blue-400" />
                          <span className="capitalize">{containerActionMutation.variables.action}ing...</span>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => containerActionMutation.mutate({ id: c.id, action: 'stop' })} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title="Stop"><Square size={14} /></button>
                          <button onClick={() => containerActionMutation.mutate({ id: c.id, action: 'pause' })} className="p-1.5 text-slate-400 hover:text-yellow-400 transition-colors" title="Pause"><Pause size={14} /></button>
                          <button onClick={() => { if (confirm('Remove container?')) containerActionMutation.mutate({ id: c.id, action: 'delete' }); }} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title="Remove"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-purple-400" /> Images ({userImages?.length ?? 0})
            </h4>
            {!userImages?.length ? (
              <p className="text-xs text-slate-500">No images tracked.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userImages.map(img => (
                  <span key={img.id} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                    {img.tags[0] || img.id.substring(7, 19)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tokens */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
              <KeyRound size={16} className="text-blue-400" /> DockerHub Tokens ({userTokens?.length ?? 0})
            </h4>
            {!userTokens?.length ? (
              <p className="text-xs text-slate-500">No tokens saved.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userTokens.map(alias => (
                  <span key={alias} className="text-xs bg-slate-800 border border-slate-700 text-blue-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <KeyRound size={10} /> {alias}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Full impersonation CTA */}
          {inspectUser?.role !== 'admin' && (
            <div className="pt-2 border-t border-slate-800">
              <Button
                className="w-full flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-300 hover:text-amber-200"
                onClick={() => { setInspectUser(null); handleImpersonate(inspectUser!); }}
                disabled={impersonateMutation.isPending}
              >
                <MonitorSmartphone size={16} />
                {impersonateMutation.isPending ? 'Switching...' : `View Full App as ${inspectUser?.username}`}
              </Button>
              <p className="text-xs text-slate-500 text-center mt-2">
                You will be able to manage containers, files, and images as this user. An admin banner will remind you. Click "Exit & Return to Admin" to go back.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
