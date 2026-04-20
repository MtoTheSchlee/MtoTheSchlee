import { describe, expect, it } from 'vitest';
import { AbMatcher, type ExtractedAbItem, type OrderItemRef } from './ab.matcher.js';

const matcher = new AbMatcher();

function order(...items: Partial<OrderItemRef>[]): OrderItemRef[] {
  return items.map((p, i) => ({
    id: p.id ?? `o${i}`,
    positionNo: p.positionNo ?? (i + 1) * 10,
    sku: p.sku ?? null,
    description: p.description ?? `Pos ${i}`,
    qty: p.qty ?? 1,
    unitPriceNet: p.unitPriceNet ?? 100,
    requestedDeliveryAt: p.requestedDeliveryAt ?? null,
  }));
}
function ab(...items: Partial<ExtractedAbItem>[]): ExtractedAbItem[] {
  return items.map((p, i) => ({
    positionNo: p.positionNo ?? (i + 1) * 10,
    sku: p.sku ?? null,
    description: p.description ?? `Pos ${i}`,
    qty: p.qty ?? 1,
    unitPriceNet: p.unitPriceNet ?? 100,
    confirmedDeliveryAt: p.confirmedDeliveryAt ?? null,
  }));
}

describe('AbMatcher', () => {
  it('perfect match -> green, no diffs', () => {
    const r = matcher.match(order({ qty: 2, unitPriceNet: 320 }), ab({ qty: 2, unitPriceNet: 320 }));
    expect(r.ampel).toBe('green');
    expect(r.diffs).toHaveLength(0);
  });

  it('detects missing positions as red', () => {
    const r = matcher.match(order({ positionNo: 10 }, { positionNo: 20 }), ab({ positionNo: 10 }));
    expect(r.ampel).toBe('red');
    expect(r.diffs.some((d) => d.kind === 'missing_position')).toBe(true);
  });

  it('detects unexpected positions as red', () => {
    const r = matcher.match(order({ positionNo: 10 }), ab({ positionNo: 10 }, { positionNo: 99 }));
    expect(r.ampel).toBe('red');
    expect(r.diffs.some((d) => d.kind === 'unexpected_position')).toBe(true);
  });

  it('qty delta produces red at large gap', () => {
    const r = matcher.match(order({ qty: 10, unitPriceNet: 100 }), ab({ qty: 9, unitPriceNet: 100 }));
    expect(r.ampel).toBe('red');
    expect(r.diffs.some((d) => d.kind === 'wrong_qty')).toBe(true);
  });

  it('minor price delta yields yellow', () => {
    const r = matcher.match(order({ qty: 1, unitPriceNet: 100 }), ab({ qty: 1, unitPriceNet: 100.5 }));
    expect(r.ampel).toBe('yellow');
    expect(r.diffs.some((d) => d.kind === 'price_delta')).toBe(true);
  });

  it('uses SKU as secondary match key when positionNo diverges', () => {
    const o = order({ positionNo: 10, sku: 'NB-42', qty: 1, unitPriceNet: 100 });
    const a = ab({ positionNo: 99, sku: 'nb-42', qty: 1, unitPriceNet: 100 });
    const r = matcher.match(o, a);
    expect(r.summary.totalOrdered).toBe(1);
    expect(r.summary.totalConfirmed).toBe(1);
    // Matched by SKU -> no missing / unexpected rows
    expect(r.diffs).toHaveLength(0);
    expect(r.ampel).toBe('green');
  });

  it('late delivery > 7d triggers red', () => {
    const order1 = order({
      positionNo: 10,
      qty: 1,
      unitPriceNet: 100,
      requestedDeliveryAt: new Date('2026-03-01T00:00:00Z'),
    });
    const ab1 = ab({
      positionNo: 10,
      qty: 1,
      unitPriceNet: 100,
      confirmedDeliveryAt: new Date('2026-03-15T00:00:00Z'),
    });
    const r = matcher.match(order1, ab1);
    expect(r.ampel).toBe('red');
    expect(r.diffs.some((d) => d.kind === 'date_delta')).toBe(true);
  });
});
