import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import type { TossStock } from 'src/domains/api/clients/toss/toss.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketsService } from './markets.service';

const expectBusinessException = async (
  promise: Promise<unknown>,
  code: string,
): Promise<void> => {
  try {
    await promise;
    throw new Error(`Expected BusinessException with code ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(BusinessException);

    if (!(error instanceof BusinessException)) {
      throw error;
    }

    expect(error.definition.code).toBe(code);
  }
};

describe('MarketsService', () => {
  type HiddenStockLookup = {
    stockCode: string;
    stockName: string;
    hiddenUntil: Date;
  };

  const userId = 7;
  const stockCode = '005930';
  const hiddenUntil = new Date('2099-08-31T23:59:59.000Z');
  const domesticStock: TossStock = {
    symbol: stockCode,
    name: '삼성전자',
  };

  const findUnique = jest.fn<
    (where: unknown) => Promise<HiddenStockLookup | null>
  >(() => Promise.resolve(null));
  const getStock = jest.fn<
    (stockCode: string) => Promise<{ result: TossStock[] }>
  >(() => Promise.resolve({ result: [domesticStock] }));

  let service: MarketsService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
    getStock.mockResolvedValue({ result: [domesticStock] });

    const prisma = {
      hiddenStock: { findUnique },
    } as unknown as PrismaService;
    const tossClient = {
      getStock,
    } as unknown as TossClient;

    service = new MarketsService(prisma, tossClient);
  });

  it('활성 숨김 종목이면 DB의 숨김 정보를 반환하고 토스 API를 호출하지 않는다', async () => {
    findUnique.mockResolvedValue({
      stockCode,
      stockName: '삼성전자',
      hiddenUntil,
    });

    const result = await service.getStock(userId, stockCode);

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_stockCode: {
          userId,
          stockCode,
        },
      },
    });
    expect(getStock).not.toHaveBeenCalled();
    expect(result).toEqual({
      symbol: stockCode,
      name: '삼성전자',
      message: '숨김 처리된 종목입니다.',
      hiddenUntil,
      isHidden: true,
    });
  });

  it('숨김 종목이 아니면 토스 API의 종목 정보를 반환한다', async () => {
    const result = await service.getStock(userId, stockCode);

    expect(getStock).toHaveBeenCalledWith(stockCode);
    expect(result).toEqual({
      symbol: stockCode,
      name: '삼성전자',
      isHidden: false,
    });
  });

  it('숨김 기간이 만료됐으면 토스 API에서 종목 정보를 조회한다', async () => {
    findUnique.mockResolvedValue({
      stockCode,
      stockName: '삼성전자',
      hiddenUntil: new Date('2000-01-01T00:00:00.000Z'),
    });

    const result = await service.getStock(userId, stockCode);

    expect(getStock).toHaveBeenCalledWith(stockCode);
    expect(result.isHidden).toBe(false);
  });

  it('토스 API에서 종목을 찾지 못하면 NOT_FOUND_STOCK을 던진다', async () => {
    getStock.mockResolvedValue({ result: [] });

    await expectBusinessException(
      service.getStock(userId, stockCode),
      'NOT_FOUND_STOCK',
    );
  });
});
