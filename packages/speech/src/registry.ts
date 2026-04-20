import { FasterWhisperSttAdapter, type SpeechToTextService } from './stt.js';
import { ChatterboxTtsAdapter, type TextToSpeechService } from './tts.js';
import { LayeredCommandRouter, RegexCommandRouter, type LlmBackend, type VoiceCommandRouter } from './command-router.js';

export interface SpeechConfig {
  stt: { backend: string; url: string; model?: string; language?: string };
  tts: { backend: string; url: string; defaultVoice?: string };
  llmRouter?: LlmBackend;
}

export interface SpeechServices {
  stt: SpeechToTextService;
  tts: TextToSpeechService;
  router: VoiceCommandRouter;
}

/**
 * Pick adapters by backend key. Unknown values fall back to the
 * HTTP-contract defaults so ops can swap containers without a redeploy.
 */
export function buildSpeechServices(cfg: SpeechConfig): SpeechServices {
  const stt: SpeechToTextService =
    cfg.stt.backend === 'faster-whisper' || cfg.stt.backend === 'http'
      ? new FasterWhisperSttAdapter({
          baseUrl: cfg.stt.url,
          defaultModel: cfg.stt.model,
          defaultLanguage: cfg.stt.language,
        })
      : new FasterWhisperSttAdapter({ baseUrl: cfg.stt.url });

  const tts: TextToSpeechService =
    cfg.tts.backend === 'chatterbox' || cfg.tts.backend === 'http' || cfg.tts.backend === 'qwen3'
      ? new ChatterboxTtsAdapter({
          baseUrl: cfg.tts.url,
          defaultVoice: cfg.tts.defaultVoice,
        })
      : new ChatterboxTtsAdapter({ baseUrl: cfg.tts.url });

  const router = new LayeredCommandRouter(new RegexCommandRouter(), cfg.llmRouter);
  return { stt, tts, router };
}
