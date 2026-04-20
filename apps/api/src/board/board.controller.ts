import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { BoardService } from './board.service.js';

@Controller('board')
export class BoardController {
  constructor(private readonly svc: BoardService) {}

  @Get() boards(@TenantId() t: string) {
    return this.svc.listBoards(t);
  }

  @Get(':key') full(@TenantId() t: string, @Param('key') key: string) {
    return this.svc.boardFull(t, key);
  }

  @Roles('agent', 'planner', 'purchaser', 'owner')
  @Post(':key/upsert')
  upsert(@TenantId() t: string, @Param('key') key: string, @Body() dto: any) {
    return this.svc.upsertProcessCard(t, key, dto);
  }

  // Intentionally open in MVP so the browser can move cards without a
  // session token. Production should require planner/owner.
  @Post('cards/:id/move')
  move(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.moveCard(t, id, dto);
  }
}
