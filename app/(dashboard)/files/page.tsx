'use client';

import { Fragment, useState } from 'react';
import { useFiles, useFileActions } from '@/src/useCases/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from '@/components/ui/badge';
import { 
  Folder, FileText, Trash2, Edit, ChevronLeft, Plus, 
  Save, Loader2, Home, HardDrive, Files, FileCode, Search, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState('');
  const { data: files, isLoading, isFetching } = useFiles(currentPath);
  const actions = useFileActions();

  const [dirModal, setDirModal] = useState(false);
  const [newDirName, setNewDirName] = useState('');

  const [newFileModal, setNewFileModal] = useState({ isOpen: false, name: '' });

  const [editorModal, setEditorModal] = useState<{ isOpen: boolean, file: string, content: string }>({ isOpen: false, file: '', content: '' });

  const pathParts = currentPath.split('/').filter(Boolean);

  const navigateTo = (index: number) => {
    const newPath = pathParts.slice(0, index + 1).join('/');
    setCurrentPath(newPath);
  };

  const goBack = () => {
    if (!currentPath) return;
    const parts = [...pathParts];
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleOpen = async (file: any) => {
    if (file.is_dir) {
      setCurrentPath(file.path);
    } else {
      try {
        const content = await actions.read(file.path);
        setEditorModal({ isOpen: true, file: file.path, content });
      } catch (err) {
        toast.error("Cannot read file. It might be binary or inaccessible.");
      }
    }
  };

  const handleCreateDir = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPath = currentPath ? `${currentPath}/${newDirName}` : newDirName;
    try {
      await actions.createDir.mutateAsync(fullPath);
      setDirModal(false);
      setNewDirName('');
      toast.success(`Directory created: ${newDirName}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create directory.');
    }
  };

  const handleCreateFileInit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileModal.name) return;
    const fullPath = currentPath ? `${currentPath}/${newFileModal.name}` : newFileModal.name;
    setNewFileModal({ isOpen: false, name: '' });
    setEditorModal({ isOpen: true, file: fullPath, content: '' });
  };

  const handleSaveFile = async () => {
    try {
      await actions.write.mutateAsync({ path: editorModal.file, content: editorModal.content });
      setEditorModal({ ...editorModal, isOpen: false });
      toast.success('File saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save file.');
    }
  };

  const handleDelete = async (file: any) => {
     try {
       if (file.is_dir) await actions.deleteDir.mutateAsync(file.path);
       else await actions.delete.mutateAsync(file.path);
       toast.success(`${file.name} deleted`);
     } catch (err: any) {
       toast.error(err.response?.data?.message || 'Delete failed');
     }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">File Explorer</h2>
          <p className="text-muted-foreground">Manage persistent volumes and configuration files.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => setNewFileModal({ isOpen: true, name: '' })} className="flex-1 md:flex-none">
            <Plus className="mr-2 h-4 w-4" /> New File
          </Button>
          <Button size="sm" onClick={() => setDirModal(true)} className="flex-1 md:flex-none">
            <Folder className="mr-2 h-4 w-4" /> New Folder
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border/50 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => setCurrentPath('')} className="cursor-pointer flex items-center gap-1.5 font-semibold">
                  <Home className="h-3.5 w-3.5" /> Root
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathParts.map((part, i) => (
                <Fragment key={i}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {i === pathParts.length - 1 ? (
                      <BreadcrumbPage className="font-bold text-primary">{part}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink onClick={() => navigateTo(i)} className="cursor-pointer font-medium">
                        {part}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            {isFetching && (
              <Badge variant="secondary" className="h-7 px-2 text-[10px] uppercase tracking-wide gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
              </Badge>
            )}
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={!currentPath}>
               <ChevronLeft className="h-4 w-4" />
             </Button>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="w-[60%] font-bold uppercase text-[10px] tracking-widest pl-6">Name</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Size</TableHead>
                <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest">Options</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 4}).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3} className="h-14 animate-pulse bg-muted/20" />
                  </TableRow>
                ))
              ) : files?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center bg-muted/5">
                    <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50">
                      <Files className="h-10 w-10 mb-2" />
                      <p className="text-sm font-medium italic">Directory is currently empty</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                files?.map(f => (
                  <TableRow key={f.path} className="group hover:bg-primary/5 transition-colors cursor-default">
                    <TableCell className="pl-6 py-4 font-semibold text-sm cursor-pointer" onClick={() => handleOpen(f)}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${f.is_dir ? 'bg-indigo-500/10 text-indigo-500' : 'bg-zinc-500/10 text-zinc-500'} group-hover:scale-110 transition-transform`}>
                          {f.is_dir ? <Folder size={16} /> : <FileText size={16} />}
                        </div>
                        <span className="truncate max-w-[300px] md:max-w-md">{f.name}</span>
                        {f.is_dir && <Badge variant="secondary" className="text-[9px] h-4 rounded-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">DIR</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {f.is_dir ? <span className="opacity-20">——</span> : <Badge variant="outline" className="font-normal">{(f.size / 1024).toFixed(1)} KB</Badge>}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {(actions.delete.isPending && actions.delete.variables === f.path) || 
                         (actions.deleteDir.isPending && actions.deleteDir.variables === f.path) ? (
                          <div className="flex items-center gap-2 text-[10px] text-destructive animate-pulse font-bold uppercase mr-2">
                             <Loader2 className="h-3 w-3 animate-spin" />
                             Deleting...
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { if(confirm(`Permanently delete ${f.name}?`)) handleDelete(f) }}
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && isFetching && (
                <TableRow>
                  <TableCell colSpan={3} className="h-12 bg-primary/5">
                    <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading directory contents...
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Folder Dialog */}
      <Dialog open={dirModal} onOpenChange={setDirModal}>
        <DialogContent className="sm:max-w-[400px] border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>New Directory</DialogTitle>
            <DialogDescription>Create a new container volume mapping folder.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDir}>
            <div className="py-6 pt-2">
              <Input autoFocus value={newDirName} onChange={e => setNewDirName(e.target.value)} placeholder="Enter folder name..." className="h-11 shadow-inner bg-muted/50" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDirModal(false)}>Cancel</Button>
              <Button type="submit" disabled={actions.createDir.isPending}>
                {actions.createDir.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Folder className="mr-2 h-4 w-4" />}
                Create Directory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New File Name Dialog */}
      <Dialog open={newFileModal.isOpen} onOpenChange={(val) => setNewFileModal({ ...newFileModal, isOpen: val })}>
        <DialogContent className="sm:max-w-[400px] border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>Specify a name for the new file in this directory.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFileInit}>
            <div className="py-6 pt-2">
              <Input
                autoFocus
                value={newFileModal.name}
                onChange={e => setNewFileModal({ ...newFileModal, name: e.target.value })}
                placeholder="filename.txt"
                className="h-11 shadow-inner bg-muted/50 font-mono text-sm"
              />
              <p className="mt-2 text-[10px] text-muted-foreground truncate">
                Path: <span className="text-primary">{currentPath || 'root'}/{newFileModal.name || '...'}</span>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewFileModal({ isOpen: false, name: '' })}>Cancel</Button>
              <Button type="submit">
                <FileText className="mr-2 h-4 w-4" />
                Initialize File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Editor Dialog */}
      <Dialog open={editorModal.isOpen} onOpenChange={(val) => { if(!val) setEditorModal({ ...editorModal, isOpen: false }) }}>
        <DialogContent className="sm:max-w-[1000px] p-0 border-border/50 shadow-2xl overflow-hidden">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                 <FileCode className="h-5 w-5 text-primary" />
                 <DialogTitle>File Editor</DialogTitle>
              </div>
              <DialogDescription className="font-mono text-[11px] bg-muted/50 p-2 rounded border border-border/50 truncate">
                {editorModal.file}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Textarea
                className="w-full h-[60vh] p-4 bg-zinc-950 text-emerald-500 border border-border/50 rounded-2xl font-mono text-xs focus-visible:ring-primary/20 outline-none resize-none shadow-2xl"
                value={editorModal.content}
                onChange={e => setEditorModal({...editorModal, content: e.target.value})}
                spellCheck={false}
              />
            </div>
          </div>
          
          <DialogFooter className="bg-muted/30 p-6 border-t border-border/50">
            <Button variant="outline" onClick={() => setEditorModal({...editorModal, isOpen: false})}>Cancel</Button>
            <Button onClick={handleSaveFile} disabled={actions.write.isPending} className="min-w-[140px]">
              {actions.write.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={16} className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
