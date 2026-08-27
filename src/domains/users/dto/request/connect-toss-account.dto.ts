import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectTossAccountDto {
  /** 토스 API Key.
   * @example toss-api-key-value
   */
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  /** 토스 Secret Key.
   * @example toss-secret-value
   */
  @IsString()
  @IsNotEmpty()
  secretKey: string;
}
