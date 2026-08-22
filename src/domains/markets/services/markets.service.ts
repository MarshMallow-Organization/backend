import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { TossClient } from 'src/domains/api/clients/toss/toss.client';
import { MarketsErrorCode } from 'src/domains/markets/error/markets-error-code';

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tossClient: TossClient,
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
    const existingStock = await this.tossClient.getStock(stockCode);

    if (existingStock.result.length === 0) {
      throw new BusinessException(MarketsErrorCode.NOT_FOUND_STOCK);
    }

    const resultstock = existingStock.result[0];

    // 숨기지 않은 종목에 대해 종목 정보를 반환
    return {
      symbol: resultstock.symbol,
      name: resultstock.name,
      isHidden: false,
    };
  }
}
