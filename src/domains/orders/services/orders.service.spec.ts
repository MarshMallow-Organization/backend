import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import {
  OrderCategory,
  OrderType,
  TradeType,
} from 'src/generated/prisma/enums';
import { BusinessException } from 'src/common/exception/businessException';
import { OrdersErrorCode } from '../errors/orders.error';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { OrdersApiService } from 'src/domains/api/orders-api/services/orders-api.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockOrdersRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    findPendingConditionalOrders: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn(),
  };

  const mockOrdersApiService = {
    getStockValuation: jest.fn().mockResolvedValue({
      symbol: '005930',
      perAtOrder: 37.86,
      pbrAtOrder: 3.88,
      marketCapAtOrder: 14528002,
      currentPrice: 248500,
    }),
    createOrder: jest.fn().mockResolvedValue({ orderId: 'toss-mock-order-1' }),
    startWatchingOrder: jest.fn().mockResolvedValue(undefined),
    stopWatchingOrder: jest.fn().mockResolvedValue(undefined),
    restorePendingWatchers: jest.fn().mockResolvedValue(undefined),
    setConditionalOrderTriggerCallback: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: mockOrdersRepository,
        },
        {
          provide: OrdersApiService,
          useValue: mockOrdersApiService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('지정가(LIMIT) 주문 시 가격(price)이 없으면 LIMIT_ORDER_PRICE_REQUIRED 예외를 던진다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.LIMIT,
        orderCategory: OrderCategory.GENERAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        currenciesId: 1,
      };

      await expect(service.createOrder(1, dto)).rejects.toThrow(
        new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED),
      );
    });

    it('지정가(LIMIT) 주문 시 가격(price)이 0 이하이면 LIMIT_ORDER_PRICE_REQUIRED 예외를 던진다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.LIMIT,
        orderCategory: OrderCategory.GENERAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        price: 0,
        currenciesId: 1,
      };

      await expect(service.createOrder(1, dto)).rejects.toThrow(
        new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED),
      );
    });

    it('조건부 주문 시 orderCondition이 없으면 INVALID_ORDER_CONDITION 예외를 던진다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.CONDITIONAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        currenciesId: 1,
      };

      await expect(service.createOrder(1, dto)).rejects.toThrow(
        new BusinessException(OrdersErrorCode.INVALID_ORDER_CONDITION),
      );
    });

    it('일반 주문에 orderCondition이 있으면 GENERAL_ORDER_CANNOT_HAVE_CONDITION 예외를 던진다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.GENERAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        currenciesId: 1,
        orderCondition: {
          triggerPrice: 70000,
          expiredAt: '2026-12-31',
        },
      };

      await expect(service.createOrder(1, dto)).rejects.toThrow(
        new BusinessException(
          OrdersErrorCode.GENERAL_ORDER_CANNOT_HAVE_CONDITION,
        ),
      );
    });

    it('유효한 일반 주문 생성 시 KIS REST 시세(PER, PBR)가 자동 주입되고 토스 주문이 전송된다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.LIMIT,
        orderCategory: OrderCategory.GENERAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        price: 70000,
        currenciesId: 1,
      };

      mockOrdersRepository.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.createOrder(1, dto);

      expect(mockOrdersApiService.getStockValuation).toHaveBeenCalledWith('005930');
      expect(dto.perAtOrder).toBe(37.86);
      expect(dto.pbrAtOrder).toBe(3.88);
      expect(dto.marketCapAtOrder).toBe(14528002);
      expect(mockOrdersApiService.createOrder).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
    });

    it('유효한 조건부 주문 생성 시 KIS 실시간 웹소켓 감시가 등록된다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.LIMIT,
        orderCategory: OrderCategory.CONDITIONAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        price: 65000,
        currenciesId: 1,
        orderCondition: {
          triggerPrice: 65000,
          expiredAt: '2026-12-31',
        },
      };

      mockOrdersRepository.create.mockResolvedValue({ id: 2, ...dto });

      const result = await service.createOrder(1, dto);

      expect(mockOrdersApiService.startWatchingOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 2,
          corpCode: '005930',
          triggerPrice: 65000,
        }),
      );
      expect(result).toHaveProperty('id', 2);
    });
  });

  describe('getOrderById', () => {
    it('주문이 존재하지 않으면 ORDER_NOT_FOUND 예외를 던진다', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.getOrderById(999, 1)).rejects.toThrow(
        new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND),
      );
    });
  });
});
