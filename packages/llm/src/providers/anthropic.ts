import { request } from 'undici';
import type { ChatMessage, ChatOptions, ChatResult, LlmProvider } from '../types.js';

export interface AnthropicOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Thin Anthropic Messages API client. Kept minimal on purpose: this is a
 * provider, not a SDK. Upstream SDK changes shouldn't ripple into agents.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  constructor(private readonly opts: AnthropicOptions) {}

  async chat(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
    const body = {
      model: opts.model ?? this.opts.model ?? 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.2,
      system: sys || undefined,
      messages: rest,
    };
    const res = await request(new URL('/v1/messages', this.opts.baseUrl ?? 'https://api.anthropic.com'), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.opts.apiKey,
        'anthropic-version': '2023-06-01',
      },
      headersTimeout: this.opts.timeoutMs ?? 30_000,
      bodyTimeout: this.opts.timeoutMs ?? 30_000,
    });
    if (res.statusCode >= 400) {
      throw new Error(`anthropic ${res.statusCode}: ${await res.body.text()}`);
    }
    const json = (await res.body.json()) as any;
    const text = (json.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    return {
      text,
      model: json.model,
      provider: this.name,
      promptTokens: json.usage?.input_tokens,
      completionTokens: json.usage?.output_tokens,
    };
  }
}
