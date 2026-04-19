'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function SuppliersPage() {
  const list = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet<any[]>('/api/suppliers') });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lieferanten</h1>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Typ</th>
              <th className="text-left p-2">Reliability</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.type}</td>
                <td className="p-2">{s.reliabilityScore ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
