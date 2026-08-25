import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrderCategory, OrderStatus, OrderType } from 'src/generated/prisma/enums';
import { BusinessException } from 'src/common/exception/businessException';
import { OrdersErrorCode } from '../errors/orders.error';
import { OrdersRepository } from './orders.repository';
import { OrdersApiService } from 'src/domains/api/orders-api/services/orders-api.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersApiService: OrdersApiService,
  ) {}

  async onModuleInit() {
    // 1. 조건부 주문 목표가 도달 시 DB 상태 갱신 콜백 등록
    this.ordersApiService.setConditionalOrderTriggerCallback(
      async (orderId: number, executedPrice: number, tossOrderId: string) => {
        this.logger.log(
          `[OrdersService] 조건부 주문 체결 감지: 주문ID=${orderId}, 체결가=${executedPrice}, TossId=${tossOrderId}`,
        );
        await this.ordersRepository.updateStatus(
          orderId,
          OrderStatus.FILLED,
          executedPrice,
        );
      },
    );

    // 2. 서버 재시작 시 DB의 PENDING 조건부 주문들을 KIS 웹소켓 감시에 복구
    await this.restorePendingConditionalOrders();
  }

  /**
   * 서버 구동 시 미체결 조건부 주문 웹소켓 감시 복구
   */
  private async restorePendingConditionalOrders() {
    try {
      const pendingOrders =
        await this.ordersRepository.findPendingConditionalOrders();

      const watchList = pendingOrders
        .filter((o) => o.orderCondition)
        .map((o) => ({
          orderId: o.id,
          corpCode: o.corpCode,
          triggerPrice: Number(o.orderCondition!.triggerPrice),
          userId: o.userId,
          tradeType: o.tradeType,
          quantity: o.quantity,
          orderType: o.orderType,
          price: o.price ? Number(o.price) : undefined,
        }));

      await this.ordersApiService.restorePendingWatchers(watchList);
    } catch (error) {
      this.logger.error(
        '[OrdersService] 미체결 조건부 주문 복구 중 오류 발생:',
        error,
      );
    }
  }

  // 1. 주문 생성 (REST 시세 조회 + 토스 즉시주문 또는 한투 웹소켓 감시 등록)
  async createOrder(userId: number, dto: CreateOrderDto) {
    // 지정가 주문 시 가격 필수 검증
    if (dto.orderType === OrderType.LIMIT) {
      if (dto.price === undefined || dto.price === null || dto.price <= 0) {
        throw new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED);
      }
    }

    // 조건부 주문 유형 검사
    if (
      dto.orderCategory === OrderCategory.CONDITIONAL &&
      !dto.orderCondition
    ) {
      throw new BusinessException(OrdersErrorCode.INVALID_ORDER_CONDITION);
    }

    if (dto.orderCategory === OrderCategory.GENERAL && dto.orderCondition) {
      throw new BusinessException(
        OrdersErrorCode.GENERAL_ORDER_CANNOT_HAVE_CONDITION,
      );
    }

    // 💡 1) [KIS REST] 주문 시점의 PER, PBR, 시가총액 실시간 조회 및 자동 주입
    if (!dto.perAtOrder || !dto.pbrAtOrder || !dto.marketCapAtOrder) {
      const valuation = await this.ordersApiService.getStockValuation(
        dto.corpCode,
      );
      dto.perAtOrder = dto.perAtOrder ?? valuation.perAtOrder;
      dto.pbrAtOrder = dto.pbrAtOrder ?? valuation.pbrAtOrder;
      dto.marketCapAtOrder = dto.marketCapAtOrder ?? valuation.marketCapAtOrder;
      // 시장가 주문인데 가격이 없으면 현재가로 보조 설정
      if (dto.orderType === OrderType.MARKET && !dto.price) {
        dto.price = valuation.currentPrice;
      }
    }

    // 💡 2) DB에 주문 생성
    const createdOrder = await this.ordersRepository.create(userId, dto);

    // 💡 3) 주문 유형별 외부 증권사 연동 처리
    if (dto.orderCategory === OrderCategory.GENERAL) {
      // 일반 주문: 토스증권으로 즉시 전송
      try {
        await this.ordersApiService.createOrder({
          symbol: dto.corpCode,
          tradeType: dto.tradeType,
          orderType: dto.orderType,
          quantity: dto.quantity ?? 1,
          price: dto.price,
        });
      } catch (error) {
        this.logger.error('[OrdersService] 토스 주문 전송 실패:', error);
        // 필요에 따라 예외 전파 또는 로그 유지
      }
    } else if (
      dto.orderCategory === OrderCategory.CONDITIONAL &&
      dto.orderCondition
    ) {
      // 조건부 주문: KIS 실시간 웹소켓 감시 등록!
      await this.ordersApiService.startWatchingOrder({
        orderId: createdOrder.id,
        corpCode: dto.corpCode,
        triggerPrice: Number(dto.orderCondition.triggerPrice),
        userId,
        tradeType: dto.tradeType,
        quantity: dto.quantity ?? 1,
        orderType: dto.orderType,
        price: dto.price,
      });
    }

    return createdOrder;
  }

  // 2. 주문 목록 조회
  async getOrders(userId: number, query: GetOrdersQueryDto) {
    return await this.ordersRepository.findAll(userId, query);
  }

  // 3. 주문 단건 조회
  async getOrderById(id: number, userId: number) {
    const order = await this.ordersRepository.findById(id, userId);

    if (!order) {
      throw new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND);
    }

    return order;
  }

  // 4. 주문 수정
  async updateOrder(id: number, userId: number, dto: UpdateOrderDto) {
    if (dto.price !== undefined && dto.price !== null && dto.price <= 0) {
      throw new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED);
    }

    return await this.ordersRepository.update(id, userId, dto);
  }

  // 5. 주문 취소
  async cancelOrder(id: number, userId: number) {
    const canceled = await this.ordersRepository.cancel(id, userId);

    // 조건부 주문이 취소된 경우 웹소켓 감시 해제
    if (canceled.orderCategory === OrderCategory.CONDITIONAL && canceled.corpCode) {
      await this.ordersApiService.stopWatchingOrder(canceled.corpCode, id);
    }

    return canceled;
  }
}
