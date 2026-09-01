import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  /** 프론트가 구글 팝업(Google Identity Services code client)으로 받은 authorization code. */
  @IsString()
  @IsNotEmpty()
  code: string;
}
