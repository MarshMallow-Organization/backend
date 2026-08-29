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

    it('시장가(MARKET) 일반 주문은 가격(price) 없이도 정상 생성된다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.GENERAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        currenciesId: 1,
      };

      mockOrdersRepository.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.createOrder(1, dto);
      expect(result).toHaveProperty('id', 1);
      expect(mockOrdersRepository.create).toHaveBeenCalledWith(1, dto);
    });

    it('유효한 조건부 주문은 정상 생성된다', async () => {
      const dto: CreateOrderDto = {
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.CONDITIONAL,
        tradeType: TradeType.BUY,
        corpCode: '005930',
        corpName: '삼성전자',
        currenciesId: 1,
        orderCondition: {
          triggerPrice: 65000,
          expiredAt: '2026-12-31T23:59:59.000Z',
        },
      };

      mockOrdersRepository.create.mockResolvedValue({ id: 2, ...dto });

      const result = await service.createOrder(1, dto);
      expect(result).toHaveProperty('id', 2);
      expect(mockOrdersRepository.create).toHaveBeenCalledWith(1, dto);
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

  describe('getOrders', () => {
    it('필터 조건에 맞는 주문 목록을 조회하여 반환한다', async () => {
      const query = { corpCode: '005930' };
      const sampleOrders = [
        { id: 1, corpCode: '005930', corpName: '삼성전자' },
        { id: 2, corpCode: '005930', corpName: '삼성전자' },
      ];
      mockOrdersRepository.findAll.mockResolvedValue(sampleOrders);

      const result = await service.getOrders(1, query);
      expect(result).toEqual(sampleOrders);
      expect(mockOrdersRepository.findAll).toHaveBeenCalledWith(1, query);
    });
  });

  describe('getOrderById', () => {
    it('주문이 존재하지 않으면 ORDER_NOT_FOUND 예외를 던진다', async () => {
      mockOrdersRepository.findById.mockResolvedValue(null);

      await expect(service.getOrderById(999, 1)).rejects.toThrow(
        new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND),
      );
    });

    it('주문이 존재하면 해당 주문 엔티티를 반환한다', async () => {
      const sampleOrder = { id: 1, corpCode: '005930', userId: 1 };
      mockOrdersRepository.findById.mockResolvedValue(sampleOrder);

      const result = await service.getOrderById(1, 1);
      expect(result).toEqual(sampleOrder);
      expect(mockOrdersRepository.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('updateOrder', () => {
    it('수정 시 price가 0 이하이면 LIMIT_ORDER_PRICE_REQUIRED 예외를 던진다', async () => {
      await expect(service.updateOrder(1, 1, { price: 0 })).rejects.toThrow(
        new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED),
      );

      await expect(service.updateOrder(1, 1, { price: -500 })).rejects.toThrow(
        new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED),
      );
    });

    it('유효한 수정 요청 시 ordersRepository.update를 호출하고 결과를 반환한다', async () => {
      const updateDto = { price: 75000, quantity: 20 };
      const updatedOrder = { id: 1, ...updateDto };
      mockOrdersRepository.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrder(1, 1, updateDto);
      expect(result).toEqual(updatedOrder);
      expect(mockOrdersRepository.update).toHaveBeenCalledWith(1, 1, updateDto);
    });
  });

  describe('cancelOrder', () => {
    it('주문 취소 시 ordersRepository.cancel을 호출하고 결과를 반환한다', async () => {
      const canceledOrder = { id: 1, status: 'CANCELED' };
      mockOrdersRepository.cancel.mockResolvedValue(canceledOrder);

      const result = await service.cancelOrder(1, 1);
      expect(result).toEqual(canceledOrder);
      expect(mockOrdersRepository.cancel).toHaveBeenCalledWith(1, 1);
    });
  });
});
