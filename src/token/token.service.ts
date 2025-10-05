import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenService {
  createToken(): string {
    return 'Hello World!';
  }
}
