import { Injectable, NotFoundException } from '@nestjs/common';
import type { BoardObjectKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  listBoards(tenantId: string) {
    return this.prisma.board.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async boardFull(tenantId: string, key: string) {
    const board = await this.prisma.board.findFirst({
      where: { tenantId, key },
      include: {
        lists: {
          orderBy: { orderIndex: 'asc' },
          include: { cards: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    if (!board) throw new NotFoundException();
    return board;
  }

  async moveCard(
    tenantId: string,
    cardId: string,
    to: { listId: string; orderIndex: number },
  ) {
    const card = await this.prisma.boardCard.findFirst({
      where: { id: cardId, board: { tenantId } },
    });
    if (!card) throw new NotFoundException();
    const updated = await this.prisma.boardCard.update({
      where: { id: cardId },
      data: { listId: to.listId, orderIndex: to.orderIndex },
    });
    this.rt.publish({
      type: 'board.card.changed',
      tenantId,
      boardId: updated.boardId,
      cardId: updated.id,
      objectKind: updated.objectKind as any,
      change: 'moved',
    });
    return updated;
  }

  async upsertProcessCard(
    tenantId: string,
    boardKey: string,
    input: {
      listName: string;
      objectKind: BoardObjectKind;
      objectId: string;
      title: string;
      summary?: string;
      priority?: 'low' | 'med' | 'high' | 'urgent';
      labels?: string[];
      dueAt?: Date | null;
      metadata?: any;
    },
  ) {
    const board = await this.prisma.board.findFirst({ where: { tenantId, key: boardKey } });
    if (!board) throw new NotFoundException(`board ${boardKey} not found`);
    const list = await this.prisma.boardList.findFirst({
      where: { boardId: board.id, name: input.listName },
    });
    if (!list) throw new NotFoundException(`list ${input.listName} not found on board ${boardKey}`);

    const existing = await this.prisma.boardCard.findFirst({
      where: { boardId: board.id, objectKind: input.objectKind, objectId: input.objectId },
    });
    if (existing) {
      const updated = await this.prisma.boardCard.update({
        where: { id: existing.id },
        data: {
          listId: list.id,
          title: input.title,
          summary: input.summary,
          priority: input.priority ?? 'med',
          labels: input.labels ?? [],
          dueAt: input.dueAt,
          metadata: input.metadata,
        },
      });
      this.rt.publish({
        type: 'board.card.changed',
        tenantId,
        boardId: board.id,
        cardId: updated.id,
        objectKind: updated.objectKind as any,
        change: 'updated',
      });
      return updated;
    }

    const orderIndex = (await this.prisma.boardCard.count({ where: { listId: list.id } })) + 1;
    const created = await this.prisma.boardCard.create({
      data: {
        boardId: board.id,
        listId: list.id,
        title: input.title,
        summary: input.summary,
        priority: input.priority ?? 'med',
        labels: input.labels ?? [],
        dueAt: input.dueAt,
        objectKind: input.objectKind,
        objectId: input.objectId,
        orderIndex,
        metadata: input.metadata,
      },
    });
    this.rt.publish({
      type: 'board.card.changed',
      tenantId,
      boardId: board.id,
      cardId: created.id,
      objectKind: created.objectKind as any,
      change: 'created',
    });
    return created;
  }
}
