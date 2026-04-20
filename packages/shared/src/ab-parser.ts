/**
 * Baseline AB parser shared by API and worker.
 *
 * Strategy:
 * 1. Look for an AB number in subject/body.
 * 2. Try to extract table-like lines with "<pos>  <qty> <unit> <desc>  <price>".
 * 3. Try German date near each line for confirmedDeliveryAt.
 *
 * Kept deterministic on purpose so it works without LLM credentials and
 * acts as a safety net if the layout-aware / LLM extractor is down.
 */
export interface ParsedAbItem {
  positionNo: number | null;
  sku: string | null;
  description: string;
  qty: number;
  unit?: string;
  unitPriceNet?: number;
  confirmedDeliveryAt?: string; // ISO
}

export interface ParsedAb {
  abNumber?: string;
  confirmedAt?: string;
  items: ParsedAbItem[];
}

const POS_LINE =
  /^\s*(?<pos>\d{1,4})[\s\.\)]+(?<qty>\d+(?:[.,]\d+)?)\s*(?<unit>Stk|Stck|m|m²|m2|Paar|Set)?\s*(?<desc>.+?)\s+(?<price>\d+(?:[.,]\d{2})?)\s*(?:€|EUR)?\s*$/i;
// Capture must include at least one digit so the regex doesn't latch onto
// "Auftragsbestätigung" in the subject and grab "AB-Nr" as the number.
const AB_NR =
  /(?:AB[- ]?Nr\.?|Auftragsbest[äa]tigung(?:snummer)?)\s*[:#]?\s*([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i;
const ISO_DATE = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/;

export function parseAbBasic(input: { subject: string; body: string }): ParsedAb {
  const abNumberMatch = `${input.subject}\n${input.body}`.match(AB_NR);
  const abNumber = abNumberMatch?.[1];
  const items: ParsedAbItem[] = [];

  const lines = input.body.split(/\r?\n/);
  for (const raw of lines) {
    const m = raw.match(POS_LINE);
    if (!m?.groups) continue;
    const qty = parseFloat((m.groups.qty ?? '0').replace(',', '.'));
    const price = parseFloat((m.groups.price ?? '0').replace(',', '.'));
    items.push({
      positionNo: parseInt(m.groups.pos ?? '', 10) || null,
      sku: null,
      description: (m.groups.desc ?? '').trim(),
      qty,
      unit: m.groups.unit ?? undefined,
      unitPriceNet: price,
      confirmedDeliveryAt: findNearDate(lines, raw) ?? undefined,
    });
  }
  return { abNumber, items };
}

function findNearDate(lines: string[], line: string): string | undefined {
  const i = lines.indexOf(line);
  const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
  const m = window.match(ISO_DATE);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const year = y!.length === 2 ? 2000 + parseInt(y!, 10) : parseInt(y!, 10);
  const iso = new Date(Date.UTC(year, parseInt(mo!, 10) - 1, parseInt(d!, 10))).toISOString();
  return iso;
}
