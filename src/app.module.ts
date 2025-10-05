import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from './token/token.module';
import { DropboxModule } from './dropbox/dropbox.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TokenModule,
    DropboxModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
