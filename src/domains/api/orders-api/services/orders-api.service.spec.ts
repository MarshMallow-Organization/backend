import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from '../../clients/toss/toss.client';
import { KisClient } from '../../clients/kis/kis.client';
import { OrdersWatcherService } from './orders-watcher.service';
import { OrdersApiService } from './orders-api.service';
import * as dotenv from 'dotenv';

dotenv.config();

describe('OrdersApiService', () => {
  let ordersApiService: OrdersApiService;

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
            getApprovalKey: jest.fn().mockResolvedValue('mock-approval-key'),
            getWebSocketUrl: jest.fn().mockReturnValue('ws://ops.koreainvestment.com:21000'),
          },
        },
        {
          provide: OrdersWatcherService,
          useValue: {
            subscribe: jest.fn().mockResolvedValue(undefined),
            unsubscribe: jest.fn().mockResolvedValue(undefined),
            onPriceUpdate: jest.fn().mockReturnValue(() => {}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'toss.accessToken') return process.env.TOSS_ACCESS_TOKEN;
              if (key === 'toss.clientKey') return process.env.TOSS_CLIENT_KEY;
              if (key === 'toss.clientSecret') return process.env.TOSS_CLIENT_SECRET;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    ordersApiService = module.get<OrdersApiService>(OrdersApiService);
  });

  afterAll(() => {
    Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  });

  it('OrdersApiService 인스턴스가 정상적으로 생성된다', () => {
    expect(ordersApiService).toBeDefined();
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
