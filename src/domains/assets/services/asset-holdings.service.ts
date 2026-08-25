import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetHoldingsQueryDto } from '../dto/request/get-holdings-query.dto';
import { GetHoldingsResponseDto } from '../dto/response/get-holdings-response.dto';
import { getHiddenStockCodes } from './hidden-stock-lookup.util';
import { enrichHolding } from './holding.util';
import { HoldingsProvider } from './holdings.provider';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;

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
   * 빼고, symbol이 오면 그 종목 하나로 더 좁힌다. 필터링된 결과를
   * 기준으로 페이지를 나눈다.
   */
  async getHoldings(
    userId: number,
    query: GetHoldingsQueryDto,
  ): Promise<GetHoldingsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const size = query.size ?? DEFAULT_SIZE;

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

    const totalElements = visibleHoldings.length;
    const totalPages = Math.ceil(totalElements / size);

    const items = visibleHoldings
      .slice(page * size, page * size + size)
      .map(enrichHolding);

    return {
      items,
      page,
      size,
      totalElements,
      totalPages,
      hasNext: page + 1 < totalPages,
    };
  }
}
