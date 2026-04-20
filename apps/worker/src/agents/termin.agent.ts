import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

const DATE_DE = /\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\b/;
const TIME = /\b(\d{1,2}):(\d{2})\b/;
const APPT_HINT =
  /\b(Liefertermin|Anlieferung|Aufma(ß|ss)|Montage|Einbau|Beratung|Termin)\b/i;

/**
 * TerminAgent
 * - Looks for date+time hints in email body, creates AppointmentSuggestion.
 * - Never writes to the real calendar; only proposals.
 */
export function registerTerminAgent(deps: AgentDeps): Worker {
  return new Worker(
    'appointment.suggest',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ emailId: string }>;
      const email = (await deps.api.get(`/api/emails/${input.emailId}`)) as any;
      if (!email?.bodyText) return { skipped: 'no body' };
      if (!APPT_HINT.test(email.bodyText)) return { skipped: 'no appointment hint' };

      const d = email.bodyText.match(DATE_DE);
      const t = email.bodyText.match(TIME);
      if (!d) return { skipped: 'no date' };

      const year = d[3]!.length === 2 ? 2000 + parseInt(d[3]!, 10) : parseInt(d[3]!, 10);
      const start = new Date(Date.UTC(year, parseInt(d[2]!, 10) - 1, parseInt(d[1]!, 10), t ? parseInt(t[1]!, 10) : 9, t ? parseInt(t[2]!, 10) : 0));
      const end = new Date(+start + 90 * 60 * 1000);

      const kind = /Liefer|Anlieferung/i.test(email.bodyText)
        ? 'delivery'
        : /Montage|Einbau/i.test(email.bodyText)
        ? 'installation'
        : /Aufma/i.test(email.bodyText)
        ? 'measurement'
        : 'consultation';

      const proposal = await deps.api.post('/api/appointments/suggestions', {
        sourceEmailId: email.id,
        proposed: {
          projectId: email.projectId,
          customerId: email.customerId,
          kind,
          title: `${kind} (Vorschlag)`,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        },
        score: 0.7,
      });

      if (runId) {
        await deps.api.event(runId, 'tool_result', { proposal });
        await deps.api.markRun(runId, 'succeeded', { output: proposal });
      }
      return proposal;
    },
    { connection: deps.connection, concurrency: 4 },
  );
}
