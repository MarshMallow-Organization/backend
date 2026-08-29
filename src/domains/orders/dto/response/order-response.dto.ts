import {
  Image,
  Order,
  OrderCondition,
  Snapshot,
} from 'src/generated/prisma/client';
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

export class SnapshotResponseDto {
  imageId: number;
  imageUrl: string;

  static from(
    entity: (Snapshot & { image?: Image | null }) | null | undefined,
  ): SnapshotResponseDto | null {
    if (!entity || !entity.image) return null;
    const dto = new SnapshotResponseDto();
    dto.imageId = entity.imageId;
    dto.imageUrl = entity.image.imageUrl;
    return dto;
  }
}

export type OrderEntity = Order & {
  orderCondition?: OrderCondition | null;
  snapshot?: (Snapshot & { image?: Image | null }) | null;
};

export class OrderResponseDto {
  id: number;
  externalOrderId?: string | null;
  orderType: OrderType;
  orderCategory: OrderCategory;
  tradeType: TradeType;
  quantity: number;
  price: number | null; // 지정가만 필수, 시장가는 null
  status: OrderStatus;
  corpCode: string;
  corpName: string;
  perAtOrder?: number | null;
  pbrAtOrder?: number | null;
  marketCapAtOrder?: number | null;
  currenciesId: number;
  createdAt: Date;
  orderCondition?: OrderConditionResponseDto | null;
  snapshot?: SnapshotResponseDto | null;

  static from(entity: OrderEntity): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = entity.id;
    dto.externalOrderId = entity.externalOrderId ?? null;
    dto.orderType = entity.orderType;
    dto.orderCategory = entity.orderCategory;
    dto.tradeType = entity.tradeType;
    dto.quantity = entity.quantity;
    dto.price =
      entity.price !== null && entity.price !== undefined
        ? Number(entity.price)
        : null;
    dto.status = entity.status;
    dto.corpCode = entity.corpCode;
    dto.corpName = entity.corpName;
    dto.perAtOrder =
      entity.perAtOrder !== null && entity.perAtOrder !== undefined
        ? Number(entity.perAtOrder)
        : null;
    dto.pbrAtOrder =
      entity.pbrAtOrder !== null && entity.pbrAtOrder !== undefined
        ? Number(entity.pbrAtOrder)
        : null;
    dto.marketCapAtOrder =
      entity.marketCapAtOrder !== null && entity.marketCapAtOrder !== undefined
        ? Number(entity.marketCapAtOrder)
        : null;
    dto.currenciesId = entity.currenciesId;
    dto.createdAt = entity.createdAt;

    dto.orderCondition = entity.orderCondition
      ? OrderConditionResponseDto.from(entity.orderCondition)
      : null;

    dto.snapshot = entity.snapshot
      ? SnapshotResponseDto.from(entity.snapshot)
      : null;

    return dto;
  }
}
