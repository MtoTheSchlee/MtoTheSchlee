'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';

export default function BoardPage() {
  const { key } = useParams<{ key: string }>();
  const q = useQuery({
    queryKey: ['board', key],
    queryFn: () => apiGet<any>(`/api/board/${key}`),
    refetchInterval: 5_000,
  });

  if (q.isLoading) return <p className="muted-text">lade…</p>;
  if (!q.data) return <p>Board nicht gefunden.</p>;

  return (
    <div className="flex flex-col gap-4 min-h-[80vh]">
      <header className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{q.data.name}</h1>
        <span className="text-xs text-muted">{key}</span>
      </header>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {q.data.lists.map((list: any) => (
          <section
            key={list.id}
            className="surface w-80 shrink-0 flex flex-col max-h-[78vh]"
          >
            <header className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="font-medium">{list.name}</div>
              <span className="chip">{list.cards.length}</span>
            </header>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {list.cards.map((c: any) => (
                <article key={c.id} className="surface p-3 hover:border-accent/40 transition">
                  <div className="flex items-center gap-2 mb-1 text-xs text-muted">
                    <span className="chip">{c.objectKind}</span>
                    {c.priority && <span className="chip">{c.priority}</span>}
                    {c.metadata?.ampel === 'red' && <span className="chip-red">rot</span>}
                    {c.metadata?.ampel === 'yellow' && <span className="chip-yellow">gelb</span>}
                    {c.metadata?.ampel === 'green' && <span className="chip-green">grün</span>}
                  </div>
                  <div className="text-sm font-medium">{c.title}</div>
                  {c.summary && <div className="text-xs text-muted mt-1 line-clamp-3">{c.summary}</div>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
