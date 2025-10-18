import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';
import serverless from 'serverless-http';

let cachedServer: ReturnType<typeof serverless> | null = null;

async function bootstrapServer() {
  if (!cachedServer) {
    const expressApp = express();
    expressApp.use(express.json()); // Enable JSON body parsing
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    await app.init();
    cachedServer = serverless(expressApp);
  }
  return cachedServer;
}

export const handler = async (event: any, context: any) => {
  console.log('Handler called, event.body:', event.body);
  const server = await bootstrapServer();
  return server(event, context);
};

// Local development bootstrap (only runs if not in Lambda)
if (!process.env.LAMBDA_TASK_ROOT) {
  async function bootstrap() {
    const expressApp = express();
    expressApp.use(express.json()); // Enable JSON body parsing
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    await app.listen(3000);
    console.log('Application is running on: http://localhost:3000');
  }
  bootstrap().catch((err) => {
    console.error('Error starting application:', err);
    process.exit(1);
  });
}
