export interface PropertyTokens {
  id: number; //primary key
  token: string;
  filePath: string;
  used: boolean;
  createdAt: string;
  expiredAt: string;
}
