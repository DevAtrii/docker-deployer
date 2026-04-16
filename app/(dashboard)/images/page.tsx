'use client';

import { useState, useEffect } from 'react';
import { useImages, usePullImage, usePullStatus } from '@/src/useCases/hooks';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Box, DownloadCloud, KeyRound, Loader2, Plus, Trash2,
  Terminal, Database, HardDrive, ShieldCheck, Zap,
  Eye, EyeOff, CheckCircle2, AlertCircle, Pencil
} from 'lucide-react';
import { apiClient } from '@/src/data/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ImagesPage() {
  const { data: images, isLoading } = useImages();
  const qc = useQueryClient();

  // Pull modal
  const [pullOpen, setPullOpen] = useState(false);
  const [imageName, setImageName] = useState('');
  const [selectedAlias, setSelectedAlias] = useState('none');

  // Token management modal
  const [tokenOpen, setTokenOpen] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRegistry, setNewRegistry] = useState('https://index.docker.io/v1/');
  const [newToken, setNewToken] = useState('');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [showFormToken, setShowFormToken] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { success: boolean, message: string }>>({});

  // Fetch stored token aliases
  const { data: tokenData } = useQuery({
    queryKey: ['token-aliases'],
    queryFn: async () => (await apiClient.get('/images/tokens')).data,
  });
  const aliases: string[] = tokenData?.aliases ?? [];
  const detailedTokens: { alias: string, username?: string, registry?: string, token?: string }[] = tokenData?.tokens_detailed ?? [];

  const [taskId, setTaskId] = useState<string | null>(null);
  const { data: pullStatus } = usePullStatus(taskId);
  const pullMutation = usePullImage();

  // Confirmation states
  const [imageToDelete, setImageToDelete] = useState<{ name: string, id: string } | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (pullStatus?.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['images'] });
      toast.success('Image pulled successfully');
      const timer = setTimeout(() => {
        setPullOpen(false);
        setTaskId(null);
        setImageName('');
        setSelectedAlias('none');
      }, 2000);
      return () => clearTimeout(timer);
    } else if (pullStatus?.status === 'error') {
      toast.error('Image pull failed');
    }
  }, [pullStatus, qc]);

  const handlePullStart = async () => {
    try {
      const res = await pullMutation.mutateAsync({
        image_name: imageName,
        token_alias: selectedAlias === 'none' ? null : selectedAlias
      });
      setTaskId(res.task_id);
      toast.info('Pulling image in background...');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Pull failed.');
    }
  };

  const addTokenMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        alias: newAlias,
        username: newUsername,
        registry: newRegistry,
        token: newToken || undefined
      };

      if (editingAlias) {
        return apiClient.put(`/images/tokens/${encodeURIComponent(editingAlias)}`, payload);
      } else {
        return apiClient.post('/images/tokens', payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['token-aliases'] });
      resetTokenForm();
      toast.success(editingAlias ? 'Token updated successfully' : 'Token saved successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save token.'),
  });

  const resetTokenForm = () => {
    setNewAlias('');
    setNewUsername('');
    setNewRegistry('https://index.docker.io/v1/');
    setNewToken('');
    setEditingAlias(null);
  };

  const handleEditToken = (token: { alias: string, username?: string, registry?: string, token?: string }) => {
    setEditingAlias(token.alias);
    setNewAlias(token.alias);
    setNewUsername(token.username || '');
    setNewRegistry(token.registry || 'https://index.docker.io/v1/');
    setNewToken(token.token || '');
  };

  const testTokenMutation = useMutation({
    mutationFn: async (alias: string) => apiClient.post(`/images/tokens/${encodeURIComponent(alias)}/test`),
    onSuccess: (_, alias) => {
      setTestResults(prev => ({ ...prev, [alias]: { success: true, message: 'Login Success' } }));
      toast.success(`${alias}: Login successful!`);
    },
    onError: (err: any, alias) => {
      setTestResults(prev => ({ ...prev, [alias]: { success: false, message: err.response?.data?.message || 'Login Failed' } }));
      toast.error(`${alias}: ${err.response?.data?.message || 'Login failed'}`);
    },
  });

  const toggleTokenVisibility = (alias: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  };

  const deleteTokenMutation = useMutation({
    mutationFn: async (alias: string) => apiClient.delete(`/images/tokens/${encodeURIComponent(alias)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['token-aliases'] });
      toast.success('Token deleted');
    },
  });

  const handleRemoveImage = async (name: string) => {
    try {
      await apiClient.delete(`/images/?image_name=${encodeURIComponent(name)}`);
      qc.invalidateQueries({ queryKey: ['images'] });
      toast.success(`Image ${name} untracked`);
    } catch (err: any) {
      toast.error('Failed to untrack image');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Images</h2>
          <p className="text-muted-foreground">Local repository of pulled Docker images.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => setTokenOpen(true)} className="flex-1 md:flex-none">
            <KeyRound className="mr-2 h-4 w-4" /> Auth Tokens
          </Button>
          <Button onClick={() => setPullOpen(true)} className="flex-1 md:flex-none">
            <DownloadCloud className="mr-2 h-4 w-4" /> Pull Image
          </Button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-16 bg-muted/50 rounded-t-xl" />
            <CardContent className="h-24" />
          </Card>
        ))}

        {!isLoading && images?.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Database size={48} className="mx-auto text-muted-foreground mb-4 opacity-10" />
            <h3 className="text-xl font-semibold">No images tracked</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto italic">
              Try pulling your first image from Docker Hub using the button above.
            </p>
          </div>
        )}

        {images?.map((img) => (
          <Card key={img.id} className="group border-border/50 hover:border-primary/30 transition-all hover:shadow-lg overflow-hidden">
            <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-start justify-between gap-2 text-sm font-bold">
                <CardTitle className="text-base tracking-tight line-clamp-2 leading-tight min-h-[2.5rem]" title={img.tags[0] || img.id}>
                  {img.tags[0] || 'untagged'}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                  {(img.size / 1024 / 1024).toFixed(1)} MB
                </Badge>
              </div>
              <CardDescription className="font-mono text-[10px] opacity-70">
                {img.id.split(':')[1]?.substring(0, 16)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                <HardDrive className="h-3 w-3" />
                <span>Layered Storage Engine</span>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                  onClick={() => setImageToDelete({ name: img.tags[0] || 'untagged', id: img.id })}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Untrack
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pull Image Dialog */}
      <Dialog open={pullOpen} onOpenChange={(val) => { if (!val && pullStatus?.status !== 'pulling') { setPullOpen(false); setTaskId(null); } }}>
        <DialogContent className="sm:max-w-[600px] border-border/50 p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Pull Registry Image</DialogTitle>
              <DialogDescription>Import images from Docker Hub or a private registry.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6 font-medium">
              {!taskId ? (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="imgName">Image Name & Tag</Label>
                    <Input
                      id="imgName"
                      autoFocus
                      required
                      value={imageName}
                      onChange={e => setImageName(e.target.value)}
                      placeholder="e.g. nginx:alpine username/image:tag"
                      className="h-11 shadow-inner bg-muted/50"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="token">Authentication Token <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Select
                      value={selectedAlias}
                      onValueChange={(val) => setSelectedAlias(val)}
                    >
                      <SelectTrigger id="token" className="h-11 shadow-inner bg-muted/50">
                        <SelectValue placeholder="Public Access" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Public (No Token) —</SelectItem>
                        {aliases.map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold flex items-center gap-2">
                        {pullStatus?.status || 'Waiting...'}
                      </span>
                      {pullStatus?.status === 'pulling' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                    <Progress value={pullStatus?.status === 'completed' ? 100 : 45} className="h-1.5" />
                  </div>

                  <ScrollArea className="h-[250px] w-full rounded-2xl bg-zinc-950 p-4 border border-border/50 font-mono text-[11px] text-zinc-400">
                    <div className="flex flex-col gap-1 leading-tight">
                      {pullStatus?.logs?.map((l: string, i: number) => (
                        <div key={i}>{l}</div>
                      ))}
                      {pullStatus?.logs?.length === 0 && <div className="animate-pulse">Handshaking with Docker Registry...</div>}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-muted/30 p-6 border-t border-border/50">
            {!taskId ? (
              <>
                <Button variant="outline" onClick={() => setPullOpen(false)}>Cancel</Button>
                <Button onClick={handlePullStart} disabled={pullMutation.isPending || !imageName}>
                  {pullMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  Pull Image
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                disabled={pullStatus?.status === 'pulling'}
                onClick={() => setTaskId(null)}
              >
                {pullStatus?.status === 'pulling' ? 'Pulling in background...' : 'Close Window'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Token Dialog */}
      <Dialog open={tokenOpen} onOpenChange={(val) => { if (!val) setTokenOpen(false) }}>
        <DialogContent className="sm:max-w-[500px] border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Registry Authentication
            </DialogTitle>
            <DialogDescription>Manage tokens for private Docker registries.</DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Add token form */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {editingAlias ? `Editing: ${editingAlias}` : 'Add Registry Token'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alias" className="text-xs">Nickname</Label>
                  <Input
                    id="alias"
                    value={newAlias}
                    onChange={e => setNewAlias(e.target.value)}
                    placeholder="org-token"
                    className="h-9 shadow-inner"
                    disabled={!!editingAlias} // Can't rename alias yet (backend uses it as PK)
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user" className="text-xs">Docker Username</Label>
                  <Input id="user" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="docker-username" className="h-9 shadow-inner" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reg" className="text-xs">Registry URL</Label>
                  <Input id="reg" value={newRegistry} onChange={e => setNewRegistry(e.target.value)} placeholder="https://index.docker.io/v1/" className="h-9 shadow-inner" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tok" className="text-xs">Access Token {editingAlias && <span className="text-[10px] font-normal opacity-50">(Leave empty to keep current)</span>}</Label>
                  <div className="relative">
                    <Input
                      id="tok"
                      type={showFormToken ? "text" : "password"}
                      value={newToken}
                      onChange={e => setNewToken(e.target.value)}
                      placeholder="dckr_pat_•••••"
                      className="h-9 shadow-inner pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowFormToken(!showFormToken)}
                    >
                      {showFormToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {editingAlias && (
                  <Button variant="outline" onClick={resetTokenForm} className="flex-1 h-9">
                    Cancel Edit
                  </Button>
                )}
                <Button
                  onClick={() => addTokenMutation.mutate()}
                  disabled={!newAlias || !newUsername || (!editingAlias && !newToken) || addTokenMutation.isPending}
                  className="flex-[2] h-9"
                >
                  {addTokenMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                  {editingAlias ? 'Update Credentials' : 'Save Credentials'}
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Credentials</h4>
              <ScrollArea className="h-[200px] pr-4">
                {aliases.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground italic text-sm border-2 border-dashed rounded-xl">
                    No registry tokens configured.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detailedTokens.map(token => (
                      <div key={token.alias} className="flex flex-col gap-2 p-3 rounded-2xl bg-card border border-border/50 shadow-sm group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <KeyRound className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate text-primary/90">{token.alias}</span>
                              <span className="text-[10px] text-muted-foreground truncate opacity-70">
                                {token.username} @ {token.registry?.replace('https://', '').replace(/\/v1\/?$/, '')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {testResults[token.alias] && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${testResults[token.alias].success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                {testResults[token.alias].success ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                {testResults[token.alias].success ? 'Success' : 'Error'}
                              </div>
                            )}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={testTokenMutation.isPending}
                                onClick={() => testTokenMutation.mutate(token.alias)}
                                className="h-7 w-7 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5"
                                title="Test Login"
                              >
                                {testTokenMutation.isPending && testTokenMutation.variables === token.alias ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 size={14} />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditToken(token)}
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setTokenToDelete(token.alias)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Token Secret Display */}
                        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-muted/30 border border-border/30">
                          <code className="text-[10px] font-mono truncate opacity-60">
                            {visibleTokens.has(token.alias) ? token.token : '••••••••••••••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => toggleTokenVisibility(token.alias)}
                          >
                            {visibleTokens.has(token.alias) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </Button>
                        </div>

                        {testResults[token.alias] && !testResults[token.alias].success && (
                          <div className="px-2 py-1 bg-destructive/5 text-destructive text-[9px] rounded-lg animate-in slide-in-from-top-1 duration-200">
                            {testResults[token.alias].message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!imageToDelete} onOpenChange={(val) => { if (!val) setImageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will untrack <strong>{imageToDelete?.name}</strong> from the deployer.
              The actual image will remain on the host but won't be visible here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (imageToDelete) handleRemoveImage(imageToDelete.id);
                setImageToDelete(null);
              }}
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/10 cursor-pointer"
            >
              Untrack Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!tokenToDelete} onOpenChange={(val) => { if (!val) setTokenToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete authentication token?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the token alias <strong>{tokenToDelete}</strong>?
              You will need to re-add it if you want to pull images from this registry later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tokenToDelete) deleteTokenMutation.mutate(tokenToDelete);
                setTokenToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
