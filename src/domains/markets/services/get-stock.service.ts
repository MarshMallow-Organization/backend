import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { TossApiService } from 'src/domains/api/toss-api.service';
import { MarketsErrorCode } from 'src/domains/markets/markets-error-code';

@Injectable()
export class GetStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tossApiService: TossApiService,
  ) {}

  async getStock(userId: number, symbol: string) {
    // 해당 종목이 숨김 상태인지 확인
    const existingHiddenstock = await this.prisma.hiddenStock.findUnique({
      where: {
        userId_stockCode: {
          userId,
          stockCode: symbol,
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
    const existingStock = await this.tossApiService.getStockfromToss(symbol);

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
}
