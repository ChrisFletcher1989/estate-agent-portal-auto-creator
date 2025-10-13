import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzePropertyImages(imagePaths: string[]): Promise<string> {
    try {
      // Convert images to base64 for OpenAI Vision API
      const imageContents = await Promise.all(
        imagePaths.map(async (imagePath) => {
          const fs = await import('fs');
          const imageBuffer = await fs.promises.readFile(imagePath);
          const base64Image = imageBuffer.toString('base64');
          return {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          };
        }),
      );

      const response = await this.client.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze these property images and create a detailed, engaging property description for a real estate portal. Include key features, room descriptions, and selling points that would attract potential buyers.',
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 1000,
      });

      return (
        response.choices[0]?.message?.content ||
        'Unable to generate description'
      );
    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze property images: ${errorMessage}`);
    }
  }
}
