import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { parseAbBasic } from '@kk/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { AbService } from './ab.service.js';

export interface AbUploadInput {
  filename: string;
  mime: string;
  body: Buffer;
  /** Optional hints; if not provided we try to match from parsed content. */
  projectId?: string;
  supplierId?: string;
  orderId?: string;
}

export interface AbUploadResult {
  documentId: string;
  parsed: ReturnType<typeof parseAbBasic>;
  confirmation?: {
    id: string;
    status: string;
    ampel: string | null;
    diffs: number;
  };
  unresolved?: string[];
}

/**
 * End-to-end AB upload flow: store the PDF, extract text, run the
 * deterministic parser, resolve project + supplier + order, then hand
 * off to AbService.ingestParsed which runs the matcher and creates
 * discrepancies. If anything can't be resolved we return the parsed
 * payload so the caller can show it for manual triage.
 */
@Injectable()
export class AbUploadService {
  private readonly log = new Logger('AbUploadService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly pdf: PdfExtractorService,
    private readonly ab: AbService,
  ) {}

  /**
   * Auto-ingest every PDF attachment on an email through the upload
   * pipeline. Used by the AB agent to turn a classified AB mail into an
   * AmpelL result without any human click. Non-PDF attachments are
   * ignored.
   */
  async handleEmailAttachments(
    tenantId: string,
    emailId: string,
    deps: { loadAttachment: (attachmentId: string) => Promise<{ filename: string; mime: string; body: Buffer }> },
  ): Promise<AbUploadResult[]> {
    const email = await this.prisma.email.findFirst({
      where: { id: emailId, tenantId },
      include: { attachments: true },
    });
    if (!email) throw new NotFoundException('email not found');
    const results: AbUploadResult[] = [];
    for (const att of email.attachments) {
      if ((att.mime ?? '').toLowerCase() !== 'application/pdf') continue;
      const blob = await deps.loadAttachment(att.id);
      const result = await this.handle(tenantId, {
        filename: blob.filename,
        mime: blob.mime,
        body: blob.body,
        projectId: email.projectId ?? undefined,
        supplierId: email.supplierId ?? undefined,
      });
      results.push(result);
    }
    return results;
  }

  async handle(tenantId: string, input: AbUploadInput): Promise<AbUploadResult> {
    if (input.mime !== 'application/pdf') {
      throw new BadRequestException('only application/pdf is supported');
    }
    const extracted = await this.pdf.extractText(input.body);
    const parsed = parseAbBasic({ subject: input.filename, body: extracted.text });

    const document = await this.documents.upload(tenantId, {
      title: input.filename,
      kind: 'ab',
      mime: input.mime,
      body: input.body,
      source: 'upload',
      projectId: input.projectId,
      supplierId: input.supplierId,
      metadata: {
        pdfPages: extracted.pages,
        abNumber: parsed.abNumber,
        itemCount: parsed.items.length,
      },
      // Flag for review if we couldn't extract anything useful.
      toReview: parsed.items.length === 0,
    });

    const unresolved: string[] = [];
    const projectId =
      input.projectId ?? (await this.resolveProjectFromText(tenantId, extracted.text));
    if (!projectId) unresolved.push('project');

    const supplierId =
      input.supplierId ??
      (await this.resolveSupplierFromText(tenantId, extracted.text, input.filename));
    if (!supplierId) unresolved.push('supplier');

    if (!projectId || !supplierId || parsed.items.length === 0) {
      this.log.warn({ unresolved, items: parsed.items.length }, 'ab upload landed in triage');
      return { documentId: document.id, parsed, unresolved };
    }

    const orderId =
      input.orderId ??
      (await this.pickCandidateOrder(tenantId, projectId, supplierId, extracted.text));

    const { confirmation } = await this.ab.ingestParsed(tenantId, {
      projectId,
      supplierId,
      orderId: orderId ?? null,
      documentId: document.id,
      abNumber: parsed.abNumber,
      items: parsed.items.map((i) => ({
        positionNo: i.positionNo,
        sku: i.sku,
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        unitPriceNet: i.unitPriceNet,
        confirmedDeliveryAt: i.confirmedDeliveryAt ? new Date(i.confirmedDeliveryAt) : null,
      })),
    });

    return {
      documentId: document.id,
      parsed,
      confirmation: {
        id: confirmation.id,
        status: confirmation.status,
        ampel: (confirmation.ampel as string | null) ?? null,
        diffs:
          (
            await this.prisma.discrepancyCase.count({
              where: { orderConfirmationId: confirmation.id },
            })
          ) ?? 0,
      },
    };
  }

  private async resolveProjectFromText(
    tenantId: string,
    text: string,
  ): Promise<string | null> {
    const m = text.match(/\bKK-\d{4}-\d{3,4}\b/);
    if (!m) return null;
    const project = await this.prisma.project.findFirst({
      where: { tenantId, code: m[0] },
    });
    return project?.id ?? null;
  }

  private async resolveSupplierFromText(
    tenantId: string,
    text: string,
    filename: string,
  ): Promise<string | null> {
    const suppliers = await this.prisma.supplier.findMany({ where: { tenantId } });
    const hay = `${filename} ${text}`.toLowerCase();
    for (const s of suppliers) {
      if (hay.includes(s.name.toLowerCase())) return s.id;
    }
    return null;
  }

  private async pickCandidateOrder(
    tenantId: string,
    projectId: string,
    supplierId: string,
    text: string,
  ): Promise<string | null> {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, projectId, supplierId },
    });
    if (orders.length === 0) return null;
    const m = text.match(/KK-ORD-\d{3,6}/i);
    if (m) {
      const byNum = orders.find((o) => o.orderNumber.toUpperCase() === m[0].toUpperCase());
      if (byNum) return byNum.id;
    }
    // Otherwise return the most recent open order for that pair.
    return orders[0]?.id ?? null;
  }
}
