import type { DiscrepancyType } from './enums.js';

export type Ampel = 'green' | 'yellow' | 'red';

export interface AmpelInput {
  missingPositions: number;
  unexpectedPositions: number;
  qtyDeltas: number[];           // absolute % differences per item
  priceDeltas: number[];         // absolute % differences per item
  dateDeltaDays: number[];       // absolute day diffs per item
  tolerances?: AmpelTolerances;
}

export interface AmpelTolerances {
  priceRelYellow: number;        // e.g. 0.01 (1%) = yellow threshold
  priceRelRed: number;           // e.g. 0.05 (5%) = red threshold
  qtyRelYellow: number;          // 0.00 = any deviation is yellow
  qtyRelRed: number;             // >0  = only large qty gaps are red
  dateDaysYellow: number;        // e.g. 2  days
  dateDaysRed: number;           // e.g. 7  days
}

export const DEFAULT_TOLERANCES: AmpelTolerances = {
  priceRelYellow: 0.005,
  priceRelRed: 0.03,
  qtyRelYellow: 0.0,
  qtyRelRed: 0.01,
  dateDaysYellow: 2,
  dateDaysRed: 7,
};

/**
 * Deterministic, testable traffic-light for an AB match.
 * Red beats yellow, yellow beats green. Called from AB Agent and API.
 */
export function evaluateAmpel(
  input: AmpelInput,
  tol: AmpelTolerances = DEFAULT_TOLERANCES,
): Ampel {
  if (input.missingPositions > 0) return 'red';
  if (input.unexpectedPositions > 0) return 'red';

  let level: Ampel = 'green';
  const bump = (next: Ampel) => {
    if (level === 'red') return;
    if (next === 'red') level = 'red';
    else if (next === 'yellow' && level === 'green') level = 'yellow';
  };

  for (const d of input.priceDeltas) {
    if (d >= tol.priceRelRed) bump('red');
    else if (d >= tol.priceRelYellow) bump('yellow');
  }
  for (const d of input.qtyDeltas) {
    if (d > tol.qtyRelRed) bump('red');
    else if (d > tol.qtyRelYellow) bump('yellow');
  }
  for (const d of input.dateDeltaDays) {
    if (d >= tol.dateDaysRed) bump('red');
    else if (d >= tol.dateDaysYellow) bump('yellow');
  }
  return level;
}

export function classifyDeviation(params: {
  priceRel?: number;
  qtyRel?: number;
  dateDays?: number;
  missing?: boolean;
  unexpected?: boolean;
}): DiscrepancyType {
  if (params.missing) return 'missing_position';
  if (params.unexpected) return 'unexpected_position';
  const candidates: Array<{ t: DiscrepancyType; score: number }> = [];
  if (params.qtyRel && params.qtyRel > 0) {
    candidates.push({ t: 'wrong_qty', score: params.qtyRel });
  }
  if (params.priceRel && params.priceRel > 0) {
    candidates.push({ t: 'price_delta', score: params.priceRel });
  }
  if (params.dateDays && params.dateDays > 0) {
    candidates.push({ t: 'date_delta', score: params.dateDays / 30 });
  }
  if (candidates.length === 0) return 'ambiguous';
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]!.t;
}
