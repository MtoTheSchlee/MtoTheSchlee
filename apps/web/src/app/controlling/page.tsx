'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function ControllingPage() {
  const cycle = useQuery({ queryKey: ['c.cycle'], queryFn: () => apiGet<any>('/api/metrics/cycle-time') });
  const snap = useQuery({ queryKey: ['c.snap'], queryFn: () => apiGet<any>('/api/metrics/snapshot') });
  const suppliers = useQuery({ queryKey: ['c.suppliers'], queryFn: () => apiGet<any[]>('/api/metrics/suppliers') });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Controlling</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface p-4">
          <h2 className="font-medium mb-2">Snapshot</h2>
          <pre className="text-xs text-muted">{JSON.stringify(snap.data, null, 2)}</pre>
        </div>
        <div className="surface p-4">
          <h2 className="font-medium mb-2">Durchlaufzeit</h2>
          <pre className="text-xs text-muted">{JSON.stringify(cycle.data, null, 2)}</pre>
        </div>
      </div>
      <div className="surface p-4">
        <h2 className="font-medium mb-2">Lieferanten-Scorecards</h2>
        <pre className="text-xs text-muted overflow-x-auto">{JSON.stringify(suppliers.data, null, 2)}</pre>
      </div>
    </div>
  );
}
