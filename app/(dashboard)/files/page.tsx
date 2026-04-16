'use client';

import { useState } from 'react';
import { useFiles, useFileActions } from '@/src/useCases/hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Folder, FileText, Trash2, Edit, ChevronLeft, Plus, Save, Loader2 } from 'lucide-react';

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState('');
  const { data: files, isLoading } = useFiles(currentPath);
  const actions = useFileActions();

  const [dirModal, setDirModal] = useState(false);
  const [newDirName, setNewDirName] = useState('');

  const [editorModal, setEditorModal] = useState<{isOpen: boolean, file: string, content: string}>({isOpen: false, file: '', content: ''});

  const goBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
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
        alert("Cannot read file. Maybe it's binary or inaccessible.");
      }
    }
  };

  const handleCreateDir = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPath = currentPath ? `${currentPath}/${newDirName}` : newDirName;
    await actions.createDir.mutateAsync(fullPath);
    setDirModal(false);
    setNewDirName('');
  };

  const handleSaveFile = async () => {
    await actions.write.mutateAsync({ path: editorModal.file, content: editorModal.content });
    setEditorModal({ ...editorModal, isOpen: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={goBack} disabled={!currentPath} className="h-8 w-8 p-0">
            <ChevronLeft size={16} />
          </Button>
          <span className="font-mono text-sm text-slate-300">
            /{currentPath}
          </span>
        </div>
        <div className="flex space-x-2">
          {/* Note: In a real app we would have an upload endpoint. Creating files via UI mock here. */}
          <Button onClick={() => setEditorModal({isOpen: true, file: currentPath ? `${currentPath}/new_file.txt` : 'new_file.txt', content: ''})} size="sm" variant="outline">
            <Plus size={16} className="mr-1" /> New File
          </Button>
          <Button onClick={() => setDirModal(true)} size="sm">
            <Folder size={16} className="mr-1" /> New Folder
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading files...</div>
        ) : (
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Size</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    This folder is empty.
                  </td>
                </tr>
              )}
              {files?.map(f => (
                <tr key={f.path} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium flex items-center space-x-3 cursor-pointer" onClick={() => handleOpen(f)}>
                    {f.is_dir ? <Folder size={18} className="text-blue-400" /> : <FileText size={18} className="text-slate-400" />}
                    <span>{f.name}</span>
                  </td>
                  <td className="px-6 py-3">
                    {f.is_dir ? '--' : `${(f.size / 1024).toFixed(1)} KB`}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {(actions.delete.isPending && actions.delete.variables === f.path) || 
                     (actions.deleteDir.isPending && actions.deleteDir.variables === f.path) ? (
                      <Loader2 className="animate-spin text-slate-500 ml-auto" size={16} />
                    ) : (
                      <button 
                        onClick={() => {
                          if(confirm('Delete this item?')) {
                            if (f.is_dir) actions.deleteDir.mutate(f.path)
                            else actions.delete.mutate(f.path)
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={dirModal} onClose={() => setDirModal(false)} title="New Directory">
        <form onSubmit={handleCreateDir} className="space-y-4">
          <Input autoFocus value={newDirName} onChange={e => setNewDirName(e.target.value)} placeholder="Folder name" />
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>

      <Modal isOpen={editorModal.isOpen} onClose={() => setEditorModal({ ...editorModal, isOpen: false })} title="File Editor" className="max-w-4xl max-h-[90vh]">
        <div className="space-y-4">
          <Input 
            value={editorModal.file} 
            onChange={e => setEditorModal({...editorModal, file: e.target.value})} 
            className="font-mono text-sm"
          />
          <textarea
            className="w-full h-[50vh] p-4 bg-slate-950 text-slate-200 border border-slate-800 rounded-md font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            value={editorModal.content}
            onChange={e => setEditorModal({...editorModal, content: e.target.value})}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditorModal({...editorModal, isOpen: false})}>Cancel</Button>
            <Button onClick={handleSaveFile} disabled={actions.write.isPending}>
              <Save size={16} className="mr-2" />
              {actions.write.isPending ? 'Saving...' : 'Save File'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
