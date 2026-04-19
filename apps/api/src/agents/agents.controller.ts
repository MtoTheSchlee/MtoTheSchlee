import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AgentKey } from '@prisma/client';
import { TenantId } from '../common/tenant.decorator.js';
import { AgentsService } from './agents.service.js';

@Controller('agents')
export class AgentsController {
  constructor(private readonly svc: AgentsService) {}

  @Get('runs') runs(@TenantId() t: string, @Query('state') s?: string) {
    return this.svc.runs(t, s);
  }

  @Post('dispatch')
  dispatch(
    @TenantId() t: string,
    @Body() dto: { agentKey: AgentKey; trigger: string; triggerRef?: string; input?: any },
  ) {
    return this.svc.dispatch({ tenantId: t, ...dto });
  }

  @Patch('runs/:id/state')
  markState(
    @Param('id') id: string,
    @Body() dto: { state: 'running' | 'succeeded' | 'failed' | 'cancelled'; output?: any; error?: any },
  ) {
    return this.svc.markState(id, dto.state, { output: dto.output, error: dto.error });
  }

  @Post('runs/:id/events')
  event(@Param('id') id: string, @Body() dto: { kind: string; payload?: any }) {
    return this.svc.appendEvent(id, dto.kind, dto.payload);
  }
}
