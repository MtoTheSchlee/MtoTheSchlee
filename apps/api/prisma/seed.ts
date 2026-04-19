/**
 * Idempotent seed for local pilot.
 *
 * - Creates a default tenant + owner user.
 * - Seeds roles per enum.
 * - Creates the Operations board with standard lists.
 * - Creates one example supplier + customer + project so the UI has data.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.env.TENANT_DEFAULT_ID ?? '00000000-0000-0000-0000-000000000001';
  const tenantName = process.env.TENANT_DEFAULT_NAME ?? 'Küchen Klaus';

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: tenantName },
    create: { id: tenantId, name: tenantName },
  });

  const ownerEmail = 'owner@kuechen-klaus.de';
  const passwordHash = await argon2.hash('kkos-dev-pass');
  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: ownerEmail } },
    update: {},
    create: {
      tenantId,
      email: ownerEmail,
      name: 'Inhaber',
      passwordHash,
      mfaEnabled: false,
      roles: { create: [{ role: Role.owner }, { role: Role.planner }, { role: Role.purchaser }] },
    },
  });

  // Default boards + lists
  const boards = [
    { key: 'operations', name: 'Operations', lists: ['Inbox', 'Triage', 'In Arbeit', 'Warten auf Lieferant', 'Fertig'] },
    { key: 'abs', name: 'Auftragsbestätigungen', lists: ['Neu', 'Grün', 'Gelb prüfen', 'Rot kritisch', 'Akzeptiert'] },
    { key: 'mail', name: 'Mail-Triage', lists: ['Ungesichtet', 'Zu prüfen', 'Zugewiesen', 'Beantwortet'] },
    { key: 'complaints', name: 'Reklamationen', lists: ['Offen', 'In Klärung', 'Beim Lieferanten', 'Gelöst'] },
    { key: 'social', name: 'Social-Studio', lists: ['Idee', 'Draft', 'Review', 'Approved', 'Scheduled'] },
  ];
  for (const b of boards) {
    const board = await prisma.board.upsert({
      where: { tenantId_key: { tenantId, key: b.key } },
      update: { name: b.name },
      create: { tenantId, key: b.key, name: b.name },
    });
    await Promise.all(
      b.lists.map((name, i) =>
        prisma.boardList.upsert({
          where: { boardId_orderIndex: { boardId: board.id, orderIndex: i } },
          update: { name },
          create: { boardId: board.id, name, orderIndex: i },
        }),
      ),
    );
  }

  // Sample supplier + customer + project
  const nobilia = await prisma.supplier.upsert({
    where: { tenantId_name: { tenantId, name: 'Nobilia' } },
    update: {},
    create: { tenantId, name: 'Nobilia', type: 'cabinets' },
  });
  const muster = await prisma.customer.findFirst({
    where: { tenantId, lastName: 'Mustermann' },
  });
  const customer = muster
    ? muster
    : await prisma.customer.create({
        data: { tenantId, firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com' },
      });
  const existingProj = await prisma.project.findFirst({ where: { tenantId, customerId: customer.id } });
  const project = existingProj
    ? existingProj
    : await prisma.project.create({
        data: {
          tenantId,
          customerId: customer.id,
          code: `KK-${new Date().getFullYear()}-0001`,
          title: 'Musterküche Mustermann',
          stage: 'in_execution',
          startedAt: new Date(),
        },
      });

  // Sample order (no AB yet) so the matrix view has data.
  const order = await prisma.order.upsert({
    where: { tenantId_orderNumber: { tenantId, orderNumber: 'KK-ORD-0001' } },
    update: {},
    create: {
      tenantId,
      projectId: project.id,
      supplierId: nobilia.id,
      orderNumber: 'KK-ORD-0001',
      status: 'sent',
      orderedAt: new Date(),
      items: {
        create: [
          { positionNo: 10, description: 'Unterschrank 60cm', qty: 2, unit: 'Stk', unitPriceNet: 320 },
          { positionNo: 20, description: 'Hochschrank 60/213', qty: 1, unit: 'Stk', unitPriceNet: 540 },
          { positionNo: 30, description: 'Arbeitsplatte 4000x600', qty: 1, unit: 'Stk', unitPriceNet: 289 },
        ],
      },
    },
  });

  console.log('Seed done', { tenantId, owner: owner.email, orderId: order.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
