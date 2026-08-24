import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import { MarketsApiService } from 'src/domains/api/markets-api/markets-api.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetStockResponseDto } from '../dto/response/get-stock-response.dto';
import { MarketsErrorCode } from '../error/markets-error-code';

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketsApiService: MarketsApiService,
  ) {}

  async getStock(
    userId: number,
    stockCode: string,
  ): Promise<GetStockResponseDto> {
    const existingHiddenStock = await this.prisma.hiddenStock.findUnique({
      where: {
        userId_stockCode: {
          userId,
          stockCode,
        },
      },
    });

    if (existingHiddenStock) {
      const now = new Date();
      const hiddenUntil = new Date(existingHiddenStock.hiddenUntil);

      if (hiddenUntil > now) {
        return {
          symbol: existingHiddenStock.stockCode,
          name: existingHiddenStock.stockName,
          message: '숨김 처리된 종목입니다.',
          hiddenUntil: existingHiddenStock.hiddenUntil.toISOString(),
          isHidden: true as const,
        };
      }
    }

    const stock = await this.marketsApiService.getStock(stockCode);

    if (!stock) {
      throw new BusinessException(MarketsErrorCode.NOT_FOUND_STOCK);
    }

    return {
      symbol: stock.symbol,
      name: stock.name,
      englishName: stock.englishName,
      isinCode: stock.isinCode,
      market: stock.market,
      securityType: stock.securityType,
      isCommonShare: stock.isCommonShare,
      status: stock.status,
      currency: stock.currency,
      listDate: stock.listDate,
      delistDate: stock.delistDate,
      sharesOutstanding: stock.sharesOutstanding,
      leverageFactor: stock.leverageFactor,
      koreanMarketDetail: stock.koreanMarketDetail,
      isHidden: false as const,
    };
  }
}
