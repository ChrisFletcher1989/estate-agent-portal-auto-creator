import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommandInput,
  GetCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService {
  private readonly logger = new Logger(DynamoDBService.name);
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>(
      'AWS_DEFAULT_REGION',
      'eu-west-2',
    );

    this.dynamoDBClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
    });

    this.docClient = DynamoDBDocumentClient.from(this.dynamoDBClient);
    this.logger.log(`DynamoDB client initialized for region: ${region}`);
  }

  /**
   * Put an item into a DynamoDB table
   */
  async putItem(
    params: Omit<PutCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new PutCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(`Item put successfully in table: ${params.TableName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to put item in table ${params.TableName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get an item from a DynamoDB table
   */
  async getItem(
    params: Omit<GetCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new GetCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(`Item retrieved from table: ${params.TableName}`);
      return result.Item;
    } catch (error) {
      this.logger.error(
        `Failed to get item from table ${params.TableName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Query items from a DynamoDB table
   */
  async queryItems(
    params: Omit<QueryCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new QueryCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(
        `Query executed on table: ${params.TableName}, Count: ${result.Count}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to query table ${params.TableName}:`, error);
      throw error;
    }
  }

  /**
   * Scan items from a DynamoDB table
   */
  async scanItems(
    params: Omit<ScanCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new ScanCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(
        `Scan executed on table: ${params.TableName}, Count: ${result.Count}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to scan table ${params.TableName}:`, error);
      throw error;
    }
  }

  /**
   * Update an item in a DynamoDB table
   */
  async updateItem(
    params: Omit<UpdateCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new UpdateCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(`Item updated in table: ${params.TableName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update item in table ${params.TableName}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete an item from a DynamoDB table
   */
  async deleteItem(
    params: Omit<DeleteCommandInput, 'TableName'> & { TableName: string },
  ) {
    try {
      const command = new DeleteCommand(params);
      const result = await this.docClient.send(command);
      this.logger.log(`Item deleted from table: ${params.TableName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to delete item from table ${params.TableName}:`,
        error,
      );
      throw error;
    }
  }
}
