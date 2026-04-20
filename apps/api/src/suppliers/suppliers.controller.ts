import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { SuppliersService } from './suppliers.service.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get() list(@TenantId() t: string) { return this.svc.list(t); }
  @Post() upsert(@TenantId() t: string, @Body() dto: any) { return this.svc.upsert(t, dto); }
  @Get(':id/scorecard')
  scorecard(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.scorecard(t, id);
  }
}
