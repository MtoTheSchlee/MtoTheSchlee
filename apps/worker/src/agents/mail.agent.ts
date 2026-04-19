import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';
import { classifyEmail } from './mail.classifier.js';

/**
 * MailAgent
 * - Input: { emailId, subject, bodyText, fromAddr, attachments }
 * - Output: sets classification + confidence, triggers AB extract if relevant.
 *
 * Regex-first classifier; LLM stage is a TODO injected later (keep this
 * deterministic so tests stay fast and the system works without keys).
 */
export function registerMailAgent(deps: AgentDeps): Worker {
  return new Worker(
    'mail.classify',
    async (job) => {
      const { tenantId, input, runId } = job.data as AgentJobInput<{
        emailId: string;
        subject: string;
        bodyText?: string;
        fromAddr: string;
        hasAttachments?: boolean;
      }>;
      const logMeta = { agent: 'mail', runId, emailId: input.emailId };
      deps.log.info(logMeta, 'classify');

      const { classification, confidence, reasons } = classifyEmail({
        subject: input.subject,
        bodyText: input.bodyText ?? '',
        fromAddr: input.fromAddr,
        hasAttachments: input.hasAttachments,
      });

      await deps.api.patch(`/api/emails/${input.emailId}/classify`, { classification, confidence });

      if (classification === 'ab' && input.hasAttachments) {
        await deps.api.post('/api/agents/dispatch', {
          agentKey: 'ab',
          trigger: 'mail.classified',
          triggerRef: input.emailId,
          input: { emailId: input.emailId },
        });
      }

      if (runId) {
        await deps.api.event(runId, 'decision', { classification, confidence, reasons });
        await deps.api.markRun(runId, 'succeeded', { output: { classification, confidence } });
      }
      return { classification, confidence };
    },
    { connection: deps.connection, concurrency: 4 },
  );
}
