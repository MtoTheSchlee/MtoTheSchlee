import type { EmailClassification } from '@kk/shared';

interface Input {
  subject: string;
  bodyText: string;
  fromAddr: string;
  hasAttachments?: boolean;
}

interface Output {
  classification: EmailClassification;
  confidence: number;
  reasons: string[];
}

/** German kitchen-supply mail vocabulary. Deterministic & replaceable. */
const PATTERNS: Array<{ c: EmailClassification; re: RegExp; weight: number; reason: string }> = [
  { c: 'ab', re: /\b(Auftragsbest(ä|ae)tigung|AB[- ]?Nr\.?|Auftragsnummer|order confirmation)\b/i, weight: 0.6, reason: 'subject/body: AB' },
  { c: 'ab', re: /\b(best(ä|ae)tigen wir|Liefertermin|Lieferdatum)\b/i, weight: 0.2, reason: 'confirm wording' },
  { c: 'invoice', re: /\b(Rechnung|Invoice|Rechnungsnummer)\b/i, weight: 0.6, reason: 'invoice wording' },
  { c: 'quote', re: /\b(Angebot|Kostenvoranschlag|Angebotsnummer)\b/i, weight: 0.6, reason: 'quote wording' },
  { c: 'delivery_date', re: /\b(Lieferavis|Anlieferung|Zustellung|Versandbest(ä|ae)tigung|Tracking)\b/i, weight: 0.5, reason: 'delivery wording' },
  { c: 'complaint', re: /\b(Reklamation|M(ä|ae)ngelr(ü|ue)ge|Beschwerde|Schaden|defekt)\b/i, weight: 0.7, reason: 'complaint wording' },
  { c: 'customer_request', re: /\b(Anfrage|Beratung|Termin|wir h(ä|ae)tten gern|Interesse)\b/i, weight: 0.3, reason: 'customer phrasing' },
  { c: 'promo', re: /\b(Newsletter|Abmelden|unsubscribe|Rabatt|Aktion|Sonderangebot)\b/i, weight: 0.4, reason: 'marketing wording' },
];

export function classifyEmail(input: Input): Output {
  const hay = `${input.subject}\n${input.bodyText}`.slice(0, 8000);
  const scores = new Map<EmailClassification, { s: number; rs: string[] }>();

  for (const p of PATTERNS) {
    if (p.re.test(hay)) {
      const cur = scores.get(p.c) ?? { s: 0, rs: [] };
      cur.s += p.weight;
      cur.rs.push(p.reason);
      scores.set(p.c, cur);
    }
  }
  if (input.hasAttachments) {
    const ab = scores.get('ab');
    if (ab) {
      ab.s += 0.2;
      ab.rs.push('has attachments + AB signal');
    }
  }

  let best: { c: EmailClassification; s: number; rs: string[] } = { c: 'unknown', s: 0, rs: [] };
  for (const [c, v] of scores) {
    if (v.s > best.s) best = { c, ...v };
  }
  const confidence = Math.max(0, Math.min(1, best.s));
  return {
    classification: best.s > 0 ? best.c : 'unknown',
    confidence: best.s > 0 ? confidence : 0.2,
    reasons: best.rs,
  };
}
