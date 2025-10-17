import { Controller, Post, Body } from '@nestjs/common';
import { DropboxService } from './dropbox/dropbox.service';
import { OpenAiService } from './openAi/openAi.service';
import { CustomerTokensService } from './customerTokens/customerTokens.service';

class AddDraftReqDto {
  path: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly dropboxService: DropboxService,
    private readonly openAiService: OpenAiService,
    private readonly customerTokensService: CustomerTokensService,
  ) {}

  @Post('portal_draft')
  async GetPortalDraft(@Body() { path: requestPath }: AddDraftReqDto): Promise<{
    portalPost?: string;
  }> {
    // Step 1: Download images from Dropbox
    const dropboxResult = await this.dropboxService.downloadFiles(requestPath);

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

        // Upload the generated text file back to Dropbox
        try {
          await this.dropboxService.uploadFile('portal-draft.txt', requestPath);
          console.log('Text file uploaded to Dropbox successfully');
        } catch (uploadError) {
          console.error('Failed to upload text file to Dropbox:', uploadError);
        }
      } catch (error) {
        console.error('Failed to analyze images with OpenAI:', error);
        portalPost = 'Failed to analyze images';
      } finally {
        await this.dropboxService.cleanupTempFolder(dropboxResult.tempDir);
      }
    }
    console.log('Final portal post:', portalPost);
    await this.dropboxService.cleanupTempFolder(dropboxResult.tempDir);
    return {
      portalPost,
    };
  }
}
