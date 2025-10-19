import { DropboxService } from 'src/dropbox/dropbox.service';
import { OpenAiService } from 'src/openAi/openAi.service';
import { DynamoDBService } from 'src/dynamodb/dynamodb.service';
import { ConfigService } from '@nestjs/config';
const configService = new ConfigService();
const dynamoDBService = new DynamoDBService(configService);

export const handler = async (event: any): Promise<void> => {
  const dropboxService = new DropboxService(configService, dynamoDBService);
  const openAiService = new OpenAiService(configService);

  for (const record of event.Records) {
    const { path: requestPath } = JSON.parse(record.body);
    // Step 1: Download images from Dropbox
    const dropboxResult = await dropboxService.downloadFiles(requestPath);

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

        portalPost = await openAiService.analyzePropertyImages(imagePaths);
        console.log('OpenAI analysis completed successfully');

        // Upload the generated text file back to Dropbox
        try {
          await dropboxService.uploadFile('portal-draft.txt', requestPath);
          console.log('Text file uploaded to Dropbox successfully');
        } catch (uploadError) {
          console.error('Failed to upload text file to Dropbox:', uploadError);
        }
      } catch (error) {
        console.error('Failed to analyze images with OpenAI:', error);
        portalPost = 'Failed to analyze images';
      } finally {
        await dropboxService.cleanupTempFolder(dropboxResult.tempDir);
      }
    }
    console.log('Final portal post:', portalPost);
    await dropboxService.cleanupTempFolder(dropboxResult.tempDir);
  }
};
