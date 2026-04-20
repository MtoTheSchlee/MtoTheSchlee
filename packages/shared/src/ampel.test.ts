import { describe, expect, it } from 'vitest';
import { evaluateAmpel, classifyDeviation, DEFAULT_TOLERANCES } from './ampel.js';

describe('evaluateAmpel', () => {
  it('returns green for perfectly clean match', () => {
    expect(
      evaluateAmpel({
        missingPositions: 0,
        unexpectedPositions: 0,
        qtyDeltas: [],
        priceDeltas: [],
        dateDeltaDays: [],
      }),
    ).toBe('green');
  });

  it('returns red for any missing position', () => {
    expect(
      evaluateAmpel({
        missingPositions: 1,
        unexpectedPositions: 0,
        qtyDeltas: [],
        priceDeltas: [],
        dateDeltaDays: [],
      }),
    ).toBe('red');
  });

  it('returns red for unexpected positions (not ordered)', () => {
    expect(
      evaluateAmpel({
        missingPositions: 0,
        unexpectedPositions: 2,
        qtyDeltas: [],
        priceDeltas: [],
        dateDeltaDays: [],
      }),
    ).toBe('red');
  });

  it('returns yellow for small price delta', () => {
    expect(
      evaluateAmpel({
        missingPositions: 0,
        unexpectedPositions: 0,
        qtyDeltas: [],
        priceDeltas: [0.01],
        dateDeltaDays: [],
      }),
    ).toBe('yellow');
  });

  it('escalates to red when price delta crosses threshold', () => {
    expect(
      evaluateAmpel({
        missingPositions: 0,
        unexpectedPositions: 0,
        qtyDeltas: [],
        priceDeltas: [0.1],
        dateDeltaDays: [],
      }),
    ).toBe('red');
  });

  it('treats late delivery > 7d as red', () => {
    expect(
      evaluateAmpel({
        missingPositions: 0,
        unexpectedPositions: 0,
        qtyDeltas: [],
        priceDeltas: [],
        dateDeltaDays: [8],
      }),
    ).toBe('red');
  });

  it('never downgrades from red once reached', () => {
    expect(
      evaluateAmpel({
        missingPositions: 1,
        unexpectedPositions: 0,
        qtyDeltas: [0.001],
        priceDeltas: [0.001],
        dateDeltaDays: [0],
      }),
    ).toBe('red');
  });

  it('honors per-supplier tolerances overrides', () => {
    const loose = { ...DEFAULT_TOLERANCES, priceRelRed: 0.5, priceRelYellow: 0.2 };
    expect(
      evaluateAmpel(
        { missingPositions: 0, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [0.1], dateDeltaDays: [] },
        loose,
      ),
    ).toBe('green');
  });
});

describe('classifyDeviation', () => {
  it('picks missing first', () => {
    expect(classifyDeviation({ missing: true, qtyRel: 1, priceRel: 1 })).toBe('missing_position');
  });
  it('picks unexpected first when no missing flag', () => {
    expect(classifyDeviation({ unexpected: true })).toBe('unexpected_position');
  });
  it('falls back to the largest relative delta', () => {
    expect(classifyDeviation({ priceRel: 0.2, qtyRel: 0.01 })).toBe('price_delta');
    expect(classifyDeviation({ priceRel: 0.01, qtyRel: 0.2 })).toBe('wrong_qty');
    expect(classifyDeviation({ dateDays: 120, qtyRel: 0.1 })).toBe('date_delta');
  });
  it('returns ambiguous when nothing is deviating', () => {
    expect(classifyDeviation({})).toBe('ambiguous');
  });
});
