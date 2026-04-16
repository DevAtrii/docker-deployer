'use client';

import { Box, LayoutDashboard, LogOut, Image as ImageIcon, FolderOpen, Settings, UserX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/src/useCases/hooks';
import { useEffect, useState } from 'react';

function useImpersonationState() {
  const [impersonating, setImpersonating] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('impersonating_user') : null;
    if (raw) {
      try { setImpersonating(JSON.parse(raw)); } catch {}
    }
  }, []);

  const exitImpersonation = (router: ReturnType<typeof useRouter>) => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      localStorage.setItem('token', adminToken);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('impersonating_user');
    }
    router.push('/admin');
    router.refresh();
  };

  return { impersonating, exitImpersonation };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const { impersonating, exitImpersonation } = useImpersonationState();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('impersonating_user');
    router.push('/login');
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Containers', href: '/containers', icon: <Box size={18} /> },
    { name: 'Images', href: '/images', icon: <ImageIcon size={18} /> },
    { name: 'Files', href: '/files', icon: <FolderOpen size={18} /> },
  ];

  // Show Admin Panel only if the effective session is admin and not impersonating
  if (user?.role === 'admin' && !impersonating) {
    navItems.push({ name: 'Admin Panel', href: '/admin', icon: <Settings size={18} /> });
  }

  return (
    <div className="flex min-h-screen bg-slate-950 flex-col">

      {/* Impersonation Banner */}
      {impersonating && (
        <div className="w-full bg-amber-500/20 border-b border-amber-500/50 px-6 py-2.5 flex items-center justify-between z-50">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs px-2.5 py-0.5 rounded-full">
              👁 Admin View
            </span>
            Viewing as <strong>{impersonating.username}</strong> — You have full access to this user's resources.
          </div>
          <button
            onClick={() => exitImpersonation(router)}
            className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            <UserX size={14} /> Exit &amp; Return to Admin
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 hidden md:flex flex-col">
          <div className="flex items-center space-x-3 px-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/50 glow">
              <LayoutDashboard className="text-blue-400" size={16} />
            </div>
            <span className="font-semibold tracking-tight text-white">Docker Deployer</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 border border-blue-500 text-white shadow-lg glow' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}>
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-800 pt-4 space-y-1">
            {/* Show current user / impersonation context */}
            <div className="px-3 py-2 text-xs text-slate-500">
              {impersonating
                ? <span className="text-amber-400">👁 {impersonating.username}</span>
                : <span>{user?.role === 'admin' ? '🛡 Admin' : '👤 User'}</span>}
            </div>
            <button onClick={handleLogout} className="flex w-full items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center px-6 sticky top-0 z-20">
            <h1 className="text-lg font-medium text-slate-100 capitalize">
              {pathname.split('/').pop() || 'Dashboard'}
            </h1>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
