import { request } from 'undici';
import type { TtsRequest, TtsResult } from './types.js';

export interface TextToSpeechService {
  readonly backend: string;
  synthesize(req: TtsRequest): Promise<TtsResult>;
  health(): Promise<{ ok: boolean; info: Record<string, unknown> }>;
}

export interface ChatterboxAdapterOptions {
  baseUrl: string;
  defaultVoice?: string;
  timeoutMs?: number;
}

export class ChatterboxTtsAdapter implements TextToSpeechService {
  readonly backend = 'chatterbox';
  constructor(private readonly opts: ChatterboxAdapterOptions) {}

  async health() {
    const res = await request(new URL('/healthz', this.opts.baseUrl));
    const info = (await res.body.json()) as Record<string, unknown>;
    return { ok: res.statusCode === 200, info };
  }

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const body = {
      text: req.text,
      voice: req.voice ?? this.opts.defaultVoice ?? 'de-female-warm',
      format: req.format ?? 'wav',
      watermark: Boolean(req.watermark || req.voiceProfileRef),
      voice_profile_ref: req.voiceProfileRef ?? null,
    };
    const res = await request(new URL('/v1/synthesize', this.opts.baseUrl), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      headersTimeout: this.opts.timeoutMs ?? 60_000,
      bodyTimeout: this.opts.timeoutMs ?? 60_000,
    });
    if (res.statusCode >= 400) {
      const errText = await res.body.text();
      throw new Error(`TTS backend error ${res.statusCode}: ${errText}`);
    }
    const buf = Buffer.from(await res.body.arrayBuffer());
    return {
      audio: new Uint8Array(buf),
      mime: res.headers['content-type']?.toString() ?? 'audio/wav',
      voice: String(res.headers['x-kkos-voice'] ?? body.voice),
      watermark: res.headers['x-kkos-watermark'] === '1',
      backend: this.backend,
    };
  }
}
