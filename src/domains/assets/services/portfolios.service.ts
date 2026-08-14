import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import {
  isPrismaError,
  PrismaErrorCode,
} from 'src/common/exception/prismaError.util';
import { CustomLogger } from 'src/common/logger/customLogger';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePortfolioDto } from '../dto/request/create-portfolio.dto';
import { ReorderPortfoliosDto } from '../dto/request/reorder-portfolios.dto';
import { PortfolioListResponseDto } from '../dto/response/portfolio-list-response.dto';
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
}
