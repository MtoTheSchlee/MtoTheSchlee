import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { AppointmentsService } from './appointments.service.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get() list(
    @TenantId() t: string,
    @Query('projectId') pid?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list(t, {
      projectId: pid,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post() create(@TenantId() t: string, @Body() dto: any) {
    return this.svc.create(t, dto);
  }

  @Get('suggestions')
  suggestions(@TenantId() t: string, @Query('state') state?: string) {
    return this.svc.suggestions(t, state ?? 'new');
  }

  @Post('suggestions')
  propose(@TenantId() t: string, @Body() dto: any) {
    return this.svc.proposeFromEmail(t, dto);
  }

  @Post('suggestions/:id/accept')
  accept(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.acceptSuggestion(t, id);
  }
}
