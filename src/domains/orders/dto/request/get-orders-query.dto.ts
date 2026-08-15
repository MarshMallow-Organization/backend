import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import {
  OrderStatus,
  OrderCategory,
  OrderType,
  TradeType,
} from 'src/generated/prisma/enums';

export class GetOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  @Transform(({ value }: { value: unknown }) =>
    value ? value : OrderStatus.PENDING,
  )
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderCategory)
  orderCategory?: OrderCategory;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsEnum(TradeType)
  tradeType?: TradeType;
}
