// Small helpers for stable idempotency keys and code generation.

import { createHash } from 'node:crypto';

export function idempotencyKey(parts: (string | number | null | undefined)[]): string {
  const data = parts.map((p) => (p === undefined || p === null ? '' : String(p))).join('|');
  return createHash('sha256').update(data).digest('hex');
}

export function projectCode(opts: { year: number; seq: number; prefix?: string }): string {
  const prefix = opts.prefix ?? 'KK';
  return `${prefix}-${opts.year}-${String(opts.seq).padStart(4, '0')}`;
}
