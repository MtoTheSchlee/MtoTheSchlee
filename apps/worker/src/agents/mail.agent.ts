import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';
import { classifyEmail } from './mail.classifier.js';
import { classifyWithLlm } from './mail.classifier.llm.js';
import { getLlmGateway } from '../llm-factory.js';

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

      const base = classifyEmail({
        subject: input.subject,
        bodyText: input.bodyText ?? '',
        fromAddr: input.fromAddr,
        hasAttachments: input.hasAttachments,
      });
      let classification = base.classification;
      let confidence = base.confidence;
      const reasons: string[] = [...base.reasons];

      // Second pass: LLM with PII redaction for ambiguous cases.
      if (base.confidence < 0.7 || base.classification === 'unknown') {
        try {
          const llm = await classifyWithLlm(getLlmGateway(), {
            tenantId,
            subject: input.subject,
            bodyText: input.bodyText ?? '',
            fromAddr: input.fromAddr,
          });
          if (llm && llm.confidence > confidence) {
            classification = llm.classification;
            confidence = llm.confidence;
            reasons.push(`llm:${llm.rationale}`);
          }
        } catch (err) {
          deps.log.warn({ err: String(err) }, 'llm classify failed – using regex result');
        }
      }

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
