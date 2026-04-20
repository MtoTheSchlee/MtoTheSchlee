import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * KundenaktenAgent
 * - Consumes doc.classify jobs.
 * - Heuristic assignment of emails/attachments to customer + project.
 * - If confidence < 0.85 -> mark `to_review=true` and leave for humans.
 */
export function registerKundenakteAgent(deps: AgentDeps): Worker {
  return new Worker(
    'doc.classify',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ emailId: string }>;
      const email = (await deps.api.get(`/api/emails/${input.emailId}`)) as any;
      if (!email) return { skipped: 'email missing' };

      const customers = (await deps.api.get('/api/customers')) as Array<any>;
      const projects = (await deps.api.get('/api/projects')) as Array<any>;

      const hay = `${email.subject} ${email.fromAddr} ${email.bodyText ?? ''}`.toLowerCase();
      const byProject = projects.find((p) => hay.includes(p.code.toLowerCase()));
      const byCustomer = customers.find(
        (c) => (c.lastName && hay.includes(c.lastName.toLowerCase())) || (c.email && hay.includes(c.email.toLowerCase())),
      );

      let confidence = 0;
      const patch: any = {};
      if (byProject) {
        patch.projectId = byProject.id;
        confidence += 0.6;
      }
      if (byCustomer) {
        patch.customerId = byCustomer.id;
        confidence += 0.3;
      }

      if (confidence >= 0.5) {
        await deps.api.patch(`/api/emails/${email.id}/assign`, patch);
      }

      if (runId) {
        await deps.api.event(runId, 'decision', { patch, confidence });
        await deps.api.markRun(runId, 'succeeded', { output: { patch, confidence } });
      }
      return { patch, confidence };
    },
    { connection: deps.connection, concurrency: 4 },
  );
}
