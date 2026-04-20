import type { SpeechIntent } from '@kk/shared';

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  mfaVerified: boolean;
}

export interface SttRequest {
  audio: Uint8Array | Buffer;
  mimeType: string;          // e.g. 'audio/wav', 'audio/webm'
  language?: string;         // BCP-47, default 'de'
  prompt?: string;           // hint, e.g. recent context
  model?: string;
}

export interface SttSegment {
  start: number;
  end: number;
  text: string;
}

export interface SttResult {
  text: string;
  language: string;
  durationMs: number;
  segments: SttSegment[];
  backend: string;
}

export interface TtsRequest {
  text: string;
  voice?: string;
  format?: 'wav' | 'mp3' | 'opus';
  watermark?: boolean;
  /** Only honored when the caller has voice_operator + MFA. */
  voiceProfileRef?: string | null;
}

export interface TtsResult {
  audio: Uint8Array;
  mime: string;
  voice: string;
  watermark: boolean;
  backend: string;
}

export interface VoiceCloneCreateInput {
  name: string;
  consentDocumentId: string;
  samples: Array<{ mime: string; data: Uint8Array }>;
  purpose: 'self_tts' | 'character_voice' | 'experiment';
}

export interface VoiceCloneProfile {
  id: string;
  state: 'draft' | 'pending_consent' | 'active' | 'suspended' | 'revoked';
  watermarking: boolean;
}

export interface CommandRouteResult {
  intent: SpeechIntent;
  params: Record<string, unknown>;
  confidence: number;
  rationale?: string;
}
