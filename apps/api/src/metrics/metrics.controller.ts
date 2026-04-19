import { Controller, Get } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly svc: MetricsService) {}

  @Get('snapshot') snapshot(@TenantId() t: string) { return this.svc.snapshot(t); }
  @Get('suppliers') scorecards(@TenantId() t: string) { return this.svc.supplierScorecards(t); }
  @Get('cycle-time') cycle(@TenantId() t: string) { return this.svc.cycleTimeDays(t); }
}
