import { Module } from '@nestjs/common';
import { DropboxController } from './dropbox.controller';
import { DropboxService } from './dropbox.service';

@Module({
  imports: [],
  controllers: [DropboxController],
  providers: [DropboxService],
})
export class DropboxModule {}
