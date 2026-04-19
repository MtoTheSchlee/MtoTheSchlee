import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AbMatcher, type ExtractedAbItem } from './ab.matcher.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { AuditService } from '../common/audit.service.js';

@Injectable()
export class AbService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: AbMatcher,
    private readonly rt: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, filter?: { ampel?: 'green' | 'yellow' | 'red'; status?: string }) {
    return this.prisma.orderConfirmation.findMany({
      where: {
        tenantId,
        ...(filter?.ampel ? { ampel: filter.ampel } : {}),
        ...(filter?.status ? { status: filter.status as any } : {}),
      },
      include: {
        supplier: true,
        order: true,
        project: true,
        items: true,
        discrepancies: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Ingests an already-parsed AB (from MailAgent/ABExtractAgent) and runs
   * matching + discrepancy creation. The extractor is not in this service
   * because it is I/O heavy and lives in the worker.
   */
  async ingestParsed(
    tenantId: string,
    input: {
      projectId: string;
      supplierId: string;
      orderId: string | null;
      emailId?: string;
      documentId?: string;
      abNumber?: string;
      items: ExtractedAbItem[];
      confirmedAt?: Date;
    },
  ) {
    const order = input.orderId
      ? await this.prisma.order.findFirst({
          where: { id: input.orderId, tenantId },
          include: { items: true },
        })
      : null;

    const matchResult = order
      ? this.matcher.match(
          order.items.map((i) => ({
            id: i.id,
            positionNo: i.positionNo,
            sku: i.sku,
            description: i.description,
            qty: Number(i.qty),
            unitPriceNet: i.unitPriceNet != null ? Number(i.unitPriceNet) : null,
            requestedDeliveryAt: i.requestedDeliveryAt,
          })),
          input.items,
        )
      : null;

    const confirmation = await this.prisma.orderConfirmation.create({
      data: {
        tenantId,
        projectId: input.projectId,
        supplierId: input.supplierId,
        orderId: input.orderId ?? undefined,
        emailId: input.emailId ?? undefined,
        documentId: input.documentId ?? undefined,
        abNumber: input.abNumber,
        confirmedAt: input.confirmedAt ?? new Date(),
        status: matchResult ? (matchResult.diffs.length ? 'deviating' : 'matched') : 'parsed',
        ampel: matchResult?.ampel ?? 'yellow',
        parsedPayload: { items: input.items as any },
        items: {
          create: input.items.map((i, idx) => ({
            positionNo: i.positionNo ?? idx + 1,
            sku: i.sku,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPriceNet: i.unitPriceNet,
            confirmedDeliveryAt: i.confirmedDeliveryAt ?? null,
          })),
        },
      },
      include: { items: true },
    });

    if (matchResult && input.orderId) {
      await Promise.all(
        matchResult.diffs.map((d) =>
          this.prisma.discrepancyCase.create({
            data: {
              tenantId,
              projectId: input.projectId,
              orderId: input.orderId!,
              orderConfirmationId: confirmation.id,
              type: d.kind,
              severity: d.severity,
              state: 'open',
              diff: d as any,
            },
          }),
        ),
      );
    }

    this.rt.publish({
      type: 'ab.matched',
      tenantId,
      orderConfirmationId: confirmation.id,
      orderId: input.orderId,
      status: confirmation.status as any,
      ampel: (confirmation.ampel ?? 'yellow') as any,
      discrepancyCount: matchResult?.diffs.length ?? 0,
    });

    await this.audit.record({
      tenantId,
      action: 'ab.ingest',
      entity: 'OrderConfirmation',
      entityId: confirmation.id,
      after: { ampel: confirmation.ampel, status: confirmation.status, diffs: matchResult?.diffs.length ?? 0 },
    });

    return { confirmation, match: matchResult };
  }

  async accept(tenantId: string, id: string, actorUserId?: string) {
    const before = await this.prisma.orderConfirmation.findFirst({ where: { id, tenantId } });
    const after = await this.prisma.orderConfirmation.update({
      where: { id },
      data: { status: 'accepted' },
    });
    await this.audit.record({
      tenantId,
      action: 'ab.accept',
      entity: 'OrderConfirmation',
      entityId: id,
      actorUserId: actorUserId ?? null,
      before,
      after,
    });
    return after;
  }
}
