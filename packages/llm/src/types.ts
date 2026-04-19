import { z } from 'zod';

export const ChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Tenant for budgets + audit. Required. */
  tenantId: string;
  /** Free-form tag for cost attribution: 'mail.classify', 'ab.extract', ... */
  purpose: string;
  /** Structured output schema – provider may use JSON mode / tool use. */
  jsonSchema?: Record<string, unknown>;
  /** Stable cache key for prompt caching; providers may ignore. */
  cacheKey?: string;
}

export interface ChatResult {
  text: string;
  json?: unknown;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  cached?: boolean;
  provider: string;
  redactedFields?: string[];
}

export interface LlmProvider {
  readonly name: string;
  chat(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult>;
}

export interface LlmGatewayConfig {
  primary: LlmProvider;
  fallbacks?: LlmProvider[];
  /** Disable any outbound calls, always use noop. Defense in depth. */
  offline?: boolean;
  /** If true, PII is redacted BEFORE being sent to any provider. */
  redactPii?: boolean;
  /** Daily budget per tenant in €-cent (cost guard). */
  dailyBudgetCents?: number;
  now?: () => Date;
}
