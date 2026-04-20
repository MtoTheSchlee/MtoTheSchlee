import { Module } from '@nestjs/common';
import { AbController } from './ab.controller.js';
import { AbService } from './ab.service.js';
import { AbMatcher } from './ab.matcher.js';
import { PdfExtractorService } from './pdf-extractor.service.js';
import { AbUploadService } from './ab-upload.service.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { EmailsModule } from '../emails/emails.module.js';

@Module({
  imports: [DocumentsModule, EmailsModule],
  controllers: [AbController],
  providers: [AbService, AbMatcher, PdfExtractorService, AbUploadService],
  exports: [AbService, AbMatcher, PdfExtractorService, AbUploadService],
})
export class AbModule {}
