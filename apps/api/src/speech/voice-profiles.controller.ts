import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TenantId } from '../common/tenant.decorator.js';
import { VoiceProfilesService } from './voice-profiles.service.js';

class CreateProfileDto {
  @IsString() userId!: string;
  @IsString() name!: string;
  @IsIn(['self_tts', 'character_voice', 'experiment']) purpose!: 'self_tts' | 'character_voice' | 'experiment';
  @IsString() consentDocumentId!: string;
  @IsOptional() samplesStorageKeys?: string[];
}

class RevokeDto {
  @IsString() reason!: string;
}

function mfaFromRequest(req: Request): boolean {
  // Defense in depth: accept an explicit header in MVP, JWT claim in prod.
  const h = (req.headers['x-mfa-verified'] as string | undefined) ?? '';
  return h === '1' || h === 'true';
}

function actorFromRequest(req: Request) {
  const anyReq = req as Request & { user?: { sub?: string; mfa?: boolean } };
  const userId = (anyReq.user?.sub as string | undefined) ?? (req.headers['x-user-id'] as string | undefined) ?? 'local-dev';
  const mfa = anyReq.user?.mfa ?? mfaFromRequest(req);
  return { userId, mfa, ip: req.ip ?? undefined, userAgent: (req.headers['user-agent'] as string | undefined) ?? undefined };
}

@Controller('speech/voice-profiles')
export class VoiceProfilesController {
  constructor(private readonly svc: VoiceProfilesService) {}

  @Get()
  list(@TenantId() t: string) {
    return this.svc.list(t);
  }

  @Post()
  create(@TenantId() t: string, @Req() req: Request, @Body() dto: CreateProfileDto) {
    return this.svc.create(t, actorFromRequest(req), dto);
  }

  @Post(':id/activate')
  activate(@TenantId() t: string, @Req() req: Request, @Param('id') id: string) {
    return this.svc.activate(t, id, actorFromRequest(req));
  }

  @Post(':id/revoke')
  revoke(@TenantId() t: string, @Req() req: Request, @Param('id') id: string, @Body() dto: RevokeDto) {
    return this.svc.revoke(t, id, dto.reason, actorFromRequest(req));
  }
}
