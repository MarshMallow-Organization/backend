import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

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

    // TODO: 시세/종목 연동 담당자가 API 연동 추가 예정
    return {
      symbol: stockCode,
      name: stockCode === '005930' ? '삼성전자' : `종목_${stockCode}`,
      isHidden: false,
    };
  }
}
