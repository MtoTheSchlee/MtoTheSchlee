import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import 'multer';
import { TenantId } from '../common/tenant.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { EmailsService } from './emails.service.js';

@Controller('emails')
export class EmailsController {
  constructor(private readonly svc: EmailsService) {}

  @Get()
  list(
    @TenantId() t: string,
    @Query('classification') c?: string,
    @Query('status') s?: string,
    @Query('q') q?: string,
  ) {
    return this.svc.list(t, { classification: c, status: s, q });
  }

  @Get(':id') one(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.one(t, id);
  }

  @Roles('agent', 'owner')
  @Post('ingest') ingest(@TenantId() t: string, @Body() dto: any) {
    return this.svc.ingest(t, dto);
  }

  @Roles('agent', 'planner', 'owner')
  @Patch(':id/classify')
  classify(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body() dto: { classification: string; confidence: number },
  ) {
    return this.svc.classify(t, id, dto.classification, dto.confidence);
  }

  @Roles('agent', 'planner', 'purchaser', 'owner')
  @Patch(':id/assign')
  assign(@TenantId() t: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.assign(t, id, dto);
  }

  /**
   * Upload an attachment body to an existing email. Used by the IMAP
   * ingester once it has the raw MIME parts and needed by integration
   * tests / CLI smoke checks.
   */
  @Roles('agent', 'owner')
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async addAttachment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file required');
    return this.svc.putAttachmentBody(tenantId, id, file.originalname, file.mimetype, file.buffer);
  }

  /**
   * Stream an attachment body back as bytes. Used by the AB agent in the
   * worker to feed PDF ABs into the upload pipeline without shipping
   * object-store credentials into the worker.
   */
  @Roles('agent', 'purchaser', 'planner', 'owner')
  @Get(':id/attachments/:aid/download')
  async download(
    @TenantId() t: string,
    @Param('id') id: string,
    @Param('aid') aid: string,
    @Res() res: Response,
  ) {
    const { attachment, buffer } = await this.svc.loadAttachment(t, id, aid);
    res.setHeader('content-type', attachment.mime || 'application/octet-stream');
    res.setHeader(
      'content-disposition',
      `attachment; filename="${(attachment.filename ?? 'file').replace(/"/g, '')}"`,
    );
    res.send(buffer);
  }
}
