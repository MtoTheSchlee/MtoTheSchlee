'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function DashboardPage() {
  const snap = useQuery({ queryKey: ['metrics.snapshot'], queryFn: () => apiGet<any>('/api/metrics/snapshot') });
  const cycle = useQuery({ queryKey: ['metrics.cycle'], queryFn: () => apiGet<any>('/api/metrics/cycle-time') });
  const scorecards = useQuery({ queryKey: ['metrics.suppliers'], queryFn: () => apiGet<any[]>('/api/metrics/suppliers') });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Kommandozentrale</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Zu prüfen"
          value={snap.data?.toReviewTotal ?? '—'}
          hint={snap.data ? `${snap.data.toReviewEmails}× Mail · ${snap.data.toReviewSuggestions}× Termin · ${snap.data.toReviewDocs}× Doc` : undefined}
          tone="warn"
        />
        <KpiCard label="Kritische Abweichungen" value={snap.data?.redDiscrepancies ?? '—'} tone="danger" />
        <KpiCard label="Offene Abweichungen" value={snap.data?.openDiscrepancies ?? '—'} tone="warn" />
        <KpiCard label="Projekte in Ausführung" value={snap.data?.projectsInExec ?? '—'} />
        <KpiCard label="Offene Karten" value={snap.data?.openCards ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="surface p-4">
          <h2 className="font-medium mb-2">Durchlaufzeit</h2>
          {cycle.data ? (
            <ul className="text-sm space-y-1">
              <li>n = {cycle.data.count}</li>
              <li>Ø {fmt(cycle.data.avg)} Tage</li>
              <li>Median {fmt(cycle.data.p50)} Tage</li>
              <li>P90 {fmt(cycle.data.p90)} Tage</li>
            </ul>
          ) : (
            <p className="muted-text">lade…</p>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="font-medium mb-2">Lieferanten-Scorecards (180 Tage)</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left py-1">Lieferant</th>
                <th>Gesamt</th>
                <th>Grün</th>
                <th>Gelb</th>
                <th>Rot</th>
                <th>Abweichungsrate</th>
              </tr>
            </thead>
            <tbody>
              {(scorecards.data ?? []).map((s) => (
                <tr key={s.supplierId} className="border-t border-border">
                  <td className="py-1">{s.name ?? s.supplierId.slice(0, 8)}</td>
                  <td className="text-center">{s.total}</td>
                  <td className="text-center text-accent">{s.green}</td>
                  <td className="text-center text-warn">{s.yellow}</td>
                  <td className="text-center text-danger">{s.red}</td>
                  <td className="text-center">{Math.round(s.deviationRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: any;
  hint?: string;
  tone?: 'warn' | 'danger';
}) {
  const c = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <div className="surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-3xl font-semibold ${c}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted mt-1 leading-tight">{hint}</div>}
    </div>
  );
}

function fmt(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toFixed(1);
}
