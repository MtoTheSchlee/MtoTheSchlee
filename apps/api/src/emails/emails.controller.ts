import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { EmailsService } from './emails.service.js';

@Controller('emails')
export class EmailsController {
  constructor(private readonly svc: EmailsService) {}

  @Get()
  list(
    @TenantId() t: string,
    @Query('classification') c?: string,
    @Query('status') s?: string,
    @Query('q') q?: string,
  ) {
    return this.svc.list(t, { classification: c, status: s, q });
  }

  @Get(':id') one(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.one(t, id);
  }

  @Post('ingest') ingest(@TenantId() t: string, @Body() dto: any) {
    return this.svc.ingest(t, dto);
  }

  @Patch(':id/classify')
  classify(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() dto: { classification: string; confidence: number },
  ) {
    return this.svc.classify(t, id, dto.classification, dto.confidence);
  }

  @Patch(':id/assign')
  assign(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.assign(t, id, dto);
  }
}
