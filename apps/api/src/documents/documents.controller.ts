import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get()
  list(
    @TenantId() t: string,
    @Query('projectId') projectId?: string,
    @Query('kind') kind?: string,
    @Query('toReview') toReview?: string,
  ) {
    return this.svc.list(t, {
      projectId,
      kind,
      toReview: toReview === 'true' ? true : toReview === 'false' ? false : undefined,
    });
  }

  /**
   * MVP upload API – body is base64 to keep this controller framework
   * agnostic. Worker uses the same endpoint when it attaches a parsed
   * AB PDF to the DMS.
   */
  @Post('upload-base64')
  upload(
    @TenantId() t: string,
    @Body()
    dto: {
      title: string;
      mime: string;
      base64: string;
      kind?: string;
      projectId?: string;
      customerId?: string;
      supplierId?: string;
      source?: 'upload' | 'email' | 'agent' | 'scan';
      toReview?: boolean;
      metadata?: any;
    },
  ) {
    return this.svc.upload(t, {
      ...dto,
      body: Buffer.from(dto.base64, 'base64'),
    });
  }

  @Get(':id/url')
  url(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.signedUrl(t, id);
  }
}
