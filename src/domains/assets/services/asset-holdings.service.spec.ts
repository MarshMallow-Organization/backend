import { PrismaService } from 'src/prisma/prisma.service';
import { AssetHoldingsService } from './asset-holdings.service';
import { Holding, HoldingsProvider } from './holdings.provider';

describe('AssetHoldingsService', () => {
  let service: AssetHoldingsService;
  let prisma: { hiddenStock: { findMany: jest.Mock } };
  let holdingsProvider: { getHoldings: jest.Mock };

  const userId = 1;

  const holding = (overrides: Partial<Holding> = {}): Holding => ({
    stockCode: 'A',
    stockName: '테스트종목',
    quantity: 10,
    avgBuyPrice: 1000,
    currentPrice: 1100,
    totalPurchaseAmount: 10000,
    evaluationAmount: 11000,
    profitAmount: 1000,
    dailyProfitAmount: 100,
    ...overrides,
  });

  beforeEach(() => {
    prisma = { hiddenStock: { findMany: jest.fn().mockResolvedValue([]) } };
    holdingsProvider = { getHoldings: jest.fn().mockResolvedValue([]) };

    service = new AssetHoldingsService(
      prisma as unknown as PrismaService,
      holdingsProvider as unknown as HoldingsProvider,
    );
  });

  it('보유 종목이 없으면 빈 목록과 0 페이지 정보를 반환한다', async () => {
    const result = await service.getHoldings(userId, {});

    expect(result).toEqual({
      items: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
    });
  });

  it('숨김 처리된 종목은 목록에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'B' }),
    ]);
    prisma.hiddenStock.findMany.mockResolvedValue([{ stockCode: 'B' }]);

    const result = await service.getHoldings(userId, {});

    expect(result.items.map((item) => item.stockCode)).toEqual(['A']);
    expect(result.totalElements).toBe(1);
  });

  it('보유 수량이 0인 종목(전량 매도)은 목록에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'C', quantity: 0 }),
    ]);

    const result = await service.getHoldings(userId, {});

    expect(result.items.map((item) => item.stockCode)).toEqual(['A']);
  });

  it('symbol을 지정하면 그 종목만 반환한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'B' }),
    ]);

    const result = await service.getHoldings(userId, { symbol: 'B' });

    expect(result.items.map((item) => item.stockCode)).toEqual(['B']);
    expect(result.totalElements).toBe(1);
  });

  it('page/size로 필터링된 결과를 슬라이싱한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'B' }),
      holding({ stockCode: 'C' }),
    ]);

    const result = await service.getHoldings(userId, { page: 1, size: 1 });

    expect(result.items.map((item) => item.stockCode)).toEqual(['B']);
    expect(result).toMatchObject({
      page: 1,
      size: 1,
      totalElements: 3,
      totalPages: 3,
      hasNext: true,
    });
  });

  it('마지막 페이지에서는 hasNext가 false다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'B' }),
    ]);

    const result = await service.getHoldings(userId, { page: 1, size: 1 });

    expect(result.hasNext).toBe(false);
  });

  it('각 항목의 평가금액·평가손익·수익률을 계산한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({
        stockCode: 'A',
        quantity: 10,
        avgBuyPrice: 1000,
        currentPrice: 1100,
      }),
    ]);

    const result = await service.getHoldings(userId, {});

    expect(result.items[0]).toMatchObject({
      evaluationAmount: 11000,
      unrealizedProfit: 1000,
      returnRate: 10,
    });
  });
});
