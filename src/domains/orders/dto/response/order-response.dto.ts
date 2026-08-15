import { Order, OrderCondition } from 'src/generated/prisma/client';
import {
  OrderCategory,
  OrderStatus,
  OrderType,
  TradeType,
} from 'src/generated/prisma/enums';

export class OrderConditionResponseDto {
  id: number;
  triggerPrice: number;
  expiredAt: Date;

  static from(
    entity: OrderCondition | null | undefined,
  ): OrderConditionResponseDto | null {
    if (!entity) return null;
    const dto = new OrderConditionResponseDto();
    dto.id = entity.id;
    dto.triggerPrice = Number(entity.triggerPrice);
    dto.expiredAt = entity.expiredAt;
    return dto;
  }
}

export type OrderEntity = Order & {
  orderCondition?: OrderCondition | null;
};

export class OrderResponseDto {
  id: number;
  orderType: OrderType;
  orderCategory: OrderCategory;
  tradeType: TradeType;
  quantity: number;
  price: number | null; // 지정가만 필수, 시장가는 null
  status: OrderStatus;
  currenciesId: number;
  createdAt: Date;
  orderCondition?: OrderConditionResponseDto | null;

  static from(entity: OrderEntity): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = entity.id;
    dto.orderType = entity.orderType;
    dto.orderCategory = entity.orderCategory;
    dto.tradeType = entity.tradeType;
    dto.quantity = entity.quantity;
    dto.price = entity.price !== null ? Number(entity.price) : null;
    dto.status = entity.status;
    dto.currenciesId = entity.currenciesId;
    dto.createdAt = entity.createdAt;

    dto.orderCondition = entity.orderCondition
      ? OrderConditionResponseDto.from(entity.orderCondition)
      : null;

    return dto;
  }
}
