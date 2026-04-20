import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * SpeechAgent – handles voice-command routing jobs (speech.command).
 *
 * Input:  { sessionId, text } – text comes from the STT service or the
 *         typed Jarvis bar. No raw audio here; STT stays at the edge
 *         because binary transport belongs in the HTTP/WS layer, not in
 *         a durable queue.
 *
 * Output: POST /api/speech/commands classifies the intent and triggers
 *         downstream agents (summaries, discrepancies, social drafts).
 */
export function registerSpeechAgent(deps: AgentDeps): Worker {
  return new Worker(
    'speech.command',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ sessionId: string; text: string }>;
      const result = await deps.api.post('/api/speech/commands', input);
      if (runId) await deps.api.markRun(runId, 'succeeded', { output: result });
      return result;
    },
    { connection: deps.connection, concurrency: 2 },
  );
}
