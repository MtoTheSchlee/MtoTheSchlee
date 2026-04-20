import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { AbService } from './ab.service.js';

@Controller('ab')
export class AbController {
  constructor(private readonly svc: AbService) {}

  @Get()
  list(
    @TenantId() t: string,
    @Query('ampel') ampel?: 'green' | 'yellow' | 'red',
    @Query('status') status?: string,
  ) {
    return this.svc.list(t, { ampel, status });
  }

  /** Used by the worker to push already-parsed AB data. */
  @Roles('agent', 'purchaser', 'owner')
  @Post('ingest')
  ingest(@TenantId() t: string, @Body() body: any) {
    return this.svc.ingestParsed(t, body);
  }

  @Roles('purchaser', 'owner')
  @Post(':id/accept')
  accept(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.accept(t, id);
  }
}
