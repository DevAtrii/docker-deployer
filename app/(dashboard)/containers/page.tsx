'use client';

import { useState } from 'react';
import { useContainers, useDeployContainer, useContainerAction, useImages, useRedeployContainer, useRedeployStatus, useContainerStats } from '@/src/useCases/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Play, Square, Pause, RotateCcw, Trash2, Terminal, Plus, Box, Loader2, RefreshCcw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/src/data/api';

export default function ContainersPage() {
  const { data: containers, isLoading } = useContainers();
  const { data: trackedImages } = useImages();
  const deployMutation = useDeployContainer();
  const actionMutation = useContainerAction();
  const qc = useQueryClient();

  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [deployForm, setDeployForm] = useState({ 
    name: '', image: '', internalPort: '', hostPort: '',
    memLimit: '', memSwapLimit: '', cpuLimit: ''
  });
  const [volumes, setVolumes] = useState<{ host_path: string; container_path: string; mode: string }[]>([]);
  const [deployError, setDeployError] = useState('');

  const [logsModal, setLogsModal] = useState<{ isOpen: boolean; containerId: string | null }>({ isOpen: false, containerId: null });

  // Redeploy state
  const redeployMutation = useRedeployContainer();
  const [redeployTaskId, setRedeployTaskId] = useState<string | null>(null);
  const { data: redeployStatus } = useRedeployStatus(redeployTaskId);

  useEffect(() => {
    if (redeployStatus?.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['containers'] });
    }
  }, [redeployStatus?.status, qc]);

  const addVolume = () => setVolumes(v => [...v, { host_path: '', container_path: '', mode: 'rw' }]);
  const updateVolume = (i: number, key: string, value: string) =>
    setVolumes(v => v.map((vol, idx) => (idx === i ? { ...vol, [key]: value } : vol)));
  const removeVolume = (i: number) => setVolumes(v => v.filter((_, idx) => idx !== i));

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeployError('');
    const ports: Record<string, string> = {};
    if (deployForm.internalPort && deployForm.hostPort) {
      ports[`${deployForm.internalPort}/tcp`] = deployForm.hostPort;
    }
    try {
      await deployMutation.mutateAsync({
        name: deployForm.name,
        image: deployForm.image,
        port_mappings: ports,
        volumes: volumes.filter(v => v.host_path && v.container_path),
        mem_limit: deployForm.memLimit ? `${deployForm.memLimit}m` : undefined,
        memswap_limit: deployForm.memSwapLimit ? `${deployForm.memSwapLimit}m` : undefined,
        cpu_limit: deployForm.cpuLimit ? parseFloat(deployForm.cpuLimit) : undefined,
      });
      setIsDeployOpen(false);
      setDeployForm({ 
        name: '', image: '', internalPort: '', hostPort: '',
        memLimit: '', memSwapLimit: '', cpuLimit: ''
      });
      setVolumes([]);
    } catch (err: any) {
      setDeployError(err.response?.data?.message || 'Deployment failed.');
    }
  };

  const handleRedeploy = async (containerId: string, containerName: string) => {
    if (!confirm(`Fetch & Redeploy "${containerName}"?\n\nThis will:\n1. Pull the latest version of the same image\n2. Stop and remove the current container\n3. Start a fresh container with the same configuration\n\nProceed?`)) return;
    try {
      const res = await redeployMutation.mutateAsync(containerId);
      setRedeployTaskId(res.task_id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start redeploy.');
    }
  };

  const StatusDot = ({ status }: { status: string }) => {
    const color =
      status === 'running' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
      status === 'paused' ? 'bg-yellow-500' : 'bg-red-500';
    return <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Containers</h2>
          <p className="text-slate-400 text-sm">Manage your deployed docker containers.</p>
        </div>
        <Button onClick={() => setIsDeployOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Deploy Container
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        )}
        {!isLoading && containers?.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
            <Box size={40} className="mx-auto text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No containers deployed</h3>
            <p className="text-sm text-slate-500 mt-1">Deploy your first container to get started.</p>
          </div>
        )}
        {containers?.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center border border-slate-700 flex-shrink-0">
                  <Box className="text-blue-400" size={20} />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-0.5 truncate">{c.image}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-4 flex-1">
              <div className="flex items-center space-x-2 text-sm text-slate-300 mb-2">
                <StatusDot status={c.status} />
                <span className="font-mono capitalize">{c.status}</span>
              </div>
              <div className="text-xs text-slate-400">
                <strong>Ports:</strong>{' '}
                {Object.keys(c.ports).length > 0
                  ? Object.entries(c.ports).map(([k, v]) => `${v}→${k}`).join(', ')
                  : 'None'}
              </div>
              <ContainerUsageBars container={c} />
            </CardContent>
            {actionMutation.isPending && actionMutation.variables?.id === c.id ? (
              <div className="px-4 py-3 bg-slate-900/40 border-t border-slate-800 flex justify-center items-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="capitalize font-medium">{actionMutation.variables.action}ing container...</span>
              </div>
            ) : (
              <div className="px-4 py-3 bg-slate-900/40 border-t border-slate-800 flex flex-wrap gap-1.5 justify-center">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => actionMutation.mutate({ id: c.id, action: 'start' })} title="Start">
                  <Play size={15} className="text-green-400" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => actionMutation.mutate({ id: c.id, action: 'stop' })} title="Stop">
                  <Square size={15} className="text-red-400" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => actionMutation.mutate({ id: c.id, action: 'pause' })} title="Pause">
                  <Pause size={15} className="text-yellow-400" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => actionMutation.mutate({ id: c.id, action: 'resume' })} title="Resume">
                  <RotateCcw size={15} className="text-blue-400" />
                </Button>
                <div className="w-px h-5 bg-slate-700 my-auto" />
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setLogsModal({ isOpen: true, containerId: c.id })} title="Logs">
                  <Terminal size={15} className="text-slate-300" />
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-8 px-2 text-cyan-500 hover:text-cyan-300"
                  onClick={() => handleRedeploy(c.id, c.name)}
                  disabled={redeployMutation.isPending}
                  title="Fetch & Redeploy (pull latest + restart with same config)"
                >
                  <RefreshCcw size={15} />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { if (confirm('Delete container?')) actionMutation.mutate({ id: c.id, action: 'delete' }); }} title="Delete">
                  <Trash2 size={15} className="text-red-500" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Deploy Modal */}
      <Modal isOpen={isDeployOpen} onClose={() => { setIsDeployOpen(false); setDeployError(''); setVolumes([]); }} title="Deploy Container" className="max-w-2xl">
        <form onSubmit={handleDeploy} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Container Name</label>
              <Input required value={deployForm.name} onChange={e => setDeployForm({ ...deployForm, name: e.target.value })} placeholder="my-nginx" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Docker Image</label>
              <select
                required
                value={deployForm.image}
                onChange={e => setDeployForm({ ...deployForm, image: e.target.value })}
                className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="" disabled>Select an image...</option>
                {trackedImages?.length === 0 && <option value="" disabled>No images pulled yet</option>}
                {trackedImages?.map(img => {
                  const tag = img.tags[0] || img.id.substring(7, 19);
                  return <option key={img.id} value={tag}>{tag}</option>;
                })}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Container Port</label>
              <Input type="number" value={deployForm.internalPort} onChange={e => setDeployForm({ ...deployForm, internalPort: e.target.value })} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Host Port</label>
              <Input type="number" value={deployForm.hostPort} onChange={e => setDeployForm({ ...deployForm, hostPort: e.target.value })} placeholder="12001" />
            </div>
          </div>


          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">vCPUs</label>
              <Input type="number" step="0.1" value={deployForm.cpuLimit} onChange={e => setDeployForm({ ...deployForm, cpuLimit: e.target.value })} placeholder="0.5" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">RAM (MB)</label>
              <Input type="number" value={deployForm.memLimit} onChange={e => setDeployForm({ ...deployForm, memLimit: e.target.value })} placeholder="512" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300">Swap (MB)</label>
              <Input type="number" value={deployForm.memSwapLimit} onChange={e => setDeployForm({ ...deployForm, memSwapLimit: e.target.value })} placeholder="1024" />
            </div>
          </div>

          {/* Volume Mounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Volume Mounts</label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addVolume}>
                <Plus size={13} className="mr-1" /> Add Volume
              </Button>
            </div>
            <p className="text-xs text-slate-500">Host paths are relative to your storage directory. The folder must already exist.</p>
            {volumes.length === 0 && (
              <p className="text-xs text-slate-600 italic">No volume mounts configured.</p>
            )}
            {volumes.map((vol, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-center">
                <Input value={vol.host_path} onChange={e => updateVolume(i, 'host_path', e.target.value)} placeholder="data/myapp" className="text-xs h-8" />
                <Input value={vol.container_path} onChange={e => updateVolume(i, 'container_path', e.target.value)} placeholder="/app/data" className="text-xs h-8" />
                <select
                  value={vol.mode}
                  onChange={e => updateVolume(i, 'mode', e.target.value)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-900/50 px-2 text-xs text-slate-100"
                >
                  <option value="rw">rw</option>
                  <option value="ro">ro</option>
                </select>
                <button type="button" onClick={() => removeVolume(i)} className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {deployError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{deployError}</p>}
          <Button type="submit" className="w-full" variant="premium" disabled={deployMutation.isPending}>
            {deployMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Deploying...</> : 'Deploy Container'}
          </Button>
        </form>
      </Modal>

      {/* Logs Modal */}
      <Modal isOpen={logsModal.isOpen} onClose={() => setLogsModal({ isOpen: false, containerId: null })} title="Container Logs" className="max-w-3xl">
        <div className="bg-slate-950 rounded p-4 h-96 overflow-auto font-mono text-xs text-green-400 border border-slate-800">
          <LogsViewer containerId={logsModal.containerId} />
        </div>
      </Modal>

      {/* Redeploy Progress Modal */}
      <Modal 
        isOpen={!!redeployTaskId} 
        onClose={() => { if(redeployStatus?.status !== 'running') { setRedeployTaskId(null); } }} 
        title="Redeploying Container" 
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Phase: <strong className="text-white">{redeployStatus?.phase || 'Initializing...'}</strong></span>
              {redeployStatus?.status === 'running' && <Loader2 size={16} className="animate-spin text-blue-400" />}
            </div>
            <div className="text-xs text-slate-500">
              Container: <span className="text-slate-300">{redeployStatus?.container_name}</span> | Image: <span className="text-slate-300">{redeployStatus?.image}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg h-80 overflow-y-auto font-mono text-xs text-slate-400 border border-slate-800 flex flex-col-reverse">
            <div className="space-y-0.5 whitespace-pre">
              {redeployStatus?.logs?.map((l: string, i: number) => (
                <div key={i}>{l}</div>
              ))}
              {redeployStatus?.logs?.length === 0 && <div>Starting redeploy process...</div>}
            </div>
          </div>

          {redeployStatus?.status === 'completed' && (
            <div className="space-y-3 pt-2">
              <div className="text-green-400 text-sm font-medium">Redeploy completed successfully!</div>
              <Button onClick={() => setRedeployTaskId(null)} className="w-full">Dismiss</Button>
            </div>
          )}

          {redeployStatus?.status === 'error' && (
            <div className="space-y-3 pt-2">
              <div className="text-red-400 text-sm font-medium">Redeploy failed. Check logs above.</div>
              <Button onClick={() => setRedeployTaskId(null)} variant="outline" className="w-full">Close</Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function LogsViewer({ containerId }: { containerId: string | null }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', containerId],
    queryFn: async () => (await apiClient.get(`/containers/${containerId}/logs`)).data.logs,
    enabled: !!containerId,
    refetchInterval: 3000,
  });
  if (isLoading) return <div>Loading logs...</div>;
  if (error) return <div className="text-red-500">Error fetching logs.</div>;
  if (!data) return <div>No logs.</div>;
  return <pre className="whitespace-pre-wrap">{data}</pre>;
}

function ContainerUsageBars({ container }: { container: any }) {
  const { data: stats } = useContainerStats(container.id, container.status === 'running');
  
  if (container.status !== 'running' || !stats) return null;

  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100.0 : 0;

  const memUsage = stats.memory_stats.usage || 0;
  const memLimit = stats.memory_stats.limit || 1;
  const memPercent = (memUsage / memLimit) * 100.0;

  const ProgressBar = ({ label, percent, value, color }: { label: string, percent: number, value: string, color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <span>{value} ({percent.toFixed(1)}%)</span>
      </div>
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-linear`} 
          style={{ width: `${Math.min(percent, 100)}%` }} 
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-slate-800/50">
      <ProgressBar label="CPU" percent={cpuPercent} value={`${(cpuPercent / 100).toFixed(2)} cores`} color="bg-blue-500" />
      <ProgressBar label="RAM" percent={memPercent} value={`${(memUsage / 1024 / 1024).toFixed(1)} MB`} color="bg-purple-500" />
    </div>
  );
}
