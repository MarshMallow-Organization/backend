import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import type { MarketsStockMarket } from 'src/domains/api/markets-api/markets-api.dto';
import { MarketsApiService } from 'src/domains/api/markets-api/markets-api.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetStockResponseDto } from '../dto/response/get-stock-response.dto';
import { MarketsErrorCode } from '../error/markets-error-code';

const STOCK_SYNC_BATCH_SIZE = 100;

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketsApiService: MarketsApiService,
  ) {}

  async syncStocksByMarket(market: MarketsStockMarket): Promise<{
    market: MarketsStockMarket;
    syncedCount: number;
    deactivatedCount: number;
  }> {
    const stocks = await this.marketsApiService.getStocksByMarket(market);

    if (stocks.length === 0) {
      return { market, syncedCount: 0, deactivatedCount: 0 };
    }

    const syncedAt = new Date();

    for (let index = 0; index < stocks.length; index += STOCK_SYNC_BATCH_SIZE) {
      const batch = stocks.slice(index, index + STOCK_SYNC_BATCH_SIZE);
      const upserts = batch.map((stock) =>
        this.prisma.stock.upsert({
          where: { stockCode: stock.stockCode },
          create: {
            stockCode: stock.stockCode,
            name: stock.name,
            market: stock.market,
            securityType: stock.securityType,
            isCommonShare: stock.isCommonShare,
            isinCode: stock.isinCode,
            isActive: true,
            lastSyncedAt: syncedAt,
          },
          update: {
            name: stock.name,
            market: stock.market,
            securityType: stock.securityType,
            isCommonShare: stock.isCommonShare,
            isinCode: stock.isinCode,
            isActive: true,
            lastSyncedAt: syncedAt,
          },
        }),
      );

      await this.prisma.$transaction(upserts);
    }

    const { count: deactivatedCount } = await this.prisma.stock.updateMany({
      where: {
        market,
        lastSyncedAt: { lt: syncedAt },
      },
      data: { isActive: false },
    });

    return {
      market,
      syncedCount: stocks.length,
      deactivatedCount,
    };
  }

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
