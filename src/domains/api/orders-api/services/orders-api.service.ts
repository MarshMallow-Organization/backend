import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TossClient } from '../../clients/toss/toss.client';
import { KisClient } from '../../clients/kis/kis.client';
import { OrdersWatcherService } from './orders-watcher.service';
import {
  CreateOrderApiRequestDto,
  CreateOrderApiResponseDto,
  CancelOrderApiRequestDto,
  CancelOrderApiResponseDto,
  GetOrderApiResponseDto,
  StockOrderValuationDto,
  WatchConditionalOrderDto,
} from '../orders-api.dto';
import {
  TossOrderRawRequest,
  TossOrderRawResponse,
  TossCancelOrderRawResponse,
  TossOrderDetailRawResponse,
} from '../orders-api.type';
import { TossCredentials } from '../../clients/toss/toss.types';
import {
  KisStockPrice1Response,
  KisRealtimePriceResponse,
} from '../../clients/kis/kis.types';

export type ConditionalOrderTriggerCallback = (
  orderId: number,
  executedPrice: number,
  tossOrderId: string,
) => Promise<void>;

@Injectable()
export class OrdersApiService implements OnModuleInit {
  private readonly logger = new Logger(OrdersApiService.name);

  // 감시 중인 조건부 주문 맵: corpCode -> WatchConditionalOrderDto[]
  private watchedOrders = new Map<string, WatchConditionalOrderDto[]>();
  private triggerCallback: ConditionalOrderTriggerCallback | null = null;

  constructor(
    private readonly tossClient: TossClient,
    private readonly kisClient: KisClient,
    private readonly ordersWatcherService: OrdersWatcherService,
  ) {}

  onModuleInit() {
    // 실시간 웹소켓 틱 수신 시 목표가 비교 및 자동 주문 집행 파이프라인 연결
    this.ordersWatcherService.onPriceUpdate(
      async (tick: KisRealtimePriceResponse) => {
        await this.handleRealtimePrice(tick);
      },
    );
  }

  /**
   * 조건부 주문 목표가 도달 시 DB 상태 갱신 등을 수행할 콜백 등록
   */
  setConditionalOrderTriggerCallback(
    callback: ConditionalOrderTriggerCallback,
  ) {
    this.triggerCallback = callback;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. KIS REST API: 주문 시점 재무/시세 지표 조회 (PER, PBR, 시가총액)
  // ─────────────────────────────────────────────────────────────

  /**
   * KIS 시세1 API를 호출하여 주문 당시의 PER, PBR, 시가총액, 현재가를 조회합니다.
   */
  async getStockValuation(corpCode: string): Promise<StockOrderValuationDto> {
    this.logger.log(
      `[OrdersApiService] KIS 종목 시세/재무 조회 요청: ${corpCode}`,
    );

    try {
      const response = await this.kisClient.request<KisStockPrice1Response>(
        `/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${encodeURIComponent(
          corpCode,
        )}`,
        {
          method: 'GET',
          trId: 'FHKST01010100', // 주식현재가 시세1
        },
      );

      const output = response.output;
      return {
        symbol: corpCode,
        currentPrice: output?.stck_prpr ? Number(output.stck_prpr) : undefined,
        perAtOrder: output?.per ? Number(output.per) : undefined,
        pbrAtOrder: output?.pbr ? Number(output.pbr) : undefined,
        marketCapAtOrder: output?.hts_avls
          ? Number(output.hts_avls)
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `[OrdersApiService] KIS 종목 시세 조회 실패 (${corpCode}), 기본값으로 진행:`,
        error,
      );
      return {
        symbol: corpCode,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. KIS WebSocket: 조건부 주문 실시간 목표가 감시
  // ─────────────────────────────────────────────────────────────

  /**
   * 신규 조건부 주문 감시 등록
   */
  async startWatchingOrder(order: WatchConditionalOrderDto) {
    const existing = this.watchedOrders.get(order.corpCode) ?? [];
    existing.push(order);
    this.watchedOrders.set(order.corpCode, existing);

    await this.ordersWatcherService.subscribe(order.corpCode);
    this.logger.log(
      `[OrdersApiService] 조건부 주문 감시 등록: 종목=${order.corpCode}, 주문ID=${order.orderId}, 목표가=${order.triggerPrice}`,
    );
  }

  /**
   * 조건부 주문 감시 해제 (취소/체결 시)
   */
  async stopWatchingOrder(corpCode: string, orderId: number) {
    const existing = this.watchedOrders.get(corpCode) ?? [];
    const filtered = existing.filter((item) => item.orderId !== orderId);

    if (filtered.length === 0) {
      this.watchedOrders.delete(corpCode);
    } else {
      this.watchedOrders.set(corpCode, filtered);
    }

    await this.ordersWatcherService.unsubscribe(corpCode);
    this.logger.log(
      `[OrdersApiService] 조건부 주문 감시 해제: 종목=${corpCode}, 주문ID=${orderId}`,
    );
  }

  /**
   * 서버 재시작 시 DB에서 복구된 미체결 조건부 주문 목록을 일괄 감시 등록
   */
  async restorePendingWatchers(orders: WatchConditionalOrderDto[]) {
    for (const order of orders) {
      await this.startWatchingOrder(order);
    }
    this.logger.log(
      `[OrdersApiService] 미체결 조건부 주문 ${orders.length}건 감시 복구 완료`,
    );
  }

  /**
   * 실시간 체결가 수신 시 목표가 비교 및 자동 토스 주문 집행
   */
  private async handleRealtimePrice(tick: KisRealtimePriceResponse) {
    const orders = this.watchedOrders.get(tick.symbol);
    if (!orders || orders.length === 0) return;

    for (const order of [...orders]) {
      const isReached =
        order.tradeType === 'BUY'
          ? tick.currentPrice <= order.triggerPrice // 매수: 목표가 이하 도달 시
          : tick.currentPrice >= order.triggerPrice; // 매도: 목표가 이상 도달 시

      if (isReached) {
        this.logger.log(
          `🎯 [조건부 목표가 도달!] 종목=${tick.symbol}, 현재가=${tick.currentPrice}, 목표가=${order.triggerPrice} (주문ID: ${order.orderId})`,
        );

        try {
          // 1. 토스증권 API로 실제 주문 집행
          const tossResponse = await this.createOrder({
            symbol: order.corpCode,
            tradeType: order.tradeType,
            orderType: order.orderType,
            quantity: order.quantity,
            price: order.price ?? tick.currentPrice,
            accountSeq: order.accountSeq,
            tossCredentials: order.tossCredentials,
          });

          this.logger.log(
            `✅ [토스 자동 주문 성공] 주문ID=${order.orderId}, TossOrderId=${tossResponse.orderId}`,
          );

          // 2. 감시 목록에서 해제
          await this.stopWatchingOrder(order.corpCode, order.orderId);

          // 3. 상위 도메인 콜백 호출 (DB 상태 FILLED 갱신 등)
          if (this.triggerCallback) {
            await this.triggerCallback(
              order.orderId,
              tick.currentPrice,
              tossResponse.orderId,
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ [토스 자동 주문 실패] 주문ID=${order.orderId}:`,
            error,
          );
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Toss REST API: 주문 생성 / 취소 / 조회
  // ─────────────────────────────────────────────────────────────

  /**
   * 토스증권에 주문 생성 요청 (매수/매도)
   */
  async createOrder(
    dto: CreateOrderApiRequestDto,
  ): Promise<CreateOrderApiResponseDto> {
    this.logger.log(
      `[OrdersApiService] 토스 createOrder 요청: ${JSON.stringify(dto)}`,
    );

    const rawRequest: TossOrderRawRequest = {
      symbol: dto.symbol,
      side: dto.tradeType,
      orderType: dto.orderType,
      quantity: dto.quantity,
      price: dto.price,
    };

    const accountSeq = dto.accountSeq ?? '1';

    const rawResponse = await this.tossClient.request<TossOrderRawResponse>(
      '/orders',
      {
        method: 'POST',
        headers: {
          'X-Tossinvest-Account': String(accountSeq),
        },
        body: JSON.stringify(rawRequest),
        tossCredentials: dto.tossCredentials,
      },
    );

    return {
      orderId: rawResponse.orderId,
      status: rawResponse.status,
      orderedAt: rawResponse.createdAt,
      symbol: rawResponse.symbol,
      quantity: rawResponse.quantity,
      price: rawResponse.price,
      rawResponse,
    };
  }

  /**
   * 토스증권에 주문 취소 요청
   */
  async cancelOrder(
    dto: CancelOrderApiRequestDto,
  ): Promise<CancelOrderApiResponseDto> {
    this.logger.log(`[OrdersApiService] 토스 cancelOrder 요청: ${dto.orderId}`);

    const accountSeq = dto.accountSeq ?? '1';

    const rawResponse =
      await this.tossClient.request<TossCancelOrderRawResponse>(
        `/orders/${dto.orderId}/cancel`,
        {
          method: 'POST',
          headers: {
            'X-Tossinvest-Account': String(accountSeq),
          },
          tossCredentials: dto.tossCredentials,
        },
      );

    return {
      orderId: rawResponse.orderId,
      status: rawResponse.status,
      canceledAt: rawResponse.canceledAt,
      rawResponse,
    };
  }

  /**
   * 토스증권 주문 상태 및 체결 내역 조회
   */
  async getOrder(
    orderId: string,
    accountSeq: string | number = '1',
    tossCredentials?: TossCredentials,
  ): Promise<GetOrderApiResponseDto> {
    this.logger.log(`[OrdersApiService] 토스 getOrder 조회 요청: ${orderId}`);

    const seq = accountSeq ?? '1';

    const rawResponse =
      await this.tossClient.request<TossOrderDetailRawResponse>(
        `/orders/${orderId}`,
        {
          method: 'GET',
          headers: {
            'X-Tossinvest-Account': String(seq),
          },
          tossCredentials,
        },
      );

    return {
      orderId: rawResponse.orderId,
      symbol: rawResponse.symbol,
      tradeType: rawResponse.side,
      orderType: rawResponse.orderType,
      quantity: rawResponse.quantity,
      executedQuantity: rawResponse.executedQuantity,
      price: rawResponse.price,
      status: rawResponse.status,
      orderedAt: rawResponse.createdAt,
      rawResponse,
    };
  }
}
