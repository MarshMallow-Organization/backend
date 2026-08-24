import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessException } from 'src/common/exception/businessException';
import type { MarketsStockApiDto } from 'src/domains/api/markets-api/markets-api.dto';
import { MarketsApiService } from 'src/domains/api/markets-api/markets-api.service';
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
  const domesticStock: MarketsStockApiDto = {
    symbol: stockCode,
    name: '삼성전자',
    englishName: 'SamsungElec',
    isinCode: 'KR7005930003',
    market: 'KOSPI',
    securityType: 'STOCK',
    isCommonShare: true,
    status: 'ACTIVE',
    currency: 'KRW',
    listDate: '1975-06-11',
    delistDate: null,
    sharesOutstanding: '5919637922',
    leverageFactor: null,
    koreanMarketDetail: {
      liquidationTrading: false,
      nxtSupported: true,
      krxTradingSuspended: false,
      nxtTradingSuspended: false,
    },
  };

  const findUnique = jest.fn<
    (where: unknown) => Promise<HiddenStockLookup | null>
  >(() => Promise.resolve(null));
  const getStock = jest.fn<
    (stockCode: string) => Promise<MarketsStockApiDto | null>
  >(() => Promise.resolve(domesticStock));

  let service: MarketsService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
    getStock.mockResolvedValue(domesticStock);

    const prisma = {
      hiddenStock: { findUnique },
    } as unknown as PrismaService;
    const marketsApiService = { getStock } as unknown as MarketsApiService;

    service = new MarketsService(prisma, marketsApiService);
  });

  it('활성 숨김 종목이면 DB의 숨김 정보를 반환하고 외부 API를 호출하지 않는다', async () => {
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
      hiddenUntil: hiddenUntil.toISOString(),
      isHidden: true,
    });
  });

  it('숨김 종목이 아니면 외부 API의 종목 상세 정보를 반환한다', async () => {
    const result = await service.getStock(userId, stockCode);

    expect(getStock).toHaveBeenCalledWith(stockCode);
    expect(result).toEqual({ ...domesticStock, isHidden: false });
  });

  it('숨김 기간이 만료됐으면 외부 API에서 종목 정보를 조회한다', async () => {
    findUnique.mockResolvedValue({
      stockCode,
      stockName: '삼성전자',
      hiddenUntil: new Date('2000-01-01T00:00:00.000Z'),
    });

    const result = await service.getStock(userId, stockCode);

    expect(getStock).toHaveBeenCalledWith(stockCode);
    expect(result.isHidden).toBe(false);
  });

  it('외부 API에서 종목을 찾지 못하면 NOT_FOUND_STOCK을 던진다', async () => {
    getStock.mockResolvedValue(null);

    await expectBusinessException(
      service.getStock(userId, stockCode),
      'NOT_FOUND_STOCK',
    );
  });

  it('해외 종목이면 koreanMarketDetail의 null을 그대로 반환한다', async () => {
    const foreignStock: MarketsStockApiDto = {
      ...domesticStock,
      symbol: 'AAPL',
      name: '애플',
      englishName: 'APPLE INC',
      isinCode: 'US0378331005',
      market: 'NASDAQ',
      currency: 'USD',
      koreanMarketDetail: null,
    };
    getStock.mockResolvedValue(foreignStock);

    const result = await service.getStock(userId, foreignStock.symbol);

    expect(result.isHidden).toBe(false);
    if (result.isHidden) {
      throw new Error('숨김 종목 응답이 반환되었습니다.');
    }

    expect(result.koreanMarketDetail).toBeNull();
  });
});
