import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class DropboxService {
  private dropbox: Dropbox | null = null;
  private currentAccessToken: string | null = null;

  constructor(private configService: ConfigService) {}

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

  private async ensureValidDropboxClient(): Promise<void> {
    if (!this.dropbox || !this.currentAccessToken) {
      this.currentAccessToken = await this.getAccessTokenFromRefresh();
      this.dropbox = new Dropbox({
        accessToken: this.currentAccessToken,
      });
      console.log('Dropbox client initialized with fresh token');
    }
  }

  private async refreshDropboxClient(): Promise<void> {
    this.currentAccessToken = await this.getAccessTokenFromRefresh();
    this.dropbox = new Dropbox({
      accessToken: this.currentAccessToken,
    });
    console.log('Dropbox client refreshed with new token');
  }

  async getTempLink(path: string): Promise<{
    tempDir: string;
    files: DropboxFile[];
    filesProcessed: number;
  }> {
    try {
      // Ensure we have a valid Dropbox client
      await this.ensureValidDropboxClient();

      console.log('Processing folder at path:', path);

      // Step 1: List all files in the folder
      console.log('Step 1: Listing files...');
      const files = await this.listFilesInFolder(path);
      console.log(`Step 1 completed: Found ${files.length} files`);

      if (files.length === 0) {
        console.log('No files found in the folder');
        return {
          tempDir: '',
          files: [],
          filesProcessed: 0,
        };
      }

      // Step 2: Download all files to temp folder
      console.log('Step 2: Downloading files...');
      const tempDir = await this.downloadFilesToTempFolder(files);
      console.log(`Step 2 completed: Files downloaded to ${tempDir}`);

      console.log(
        `Successfully processed ${files.length} files to: ${tempDir}`,
      );

      return {
        tempDir,
        files,
        filesProcessed: files.length,
      };
    } catch (error) {
      console.error('Dropbox API error:', error);

      // Check if it's a 401 error (token expired)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status: number }).status === 401
      ) {
        console.log('Token expired, refreshing and retrying...');
        try {
          await this.refreshDropboxClient();

          // Retry the entire process with the new token
          console.log('Retrying folder processing with refreshed token...');

          // Step 1: List all files in the folder
          const files = await this.listFilesInFolder(path);

          if (files.length === 0) {
            console.log('No files found in the folder after token refresh');
            return {
              tempDir: '',
              files: [],
              filesProcessed: 0,
            };
          }

          // Step 2: Download all files to temp folder
          const tempDir = await this.downloadFilesToTempFolder(files);

          console.log(
            `Successfully processed ${files.length} files to: ${tempDir} (after token refresh)`,
          );

          return {
            tempDir,
            files,
            filesProcessed: files.length,
          };
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error(`Token refresh failed: ${refreshError}`);
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process folder: ${errorMessage}`);
    }
  }

  async listFilesInFolder(folderPath: string): Promise<DropboxFile[]> {
    try {
      // Ensure we have a valid Dropbox client
      await this.ensureValidDropboxClient();

      console.log('Listing files in folder:', folderPath);
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

      // Check if it's a 401 error (token expired)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status: number }).status === 401
      ) {
        console.log('Token expired, refreshing and retrying...');
        try {
          await this.refreshDropboxClient();

          // Retry the request with the new token
          console.log('Retrying list files request with refreshed token...');
          const response = await this.dropbox!.filesListFolder({
            path: folderPath,
          });
          const files = response.result.entries.filter(
            (entry) => entry['.tag'] === 'file',
          );
          console.log(
            `Found ${files.length} files in folder after token refresh`,
          );
          return files;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error(`Token refresh failed: ${refreshError}`);
        }
      }

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
      console.log(`Created temporary directory: ${tempDir}`);

      // Ensure we have a valid Dropbox client
      await this.ensureValidDropboxClient();

      // Download each file
      for (const file of files) {
        try {
          if (!file.path_lower) {
            console.warn(`Skipping file ${file.name} - no path available`);
            continue;
          }

          console.log(`Downloading file: ${file.name}`);
          const response = await this.dropbox!.filesDownload({
            path: file.path_lower,
          });

          console.log('Download response structure:', {
            hasResult: !!response.result,
            resultType: typeof response.result,
            resultKeys: response.result ? Object.keys(response.result) : [],
          });

          // Write file to temp directory
          const filePath = path.join(tempDir, file.name);

          // Handle different possible response structures
          let fileData: Buffer;
          const result = response.result as any;

          if (result.fileBinary) {
            fileData = Buffer.from(result.fileBinary);
          } else if (result instanceof Buffer) {
            fileData = result;
          } else if (typeof result === 'string') {
            fileData = Buffer.from(result, 'binary');
          } else {
            // Try to convert whatever we got to a buffer
            fileData = Buffer.from(result);
          }

          await fs.writeFile(filePath, fileData);

          console.log(`Downloaded file to: ${filePath}`);
        } catch (fileError) {
          console.error(`Failed to download file ${file.name}:`, fileError);

          // Check if it's a 401 error (token expired)
          if (
            fileError &&
            typeof fileError === 'object' &&
            'status' in fileError &&
            (fileError as { status: number }).status === 401
          ) {
            console.log(
              'Token expired during download, refreshing and retrying...',
            );
            await this.refreshDropboxClient();

            // Retry the download
            if (file.path_lower) {
              const retryResponse = await this.dropbox!.filesDownload({
                path: file.path_lower,
              });
              const filePath = path.join(tempDir, file.name);

              // Handle different possible response structures (same as above)
              let fileData: Buffer;
              const retryResult = retryResponse.result as any;

              if (retryResult.fileBinary) {
                fileData = Buffer.from(retryResult.fileBinary);
              } else if (retryResult instanceof Buffer) {
                fileData = retryResult;
              } else if (typeof retryResult === 'string') {
                fileData = Buffer.from(retryResult, 'binary');
              } else {
                fileData = Buffer.from(retryResult);
              }

              await fs.writeFile(filePath, fileData);
              console.log(
                `Downloaded file to: ${filePath} (after token refresh)`,
              );
            }
          } else {
            // Continue with other files even if one fails
            console.warn(`Skipping file ${file.name} due to download error`);
          }
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

  async processFilesFromFolder(folderPath: string): Promise<ProcessResult> {
    let tempDir: string | null = null;

    try {
      console.log(`Starting file processing for folder: ${folderPath}`);

      // Step 1: List files in the folder
      const files = await this.listFilesInFolder(folderPath);

      if (files.length === 0) {
        console.log('No files found in the folder');
        return {
          files: [],
          tempDir: '',
          filesProcessed: 0,
        };
      }

      // Step 2: Download files to temp folder
      tempDir = await this.downloadFilesToTempFolder(files);

      console.log(`Processing completed. Files downloaded to: ${tempDir}`);
      console.log('Note: OpenAI analysis will be implemented later');

      // Return information about the process (temp folder not cleaned up yet)
      // This allows the caller to do additional processing before cleanup
      return {
        files,
        tempDir,
        filesProcessed: files.length,
      };
    } catch (error) {
      // If there was an error and we created a temp directory, clean it up
      if (tempDir) {
        try {
          await this.cleanupTempFolder(tempDir);
        } catch (cleanupError) {
          console.error(
            'Failed to cleanup temp folder after error:',
            cleanupError,
          );
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process files from folder: ${errorMessage}`);
    }
  }
}

export interface DropboxFile {
  name: string;
  path_lower?: string;
  '.tag': string;
}

export interface ProcessResult {
  files: DropboxFile[];
  tempDir: string;
  filesProcessed: number;
}
