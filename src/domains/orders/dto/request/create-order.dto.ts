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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  expiredAt: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsEnum(OrderCategory)
  orderCategory: OrderCategory;

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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  perAtOrder?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pbrAtOrder?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  marketCapAtOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  price?: number;

  @IsInt()
  @Type(() => Number)
  currenciesId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderConditionDto)
  @Transform(({ value }: { value: unknown }) =>
    value && typeof value === 'object' && Object.keys(value).length > 0
      ? value
      : undefined,
  )
  orderCondition?: CreateOrderConditionDto;
}
