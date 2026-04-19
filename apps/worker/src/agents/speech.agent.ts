import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * SpeechAgent (orchestrator for voice commands).
 * - Consumes speech.stt jobs with already-transcribed text and a sessionId.
 * - Calls the API /speech/commands endpoint which routes intent and
 *   triggers downstream agents. For MVP we just delegate; the logic is
 *   re-used by the web UI that can also call the endpoint directly.
 */
export function registerSpeechAgent(deps: AgentDeps): Worker {
  return new Worker(
    'speech.stt',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ sessionId: string; text: string }>;
      const result = await deps.api.post('/api/speech/commands', input);
      if (runId) await deps.api.markRun(runId, 'succeeded', { output: result });
      return result;
    },
    { connection: deps.connection, concurrency: 2 },
  );
}
