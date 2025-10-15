import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

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
        max_completion_tokens: 5000,
      });

      const responseContent =
        response.choices[0]?.message?.content ||
        'Unable to generate description';

      // Create temporary file with the response content
      try {
        const tempDir = path.join(process.cwd(), 'temp');

        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileName = 'portal-draft.txt';
        const filePath = path.join(tempDir, fileName);

        // Add disclaimer at the start of the file
        const disclaimer = `This draft was made using the photos and floor plans as context, and was designed to be edited (if needed) before being copy/pasted into portals such as rightmove and zoopla.
\x1b[31mIMPORTANT: This document is a draft only and was made with AI. AI can make mistakes. It is vital to fact check the contents, and property photo geeks ltd take no responsibility for the accuracy of it's contents.\x1b[0m

---

`;

        const fileContent = disclaimer + responseContent;

        await fs.promises.writeFile(filePath, fileContent, 'utf8');
        console.log(`Property description saved to: ${filePath}`);
      } catch (fileError) {
        console.error('Error creating temp file:', fileError);
      }

      return responseContent;
    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze property images: ${errorMessage}`);
    }
  }
}
