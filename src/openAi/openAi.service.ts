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

  async analyzePropertyImages(
    imagePaths: string[],
    outputSettings: string,
  ): Promise<string> {
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
      
      if (imageContents.length < 4) {
        throw new Error('At least 4 images are required for analysis.');
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a high end estate agent lister. Analyze these property images and create a detailed, engaging property description for a UK real estate portal such as Rightmove or Zoopla. OutputSettings: ${outputSettings}`,
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
        // Write the result to /tmp/instant-listing-draft.txt for Lambda compatibility
        const fileName = 'instant-portal-draft.txt';
        const filePath = path.join('/tmp', fileName);
        const disclaimer = `***INSTRUCTIONS***
Downloading and opening in word/google docs etc will fix the formatting and make an easier to read version.

###DISCLAIMER***
This draft was made using the photos and floor plans as context, and was designed to be edited (if needed) before being copy/pasted into portals such as rightmove and zoopla.
IMPORTANT: This document is a draft only and was made with AI. AI can make mistakes. It is vital to fact check the contents, and property photo geeks ltd take no responsibility for the accuracy of it's contents.
###DISCLAIMER***
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
