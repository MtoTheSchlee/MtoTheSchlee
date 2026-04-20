import { AnthropicProvider, LlmGateway, NoopLlmProvider, OpenAiProvider, type LlmProvider } from '@kk/llm';

/**
 * Build the gateway from env once per worker. The primary provider is
 * picked by LLM_PROVIDER. Noop is always the last fallback so agents
 * degrade instead of failing.
 */
let singleton: LlmGateway | undefined;
export function getLlmGateway(): LlmGateway {
  if (singleton) return singleton;

  const provider = (process.env.LLM_PROVIDER ?? 'noop').toLowerCase();
  const apiKey = process.env.LLM_API_KEY ?? '';
  const noop = new NoopLlmProvider();

  let primary: LlmProvider = noop;
  if (provider === 'anthropic' && apiKey) {
    primary = new AnthropicProvider({ apiKey, model: process.env.LLM_MODEL_CLASSIFY });
  } else if (provider === 'openai' && apiKey) {
    primary = new OpenAiProvider({ apiKey, model: process.env.LLM_MODEL_CLASSIFY });
  }

  singleton = new LlmGateway({
    primary,
    fallbacks: [noop],
    offline: provider === 'noop' || !apiKey,
    redactPii: process.env.LLM_REDACT_PII !== 'false',
    dailyBudgetCents: Number(process.env.LLM_BUDGET_CENTS ?? 2000),
  });
  return singleton;
}
