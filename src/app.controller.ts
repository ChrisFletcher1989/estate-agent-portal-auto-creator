import { Controller, Post, Body } from '@nestjs/common';

import { SqsService } from './sqs/sqs.service';

export class AddDraftReqDto {
  path: string;
}

@Controller()
export class AppController {
  constructor(private readonly sqsService: SqsService) {}

  @Post('portal_draft')
  async invokeSqs(@Body() addDraftReqDto: AddDraftReqDto) {
    await this.sqsService.addToQueue(addDraftReqDto);
    return { message: 'Request queued successfully' };
  }
}
