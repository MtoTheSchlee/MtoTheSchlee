'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@kuechen-klaus.de');
  const [password, setPassword] = useState('kkos-dev-pass');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await apiPost<{ accessToken: string; user: any }>('/api/auth/login', { email, password });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('kkos.token', res.accessToken);
        window.sessionStorage.setItem('kkos.user', JSON.stringify(res.user));
      }
      router.push('/');
    } catch (e: any) {
      setErr(e?.message ?? 'Login fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <form onSubmit={submit} className="surface p-6 w-96 space-y-4">
        <div>
          <div className="text-sm text-muted">Küchen Klaus</div>
          <h1 className="text-xl font-semibold">Login</h1>
        </div>
        <label className="block text-sm space-y-1">
          <span className="text-muted">E-Mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg border border-border rounded px-2 py-1.5"
          />
        </label>
        <label className="block text-sm space-y-1">
          <span className="text-muted">Passwort</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg border border-border rounded px-2 py-1.5"
          />
        </label>
        {err && <p className="text-danger text-sm">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 rounded bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {busy ? 'Anmelden…' : 'Anmelden'}
        </button>
        <p className="text-xs text-muted">
          Lokaler Pilot. SSO/MFA folgen im Serverbetrieb (siehe docs/02-architecture.md).
        </p>
      </form>
    </div>
  );
}
