import { Controller, Get } from '@nestjs/common';
import { DropboxService, DropboxFile } from './dropbox/dropbox.service';

@Controller()
export class AppController {
  constructor(private readonly dropboxService: DropboxService) {}

  @Get('dropboxLink')
  async GetLink(): Promise<{
    tempDir: string;
    files: DropboxFile[];
    filesProcessed: number;
  }> {
    return await this.dropboxService.getTempLink(
      '/PROPERTY SHOOTS/Burnet Ware/Edited/52 Thrale Road',
    );
  }
}
//alt plan, get all files in folder, map through them creating download links and download them internally to a temp folder. Send each file within the folder to openai for analysis. Delete temp folder when done.
