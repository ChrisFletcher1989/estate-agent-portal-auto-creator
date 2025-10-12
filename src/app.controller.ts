import { Controller, Get } from '@nestjs/common';
import { DropboxService } from './dropbox/dropbox.service';

@Controller()
export class AppController {
  constructor(private readonly dropboxService: DropboxService) {}

  @Get('dropboxLink')
  async GetLink() {
    return await this.dropboxService.getTempLink(
      '/PROPERTY SHOOTS/Burnet Ware/Edited/52 Thrale Road/Flat 7, 52, Thrale Road, London, SW16 1NY -colour.jpg',
    );
  }
}
//alt plan, get all files in folder, map through them creating download links and download them internally to a temp folder. Send each file within the folder to openai for analysis. Delete temp folder when done.
