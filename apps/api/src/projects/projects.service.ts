import { Injectable } from '@nestjs/common';
import { ProjectStage } from '@prisma/client';
import { projectCode, PROJECT_STAGES } from '@kk/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  byId(tenantId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        orders: {
          include: {
            supplier: true,
            items: true,
            confirmations: { include: { items: true } },
            discrepancies: true,
          },
        },
        appointments: true,
        documents: true,
        emails: { take: 50, orderBy: { receivedAt: 'desc' } },
      },
    });
  }

  async create(tenantId: string, data: { customerId: string; title: string; stage?: ProjectStage }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.project.count({ where: { tenantId } });
    const code = projectCode({ year, seq: count + 1 });
    return this.prisma.project.create({
      data: { tenantId, ...data, code, stage: data.stage ?? 'lead' },
    });
  }

  updateStage(tenantId: string, id: string, stage: ProjectStage) {
    if (!PROJECT_STAGES.includes(stage as any)) {
      throw new Error(`invalid stage ${stage}`);
    }
    return this.prisma.project.update({ where: { id }, data: { stage } });
  }
}
