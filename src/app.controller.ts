import { Controller, Get } from '@nestjs/common';
import { DropboxService, DropboxFile } from './dropbox/dropbox.service';
import { OpenAiService } from './openAi/openAi.service';

@Controller()
export class AppController {
  constructor(
    private readonly dropboxService: DropboxService,
    private readonly openAiService: OpenAiService,
  ) {}

  @Get('dropboxLink')
  async GetLink(): Promise<{
    tempDir: string;
    files: DropboxFile[];
    filesProcessed: number;
    portalPost?: string;
  }> {
    // Step 1: Download images from Dropbox
    const dropboxResult = await this.dropboxService.getTempLink(
      '/PROPERTY SHOOTS/Burnet Ware/Edited/52 Thrale Road',
    );

    // Step 2: If files were downloaded, analyze them with OpenAI
    let portalPost: string | undefined;
    if (dropboxResult.filesProcessed > 0 && dropboxResult.tempDir) {
      try {
        // Get full paths of all downloaded files
        const fs = await import('fs');
        const path = await import('path');
        const files = await fs.promises.readdir(dropboxResult.tempDir);
        const imagePaths = files.map((file) =>
          path.join(dropboxResult.tempDir, file),
        );

        portalPost = await this.openAiService.analyzePropertyImages(imagePaths);
        console.log('OpenAI analysis completed successfully');
      } catch (error) {
        console.error('Failed to analyze images with OpenAI:', error);
        portalPost = 'Failed to analyze images';
      }
    }

    return {
      ...dropboxResult,
      portalPost,
    };
  }
}
