'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';

interface SearchHit {
  kind:
    | 'customer'
    | 'project'
    | 'supplier'
    | 'order'
    | 'order_confirmation'
    | 'email'
    | 'board_card'
    | 'document';
  id: string;
  label: string;
  preview?: string;
  href: string;
  score: number;
  meta?: Record<string, unknown>;
}

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  customer: 'Kunde',
  project: 'Projekt',
  supplier: 'Lieferant',
  order: 'Bestellung',
  order_confirmation: 'AB',
  email: 'E-Mail',
  board_card: 'Karte',
  document: 'Dokument',
};

/**
 * Cmd/Ctrl+K command palette. Shows a modal, debounces queries against
 * /api/search, and lets you navigate results by keyboard.
 *
 * Kept intentionally minimal (no combobox lib) so it stays zero-dep and
 * easy to extend with voice-routed commands later.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard: cmd/ctrl-K opens, esc closes. Use a ref-less direct open
  // (no toggle) so accidental key repeats can't close it again before
  // the input is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isOpener = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isOpener) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<SearchHit[]>(`/api/search?q=${encodeURIComponent(term)}`);
        setHits(data);
        setActive(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (open) {
      // Focus the input on open.
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ('');
      setHits([]);
      setActive(0);
    }
  }, [open]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) {
        router.push(hit.href);
        setOpen(false);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-50"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface w-[560px] max-w-[90vw] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <span className="text-xs text-muted">⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Suchen: Kunde, Projekt, AB, Lieferant, E-Mail …"
            className="flex-1 bg-transparent outline-none text-sm"
            aria-label="Suche"
          />
          {loading && <span className="text-xs text-muted">…</span>}
        </div>
        <ul className="max-h-[50vh] overflow-y-auto">
          {hits.length === 0 && q.trim().length >= 2 && !loading && (
            <li className="px-4 py-8 text-center text-sm text-muted">keine Treffer</li>
          )}
          {hits.length === 0 && q.trim().length < 2 && (
            <li className="px-4 py-4 text-xs text-muted">
              Beispiele: „Nobilia", „KK-2026-0001", „Reklamation", „Mustermann"
            </li>
          )}
          {hits.map((h, i) => (
            <li key={`${h.kind}:${h.id}`}>
              <button
                type="button"
                onClick={() => {
                  router.push(h.href);
                  setOpen(false);
                }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 ${
                  i === active ? 'bg-bg/70' : ''
                }`}
              >
                <span className="chip shrink-0 text-[10px] min-w-[60px] justify-center">
                  {KIND_LABEL[h.kind]}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{h.label}</span>
                  {h.preview && (
                    <span className="block text-xs text-muted truncate">{h.preview}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-3 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted">
          <span>↑↓ navigieren · ⏎ öffnen · esc schließen</span>
          <span>{hits.length > 0 && `${hits.length} Treffer`}</span>
        </div>
      </div>
    </div>
  );
}
