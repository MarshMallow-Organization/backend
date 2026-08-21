import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import {
  isPrismaError,
  PrismaErrorCode,
} from 'src/common/exception/prismaError.util';
import { CustomLogger } from 'src/common/logger/customLogger';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFavoriteStockDto } from '../dto/request/create-favorite-stock.dto';
import { FavoriteStockItemDto } from '../dto/response/favorite-stock-item.dto';
import { FavoriteStockListResponseDto } from '../dto/response/favorite-stock-list-response.dto';
import { FavoriteStockStatusResponseDto } from '../dto/response/favorite-stock-status-response.dto';
import { RemoveFavoriteStockResponseDto } from '../dto/response/remove-favorite-stock-response.dto';
import { FavoriteStocksErrorCode } from '../error/favorite-stocks.error';

const ITEM_SELECT = {
  id: true,
  stockCode: true,
  stockName: true,
  createdAt: true,
} as const;

/**
 * Prisma가 돌려주는 행에서 응답 DTO로 옮긴다.
 *
 * market은 컬럼이 없어 항상 null이다. 명세가 필드 존재를 보장하므로
 * 여기서 상수로 채운다. 종목 조회 서비스가 연동되면 이 자리가 바뀐다.
 */
const toItem = (row: {
  id: number;
  stockCode: string;
  stockName: string;
  createdAt: Date;
}): FavoriteStockItemDto => ({
  id: row.id,
  stockCode: row.stockCode,
  stockName: row.stockName,
  market: null,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class FavoriteStocksService {
  private readonly logger = new CustomLogger(FavoriteStocksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자의 관심종목 목록을 조회한다.
   *
   * 명세대로 최근 등록 순으로 정렬한다. createdAt이 같은 행이 나올 수 있어
   * (같은 초에 여러 건 등록) id를 타이브레이크로 둬야 순서가 안정적이다.
   */
  async findFavoriteStocks(
    userId: number,
  ): Promise<FavoriteStockListResponseDto> {
    const favoriteStocks = await this.prisma.favoriteStock.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: ITEM_SELECT,
    });

    return { favoriteStocks: favoriteStocks.map(toItem) };
  }

  /**
   * 관심종목을 등록한다.
   *
   * 중복은 UNIQUE(user_id, stock_code)가 최종 방어선이지만, 사전 조회로
   * 먼저 판정해야 명세가 요구하는 도메인 문구가 나간다. 그냥 create하면
   * PrismaExceptionFilter가 DB_UNIQUE_CONSTRAINT를 먼저 돌려준다.
   *
   * 사전 조회와 create 사이에는 경쟁 상태가 남지만 트랜잭션으로 묶어도
   * 막히지 않는다(REPEATABLE READ에서 팬텀은 그대로다). 아래 catch가
   * P2002를 같은 도메인 에러로 바꿔주므로 결과는 동일하다.
   */
  async createFavoriteStock(
    userId: number,
    dto: CreateFavoriteStockDto,
  ): Promise<FavoriteStockItemDto> {
    const duplicated = await this.prisma.favoriteStock.findUnique({
      where: {
        userId_stockCode: { userId, stockCode: dto.stockCode },
      },
      select: { id: true },
    });

    if (duplicated) {
      throw new BusinessException(
        FavoriteStocksErrorCode.FAVORITE_STOCK_ALREADY_EXISTS,
        { userId, stockCode: dto.stockCode },
      );
    }

    try {
      const created = await this.prisma.favoriteStock.create({
        data: {
          userId,
          stockCode: dto.stockCode,
          stockName: dto.stockName,
        },
        select: ITEM_SELECT,
      });

      this.logger.info('관심종목을 등록했습니다', {
        labels: {
          favorite_stock_id: created.id,
          stock_code: created.stockCode,
          user_id: userId,
        },
      });

      return toItem(created);
    } catch (error) {
      /** 동시 요청으로 사전 조회를 통과했더라도 UNIQUE 제약이 잡아준다. */
      if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
        throw new BusinessException(
          FavoriteStocksErrorCode.FAVORITE_STOCK_ALREADY_EXISTS,
          { userId, stockCode: dto.stockCode },
        );
      }

      throw error;
    }
  }

  /**
   * 특정 종목이 관심종목으로 등록됐는지 조회한다.
   *
   * 종목 상세 화면의 하트 상태를 그리는 용도라 미등록도 404가 아니라
   * 200이다. 프론트가 404를 에러로 처리하면 안 된다.
   */
  async findFavoriteStockStatus(
    userId: number,
    stockCode: string,
  ): Promise<FavoriteStockStatusResponseDto> {
    const favoriteStock = await this.prisma.favoriteStock.findUnique({
      where: { userId_stockCode: { userId, stockCode } },
      select: ITEM_SELECT,
    });

    return {
      isFavorite: favoriteStock !== null,
      favoriteStock: favoriteStock ? toItem(favoriteStock) : null,
    };
  }

  /**
   * 관심종목을 해제한다.
   *
   * delete가 아니라 deleteMany를 쓴다. delete는 대상이 없을 때 P2025를
   * 던지고, 그러면 PrismaExceptionFilter가 DB_RECORD_NOT_FOUND를 먼저
   * 돌려줘 명세가 요구하는 FAVORITE_STOCK_NOT_FOUND가 나가지 않는다.
   *
   * where에 userId를 함께 걸어서 남의 관심종목은 애초에 지워지지 않는다.
   * 없는 종목과 남의 종목이 같은 404가 되는데, 403으로 나누면 남이
   * 무엇을 등록했는지가 드러나므로 의도한 동작이다.
   */
  async removeFavoriteStock(
    userId: number,
    stockCode: string,
  ): Promise<RemoveFavoriteStockResponseDto> {
    const { count } = await this.prisma.favoriteStock.deleteMany({
      where: { userId, stockCode },
    });

    if (count === 0) {
      throw new BusinessException(
        FavoriteStocksErrorCode.FAVORITE_STOCK_NOT_FOUND,
        { userId, stockCode },
      );
    }

    this.logger.info('관심종목을 해제했습니다', {
      labels: { stock_code: stockCode, user_id: userId },
    });

    return { stockCode, removed: true };
  }
}
