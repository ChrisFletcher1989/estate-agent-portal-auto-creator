import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Define DTO type for clarity
export interface AddDraftReqDto {
  path: string;
}

@Injectable()
export class SqsService {
  private client: OpenAI;

  constructor() {}

  async addToQueue(dto: AddDraftReqDto) {
    const sqsClient = new SQSClient({ region: 'eu-west-2' });

    const { path } = dto;

    const queueUrl = process.env.SQS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL environment variable not set');
    }

    const params = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ path }),
    };

    try {
      const command = new SendMessageCommand(params);
      const result = await sqsClient.send(command);
      return result;
    } catch (error) {
      const message = error?.message || 'Unknown error';
      throw new Error(`Failed to send SQS message: ${message}`);
    }
  }
}
