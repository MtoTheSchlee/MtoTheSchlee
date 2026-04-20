import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { SocialService } from './social.service.js';

@Controller('social')
export class SocialController {
  constructor(private readonly svc: SocialService) {}

  @Get() list(@TenantId() t: string, @Query('state') s?: string) {
    return this.svc.list(t, s);
  }
  @Post() upsert(@TenantId() t: string, @Body() dto: any) {
    return this.svc.upsert(t, dto);
  }
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: { actorId: string; comment?: string }) {
    return this.svc.approve(id, dto);
  }
}
