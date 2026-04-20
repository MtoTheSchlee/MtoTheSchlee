import type {
  TenantContext,
  TtsRequest,
  TtsResult,
  VoiceCloneCreateInput,
  VoiceCloneProfile,
} from './types.js';
import type { TextToSpeechService } from './tts.js';

/**
 * Policy-enforced facade around a TTS backend that supports voice cloning.
 *
 * The facade is intentionally strict: every path requires an explicit
 * consent document, MFA, and emits audit hooks that the caller persists.
 * No business logic in here leaks beyond the speech package.
 */
export interface VoiceCloneService {
  createProfile(
    ctx: TenantContext,
    input: VoiceCloneCreateInput,
  ): Promise<VoiceCloneProfile>;
  activateProfile(
    ctx: TenantContext,
    profileId: string,
    signedConsentRef: string,
  ): Promise<VoiceCloneProfile>;
  revokeProfile(ctx: TenantContext, profileId: string, reason: string): Promise<void>;
  synthesizeAs(
    ctx: TenantContext,
    profileId: string,
    req: TtsRequest,
  ): Promise<TtsResult>;
}

export interface VoiceCloneGuardsDeps {
  readonly featureEnabled: () => boolean;
  readonly requireMfa: (ctx: TenantContext) => void;
  readonly loadProfile: (
    ctx: TenantContext,
    profileId: string,
  ) => Promise<VoiceCloneProfile>;
  readonly audit: (event: VoiceCloneAuditEvent) => Promise<void>;
}

export interface VoiceCloneAuditEvent {
  tenantId: string;
  userId: string;
  action:
    | 'profile.create'
    | 'profile.activate'
    | 'profile.revoke'
    | 'tts.synthesize_as';
  profileId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Default implementation – strict guards, delegates actual synthesis to a
 * pluggable TTS backend. Persistence of profiles is handled by the caller
 * (API layer) so this package stays storage-agnostic.
 */
export class PolicyVoiceCloneService implements VoiceCloneService {
  constructor(
    private readonly tts: TextToSpeechService,
    private readonly deps: VoiceCloneGuardsDeps,
    private readonly store: {
      create: (input: VoiceCloneCreateInput & { tenantId: string; userId: string }) => Promise<VoiceCloneProfile>;
      setState: (id: string, state: VoiceCloneProfile['state']) => Promise<VoiceCloneProfile>;
    },
  ) {}

  async createProfile(ctx: TenantContext, input: VoiceCloneCreateInput) {
    this.ensureFeature();
    this.deps.requireMfa(ctx);
    const profile = await this.store.create({
      ...input,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    await this.deps.audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'profile.create',
      profileId: profile.id,
      meta: { purpose: input.purpose },
    });
    return profile;
  }

  async activateProfile(ctx: TenantContext, profileId: string, signedConsentRef: string) {
    this.ensureFeature();
    this.deps.requireMfa(ctx);
    if (!signedConsentRef) throw new Error('signed consent reference required');
    const profile = await this.store.setState(profileId, 'active');
    await this.deps.audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'profile.activate',
      profileId,
      meta: { signedConsentRef },
    });
    return profile;
  }

  async revokeProfile(ctx: TenantContext, profileId: string, reason: string) {
    this.ensureFeature();
    await this.store.setState(profileId, 'revoked');
    await this.deps.audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'profile.revoke',
      profileId,
      meta: { reason },
    });
  }

  async synthesizeAs(ctx: TenantContext, profileId: string, req: TtsRequest) {
    this.ensureFeature();
    this.deps.requireMfa(ctx);
    const profile = await this.deps.loadProfile(ctx, profileId);
    if (profile.state !== 'active') {
      throw new Error(`voice profile ${profileId} is not active (${profile.state})`);
    }
    const result = await this.tts.synthesize({
      ...req,
      voiceProfileRef: profileId,
      watermark: true, // never optional with a clone
    });
    await this.deps.audit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'tts.synthesize_as',
      profileId,
      meta: {
        textLength: req.text.length,
        backend: result.backend,
        watermark: result.watermark,
      },
    });
    return result;
  }

  private ensureFeature() {
    if (!this.deps.featureEnabled()) {
      throw new Error('FEATURE_VOICE_CLONE disabled');
    }
  }
}
