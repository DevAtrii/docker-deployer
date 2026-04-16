'use client';

import { useDockerInfo, useContainers, useImages, useUser, useProfile } from '@/src/useCases/hooks';
import { Card } from '@/components/ui/Card';
import {
  Activity, Box, HardDrive, Cpu, Server, Image as ImageIcon,
  CheckCircle2, XCircle, Loader2, MemoryStick, Play, Pause, Square,
  ShieldAlert,
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

  const StatCard = ({ icon, label, value, sub, color = 'text-blue-400' }: any) => (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-100">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-slate-800 ${color}`}>{icon}</div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm">Welcome back, <span className="text-blue-400 font-medium">{profile?.username || 'user'}</span>.</p>
        </div>
        {!profileLoading && profile && (
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Your CPU Limit</p>
                <p className="text-sm font-medium text-slate-200">{formatCpu(profile.cpu_limit)}</p>
             </div>
             <div className="text-right border-l border-slate-800 pl-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Your RAM</p>
                <p className="text-sm font-medium text-slate-200">{formatStorage(profile.ram_limit_mb)}</p>
             </div>
             <div className="text-right border-l border-slate-800 pl-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Your Storage</p>
                <p className="text-sm font-medium text-slate-200">{formatStorage(profile.storage_limit_mb)}</p>
             </div>
          </div>
        )}
      </div>

      {/* Docker Connection Banner */}
      <div className={`flex items-center gap-3 rounded-xl px-5 py-3.5 border ${
        infoLoading
          ? 'border-slate-700 bg-slate-900/50 text-slate-400'
          : dockerInfo?.connected
          ? 'border-green-800 bg-green-950/30 text-green-300'
          : 'border-red-800 bg-red-950/30 text-red-300'
      }`}>
        {infoLoading
          ? <Loader2 size={18} className="animate-spin" />
          : dockerInfo?.connected
          ? <CheckCircle2 size={18} />
          : <XCircle size={18} />}
        <span className="font-medium text-sm">
          {infoLoading
            ? 'Checking Docker connection...'
            : dockerInfo?.connected
            ? `Docker connected — ${dockerInfo.server_version}`
            : `Docker unreachable: ${dockerInfo?.error}`}
        </span>
      </div>

      {/* Your resources summary */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-4">Instance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Box size={20} />}       label="Total Containers" value={containers.length}  color="text-blue-400" />
          <StatCard icon={<Play size={20} />}       label="Running"          value={running}            color="text-green-400" />
          <StatCard icon={<Pause size={20} />}      label="Paused"           value={paused}             color="text-yellow-400" />
          <StatCard icon={<ImageIcon size={20} />}  label="Images Tracked"   value={images.length}      color="text-purple-400" />
        </div>
      </div>

      {/* Docker daemon info — only shown when connected */}
      {dockerInfo?.connected && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-4">System Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Server size={20} />}      label="Kernel Version"     value={dockerInfo.os} sub={dockerInfo.arch} color="text-slate-400" />
            <StatCard icon={<Cpu size={20} />}         label="Total CPUs"         value={dockerInfo.cpus} color="text-indigo-400" />
            <StatCard icon={<MemoryStick size={20} />} label="System RAM"       value={`${dockerInfo.total_memory_mb} MB`} color="text-pink-400" />
            <StatCard icon={<HardDrive size={20} />}   label="Storage Driver"     value={dockerInfo.storage_driver} color="text-orange-400" />
          </div>
        </div>
      )}
    </div>
  );
}
