import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DynamoDBService } from '../dynamodb/dynamodb.service';

@Injectable()
export class DropboxService {
  private dropbox: Dropbox | null = null;
  private currentAccessToken: string | null = null;

  constructor(
    private configService: ConfigService,
    private dynamoDBService: DynamoDBService,
  ) {}

  async downloadFiles(path: string): Promise<{
    tempDir: string;
    files: DropboxFile[];
    filesProcessed: number;
  }> {
    try {
      await this.refreshDropboxClient();

      // Step 1: List all files in the folder
      const files = await this.listFilesInFolder(`${path}/Download Folder`);

      if (files.length === 0) {
        throw new Error('No files found in the specified Dropbox folder');
      }

      // Step 2: Download all files to temp folder
      const tempDir = await this.downloadFilesToTempFolder(files);

      return {
        tempDir,
        files,
        filesProcessed: files.length,
      };
    } catch (error) {
      console.error('Dropbox API error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process folder: ${errorMessage}`);
    }
  }

  async listFilesInFolder(folderPath: string): Promise<DropboxFile[]> {
    try {
      const response = await this.dropbox!.filesListFolder({
        path: folderPath,
      });

      // Filter to only include files (not folders)
      const files = response.result.entries.filter(
        (entry) => entry['.tag'] === 'file',
      );
      console.log(`Found ${files.length} files in folder`);

      return files;
    } catch (error) {
      console.error('Dropbox API error while listing files:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to list files in folder: ${errorMessage}`);
    }
  }

  async downloadFilesToTempFolder(files: DropboxFile[]): Promise<string> {
    try {
      // Create a unique temporary directory
      const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'dropbox-files-'),
      );

      // Download each file
      for (const file of files) {
        try {
          if (!file.path_lower) {
            console.warn(`Skipping file ${file.name} - no path available`);
            continue;
          }

          const response = await this.dropbox!.filesDownload({
            path: file.path_lower,
          });

          // Write file to temp directory
          const filePath = path.join(tempDir, file.name);
          const fileData = (
            response.result as unknown as DropboxFileDownloadResult
          ).fileBinary;
          await fs.writeFile(filePath, fileData);
        } catch (fileError) {
          await this.cleanupTempFolder(tempDir);
          console.error(`Failed to download file ${file.name}:`, fileError);
        }
      }

      return tempDir;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(
        `Failed to download files to temp folder: ${errorMessage}`,
      );
    }
  }

  async uploadFile(fileName: string, folderPath: string): Promise<void> {
    try {
      await this.refreshDropboxClient();

      // Read the file from Lambda's /tmp directory
      const tempFilePath = path.join('/tmp', fileName);
      const fileContent = await fs.readFile(tempFilePath, 'utf8');

      // Create the destination path in Dropbox
      const dropboxPath = `${folderPath}/Download Folder/${fileName}`;

      // Upload the file to Dropbox
      await this.dropbox!.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: {
          '.tag': 'overwrite',
        },
        autorename: false,
      });

      console.log(`File uploaded successfully to: ${dropboxPath}`);
    } catch (error) {
      console.error('Failed to upload file to Dropbox:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }

  async cleanupTempFolder(tempDir: string): Promise<void> {
    try {
      console.log(`Cleaning up temporary directory: ${tempDir}`);
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('Temporary directory cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup temporary directory:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to cleanup temp folder: ${errorMessage}`);
    }
  }

  private async getAccessTokenFromRefresh(): Promise<string> {
    const refreshToken = this.configService.get<string>(
      'DROPBOX_REFRESH_TOKEN',
    );
    const clientId = this.configService.get<string>('DROPBOX_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'DROPBOX_CLIENT_SECRET',
    );

    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error(
        'Missing required environment variables: DROPBOX_REFRESH_TOKEN, DROPBOX_CLIENT_ID, DROPBOX_CLIENT_SECRET',
      );
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    console.log('Access token refreshed successfully');
    return data.access_token;
  }

  private async refreshDropboxClient(): Promise<void> {
    this.currentAccessToken = await this.getAccessTokenFromRefresh();
    this.dropbox = new Dropbox({
      accessToken: this.currentAccessToken,
    });
  }
}

export interface DropboxFile {
  name: string;
  path_lower?: string;
  '.tag': string;
}

export interface DropboxSharingInfo {
  read_only: boolean;
  parent_shared_folder_id: string;
  modified_by: string;
}

export interface DropboxFileDownloadResult {
  fileBinary: Buffer;
}
