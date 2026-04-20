import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  upsert(tenantId: string, data: { name: string; type?: any; config?: any }) {
    return this.prisma.supplier.upsert({
      where: { tenantId_name: { tenantId, name: data.name } },
      create: { tenantId, ...data },
      update: { ...data },
    });
  }

  /** Scorecard: on-time % and deviation rate over the last 180 days. */
  async scorecard(tenantId: string, supplierId: string) {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);
    const confirmations = await this.prisma.orderConfirmation.findMany({
      where: { tenantId, supplierId, createdAt: { gte: since } },
      include: { discrepancies: true },
    });
    const total = confirmations.length;
    const deviating = confirmations.filter((c) => (c.ampel ?? 'green') !== 'green').length;
    const red = confirmations.filter((c) => c.ampel === 'red').length;
    return {
      supplierId,
      window: '180d',
      total,
      deviationRate: total ? deviating / total : 0,
      redRate: total ? red / total : 0,
    };
  }
}
