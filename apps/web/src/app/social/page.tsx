'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

const STATES = ['idea', 'draft', 'review', 'approved', 'scheduled', 'published'];

export default function SocialPage() {
  const posts = useQuery({ queryKey: ['social'], queryFn: () => apiGet<any[]>('/api/social') });
  const grouped = groupBy(posts.data ?? [], (p: any) => p.state);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Social-Studio</h1>
      <div className="flex gap-3 overflow-x-auto">
        {STATES.map((s) => (
          <section key={s} className="surface w-72 shrink-0">
            <header className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="font-medium capitalize">{s}</div>
              <span className="chip">{(grouped[s] ?? []).length}</span>
            </header>
            <div className="p-2 space-y-2">
              {(grouped[s] ?? []).map((p: any) => (
                <article key={p.id} className="surface p-2">
                  <div className="text-xs text-muted">{p.channel}</div>
                  <div className="text-sm whitespace-pre-wrap line-clamp-5">{p.contentText}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function groupBy<T>(rows: T[], fn: (r: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, r) => {
    const k = fn(r);
    (acc[k] = acc[k] ?? []).push(r);
    return acc;
  }, {});
}
