import { useDockerInfo, useContainers, useImages, useUser, useProfile } from '@/src/useCases/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Activity, Box, HardDrive, Cpu, Server, Image as ImageIcon,
  CheckCircle2, XCircle, Loader2, MemoryStick, Play, Pause,
  ShieldAlert, Info, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { data: user } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: dockerInfo, isLoading: infoLoading } = useDockerInfo();
  const { data: containers = [] } = useContainers();
  const { data: images = [] } = useImages();

  const running = containers.filter(c => c.status === 'running').length;
  const paused  = containers.filter(c => c.status === 'paused').length;

  const formatCpu = (cpu?: number) => cpu === 0 ? 'Unlimited' : `${cpu} vCPU${cpu !== 1 ? 's' : ''}`;
  const formatStorage = (mb?: number) => mb === 0 ? 'Unlimited' : `${mb} MB`;

  if (profileLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-20 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workspace</h2>
          <p className="text-muted-foreground">
            Overview of your infrastructure managed by <span className="text-primary font-semibold">Docker Deployer</span>.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 md:gap-4 p-1 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm self-stretch md:self-auto">
          <div className="flex flex-col px-3 py-1.5 min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">CPU Capacity</span>
            <Badge variant="outline" className="w-fit border-indigo-500/20 bg-indigo-500/5 text-indigo-500 font-mono">
              {formatCpu(profile?.cpu_limit)}
            </Badge>
          </div>
          <Separator orientation="vertical" className="hidden md:block h-10 my-auto" />
          <div className="flex flex-col px-3 py-1.5 min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">RAM Quota</span>
            <Badge variant="outline" className="w-fit border-cyan-500/20 bg-cyan-500/5 text-cyan-500 font-mono">
              {formatStorage(profile?.ram_limit_mb)}
            </Badge>
          </div>
          <Separator orientation="vertical" className="hidden md:block h-10 my-auto" />
          <div className="flex flex-col px-3 py-1.5 min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Storage</span>
            <Badge variant="outline" className="w-fit border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-mono">
              {formatStorage(profile?.storage_limit_mb)}
            </Badge>
          </div>
        </div>
      </div>

      {/* System Status Alert */}
      {!infoLoading && (
        <Alert variant={dockerInfo?.connected ? "default" : "destructive"} className={dockerInfo?.connected ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}>
          {dockerInfo?.connected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <AlertTitle className="font-bold flex items-center gap-2">
            System {dockerInfo?.connected ? "Online" : "Connection Error"}
            {dockerInfo?.connected && <Badge variant="secondary" className="font-mono text-[10px] h-4">{dockerInfo.server_version}</Badge>}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground mt-1">
            {dockerInfo?.connected 
              ? `Communicating with Docker daemon on ${dockerInfo.os} (${dockerInfo.arch}).`
              : `Unable to reach Docker API: ${dockerInfo?.error || "Unknown error"}. Please check backend configuration.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Instance Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Containers" 
          value={containers.length} 
          icon={<Box className="h-4 w-4" />} 
          description="Deployed instances"
        />
        <MetricCard 
          title="Running" 
          value={running} 
          icon={<Play className="h-4 w-4" />} 
          description="Active containers"
          trend="positive"
        />
        <MetricCard 
          title="Paused" 
          value={paused} 
          icon={<Pause className="h-4 w-4" />} 
          description="Suspended state"
        />
        <MetricCard 
          title="Images" 
          value={images.length} 
          icon={<ImageIcon className="h-4 w-4" />} 
          description="Tracked registry images"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Information Card */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 text-sm font-medium">
            <div className="space-y-1">
              <CardTitle className="text-lg">System Telemetry</CardTitle>
              <CardDescription>Real-time statistics from the Docker host.</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {dockerInfo?.connected ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-2">
                <div className="space-y-2 text-center bg-muted/40 p-4 rounded-2xl border border-dashed border-border/50">
                   <div className="flex justify-center mb-1"><Cpu className="h-5 w-5 text-indigo-500" /></div>
                   <div className="text-2xl font-bold tracking-tighter">{dockerInfo.cpus}</div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Logical Cores</p>
                </div>
                <div className="space-y-2 text-center bg-muted/40 p-4 rounded-2xl border border-dashed border-border/50">
                   <div className="flex justify-center mb-1"><MemoryStick className="h-5 w-5 text-pink-500" /></div>
                   <div className="text-2xl font-bold tracking-tighter">{Math.round(dockerInfo.total_memory_mb / 1024)} GB</div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Memory</p>
                </div>
                <div className="space-y-2 text-center bg-muted/40 p-4 rounded-2xl border border-dashed border-border/50">
                   <div className="flex justify-center mb-1"><HardDrive className="h-5 w-5 text-orange-500" /></div>
                   <div className="text-2xl font-bold tracking-tighter truncate">{dockerInfo.storage_driver}</div>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground">Storage Engine</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ShieldAlert className="h-10 w-10 mb-2 opacity-20" />
                <p>System metrics unavailable while offline</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5 shadow-inner">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5"><Info className="h-4 w-4 text-primary" /></div>
              <p className="text-muted-foreground leading-relaxed">
                Your resources are strictly isolated. Any container exceeding your 
                <strong> {profile?.ram_limit_mb} MB </strong> RAM limit will be automatically 
                throttled by the Docker daemon.
              </p>
            </div>
            <Separator className="bg-primary/10" />
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Global Port Range</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-primary">{profile?.port_range}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Registry Tokens</span>
                <Badge variant="outline" className="h-5 rounded-sm">{profile?.registry_tokens || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, description, trend }: any) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-all hover:shadow-md cursor-default">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          {description}
          {trend === "positive" && <Badge variant="secondary" className="h-3 text-[8px] px-1 bg-emerald-500/10 text-emerald-500 border-none">Active</Badge>}
        </p>
      </CardContent>
    </Card>
  );
}
