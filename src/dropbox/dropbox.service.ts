import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';

@Injectable()
export class DropboxService {
  private dropbox: Dropbox;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('DROPBOX-ACCESS-TOKEN');
    if (!accessToken) {
      throw new Error(
        'DROPBOX-ACCESS-TOKEN is not configured in environment variables',
      );
    }

    this.dropbox = new Dropbox({
      accessToken: accessToken,
      fetch: fetch,
    });
  }

  async getTempLink(path: string): Promise<string> {
    try {
      const response = await this.dropbox.filesGetTemporaryLink({ path });
      return response.result.link;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get temporary link: ${errorMessage}`);
    }
  }
}
