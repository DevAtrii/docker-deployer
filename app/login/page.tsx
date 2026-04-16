'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/src/data/api';
import { useRouter } from 'next/navigation';
import { Box, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // On mount: check if admin is set up, and if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/containers');
      return;
    }

    apiClient.get('/auth/status').then(res => {
      if (!res.data.admin_setup) {
        router.replace('/setup');
      } else {
        setChecking(false);
      }
    }).catch(() => {
      setChecking(false); // Allow user to see the login form even if backend is unreachable
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      router.push('/containers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="text-slate-400 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-slate-950 to-purple-900/20" />

      <Card className="w-full max-w-md relative z-10 glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/50 glow">
              <Box className="text-blue-400" size={24} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Docker Deployer</CardTitle>
          <CardDescription>Sign in to your account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Username</label>
              <Input
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your-username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" variant="premium" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </form>
          <p className="text-xs text-slate-500 text-center mt-5">
            Contact your admin to request an account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
