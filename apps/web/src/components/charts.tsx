'use client';
/**
 * Minimal chart primitives without a chart library.
 * Tailored for dashboards where ink-to-data ratio matters more than
 * pretty tooltips. Swap to Recharts later if we need interactivity.
 */

export interface BarSeries {
  label: string;
  /** Stack segments (green/yellow/red or any custom). */
  segments: { value: number; color: string; title?: string }[];
}

export function StackedBars({
  series,
  max,
  height = 140,
  valueFormat = (n: number) => `${n}`,
}: {
  series: BarSeries[];
  max?: number;
  height?: number;
  valueFormat?: (n: number) => string;
}) {
  const sums = series.map((s) => s.segments.reduce((a, b) => a + b.value, 0));
  const top = max ?? Math.max(1, ...sums);
  const barGap = 16;
  const barW = 56;
  const width = series.length * (barW + barGap) + barGap;
  const totalHeight = height + 32;

  return (
    <svg
      viewBox={`0 0 ${width} ${totalHeight}`}
      width={width}
      height={totalHeight}
      preserveAspectRatio="xMinYMin meet"
      role="img"
    >
      {series.map((s, i) => {
        const total = sums[i] ?? 0;
        let yCursor = height;
        const x = barGap + i * (barW + barGap);
        return (
          <g key={s.label}>
            {s.segments.map((seg, j) => {
              const h = top === 0 ? 0 : (seg.value / top) * height;
              yCursor -= h;
              return (
                <rect
                  key={j}
                  x={x}
                  y={yCursor}
                  width={barW}
                  height={h}
                  rx={2}
                  fill={seg.color}
                  opacity={seg.value === 0 ? 0 : 0.9}
                >
                  {seg.title && <title>{seg.title}</title>}
                </rect>
              );
            })}
            <text
              x={x + barW / 2}
              y={height + 14}
              textAnchor="middle"
              fontSize={11}
              style={{ fill: 'currentColor' }}
            >
              {s.label}
            </text>
            <text
              x={x + barW / 2}
              y={height + 28}
              textAnchor="middle"
              fontSize={10}
              opacity={0.6}
              style={{ fill: 'currentColor' }}
            >
              {valueFormat(total)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Sparkline({
  points,
  height = 40,
  color = '#4ade80',
}: {
  points: number[];
  height?: number;
  color?: string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const w = 100;
  const step = w / Math.max(1, points.length - 1);
  const scaled = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={scaled.join(' ')} />
    </svg>
  );
}
