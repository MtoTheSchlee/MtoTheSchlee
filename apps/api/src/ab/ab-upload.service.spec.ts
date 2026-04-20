import { describe, expect, it, vi } from 'vitest';
import { AbUploadService } from './ab-upload.service.js';
import type { PdfExtractorService } from './pdf-extractor.service.js';
import type { DocumentsService } from '../documents/documents.service.js';
import type { AbService } from './ab.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeDeps(overrides: Partial<{
  pdfText: string;
  suppliers: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; code: string }>;
  orders: Array<{ id: string; orderNumber: string }>;
  discrepancyCount: number;
}> = {}) {
  const pdfText = overrides.pdfText ?? '';
  const suppliers = overrides.suppliers ?? [];
  const projects = overrides.projects ?? [];
  const orders = overrides.orders ?? [];

  const pdf: PdfExtractorService = {
    extractText: vi.fn().mockResolvedValue({ text: pdfText, pages: 1 }),
  } as any;

  const documents: DocumentsService = {
    upload: vi.fn().mockResolvedValue({ id: 'doc1', toReview: false }),
  } as any;

  const ab: AbService = {
    ingestParsed: vi.fn().mockResolvedValue({
      confirmation: { id: 'conf1', status: 'matched', ampel: 'green' },
      match: { diffs: [] },
    }),
  } as any;

  const prisma: PrismaService = {
    supplier: { findMany: vi.fn().mockResolvedValue(suppliers) },
    project: {
      findFirst: vi.fn().mockImplementation(async ({ where }: any) =>
        projects.find((p) => p.code === where.code) ?? null,
      ),
    },
    order: { findMany: vi.fn().mockResolvedValue(orders) },
    discrepancyCase: {
      count: vi.fn().mockResolvedValue(overrides.discrepancyCount ?? 0),
    },
  } as any;

  return { pdf, documents, ab, prisma };
}

describe('AbUploadService', () => {
  it('rejects non-PDF uploads', async () => {
    const { pdf, documents, ab, prisma } = makeDeps();
    const svc = new AbUploadService(prisma, documents, pdf, ab);
    await expect(
      svc.handle('t', { filename: 'x.txt', mime: 'text/plain', body: Buffer.from('hi') }),
    ).rejects.toThrow(/pdf/);
  });

  it('lands in triage when supplier + project cannot be resolved', async () => {
    const { pdf, documents, ab, prisma } = makeDeps({
      pdfText: '10 1 Stk Teststück 10,00 €',
      suppliers: [],
      projects: [],
    });
    const svc = new AbUploadService(prisma, documents, pdf, ab);
    const result = await svc.handle('t', {
      filename: 'x.pdf',
      mime: 'application/pdf',
      body: Buffer.from('ignored'),
    });
    expect(result.confirmation).toBeUndefined();
    expect(result.unresolved).toEqual(expect.arrayContaining(['project', 'supplier']));
    expect(ab.ingestParsed).not.toHaveBeenCalled();
  });

  it('resolves supplier by name + project by KK code and ingests', async () => {
    const { pdf, documents, ab, prisma } = makeDeps({
      pdfText: [
        'AB-Nr.: NOB-2026-LIVE',
        'Projekt KK-2026-0001',
        '10 2 Stk Unterschrank 60cm 320,00 €',
      ].join('\n'),
      suppliers: [{ id: 'sup-nob', name: 'Nobilia' }],
      projects: [{ id: 'proj-1', code: 'KK-2026-0001' }],
      orders: [{ id: 'ord-1', orderNumber: 'KK-ORD-0001' }],
    });
    const svc = new AbUploadService(prisma, documents, pdf, ab);
    const result = await svc.handle('t', {
      filename: 'Nobilia-AB.pdf',
      mime: 'application/pdf',
      body: Buffer.from('ignored'),
    });
    expect(result.confirmation).toBeDefined();
    expect(ab.ingestParsed).toHaveBeenCalledOnce();
    const call = (ab.ingestParsed as any).mock.calls[0][1];
    expect(call.projectId).toBe('proj-1');
    expect(call.supplierId).toBe('sup-nob');
    expect(call.orderId).toBe('ord-1');
    expect(call.abNumber).toBe('NOB-2026-LIVE');
    expect(call.items).toHaveLength(1);
  });
});
