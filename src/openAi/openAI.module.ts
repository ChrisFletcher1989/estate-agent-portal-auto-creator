import { Module } from '@nestjs/common';
import { OpenAiService } from './openAi.service';

@Module({
  imports: [],
  controllers: [],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
