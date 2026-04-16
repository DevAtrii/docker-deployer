'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/src/data/api';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/setup', { username, password });
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/20 via-slate-950 to-purple-900/20" />

      <Card className="w-full max-w-md relative z-10 glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/50" style={{ boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              <ShieldCheck className="text-indigo-400" size={28} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Docker Deployer</CardTitle>
          <CardDescription className="mt-1">
            No admin account exists yet. Create your admin account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Admin Username</label>
              <Input
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Choose a strong password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Confirm Password</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">{error}</p>}
            <Button type="submit" className="w-full mt-2" variant="premium" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </Button>
          </form>
          <p className="text-xs text-slate-500 text-center mt-4">
            This page will only appear once. You will be able to add users from the Admin Panel afterwards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
