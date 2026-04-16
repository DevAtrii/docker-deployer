'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/src/data/api';
import { useRouter } from 'next/navigation';
import { Box, Loader2, KeyRound, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
      return;
    }

    apiClient.get('/auth/status').then(res => {
      if (!res.data.admin_setup) {
        router.replace('/setup');
      } else {
        setChecking(false);
      }
    }).catch(() => {
      setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      toast.success(`Welcome back, ${username}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Decorative patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute top-[60%] -right-[5%] h-[450px] w-[450px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="flex flex-col items-center gap-6 mb-8">
           <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center border-b-4 border-primary/40 shadow-xl shadow-primary/20">
                 <Box className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">Docker Deployer</h1>
           </div>
           <Badge variant="outline" className="text-[10px] tracking-widest font-black uppercase rounded-full px-3 py-1 bg-background">
             Infrastructure Node 1.2
           </Badge>
        </div>

        <Card className="border-border/50 shadow-2xl shadow-indigo-500/5 backdrop-blur-sm bg-card/80 rounded-[32px] overflow-hidden">
          <CardHeader className="text-center pt-10 px-8">
            <CardTitle className="text-2xl font-bold">Terminal Access</CardTitle>
            <CardDescription className="pt-2 text-[13px]">
              Identify yourself to manage system deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="un" className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Username</Label>
                <div className="relative">
                   <User className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                   <Input
                    id="un"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="root"
                    className="h-11 pl-11 bg-muted/30 border-none shadow-inner rounded-xl ring-offset-background focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw" className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Password</Label>
                <div className="relative">
                   <KeyRound className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                   <Input
                    id="pw"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pl-11 bg-muted/30 border-none shadow-inner rounded-xl ring-offset-background focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-11 text-md font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 border-b-4 border-black/10 active:border-b-0 active:translate-y-0.5 transition-all" disabled={loading}>
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Sign In
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <div className="bg-muted/30 p-4 border-t border-border/50 text-center">
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
               Restricted Monitoring System
             </p>
          </div>
        </Card>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
           Contact systems administrator for new credentials.
        </div>
      </div>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
