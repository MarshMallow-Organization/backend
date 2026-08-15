import { Test, TestingModule } from '@nestjs/testing';
import { TradesService } from './trades.service';
import { TradesRepository } from './trades.repository';
import { TradeType } from 'src/generated/prisma/enums';
import { BusinessException } from 'src/common/exception/businessException';
import { TradesErrorCode } from '../errors/trades.error';
import { CreateTradeDto } from '../dto/request/create-trade.dto';
import { GetTradesQueryDto } from '../dto/request/get-trades-query.dto';

describe('TradesService', () => {
  let service: TradesService;

  const mockTradesRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByExternalTradeId: jest.fn(),
    delete: jest.fn(),
  };

  const sampleTradeEntity = {
    id: 100n,
    externalTradeId: 'TOSS_TRADE_123',
    tradeType: TradeType.BUY,
    corpCode: '005930',
    corpName: '삼성전자',
    tradedAt: new Date('2026-08-15T09:00:00.000Z'),
    price: 70000,
    quantity: 10,
    totalPrice: 700000,
    realizedProfit: null,
    returnRate: null,
    userId: 1,
    currenciesId: 1,
    ordersId: 10,
    createdAt: new Date('2026-08-15T09:00:00.000Z'),
    updatedAt: new Date('2026-08-15T09:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        {
          provide: TradesRepository,
          useValue: mockTradesRepository,
        },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTrade', () => {
    const dto: CreateTradeDto = {
      externalTradeId: 'TOSS_TRADE_123',
      tradeType: TradeType.BUY,
      corpCode: '005930',
      corpName: '삼성전자',
      tradedAt: '2026-08-15T09:00:00.000Z',
      price: 70000,
      quantity: 10,
      currenciesId: 1,
      ordersId: 10,
    };

    it('가격(price)이 0 이하이면 INVALID_TRADE_PRICE_OR_QUANTITY 예외를 던진다', async () => {
      await expect(
        service.createTrade(1, { ...dto, price: 0 }),
      ).rejects.toThrow(
        new BusinessException(TradesErrorCode.INVALID_TRADE_PRICE_OR_QUANTITY),
      );
    });

    it('수량(quantity)이 0 이하이면 INVALID_TRADE_PRICE_OR_QUANTITY 예외를 던진다', async () => {
      await expect(
        service.createTrade(1, { ...dto, quantity: 0 }),
      ).rejects.toThrow(
        new BusinessException(TradesErrorCode.INVALID_TRADE_PRICE_OR_QUANTITY),
      );
    });

    it('이미 존재하는 externalTradeId이면 DUPLICATE_EXTERNAL_TRADE_ID 예외를 던진다', async () => {
      mockTradesRepository.findByExternalTradeId.mockResolvedValue(
        sampleTradeEntity,
      );

      await expect(service.createTrade(1, dto)).rejects.toThrow(
        new BusinessException(TradesErrorCode.DUPLICATE_EXTERNAL_TRADE_ID),
      );
    });

    it('유효한 요청이면 체결을 생성하고 BigInt id가 문자열로 변환된 DTO를 반환한다', async () => {
      mockTradesRepository.findByExternalTradeId.mockResolvedValue(null);
      mockTradesRepository.create.mockResolvedValue(sampleTradeEntity);

      const result = await service.createTrade(1, dto);

      expect(result.id).toBe('100');
      expect(result.externalTradeId).toBe('TOSS_TRADE_123');
      expect(result.totalPrice).toBe(700000);
      expect(mockTradesRepository.create).toHaveBeenCalledWith(1, dto, 700000);
    });
  });

  describe('getTrades', () => {
    it('체결 목록을 조회하고 페이징된 응답 DTO를 반환한다', async () => {
      const query: GetTradesQueryDto = { page: 0, size: 20 };
      mockTradesRepository.findAll.mockResolvedValue({
        items: [sampleTradeEntity],
        totalCount: 1,
        page: 0,
        size: 20,
      });

      const result = await service.getTrades(1, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('100');
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('getTradeById', () => {
    it('유효하지 않은 BigInt 문자열이면 TRADE_NOT_FOUND 예외를 던진다', async () => {
      await expect(service.getTradeById('invalid-id', 1)).rejects.toThrow(
        new BusinessException(TradesErrorCode.TRADE_NOT_FOUND),
      );
    });

    it('체결 내역이 존재하지 않으면 TRADE_NOT_FOUND 예외를 던진다', async () => {
      mockTradesRepository.findById.mockResolvedValue(null);

      await expect(service.getTradeById('999', 1)).rejects.toThrow(
        new BusinessException(TradesErrorCode.TRADE_NOT_FOUND),
      );
    });

    it('체결 내역이 존재하면 정상 반환한다', async () => {
      mockTradesRepository.findById.mockResolvedValue(sampleTradeEntity);

      const result = await service.getTradeById('100', 1);

      expect(result.id).toBe('100');
      expect(result.corpCode).toBe('005930');
    });
  });

  describe('deleteTrade', () => {
    it('유효하지 않은 BigInt 문자열이면 TRADE_NOT_FOUND 예외를 던진다', async () => {
      await expect(service.deleteTrade('invalid-id', 1)).rejects.toThrow(
        new BusinessException(TradesErrorCode.TRADE_NOT_FOUND),
      );
    });

    it('체결 내역이 존재하면 정상 삭제되고 deleted: true를 반환한다', async () => {
      mockTradesRepository.delete.mockResolvedValue({
        id: '100',
        deleted: true,
      });

      const result = await service.deleteTrade('100', 1);

      expect(result.id).toBe('100');
      expect(result.deleted).toBe(true);
      expect(mockTradesRepository.delete).toHaveBeenCalledWith(100n, 1);
    });
  });
});
