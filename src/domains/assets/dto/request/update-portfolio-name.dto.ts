import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** 명세(openapi.yaml UpdatePortfolioNameRequest): minLength 1, maxLength 30. */
const NAME_MAX_LENGTH = 30;

/**
 * PATCH /assets/portfolios/:portfolioId 요청 본문.
 *
 * 규칙은 생성과 같지만 CreatePortfolioDto를 상속하지 않는다. 명세상 별개
 * 스키마이고, 생성에만 필요한 필드가 나중에 추가돼도 이쪽이 따라가지
 * 않아야 한다.
 */
export class UpdatePortfolioNameDto {
  /**
   * 변경할 이름. 사용자 내에서 유일해야 한다.
   *
   * 생성과 동일하게 앞뒤 공백을 잘라낸 뒤 검증한다. 그러지 않으면 '   '가
   * IsNotEmpty를 통과하고, '안전형'과 '안전형 '이 다른 이름으로 취급돼
   * 중복 검사가 뚫린다.
   */
  @ApiProperty({
    description:
      '변경할 가상계좌 이름. 사용자 내에서 유일해야 한다. 앞뒤 공백은 서버가 잘라낸 뒤 검증한다.',
    minLength: 1,
    maxLength: NAME_MAX_LENGTH,
    example: '공격형',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'name은 필수입니다' })
  @MaxLength(NAME_MAX_LENGTH)
  name: string;
}
