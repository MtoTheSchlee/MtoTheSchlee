import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, state?: string) {
    return this.prisma.socialPost.findMany({
      where: { tenantId, ...(state ? { state: state as any } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  upsert(tenantId: string, data: any) {
    return data.id
      ? this.prisma.socialPost.update({ where: { id: data.id }, data })
      : this.prisma.socialPost.create({ data: { tenantId, ...data } });
  }

  approve(id: string, approval: { actorId: string; comment?: string }) {
    return this.prisma.socialPost.update({
      where: { id },
      data: {
        state: 'approved',
        approvals: { set: { byUserId: approval.actorId, at: new Date().toISOString(), comment: approval.comment ?? '' } as any },
      },
    });
  }
}
