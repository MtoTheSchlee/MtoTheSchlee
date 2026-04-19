'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';

export default function AgentsPage() {
  const runs = useQuery({
    queryKey: ['runs'],
    queryFn: () => apiGet<any[]>('/api/agents/runs'),
    refetchInterval: 5_000,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agenten</h1>
        <button
          className="chip"
          onClick={() =>
            apiPost('/api/agents/dispatch', { agentKey: 'controlling', trigger: 'manual' }).then(() => runs.refetch())
          }
        >
          Controlling jetzt triggern
        </button>
      </div>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="text-left p-2">Agent</th>
              <th className="p-2">State</th>
              <th className="text-left p-2">Trigger</th>
              <th className="text-left p-2">Gestartet</th>
              <th className="text-left p-2">Beendet</th>
            </tr>
          </thead>
          <tbody>
            {(runs.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2">{r.agentKey}</td>
                <td className="p-2 text-center chip">{r.state}</td>
                <td className="p-2">{r.trigger}</td>
                <td className="p-2">{r.startedAt?.slice(0, 19).replace('T', ' ') ?? '—'}</td>
                <td className="p-2">{r.finishedAt?.slice(0, 19).replace('T', ' ') ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
