import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetSummaryResponseDto } from '../dto/response/asset-summary-response.dto';
import { getHiddenStockCodes } from './hidden-stock-lookup.util';
import { HoldingsProvider } from './holdings.provider';

/** 명세상 보유 수량이 1주 이상인 종목만 집계에 담는다. */
const MIN_HOLDING_QUANTITY = 1;

@Injectable()
export class AssetSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holdingsProvider: HoldingsProvider,
  ) {}

  /**
   * 사용자의 총 평가금액을 요약한다.
   *
   * 숨김 처리된 종목(만료 안 된 것만)과 전량 매도한 종목(quantity 0)은
   * 집계에서 뺀다. 금액은 HoldingsProvider가 돌려주는 토스 원본 값을
   * 그대로 합산할 뿐, 여기서 다시 계산하지 않는다.
   */
  async getAssetSummary(userId: number): Promise<AssetSummaryResponseDto> {
    const [holdings, hiddenCodes] = await Promise.all([
      this.holdingsProvider.getHoldings(userId),
      getHiddenStockCodes(this.prisma, userId),
    ]);

    const visibleHoldings = holdings.filter(
      (holding) =>
        holding.quantity >= MIN_HOLDING_QUANTITY &&
        !hiddenCodes.has(holding.stockCode),
    );

    const totalEvaluationAmount = visibleHoldings.reduce(
      (sum, holding) => sum + holding.evaluationAmount,
      0,
    );

    return { totalEvaluationAmount };
  }
}
