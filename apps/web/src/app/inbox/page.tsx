'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function InboxPage() {
  const [filter, setFilter] = useState<string | ''>('');
  const [q, setQ] = useState('');
  const emails = useQuery({
    queryKey: ['emails', filter, q],
    queryFn: () =>
      apiGet<any[]>(
        `/api/emails?${new URLSearchParams({ ...(filter ? { classification: filter } : {}), ...(q ? { q } : {}) })}`,
      ),
  });

  return (
    <div className="flex gap-4 h-[85vh]">
      <aside className="w-64 surface p-3 flex flex-col gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche…"
          className="bg-bg border border-border rounded px-2 py-1 text-sm"
        />
        <FilterButton label="Alle" value="" current={filter} onClick={setFilter} />
        <FilterButton label="ABs" value="ab" current={filter} onClick={setFilter} />
        <FilterButton label="Rechnungen" value="invoice" current={filter} onClick={setFilter} />
        <FilterButton label="Angebote" value="quote" current={filter} onClick={setFilter} />
        <FilterButton label="Lieferavis" value="delivery_date" current={filter} onClick={setFilter} />
        <FilterButton label="Reklamationen" value="complaint" current={filter} onClick={setFilter} />
        <FilterButton label="Kundenfragen" value="customer_request" current={filter} onClick={setFilter} />
        <FilterButton label="Unbekannt" value="unknown" current={filter} onClick={setFilter} />
      </aside>

      <section className="flex-1 surface overflow-y-auto">
        {emails.data?.length === 0 && <p className="p-6 muted-text">Keine E-Mails.</p>}
        <ul className="divide-y divide-border">
          {(emails.data ?? []).map((m) => (
            <li key={m.id} className="p-3 hover:bg-bg">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{m.fromAddr}</span>
                <span>{m.receivedAt?.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div className="font-medium">{m.subject}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="chip">{m.classification}</span>
                <span className="chip">{m.status}</span>
                {m.hasAttachments && <span className="chip">📎</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FilterButton({
  label,
  value,
  current,
  onClick,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (v: string) => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`text-left text-sm px-2 py-1 rounded border ${
        active ? 'bg-bg border-accent/40 text-accent' : 'border-border text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}
