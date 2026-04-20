import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, projectId?: string) {
    return this.prisma.order.findMany({
      where: { tenantId, ...(projectId ? { projectId } : {}) },
      include: { supplier: true, items: true, confirmations: true, discrepancies: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  one(tenantId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: true,
        confirmations: { include: { items: true } },
        discrepancies: true,
      },
    });
  }

  create(
    tenantId: string,
    data: {
      projectId: string;
      supplierId: string;
      orderNumber: string;
      items: Array<{ positionNo: number; description: string; qty: number; sku?: string; unit?: string; unitPriceNet?: number; requestedDeliveryAt?: string }>;
    },
  ) {
    return this.prisma.order.create({
      data: {
        tenantId,
        projectId: data.projectId,
        supplierId: data.supplierId,
        orderNumber: data.orderNumber,
        status: 'sent',
        orderedAt: new Date(),
        items: {
          create: data.items.map((i) => ({
            positionNo: i.positionNo,
            description: i.description,
            qty: i.qty,
            sku: i.sku,
            unit: i.unit,
            unitPriceNet: i.unitPriceNet,
            requestedDeliveryAt: i.requestedDeliveryAt ? new Date(i.requestedDeliveryAt) : null,
          })),
        },
      },
      include: { items: true, supplier: true },
    });
  }

  /**
   * Einkaufsmatrix: pro Projekt, pro Lieferant, pro Position Status
   * (bestellt/bestätigt/offen/geliefert). Daten kommen aus orders +
   * order_confirmations + discrepancy_cases.
   */
  async matrix(tenantId: string, projectId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, projectId },
      include: {
        supplier: true,
        items: true,
        confirmations: { include: { items: true, discrepancies: true } },
      },
    });
    return orders.map((o) => {
      const confirmedItems = new Map<number, any>();
      for (const c of o.confirmations) {
        for (const i of c.items) confirmedItems.set(i.positionNo, i);
      }
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        supplier: o.supplier,
        status: o.status,
        positions: o.items.map((i) => {
          const confirmed = confirmedItems.get(i.positionNo);
          return {
            positionNo: i.positionNo,
            description: i.description,
            ordered: { qty: Number(i.qty), priceNet: i.unitPriceNet ? Number(i.unitPriceNet) : null },
            confirmed: confirmed
              ? { qty: Number(confirmed.qty), priceNet: confirmed.unitPriceNet ? Number(confirmed.unitPriceNet) : null }
              : null,
            status: confirmed ? 'confirmed' : 'open',
          };
        }),
      };
    });
  }
}
