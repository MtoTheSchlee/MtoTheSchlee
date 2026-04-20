import { describe, expect, it } from 'vitest';
import { redactPii, unredact } from './redactor.js';

describe('redactPii', () => {
  it('redacts emails with stable placeholders', () => {
    const r = redactPii('Bitte an max.mustermann@example.com weiterleiten');
    expect(r.text).toContain('<EMAIL_1>');
    expect(r.fields).toContain('EMAIL');
    expect(r.mapping['<EMAIL_1>']).toBe('max.mustermann@example.com');
  });

  it('reuses placeholders for identical values', () => {
    const r = redactPii('a@b.de und a@b.de');
    const matches = r.text.match(/<EMAIL_\d+>/g) ?? [];
    expect(matches.length).toBe(2);
    expect(new Set(matches).size).toBe(1);
  });

  it('redacts IBANs, phone numbers and street lines', () => {
    const r = redactPii('IBAN DE02 1203 0000 1020 1234 56, Tel +49 170 1234567, Musterstraße 12');
    expect(r.fields).toEqual(expect.arrayContaining(['IBAN', 'PHONE', 'STREET']));
  });

  it('redacts project / order codes', () => {
    const r = redactPii('Projekt KK-2026-0142 bzw. KK-ORD-0001');
    expect(r.fields).toContain('ORDERNO');
    expect(Object.values(r.mapping)).toEqual(expect.arrayContaining(['KK-2026-0142', 'KK-ORD-0001']));
  });

  it('unredact is the inverse of redact', () => {
    const input = 'Max <max@example.com> hat KK-2026-0001 bestellt.';
    const r = redactPii(input);
    expect(unredact(r.text, r.mapping)).toBe(input);
  });
});
