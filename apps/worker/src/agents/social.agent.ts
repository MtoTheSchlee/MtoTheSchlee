import { Worker } from 'bullmq';
import type { AgentDeps, AgentJobInput } from './types.js';

/**
 * SocialAgent – ideation seed.
 * - Input: { projectId, channel }
 * - Output: draft captions the marketer can refine.
 * - Deterministic templates for MVP; LLM call plugs in behind the
 *   `generate()` hook later.
 */
export function registerSocialAgent(deps: AgentDeps): Worker {
  return new Worker(
    'social.ideate',
    async (job) => {
      const { input, runId } = job.data as AgentJobInput<{ projectId: string; channel?: string }>;
      const project = (await deps.api.get(`/api/projects/${input.projectId}`)) as any;
      if (!project) throw new Error('project not found');

      const channel = input.channel ?? 'instagram';
      const hooks = [
        `Frisch übergeben: ${project.title} – Küche #${project.code}.`,
        `Nach Plan, pünktlich fertig: ${project.title}.`,
        `Mehr Stauraum, klare Linien, warmes Licht: ${project.title}.`,
      ];
      const cta = 'DM für dein unverbindliches Beratungsgespräch.';
      const drafts = hooks.map((h) => ({
        tenantId: project.tenantId,
        projectId: project.id,
        channel,
        contentText: `${h}\n\n${cta}`,
        state: 'draft',
      }));

      const created: any[] = [];
      for (const d of drafts) created.push(await deps.api.post('/api/social', d));

      if (runId) {
        await deps.api.markRun(runId, 'succeeded', { output: { created: created.length } });
      }
      return { created: created.length };
    },
    { connection: deps.connection, concurrency: 2 },
  );
}
