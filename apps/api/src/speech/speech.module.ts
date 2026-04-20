import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller.js';
import { SpeechService } from './speech.service.js';
import { VoiceProfilesController } from './voice-profiles.controller.js';
import { VoiceProfilesService } from './voice-profiles.service.js';

@Module({
  controllers: [SpeechController, VoiceProfilesController],
  providers: [SpeechService, VoiceProfilesService],
  exports: [SpeechService, VoiceProfilesService],
})
export class SpeechModule {}
