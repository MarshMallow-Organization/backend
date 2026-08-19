import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import {
  isPrismaError,
  PrismaErrorCode,
} from 'src/common/exception/prismaError.util';
import { CustomLogger } from 'src/common/logger/customLogger';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddPortfolioStockDto } from '../dto/request/add-portfolio-stock.dto';
import { CreatePortfolioDto } from '../dto/request/create-portfolio.dto';
import { ReorderPortfoliosDto } from '../dto/request/reorder-portfolios.dto';
import { UpdatePortfolioNameDto } from '../dto/request/update-portfolio-name.dto';
import { PortfolioDeletedDto } from '../dto/response/portfolio-deleted.dto';
import { PortfolioListResponseDto } from '../dto/response/portfolio-list-response.dto';
import { PortfolioNameUpdatedDto } from '../dto/response/portfolio-name-updated.dto';
import { PortfolioStockAddedDto } from '../dto/response/portfolio-stock-added.dto';
import { PortfolioStockRemovedDto } from '../dto/response/portfolio-stock-removed.dto';
import { PortfolioSummaryDto } from '../dto/response/portfolio-summary.dto';
import { PortfoliosErrorCode } from '../portfolios.error';

/** 사용자당 가상계좌는 최대 4개. */
const MAX_PORTFOLIO_COUNT = 4;

/** Prisma가 돌려주는 행에서 응답 DTO로 옮긴다. createdAt만 문자열로 바꾼다. */
const toSummary = (row: {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: Date;
}): PortfolioSummaryDto => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
});

const SUMMARY_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  createdAt: true,
} as const;

@Injectable()
export class PortfoliosService {
  private readonly logger = new CustomLogger(PortfoliosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자의 가상계좌 목록을 조회한다.
   *
   * 명세대로 기본 정보만 내려주고 보유 종목은 포함하지 않는다.
   * 종목이 필요하면 단건 조회 API를 쓴다.
   */
  async findPortfolios(userId: number): Promise<PortfolioListResponseDto> {
    const portfolios = await this.prisma.virtualPortfolio.findMany({
      where: { userId },

      /** 사용자가 정한 순서. 같으면 만든 순서(id)로 안정적으로 정렬한다. */
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],

      select: SUMMARY_SELECT,
    });

    return {
      portfolios: portfolios.map(toSummary),

      /** 목록이 비어 있어도 항상 내려준다. 프론트가 '추가' 버튼을 막는 기준. */
      maxCount: MAX_PORTFOLIO_COUNT,
    };
  }

  /**
   * 가상계좌를 생성한다.
   *
   * 개수 제한과 이름 중복을 확인한 뒤 sortOrder를 최대값 + 1로 매긴다.
   *
   * ⚠️ 개수 제한에는 경쟁 상태가 남아 있다. count는 행을 잠그지 않으므로
   * 동시 요청 둘이 각자 3을 세고 둘 다 통과할 수 있다($transaction으로
   * 묶어도 REPEATABLE READ에서는 막히지 않는다). 최악이 5개가 되는
   * UX 상한 초과라 데이터가 깨지지는 않아 지금은 감수한다. 엄밀히 막으려면
   * 트랜잭션 안에서 user 행을 SELECT ... FOR UPDATE로 잠가야 한다.
   *
   * 이름 중복은 사정이 다르다. 사전 조회가 뚫려도 UNIQUE(user_id, name)가
   * 최종 방어선이라 아래 catch에서 P2002를 도메인 에러로 바꿔준다.
   */
  async createPortfolio(
    userId: number,
    dto: CreatePortfolioDto,
  ): Promise<PortfolioSummaryDto> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const count = await tx.virtualPortfolio.count({ where: { userId } });

        if (count >= MAX_PORTFOLIO_COUNT) {
          throw new BusinessException(
            PortfoliosErrorCode.PORTFOLIO_LIMIT_EXCEEDED,
            { userId, count },
          );
        }

        /**
         * 사전 조회로 판정해야 도메인 문구가 나간다. 그냥 create하면
         * PrismaExceptionFilter가 DB_UNIQUE_CONSTRAINT를 먼저 돌려준다.
         */
        const duplicated = await tx.virtualPortfolio.findUnique({
          where: { userId_name: { userId, name: dto.name } },
          select: { id: true },
        });

        if (duplicated) {
          throw new BusinessException(
            PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
            { userId, name: dto.name },
          );
        }

        /** 0-base. 첫 계좌는 0이 된다. */
        const last = await tx.virtualPortfolio.findFirst({
          where: { userId },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true },
        });

        return tx.virtualPortfolio.create({
          data: {
            userId,
            name: dto.name,
            sortOrder: (last?.sortOrder ?? -1) + 1,
          },
          select: SUMMARY_SELECT,
        });
      });

      this.logger.info('가상계좌를 생성했습니다', {
        labels: { portfolio_id: created.id, user_id: userId },
      });

      return toSummary(created);
    } catch (error) {
      /** 동시 요청으로 사전 검사를 통과했더라도 UNIQUE 제약이 잡아준다. */
      if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
        throw new BusinessException(
          PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
          { userId, name: dto.name },
        );
      }

      throw error;
    }
  }

  /**
   * 가상계좌 순서를 변경한다.
   *
   * 이동 명령이 아니라 결과 상태 전체를 받는다. 요청 배열의 인덱스를 그대로
   * sortOrder로 재할당하므로, 프론트는 드래그가 끝난 목록을 그대로 보내면 된다.
   *
   * 셋 중 하나라도 어긋나면 PORTFOLIO_ORDER_MISMATCH다.
   *   (1) 배열 내 중복  (2) 사용자 소유가 아닌 ID  (3) 보유 개수와 불일치
   *
   * 셋을 한 코드로 묶은 이유가 있다. 나누면 "없는 ID"와 "남의 ID"를 응답으로
   * 구분할 수 있게 되어, 남의 계좌 존재 여부를 캐낼 수 있다.
   *
   * 조회부터 갱신까지 한 트랜잭션에 넣는다. 검사 후 갱신 전에 다른 요청이
   * 계좌를 지우면 개수가 어긋난 채로 갱신될 수 있기 때문이다.
   */
  async reorderPortfolios(
    userId: number,
    dto: ReorderPortfoliosDto,
  ): Promise<PortfolioListResponseDto> {
    const { portfolioIds } = dto;

    const portfolios = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.virtualPortfolio.findMany({
        where: { userId },
        select: { id: true },
      });

      const ownedIds = new Set(owned.map((portfolio) => portfolio.id));
      const requestedIds = new Set(portfolioIds);

      /**
       * Set 크기 비교로 중복을 잡는다. 중복이 있으면 requestedIds가 줄어들어
       * 아래 개수 비교에서도 걸리지만, 의도를 드러내려고 따로 둔다.
       */
      const hasDuplicate = requestedIds.size !== portfolioIds.length;

      const countMismatch = requestedIds.size !== ownedIds.size;

      const hasForeignId = portfolioIds.some((id) => !ownedIds.has(id));

      if (hasDuplicate || countMismatch || hasForeignId) {
        throw new BusinessException(
          PortfoliosErrorCode.PORTFOLIO_ORDER_MISMATCH,
          {
            userId,
            requested: portfolioIds.length,
            owned: ownedIds.size,
          },
        );
      }

      /**
       * UNIQUE 제약이 (userId, name)뿐이라 sortOrder가 잠시 겹쳐도 문제없다.
       * 겹침을 피하려고 임시값으로 밀어두는 2단계 갱신은 필요하지 않다.
       */
      await Promise.all(
        portfolioIds.map((id, index) =>
          tx.virtualPortfolio.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );

      return tx.virtualPortfolio.findMany({
        where: { userId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: SUMMARY_SELECT,
      });
    });

    this.logger.info('가상계좌 순서를 변경했습니다', {
      labels: { user_id: userId, count: portfolioIds.length },
    });

    return {
      portfolios: portfolios.map(toSummary),
      maxCount: MAX_PORTFOLIO_COUNT,
    };
  }

  /**
   * 가상계좌 이름을 변경한다. sortOrder는 건드리지 않는다.
   *
   * 소유권 확인과 이름 중복 확인을 한 트랜잭션에 넣는다. 중복 판정은
   * 생성과 같은 이유로 사전 조회가 필요하다 — 그냥 update하면
   * PrismaExceptionFilter가 DB_UNIQUE_CONSTRAINT를 먼저 돌려준다.
   */
  async updatePortfolioName(
    userId: number,
    portfolioId: number,
    dto: UpdatePortfolioNameDto,
  ): Promise<PortfolioNameUpdatedDto> {
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.findOwnedOrThrow(tx, userId, portfolioId);

        const duplicated = await tx.virtualPortfolio.findUnique({
          where: { userId_name: { userId, name: dto.name } },
          select: { id: true },
        });

        /**
         * 자기 자신은 중복이 아니다. 같은 이름으로 다시 보내는 요청은
         * 성공해야 한다(멱등). id 비교가 없으면 여기서 409가 나간다.
         */
        if (duplicated && duplicated.id !== portfolioId) {
          throw new BusinessException(
            PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
            { userId, name: dto.name },
          );
        }

        return tx.virtualPortfolio.update({
          where: { id: portfolioId },
          data: { name: dto.name },
          select: { id: true, name: true, updatedAt: true },
        });
      });

      this.logger.info('가상계좌 이름을 변경했습니다', {
        labels: { portfolio_id: updated.id, user_id: userId },
      });

      return {
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      /** 동시 요청으로 사전 검사를 통과했더라도 UNIQUE 제약이 잡아준다. */
      if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
        throw new BusinessException(
          PortfoliosErrorCode.PORTFOLIO_NAME_DUPLICATED,
          { userId, name: dto.name },
        );
      }

      /** 소유권 확인과 update 사이에 다른 요청이 지운 경우. */
      if (isPrismaError(error, PrismaErrorCode.RECORD_NOT_FOUND)) {
        throw new BusinessException(PortfoliosErrorCode.PORTFOLIO_NOT_FOUND, {
          userId,
          portfolioId,
        });
      }

      throw error;
    }
  }

  /**
   * 가상계좌를 삭제한다.
   *
   * 소속 종목을 먼저 지운 뒤 계좌를 지운다. 스키마에 onDelete 설정이 없어
   * 기본값 Restrict가 걸리므로, 순서를 지키지 않으면 P2003이 나고
   * PrismaExceptionFilter가 DB_FOREIGN_KEY_CONSTRAINT 409를 돌려준다.
   *
   * 남은 계좌의 sortOrder는 재계산하지 않는다. 0,1,2,3에서 1을 지우면
   * 0,2,3이 되지만 ORDER BY sortOrder, id로 정렬은 정상 동작한다.
   */
  async deletePortfolio(
    userId: number,
    portfolioId: number,
  ): Promise<PortfolioDeletedDto> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.findOwnedOrThrow(tx, userId, portfolioId);

        await tx.virtualPortfolioStock.deleteMany({
          where: { virtualPortfolioId: portfolioId },
        });

        await tx.virtualPortfolio.delete({ where: { id: portfolioId } });
      });

      this.logger.info('가상계좌를 삭제했습니다', {
        labels: { portfolio_id: portfolioId, user_id: userId },
      });

      return { id: portfolioId, deleted: true };
    } catch (error) {
      /** 소유권 확인과 delete 사이에 다른 요청이 먼저 지운 경우. */
      if (isPrismaError(error, PrismaErrorCode.RECORD_NOT_FOUND)) {
        throw new BusinessException(PortfoliosErrorCode.PORTFOLIO_NOT_FOUND, {
          userId,
          portfolioId,
        });
      }

      throw error;
    }
  }

  /**
   * 가상계좌에 종목을 추가한다.
   *
   * 한 종목은 사용자당 하나의 계좌에만 속한다. 가상계좌는 실보유 종목의
   * 분할이라, 같은 종목이 두 계좌에 들어가면 수량·평가손익이 양쪽에
   * 중복 계상되어 계좌별 수익률이 겹친다.
   *
   * 사전 조회가 필수다. P2002는 어느 계좌와 충돌했는지 알려주지 않아
   * UNIQUE 제약만으로는 ALREADY_ADDED와 IN_OTHER_PORTFOLIO를 구분할 수 없다.
   * 제약은 사전 조회와 INSERT 사이의 경쟁 상태 안전망으로 남긴다.
   */
  async addStock(
    userId: number,
    portfolioId: number,
    dto: AddPortfolioStockDto,
  ): Promise<PortfolioStockAddedDto> {
    const { stockCode } = dto;

    try {
      const added = await this.prisma.$transaction(async (tx) => {
        await this.findOwnedOrThrow(tx, userId, portfolioId);

        const existing = await tx.virtualPortfolioStock.findUnique({
          where: { userId_stockCode: { userId, stockCode } },
          select: { virtualPortfolioId: true },
        });

        if (existing) {
          throw new BusinessException(
            existing.virtualPortfolioId === portfolioId
              ? PortfoliosErrorCode.PORTFOLIO_STOCK_ALREADY_ADDED
              : PortfoliosErrorCode.PORTFOLIO_STOCK_IN_OTHER_PORTFOLIO,
            { userId, stockCode, portfolioId },
          );
        }

        return tx.virtualPortfolioStock.create({
          data: { userId, virtualPortfolioId: portfolioId, stockCode },
          select: { createdAt: true },
        });
      });

      this.logger.info('가상계좌에 종목을 추가했습니다', {
        labels: {
          portfolio_id: portfolioId,
          user_id: userId,
          stock_code: stockCode,
        },
      });

      return {
        portfolioId,
        stockCode,
        addedAt: added.createdAt.toISOString(),
      };
    } catch (error) {
      /**
       * 동시 요청으로 사전 조회를 통과한 경우. 이 시점에는 어느 계좌와
       * 충돌했는지 알 수 없어 보수적으로 IN_OTHER_PORTFOLIO를 쓴다.
       */
      if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
        throw new BusinessException(
          PortfoliosErrorCode.PORTFOLIO_STOCK_IN_OTHER_PORTFOLIO,
          { userId, stockCode, portfolioId },
        );
      }

      throw error;
    }
  }

  /**
   * 가상계좌에서 종목을 제거한다. 거래 기록은 영향받지 않는다.
   *
   * 404가 두 종류다. 계좌 자체가 없는 것과 계좌는 있으나 그 종목이 없는 것을
   * 구분해, 프론트가 전자는 목록 새로고침·후자는 무시로 처리할 수 있게 한다.
   *
   * delete가 아니라 deleteMany를 쓴다. delete는 대상이 없을 때 P2025를 던져
   * PrismaExceptionFilter가 DB_RECORD_NOT_FOUND를 먼저 돌려주지만,
   * deleteMany는 count로 판정할 수 있고 userId 조건까지 where에 넣을 수 있다.
   */
  async removeStock(
    userId: number,
    portfolioId: number,
    stockCode: string,
  ): Promise<PortfolioStockRemovedDto> {
    await this.prisma.$transaction(async (tx) => {
      await this.findOwnedOrThrow(tx, userId, portfolioId);

      const { count } = await tx.virtualPortfolioStock.deleteMany({
        where: { userId, virtualPortfolioId: portfolioId, stockCode },
      });

      if (count === 0) {
        throw new BusinessException(
          PortfoliosErrorCode.PORTFOLIO_STOCK_NOT_FOUND,
          { userId, stockCode, portfolioId },
        );
      }
    });

    this.logger.info('가상계좌에서 종목을 제거했습니다', {
      labels: {
        portfolio_id: portfolioId,
        user_id: userId,
        stock_code: stockCode,
      },
    });

    return { portfolioId, stockCode, removed: true };
  }

  /**
   * 사용자 소유의 계좌인지 확인한다. 아니면 PORTFOLIO_NOT_FOUND.
   *
   * 없는 계좌와 남의 계좌를 같은 404로 묶는다. 403으로 나누면
   * "그 ID는 존재하지만 네 것이 아니다"가 드러나 남의 계좌 존재 여부를
   * 캐낼 수 있다. PORTFOLIO_ORDER_MISMATCH를 하나로 묶은 것과 같은 이유다.
   */
  private async findOwnedOrThrow(
    tx: Pick<PrismaService, 'virtualPortfolio'>,
    userId: number,
    portfolioId: number,
  ): Promise<void> {
    const owned = await tx.virtualPortfolio.findFirst({
      where: { id: portfolioId, userId },
      select: { id: true },
    });

    if (!owned) {
      throw new BusinessException(PortfoliosErrorCode.PORTFOLIO_NOT_FOUND, {
        userId,
        portfolioId,
      });
    }
  }
}
