import { Controller, Get, Post, Body } from '@nestjs/common';
import { DropboxService } from './dropbox/dropbox.service';
import { OpenAiService } from './openAi/openAi.service';
import { CustomerTokensService } from './customerTokens/customerTokens.service';

class TokenReqDto {
  token: string;
}

class AddPropertyDto {
  path: string;
  token: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly dropboxService: DropboxService,
    private readonly openAiService: OpenAiService,
    private readonly customerTokensService: CustomerTokensService,
  ) {}

  @Get('portal_draft')
  async GetPortalDraft({ token }: TokenReqDto): Promise<{
    portalPost?: string;
  }> {
    // Step 1: Download images from Dropbox
    const dropboxResult = await this.dropboxService.getTempLink(token);

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
    console.log('Final portal post:', portalPost);
    return {
      portalPost,
    };
  }

  @Post('add-property')
  async addProperty(@Body() addPropertyDto: AddPropertyDto) {
    const property = await this.customerTokensService.createPropertyRecord(
      addPropertyDto.path,
      addPropertyDto.token,
    );
    return {
      success: true,
      property,
    };
  }
}
