import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetSummaryResponseDto } from '../dto/response/asset-summary-response.dto';
import { HoldingsProvider } from './holdings.provider';
import { toPercent } from './money.util';

/** 명세상 보유 수량이 1주 이상인 종목만 집계에 담는다. */
const MIN_HOLDING_QUANTITY = 1;

@Injectable()
export class AssetSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holdingsProvider: HoldingsProvider,
  ) {}

  /**
   * 사용자의 전체 자산을 요약한다.
   *
   * 숨김 처리된 종목(만료 안 된 것만)과 전량 매도한 종목(quantity 0)은
   * 집계에서 뺀다. 금액은 HoldingsProvider가 돌려주는 토스 원본 값을
   * 그대로 합산할 뿐, 여기서 다시 계산하지 않는다.
   */
  async getAssetSummary(userId: number): Promise<AssetSummaryResponseDto> {
    const [holdings, hiddenStocks] = await Promise.all([
      this.holdingsProvider.getHoldings(userId),
      this.prisma.hiddenStock.findMany({
        where: { userId, hiddenUntil: { gt: new Date() } },
        select: { stockCode: true },
      }),
    ]);

    const hiddenCodes = new Set(hiddenStocks.map((row) => row.stockCode));

    const visibleHoldings = holdings.filter(
      (holding) =>
        holding.quantity >= MIN_HOLDING_QUANTITY &&
        !hiddenCodes.has(holding.stockCode),
    );

    const totalPurchaseAmount = visibleHoldings.reduce(
      (sum, holding) => sum + holding.totalPurchaseAmount,
      0,
    );
    const totalEvaluationAmount = visibleHoldings.reduce(
      (sum, holding) => sum + holding.evaluationAmount,
      0,
    );
    const totalProfitAmount = visibleHoldings.reduce(
      (sum, holding) => sum + holding.profitAmount,
      0,
    );
    const dailyProfitAmount = visibleHoldings.reduce(
      (sum, holding) => sum + holding.dailyProfitAmount,
      0,
    );

    const totalProfitRate =
      totalPurchaseAmount > 0
        ? toPercent(totalProfitAmount / totalPurchaseAmount)
        : 0;

    /**
     * 일간 손익은 전일 종가 대비 오늘의 변화다. 전일 평가금액을 별도로
     * 갖고 있지 않으니, 오늘 평가금액에서 오늘의 변화분을 빼서 역산한다.
     */
    const previousEvaluationAmount = totalEvaluationAmount - dailyProfitAmount;
    const dailyProfitRate =
      previousEvaluationAmount > 0
        ? toPercent(dailyProfitAmount / previousEvaluationAmount)
        : 0;

    return {
      totalPurchaseAmount,
      totalEvaluationAmount,
      totalProfitAmount,
      totalProfitRate,
      dailyProfitAmount,
      dailyProfitRate,
      hiddenStockCount: hiddenCodes.size,
    };
  }
}
