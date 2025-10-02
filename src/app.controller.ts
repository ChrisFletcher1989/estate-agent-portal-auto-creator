import { Controller, Post } from '@nestjs/common';
import { TokenService } from './app.service';

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post()
  createToken(): string {
    return this.tokenService.createToken();
  }
}
