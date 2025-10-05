import { Module } from '@nestjs/common';
import { DropboxService } from './dropbox.service';

@Module({
  imports: [],
  providers: [DropboxService],
})
export class DropboxModule {}
