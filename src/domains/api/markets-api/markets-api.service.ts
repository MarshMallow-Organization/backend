import { Injectable } from '@nestjs/common';
import { TossClient } from '../clients/toss/toss.client';
import type { TossStockResponse } from '../clients/toss/toss.types';
import type { MarketsStockApiDto } from './markets-api.dto';

@Injectable()
export class MarketsApiService {
  constructor(private readonly tossClient: TossClient) {}

  async getStock(stockCode: string): Promise<MarketsStockApiDto | null> {
    const response = await this.tossClient.request<TossStockResponse>(
      `/stocks?symbols=${encodeURIComponent(stockCode)}`,
      { method: 'GET' },
    );

    const stock = response.result[0];

    if (!stock) {
      return null;
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
      koreanMarketDetail: stock.koreanMarketDetail
        ? {
            ...stock.koreanMarketDetail,
            nxtTradingSuspended:
              stock.koreanMarketDetail.nxtTradingSuspended ?? null,
          }
        : null,
    };
  }
}
