import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * ControllingAgent
 * - Cron-driven (every 15 minutes).
 * - Pulls metrics snapshots from the API and logs them as run output.
 * - Future: write to metrics_daily and profitability_metrics.
 */
export function registerControllingAgent(deps: AgentDeps): Worker {
  return new Worker(
    'controlling.compute',
    async (job) => {
      const { runId } = (job.data ?? {}) as AgentJobInput<any>;
      const snapshot = await deps.api.get('/api/metrics/snapshot');
      const scorecards = await deps.api.get('/api/metrics/suppliers');
      const cycle = await deps.api.get('/api/metrics/cycle-time');
      const payload = { snapshot, scorecards, cycle, at: new Date().toISOString() };
      deps.log.info({ agent: 'controlling', snapshot }, 'snapshot');
      if (runId) {
        await deps.api.event(runId, 'progress', payload);
        await deps.api.markRun(runId, 'succeeded', { output: payload });
      }
      return payload;
    },
    { connection: deps.connection, concurrency: 1 },
  );
}
