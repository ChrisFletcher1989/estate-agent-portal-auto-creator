import { Module } from '@nestjs/common';
import { DropboxService } from './dropbox.service';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';

@Module({
  imports: [DynamoDBModule],
  controllers: [],
  providers: [DropboxService],
  exports: [DropboxService],
})
export class DropboxModule {}
