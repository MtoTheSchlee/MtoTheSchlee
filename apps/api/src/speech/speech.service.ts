import { Injectable, Logger } from '@nestjs/common';
import { buildSpeechServices, type SpeechServices } from '@kk/speech';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { AuditService } from '../common/audit.service.js';

@Injectable()
export class SpeechService {
  private readonly log = new Logger('SpeechService');
  private readonly services: SpeechServices;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
    private readonly audit: AuditService,
  ) {
    this.services = buildSpeechServices({
      stt: {
        backend: process.env.SPEECH_STT_BACKEND ?? 'faster-whisper',
        url: process.env.SPEECH_STT_URL ?? 'http://localhost:9010',
        model: process.env.SPEECH_STT_MODEL,
        language: process.env.SPEECH_STT_LANGUAGE ?? 'de',
      },
      tts: {
        backend: process.env.SPEECH_TTS_BACKEND ?? 'chatterbox',
        url: process.env.SPEECH_TTS_URL ?? 'http://localhost:9020',
        defaultVoice: process.env.SPEECH_TTS_VOICE_DEFAULT,
      },
    });
  }

  health() {
    return Promise.all([this.services.stt.health(), this.services.tts.health()]).then(
      ([stt, tts]) => ({ stt, tts, featureVoiceClone: process.env.FEATURE_VOICE_CLONE === 'true' }),
    );
  }

  async startSession(tenantId: string, userId: string, mode: 'push_to_talk' | 'continuous' | 'dictation' = 'push_to_talk') {
    if (process.env.FEATURE_VOICE !== 'true') {
      throw new Error('FEATURE_VOICE disabled');
    }
    return this.prisma.speechSession.create({
      data: { tenantId, userId, mode, locale: 'de-DE' },
    });
  }

  async transcribe(tenantId: string, input: { sessionId?: string; audio: Buffer; mime: string; language?: string }) {
    const job = await this.prisma.sttJob.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        audioStorageKey: '', // stored elsewhere; keep key optional for MVP
        mime: input.mime,
        state: 'running',
      },
    });
    try {
      const result = await this.services.stt.transcribe({
        audio: input.audio,
        mimeType: input.mime,
        language: input.language ?? 'de',
      });
      await this.prisma.sttJob.update({
        where: { id: job.id },
        data: {
          state: 'done',
          finalText: result.text,
          finalConfidence: 0.9,
          durationMs: result.durationMs,
          language: result.language,
        },
      });
      if (input.sessionId) {
        await this.prisma.transcript.create({
          data: {
            tenantId,
            sessionId: input.sessionId,
            sttJobId: job.id,
            text: result.text,
            segments: result.segments as any,
          },
        });
      }
      return { jobId: job.id, ...result };
    } catch (err) {
      await this.prisma.sttJob.update({ where: { id: job.id }, data: { state: 'failed', error: String(err) } });
      throw err;
    }
  }

  async routeCommand(tenantId: string, input: { sessionId: string; text: string }) {
    const route = await this.services.router.route({ text: input.text });
    const cmd = await this.prisma.speechCommand.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        intent: route.intent,
        params: route.params as any,
        confidence: route.confidence,
        state: 'routed',
      },
    });
    this.rt.publish({
      type: 'speech.command',
      tenantId,
      sessionId: input.sessionId,
      intent: route.intent,
      params: route.params,
      confidence: route.confidence,
    });
    await this.audit.record({
      tenantId,
      action: 'speech.command',
      entity: 'SpeechCommand',
      entityId: cmd.id,
      after: route,
    });
    return { commandId: cmd.id, route };
  }

  async synthesize(
    tenantId: string,
    input: { text: string; voice?: string; sessionId?: string; voiceProfileId?: string; watermark?: boolean; mfaVerified?: boolean },
  ) {
    // Guard: voice cloning requires feature flag + MFA; enforced here too,
    // defense in depth against callers skipping the facade.
    if (input.voiceProfileId) {
      if (process.env.FEATURE_VOICE_CLONE !== 'true') {
        throw new Error('FEATURE_VOICE_CLONE disabled');
      }
      if (!input.mfaVerified) {
        throw new Error('MFA required for voice-cloned synthesis');
      }
    }

    const job = await this.prisma.ttsJob.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        text: input.text,
        voiceProfileId: input.voiceProfileId,
        options: { voice: input.voice ?? null, watermark: Boolean(input.voiceProfileId || input.watermark) } as any,
        state: 'running',
      },
    });
    try {
      const result = await this.services.tts.synthesize({
        text: input.text,
        voice: input.voice,
        voiceProfileRef: input.voiceProfileId ?? null,
        watermark: Boolean(input.voiceProfileId || input.watermark),
      });
      await this.prisma.ttsJob.update({
        where: { id: job.id },
        data: { state: 'done', mime: result.mime, durationMs: result.audio.length },
      });
      return { jobId: job.id, ...result };
    } catch (err) {
      await this.prisma.ttsJob.update({ where: { id: job.id }, data: { state: 'failed', error: String(err) } });
      throw err;
    }
  }
}
