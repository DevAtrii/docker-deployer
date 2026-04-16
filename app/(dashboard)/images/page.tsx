'use client';

import { useState } from 'react';
import { useImages, usePullImage, usePullStatus } from '@/src/useCases/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Box, DownloadCloud, KeyRound, Loader2, Plus, Trash2, ChevronDown, Terminal } from 'lucide-react';
import { apiClient } from '@/src/data/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function ImagesPage() {
  const { data: images, isLoading } = useImages();
  const qc = useQueryClient();

  // Pull modal
  const [pullOpen, setPullOpen] = useState(false);
  const [imageName, setImageName] = useState('');
  const [selectedAlias, setSelectedAlias] = useState('');
  const [pullError, setPullError] = useState('');

  // Token management modal
  const [tokenOpen, setTokenOpen] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newToken, setNewToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Fetch stored token aliases
  const { data: tokenData } = useQuery({
    queryKey: ['token-aliases'],
    queryFn: async () => (await apiClient.get('/images/tokens')).data,
  });
  const aliases: string[] = tokenData?.aliases ?? [];

  const [taskId, setTaskId] = useState<string | null>(null);
  const { data: pullStatus } = usePullStatus(taskId);
  const pullMutation = usePullImage();

  useEffect(() => {
    if (pullStatus?.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['images'] });
      const timer = setTimeout(() => {
        setPullOpen(false);
        setTaskId(null);
        setImageName('');
        setSelectedAlias('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pullStatus, qc]);

  const handlePullStart = async () => {
    setPullError('');
    try {
      const res = await pullMutation.mutateAsync({ image_name: imageName, token_alias: selectedAlias || null });
      setTaskId(res.task_id);
    } catch (err: any) {
      setPullError(err.response?.data?.message || 'Pull failed.');
    }
  };

  const addTokenMutation = useMutation({
    mutationFn: async () => apiClient.post('/images/tokens', { alias: newAlias, token: newToken }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['token-aliases'] });
      setNewAlias('');
      setNewToken('');
      setTokenError('');
    },
    onError: (err: any) => setTokenError(err.response?.data?.message || 'Failed to save token.'),
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (alias: string) => apiClient.delete(`/images/tokens/${encodeURIComponent(alias)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['token-aliases'] }),
  });

  const handleRemoveImage = async (name: string) => {
    if (confirm(`Untrack image: ${name}?`)) {
      await apiClient.delete(`/images/?image_name=${encodeURIComponent(name)}`);
      qc.invalidateQueries({ queryKey: ['images'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Images</h2>
          <p className="text-slate-400 text-sm">Manage docker images available in your workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTokenOpen(true)} className="flex items-center gap-2">
            <KeyRound size={16} /> Manage Tokens
          </Button>
          <Button onClick={() => setPullOpen(true)} className="flex items-center gap-2">
            <DownloadCloud size={16} /> Pull Image
          </Button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        )}
        {!isLoading && images?.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
            <Box size={40} className="mx-auto text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No images tracked</h3>
            <p className="text-sm text-slate-500 mt-1">Pull an image from Docker Hub to get started.</p>
          </div>
        )}
        {images?.map((img) => (
          <Card key={img.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg text-slate-100 truncate pr-2 max-w-[80%]" title={img.tags[0] || img.id}>
                  {img.tags[0] || 'untagged'}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">{(img.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">{img.id.split(':')[1]?.substring(0, 12)}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/30 hover:text-red-300" onClick={() => handleRemoveImage(img.tags[0] || img.id)}>
                <Trash2 size={16} className="mr-2" /> Untrack
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pull Image Modal */}
      <Modal isOpen={pullOpen} onClose={() => { if(pullStatus?.status !== 'pulling') { setPullOpen(false); setPullError(''); setTaskId(null); } }} title="Pull Image" className="max-w-2xl">
        <div className="space-y-4">
          {!taskId ? (
            <>
              <p className="text-sm text-slate-400">Pull an image from Docker Hub. Optionally select a saved token for private registries.</p>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Image Name</label>
                <Input
                  autoFocus
                  required
                  value={imageName}
                  onChange={e => setImageName(e.target.value)}
                  placeholder="e.g. ubuntu:latest or myorg/myapp:1.0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">DockerHub Token <span className="text-slate-500">(optional)</span></label>
                <div className="relative">
                  <select
                    value={selectedAlias}
                    onChange={e => setSelectedAlias(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">— No token (public images) —</option>
                    {aliases.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
                {aliases.length === 0 && (
                  <p className="text-xs text-slate-500">No tokens saved yet. Use "Manage Tokens" to add one.</p>
                )}
              </div>
              {pullError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{pullError}</p>}
              <Button className="w-full" onClick={handlePullStart} disabled={pullMutation.isPending || !imageName}>
                {pullMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Starting...</> : 'Pull Image'}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Status: <strong className="capitalize text-white">{pullStatus?.status || 'connecting...'}</strong></span>
                {pullStatus?.status === 'pulling' && <Loader2 size={16} className="animate-spin text-blue-400" />}
              </div>
              <div className="bg-slate-950 p-3 rounded-lg h-64 overflow-y-auto font-mono text-xs text-slate-400 border border-slate-800 flex flex-col-reverse">
                <div className="space-y-0.5 whitespace-pre">
                  {pullStatus?.logs?.map((l: string, i: number) => (
                    <div key={i}>{l}</div>
                  ))}
                  {pullStatus?.logs?.length === 0 && <div>Connecting to Docker daemon...</div>}
                </div>
              </div>
              {pullStatus?.status === 'completed' && <div className="text-green-400 text-sm font-medium pt-2">Pull completed successfully!</div>}
              {pullStatus?.status === 'error' && (
                <div className="pt-2">
                  <div className="text-red-400 text-sm font-medium mb-3">An error occurred during pull.</div>
                  <Button onClick={() => setTaskId(null)} variant="outline" className="w-full">Try Again</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Token Management Modal */}
      <Modal isOpen={tokenOpen} onClose={() => { setTokenOpen(false); setTokenError(''); }} title="DockerHub Tokens" className="max-w-lg">
        <div className="space-y-6">
          {/* Add token form */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-200">Add New Token</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Alias (nickname)</label>
                <Input value={newAlias} onChange={e => setNewAlias(e.target.value)} placeholder="e.g. my-org-token" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Token</label>
                <Input type="password" value={newToken} onChange={e => setNewToken(e.target.value)} placeholder="dckr_pat_•••••" />
              </div>
            </div>
            {tokenError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{tokenError}</p>}
            <Button onClick={() => addTokenMutation.mutate()} disabled={!newAlias || !newToken || addTokenMutation.isPending} className="w-full">
              {addTokenMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : <><Plus size={16} className="mr-2" />Save Token</>}
            </Button>
          </div>

          {/* Existing tokens */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">Saved Tokens</h4>
            {aliases.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-700 rounded-lg">No tokens saved yet.</p>
            ) : (
              <div className="space-y-2">
                {aliases.map(alias => (
                  <div key={alias} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <KeyRound size={16} className="text-blue-400" />
                      <span className="text-sm text-slate-200">{alias}</span>
                    </div>
                    <button
                      onClick={() => { if (confirm(`Delete token "${alias}"?`)) deleteTokenMutation.mutate(alias); }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
