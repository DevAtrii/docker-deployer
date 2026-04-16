'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/src/data/api';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Sparkles, UserPlus, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/setup', { username, password });
      toast.success('Admin account initialized! Redirecting to login...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[10%] h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[90px]" />
        <div className="absolute -bottom-[5%] -left-[5%] h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="flex flex-col items-center gap-6 mb-8 text-center">
           <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20 animate-pulse">
              <ShieldCheck className="h-8 w-8 text-primary" />
           </div>
           <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight">Deployment Ready</h1>
              <p className="text-muted-foreground text-sm font-medium">Initialize the core administration layer</p>
           </div>
        </div>

        <Card className="border-border/50 shadow-2xl backdrop-blur-md bg-card/90 rounded-[32px] overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="text-center pt-10 px-8">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
               <Sparkles className="h-5 w-5 text-amber-500" />
               First-time Setup
            </CardTitle>
            <CardDescription className="pt-2 text-[13px] leading-relaxed">
              No primary administrator identified. Establish your root credentials 
              to begin managing infrastructure.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="un" className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Admin Username</Label>
                <div className="relative">
                   <UserPlus className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                   <Input
                    id="un"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. administrator"
                    className="h-11 pl-11 bg-muted/40 border-none shadow-inner rounded-xl"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="pw" className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Password</Label>
                   <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="pw"
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pl-11 bg-muted/40 border-none shadow-inner rounded-xl"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <Label htmlFor="cpw" className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Confirm</Label>
                   <div className="relative flex items-center">
                      <Input
                        id="cpw"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 px-4 bg-muted/40 border-none shadow-inner rounded-xl"
                      />
                   </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 text-md font-bold rounded-xl shadow-xl shadow-primary/20 border-b-4 border-black/10 transition-all hover:scale-[1.01]" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Initialize System'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <div className="bg-primary/5 p-4 text-center border-t border-border/50">
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-loose">
                Locked Instance · Single-Use Endpoint
             </p>
          </div>
        </Card>
        
        <div className="mt-8 text-center">
           <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
             Security Note: These credentials will have root access to all Docker processes on this host.
           </p>
        </div>
      </div>
    </div>
  );
}
