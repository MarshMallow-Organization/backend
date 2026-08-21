import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// hidden_stocks.stock_code의 DB 규격(VARCHAR(10))과 동일하게 제한한다.
const STOCK_CODE_MAX_LENGTH = 10;

export class MarketsDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'stockCode는 필수입니다.' })
  @MaxLength(STOCK_CODE_MAX_LENGTH, {
    message: `stockCode는 ${STOCK_CODE_MAX_LENGTH}자 이하여야 합니다.`,
  })
  @Matches(/^\S+$/, { message: 'stockCode에는 공백을 포함할 수 없습니다.' })
  stockCode!: string;
}
