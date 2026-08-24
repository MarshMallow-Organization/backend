import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/** 국내 종목 코드와 미국 티커를 모두 수용하는 최대 길이. */
const STOCK_CODE_MAX_LENGTH = 10;

/** GET /stocks/:stockCode의 경로 변수 검증 DTO. */
export class GetStockParamDto {
  @ApiProperty({
    description: '종목 코드. 대문자 영문과 숫자만 사용할 수 있다.',
    maxLength: STOCK_CODE_MAX_LENGTH,
    pattern: '^[A-Z0-9]+$',
    examples: ['005930', 'AAPL'],
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'stockCode는 필수입니다.' })
  @MaxLength(STOCK_CODE_MAX_LENGTH, {
    message: `stockCode는 ${STOCK_CODE_MAX_LENGTH}자 이하여야 합니다.`,
  })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'stockCode는 대문자 영문과 숫자만 사용할 수 있습니다.',
  })
  stockCode!: string;
}
