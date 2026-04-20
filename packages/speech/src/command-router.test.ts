import { describe, expect, it } from 'vitest';
import { LayeredCommandRouter, RegexCommandRouter, type LlmBackend } from './command-router.js';

const regex = new RegexCommandRouter();

describe('RegexCommandRouter', () => {
  it('recognises "zeig mir offene Aufträge"', async () => {
    const r = await regex.route({ text: 'zeig mir offene Aufträge' });
    expect(r.intent).toBe('open_board');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('extracts supplier for "letzte AB von Nobilia"', async () => {
    const r = await regex.route({ text: 'Finde die letzte AB von Nobilia' });
    expect(r.intent).toBe('find_email');
    expect((r.params as any).supplier).toMatch(/Nobilia/i);
  });

  it('extracts project code in "was fehlt bei Auftrag KK-2026-0142"', async () => {
    const r = await regex.route({ text: 'Was fehlt bei Auftrag KK-2026-0142?' });
    expect(r.intent).toBe('read_discrepancies');
    expect((r.params as any).projectCode).toBe('KK-2026-0142');
  });

  it('returns unknown for gibberish', async () => {
    const r = await regex.route({ text: 'blubb blubb.' });
    expect(r.intent).toBe('unknown');
    expect(r.confidence).toBeLessThan(0.5);
  });
});

describe('LayeredCommandRouter', () => {
  it('prefers LLM result when regex is unknown', async () => {
    const llm: LlmBackend = {
      classifyIntent: async () => ({
        intent: 'summarize_project',
        params: { projectCode: 'KK-2026-0900' },
        confidence: 0.9,
      }),
    };
    const layered = new LayeredCommandRouter(regex, llm, 0.6);
    const r = await layered.route({ text: 'gib mir alles zu meinem lieblingsauftrag' });
    expect(r.intent).toBe('summarize_project');
  });

  it('keeps regex result when confidence already meets threshold', async () => {
    const llm: LlmBackend = {
      classifyIntent: async () => ({ intent: 'unknown', params: {}, confidence: 0.99 }),
    };
    const layered = new LayeredCommandRouter(regex, llm, 0.6);
    const r = await layered.route({ text: 'zeig mir offene Aufträge' });
    expect(r.intent).toBe('open_board');
  });
});
