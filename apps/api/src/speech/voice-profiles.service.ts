import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit.service.js';

/**
 * Voice-profile administration per ADR-003.
 *
 * Guarantees:
 * - FEATURE_VOICE_CLONE must be on for any mutating operation.
 * - MFA (caller-provided flag from JWT) is required for create/activate/use.
 * - Every state change is audited.
 * - Revocation cascades (storage cleanup is scheduled via a follow-up job).
 */
@Injectable()
export class VoiceProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private ensureFeature() {
    if (process.env.FEATURE_VOICE_CLONE !== 'true') {
      throw new ForbiddenException('FEATURE_VOICE_CLONE disabled');
    }
  }
  private ensureMfa(mfa: boolean) {
    if (!mfa) throw new ForbiddenException('MFA required for voice clone operations');
  }

  list(tenantId: string) {
    return this.prisma.voiceProfile.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    tenantId: string,
    actor: { userId: string; mfa: boolean; ip?: string; userAgent?: string },
    input: {
      userId: string;
      name: string;
      purpose: 'self_tts' | 'character_voice' | 'experiment';
      consentDocumentId: string;
      samplesStorageKeys?: string[];
    },
  ) {
    this.ensureFeature();
    this.ensureMfa(actor.mfa);
    if (!input.consentDocumentId) {
      throw new ForbiddenException('consent document is mandatory');
    }
    const profile = await this.prisma.voiceProfile.create({
      data: {
        tenantId,
        userId: input.userId,
        name: input.name,
        purpose: input.purpose,
        consentDocumentId: input.consentDocumentId,
        samplesStorageKeys: input.samplesStorageKeys ?? [],
        state: 'pending_consent',
        watermarking: true,
        createdBy: actor.userId,
      },
    });
    await this.audit.record({
      tenantId,
      action: 'voice_profile.create',
      entity: 'VoiceProfile',
      entityId: profile.id,
      actorUserId: actor.userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      after: { purpose: profile.purpose, state: profile.state },
    });
    return profile;
  }

  async activate(
    tenantId: string,
    id: string,
    actor: { userId: string; mfa: boolean; ip?: string; userAgent?: string },
  ) {
    this.ensureFeature();
    this.ensureMfa(actor.mfa);
    const before = await this.prisma.voiceProfile.findFirst({ where: { id, tenantId } });
    if (!before) throw new NotFoundException();
    if (!before.consentDocumentId) throw new ForbiddenException('no consent document on file');
    const after = await this.prisma.voiceProfile.update({
      where: { id },
      data: { state: 'active', consentSignedAt: new Date() },
    });
    await this.audit.record({
      tenantId,
      action: 'voice_profile.activate',
      entity: 'VoiceProfile',
      entityId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      before,
      after,
    });
    return after;
  }

  async revoke(
    tenantId: string,
    id: string,
    reason: string,
    actor: { userId: string; ip?: string; userAgent?: string },
  ) {
    this.ensureFeature();
    const before = await this.prisma.voiceProfile.findFirst({ where: { id, tenantId } });
    if (!before) throw new NotFoundException();
    const after = await this.prisma.voiceProfile.update({
      where: { id },
      data: { state: 'revoked', revokedAt: new Date() },
    });
    await this.audit.record({
      tenantId,
      action: 'voice_profile.revoke',
      entity: 'VoiceProfile',
      entityId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      before,
      after: { ...after, reason },
    });
    return after;
  }

  async assertUsable(tenantId: string, id: string, mfa: boolean) {
    this.ensureFeature();
    this.ensureMfa(mfa);
    const profile = await this.prisma.voiceProfile.findFirst({ where: { id, tenantId } });
    if (!profile) throw new NotFoundException();
    if (profile.state !== 'active') throw new ForbiddenException(`profile not active (${profile.state})`);
    return profile;
  }
}
