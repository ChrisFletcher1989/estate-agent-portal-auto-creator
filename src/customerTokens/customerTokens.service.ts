import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { Property } from '../models/models';

@Injectable()
export class CustomerTokensService {
  private readonly logger = new Logger(CustomerTokensService.name);
  private readonly tableName = 'Property';

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  /**
   * Creates a new property record with a generated token
   * @param path The file path for the property
   * @returns The created property record
   */
  async createPropertyRecord(path: string): Promise<Property> {
    try {
      // Generate unique ID (timestamp + random number for uniqueness)
      const id = Date.now() + Math.floor(Math.random());

      // Get first 4 characters of the path
      const pathPrefix = path.substring(0, 4);

      // Get current date and time
      const now = new Date();
      const dateTimeString = now
        .toISOString()
        .replace(/[-:T.]/g, '')
        .substring(0, 14); // YYYYMMDDHHMMSS

      // Create token: first 4 chars of path + date/time
      const token = `${pathPrefix}${dateTimeString}`;

      // Calculate expiry date: 1 week from now in UTC
      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);

      // Create the property record
      const propertyRecord: Property = {
        id,
        token,
        filePath: path,
        used: false,
        createdAt: new Date().toISOString(),
        expiredAt: expiresAt.toISOString(),
      };

      // Save to DynamoDB
      await this.dynamoDBService.putItem({
        TableName: this.tableName,
        Item: propertyRecord,
      });

      this.logger.log(`Created property record with token: ${token}`);
      return propertyRecord;
    } catch (error) {
      this.logger.error('Failed to create property record:', error);
      throw new Error(
        `Failed to create property record: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
