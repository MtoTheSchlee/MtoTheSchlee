'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';

export default function AppointmentsPage() {
  const upcoming = useQuery({ queryKey: ['appts'], queryFn: () => apiGet<any[]>('/api/appointments') });
  const suggestions = useQuery({ queryKey: ['appts.sug'], queryFn: () => apiGet<any[]>('/api/appointments/suggestions') });
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-3">Termine</h1>
        <div className="surface divide-y divide-border">
          {(upcoming.data ?? []).map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted">{a.startAt} – {a.endAt}</div>
              </div>
              <span className="chip">{a.kind}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Vorschläge (aus E-Mails)</h2>
        <div className="surface divide-y divide-border">
          {(suggestions.data ?? []).map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{s.proposed?.title}</div>
                <div className="text-xs text-muted">
                  {s.proposed?.startAt} • Score {Math.round(Number(s.score) * 100)}%
                </div>
              </div>
              <button
                className="chip-green"
                onClick={async () => {
                  await apiPost(`/api/appointments/suggestions/${s.id}/accept`, {});
                  suggestions.refetch();
                  upcoming.refetch();
                }}
              >
                übernehmen
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
