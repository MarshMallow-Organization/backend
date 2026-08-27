import { PrismaService } from 'src/prisma/prisma.service';
import { AssetSummaryService } from './asset-summary.service';
import { Holding, HoldingsProvider } from './holdings.provider';

describe('AssetSummaryService', () => {
  let service: AssetSummaryService;
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

    service = new AssetSummaryService(
      prisma as unknown as PrismaService,
      holdingsProvider as unknown as HoldingsProvider,
    );
  });

  it('보유 종목이 없으면 전부 0을 반환한다', async () => {
    const result = await service.getAssetSummary(userId);

    expect(result).toEqual({
      totalPurchaseAmount: 0,
      totalEvaluationAmount: 0,
      totalProfitAmount: 0,
      totalProfitRate: 0,
      dailyProfitAmount: 0,
      dailyProfitRate: 0,
      hiddenStockCount: 0,
    });
  });

  it('숨김 처리된 종목은 집계에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({
        stockCode: 'B',
        totalPurchaseAmount: 5000,
        evaluationAmount: 4000,
        profitAmount: -1000,
        dailyProfitAmount: -100,
      }),
    ]);
    prisma.hiddenStock.findMany.mockResolvedValue([{ stockCode: 'B' }]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalPurchaseAmount).toBe(10000);
    expect(result.totalEvaluationAmount).toBe(11000);
    expect(result.hiddenStockCount).toBe(1);
  });

  it('보유 수량이 0인 종목(전량 매도)은 집계에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A' }),
      holding({ stockCode: 'C', quantity: 0, totalPurchaseAmount: 999999 }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalPurchaseAmount).toBe(10000);
  });

  it('userId와 만료되지 않은 숨김 조건으로 조회한다', async () => {
    await service.getAssetSummary(userId);

    const [callArgs] = prisma.hiddenStock.findMany.mock.calls[0] as [
      { where: { userId: number; hiddenUntil: { gt: Date } } },
    ];

    expect(callArgs.where.userId).toBe(userId);
    expect(callArgs.where.hiddenUntil.gt).toBeInstanceOf(Date);
  });

  it('totalPurchaseAmount가 0이면 totalProfitRate는 0이다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ totalPurchaseAmount: 0, evaluationAmount: 0, profitAmount: 0 }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalProfitRate).toBe(0);
  });

  it('전일 평가금액이 0 이하이면 dailyProfitRate는 0이다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ evaluationAmount: 100, dailyProfitAmount: 100 }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.dailyProfitRate).toBe(0);
  });

  it('정상 케이스에서 비율을 퍼센트로 정확히 계산한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({
        totalPurchaseAmount: 10000,
        evaluationAmount: 11000,
        profitAmount: 1000,
        dailyProfitAmount: 100,
      }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalProfitRate).toBe(10); // 1000 / 10000 * 100
    expect(result.dailyProfitRate).toBeCloseTo(0.92, 2); // 100 / (11000-100) * 100
  });
});
