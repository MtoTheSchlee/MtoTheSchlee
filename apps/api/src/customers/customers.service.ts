import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, q?: string) {
    const where: any = { tenantId };
    if (q) {
      where.OR = [
        { lastName: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  byId(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: { projects: true, emails: { take: 50, orderBy: { receivedAt: 'desc' } }, documents: true },
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.customer.create({ data: { ...data, tenantId } });
  }
}
