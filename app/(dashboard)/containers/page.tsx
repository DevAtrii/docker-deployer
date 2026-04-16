'use client';

import { useState, useEffect } from 'react';
import { useContainers, useDeployContainer, useContainerAction, useImages, useRedeployContainer, useRedeployStatus, useContainerStats } from '@/src/useCases/hooks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Play, Square, Pause, RotateCcw, Trash2, Terminal, Plus, Box,
  Loader2, RefreshCcw, MoreVertical, ExternalLink, Activity, HardDrive, Cpu
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/data/api';
import { toast } from 'sonner';

export default function ContainersPage() {
  const { data: containers, isLoading } = useContainers();
  const { data: trackedImages } = useImages();
  const deployMutation = useDeployContainer();
  const actionMutation = useContainerAction();
  const qc = useQueryClient();

  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [deployForm, setDeployForm] = useState({
    name: '', image: '',
    memLimit: '', memSwapLimit: '', cpuLimit: ''
  });
  const [portMappings, setPortMappings] = useState<{ container: string; host: string }[]>([]);
  const [volumes, setVolumes] = useState<{ host_path: string; container_path: string; mode: string }[]>([]);

  const [logsModal, setLogsModal] = useState<{ isOpen: boolean; containerId: string | null }>({ isOpen: false, containerId: null });

  // Redeploy state
  const redeployMutation = useRedeployContainer();
  const [redeployTaskId, setRedeployTaskId] = useState<string | null>(null);
  const { data: redeployStatus } = useRedeployStatus(redeployTaskId);

  useEffect(() => {
    if (redeployStatus?.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['containers'] });
      toast.success('Container redeployed successfully');
    } else if (redeployStatus?.status === 'error') {
      toast.error('Redeploy failed');
    }
  }, [redeployStatus?.status, qc]);

  const addVolume = () => setVolumes(v => [...v, { host_path: '', container_path: '', mode: 'rw' }]);
  const updateVolume = (i: number, key: string, value: string) =>
    setVolumes(v => v.map((vol, idx) => (idx === i ? { ...vol, [key]: value } : vol)));
  const removeVolume = (i: number) => setVolumes(v => v.filter((_, idx) => idx !== i));

  const addPortMapping = () => setPortMappings(p => [...p, { container: '', host: '' }]);
  const updatePortMapping = (i: number, key: string, value: string) =>
    setPortMappings(p => p.map((port, idx) => (idx === i ? { ...port, [key]: value } : port)));
  const removePortMapping = (i: number) => setPortMappings(p => p.filter((_, idx) => idx !== i));

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    const ports: Record<string, string> = {};
    portMappings.forEach(p => {
      if (p.container && p.host) {
        ports[`${p.container}/tcp`] = p.host;
      }
    });

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
        name: '', image: '',
        memLimit: '', memSwapLimit: '', cpuLimit: ''
      });
      setPortMappings([]);
      setVolumes([]);
      toast.success('Container scheduled for deployment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deployment failed.');
    }
  };

  const handleAction = async (id: string, action: any, containerName: string) => {
    try {
      await actionMutation.mutateAsync({ id, action });
      toast.success(`${containerName}: ${action} command sent`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} container.`);
    }
  }

  const handleRedeploy = async (containerId: string, containerName: string) => {
    try {
      const res = await redeployMutation.mutateAsync(containerId);
      setRedeployTaskId(res.task_id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start redeploy.');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'paused': return 'outline';
      case 'exited': case 'dead': return 'destructive';
      default: return 'secondary';
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Containers</h2>
          <p className="text-muted-foreground">Manage and monitor your running instances.</p>
        </div>
        <Button onClick={() => setIsDeployOpen(true)} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Deploy Instance
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted/50 rounded-t-xl" />
            <CardContent className="h-32" />
          </Card>
        ))}

        {!isLoading && containers?.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Box size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-semibold">No active containers</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Your deployment pipeline is empty. Click the button above to launch your first Docker image.
            </p>
          </div>
        )}

        {containers?.map((c) => (
          <Card key={c.id} className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
            <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shadow-sm">
                    <Box className="text-primary h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold truncate">{c.name}</CardTitle>
                    <CardDescription className="font-mono text-[10px] uppercase tracking-tighter opacity-70 truncate">{c.image}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Container Ops</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAction(c.id, 'start', c.name)} disabled={c.status === 'running'}>
                      <Play className="mr-2 h-4 w-4 text-emerald-500" /> Start
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction(c.id, 'stop', c.name)} disabled={c.status === 'exited'}>
                      <Square className="mr-2 h-4 w-4 text-red-500" /> Stop
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction(c.id, 'pause', c.name)} disabled={c.status !== 'running'}>
                      <Pause className="mr-2 h-4 w-4 text-yellow-500" /> Pause
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction(c.id, 'resume', c.name)} disabled={c.status !== 'paused'}>
                      <RotateCcw className="mr-2 h-4 w-4 text-blue-500" /> Resume
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLogsModal({ isOpen: true, containerId: c.id })}>
                      <Terminal className="mr-2 h-4 w-4" /> View Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-primary focus:text-primary focus:bg-primary/5"
                      onClick={() => handleRedeploy(c.id, c.name)}
                      disabled={redeployMutation.isPending}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Force Redeploy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/5"
                      onClick={() => { if (confirm('Permanently delete container?')) handleAction(c.id, 'delete', c.name) }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={getStatusVariant(c.status)} className="capitalize px-3 rounded-full font-bold tracking-tight">
                  {c.status}
                </Badge>
                {Object.keys(c.ports).length > 0 && (
                  <Badge variant="secondary" className="font-mono text-[10px] rounded-full">
                    {Object.values(c.ports)[0]} Port
                  </Badge>
                )}
              </div>

              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Public Access</p>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">
                    {Object.keys(c.ports).length > 0
                      ? `${window.location.hostname}:${Object.values(c.ports)[0]}`
                      : "No public ports"}
                  </span>
                </div>
              </div>

              <ContainerUsageBars container={c} />
            </CardContent>
            {actionMutation.isPending && actionMutation.variables?.id === c.id && (
              <CardFooter className="py-2 bg-primary/5 border-t border-primary/10 flex items-center justify-center gap-2 text-[10px] font-bold text-primary uppercase animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating Instance State...
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Deploy Dialog */}
      <Dialog open={isDeployOpen} onOpenChange={(val) => { if (!val) { setIsDeployOpen(false); setPortMappings([]); setVolumes([]); } }}>
        <DialogContent className="sm:max-w-[600px] border-border/50">
          <form onSubmit={handleDeploy}>
            <DialogHeader>
              <DialogTitle>Deploy Instance</DialogTitle>
              <DialogDescription>Configure your container settings and resource limits.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6 scroll-area max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Instance Name</Label>
                  <Input id="name" required value={deployForm.name} onChange={e => setDeployForm({ ...deployForm, name: e.target.value })} placeholder="production-api" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Docker Image</Label>
                  <Select
                    required
                    value={deployForm.image}
                    onValueChange={(val) => setDeployForm({ ...deployForm, image: val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select image..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trackedImages?.length === 0 ? (
                        <SelectItem value="none" disabled>No images available</SelectItem>
                      ) : (
                        trackedImages?.map(img => {
                          const tag = img.tags[0] || img.id.substring(7, 19);
                          return <SelectItem key={img.id} value={tag}>{tag}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpu">vCPU Limit</Label>
                  <Input id="cpu" type="number" step="0.1" value={deployForm.cpuLimit} onChange={e => setDeployForm({ ...deployForm, cpuLimit: e.target.value })} placeholder="0.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ram">RAM Limit (MB)</Label>
                  <Input id="ram" type="number" value={deployForm.memLimit} onChange={e => setDeployForm({ ...deployForm, memLimit: e.target.value })} placeholder="512" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Port Mappings</Label>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={addPortMapping}>
                    <Plus className="mr-1 h-3 w-3" /> Add Port
                  </Button>
                </div>
                {portMappings.length === 0 && <p className="text-[10px] text-muted-foreground italic">No ports exposed</p>}
                {portMappings.map((p, i) => (
                  <div key={i} className="flex gap-2 items-end group">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Internal Port</Label>
                      <Input type="number" value={p.container} onChange={e => updatePortMapping(i, 'container', e.target.value)} placeholder="80" className="h-8 text-xs font-mono" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Host Port</Label>
                      <Input type="number" value={p.host} onChange={e => updatePortMapping(i, 'host', e.target.value)} placeholder="12001" className="h-8 text-xs font-mono" />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removePortMapping(i)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Volumes</Label>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={addVolume}>
                    <Plus className="mr-1 h-3 w-3" /> Add Mapping
                  </Button>
                </div>
                {volumes.length === 0 && <p className="text-[10px] text-muted-foreground italic">No volumes mapped</p>}
                {volumes.map((vol, i) => (
                  <div key={i} className="flex gap-2 items-end group">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Host Path</Label>
                      <Input value={vol.host_path} onChange={e => updateVolume(i, 'host_path', e.target.value)} placeholder="data/db" className="h-8 text-xs font-mono" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Mount Path</Label>
                      <Input value={vol.container_path} onChange={e => updateVolume(i, 'container_path', e.target.value)} placeholder="/var/lib/mysql" className="h-8 text-xs font-mono" />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeVolume(i)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeployOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={deployMutation.isPending}>
                {deployMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                Deploy Instance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsModal.isOpen} onOpenChange={(val) => { if (!val) setLogsModal({ isOpen: false, containerId: null }) }}>
        <DialogContent className="sm:max-w-[800px] p-0 border-border/50">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Instance Logs</DialogTitle>
            <DialogDescription>Real-time terminal output from the container.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <ScrollArea className="h-[450px] w-full rounded-2xl bg-zinc-950 p-4 border border-border/50">
              <LogsViewer containerId={logsModal.containerId} />
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeploy Progress Dialog */}
      <Dialog open={!!redeployTaskId} onOpenChange={(val) => { if (!val && redeployStatus?.status !== 'running') setRedeployTaskId(null) }}>
        <DialogContent className="sm:max-w-[600px] border-border/50">
          <DialogHeader>
            <DialogTitle>Redeployment Pipeline</DialogTitle>
            <DialogDescription>Container is being updated to the latest available image.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold flex items-center gap-2">
                  {redeployStatus?.phase || 'Initializing...'}
                </span>
                {redeployStatus?.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              <Progress value={redeployStatus?.status === 'completed' ? 100 : 45} className="h-1.5" />
            </div>

            <ScrollArea className="h-[300px] w-full rounded-xl bg-zinc-950 p-4 border border-border/50 font-mono text-xs text-zinc-400">
              <div className="flex flex-col gap-1">
                {redeployStatus?.logs?.map((l: string, i: number) => (
                  <div key={i} className="leading-tight">{l}</div>
                ))}
                {redeployStatus?.logs?.length === 0 && <div className="animate-pulse">Waiting for process logs...</div>}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              disabled={redeployStatus?.status === 'running'}
              onClick={() => setRedeployTaskId(null)}
            >
              {redeployStatus?.status === 'running' ? 'Process in background...' : 'Close Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  if (isLoading) return <div className="text-zinc-500 animate-pulse">Loading logs...</div>;
  if (error) return <div className="text-destructive font-bold">Error connecting to log stream.</div>;
  if (!data) return <div className="text-zinc-700 italic">No logs generated.</div>;
  return <pre className="whitespace-pre-wrap font-mono text-emerald-500 overflow-x-hidden">{data}</pre>;
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

  return (
    <div className="space-y-4 pt-4 border-t border-border/50 transition-all">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-1.5"><Cpu className="h-3 w-3" /> CPU</div>
          <span>{(cpuPercent / 100).toFixed(2)} cores ({cpuPercent.toFixed(1)}%)</span>
        </div>
        <Progress value={cpuPercent} className="h-1 bg-muted/50" color="bg-indigo-500" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-1.5"><HardDrive className="h-3 w-3" /> RAM</div>
          <span>{(memUsage / 1024 / 1024).toFixed(1)} MB ({memPercent.toFixed(1)}%)</span>
        </div>
        <Progress value={memPercent} className="h-1 bg-muted/50" color="bg-cyan-500" />
      </div>
    </div>
  );
}

