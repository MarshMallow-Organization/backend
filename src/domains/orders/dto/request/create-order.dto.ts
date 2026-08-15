import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  OrderCategory,
  OrderType,
  TradeType,
} from 'src/generated/prisma/enums';

export class CreateOrderConditionDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  triggerPrice: number;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  expiredAt: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsEnum(OrderCategory)
  orderCategory: OrderCategory;

  @IsEnum(TradeType)
  tradeType: TradeType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) =>
    (value === '' || value === null ? undefined : value))
  price?: number;

  @IsInt()
  @Type(() => Number)
  currenciesId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderConditionDto)
  @Transform(({ value }) => (value && Object.keys(value).length > 0 ? value : undefined))
  orderCondition?: CreateOrderConditionDto;
}
