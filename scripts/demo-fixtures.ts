/**
 * Seed a richer demo dataset on top of prisma/seed.ts:
 * - Two projects, two suppliers
 * - One mailbox, a handful of emails (mixed classifications)
 * - Two orders with AB-ingest runs (one green, one red)
 * - Appointment suggestions, Social-drafts, Agent runs
 * - Board cards for each process object so the UI feels populated.
 *
 * Run: pnpm --filter @kk/api exec tsx ../../scripts/demo-fixtures.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT = process.env.TENANT_DEFAULT_ID ?? '00000000-0000-0000-0000-000000000001';

async function upsertCustomer(first: string, last: string, email: string) {
  const existing = await prisma.customer.findFirst({ where: { tenantId: TENANT, email } });
  return existing ?? prisma.customer.create({ data: { tenantId: TENANT, firstName: first, lastName: last, email } });
}
async function upsertSupplier(name: string, type: Prisma.SupplierCreateInput['type']) {
  return prisma.supplier.upsert({
    where: { tenantId_name: { tenantId: TENANT, name } },
    update: {},
    create: { tenantId: TENANT, name, type },
  });
}
async function upsertProject(customerId: string, code: string, title: string) {
  return prisma.project.upsert({
    where: { tenantId_code: { tenantId: TENANT, code } },
    update: { title },
    create: { tenantId: TENANT, customerId, code, title, stage: 'in_execution', startedAt: new Date() },
  });
}
async function upsertOrder(opts: { projectId: string; supplierId: string; number: string }) {
  return prisma.order.upsert({
    where: { tenantId_orderNumber: { tenantId: TENANT, orderNumber: opts.number } },
    update: {},
    create: {
      tenantId: TENANT,
      projectId: opts.projectId,
      supplierId: opts.supplierId,
      orderNumber: opts.number,
      status: 'sent',
      orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
      items: {
        create: [
          { positionNo: 10, description: 'Unterschrank 60cm', qty: 2, unit: 'Stk', unitPriceNet: new Prisma.Decimal(320) },
          { positionNo: 20, description: 'Hochschrank 60/213', qty: 1, unit: 'Stk', unitPriceNet: new Prisma.Decimal(540) },
          { positionNo: 30, description: 'Arbeitsplatte 4000x600', qty: 1, unit: 'Stk', unitPriceNet: new Prisma.Decimal(289) },
        ],
      },
    },
  });
}

async function main() {
  const customerA = await upsertCustomer('Max', 'Mustermann', 'max@example.com');
  const customerB = await upsertCustomer('Sabine', 'Schneider', 'schneider@example.com');
  const nobilia = await upsertSupplier('Nobilia', 'cabinets');
  const siemens = await upsertSupplier('Siemens', 'appliances');

  const projA = await upsertProject(customerA.id, 'KK-2026-0001', 'Musterküche Mustermann');
  const projB = await upsertProject(customerB.id, 'KK-2026-0002', 'Familienküche Schneider');

  await upsertOrder({ projectId: projA.id, supplierId: nobilia.id, number: 'KK-ORD-0001' });
  const orderB = await upsertOrder({ projectId: projB.id, supplierId: siemens.id, number: 'KK-ORD-0002' });

  // Mailbox + emails
  const mailbox = await prisma.mailbox.upsert({
    where: { tenantId_address: { tenantId: TENANT, address: 'info@kuechen-klaus.de' } },
    update: {},
    create: {
      tenantId: TENANT,
      displayName: 'Info-Postfach',
      address: 'info@kuechen-klaus.de',
      protocol: 'imap',
      host: 'mailhog',
      port: 1025,
      username: 'dev',
      passwordEnc: 'dev',
      state: 'active',
    },
  });

  const emails = [
    {
      subject: 'Auftragsbestätigung AB-Nr. NOB-2026-A2 für KK-2026-0001',
      fromAddr: 'orders@nobilia.de',
      body: 'Sehr geehrte Damen und Herren,\n\nwir bestätigen Ihren Auftrag KK-ORD-0001.\nPos 10: 2 Stk Unterschrank 60cm\nPos 20: 1 Stk Hochschrank 615,00 €\nLiefertermin: 30.05.2026',
      classification: 'ab' as const,
    },
    {
      subject: 'Reklamation – beschädigte Arbeitsplatte',
      fromAddr: 'max@example.com',
      body: 'Hallo, die Arbeitsplatte in Auftrag KK-2026-0001 hat einen Kratzer. Bitte kümmern Sie sich.',
      classification: 'complaint' as const,
    },
    {
      subject: 'Liefertermin Küche Schneider',
      fromAddr: 'versand@siemens.de',
      body: 'Die Anlieferung für KK-2026-0002 erfolgt am 22.04.2026 zwischen 09:00 und 12:00 Uhr.',
      classification: 'delivery_date' as const,
    },
    {
      subject: 'Unverbindliches Angebot – Küche Neubau',
      fromAddr: 'schneider@example.com',
      body: 'Guten Tag, ich hätte gern ein unverbindliches Angebot für unseren Neubau. Beste Grüße, S. Schneider.',
      classification: 'customer_request' as const,
    },
  ];

  for (const [i, e] of emails.entries()) {
    await prisma.email.upsert({
      where: {
        tenantId_mailboxId_messageId: {
          tenantId: TENANT,
          mailboxId: mailbox.id,
          messageId: `<demo-${i + 1}@kk-os>`,
        },
      },
      update: {},
      create: {
        tenantId: TENANT,
        mailboxId: mailbox.id,
        messageId: `<demo-${i + 1}@kk-os>`,
        direction: 'in',
        fromAddr: e.fromAddr,
        toAddrs: ['info@kuechen-klaus.de'],
        ccAddrs: [],
        bccAddrs: [],
        subject: e.subject,
        receivedAt: new Date(Date.now() - (4 - i) * 1000 * 60 * 60 * 6),
        classification: e.classification,
        classificationConfidence: new Prisma.Decimal(0.85),
        bodyText: e.body,
        status: 'triaged',
      },
    });
  }

  // AB ingest run: one green, one red. Re-use the matcher path by writing
  // order_confirmations + items directly (same state the AB service would
  // persist). Discrepancies explicit for the red case.
  const green = await prisma.orderConfirmation.create({
    data: {
      tenantId: TENANT,
      projectId: projA.id,
      supplierId: nobilia.id,
      orderId: (await prisma.order.findFirstOrThrow({ where: { tenantId: TENANT, orderNumber: 'KK-ORD-0001' } })).id,
      abNumber: 'NOB-2026-GRN',
      confirmedAt: new Date(),
      status: 'matched',
      ampel: 'green',
      items: {
        create: [
          { positionNo: 10, description: 'Unterschrank 60cm', qty: 2, unit: 'Stk', unitPriceNet: new Prisma.Decimal(320) },
          { positionNo: 20, description: 'Hochschrank 60/213', qty: 1, unit: 'Stk', unitPriceNet: new Prisma.Decimal(540) },
          { positionNo: 30, description: 'Arbeitsplatte 4000x600', qty: 1, unit: 'Stk', unitPriceNet: new Prisma.Decimal(289) },
        ],
      },
    },
  });

  const red = await prisma.orderConfirmation.create({
    data: {
      tenantId: TENANT,
      projectId: projB.id,
      supplierId: siemens.id,
      orderId: orderB.id,
      abNumber: 'SIE-2026-RED',
      confirmedAt: new Date(),
      status: 'deviating',
      ampel: 'red',
      items: {
        create: [
          { positionNo: 10, description: 'Unterschrank 60cm', qty: 2, unit: 'Stk', unitPriceNet: new Prisma.Decimal(320) },
          { positionNo: 20, description: 'Hochschrank 60/213', qty: 1, unit: 'Stk', unitPriceNet: new Prisma.Decimal(615) },
        ],
      },
    },
  });
  await prisma.discrepancyCase.createMany({
    data: [
      {
        tenantId: TENANT,
        projectId: projB.id,
        orderId: orderB.id,
        orderConfirmationId: red.id,
        type: 'missing_position',
        severity: 'high',
        state: 'open',
        diff: { positionNo: 30, sku: null, kind: 'missing_position' },
      },
      {
        tenantId: TENANT,
        projectId: projB.id,
        orderId: orderB.id,
        orderConfirmationId: red.id,
        type: 'price_delta',
        severity: 'high',
        state: 'open',
        diff: { positionNo: 20, kind: 'price_delta', before: { unitPriceNet: 540 }, after: { unitPriceNet: 615 } },
      },
    ],
    skipDuplicates: true,
  });

  // Appointment suggestion (delivery) from the Siemens mail
  const deliveryMail = await prisma.email.findFirstOrThrow({
    where: { tenantId: TENANT, classification: 'delivery_date' },
  });
  await prisma.appointmentSuggestion.create({
    data: {
      tenantId: TENANT,
      sourceEmailId: deliveryMail.id,
      score: new Prisma.Decimal(0.78),
      proposed: {
        projectId: projB.id,
        customerId: customerB.id,
        kind: 'delivery',
        title: 'Lieferung Schneider (Vorschlag)',
        startAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        endAt: new Date(Date.now() + 3 * 86_400_000 + 3 * 3_600_000).toISOString(),
      },
    },
  });

  // Social drafts for the green project
  const socials = ['idea', 'draft', 'draft', 'approved'] as const;
  for (const [i, state] of socials.entries()) {
    await prisma.socialPost.create({
      data: {
        tenantId: TENANT,
        projectId: projA.id,
        channel: 'instagram',
        contentText: `Küche ${projA.code}: ${state.toUpperCase()} #${i + 1}\n\nEntwurf Nr. ${i + 1}.`,
        state,
      },
    });
  }

  // Board cards for the dashboard. One card per real process object so the
  // Operations + AB boards show something substantial.
  const opsBoard = await prisma.board.findFirstOrThrow({ where: { tenantId: TENANT, key: 'operations' } });
  const absBoard = await prisma.board.findFirstOrThrow({ where: { tenantId: TENANT, key: 'abs' } });
  const opsTriage = await prisma.boardList.findFirstOrThrow({ where: { boardId: opsBoard.id, name: 'Triage' } });
  const opsInProgress = await prisma.boardList.findFirstOrThrow({ where: { boardId: opsBoard.id, name: 'In Arbeit' } });
  const abGreen = await prisma.boardList.findFirstOrThrow({ where: { boardId: absBoard.id, name: 'Grün' } });
  const abRed = await prisma.boardList.findFirstOrThrow({ where: { boardId: absBoard.id, name: 'Rot kritisch' } });

  async function card(opts: Parameters<typeof prisma.boardCard.create>[0]['data']) {
    try {
      await prisma.boardCard.create({ data: opts });
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }
  await card({
    boardId: opsBoard.id,
    listId: opsInProgress.id,
    title: `Projekt ${projA.code} – ${projA.title}`,
    summary: 'Fertigstellung Montage Woche 18',
    priority: 'med',
    objectKind: 'project',
    objectId: projA.id,
    orderIndex: 1,
    metadata: { ampel: 'green' } as any,
  });
  await card({
    boardId: opsBoard.id,
    listId: opsTriage.id,
    title: `Reklamation: ${projA.code}`,
    summary: 'Arbeitsplatte beschädigt – Eingang via E-Mail',
    priority: 'high',
    objectKind: 'complaint',
    objectId: projA.id,
    orderIndex: 2,
    labels: ['reklamation'],
    metadata: { ampel: 'red' } as any,
  });
  await card({
    boardId: absBoard.id,
    listId: abGreen.id,
    title: `AB ${green.abNumber} (Nobilia, ${projA.code})`,
    summary: 'Alle Positionen wie bestellt.',
    objectKind: 'order_confirmation',
    objectId: green.id,
    orderIndex: 1,
    metadata: { ampel: 'green' } as any,
  });
  await card({
    boardId: absBoard.id,
    listId: abRed.id,
    title: `AB ${red.abNumber} (Siemens, ${projB.code})`,
    summary: 'Pos 30 fehlt · Pos 20 Preisabweichung +13,9%.',
    priority: 'urgent',
    objectKind: 'order_confirmation',
    objectId: red.id,
    orderIndex: 1,
    labels: ['kritisch'],
    metadata: { ampel: 'red' } as any,
  });

  // A couple of agent runs so the Agents page looks alive
  for (const [i, agentKey] of (['mail', 'ab', 'termin', 'controlling'] as const).entries()) {
    await prisma.agentRun.create({
      data: {
        tenantId: TENANT,
        agentKey,
        trigger: 'demo',
        triggerRef: `demo-${agentKey}`,
        state: 'succeeded',
        input: { demo: true },
        output: { ok: true, note: `demo run for ${agentKey}` },
        startedAt: new Date(Date.now() - (i + 1) * 5 * 60_000),
        finishedAt: new Date(Date.now() - (i + 1) * 5 * 60_000 + 2_000),
        idempotencyKey: `demo:${agentKey}:${Date.now()}:${i}`,
      },
    });
  }

  console.log('demo fixtures done');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
