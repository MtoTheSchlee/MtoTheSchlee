import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TenantId } from '../common/tenant.decorator.js';
import { SpeechService } from './speech.service.js';

@Controller('speech')
export class SpeechController {
  constructor(private readonly svc: SpeechService) {}

  @Get('health') health() { return this.svc.health(); }

  @Post('sessions')
  start(@TenantId() t: string, @Body() dto: { userId: string; mode?: any }) {
    return this.svc.startSession(t, dto.userId, dto.mode ?? 'push_to_talk');
  }

  /** Audio in the request body as raw bytes, mime in header. MVP style. */
  @Post('transcribe')
  async transcribe(
    @TenantId() t: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const mime = (req.headers['content-type'] as string) || 'audio/wav';
    const sessionId = (req.headers['x-session-id'] as string) || undefined;
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer | string) => chunks.push(Buffer.from(c)));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const audio = Buffer.concat(chunks);
    const result = await this.svc.transcribe(t, { sessionId, audio, mime });
    res.json(result);
  }

  @Post('commands')
  command(@TenantId() t: string, @Body() dto: { sessionId: string; text: string }) {
    return this.svc.routeCommand(t, dto);
  }

  @Post('synthesize')
  async synthesize(
    @TenantId() t: string,
    @Body() dto: { text: string; voice?: string; sessionId?: string; voiceProfileId?: string; watermark?: boolean; mfaVerified?: boolean },
    @Res() res: Response,
  ) {
    const out = await this.svc.synthesize(t, dto);
    res.setHeader('content-type', out.mime);
    res.setHeader('x-kkos-voice', out.voice);
    res.setHeader('x-kkos-watermark', out.watermark ? '1' : '0');
    res.send(Buffer.from(out.audio));
  }
}
