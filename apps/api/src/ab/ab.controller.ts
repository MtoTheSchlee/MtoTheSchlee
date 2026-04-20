import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
// Ambient augmentation: @types/multer adds Multer.File; import the package
// so the types are loaded for this file.
import 'multer';
import { TenantId } from '../common/tenant.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { AbService } from './ab.service.js';
import { AbUploadService } from './ab-upload.service.js';
import { EmailsService } from '../emails/emails.service.js';

@Controller('ab')
export class AbController {
  constructor(
    private readonly svc: AbService,
    private readonly uploads: AbUploadService,
    private readonly emails: EmailsService,
  ) {}

  @Get()
  list(
    @TenantId() t: string,
    @Query('ampel') ampel?: 'green' | 'yellow' | 'red',
    @Query('status') status?: string,
  ) {
    return this.svc.list(t, { ampel, status });
  }

  /** Used by the worker to push already-parsed AB data. */
  @Roles('agent', 'purchaser', 'owner')
  @Post('ingest')
  ingest(@TenantId() t: string, @Body() body: any) {
    return this.svc.ingestParsed(t, body);
  }

  /**
   * Upload a PDF AB and run it through the parser + matcher. Returns
   * either a confirmation record (green path) or the parsed payload
   * plus `unresolved` hints so the UI can prompt for manual mapping.
   */
  @Roles('purchaser', 'owner', 'agent')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { projectId?: string; supplierId?: string; orderId?: string },
  ) {
    if (!file) throw new BadRequestException('file required');
    return this.uploads.handle(tenantId, {
      filename: file.originalname,
      mime: file.mimetype,
      body: file.buffer,
      projectId: body?.projectId,
      supplierId: body?.supplierId,
      orderId: body?.orderId,
    });
  }

  /**
   * Ingest all PDF attachments on an email through the AB pipeline.
   * Called by the worker's AB agent once the mail classifier says "ab".
   */
  @Roles('agent', 'purchaser', 'owner')
  @Post('from-email/:emailId')
  async fromEmail(@TenantId() tenantId: string, @Param('emailId') emailId: string) {
    return this.uploads.handleEmailAttachments(tenantId, emailId, {
      loadAttachment: async (attachmentId) => {
        const { attachment, buffer } = await this.emails.loadAttachment(
          tenantId,
          emailId,
          attachmentId,
        );
        return { filename: attachment.filename, mime: attachment.mime, body: buffer };
      },
    });
  }

  @Roles('purchaser', 'owner')
  @Post(':id/accept')
  accept(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.accept(t, id);
  }
}
