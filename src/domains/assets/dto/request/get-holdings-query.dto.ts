import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const HOLDINGS_MAX_SIZE = 50;

export class GetHoldingsQueryDto {
  /** 0부터 시작하는 페이지 번호.
   * @example 0
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  /** 페이지당 조회할 종목 수.
   * @example 10
   */
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HOLDINGS_MAX_SIZE)
  size?: number;

  /** 특정 종목만 조회. 토스 파라미터(symbol)를 그대로 전달한다.
   * @example 005930
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  symbol?: string;
}
