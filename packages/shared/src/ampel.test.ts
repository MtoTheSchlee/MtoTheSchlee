// Lightweight sanity tests for the Ampel logic. Run via:
//   pnpm --filter @kk/api test  (or a dedicated vitest in packages/shared)
// Kept here so the rule is documented next to the code.
import { evaluateAmpel, DEFAULT_TOLERANCES } from './ampel.js';

function assertEqual<T>(a: T, b: T, msg: string) {
  if (a !== b) {
    throw new Error(`${msg}: expected ${String(b)}, got ${String(a)}`);
  }
}

export function runAmpelSelfTest() {
  assertEqual(
    evaluateAmpel({ missingPositions: 0, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [], dateDeltaDays: [] }),
    'green',
    'all clean -> green',
  );
  assertEqual(
    evaluateAmpel({ missingPositions: 1, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [], dateDeltaDays: [] }),
    'red',
    'missing -> red',
  );
  assertEqual(
    evaluateAmpel({ missingPositions: 0, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [0.01], dateDeltaDays: [] }),
    'yellow',
    'small price delta -> yellow',
  );
  assertEqual(
    evaluateAmpel({ missingPositions: 0, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [0.1], dateDeltaDays: [] }),
    'red',
    'big price delta -> red',
  );
  assertEqual(
    evaluateAmpel(
      { missingPositions: 0, unexpectedPositions: 0, qtyDeltas: [], priceDeltas: [], dateDeltaDays: [8] },
      DEFAULT_TOLERANCES,
    ),
    'red',
    'date > 7d -> red',
  );
  return true;
}
