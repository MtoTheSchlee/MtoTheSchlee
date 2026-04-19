import { request } from 'undici';
import type { SttRequest, SttResult } from './types.js';

export interface SpeechToTextService {
  readonly backend: string;
  transcribe(req: SttRequest): Promise<SttResult>;
  health(): Promise<{ ok: boolean; info: Record<string, unknown> }>;
}

export interface FasterWhisperAdapterOptions {
  baseUrl: string;            // e.g. http://stt:9010
  timeoutMs?: number;         // default 120_000
  defaultModel?: string;
  defaultLanguage?: string;
}

export class FasterWhisperSttAdapter implements SpeechToTextService {
  readonly backend = 'faster-whisper';
  constructor(private readonly opts: FasterWhisperAdapterOptions) {}

  async health() {
    const res = await request(new URL('/healthz', this.opts.baseUrl));
    const body = (await res.body.json()) as Record<string, unknown>;
    return { ok: res.statusCode === 200, info: body };
  }

  async transcribe(req: SttRequest): Promise<SttResult> {
    const fd = new FormData();
    const blob = new Blob([req.audio], { type: req.mimeType });
    fd.set('file', blob, 'audio.bin');
    if (req.language ?? this.opts.defaultLanguage) {
      fd.set('language', req.language ?? this.opts.defaultLanguage!);
    }
    if (req.model ?? this.opts.defaultModel) {
      fd.set('model', req.model ?? this.opts.defaultModel!);
    }
    if (req.prompt) fd.set('prompt', req.prompt);

    const res = await request(new URL('/v1/transcribe', this.opts.baseUrl), {
      method: 'POST',
      body: fd,
      headersTimeout: this.opts.timeoutMs ?? 120_000,
      bodyTimeout: this.opts.timeoutMs ?? 120_000,
    });
    if (res.statusCode >= 400) {
      const errText = await res.body.text();
      throw new Error(`STT backend error ${res.statusCode}: ${errText}`);
    }
    const json = (await res.body.json()) as {
      text: string;
      language: string;
      duration_ms: number;
      segments: Array<{ start: number; end: number; text: string }>;
    };
    return {
      text: json.text,
      language: json.language,
      durationMs: json.duration_ms,
      segments: json.segments,
      backend: this.backend,
    };
  }
}
