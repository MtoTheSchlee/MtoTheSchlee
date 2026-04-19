import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

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
