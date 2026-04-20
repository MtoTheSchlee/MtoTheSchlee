import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';
import { QueueService } from './queue.service.js';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, QueueService],
  exports: [AgentsService, QueueService],
})
export class AgentsModule {}
