'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not sign in.');
        return;
      }
      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminCard className="w-full max-w-sm p-8">
      <div className="mb-6 flex items-center gap-2 text-emerald-400">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-widest">Pharmacy Admin</span>
      </div>
      <h1 className="text-2xl font-bold text-zinc-100">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Internal pharmacy CRM — staff access only.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Email
          </span>
          <AdminInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Password
          </span>
          <AdminInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </label>

        {error && (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <AdminButton type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
        </AdminButton>
      </form>

      <p className="mt-6 text-center text-[11px] text-zinc-600">
        Lic. No: MH-AUR-00001 · Authorized staff only
      </p>
    </AdminCard>
  );
}
