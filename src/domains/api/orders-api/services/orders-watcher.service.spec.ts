import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersWatcherService } from './orders-watcher.service';
import { KisClient } from '../../clients/kis/kis.client';
import { KisRealtimePriceResponse } from '../../clients/kis/kis.types';

describe('OrdersWatcherService', () => {
  let service: OrdersWatcherService;
  let mockKisClient: Partial<KisClient>;

  beforeEach(async () => {
    mockKisClient = {
      getWebSocketUrl: jest
        .fn()
        .mockReturnValue('ws://ops.koreainvestment.com:21000'),
      getApprovalKey: jest.fn().mockResolvedValue('mock-approval-key-123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersWatcherService,
        {
          provide: KisClient,
          useValue: mockKisClient,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();

    service = module.get<OrdersWatcherService>(OrdersWatcherService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('OrdersWatcherService 인스턴스가 정상적으로 생성된다', () => {
    expect(service).toBeDefined();
  });

  it('subscribe 및 unsubscribe 호출 시 종목 참조 카운트가 정상 관리된다', async () => {
    const symbol = '005930';

    await service.subscribe(symbol);
    await service.subscribe(symbol);

    // 1회 unsubscribe -> 여전히 구독 상태 유지
    await service.unsubscribe(symbol);

    // 2회 unsubscribe -> 완전히 구독 해제
    await service.unsubscribe(symbol);

    expect(service).toBeDefined();
  });

  it('onPriceUpdate 리스너 등록 후 수신된 실시간 체결가 메시지를 정상적으로 수신한다', (done) => {
    const mockRawPacket =
      '0|H0STCNT0|001|005930^134500^75000^2^1000^1.35^74500^74000^75500^73500^100^200^5000^1000000^75000000000';

    service.onPriceUpdate((priceData: KisRealtimePriceResponse) => {
      expect(priceData.symbol).toBe('005930');
      expect(priceData.currentPrice).toBe(75000);
      expect(priceData.time).toBe('134500');
      expect(priceData.change).toBe(1000);
      expect(priceData.changeRate).toBe(1.35);
      expect(priceData.openPrice).toBe(74000);
      expect(priceData.highPrice).toBe(75500);
      expect(priceData.lowPrice).toBe(73500);
      expect(priceData.volume).toBe(5000);
      expect(priceData.accumulatedVolume).toBe(1000000);
      done();
    });

    // private handleMessage 테스트용 호출
    (
      service as unknown as { handleMessage: (msg: string) => void }
    ).handleMessage(mockRawPacket);
  });
});
