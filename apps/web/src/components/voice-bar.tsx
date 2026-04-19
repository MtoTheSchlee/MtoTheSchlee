'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';

export function VoiceBar() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function ensureSession() {
    if (sessionId) return sessionId;
    const s = await apiPost<any>('/api/speech/sessions', { userId: 'local-dev', mode: 'push_to_talk' });
    setSessionId(s.id);
    return s.id as string;
  }

  async function runText() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const sid = await ensureSession();
      const res = await apiPost('/api/speech/commands', { sessionId: sid, text });
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="border-t border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="chip">Jarvis</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runText()}
          placeholder="Befehl sagen oder tippen …"
          className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm"
        />
        <button
          onClick={runText}
          disabled={busy}
          className="px-3 py-1.5 text-sm rounded bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {busy ? '…' : 'Senden'}
        </button>
      </div>
      {result && (
        <pre className="mt-2 text-xs text-muted overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </footer>
  );
}
