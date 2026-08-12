import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exception/businessException';
import {
  isPrismaError,
  PrismaErrorCode,
} from 'src/common/exception/prismaError.util';
import { CustomLogger } from 'src/common/logger/customLogger';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetsErrorCode } from './assets.errorCode';
import { CreatePortfolioDto } from './dto/createPortfolio.dto';

/** 명세: 사용자당 가상계좌는 최대 4개. */
const MAX_PORTFOLIO_COUNT = 4;

@Injectable()
export class AssetsService {
  private readonly logger = new CustomLogger(AssetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 가상계좌를 생성한다.
   *
   * 개수 제한과 이름 중복을 확인한 뒤 sortOrder를 최대값 + 1로 매긴다.
   * 이름 중복은 미리 조회해도 동시 요청에서는 빠져나갈 수 있으므로,
   * DB의 UNIQUE(user_id, name)를 최종 방어선으로 두고 P2002도 함께 처리한다.
   */
  async createPortfolio(userId: number, dto: CreatePortfolioDto) {
    const count = await this.prisma.virtualPortfolio.count({
      where: { userId },
    });

    if (count >= MAX_PORTFOLIO_COUNT) {
      throw new BusinessException(AssetsErrorCode.PORTFOLIO_LIMIT_EXCEEDED, {
        userId,
        count,
      });
    }

    /** 정렬 순서는 사용자별로 이어 붙인다. 비어 있으면 1부터 시작한다. */
    const last = await this.prisma.virtualPortfolio.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    try {
      const created = await this.prisma.virtualPortfolio.create({
        data: {
          userId,
          name: dto.name,
          sortOrder: (last?.sortOrder ?? 0) + 1,
        },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          createdAt: true,
        },
      });

      this.logger.info('가상계좌를 생성했습니다', {
        labels: { portfolio_id: created.id, user_id: userId },
      });

      return created;
    } catch (error) {
      /** 동시 요청으로 사전 검사를 통과했더라도 UNIQUE 제약이 잡아준다. */
      if (isPrismaError(error, PrismaErrorCode.UNIQUE_CONSTRAINT)) {
        throw new BusinessException(AssetsErrorCode.PORTFOLIO_NAME_DUPLICATED, {
          userId,
          name: dto.name,
        });
      }

      throw error;
    }
  }
}
