"use client";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UserX, LayoutDashboard } from "lucide-react";

function useImpersonationState() {
  const [impersonating, setImpersonating] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('impersonating_user') : null;
    if (raw) {
      try { setImpersonating(JSON.parse(raw)); } catch { }
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

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">
      <LayoutDashboard className="animate-spin mr-2 h-5 w-5" />
      Loading Workspace...
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex w-full flex-col overflow-hidden">
          {/* Impersonation Banner */}
          {impersonating && (
            <Alert variant="warning" className="rounded-none border-t-0 border-x-0 bg-yellow-500/10 border-yellow-500/20 py-2">
              <div className="flex w-full items-center justify-between">
                <AlertDescription className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                  <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Admin View
                  </span>
                  Viewing as <strong className="font-bold underline decoration-yellow-500/30">{impersonating.username}</strong>
                </AlertDescription>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exitImpersonation(router)}
                  className="h-8 border-yellow-500/20 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 bg-transparent"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Exit View
                </Button>
              </div>
            </Alert>
          )}

          {/* Floating Header */}
          <header className="flex sticky top-0 z-30 h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur-md transition-all ease-in-out md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border md:hidden" />
              <h1 className="text-sm font-semibold tracking-tight md:text-base capitalize">
                {pathname.split('/').pop() || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Search or other top-bar items could go here */}
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth no-scrollbar">
            <div className="mx-auto max-w-7xl w-full h-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
