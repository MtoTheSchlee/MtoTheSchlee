import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * Orchestrator
 * - High-level planner that coordinates other agents.
 * - For MVP, it reacts to 'email.ingested' triggers and chains:
 *   mail.classify -> (optional) ab.extract, doc.classify, appointment.suggest.
 * - Real implementation: graph planner + dependency tracking. Current
 *   implementation is imperative and explicit; it is easy to read and
 *   extend while we learn the workflow.
 */
export function registerOrchestratorAgent(deps: AgentDeps): Worker {
  return new Worker(
    'orchestrator.plan',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ emailId: string }>;
      const email = (await deps.api.get(`/api/emails/${input.emailId}`)) as any;
      if (!email) return { skipped: 'missing email' };

      await deps.api.post('/api/agents/dispatch', {
        agentKey: 'mail',
        trigger: 'orchestrator',
        triggerRef: email.id,
        input: {
          emailId: email.id,
          subject: email.subject,
          bodyText: email.bodyText,
          fromAddr: email.fromAddr,
          hasAttachments: email.hasAttachments,
        },
      });
      await deps.api.post('/api/agents/dispatch', {
        agentKey: 'kundenakte',
        trigger: 'orchestrator',
        triggerRef: email.id,
        input: { emailId: email.id },
      });
      await deps.api.post('/api/agents/dispatch', {
        agentKey: 'termin',
        trigger: 'orchestrator',
        triggerRef: email.id,
        input: { emailId: email.id },
      });

      if (runId) await deps.api.markRun(runId, 'succeeded', { output: { dispatched: 3 } });
      return { dispatched: 3 };
    },
    { connection: deps.connection, concurrency: 2 },
  );
}
