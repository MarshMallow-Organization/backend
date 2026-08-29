import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetHoldingsQueryDto } from '../dto/request/get-holdings-query.dto';
import { GetHoldingsResponseDto } from '../dto/response/get-holdings-response.dto';
import { HoldingItemDto } from '../dto/response/holding-item.dto';
import { getHiddenStockCodes } from './hidden-stock-lookup.util';
import { Holding, HoldingsProvider } from './holdings.provider';

/** 명세상 보유 수량이 1주 이상인 종목만 응답에 담는다. */
const MIN_HOLDING_QUANTITY = 1;

@Injectable()
export class AssetHoldingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holdingsProvider: HoldingsProvider,
  ) {}

  /**
   * 보유 종목 상세 목록을 조회한다.
   *
   * 숨김 처리된 종목(만료 안 된 것만)과 전량 매도한 종목(quantity 0)은
   * 빼고, symbol이 오면 그 종목 하나로 더 좁힌다. 화면이 페이지 버튼
   * 없이 스크롤로 전부 보여주는 구조라 페이지네이션 없이 전체를
   * 그대로 돌려준다.
   */
  async getHoldings(
    userId: number,
    query: GetHoldingsQueryDto,
  ): Promise<GetHoldingsResponseDto> {
    const [holdings, hiddenCodes] = await Promise.all([
      this.holdingsProvider.getHoldings(userId),
      getHiddenStockCodes(this.prisma, userId),
    ]);

    const visibleHoldings = holdings.filter(
      (holding) =>
        holding.quantity >= MIN_HOLDING_QUANTITY &&
        !hiddenCodes.has(holding.stockCode) &&
        (query.symbol === undefined || holding.stockCode === query.symbol),
    );

    return { items: visibleHoldings.map(toHoldingItem) };
  }
}

/**
 * 화면에 필요한 종목명·평가금액만 골라 담는다.
 *
 * evaluationAmount는 Holding에 토스 marketValue.amount.krw로 이미 들어
 * 있어(holdings.provider.ts) 여기서 다시 계산하지 않는다.
 */
function toHoldingItem(holding: Holding): HoldingItemDto {
  return {
    stockName: holding.stockName,
    evaluationAmount: holding.evaluationAmount,
  };
}
