import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenService {
  createToken(): void {
    //makes a random token and stores it in the db along with the path of the dropbox folder. Return token and expiry date
    return;
  }

  useToken(): void {
    //check token is valid and not expired. If valid, use the passed temp dropbox link and the questionaire, send req to open ai with a base prompt. Delete no longer needed token and return the response from open ai
    return;
  }

  purgeExpiredTokens(): void {
    //delete all expired tokens from the db
  }
}
