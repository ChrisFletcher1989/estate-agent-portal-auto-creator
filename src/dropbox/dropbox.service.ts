import { Injectable } from '@nestjs/common';

@Injectable()
export class DropboxService {
  GetZip(): string {
    return 'Hello World!';
  }
}
