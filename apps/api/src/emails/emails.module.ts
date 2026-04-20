import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller.js';
import { EmailsService } from './emails.service.js';
import { DocumentsModule } from '../documents/documents.module.js';

@Module({
  imports: [DocumentsModule],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
