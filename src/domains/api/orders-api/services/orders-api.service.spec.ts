import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from '../../clients/toss/toss.client';
import { KisClient } from '../../clients/kis/kis.client';
import { OrdersApiService } from './orders-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

describe('OrdersApiService', () => {
  let ordersApiService: OrdersApiService;
  let tossClient: TossClient;

  beforeAll(async () => {
    Logger.overrideLogger(false); // 테스트 중 로거 출력 비활성화

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersApiService,
        TossClient,
        {
          provide: KisClient,
          useValue: {
            request: jest.fn().mockResolvedValue({
              output: {
                stck_prpr: '70000',
                per: '10.5',
                pbr: '1.2',
                hts_avls: '500000',
              },
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'toss.accessToken')
                return process.env.TOSS_ACCESS_TOKEN;
              if (key === 'toss.clientKey') return process.env.TOSS_CLIENT_KEY;
              if (key === 'toss.clientSecret')
                return process.env.TOSS_CLIENT_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    ordersApiService = module.get<OrdersApiService>(OrdersApiService);
    tossClient = module.get<TossClient>(TossClient);
  });

  afterAll(() => {
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  });

  it('OrdersApiService 인스턴스가 정상적으로 생성된다', () => {
    expect(ordersApiService).toBeDefined();
  });

  it('getStockValuation: KIS API를 통해 주식 시세/재무 지표를 정상 조회한다', async () => {
    const valuation = await ordersApiService.getStockValuation('005930');
    expect(valuation.symbol).toBe('005930');
    expect(valuation.currentPrice).toBe(70000);
    expect(valuation.perAtOrder).toBe(10.5);
    expect(valuation.pbrAtOrder).toBe(1.2);
    expect(valuation.marketCapAtOrder).toBe(500000);
  });

  it('createConditionalOrder: 토스 조건주문 생성 API를 호출하고 결과를 반환한다', async () => {
    const mockTossResponse = {
      result: {
        conditionalOrderId: 'mock-cond-order-123',
      },
    };
    jest.spyOn(tossClient, 'request').mockResolvedValueOnce(mockTossResponse);

    const result = await ordersApiService.createConditionalOrder({
      symbol: '005930',
      tradeType: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      price: 65000,
      triggerPrice: 66000,
      expiredAt: '2026-09-30',
      accountSeq: '1',
    });

    expect(result.conditionalOrderId).toBe('mock-cond-order-123');
  });

  it('cancelConditionalOrder: 토스 조건주문 취소 API를 정상 호출한다', async () => {
    jest.spyOn(tossClient, 'request').mockResolvedValueOnce(undefined);

    const result = await ordersApiService.cancelConditionalOrder({
      conditionalOrderId: 'mock-cond-order-123',
      accountSeq: '1',
    });

    expect(result.conditionalOrderId).toBe('mock-cond-order-123');
    expect(result.success).toBe(true);
  });

  it('getConditionalOrder: 토스 조건주문 상세 조회를 호출하고 DTO로 매핑한다', async () => {
    const mockDetailResponse = {
      result: {
        conditionalOrderId: 'mock-cond-order-123',
        type: 'SINGLE',
        status: 'WATCHING',
        symbol: '005930',
        market: 'KR',
        quantity: '10',
        orderType: 'LIMIT',
        expireDate: '2026-09-30',
        first: {
          type: 'STOP',
          status: 'WATCHING',
          triggerPrice: '66000',
          orderPrice: '65000',
          triggeredOrderId: null,
        },
        createdAt: '2026-08-29T10:00:00+09:00',
      },
    };
    jest.spyOn(tossClient, 'request').mockResolvedValueOnce(mockDetailResponse);

    const result = await ordersApiService.getConditionalOrder(
      'mock-cond-order-123',
      '1',
    );

    expect(result.conditionalOrderId).toBe('mock-cond-order-123');
    expect(result.symbol).toBe('005930');
    expect(result.quantity).toBe(10);
    expect(result.status).toBe('WATCHING');
    expect(result.triggerPrice).toBe(66000);
    expect(result.orderPrice).toBe(65000);
  });

  it('실제 토스 API로 매수 주문(createOrder) 요청을 보내고 정상 접수 또는 에러 응답을 수신한다', async () => {
    const isLiveOrderEnabled = process.env.TOSS_LIVE_ORDER_ENABLED === 'true';
    if (!isLiveOrderEnabled) return;

    const hasCredentials =
      process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET);
    if (!hasCredentials) return;

    try {
      const response = await ordersApiService.createOrder({
        symbol: '005930',
        tradeType: 'BUY',
        orderType: 'LIMIT',
        quantity: 1,
        price: 50000,
        accountSeq: '1',
      });

      expect(response).toBeDefined();
      expect(response.orderId).toBeDefined();
      expect(response.status).toBeDefined();
      expect(response.symbol).toBe('005930');
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
    }
  });

  it('실제 토스 API로 주문 상세 조회(getOrder) 요청을 전송한다', async () => {
    const isLiveOrderEnabled = process.env.TOSS_LIVE_ORDER_ENABLED === 'true';
    if (!isLiveOrderEnabled) return;

    const hasCredentials =
      process.env.TOSS_ACCESS_TOKEN ||
      (process.env.TOSS_CLIENT_KEY && process.env.TOSS_CLIENT_SECRET);
    if (!hasCredentials) return;

    const dummyOrderId = 'test-order-id-12345';
    try {
      const response = await ordersApiService.getOrder(dummyOrderId, '1');
      expect(response).toBeDefined();
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
    }
  });
});
