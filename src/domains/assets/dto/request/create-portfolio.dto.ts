import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** 명세(openapi.yaml CreatePortfolioRequest): minLength 1, maxLength 30. */
const NAME_MAX_LENGTH = 30;

/** POST /assets/portfolios 요청 본문. */
export class CreatePortfolioDto {
  /**
   * 가상계좌 이름. 사용자 내에서 유일해야 한다.
   *
   * 앞뒤 공백을 잘라낸 뒤(trim) 검증한다. 그러지 않으면 '안전형'과 '안전형 '이 다른 이름으로 취급된다.
   * ValidationPipe(whitelist)가 정의되지 않은 필드는 잘라내므로 여기 없는 값은 서비스까지 오지 않는다.
   * 중간 공백은 확인하지 않는다.
   */
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'name은 필수입니다' })
  @MaxLength(NAME_MAX_LENGTH)
  name: string;
}
