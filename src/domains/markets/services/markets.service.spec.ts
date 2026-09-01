import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessException } from 'src/common/exception/businessException';
import type {
  MarketsListedStockApiDto,
  MarketsStockApiDto,
} from 'src/domains/api/markets-api/markets-api.dto';
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
  type StockListItem = {
    stockCode: string;
    name: string;
    market: string;
    securityType: string;
    isCommonShare: boolean;
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
  const listedStocks: MarketsListedStockApiDto[] = [
    {
      stockCode,
      name: '삼성전자',
      market: 'KOSPI',
      securityType: 'STOCK',
      isCommonShare: true,
      isinCode: 'KR7005930003',
    },
  ];
  const getStocksByMarket = jest.fn<
    (market: string) => Promise<MarketsListedStockApiDto[]>
  >(() => Promise.resolve(listedStocks));
  const upsert = jest.fn<() => Promise<unknown>>(() => Promise.resolve({}));
  const updateMany = jest.fn<() => Promise<{ count: number }>>(() =>
    Promise.resolve({ count: 2 }),
  );
  const findMany = jest.fn<(args: unknown) => Promise<StockListItem[]>>(() =>
    Promise.resolve([]),
  );
  const count = jest.fn<(args: unknown) => Promise<number>>(() =>
    Promise.resolve(0),
  );
  const transaction = jest.fn<
    (operations: Promise<unknown>[]) => Promise<unknown[]>
  >((operations) => Promise.all(operations));

  let service: MarketsService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
    getStock.mockResolvedValue(domesticStock);
    getStocksByMarket.mockResolvedValue(listedStocks);
    upsert.mockResolvedValue({});
    updateMany.mockResolvedValue({ count: 2 });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    transaction.mockImplementation((operations) => Promise.all(operations));

    const prisma = {
      hiddenStock: { findUnique },
      stock: { upsert, updateMany, findMany, count },
      $transaction: transaction,
    } as unknown as PrismaService;
    const marketsApiService = {
      getStock,
      getStocksByMarket,
    } as unknown as MarketsApiService;

    service = new MarketsService(prisma, marketsApiService);
  });

  it('활성 종목을 이름 또는 종목코드로 검색하고 페이지 정보를 반환한다', async () => {
    const items: StockListItem[] = [
      {
        stockCode,
        name: '삼성전자',
        market: 'KOSPI',
        securityType: 'STOCK',
        isCommonShare: true,
      },
    ];
    findMany.mockResolvedValue(items);
    count.mockResolvedValue(21);

    const result = await service.getStocks({
      keyword: '삼성',
      market: 'KOSPI',
      page: 0,
      size: 20,
    });

    const where = {
      isActive: true,
      market: 'KOSPI',
      OR: [{ stockCode: { contains: '삼성' } }, { name: { contains: '삼성' } }],
    };
    expect(findMany).toHaveBeenCalledWith({
      where,
      select: {
        stockCode: true,
        name: true,
        market: true,
        securityType: true,
        isCommonShare: true,
      },
      orderBy: [{ name: 'asc' }, { stockCode: 'asc' }],
      skip: 0,
      take: 20,
    });
    expect(count).toHaveBeenCalledWith({ where });
    expect(result).toEqual({
      items,
      totalCount: 21,
      page: 0,
      size: 20,
      totalPages: 2,
      hasNext: true,
    });
  });

  it('검색 조건이 없으면 활성 종목 전체를 두 번째 페이지부터 조회한다', async () => {
    await service.getStocks({ page: 1, size: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it('시장별 종목을 upsert한 뒤 이전 동기화 종목을 비활성화한다', async () => {
    const result = await service.syncStocksByMarket('KOSPI');

    expect(getStocksByMarket).toHaveBeenCalledWith('KOSPI');
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { stockCode },
      create: expect.objectContaining({
        stockCode,
        name: '삼성전자',
        market: 'KOSPI',
        isActive: true,
        lastSyncedAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        name: '삼성전자',
        market: 'KOSPI',
        isActive: true,
        lastSyncedAt: expect.any(Date),
      }),
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        market: 'KOSPI',
        lastSyncedAt: { lt: expect.any(Date) },
      },
      data: { isActive: false },
    });
    expect(result).toEqual({
      market: 'KOSPI',
      syncedCount: 1,
      deactivatedCount: 2,
    });
  });

  it('외부 종목 목록이 비어 있으면 DB를 변경하지 않는다', async () => {
    getStocksByMarket.mockResolvedValue([]);

    await expect(service.syncStocksByMarket('NASDAQ')).resolves.toEqual({
      market: 'NASDAQ',
      syncedCount: 0,
      deactivatedCount: 0,
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('종목을 최대 100개씩 나누어 배치 처리한다', async () => {
    getStocksByMarket.mockResolvedValue(
      Array.from({ length: 201 }, (_, index) => ({
        stockCode: String(index).padStart(6, '0'),
        name: `종목 ${index}`,
        market: 'KOSPI' as const,
        securityType: 'STOCK',
        isCommonShare: true,
        isinCode: `KR${String(index).padStart(10, '0')}`,
      })),
    );

    const result = await service.syncStocksByMarket('KOSPI');

    expect(upsert).toHaveBeenCalledTimes(201);
    expect(transaction).toHaveBeenCalledTimes(3);
    expect(transaction.mock.calls[0]?.[0]).toHaveLength(100);
    expect(transaction.mock.calls[1]?.[0]).toHaveLength(100);
    expect(transaction.mock.calls[2]?.[0]).toHaveLength(1);
    expect(result.syncedCount).toBe(201);
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
