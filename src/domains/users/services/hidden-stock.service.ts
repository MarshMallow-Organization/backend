import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostHiddenStockDto } from '../dto/request/post-hidden-stock.dto';
import { BusinessException } from 'src/common/exception/businessException';
import { HiddenStockErrorCode } from '../error/hidden-stock-error-code';

@Injectable()
export class HiddenStockService {
  constructor(private readonly prisma: PrismaService) {}

  async hideStock(userId: number, dto: PostHiddenStockDto) {
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

    // 테이블에 숨김정보 생성 (TODO: 추후 종목 API 연동 담당자가 실제 종목명 매핑 예정)
    const defaultStockName =
      dto.stockCode === '005930' ? '삼성전자' : `종목_${dto.stockCode}`;

    const createHiddenStock = await this.prisma.hiddenStock.create({
      data: {
        userId,
        stockCode: dto.stockCode,
        stockName: defaultStockName,
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
