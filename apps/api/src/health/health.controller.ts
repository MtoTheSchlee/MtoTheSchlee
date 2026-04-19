import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz() {
    return { ok: true };
  }

  @Get('readyz')
  async readyz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up' };
    } catch (err) {
      return { ok: false, db: 'down', error: (err as Error).message };
    }
  }
}
