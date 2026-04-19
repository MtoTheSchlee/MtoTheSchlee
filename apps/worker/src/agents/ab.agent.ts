import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';
import { parseAbBasic } from './ab.parser.js';

/**
 * ABAgent
 * - Consumes ab.extract jobs.
 * - For MVP it uses a regex-based text parser on the email body. PDF
 *   parsing is a follow-up (tika/pdfplumber sidecar) – the adapter point
 *   is `parseAbBasic` so it can be swapped without touching the agent.
 * - Output: POST /api/ab/ingest – API runs the matcher + creates
 *   discrepancies, returns a Board-Card-ready payload.
 */
export function registerAbAgent(deps: AgentDeps): Worker {
  return new Worker(
    'ab.extract',
    async (job) => {
      const { tenantId, input, runId } = job.data as AgentJobInput<{ emailId: string }>;
      deps.log.info({ agent: 'ab', emailId: input.emailId }, 'extract start');

      // 1) Load email
      const email = (await deps.api.get(`/api/emails/${input.emailId}`)) as any;
      if (!email) throw new Error(`email ${input.emailId} not found`);

      // 2) Resolve supplier / project from linked fields or body heuristics.
      //    (Real heuristics live in kundenakte.agent; here we assume email
      //    already has supplierId + projectId if auto-assign worked.)
      const supplierId = email.supplierId ?? (await resolveFallbackSupplier(deps, email));
      const projectId = email.projectId ?? (await resolveFallbackProject(deps, email));
      if (!supplierId || !projectId) {
        if (runId) await deps.api.event(runId, 'decision', { skipped: 'missing supplier or project' });
        if (runId) await deps.api.markRun(runId, 'succeeded', { output: { skipped: true } });
        return { skipped: true };
      }

      // 3) Find candidate order by order number in text, else latest open.
      const orderId = await pickCandidateOrder(deps, { projectId, supplierId, text: email.bodyText ?? '' });

      // 4) Parse AB positions.
      const parsed = parseAbBasic({
        subject: email.subject ?? '',
        body: email.bodyText ?? '',
      });

      // 5) Push to API for matching + persistence.
      const result = await deps.api.post('/api/ab/ingest', {
        projectId,
        supplierId,
        orderId,
        emailId: email.id,
        abNumber: parsed.abNumber,
        items: parsed.items,
        confirmedAt: parsed.confirmedAt,
      });

      if (runId) {
        await deps.api.event(runId, 'tool_result', { result });
        await deps.api.markRun(runId, 'succeeded', { output: result });
      }
      return result;
    },
    { connection: deps.connection, concurrency: 2 },
  );
}

async function resolveFallbackSupplier(deps: AgentDeps, email: any): Promise<string | null> {
  const suppliers = (await deps.api.get('/api/suppliers')) as Array<{ id: string; name: string }>;
  const hay = `${email.fromAddr} ${email.subject} ${email.bodyText ?? ''}`.toLowerCase();
  for (const s of suppliers) if (hay.includes(s.name.toLowerCase())) return s.id;
  return null;
}

async function resolveFallbackProject(deps: AgentDeps, email: any): Promise<string | null> {
  const m = String(email.subject ?? '').match(/(KK-\d{4}-\d{3,4})/i);
  if (!m) return null;
  const projects = (await deps.api.get('/api/projects')) as Array<{ id: string; code: string }>;
  return projects.find((p) => p.code === m[1])?.id ?? null;
}

async function pickCandidateOrder(
  deps: AgentDeps,
  input: { projectId: string; supplierId: string; text: string },
): Promise<string | null> {
  const orders = (await deps.api.get(`/api/orders?projectId=${input.projectId}`)) as Array<any>;
  const candidates = orders.filter((o) => o.supplierId === input.supplierId);
  if (!candidates.length) return null;
  const m = input.text.match(/(KK-ORD-\d{3,6}|Auftrag(?:snummer)?[:\s]+(\S+))/i);
  if (m) {
    const needle = (m[1] ?? m[2] ?? '').toUpperCase();
    const byNum = candidates.find((o) => String(o.orderNumber).toUpperCase() === needle);
    if (byNum) return byNum.id;
  }
  return candidates[0]?.id ?? null;
}
