'use client';
import { useCallback, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function authHeaders(): Record<string, string> {
  const tid = process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const headers: Record<string, string> = { 'x-tenant-id': tid };
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('kkos.token');
    if (token) headers.authorization = `Bearer ${token}`;
  }
  if (process.env.NEXT_PUBLIC_DEV_SERVICE_ROLE) {
    headers['x-service-role'] = process.env.NEXT_PUBLIC_DEV_SERVICE_ROLE;
  }
  return headers;
}

interface CommandResult {
  commandId?: string;
  route?: { intent: string; params: Record<string, unknown>; confidence: number };
  transcript?: string;
  error?: string;
}

export function VoiceBar() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [micUnavailable, setMicUnavailable] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const s = await apiPost<any>('/api/speech/sessions', {
      userId: 'local-dev',
      mode: 'push_to_talk',
    });
    setSessionId(s.id);
    return s.id as string;
  }, [sessionId]);

  async function runText(textOverride?: string) {
    const payload = (textOverride ?? text).trim();
    if (!payload) return;
    setBusy(true);
    try {
      const sid = await ensureSession();
      const res = await apiPost<CommandResult>('/api/speech/commands', {
        sessionId: sid,
        text: payload,
      });
      setResult({ ...res, transcript: payload });
    } catch (err: any) {
      setResult({ error: String(err?.message ?? err) });
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    if (recording) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setMicUnavailable(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // webm/opus is broadly supported; the STT adapter accepts arbitrary
      // mime types and hands them to faster-whisper/ffmpeg.
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await sendAudio();
      };
      rec.start();
      setRecording(true);
      setResult(null);
    } catch (err: any) {
      setMicUnavailable(true);
      setResult({ error: `mic: ${String(err?.message ?? err)}` });
    }
  }

  async function stopRecording() {
    const rec = mediaRef.current;
    if (!rec) return;
    rec.stop();
    setRecording(false);
  }

  async function sendAudio() {
    setBusy(true);
    try {
      const sid = await ensureSession();
      const blob = new Blob(chunksRef.current, {
        type: mediaRef.current?.mimeType ?? 'audio/webm',
      });
      chunksRef.current = [];

      // /api/speech/transcribe takes raw bytes; see SpeechController.
      const res = await fetch(`${API_BASE}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'content-type': blob.type,
          'x-session-id': sid,
        },
        body: blob,
      });
      if (!res.ok) {
        const body = await res.text();
        // Most common case in dev: STT sidecar not running.
        setResult({
          error: `Transkription fehlgeschlagen (${res.status}). ${
            res.status === 500 ? 'STT-Sidecar offline? Tippe den Befehl als Text.' : body
          }`,
        });
        return;
      }
      const json = (await res.json()) as { text?: string };
      if (!json.text) {
        setResult({ error: 'leere Transkription – nichts verstanden' });
        return;
      }
      setText(json.text);
      await runText(json.text);
    } catch (err: any) {
      setResult({ error: String(err?.message ?? err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="border-t border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="chip">Jarvis</span>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={busy && !recording}
          title={micUnavailable ? 'Mikrofon nicht verfügbar' : 'Push-to-talk'}
          className={`px-3 py-1.5 text-sm rounded border transition ${
            recording
              ? 'bg-danger/20 border-danger/50 text-danger animate-pulse'
              : 'bg-bg border-border text-muted hover:text-text'
          } ${micUnavailable ? 'opacity-50' : ''}`}
        >
          {recording ? '● rec · stop' : '🎙 rec'}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runText()}
          placeholder="Befehl sagen oder tippen …"
          className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => runText()}
          disabled={busy || recording}
          className="px-3 py-1.5 text-sm rounded bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {busy ? '…' : 'Senden'}
        </button>
      </div>
      {result && (
        <div className="mt-2 text-xs space-y-1">
          {result.transcript && (
            <div className="text-muted">
              Transkript: <span className="text-text">{result.transcript}</span>
            </div>
          )}
          {result.route && (
            <div className="flex items-center gap-2">
              <span className="chip">intent</span>
              <span className="text-text">{result.route.intent}</span>
              <span className="text-muted">
                conf {Math.round(result.route.confidence * 100)}% · params{' '}
                {JSON.stringify(result.route.params)}
              </span>
            </div>
          )}
          {result.error && <div className="text-danger">{result.error}</div>}
        </div>
      )}
    </footer>
  );
}

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', ''];
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const c of candidates) {
    if (!c) return c;
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'audio/webm';
}
