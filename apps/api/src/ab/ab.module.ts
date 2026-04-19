import { Module } from '@nestjs/common';
import { AbController } from './ab.controller.js';
import { AbService } from './ab.service.js';
import { AbMatcher } from './ab.matcher.js';

@Module({
  controllers: [AbController],
  providers: [AbService, AbMatcher],
  exports: [AbService, AbMatcher],
})
export class AbModule {}
