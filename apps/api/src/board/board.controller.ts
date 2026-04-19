import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { BoardService } from './board.service.js';

@Controller('board')
export class BoardController {
  constructor(private readonly svc: BoardService) {}

  @Get() boards(@TenantId() t: string) { return this.svc.listBoards(t); }

  @Get(':key') full(@TenantId() t: string, @Param('key') key: string) {
    return this.svc.boardFull(t, key);
  }

  @Post(':key/upsert')
  upsert(@TenantId() t: string, @Param('key') key: string, @Body() dto: any) {
    return this.svc.upsertProcessCard(t, key, dto);
  }

  @Post('cards/:id/move')
  move(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.moveCard(t, id, dto);
  }
}
