/**
 * Deterministic PII redactor used before outbound LLM calls.
 *
 * Scope (MVP): German contact patterns relevant to Küchen Klaus:
 * - E-Mail addresses
 * - Phone numbers (+49 / 0-prefix, with spaces/dashes)
 * - IBAN
 * - Street lines (very rough)
 * - Long numeric IDs
 *
 * Redaction is lossy by design. Each redacted span gets a stable placeholder
 * like `<EMAIL_1>` so the LLM can still reason about structure. A mapping
 * table is returned so the caller can un-redact the result if needed.
 */
export interface RedactResult {
  text: string;
  mapping: Record<string, string>;
  fields: string[];
}

interface Rule {
  tag: string;
  re: RegExp;
}

const RULES: Rule[] = [
  // Order is significant: specific patterns go first so generic ones
  // (notably PHONE, which is intentionally permissive) cannot consume
  // substrings of IBANs or project codes.
  { tag: 'ORDERNO', re: /\b(?:KK-\d{4}-\d{3,4}|KK-ORD-\d{3,6})\b/g },
  { tag: 'IBAN', re: /\b[A-Z]{2}\d{2}(?:\s?\d){12,30}\b/g },
  { tag: 'EMAIL', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  // German phone numbers: require a leading + or 0 so we don't eat order codes.
  { tag: 'PHONE', re: /(?:\+\d{1,3}[\s\-/]?|\b0)(?:\(?\d{2,5}\)?[\s\-/]?){2,}\d{2,}/g },
  // Rough German street: "Musterstraße 12", "Am Hang 4a"
  { tag: 'STREET', re: /\b[A-ZÄÖÜ][a-zäöüß\-]{2,}(?:stra(?:ß|ss)e|str\.|weg|platz|ring|gasse)\s+\d{1,4}[a-zA-Z]?\b/g },
];

export function redactPii(input: string): RedactResult {
  const mapping: Record<string, string> = {};
  const fields = new Set<string>();
  let out = input;
  const counters = new Map<string, number>();

  for (const rule of RULES) {
    out = out.replace(rule.re, (match) => {
      const existing = Object.entries(mapping).find(([, v]) => v === match);
      if (existing) return existing[0];
      const n = (counters.get(rule.tag) ?? 0) + 1;
      counters.set(rule.tag, n);
      const placeholder = `<${rule.tag}_${n}>`;
      mapping[placeholder] = match;
      fields.add(rule.tag);
      return placeholder;
    });
  }
  return { text: out, mapping, fields: [...fields] };
}

export function unredact(text: string, mapping: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(mapping)) out = out.split(k).join(v);
  return out;
}
