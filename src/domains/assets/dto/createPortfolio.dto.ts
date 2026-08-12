import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** POST /assets/portfolios 요청 본문. */
export class CreatePortfolioDto {
  /**
   * 가상계좌 이름.
   *
   * ValidationPipe(whitelist)가 정의되지 않은 필드는 잘라내므로
   * 여기 없는 값은 서비스까지 오지 않는다.
   */
  @IsString()
  @IsNotEmpty({ message: 'name은 필수입니다' })
  @MaxLength(50)
  name: string;
}
