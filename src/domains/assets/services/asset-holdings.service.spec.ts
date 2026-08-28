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

  it('보유 종목이 없으면 빈 목록을 반환한다', async () => {
    const result = await service.getHoldings(userId, {});

    expect(result).toEqual({ items: [] });
  });

  it('각 항목은 종목명과 평가금액만 담는다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockName: '삼성전자', evaluationAmount: 7200000 }),
    ]);

    const result = await service.getHoldings(userId, {});

    expect(result.items).toEqual([
      { stockName: '삼성전자', evaluationAmount: 7200000 },
    ]);
  });

  it('페이지 구분 없이 보유 종목 전체를 한 번에 반환한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', stockName: '종목A' }),
      holding({ stockCode: 'B', stockName: '종목B' }),
      holding({ stockCode: 'C', stockName: '종목C' }),
    ]);

    const result = await service.getHoldings(userId, {});

    expect(result.items.map((item) => item.stockName)).toEqual([
      '종목A',
      '종목B',
      '종목C',
    ]);
  });

  it('숨김 처리된 종목은 목록에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', stockName: '보이는종목' }),
      holding({ stockCode: 'B', stockName: '숨긴종목' }),
    ]);
    prisma.hiddenStock.findMany.mockResolvedValue([{ stockCode: 'B' }]);

    const result = await service.getHoldings(userId, {});

    expect(result.items.map((item) => item.stockName)).toEqual(['보이는종목']);
  });

  it('보유 수량이 0인 종목(전량 매도)은 목록에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', stockName: '보유중' }),
      holding({ stockCode: 'C', stockName: '전량매도', quantity: 0 }),
    ]);

    const result = await service.getHoldings(userId, {});

    expect(result.items.map((item) => item.stockName)).toEqual(['보유중']);
  });

  it('symbol을 지정하면 그 종목만 반환한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', stockName: '종목A' }),
      holding({ stockCode: 'B', stockName: '종목B' }),
    ]);

    const result = await service.getHoldings(userId, { symbol: 'B' });

    expect(result.items.map((item) => item.stockName)).toEqual(['종목B']);
  });
});
