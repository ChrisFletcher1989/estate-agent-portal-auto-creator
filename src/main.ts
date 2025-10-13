import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Configure longer timeout for requests that may take more than 30 seconds
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const server = await app.listen(port);

  // Configure server timeouts to handle long-running processes (5 minutes)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  server.setTimeout(300000);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  server.keepAliveTimeout = 300000;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  server.headersTimeout = 300000;

  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Error starting application:', err);
  process.exit(1);
});
