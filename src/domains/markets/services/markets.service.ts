import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { TossApiService } from 'src/domains/api/toss-api.service';
import { MarketsErrorCode } from 'src/domains/markets/error/markets-error-code';
import { GetStockRankingsQueryDto } from '../dto/get-stock-ranking.dto';

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tossApiService: TossApiService,
  ) {}

  async getStock(userId: number, stockCode: string) {
    // 해당 종목이 숨김 상태인지 확인
    const existingHiddenstock = await this.prisma.hiddenStock.findUnique({
      where: {
        userId_stockCode: {
          userId,
          stockCode,
        },
      },
    });

    if (existingHiddenstock) {
      const now = new Date();
      const hiddenUntil = new Date(existingHiddenstock.hiddenUntil);

      if (hiddenUntil > now) {
        // 숨김 종목 존재 시 반환
        return {
          symbol: existingHiddenstock.stockCode,
          name: existingHiddenstock.stockName,
          message: '숨김 처리된 종목입니다.',
          hiddenUntil: existingHiddenstock.hiddenUntil,
          isHidden: true,
        };
      }
    }

    // 실제로 존재하는 종목인지 확인
    const existingStock = await this.tossApiService.getStockfromToss(stockCode);

    if (existingStock.result.length === 0) {
      throw new BusinessException(MarketsErrorCode.NOT_FOUND_STOCK);
    }

    const resultstock = existingStock.result[0];

    // 숨기지 않은 종목에 대해 종목 정보를 반환
    return {
      symbol: resultstock.symbol,
      name: resultstock.name,
      englishName: resultstock.englishName,
      isinCode: resultstock.isinCode,
      market: resultstock.market,
      securityType: resultstock.securityType,
      isCommonShare: resultstock.isCommonShare,
      status: resultstock.status,
      currency: resultstock.currency,
      listDate: resultstock.listDate,
      delistDate: resultstock.delistDate,
      sharesOutstanding: resultstock.sharesOutstanding,
      leverageFactor: resultstock.leverageFactor,
      koreanMarketDetail: resultstock.koreanMarketDetail,
      isHidden: false,
    };
  }

  async getStockRanking(userId: number, query: GetStockRankingsQueryDto) {
    // 토스 api에 query.type 값을 매핑
    const rankingTypeMap = {
      amount: 'MARKET_TRADING_AMOUNT',
      volume: 'MARKET_TRADING_VOLUME',
      gainers: 'TOP_GAINERS',
      losers: 'TOP_LOSERS',
    } as const;
    // 쿼리 파라미터를 가지고 토스의 랭킹 조회 api를 호출
    const stockRannking = await this.tossApiService.getRanking(
      query.marketCountry,
      query.type,
      query.duration,
      query.count,
    );
    // 
    // 목록의 종목 코드와 사용자의 숨김 목록을 확인하여 같은게 있을 경우 패스 및 개수 카운트
  }
}
