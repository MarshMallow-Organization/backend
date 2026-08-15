import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

/** 명세(openapi.yaml ReorderPortfoliosRequest): minItems 1, maxItems 4. */
const MAX_PORTFOLIO_COUNT = 4;

/** PATCH /assets/portfolios/order 요청 본문. */
export class ReorderPortfoliosDto {
  /**
   * 변경 후 최종 순서대로 나열한 전체 가상계좌 ID. 배열 인덱스가 그대로
   * sortOrder가 된다.
   *
   * 여기서는 형식만 본다. 중복·소유권·개수 일치는 사용자의 실제 보유 목록을
   * 알아야 판정할 수 있어 서비스에서 PORTFOLIO_ORDER_MISMATCH로 처리한다.
   *
   * 변환 없이 두면 문자열 "1"과 숫자 1의 판정이 갈린다. @Type(() => Number)로
   * transform 단계에서 맞춰 검증 기준을 하나로 둔다.
   */
  @ApiProperty({
    description:
      '변경 후 최종 순서대로 나열한 **보유 중인 전체** 가상계좌 ID. 배열 인덱스가 그대로 sortOrder가 된다.\n\n일부만 보내거나 중복이 있으면 `PORTFOLIO_ORDER_MISMATCH`(400)로 거절한다.',
    type: [Number],
    minItems: 1,
    maxItems: MAX_PORTFOLIO_COUNT,
    example: [12, 9, 21],
  })
  @IsArray()
  @ArrayNotEmpty({
    message: 'portfolioIds는 비어 있지 않은 정수 배열이어야 합니다.',
  })
  @ArrayMaxSize(MAX_PORTFOLIO_COUNT)
  @IsInt({ each: true })
  @Type(() => Number)
  portfolioIds: number[];
}
