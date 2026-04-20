import { describe, expect, it } from 'vitest';
import { classifyEmail } from './mail.classifier.js';

describe('classifyEmail (regex baseline)', () => {
  it('detects order confirmations by subject AB-Nr.', () => {
    const r = classifyEmail({
      subject: 'Auftragsbestätigung AB-Nr. 2026/001',
      bodyText: 'Wir bestätigen Ihren Auftrag. Liefertermin 15.04.2026.',
      fromAddr: 'sales@nobilia.de',
      hasAttachments: true,
    });
    expect(r.classification).toBe('ab');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('classifies invoices', () => {
    const r = classifyEmail({
      subject: 'Rechnung Nr. 4711',
      bodyText: 'Anbei finden Sie Ihre Rechnung.',
      fromAddr: 'buchhaltung@haecker.de',
    });
    expect(r.classification).toBe('invoice');
  });

  it('classifies complaints', () => {
    const r = classifyEmail({
      subject: 'Reklamation Küche Mustermann',
      bodyText: 'Bei der Montage war die Schublade defekt.',
      fromAddr: 'kunde@example.com',
    });
    expect(r.classification).toBe('complaint');
  });

  it('returns unknown for unrelated text', () => {
    const r = classifyEmail({
      subject: 'Grüße',
      bodyText: 'Hallo, nur mal gemeldet.',
      fromAddr: 'x@y.de',
    });
    expect(r.classification).toBe('unknown');
  });
});
