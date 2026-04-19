import { request } from 'undici';
import type { ChatMessage, ChatOptions, ChatResult, LlmProvider } from '../types.js';

export interface OpenAiOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  constructor(private readonly opts: OpenAiOptions) {}

  async chat(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    const body = {
      model: opts.model ?? this.opts.model ?? 'gpt-4o-mini',
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(opts.jsonSchema
        ? { response_format: { type: 'json_schema', json_schema: { name: opts.purpose, schema: opts.jsonSchema } } }
        : {}),
    };
    const res = await request(new URL('/v1/chat/completions', this.opts.baseUrl ?? 'https://api.openai.com'), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      headersTimeout: this.opts.timeoutMs ?? 30_000,
      bodyTimeout: this.opts.timeoutMs ?? 30_000,
    });
    if (res.statusCode >= 400) {
      throw new Error(`openai ${res.statusCode}: ${await res.body.text()}`);
    }
    const json = (await res.body.json()) as any;
    const text = json.choices?.[0]?.message?.content ?? '';
    let parsed: unknown;
    if (opts.jsonSchema) {
      try {
        parsed = JSON.parse(text);
      } catch {
        /* ignore, leave as text */
      }
    }
    return {
      text,
      json: parsed,
      model: json.model,
      provider: this.name,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
    };
  }
}
