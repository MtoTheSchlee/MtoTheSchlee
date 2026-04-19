import { Injectable } from '@nestjs/common';
import {
  Ampel,
  classifyDeviation,
  DEFAULT_TOLERANCES,
  evaluateAmpel,
  type AmpelTolerances,
} from '@kk/shared';

export interface ExtractedAbItem {
  positionNo: number | null;
  sku?: string | null;
  description: string;
  qty: number;
  unit?: string | null;
  unitPriceNet?: number | null;
  confirmedDeliveryAt?: Date | null;
}

export interface OrderItemRef {
  id: string;
  positionNo: number;
  sku?: string | null;
  description: string;
  qty: number;
  unitPriceNet?: number | null;
  requestedDeliveryAt?: Date | null;
}

export interface Diff {
  positionNo: number | null;
  sku?: string | null;
  kind: 'missing_position' | 'wrong_qty' | 'price_delta' | 'date_delta' | 'unexpected_position' | 'ambiguous';
  severity: 'low' | 'medium' | 'high';
  before?: Partial<OrderItemRef>;
  after?: Partial<ExtractedAbItem>;
  delta?: Record<string, number>;
}

export interface MatchResult {
  ampel: Ampel;
  diffs: Diff[];
  summary: {
    totalOrdered: number;
    totalConfirmed: number;
    missing: number;
    unexpected: number;
    qtyDeltas: number;
    priceDeltas: number;
    dateDeltas: number;
  };
}

function relDelta(a: number, b: number) {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return 1;
  return Math.abs(a - b) / Math.abs(a);
}

function dayDelta(a?: Date | null, b?: Date | null) {
  if (!a || !b) return 0;
  return Math.abs(+a - +b) / (1000 * 60 * 60 * 24);
}

/** Deterministic matcher that maps AB items back to order items. */
@Injectable()
export class AbMatcher {
  match(
    orderItems: OrderItemRef[],
    abItems: ExtractedAbItem[],
    tolerances: AmpelTolerances = DEFAULT_TOLERANCES,
  ): MatchResult {
    const byPos = new Map<number, OrderItemRef>();
    const bySku = new Map<string, OrderItemRef>();
    for (const i of orderItems) {
      byPos.set(i.positionNo, i);
      if (i.sku) bySku.set(i.sku.toUpperCase(), i);
    }

    const diffs: Diff[] = [];
    const matchedOrderItemIds = new Set<string>();
    const qtyDeltas: number[] = [];
    const priceDeltas: number[] = [];
    const dateDeltas: number[] = [];

    for (const ab of abItems) {
      const target =
        (ab.positionNo && byPos.get(ab.positionNo)) ||
        (ab.sku && bySku.get(ab.sku.toUpperCase())) ||
        null;

      if (!target) {
        diffs.push({
          positionNo: ab.positionNo ?? null,
          sku: ab.sku ?? null,
          kind: 'unexpected_position',
          severity: 'high',
          after: ab,
        });
        continue;
      }
      matchedOrderItemIds.add(target.id);

      const qtyRel = relDelta(target.qty, ab.qty);
      const priceRel =
        target.unitPriceNet != null && ab.unitPriceNet != null
          ? relDelta(Number(target.unitPriceNet), Number(ab.unitPriceNet))
          : 0;
      const dDays = dayDelta(target.requestedDeliveryAt ?? null, ab.confirmedDeliveryAt ?? null);

      if (qtyRel > tolerances.qtyRelYellow) qtyDeltas.push(qtyRel);
      if (priceRel > tolerances.priceRelYellow) priceDeltas.push(priceRel);
      if (dDays >= tolerances.dateDaysYellow) dateDeltas.push(dDays);

      if (
        qtyRel > tolerances.qtyRelYellow ||
        priceRel > tolerances.priceRelYellow ||
        dDays >= tolerances.dateDaysYellow
      ) {
        const kind = classifyDeviation({
          qtyRel,
          priceRel,
          dateDays: dDays,
        });
        const severity =
          qtyRel > tolerances.qtyRelRed ||
          priceRel > tolerances.priceRelRed ||
          dDays >= tolerances.dateDaysRed
            ? 'high'
            : qtyRel > 0 || priceRel > 0 || dDays > 0
            ? 'medium'
            : 'low';
        diffs.push({
          positionNo: target.positionNo,
          sku: target.sku ?? null,
          kind: kind,
          severity,
          before: target,
          after: ab,
          delta: { qtyRel, priceRel, dateDays: dDays },
        });
      }
    }

    for (const oi of orderItems) {
      if (!matchedOrderItemIds.has(oi.id)) {
        diffs.push({
          positionNo: oi.positionNo,
          sku: oi.sku ?? null,
          kind: 'missing_position',
          severity: 'high',
          before: oi,
        });
      }
    }

    const missing = diffs.filter((d) => d.kind === 'missing_position').length;
    const unexpected = diffs.filter((d) => d.kind === 'unexpected_position').length;

    const ampel = evaluateAmpel(
      {
        missingPositions: missing,
        unexpectedPositions: unexpected,
        qtyDeltas,
        priceDeltas,
        dateDeltaDays: dateDeltas,
      },
      tolerances,
    );

    return {
      ampel,
      diffs,
      summary: {
        totalOrdered: orderItems.length,
        totalConfirmed: abItems.length,
        missing,
        unexpected,
        qtyDeltas: qtyDeltas.length,
        priceDeltas: priceDeltas.length,
        dateDeltas: dateDeltas.length,
      },
    };
  }
}
