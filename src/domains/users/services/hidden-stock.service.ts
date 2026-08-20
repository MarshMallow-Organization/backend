import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostHiddenStockDto } from '../dto/request/post-hidden-stock.dto';
import { BusinessException } from 'src/common/exception/businessException';
import { TossApiService } from 'src/domains/api/toss-api.service';
import { MarketsErrorCode } from 'src/domains/markets/markets-error-code';
import { HiddenStockErrorCode } from '../error/hidden-stock-error-code';

@Injectable()
export class HiddenStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tossApiService: TossApiService,
  ) {}

  async hideStock(userId: number, dto: PostHiddenStockDto) {
    // 실제로 있는 종목인지 확인
    const existingStock = await this.tossApiService.getStockfromToss(
      dto.stockCode,
    );

    if (existingStock.result.length === 0) {
      throw new BusinessException(MarketsErrorCode.NOT_FOUND_STOCK);
    }

    // 이미 숨김처리인지 확인
    const existingHiddenstock = await this.prisma.hiddenStock.findUnique({
      where: {
        userId_stockCode: {
          userId,
          stockCode: dto.stockCode,
        },
      },
    });

    if (existingHiddenstock) {
      throw new BusinessException(HiddenStockErrorCode.CONFLICT);
    }

    // hiddenUntil이 현재시각 이후인지 확인
    const now = new Date();
    const hiddenUntil = new Date(dto.hiddenUntil);

    if (hiddenUntil <= now) {
      throw new BusinessException(HiddenStockErrorCode.HIDDEN_UNTIL_IN_PAST);
    }

    // 테이블에 숨김정보 생성
    const stock = existingStock.result[0];
    const createHiddenStock = await this.prisma.hiddenStock.create({
      data: {
        userId,
        stockCode: dto.stockCode,
        stockName: stock.name,
        hiddenUntil,
      },
    });

    return {
      stockCode: createHiddenStock.stockCode,
      stockName: createHiddenStock.stockName,
      hiddenAt: createHiddenStock.createdAt,
      hiddenUntil: createHiddenStock.hiddenUntil,
    };
  }

  async getHiddenStock() {}
  async patchHiddenStock() {}
  async deleteHiddenStock() {}
}
