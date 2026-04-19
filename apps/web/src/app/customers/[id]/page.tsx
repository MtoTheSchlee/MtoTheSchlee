'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ['customer', id], queryFn: () => apiGet<any>(`/api/customers/${id}`) });
  if (!q.data) return <p className="muted-text">lade…</p>;
  const c = q.data;
  return (
    <div className="space-y-6">
      <header className="flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">
          {c.firstName} {c.lastName}
        </h1>
        <span className="text-muted">{c.email}</span>
      </header>

      <section>
        <h2 className="font-medium mb-2">Projekte</h2>
        <div className="surface divide-y divide-border">
          {(c.projects ?? []).map((p: any) => (
            <div key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted">{p.code}</div>
              </div>
              <span className="chip">{p.stage}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Letzte E-Mails</h2>
        <div className="surface divide-y divide-border">
          {(c.emails ?? []).map((m: any) => (
            <div key={m.id} className="p-3">
              <div className="text-xs text-muted">{m.fromAddr}</div>
              <div className="text-sm">{m.subject}</div>
              <span className="chip">{m.classification}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
