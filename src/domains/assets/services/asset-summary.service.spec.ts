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

  it('보유 종목이 없으면 0을 반환한다', async () => {
    const result = await service.getAssetSummary(userId);

    expect(result).toEqual({ totalEvaluationAmount: 0 });
  });

  it('숨김 처리된 종목은 집계에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', evaluationAmount: 11000 }),
      holding({ stockCode: 'B', evaluationAmount: 4000 }),
    ]);
    prisma.hiddenStock.findMany.mockResolvedValue([{ stockCode: 'B' }]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalEvaluationAmount).toBe(11000);
  });

  it('보유 수량이 0인 종목(전량 매도)은 집계에서 제외한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', evaluationAmount: 11000 }),
      holding({ stockCode: 'C', quantity: 0, evaluationAmount: 999999 }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalEvaluationAmount).toBe(11000);
  });

  it('여러 종목의 평가금액을 합산한다', async () => {
    holdingsProvider.getHoldings.mockResolvedValue([
      holding({ stockCode: 'A', evaluationAmount: 11000 }),
      holding({ stockCode: 'B', evaluationAmount: 4000 }),
    ]);

    const result = await service.getAssetSummary(userId);

    expect(result.totalEvaluationAmount).toBe(15000);
  });

  it('userId와 만료되지 않은 숨김 조건으로 조회한다', async () => {
    await service.getAssetSummary(userId);

    const [callArgs] = prisma.hiddenStock.findMany.mock.calls[0] as [
      { where: { userId: number; hiddenUntil: { gt: Date } } },
    ];

    expect(callArgs.where.userId).toBe(userId);
    expect(callArgs.where.hiddenUntil.gt).toBeInstanceOf(Date);
  });
});
