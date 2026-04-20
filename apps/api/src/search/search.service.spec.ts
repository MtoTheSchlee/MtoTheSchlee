import { describe, expect, it } from 'vitest';
import { SearchService } from './search.service.js';

/**
 * Hermetic test: we feed a fake PrismaService that returns deterministic
 * rows so we can pin down the ranking + projection logic without a DB.
 */
function makePrisma(rows: {
  customers?: any[];
  projects?: any[];
  suppliers?: any[];
  orders?: any[];
  abs?: any[];
  emails?: any[];
  cards?: any[];
}): any {
  return {
    customer: { findMany: async () => rows.customers ?? [] },
    project: { findMany: async () => rows.projects ?? [] },
    supplier: { findMany: async () => rows.suppliers ?? [] },
    order: { findMany: async () => rows.orders ?? [] },
    orderConfirmation: { findMany: async () => rows.abs ?? [] },
    email: { findMany: async () => rows.emails ?? [] },
    boardCard: { findMany: async () => rows.cards ?? [] },
  };
}

describe('SearchService.global', () => {
  it('returns [] for terms shorter than 2 chars', async () => {
    const svc = new SearchService(makePrisma({}));
    expect(await svc.global('t', 'a', 10)).toEqual([]);
  });

  it('projects rows into the SearchHit shape', async () => {
    const svc = new SearchService(
      makePrisma({
        customers: [
          { id: 'c1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com' },
        ],
      }),
    );
    const hits = await svc.global('t', 'Must');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      kind: 'customer',
      label: 'Max Mustermann',
      preview: 'max@example.com',
      href: '/customers/c1',
    });
  });

  it('boosts exact-prefix label matches above generic hits', async () => {
    const svc = new SearchService(
      makePrisma({
        customers: [
          { id: 'c1', firstName: 'Nobilia-Fan', lastName: 'GmbH' }, // prefix match
        ],
        suppliers: [
          { id: 's1', name: 'Nobilia', type: 'cabinets' }, // prefix match
        ],
        orders: [
          { id: 'o1', orderNumber: 'KK-ORD-0099', supplier: { name: 'Other' } }, // contains match
        ],
      }),
    );
    const hits = await svc.global('t', 'Nobilia');
    const labels = hits.map((h) => h.label);
    // Both prefix-matching hits should precede the contains-only hit.
    expect(labels[0]).toMatch(/Nobilia/);
    expect(labels[1]).toMatch(/Nobilia/);
    expect(labels[labels.length - 1]).toBe('Bestellung KK-ORD-0099');
  });

  it('respects the limit argument', async () => {
    const svc = new SearchService(
      makePrisma({
        customers: Array.from({ length: 8 }, (_, i) => ({
          id: `c${i}`,
          firstName: 'Max',
          lastName: `Test${i}`,
        })),
      }),
    );
    const hits = await svc.global('t', 'Test', 3);
    expect(hits).toHaveLength(3);
  });
});
