import type { SpeechIntent } from '@kk/shared';
import type { CommandRouteResult } from './types.js';

/**
 * Voice command routing with a deterministic regex-first layer.
 *
 * The LLM layer is pluggable (see `LlmCommandRouter`). For MVP we rely on
 * deterministic patterns so the system is testable without external keys
 * and always has a safe fallback when the LLM gateway is down.
 */
export interface VoiceCommandRouter {
  route(input: { text: string; locale?: string }): Promise<CommandRouteResult>;
}

interface Rule {
  pattern: RegExp;
  intent: SpeechIntent;
  extract?: (m: RegExpMatchArray) => Record<string, unknown>;
}

const DE_RULES: Rule[] = [
  {
    pattern: /\b(zeig|öffne|show)\b.*\b(board|aufträg|aufgab)/i,
    intent: 'open_board',
    extract: (m) => ({ raw: m[0] }),
  },
  {
    pattern: /\b(letzt[eö]|finde|suche)\b.*\bAB\b.*\bvon\s+(?<supplier>[\w\s\-]+)/i,
    intent: 'find_email',
    extract: (m) => ({
      classification: 'ab',
      supplier: m.groups?.supplier?.trim(),
    }),
  },
  {
    pattern: /\b(leg(e)? an|erstelle)\b.*\bTermin\b.*\bfür\s+(?<who>[^\.]+)/i,
    intent: 'create_appointment',
    extract: (m) => ({ who: m.groups?.who?.trim() }),
  },
  {
    pattern: /\b(was fehlt|abweichungen|probleme)\b.*\bAuftrag\b.*\b(?<code>[A-Z]{1,3}-\d{4}-\d{3,4})/i,
    intent: 'read_discrepancies',
    extract: (m) => ({ projectCode: m.groups?.code }),
  },
  {
    pattern: /\b(social|post|beitrag).*\bProjekt\b\s+(?<code>[A-Z]{1,3}-\d{4}-\d{3,4})/i,
    intent: 'draft_social_post',
    extract: (m) => ({ projectCode: m.groups?.code }),
  },
  {
    pattern: /\b(zusammenfass|fasse zusammen|summary).*\bProjekt\b\s+(?<code>[A-Z]{1,3}-\d{4}-\d{3,4})/i,
    intent: 'summarize_project',
    extract: (m) => ({ projectCode: m.groups?.code }),
  },
  {
    pattern: /\b(lies|sag mir).*\b(kritisch|rot[e]?|dringend)\b.*\bAbweich/i,
    intent: 'read_discrepancies',
    extract: () => ({ severity: 'high' }),
  },
];

export class RegexCommandRouter implements VoiceCommandRouter {
  async route({ text }: { text: string; locale?: string }): Promise<CommandRouteResult> {
    const normalized = text.trim();
    for (const rule of DE_RULES) {
      const m = normalized.match(rule.pattern);
      if (m) {
        return {
          intent: rule.intent,
          params: rule.extract?.(m) ?? {},
          confidence: 0.82,
          rationale: `regex:${rule.intent}`,
        };
      }
    }
    return { intent: 'unknown', params: { text: normalized }, confidence: 0.25 };
  }
}

export interface LlmBackend {
  classifyIntent(input: {
    text: string;
    intents: SpeechIntent[];
  }): Promise<CommandRouteResult>;
}

/**
 * Layered router: regex first (fast, deterministic). If regex returns
 * 'unknown' or low confidence and an LLM backend is configured, delegate.
 */
export class LayeredCommandRouter implements VoiceCommandRouter {
  constructor(
    private readonly regex: VoiceCommandRouter,
    private readonly llm?: LlmBackend,
    private readonly llmThreshold = 0.6,
  ) {}

  async route(input: { text: string; locale?: string }) {
    const r = await this.regex.route(input);
    if (r.intent !== 'unknown' && r.confidence >= this.llmThreshold) return r;
    if (!this.llm) return r;
    const alt = await this.llm.classifyIntent({
      text: input.text,
      intents: [
        'open_board',
        'find_email',
        'create_appointment',
        'read_discrepancies',
        'draft_social_post',
        'summarize_project',
        'unknown',
      ],
    });
    return alt.confidence > r.confidence ? alt : r;
  }
}
