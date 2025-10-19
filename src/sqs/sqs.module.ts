import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SqsService],
  exports: [SqsService],
})
export class SqsModule {}
