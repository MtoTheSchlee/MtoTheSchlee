import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, filter?: { projectId?: string; from?: Date; to?: Date }) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.from || filter?.to
          ? { startAt: { gte: filter?.from, lte: filter?.to } }
          : {}),
      },
      orderBy: { startAt: 'asc' },
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.appointment.create({
      data: {
        tenantId,
        ...data,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        state: data.state ?? 'confirmed',
        source: data.source ?? 'manual',
      },
    });
  }

  suggestions(tenantId: string, state = 'new') {
    return this.prisma.appointmentSuggestion.findMany({
      where: { tenantId, state },
      orderBy: { createdAt: 'desc' },
    });
  }

  async proposeFromEmail(
    tenantId: string,
    input: { sourceEmailId: string; proposed: any; score: number },
  ) {
    return this.prisma.appointmentSuggestion.create({
      data: {
        tenantId,
        sourceEmailId: input.sourceEmailId,
        proposed: input.proposed,
        score: input.score,
      },
    });
  }

  async acceptSuggestion(tenantId: string, id: string) {
    const sug = await this.prisma.appointmentSuggestion.findFirst({ where: { id, tenantId } });
    if (!sug) return null;
    const prop = sug.proposed as any;
    const appt = await this.prisma.appointment.create({
      data: {
        tenantId,
        projectId: prop.projectId,
        customerId: prop.customerId,
        kind: prop.kind,
        title: prop.title,
        startAt: new Date(prop.startAt),
        endAt: new Date(prop.endAt),
        location: prop.location,
        participants: prop.participants,
        state: 'confirmed',
        source: 'email_suggestion',
      },
    });
    await this.prisma.appointmentSuggestion.update({
      where: { id },
      data: { state: 'accepted', acceptedAppointmentId: appt.id },
    });
    return appt;
  }
}
