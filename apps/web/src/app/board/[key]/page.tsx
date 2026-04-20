'use client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface Card {
  id: string;
  listId: string;
  title: string;
  summary?: string;
  priority?: string;
  objectKind: string;
  orderIndex: number;
  metadata?: { ampel?: 'red' | 'yellow' | 'green' } | null;
}

interface List {
  id: string;
  name: string;
  orderIndex: number;
  cards: Card[];
}

interface Board {
  id: string;
  name: string;
  lists: List[];
}

export default function BoardPage() {
  const { key } = useParams<{ key: string }>();
  const qc = useQueryClient();
  const q = useQuery<Board>({
    queryKey: ['board', key],
    queryFn: () => apiGet<Board>(`/api/board/${key}`),
    refetchInterval: 8_000,
  });

  const move = useMutation({
    mutationFn: (args: { cardId: string; listId: string; orderIndex: number }) =>
      apiPost(`/api/board/cards/${args.cardId}/move`, {
        listId: args.listId,
        orderIndex: args.orderIndex,
      }),
    // Don't invalidate before the optimistic snapshot settles — the
    // server echoes it back via the next refetch interval.
    onError: () => qc.invalidateQueries({ queryKey: ['board', key] }),
  });

  const [dragId, setDragId] = useState<string | null>(null);
  const [overListId, setOverListId] = useState<string | null>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, cardId: string) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardId);
      setDragId(cardId);
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLElement>, listId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverListId(listId);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, listId: string) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('text/plain') || dragId;
      if (!cardId || !q.data) return;
      const targetList = q.data.lists.find((l) => l.id === listId);
      const nextIndex = (targetList?.cards.length ?? 0) + 1;

      // Optimistic local move so the UI feels instant.
      qc.setQueryData<Board>(['board', key], (old) => {
        if (!old) return old;
        const copy: Board = {
          ...old,
          lists: old.lists.map((l) => ({ ...l, cards: [...l.cards] })),
        };
        let moved: Card | undefined;
        for (const l of copy.lists) {
          const idx = l.cards.findIndex((c) => c.id === cardId);
          if (idx >= 0) {
            moved = { ...l.cards[idx]!, listId, orderIndex: nextIndex };
            l.cards.splice(idx, 1);
            break;
          }
        }
        if (moved) {
          const target = copy.lists.find((l) => l.id === listId);
          target?.cards.push(moved);
        }
        return copy;
      });

      move.mutate({ cardId, listId, orderIndex: nextIndex });
      setDragId(null);
      setOverListId(null);
    },
    [dragId, key, move, q.data, qc],
  );

  if (q.isLoading) return <p className="muted-text">lade…</p>;
  if (!q.data) return <p>Board nicht gefunden.</p>;

  return (
    <div className="flex flex-col gap-4 min-h-[80vh]">
      <header className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{q.data.name}</h1>
        <span className="text-xs text-muted">{key}</span>
        {move.isPending && <span className="text-xs text-accent">speichere…</span>}
      </header>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {q.data.lists.map((list) => {
          const hovered = overListId === list.id && dragId;
          return (
            <section
              key={list.id}
              onDragOver={(e) => onDragOver(e, list.id)}
              onDrop={(e) => onDrop(e, list.id)}
              onDragLeave={() => setOverListId((cur) => (cur === list.id ? null : cur))}
              className={`surface w-80 shrink-0 flex flex-col max-h-[78vh] transition ${
                hovered ? 'border-accent/60 bg-bg/40' : ''
              }`}
            >
              <header className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div className="font-medium">{list.name}</div>
                <span className="chip">{list.cards.length}</span>
              </header>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {list.cards.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, c.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverListId(null);
                    }}
                    className={`surface p-3 cursor-grab active:cursor-grabbing hover:border-accent/40 transition ${
                      dragId === c.id ? 'opacity-40' : ''
                    }`}
                  >
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
                {list.cards.length === 0 && (
                  <div className="text-xs text-muted p-2 text-center opacity-60">
                    {hovered ? 'hier loslassen' : 'leer'}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
