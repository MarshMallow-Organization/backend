import { Injectable, Logger } from '@nestjs/common';
import { TossClient } from '../../clients/toss/toss.client';
import { KisClient } from '../../clients/kis/kis.client';
import {
  CreateOrderApiRequestDto,
  CreateOrderApiResponseDto,
  CancelOrderApiRequestDto,
  CancelOrderApiResponseDto,
  GetOrderApiResponseDto,
  CreateConditionalOrderApiRequestDto,
  CreateConditionalOrderApiResponseDto,
  CancelConditionalOrderApiRequestDto,
  CancelConditionalOrderApiResponseDto,
  GetConditionalOrderApiResponseDto,
  StockOrderValuationDto,
} from '../orders-api.dto';
import {
  TossOrderRawRequest,
  TossOrderRawResponse,
  TossCancelOrderRawResponse,
  TossOrderDetailRawResponse,
  TossConditionalOrderRawRequest,
  TossConditionalOrderRawResponse,
  TossConditionalOrderDetailRawResponse,
} from '../orders-api.type';
import { TossCredentials } from '../../clients/toss/toss.types';
import { KisStockPrice1Response } from '../../clients/kis/kis.types';

@Injectable()
export class OrdersApiService {
  private readonly logger = new Logger(OrdersApiService.name);

  constructor(
    private readonly tossClient: TossClient,
    private readonly kisClient: KisClient,
  ) {}

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
  // 2. Toss REST API: 일반 주문 (생성 / 취소 / 조회)
  // ─────────────────────────────────────────────────────────────

  /**
   * 토스증권에 일반 주문 생성 요청 (매수/매도)
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
   * 토스증권에 일반 주문 취소 요청
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
   * 토스증권 일반 주문 상태 및 체결 내역 조회
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

  // ─────────────────────────────────────────────────────────────
  // 3. Toss REST API: 조건부 주문 (생성 / 취소 / 조회)
  // ─────────────────────────────────────────────────────────────

  /**
   * 토스증권에 조건부 주문 생성 요청 (POST /api/v1/conditional-orders)
   */
  async createConditionalOrder(
    dto: CreateConditionalOrderApiRequestDto,
  ): Promise<CreateConditionalOrderApiResponseDto> {
    this.logger.log(
      `[OrdersApiService] 토스 createConditionalOrder 요청: ${JSON.stringify(dto)}`,
    );

    const expireDate =
      typeof dto.expiredAt === 'string'
        ? dto.expiredAt.slice(0, 10)
        : dto.expiredAt.toISOString().slice(0, 10);

    const rawRequest: TossConditionalOrderRawRequest = {
      symbol: dto.symbol,
      type: 'SINGLE',
      quantity: String(dto.quantity),
      orderType: dto.orderType,
      expireDate,
      first: {
        orderSide: dto.tradeType,
        triggerPrice: String(dto.triggerPrice),
        ...(dto.orderType === 'LIMIT' &&
          dto.price !== undefined &&
          dto.price !== null && {
            orderPrice: String(dto.price),
          }),
      },
    };

    const accountSeq = dto.accountSeq ?? '1';

    const rawResponse =
      await this.tossClient.request<TossConditionalOrderRawResponse>(
        '/conditional-orders',
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
      conditionalOrderId: rawResponse.result.conditionalOrderId,
      rawResponse,
    };
  }

  /**
   * 토스증권에 조건부 주문 취소 요청 (DELETE /api/v1/conditional-orders/{conditionalOrderId})
   */
  async cancelConditionalOrder(
    dto: CancelConditionalOrderApiRequestDto,
  ): Promise<CancelConditionalOrderApiResponseDto> {
    this.logger.log(
      `[OrdersApiService] 토스 cancelConditionalOrder 요청: ${dto.conditionalOrderId}`,
    );

    const accountSeq = dto.accountSeq ?? '1';

    await this.tossClient.request<void>(
      `/conditional-orders/${dto.conditionalOrderId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Tossinvest-Account': String(accountSeq),
        },
        tossCredentials: dto.tossCredentials,
      },
    );

    return {
      conditionalOrderId: dto.conditionalOrderId,
      success: true,
    };
  }

  /**
   * 토스증권 조건부 주문 상세 조회 (GET /api/v1/conditional-orders/{conditionalOrderId})
   */
  async getConditionalOrder(
    conditionalOrderId: string,
    accountSeq: string | number = '1',
    tossCredentials?: TossCredentials,
  ): Promise<GetConditionalOrderApiResponseDto> {
    this.logger.log(
      `[OrdersApiService] 토스 getConditionalOrder 조회 요청: ${conditionalOrderId}`,
    );

    const seq = accountSeq ?? '1';

    const rawResponse =
      await this.tossClient.request<TossConditionalOrderDetailRawResponse>(
        `/conditional-orders/${conditionalOrderId}`,
        {
          method: 'GET',
          headers: {
            'X-Tossinvest-Account': String(seq),
          },
          tossCredentials,
        },
      );

    const res = rawResponse.result;

    return {
      conditionalOrderId: res.conditionalOrderId,
      symbol: res.symbol,
      type: res.type,
      status: res.status,
      quantity: Number(res.quantity),
      orderType: res.orderType,
      expireDate: res.expireDate,
      tradeType:
        (res.first as { orderSide?: 'BUY' | 'SELL' }).orderSide ?? 'BUY',
      triggerPrice: res.first.triggerPrice ? Number(res.first.triggerPrice) : 0,
      orderPrice: res.first.orderPrice
        ? Number(res.first.orderPrice)
        : undefined,
      triggeredOrderId: res.first.triggeredOrderId ?? null,
      createdAt: res.createdAt,
      rawResponse,
    };
  }
}
