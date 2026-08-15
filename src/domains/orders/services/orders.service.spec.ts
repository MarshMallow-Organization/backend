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

describe('OrdersService', () => {
  let service: OrdersService;

  const mockOrdersRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
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

    it('유효한 지정가 일반 주문은 정상 생성된다', async () => {
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
      expect(result).toHaveProperty('id', 1);
      expect(mockOrdersRepository.create).toHaveBeenCalledWith(1, dto);
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
