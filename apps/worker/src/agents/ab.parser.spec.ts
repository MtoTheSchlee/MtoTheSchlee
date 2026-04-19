import { describe, expect, it } from 'vitest';
import { parseAbBasic } from './ab.parser.js';

describe('parseAbBasic', () => {
  it('extracts AB number and positions from plain text', () => {
    const subject = 'Auftragsbestätigung';
    const body = [
      'AB-Nr.: 2026/A-0042',
      '',
      '10  2  Stk   Unterschrank 60cm               320,00 €',
      '20  1  Stk   Hochschrank 60/213              540,00 €',
      '30  1  Stk   Arbeitsplatte 4000x600          289,00 €',
      '',
      'Liefertermin: 15.04.2026',
    ].join('\n');
    const r = parseAbBasic({ subject, body });
    expect(r.abNumber).toBe('2026/A-0042');
    expect(r.items).toHaveLength(3);
    expect(r.items[0]).toMatchObject({ positionNo: 10, qty: 2, unitPriceNet: 320 });
    expect(r.items[1]).toMatchObject({ positionNo: 20, qty: 1, unitPriceNet: 540 });
  });

  it('tolerates missing AB number', () => {
    const r = parseAbBasic({
      subject: 'Bestätigung',
      body: '10  1  Stk   Testartikel   10,00 €',
    });
    expect(r.abNumber).toBeUndefined();
    expect(r.items).toHaveLength(1);
  });
});
