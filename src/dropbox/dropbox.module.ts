import { Module } from '@nestjs/common';
import { DropboxService } from './dropbox.service';

@Module({
  imports: [],
  controllers: [],
  providers: [DropboxService],
  exports: [DropboxService],
})
export class DropboxModule {}
