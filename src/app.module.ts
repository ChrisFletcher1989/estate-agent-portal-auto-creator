import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from './token/token.module';
import { DropboxModule } from './dropbox/dropbox.module';
import { AppController } from './app.controller';
import { OpenAiModule } from './openAi/openAI.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';
import { CustomerTokensModule } from './customerTokens/customerTokens.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TokenModule,
    DropboxModule,
    OpenAiModule,
    DynamoDBModule,
    CustomerTokensModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
