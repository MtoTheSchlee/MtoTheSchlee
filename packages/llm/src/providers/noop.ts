import type { ChatMessage, ChatOptions, ChatResult, LlmProvider } from '../types.js';

/**
 * Provider-of-last-resort. Always returns a deterministic empty result so
 * callers can degrade gracefully when keys are missing, the network is
 * down, or the budget is exceeded.
 */
export class NoopLlmProvider implements LlmProvider {
  readonly name = 'noop';
  async chat(_m: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
    return {
      text: '',
      json: null,
      model: opts.model ?? 'noop',
      provider: this.name,
      promptTokens: 0,
      completionTokens: 0,
      cached: false,
    };
  }
}
