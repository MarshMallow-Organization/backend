import { Injectable, Logger } from '@nestjs/common';
import { TossClient } from '../clients/toss/toss.client';
import {
  CreateOrderApiRequestDto,
  CreateOrderApiResponseDto,
  CancelOrderApiRequestDto,
  CancelOrderApiResponseDto,
  GetOrderApiResponseDto,
} from './orders-api.dto';
import {
  TossOrderRawRequest,
  TossOrderRawResponse,
  TossCancelOrderRawResponse,
  TossOrderDetailRawResponse,
} from './orders-api.type';

import { TossCredentials } from '../clients/toss/toss.types';

@Injectable()
export class OrdersApiService {
  private readonly logger = new Logger(OrdersApiService.name);

  constructor(private readonly tossClient: TossClient) {}

  /**
   * 외부 증권사(토스 등)에 주문 생성 요청 (매수/매도)
   */
  async createOrder(
    dto: CreateOrderApiRequestDto,
  ): Promise<CreateOrderApiResponseDto> {
    this.logger.log(
      `[OrdersApiService] createOrder 요청: ${JSON.stringify(dto)}`,
    );

    const rawRequest: TossOrderRawRequest = {
      symbol: dto.symbol,
      side: dto.tradeType,
      orderType: dto.orderType,
      quantity: dto.quantity,
      price: dto.price,
    };

    const accountSeq = dto.accountSeq ?? process.env.TOSS_ACCOUNT_SEQ ?? '1';

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
   * 외부 증권사에 주문 취소 요청
   */
  async cancelOrder(
    dto: CancelOrderApiRequestDto,
  ): Promise<CancelOrderApiResponseDto> {
    this.logger.log(`[OrdersApiService] cancelOrder 요청: ${dto.orderId}`);

    const accountSeq = dto.accountSeq ?? process.env.TOSS_ACCOUNT_SEQ ?? '1';

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
   * 외부 증권사 주문 상태 및 체결 내역 조회
   */
  async getOrder(
    orderId: string,
    accountSeq: string | number = '1',
    tossCredentials?: TossCredentials,
  ): Promise<GetOrderApiResponseDto> {
    this.logger.log(`[OrdersApiService] getOrder 조회 요청: ${orderId}`);

    const seq = process.env.TOSS_ACCOUNT_SEQ ?? accountSeq;

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
