'use client';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UploadResponse {
  documentId: string;
  parsed: { abNumber?: string; items: Array<{ positionNo: number | null; description: string; qty: number }> };
  confirmation?: { id: string; status: string; ampel: string | null; diffs: number };
  unresolved?: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function tenantHeaders(): Record<string, string> {
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

/**
 * Drag&Drop zone for uploading an AB PDF. Multipart needs to skip the
 * JSON-based apiPost helper, so we build the fetch manually while
 * reusing the tenant/auth header builder.
 */
export function AbUploadDropzone({ onIngested }: { onIngested?: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setErr(null);
      setResult(null);
      try {
        const form = new FormData();
        form.set('file', file);
        const res = await fetch(`${API_BASE}/api/ab/upload`, {
          method: 'POST',
          headers: tenantHeaders(),
          body: form,
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const json = (await res.json()) as UploadResponse;
        setResult(json);
        qc.invalidateQueries({ queryKey: ['ab.list'] });
        qc.invalidateQueries({ queryKey: ['metrics.snapshot'] });
        onIngested?.();
      } catch (e: any) {
        setErr(e?.message ?? 'upload fehlgeschlagen');
      } finally {
        setBusy(false);
      }
    },
    [qc, onIngested],
  );

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErr(`nur PDFs werden unterstützt (erhalten: ${file.type || 'unbekannt'})`);
      return;
    }
    void upload(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      className={`surface border border-dashed p-4 space-y-3 transition ${
        hover ? 'border-accent/60 bg-bg/50' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">AB hochladen</div>
          <div className="text-xs text-muted">
            PDF hierher ziehen oder klicken. Parser + Matcher laufen automatisch.
          </div>
        </div>
        <label className="chip cursor-pointer">
          <input type="file" accept="application/pdf" className="hidden" onChange={onPick} />
          Datei wählen
        </label>
      </div>

      {busy && <div className="text-xs text-accent">verarbeite …</div>}
      {err && <div className="text-xs text-danger">{err}</div>}

      {result && (
        <div className="text-xs space-y-2">
          {result.confirmation ? (
            <div className="flex items-center gap-2">
              <span className={`chip-${result.confirmation.ampel ?? 'yellow'}`}>
                {result.confirmation.ampel ?? '—'}
              </span>
              <span>AB angelegt · Status {result.confirmation.status}</span>
              <span className="text-muted">{result.confirmation.diffs} Abweichungen</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="chip-yellow">triage</span>
              <span>
                Document gespeichert, aber {result.unresolved?.join(' + ') ?? 'etwas'} unklar –
                bitte manuell zuweisen.
              </span>
            </div>
          )}
          <details className="text-muted">
            <summary className="cursor-pointer">
              Parsed: {result.parsed.items.length} Positionen
              {result.parsed.abNumber ? ` · AB-Nr. ${result.parsed.abNumber}` : ''}
            </summary>
            <ul className="pl-4 mt-1 space-y-0.5">
              {result.parsed.items.slice(0, 10).map((it, i) => (
                <li key={i}>
                  Pos {it.positionNo ?? '?'} · {it.qty}× {it.description}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
