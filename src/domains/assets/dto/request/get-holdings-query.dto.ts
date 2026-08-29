import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetHoldingsQueryDto {
  /** 특정 종목만 조회. 토스 파라미터(symbol)를 그대로 전달한다.
   * @example 005930
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  symbol?: string;
}
