import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TradeType } from 'src/generated/prisma/enums';

export class CreateTradeDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  externalTradeId: string;

  @IsEnum(TradeType)
  tradeType: TradeType;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  corpCode: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  corpName: string;

  @IsDateString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  tradedAt: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  realizedProfit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  returnRate?: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  currenciesId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  ordersId: number;
}
