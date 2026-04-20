import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Live KPI snapshot for the dashboard. Cheap queries, no aggregation table. */
  async snapshot(tenantId: string) {
    const [
      openDiscrepancies,
      redDiscrepancies,
      toReviewDocs,
      toReviewEmails,
      toReviewSuggestions,
      openCards,
      projectsInExec,
    ] = await Promise.all([
      this.prisma.discrepancyCase.count({
        where: { tenantId, state: { in: ['open', 'in_progress', 'waiting_supplier'] } },
      }),
      this.prisma.discrepancyCase.count({
        where: { tenantId, severity: 'high', state: { not: 'resolved' } },
      }),
      this.prisma.document.count({ where: { tenantId, toReview: true } }),
      // Emails that came in, were classified, but aren't linked to a
      // project yet - these are the "Zu prüfen" triage queue.
      this.prisma.email.count({
        where: {
          tenantId,
          status: { in: ['new', 'triaged'] },
          projectId: null,
        },
      }),
      this.prisma.appointmentSuggestion.count({
        where: { tenantId, state: 'new' },
      }),
      this.prisma.boardCard.count({
        where: {
          board: { tenantId },
          status: { in: ['open', 'blocked', 'in_progress'] },
        },
      }),
      this.prisma.project.count({ where: { tenantId, stage: 'in_execution' } }),
    ]);
    return {
      openDiscrepancies,
      redDiscrepancies,
      toReviewDocs,
      toReviewEmails,
      toReviewSuggestions,
      /** Rollup for the dashboard tile. */
      toReviewTotal: toReviewDocs + toReviewEmails + toReviewSuggestions,
      openCards,
      projectsInExec,
    };
  }

  async supplierScorecards(tenantId: string) {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);
    const [rows, suppliers] = await Promise.all([
      this.prisma.orderConfirmation.groupBy({
        by: ['supplierId', 'ampel'],
        where: { tenantId, createdAt: { gte: since } },
        _count: true,
      }),
      // Cheap enrichment: a small dictionary lookup is worth more than a
      // UUID on the dashboard.
      this.prisma.supplier.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);
    const byId = new Map(suppliers.map((s) => [s.id, s.name]));
    const out = new Map<string, { total: number; green: number; yellow: number; red: number }>();
    for (const r of rows) {
      const m = out.get(r.supplierId) ?? { total: 0, green: 0, yellow: 0, red: 0 };
      m.total += r._count;
      if (r.ampel === 'green') m.green += r._count;
      if (r.ampel === 'yellow') m.yellow += r._count;
      if (r.ampel === 'red') m.red += r._count;
      out.set(r.supplierId, m);
    }
    return [...out.entries()]
      .map(([supplierId, v]) => ({
        supplierId,
        name: byId.get(supplierId) ?? supplierId.slice(0, 8),
        ...v,
        deviationRate: v.total ? (v.yellow + v.red) / v.total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async cycleTimeDays(tenantId: string) {
    const projects = await this.prisma.project.findMany({
      where: { tenantId, stage: 'completed', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
      take: 500,
    });
    const days = projects
      .map((p) => (+(p.completedAt as Date) - +(p.startedAt as Date)) / (1000 * 60 * 60 * 24))
      .filter((d) => d >= 0);
    if (days.length === 0) return { count: 0, avg: 0, p50: 0, p90: 0 };
    const sorted = [...days].sort((a, b) => a - b);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
    return {
      count: days.length,
      avg: days.reduce((s, x) => s + x, 0) / days.length,
      p50: pct(0.5),
      p90: pct(0.9),
    };
  }
}
