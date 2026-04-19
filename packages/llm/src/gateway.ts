import type { ChatMessage, ChatOptions, ChatResult, LlmGatewayConfig, LlmProvider } from './types.js';
import { redactPii } from './redactor.js';
import { NoopLlmProvider } from './providers/noop.js';

/**
 * LlmGateway encapsulates provider selection, PII redaction, budget guard,
 * caching and audit hooks. Agents never talk to providers directly.
 */
export class LlmGateway {
  private readonly noop = new NoopLlmProvider();
  private readonly spent = new Map<string, { date: string; cents: number }>();

  constructor(private readonly cfg: LlmGatewayConfig) {}

  async chat(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    if (this.cfg.offline) return this.noop.chat(messages, opts);

    if (this.exceededBudget(opts.tenantId)) {
      return this.noop.chat(messages, { ...opts, purpose: `${opts.purpose}:budget-exceeded` });
    }

    let redactedFields: string[] | undefined;
    let outbound = messages;
    if (this.cfg.redactPii) {
      redactedFields = [];
      outbound = messages.map((m) => {
        const r = redactPii(m.content);
        if (r.fields.length) redactedFields!.push(...r.fields);
        return { role: m.role, content: r.text };
      });
    }

    const providers: LlmProvider[] = [this.cfg.primary, ...(this.cfg.fallbacks ?? [])];
    let lastErr: unknown;
    for (const p of providers) {
      try {
        const res = await p.chat(outbound, opts);
        this.accrue(opts.tenantId, estimateCents(res));
        return { ...res, redactedFields: redactedFields ?? [] };
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(`LLM providers failed: ${String(lastErr)}`);
  }

  private exceededBudget(tenantId: string): boolean {
    if (!this.cfg.dailyBudgetCents) return false;
    const today = (this.cfg.now?.() ?? new Date()).toISOString().slice(0, 10);
    const rec = this.spent.get(tenantId);
    if (!rec || rec.date !== today) return false;
    return rec.cents >= this.cfg.dailyBudgetCents;
  }

  private accrue(tenantId: string, cents: number) {
    const today = (this.cfg.now?.() ?? new Date()).toISOString().slice(0, 10);
    const rec = this.spent.get(tenantId);
    if (!rec || rec.date !== today) {
      this.spent.set(tenantId, { date: today, cents });
    } else {
      rec.cents += cents;
    }
  }
}

function estimateCents(res: ChatResult): number {
  // Rough heuristic until providers report real cost.
  const t = (res.promptTokens ?? 0) + (res.completionTokens ?? 0);
  return Math.max(1, Math.round(t / 1000));
}
