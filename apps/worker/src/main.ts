import { pino } from 'pino';
import { Redis as IORedis } from 'ioredis';
import { Worker, Queue } from 'bullmq';
import { ApiClient } from './api-client.js';
import { registerMailAgent } from './agents/mail.agent.js';
import { registerAbAgent } from './agents/ab.agent.js';
import { registerKundenakteAgent } from './agents/kundenakte.agent.js';
import { registerTerminAgent } from './agents/termin.agent.js';
import { registerControllingAgent } from './agents/controlling.agent.js';
import { registerSocialAgent } from './agents/social.agent.js';
import { registerSpeechAgent } from './agents/speech.agent.js';
import { registerOrchestratorAgent } from './agents/orchestrator.agent.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info', transport: { target: 'pino-pretty' } });
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const api = new ApiClient(process.env.API_PUBLIC_URL ?? 'http://localhost:4000', process.env.TENANT_DEFAULT_ID ?? '');

const deps = { connection, api, log } as const;

const workers: Worker[] = [
  registerMailAgent(deps),
  registerAbAgent(deps),
  registerKundenakteAgent(deps),
  registerTerminAgent(deps),
  registerControllingAgent(deps),
  registerSocialAgent(deps),
  registerSpeechAgent(deps),
  registerOrchestratorAgent(deps),
];

process.on('SIGTERM', async () => {
  log.info('shutting down workers');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
});

log.info({ count: workers.length }, 'KK-OS worker started');

// Cron: controlling recompute every 15 minutes.
// Idempotent jobId per minute window so duplicate emitters don't multiply load.
const controlling = new Queue('controlling.compute', { connection });
async function emitControllingCron() {
  const tenantId = process.env.TENANT_DEFAULT_ID ?? '';
  const slot = Math.floor(Date.now() / (15 * 60 * 1000));
  await controlling.add(
    'cron',
    { tenantId, input: { trigger: 'cron', slot } },
    {
      jobId: `controlling:${tenantId}:${slot}`,
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );
}
emitControllingCron().catch((err) => log.warn({ err }, 'initial controlling emit failed'));
setInterval(() => {
  emitControllingCron().catch((err) => log.warn({ err }, 'controlling emit failed'));
}, 15 * 60 * 1000);
