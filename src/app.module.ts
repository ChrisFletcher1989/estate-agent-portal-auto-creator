import { Module } from '@nestjs/common';
import { TokenController } from './app.controller';
import { TokenService } from './app.service';

@Module({
  imports: [],
  controllers: [TokenController],
  providers: [TokenService],
})
export class AppModule {}
