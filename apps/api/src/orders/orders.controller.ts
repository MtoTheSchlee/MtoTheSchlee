import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get() list(@TenantId() t: string, @Query('projectId') pid?: string) {
    return this.svc.list(t, pid);
  }
  @Get(':id') one(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.one(t, id);
  }
  @Post() create(@TenantId() t: string, @Body() dto: any) {
    return this.svc.create(t, dto);
  }
  @Get('matrix/:projectId')
  matrix(@TenantId() t: string, @Param('projectId') pid: string) {
    return this.svc.matrix(t, pid);
  }
}
