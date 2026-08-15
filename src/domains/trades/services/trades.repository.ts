import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTradeDto } from '../dto/request/create-trade.dto';
import { GetTradesQueryDto } from '../dto/request/get-trades-query.dto';
import { OrderStatus, Prisma } from 'src/generated/prisma/client';
import { BusinessException } from 'src/common/exception/businessException';
import { TradesErrorCode } from '../errors/trades.error';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../constant';

@Injectable()
export class TradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 체결 생성 및 원주문 상태 동기화 (트랜잭션)
  async create(userId: number, dto: CreateTradeDto, totalPrice: number) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 원주문(Order) 존재 및 소유권 확인
      const order = await tx.order.findFirst({
        where: { id: dto.ordersId, userId },
      });

      if (!order) {
        throw new BusinessException(TradesErrorCode.ORDER_NOT_FOUND_FOR_TRADE);
      }

      // 2. 체결 레코드 생성
      const trade = await tx.trade.create({
        data: {
          externalTradeId: dto.externalTradeId,
          tradeType: dto.tradeType,
          corpCode: dto.corpCode,
          corpName: dto.corpName,
          tradedAt: new Date(dto.tradedAt),
          price: dto.price,
          quantity: dto.quantity,
          totalPrice: totalPrice,
          realizedProfit:
            dto.realizedProfit !== undefined ? dto.realizedProfit : null,
          returnRate: dto.returnRate !== undefined ? dto.returnRate : null,
          userId,
          currenciesId: dto.currenciesId,
          ordersId: dto.ordersId,
        },
      });

      // 3. 원주문 상태를 FILLED(체결 완료)로 업데이트
      await tx.order.updateMany({
        where: { id: dto.ordersId, userId },
        data: { status: OrderStatus.FILLED },
      });

      return trade;
    });
  }

  // 2. 체결 목록 및 총 개수 조회 (필터링 및 페이징)
  async findAll(userId: number, query: GetTradesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const size = query.size ?? DEFAULT_PAGE_SIZE;
    const skip = page * size;
    const take = size;

    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      dateFilter.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      dateFilter.lte = new Date(query.endDate);
    }

    const where: Prisma.TradeWhereInput = {
      userId,
      ...(query.corpCode && { corpCode: query.corpCode }),
      ...(query.tradeType && { tradeType: query.tradeType }),
      ...(query.ordersId && { ordersId: query.ordersId }),
      ...(Object.keys(dateFilter).length > 0 && { tradedAt: dateFilter }),
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.trade.findMany({
        where,
        skip,
        take,
        orderBy: {
          tradedAt: 'desc',
        },
      }),
      this.prisma.trade.count({ where }),
    ]);

    return { items, totalCount, page, size };
  }

  // 3. 체결 단건 조회
  async findById(id: bigint, userId: number) {
    return await this.prisma.trade.findFirst({
      where: { id, userId },
    });
  }

  // 4. 외부 체결 ID 기준 단건 조회 (중복 검사용)
  async findByExternalTradeId(externalTradeId: string) {
    return await this.prisma.trade.findUnique({
      where: { externalTradeId },
    });
  }
}
