import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';

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

  async getTempLink(path: string): Promise<any> {
    try {
      // Ensure we have a valid Dropbox client
      await this.ensureValidDropboxClient();

      console.log('Calling filesListFolder with path:', path);
      const response = await this.dropbox!.filesDownloadZip({ path });
      console.log('API response received successfully');
      return response;
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

          // Retry the request with the new token
          console.log('Retrying request with refreshed token...');
          const response = await this.dropbox!.filesGetTemporaryLink({ path });
          console.log('API response received after token refresh');
          return response.result.link;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error(`Token refresh failed: ${refreshError}`);
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get temporary link: ${errorMessage}`);
    }
  }
}
