import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUE_NAMES = {
  MAIL_INGEST: 'mail.ingest',
  MAIL_CLASSIFY: 'mail.classify',
  AB_EXTRACT: 'ab.extract',
  AB_MATCH: 'ab.match',
  DOC_CLASSIFY: 'doc.classify',
  APPT_SUGGEST: 'appointment.suggest',
  CONTROLLING: 'controlling.compute',
  SOCIAL_IDEATE: 'social.ideate',
  SPEECH_STT: 'speech.stt',
  SPEECH_TTS: 'speech.tts',
  SPEECH_COMMAND: 'speech.command',
  ORCHESTRATOR: 'orchestrator.plan',
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Central BullMQ queue registry. One Redis connection, many queues. */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  private readonly queues = new Map<QueueName, Queue>();

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async enqueue<T = unknown>(name: QueueName, data: T, opts?: { idempotencyKey?: string; delay?: number }) {
    const q = this.queue(name);
    const jobId = opts?.idempotencyKey;
    return q.add(name, data as any, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      ...(opts?.delay ? { delay: opts.delay } : {}),
    });
  }

  async onModuleDestroy() {
    for (const q of this.queues.values()) await q.close();
    await this.connection.quit();
  }
}
