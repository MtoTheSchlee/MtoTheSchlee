'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { AbUploadDropzone } from '@/components/ab-upload';

export default function AbPage() {
  const [ampel, setAmpel] = useState<string>('');
  const list = useQuery({
    queryKey: ['ab.list', ampel],
    queryFn: () => apiGet<any[]>(`/api/ab${ampel ? `?ampel=${ampel}` : ''}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AB-Prüfung</h1>
        <div className="flex gap-2">
          {['', 'green', 'yellow', 'red'].map((a) => (
            <button
              key={a || 'all'}
              onClick={() => setAmpel(a)}
              className={`chip ${ampel === a ? 'border-accent/60 text-accent' : ''}`}
            >
              {a || 'alle'}
            </button>
          ))}
        </div>
      </div>

      <AbUploadDropzone onIngested={() => list.refetch()} />

      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="text-left p-2">AB-Nr.</th>
              <th className="text-left p-2">Lieferant</th>
              <th className="text-left p-2">Projekt</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ampel</th>
              <th className="p-2">Abweichungen</th>
              <th className="p-2">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-2">{c.abNumber ?? '—'}</td>
                <td className="p-2">{c.supplier?.name}</td>
                <td className="p-2">{c.project?.code}</td>
                <td className="p-2 text-center chip">{c.status}</td>
                <td className="p-2 text-center">
                  <span className={`chip-${c.ampel ?? 'yellow'}`}>{c.ampel ?? '—'}</span>
                </td>
                <td className="p-2 text-center">{c.discrepancies?.length ?? 0}</td>
                <td className="p-2 text-center">
                  {c.status !== 'accepted' && (
                    <button
                      className="chip-green"
                      onClick={async () => {
                        await apiPost(`/api/ab/${c.id}/accept`, {});
                        list.refetch();
                      }}
                    >
                      akzeptieren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
