import { Module } from '@nestjs/common';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { CustomerTokensService } from './customerTokens.service';

@Module({
  imports: [DynamoDBModule],
  controllers: [],
  providers: [CustomerTokensService],
  exports: [CustomerTokensService],
})
export class CustomerTokensModule {}
