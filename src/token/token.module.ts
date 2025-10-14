import { Module } from '@nestjs/common';
import { TokenService } from './token.service';

@Module({
  imports: [],
  controllers: [],
  providers: [TokenService],
})
export class TokenModule {}
