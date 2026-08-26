import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exception/businessException';
import { MarketsErrorCode } from '../error/markets-error-code';
import { MOCK_STOCKS } from '../constant';

@Injectable()
export class MarketsService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 실제로 존재하는 종목인지 Mock 데이터 검증
    const stockName = MOCK_STOCKS[stockCode];
    if (!stockName) {
      throw new BusinessException(MarketsErrorCode.NOT_FOUND_STOCK);
    }

    // 숨기지 않은 정상 종목에 대해 종목 정보 반환
    return {
      symbol: stockCode,
      name: stockName,
      isHidden: false,
    };
  }
}
