import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuditInput {
  tenantId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorAgentRunId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private lastHashByTenant = new Map<string, string | null>();

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    const prev = this.lastHashByTenant.get(input.tenantId) ?? null;
    const payload = {
      ...input,
      hashPrev: prev,
      at: new Date().toISOString(),
    };
    const hashSelf = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const row = await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorAgentRunId: input.actorAgentRunId ?? null,
        before: input.before as any,
        after: input.after as any,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        hashPrev: prev,
        hashSelf,
      },
    });
    this.lastHashByTenant.set(input.tenantId, hashSelf);
    return row;
  }
}
