import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const STOCK_MARKETS = [
  'KOSPI',
  'KOSDAQ',
  'NYSE',
  'NASDAQ',
  'AMEX',
  'KR_ETC',
  'US_ETC',
] as const;

const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_KEYWORD_LENGTH = 100;

/** GET /stocks의 검색 조건과 페이지네이션을 검증하는 DTO. */
export class GetStocksQueryDto {
  @ApiPropertyOptional({
    description: '종목명 또는 종목코드 검색어',
    examples: ['삼성', '005930', 'AAPL'],
    maxLength: MAX_KEYWORD_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(MAX_KEYWORD_LENGTH)
  keyword?: string;

  @ApiPropertyOptional({
    description: '시장 구분',
    enum: STOCK_MARKETS,
    example: 'KOSPI',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsIn(STOCK_MARKETS)
  market?: (typeof STOCK_MARKETS)[number];

  @ApiPropertyOptional({ default: DEFAULT_PAGE, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  size: number = DEFAULT_PAGE_SIZE;
}
