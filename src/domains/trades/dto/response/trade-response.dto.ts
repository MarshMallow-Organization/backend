import { Trade } from 'src/generated/prisma/client';
import { TradeType } from 'src/generated/prisma/enums';

export class TradeResponseDto {
  id: string; // BigInt JSON 직렬화를 위해 string으로 변환
  externalTradeId: string;
  tradeType: TradeType;
  corpCode: string;
  corpName: string;
  tradedAt: Date;
  price: number;
  quantity: number;
  totalPrice: number;
  realizedProfit: number | null;
  returnRate: number | null;
  currenciesId: number;
  ordersId: number;
  createdAt: Date;

  static from(entity: Trade): TradeResponseDto {
    const dto = new TradeResponseDto();
    dto.id = entity.id.toString();
    dto.externalTradeId = entity.externalTradeId;
    dto.tradeType = entity.tradeType;
    dto.corpCode = entity.corpCode;
    dto.corpName = entity.corpName;
    dto.tradedAt = entity.tradedAt;
    dto.price = Number(entity.price);
    dto.quantity = entity.quantity;
    dto.totalPrice = Number(entity.totalPrice);
    dto.realizedProfit =
      entity.realizedProfit !== null && entity.realizedProfit !== undefined
        ? Number(entity.realizedProfit)
        : null;
    dto.returnRate =
      entity.returnRate !== null && entity.returnRate !== undefined
        ? Number(entity.returnRate)
        : null;
    dto.currenciesId = entity.currenciesId;
    dto.ordersId = entity.ordersId;
    dto.createdAt = entity.createdAt;

    return dto;
  }
}
