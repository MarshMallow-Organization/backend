import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetStockRankingsQueryDto {
  @IsIn(['KR', 'US'])
  marketCountry!: string;

  @IsIn(['amount', 'volume', 'gainers', 'losers'])
  type!: string;

  @IsIn(['realtime', '1d', '1w', '1mo', '3mo', '6mo', '1y'])
  duration!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;
}
