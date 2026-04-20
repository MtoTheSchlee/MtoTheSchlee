'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { StackedBars, type BarSeries } from '@/components/charts';

interface Snapshot {
  openDiscrepancies: number;
  redDiscrepancies: number;
  toReviewDocs: number;
  toReviewEmails?: number;
  toReviewSuggestions?: number;
  openCards: number;
  projectsInExec: number;
}

interface SupplierScorecard {
  supplierId: string;
  name?: string;
  total: number;
  green: number;
  yellow: number;
  red: number;
  deviationRate: number;
}

interface CycleTime {
  count: number;
  avg: number;
  p50: number;
  p90: number;
}

export default function ControllingPage() {
  const cycle = useQuery<CycleTime>({ queryKey: ['c.cycle'], queryFn: () => apiGet('/api/metrics/cycle-time') });
  const snap = useQuery<Snapshot>({ queryKey: ['c.snap'], queryFn: () => apiGet('/api/metrics/snapshot') });
  const suppliers = useQuery<SupplierScorecard[]>({
    queryKey: ['c.suppliers'],
    queryFn: () => apiGet('/api/metrics/suppliers'),
  });

  const barSeries: BarSeries[] = (suppliers.data ?? []).map((s) => ({
    label: (s.name ?? s.supplierId.slice(0, 8)) as string,
    segments: [
      { value: s.green, color: '#4ade80', title: `${s.green} grün` },
      { value: s.yellow, color: '#f59e0b', title: `${s.yellow} gelb` },
      { value: s.red, color: '#ef4444', title: `${s.red} rot` },
    ],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Controlling</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi label="offene Abweichungen" value={snap.data?.openDiscrepancies ?? '—'} />
        <Kpi label="kritisch rot" value={snap.data?.redDiscrepancies ?? '—'} tone="danger" />
        <Kpi label="zu prüfen" value={snap.data?.toReviewDocs ?? '—'} tone="warn" />
        <Kpi label="offene Karten" value={snap.data?.openCards ?? '—'} />
        <Kpi label="in Ausführung" value={snap.data?.projectsInExec ?? '—'} />
        <Kpi
          label="Ø Durchlaufzeit"
          value={cycle.data ? `${cycle.data.avg.toFixed(1)} d` : '—'}
        />
      </div>

      <section className="surface p-4 space-y-3">
        <h2 className="font-medium">
          Lieferanten-Ampel (180 Tage)
          <span className="text-xs text-muted ml-2">grün / gelb / rot gestapelt</span>
        </h2>
        {barSeries.length === 0 ? (
          <p className="muted-text">Noch keine Daten</p>
        ) : (
          <StackedBars series={barSeries} height={160} />
        )}
        <div className="text-xs text-muted flex gap-4 pt-2">
          <LegendDot color="#4ade80" label="matched / grün" />
          <LegendDot color="#f59e0b" label="yellow prüfen" />
          <LegendDot color="#ef4444" label="kritisch rot" />
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="font-medium mb-3">Abweichungsrate je Lieferant</h2>
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
            {(suppliers.data ?? []).map((s) => (
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

      <section className="surface p-4">
        <h2 className="font-medium mb-3">Durchlaufzeit (abgeschlossene Projekte)</h2>
        {cycle.data && cycle.data.count > 0 ? (
          <ul className="text-sm space-y-1">
            <li>n = {cycle.data.count}</li>
            <li>Ø {cycle.data.avg.toFixed(1)} Tage</li>
            <li>Median {cycle.data.p50.toFixed(1)} Tage</li>
            <li>P90 {cycle.data.p90.toFixed(1)} Tage</li>
          </ul>
        ) : (
          <p className="muted-text">Noch keine abgeschlossenen Projekte</p>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warn' | 'danger' }) {
  const c = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <div className="surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-semibold ${c}`}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
