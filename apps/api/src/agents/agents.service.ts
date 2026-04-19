import { Injectable } from '@nestjs/common';
import type { AgentKey } from '@prisma/client';
import { idempotencyKey } from '@kk/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService, QUEUE_NAMES, type QueueName } from './queue.service.js';

const AGENT_QUEUE: Record<AgentKey, QueueName> = {
  mail: QUEUE_NAMES.MAIL_CLASSIFY,
  ab: QUEUE_NAMES.AB_EXTRACT,
  kundenakte: QUEUE_NAMES.DOC_CLASSIFY,
  termin: QUEUE_NAMES.APPT_SUGGEST,
  controlling: QUEUE_NAMES.CONTROLLING,
  social: QUEUE_NAMES.SOCIAL_IDEATE,
  speech: QUEUE_NAMES.SPEECH_STT,
  orchestrator: QUEUE_NAMES.ORCHESTRATOR,
};

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  runs(tenantId: string, state?: string) {
    return this.prisma.agentRun.findMany({
      where: { tenantId, ...(state ? { state: state as any } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: { events: { take: 20, orderBy: { at: 'desc' } } },
    });
  }

  /**
   * Dispatch an agent run. Idempotent by (tenantId, agentKey, triggerRef).
   * The worker picks up the BullMQ job and updates state via the API.
   */
  async dispatch(params: {
    tenantId: string;
    agentKey: AgentKey;
    trigger: string;
    triggerRef?: string;
    input?: Record<string, unknown>;
  }) {
    const key = idempotencyKey([params.tenantId, params.agentKey, params.triggerRef ?? '', params.trigger]);
    const existing = await this.prisma.agentRun.findFirst({
      where: { tenantId: params.tenantId, idempotencyKey: key },
    });
    if (existing) return existing;

    const run = await this.prisma.agentRun.create({
      data: {
        tenantId: params.tenantId,
        agentKey: params.agentKey,
        trigger: params.trigger,
        triggerRef: params.triggerRef ?? null,
        input: params.input as any,
        state: 'queued',
        idempotencyKey: key,
      },
    });
    await this.queues.enqueue(
      AGENT_QUEUE[params.agentKey],
      { runId: run.id, tenantId: run.tenantId, input: run.input },
      { idempotencyKey: key },
    );
    return run;
  }

  markState(runId: string, state: 'running' | 'succeeded' | 'failed' | 'cancelled', patch?: { output?: any; error?: any }) {
    return this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        state,
        ...(state === 'running' ? { startedAt: new Date() } : {}),
        ...(state === 'succeeded' || state === 'failed' ? { finishedAt: new Date() } : {}),
        ...(patch?.output ? { output: patch.output } : {}),
        ...(patch?.error ? { error: patch.error } : {}),
      },
    });
  }

  appendEvent(runId: string, kind: string, payload?: any) {
    return this.prisma.agentEvent.create({ data: { runId, kind, payload } });
  }
}
