import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type SearchHitKind =
  | 'customer'
  | 'project'
  | 'supplier'
  | 'order'
  | 'order_confirmation'
  | 'email'
  | 'board_card'
  | 'document';

export interface SearchHit {
  kind: SearchHitKind;
  id: string;
  label: string;
  preview?: string;
  href: string;
  score: number;
  meta?: Record<string, unknown>;
}

const SCORES: Record<SearchHitKind, number> = {
  customer: 1.0,
  project: 1.0,
  supplier: 0.9,
  order_confirmation: 0.95,
  order: 0.85,
  email: 0.75,
  board_card: 0.7,
  document: 0.6,
};

/** Case-insensitive LIKE-safe fragment; keep it cheap, pg_trgm does the work. */
function ilikeTerm(q: string): string {
  return `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Multi-entity search used by the command palette. Intentionally caps
   * each entity to keep the payload small - good-enough for an
   * interactive picker, real power-users hit the dedicated list pages.
   */
  async global(tenantId: string, query: string, limit = 20): Promise<SearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = ilikeTerm(q);

    const [customers, projects, suppliers, orders, abs, emails, cards] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            { lastName: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 8,
      }),
      this.prisma.project.findMany({
        where: {
          tenantId,
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { customer: { select: { firstName: true, lastName: true } } },
        take: 8,
      }),
      this.prisma.supplier.findMany({
        where: { tenantId, name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
      this.prisma.order.findMany({
        where: {
          tenantId,
          orderNumber: { contains: q, mode: 'insensitive' },
        },
        include: { supplier: { select: { name: true } } },
        take: 5,
      }),
      this.prisma.orderConfirmation.findMany({
        where: {
          tenantId,
          OR: [
            { abNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { supplier: { select: { name: true } }, project: { select: { code: true } } },
        take: 5,
      }),
      this.prisma.email.findMany({
        where: {
          tenantId,
          OR: [
            { subject: { contains: q, mode: 'insensitive' } },
            { fromAddr: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { receivedAt: 'desc' },
        take: 6,
      }),
      this.prisma.boardCard.findMany({
        where: {
          board: { tenantId },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { board: { select: { key: true } } },
        take: 5,
      }),
    ]);
    void like; // reserved for a future raw pg_trgm similarity boost

    const hits: SearchHit[] = [
      ...customers.map<SearchHit>((c) => ({
        kind: 'customer',
        id: c.id,
        label: [c.firstName, c.lastName, c.company].filter(Boolean).join(' ') || c.email || c.id.slice(0, 8),
        preview: c.email ?? undefined,
        href: `/customers/${c.id}`,
        score: SCORES.customer,
      })),
      ...projects.map<SearchHit>((p) => ({
        kind: 'project',
        id: p.id,
        label: `${p.code} – ${p.title}`,
        preview: p.customer ? `${p.customer.firstName ?? ''} ${p.customer.lastName ?? ''}`.trim() : undefined,
        href: `/customers/${p.customerId}`,
        score: SCORES.project,
        meta: { stage: p.stage },
      })),
      ...suppliers.map<SearchHit>((s) => ({
        kind: 'supplier',
        id: s.id,
        label: s.name,
        preview: s.type ?? undefined,
        href: `/suppliers`,
        score: SCORES.supplier,
      })),
      ...orders.map<SearchHit>((o) => ({
        kind: 'order',
        id: o.id,
        label: `Bestellung ${o.orderNumber}`,
        preview: o.supplier?.name,
        href: `/ab`,
        score: SCORES.order,
        meta: { status: o.status },
      })),
      ...abs.map<SearchHit>((a) => ({
        kind: 'order_confirmation',
        id: a.id,
        label: `AB ${a.abNumber ?? a.id.slice(0, 8)}`,
        preview: [a.supplier?.name, a.project?.code].filter(Boolean).join(' · '),
        href: `/ab`,
        score: SCORES.order_confirmation,
        meta: { ampel: a.ampel, status: a.status },
      })),
      ...emails.map<SearchHit>((m) => ({
        kind: 'email',
        id: m.id,
        label: m.subject || '(kein Betreff)',
        preview: m.fromAddr,
        href: `/inbox`,
        score: SCORES.email,
        meta: { classification: m.classification },
      })),
      ...cards.map<SearchHit>((c) => ({
        kind: 'board_card',
        id: c.id,
        label: c.title,
        preview: c.summary ?? undefined,
        href: `/board/${c.board?.key ?? 'operations'}`,
        score: SCORES.board_card,
        meta: { objectKind: c.objectKind, priority: c.priority },
      })),
    ];

    // Boost entries whose label starts with the query; this is cheap and
    // makes exact-prefix matches jump to the top.
    const qLow = q.toLowerCase();
    const ranked = hits
      .map((h) => ({
        ...h,
        score: h.score + (h.label.toLowerCase().startsWith(qLow) ? 0.3 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked;
  }
}
