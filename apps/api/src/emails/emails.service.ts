import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { StorageService } from '../documents/storage.service.js';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
    private readonly storage: StorageService,
  ) {}

  /**
   * Load an email attachment back as bytes. Used by the worker to feed
   * AB PDFs into the upload pipeline. Tenant-scoped so cross-tenant
   * requests can't reach another mandant's blob store.
   */
  async loadAttachment(tenantId: string, emailId: string, attachmentId: string) {
    const att = await this.prisma.emailAttachment.findFirst({
      where: { id: attachmentId, email: { id: emailId, tenantId } },
    });
    if (!att) throw new NotFoundException('attachment not found');
    const [bucket, ...rest] = att.storageKey.split('/');
    const key = rest.join('/');
    if (!bucket) throw new NotFoundException('malformed storageKey');
    const buffer = await this.storage.read(bucket, key);
    if (!buffer) throw new NotFoundException('attachment body missing');
    return { attachment: att, buffer };
  }

  /** Store a new attachment body (used by demo fixtures and worker tests). */
  async putAttachmentBody(
    tenantId: string,
    emailId: string,
    filename: string,
    mime: string,
    body: Buffer,
  ) {
    const email = await this.prisma.email.findFirst({ where: { id: emailId, tenantId } });
    if (!email) throw new NotFoundException('email not found');
    const bucket = process.env.S3_BUCKET_DOCUMENTS ?? 'kkos-documents';
    const key = `${tenantId}/email/${emailId}/${Date.now()}-${filename.replace(/[^\w.\-]+/g, '_')}`;
    const { storageKey } = await this.storage.put(bucket, key, body, mime);
    return this.prisma.emailAttachment.create({
      data: {
        emailId,
        filename,
        mime,
        sizeBytes: body.length,
        storageKey,
      },
    });
  }

  list(tenantId: string, filter?: { classification?: string; status?: string; q?: string }) {
    return this.prisma.email.findMany({
      where: {
        tenantId,
        ...(filter?.classification ? { classification: filter.classification as any } : {}),
        ...(filter?.status ? { status: filter.status as any } : {}),
        ...(filter?.q
          ? {
              OR: [
                { subject: { contains: filter.q, mode: 'insensitive' } },
                { fromAddr: { contains: filter.q, mode: 'insensitive' } },
                { bodyText: { contains: filter.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  one(tenantId: string, id: string) {
    return this.prisma.email.findFirst({
      where: { id, tenantId },
      include: { attachments: true, events: { orderBy: { at: 'desc' } } },
    });
  }

  /**
   * Ingest point used by MailAgent. Enforces idempotency via
   * (tenantId, mailboxId, messageId) unique index.
   */
  async ingest(
    tenantId: string,
    input: {
      mailboxId: string;
      messageId: string;
      threadId?: string;
      inReplyTo?: string;
      fromAddr: string;
      toAddrs: string[];
      ccAddrs?: string[];
      subject: string;
      receivedAt?: Date;
      bodyText?: string;
      bodyHtml?: string;
      rawHeaders?: any;
      hasAttachments?: boolean;
    },
  ) {
    const existing = await this.prisma.email.findFirst({
      where: { tenantId, mailboxId: input.mailboxId, messageId: input.messageId },
    });
    if (existing) return existing;

    const row = await this.prisma.email.create({
      data: {
        tenantId,
        mailboxId: input.mailboxId,
        messageId: input.messageId,
        threadId: input.threadId,
        inReplyTo: input.inReplyTo,
        fromAddr: input.fromAddr,
        toAddrs: input.toAddrs,
        ccAddrs: input.ccAddrs ?? [],
        bccAddrs: [],
        subject: input.subject,
        receivedAt: input.receivedAt ?? new Date(),
        status: 'new',
        classification: 'unknown',
        rawHeaders: input.rawHeaders,
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml,
        hasAttachments: input.hasAttachments ?? false,
      },
    });

    this.rt.publish({
      type: 'email.ingested',
      tenantId,
      emailId: row.id,
      mailboxId: input.mailboxId,
      receivedAt: (input.receivedAt ?? new Date()).toISOString(),
    });
    return row;
  }

  async classify(
    tenantId: string,
    id: string,
    classification: string,
    confidence: number,
  ) {
    const row = await this.prisma.email.update({
      where: { id },
      data: { classification: classification as any, classificationConfidence: confidence, status: 'triaged' },
    });
    this.rt.publish({
      type: 'email.classified',
      tenantId,
      emailId: id,
      classification: classification as any,
      confidence,
    });
    return row;
  }

  assign(tenantId: string, id: string, data: { projectId?: string; customerId?: string; supplierId?: string }) {
    return this.prisma.email.update({
      where: { id },
      data: { ...data, status: 'assigned' },
    });
  }
}
