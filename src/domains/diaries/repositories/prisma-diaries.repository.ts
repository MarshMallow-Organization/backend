import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { Prisma, TradeType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { DeleteDiaryResponseDto } from '../dto/response/delete-diary-response.dto';
import { DiariesErrorCode } from '../error/diaries.error';
import { CreateDiaryCommand } from '../models/create-diary-command.model';
import { DiaryOrderSnapshot } from '../models/diary-order-snapshot.model';
import { DiaryPageCriteria, DiaryPageResult } from '../models/diary-page.model';
import { DiaryPrefillSnapshot } from '../models/diary-prefill-snapshot.model';
import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../models/diary.model';
import {
  DiaryUpdateSnapshot,
  UpdatedDiaryResult,
  UpdateDiaryCommand,
} from '../models/update-diary.model';
import {
  dateStringToDbDate,
  dateToIsoString,
  dbDateToDateString,
  decimalToNumber,
  summarizeTrades,
  sumRealizedProfit,
  weightedReturnRate,
} from './diary-record.mapper';
import { DiariesRepository } from './diaries.repository';

const DIARY_RELATIONS = {
  buyDiary: true,
  sellDiary: true,
  order: { include: { trades: true } },
} as const satisfies Prisma.DiaryInclude;

type DiaryWithRelations = Prisma.DiaryGetPayload<{
  include: typeof DIARY_RELATIONS;
}>;

const MAX_TRANSACTION_ATTEMPTS = 3;
const RETRYABLE_TRANSACTION_ERROR = 'P2034';

@Injectable()
export class PrismaDiariesRepository extends DiariesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPrefillByOrderId(
    userId: number,
    orderId: number,
  ): Promise<DiaryPrefillSnapshot | null> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { trades: true },
    });

    if (order === null) {
      return null;
    }

    const summary = summarizeTrades(order, order.trades);

    return {
      orderId: order.id,
      userId: order.userId,
      type: this.toDiaryType(order.tradeType),
      corpCode: order.corpCode,
      corpName: order.corpName,
      orderedAt: dateToIsoString(order.createdAt),
      price: summary.price,
      quantity: summary.quantity,
      buyPrice: null,
      realizedProfit: sumRealizedProfit(order.trades),
      returnRate: weightedReturnRate(order.trades),
      perAtOrder: decimalToNumber(order.perAtOrder),
      pbrAtOrder: decimalToNumber(order.pbrAtOrder),
      marketCapAtOrder: decimalToNumber(order.marketCapAtOrder),
      candleChartAtUrl: null,
    };
  }

  async findDetailById(
    userId: number,
    diaryId: number,
  ): Promise<DiaryDetailResponseDto | null> {
    const diary = await this.prisma.diary.findFirst({
      where: { id: diaryId, userId, deletedAt: null },
      include: DIARY_RELATIONS,
    });

    return diary === null ? null : this.mapDetail(diary);
  }

  async findPage(
    userId: number,
    criteria: DiaryPageCriteria,
  ): Promise<DiaryPageResult> {
    const date = this.buildDateFilter(criteria);
    const where: Prisma.DiaryWhereInput = {
      userId,
      deletedAt: null,
      ...(date !== undefined && { date }),
      ...(criteria.companies !== undefined && {
        corpCode: { in: criteria.companies },
      }),
    };

    const [diaries, totalElements] = await this.prisma.$transaction([
      this.prisma.diary.findMany({
        where,
        include: DIARY_RELATIONS,
        skip: criteria.page * criteria.size,
        take: criteria.size,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.diary.count({ where }),
    ]);

    return {
      items: diaries.map((diary) => {
        const summary = summarizeTrades(diary.order, diary.order.trades);
        const memo =
          diary.type === TradeType.BUY
            ? diary.buyDiary?.memo
            : diary.sellDiary?.memo;

        return {
          diaryId: diary.id,
          orderId: diary.orderId,
          type: diary.type,
          date: dbDateToDateString(diary.date),
          corpCode: diary.corpCode,
          corpName: diary.corpName,
          avgPrice: summary.price,
          quantity: summary.quantity,
          memo: memo ?? null,
          createdAt: dateToIsoString(diary.createdAt),
        };
      }),
      totalElements,
    };
  }

  async findOrderById(orderId: number): Promise<DiaryOrderSnapshot | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        tradeType: true,
        corpCode: true,
        corpName: true,
        perAtOrder: true,
        pbrAtOrder: true,
        marketCapAtOrder: true,
      },
    });

    if (order === null) {
      return null;
    }

    return {
      orderId: order.id,
      userId: order.userId,
      type: this.toDiaryType(order.tradeType),
      corpCode: order.corpCode,
      corpName: order.corpName,
      perAtOrder: decimalToNumber(order.perAtOrder),
      pbrAtOrder: decimalToNumber(order.pbrAtOrder),
      marketCapAtOrder: decimalToNumber(order.marketCapAtOrder),
      candleChartAtOrderUrl: null,
    };
  }

  async existsActiveDiary(userId: number, orderId: number): Promise<boolean> {
    const count = await this.prisma.diary.count({
      where: { userId, orderId, deletedAt: null },
    });

    return count > 0;
  }

  async createDiary(
    userId: number,
    command: CreateDiaryCommand,
  ): Promise<CreateDiaryResponseDto> {
    return this.withTransactionRetry(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM orders
        WHERE id = ${command.orderId} AND userId = ${userId}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new BusinessException(DiariesErrorCode.ORDER_NOT_FOUND, {
          userId,
          orderId: command.orderId,
        });
      }

      const order = await tx.order.findFirst({
        where: { id: command.orderId, userId },
        select: { tradeType: true },
      });

      if (order === null) {
        throw new BusinessException(DiariesErrorCode.ORDER_NOT_FOUND, {
          userId,
          orderId: command.orderId,
        });
      }

      if (order.tradeType !== command.type) {
        throw new BusinessException(DiariesErrorCode.ORDER_TYPE_MISMATCH, {
          orderId: command.orderId,
          orderType: order.tradeType,
          diaryType: command.type,
        });
      }

      const activeDiary = await tx.diary.findFirst({
        where: { userId, orderId: command.orderId, deletedAt: null },
        select: { id: true },
      });

      if (activeDiary !== null) {
        throw new BusinessException(DiariesErrorCode.DIARY_ALREADY_EXISTS, {
          userId,
          orderId: command.orderId,
        });
      }

      const diary = await tx.diary.create({
        data: {
          type: command.type,
          date: dateStringToDbDate(command.date),
          corpCode: command.corpCode,
          corpName: command.corpName,
          perAtOrder: command.perAtOrder,
          pbrAtOrder: command.pbrAtOrder,
          marketCapAtOrder: command.marketCapAtOrder,
          userId,
          orderId: command.orderId,
          ...(command.type === DiaryType.BUY
            ? {
                buyDiary: {
                  create: {
                    buyReason: command.buyReason,
                    goalPrice: command.goalPrice ?? null,
                    goalHoldPeriod: command.goalHoldPeriod ?? null,
                    customGoalHoldPeriod: command.customGoalHoldPeriod ?? null,
                    emotion: command.emotion,
                    memo: command.memo ?? null,
                  },
                },
              }
            : {
                sellDiary: {
                  create: {
                    sellReasonCode: command.sellReasonCode,
                    sellReasonDetail: command.sellReasonDetail ?? null,
                    goalEvaluationCode: command.goalEvaluationCode ?? null,
                    goalEvaluationDetail: command.goalEvaluationDetail ?? null,
                    emotion: command.emotion,
                    memo: command.memo ?? null,
                  },
                },
              }),
        },
      });

      return {
        diaryId: diary.id,
        orderId: diary.orderId,
        type: this.toDiaryType(diary.type),
        date: dbDateToDateString(diary.date),
        createdAt: dateToIsoString(diary.createdAt),
      };
    });
  }

  async findActiveDiaryForUpdate(
    userId: number,
    diaryId: number,
  ): Promise<DiaryUpdateSnapshot | null> {
    const diary = await this.prisma.diary.findFirst({
      where: { id: diaryId, userId, deletedAt: null },
      select: {
        id: true,
        type: true,
        buyDiary: {
          select: { goalHoldPeriod: true, customGoalHoldPeriod: true },
        },
      },
    });

    if (diary === null) {
      return null;
    }

    return {
      diaryId: diary.id,
      type: this.toDiaryType(diary.type),
      ...(diary.type === TradeType.BUY && {
        goalHoldPeriod:
          (diary.buyDiary?.goalHoldPeriod as GoalHoldPeriod | null) ?? null,
        customGoalHoldPeriod: diary.buyDiary?.customGoalHoldPeriod ?? null,
      }),
    };
  }

  async updateDiary(
    userId: number,
    diaryId: number,
    command: UpdateDiaryCommand,
  ): Promise<UpdatedDiaryResult> {
    return this.withTransactionRetry(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM diaries
        WHERE id = ${diaryId} AND userId = ${userId}
        FOR UPDATE
      `;

      const diary = await tx.diary.findFirst({
        where: { id: diaryId, userId, deletedAt: null },
        include: { buyDiary: true, sellDiary: true },
      });

      if (diary === null) {
        throw new BusinessException(DiariesErrorCode.DIARY_NOT_FOUND, {
          userId,
          diaryId,
        });
      }

      if (diary.type !== command.type) {
        throw new BusinessException(DiariesErrorCode.INVALID_DIARY_UPDATE, {
          diaryId,
          diaryType: diary.type,
          commandType: command.type,
        });
      }

      await tx.diary.update({
        where: { id: diaryId },
        data: {
          updatedAt: new Date(),
          ...(command.date !== undefined && {
            date: dateStringToDbDate(command.date),
          }),
        },
      });

      if (command.type === DiaryType.BUY) {
        if (diary.buyDiary === null) {
          throw this.integrityError(diaryId, command.type);
        }

        await tx.buyDiary.update({
          where: { diaryId },
          data: {
            ...(command.emotion !== undefined && {
              emotion: command.emotion,
            }),
            ...(command.memo !== undefined && { memo: command.memo }),
            ...(command.buyReason !== undefined && {
              buyReason: command.buyReason,
            }),
            ...(command.goalPrice !== undefined && {
              goalPrice: command.goalPrice,
            }),
            ...(command.goalHoldPeriod !== undefined && {
              goalHoldPeriod: command.goalHoldPeriod,
            }),
            ...(command.customGoalHoldPeriod !== undefined && {
              customGoalHoldPeriod: command.customGoalHoldPeriod,
            }),
          },
        });
      } else {
        if (diary.sellDiary === null) {
          throw this.integrityError(diaryId, command.type);
        }

        await tx.sellDiary.update({
          where: { diaryId },
          data: {
            ...(command.emotion !== undefined && {
              emotion: command.emotion,
            }),
            ...(command.memo !== undefined && { memo: command.memo }),
            ...(command.sellReasonCode !== undefined && {
              sellReasonCode: command.sellReasonCode,
            }),
            ...(command.sellReasonDetail !== undefined && {
              sellReasonDetail: command.sellReasonDetail,
            }),
            ...(command.goalEvaluationCode !== undefined && {
              goalEvaluationCode: command.goalEvaluationCode,
            }),
            ...(command.goalEvaluationDetail !== undefined && {
              goalEvaluationDetail: command.goalEvaluationDetail,
            }),
          },
        });
      }

      const updated = await tx.diary.findFirst({
        where: { id: diaryId, userId, deletedAt: null },
        include: DIARY_RELATIONS,
      });

      if (updated === null) {
        throw new BusinessException(DiariesErrorCode.DIARY_NOT_FOUND, {
          userId,
          diaryId,
        });
      }

      return this.mapUpdatedDiary(updated);
    });
  }

  async softDeleteDiary(
    userId: number,
    diaryId: number,
  ): Promise<DeleteDiaryResponseDto | null> {
    return this.withTransactionRetry(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM diaries
        WHERE id = ${diaryId} AND userId = ${userId}
        FOR UPDATE
      `;

      const diary = await tx.diary.findFirst({
        where: { id: diaryId, userId },
        select: { id: true, deletedAt: true },
      });

      if (diary === null) {
        return null;
      }

      const deletedAt = diary.deletedAt ?? new Date();

      if (diary.deletedAt === null) {
        await tx.diary.update({
          where: { id: diaryId },
          data: { deletedAt },
        });
      }

      return {
        diaryId: diary.id,
        deleted: true,
        deletedAt: dateToIsoString(deletedAt),
      };
    });
  }

  private buildDateFilter(
    criteria: DiaryPageCriteria,
  ): Prisma.DateTimeFilter | undefined {
    if (criteria.dates !== undefined) {
      return { in: criteria.dates.map(dateStringToDbDate) };
    }

    if (criteria.startDate !== undefined && criteria.endDate !== undefined) {
      return {
        gte: dateStringToDbDate(criteria.startDate),
        lte: dateStringToDbDate(criteria.endDate),
      };
    }

    return undefined;
  }

  private mapDetail(diary: DiaryWithRelations): DiaryDetailResponseDto {
    const summary = summarizeTrades(diary.order, diary.order.trades);
    const common = {
      diaryId: diary.id,
      orderId: diary.orderId,
      date: dbDateToDateString(diary.date),
      corpCode: diary.corpCode,
      corpName: diary.corpName,
      orderedAt: dateToIsoString(diary.order.createdAt),
      quantity: summary.quantity,
      perAtOrder: decimalToNumber(diary.perAtOrder),
      pbrAtOrder: decimalToNumber(diary.pbrAtOrder),
      marketCapAtOrder: decimalToNumber(diary.marketCapAtOrder),
      candleChartAtUrl: null,
      createdAt: dateToIsoString(diary.createdAt),
      updatedAt: dateToIsoString(diary.updatedAt),
    };

    if (diary.type === TradeType.BUY) {
      if (diary.buyDiary === null) {
        throw this.integrityError(diary.id, DiaryType.BUY);
      }

      return {
        ...common,
        type: DiaryType.BUY,
        price: summary.price,
        totalAmount: summary.totalAmount,
        buyReason: diary.buyDiary.buyReason,
        goalPrice: decimalToNumber(diary.buyDiary.goalPrice),
        goalHoldPeriod:
          (diary.buyDiary.goalHoldPeriod as GoalHoldPeriod | null) ?? null,
        emotion: diary.buyDiary.emotion,
        memo: diary.buyDiary.memo,
      };
    }

    if (diary.sellDiary === null) {
      throw this.integrityError(diary.id, DiaryType.SELL);
    }

    return {
      ...common,
      type: DiaryType.SELL,
      averagePrice: null,
      sellPrice: summary.price,
      totalBuyAmount: null,
      totalSellAmount: summary.totalAmount,
      realizedProfit: sumRealizedProfit(diary.order.trades),
      returnRate: weightedReturnRate(diary.order.trades),
      sellReasonCode: diary.sellDiary.sellReasonCode as SellReasonCode,
      sellReasonDetail: diary.sellDiary.sellReasonDetail,
      goalEvaluationCode:
        (diary.sellDiary.goalEvaluationCode as GoalEvaluationCode | null) ??
        null,
      goalEvaluationDetail: diary.sellDiary.goalEvaluationDetail,
      emotion: diary.sellDiary.emotion,
      memo: diary.sellDiary.memo,
    };
  }

  private mapUpdatedDiary(diary: DiaryWithRelations): UpdatedDiaryResult {
    const summary = summarizeTrades(diary.order, diary.order.trades);
    const common = {
      diaryId: diary.id,
      orderId: diary.orderId,
      price: summary.price,
      quantity: summary.quantity,
      totalAmount: summary.totalAmount,
      date: dbDateToDateString(diary.date),
      updatedAt: dateToIsoString(diary.updatedAt),
    };

    if (diary.type === TradeType.BUY) {
      if (diary.buyDiary === null) {
        throw this.integrityError(diary.id, DiaryType.BUY);
      }

      return {
        ...common,
        type: DiaryType.BUY,
        emotion: diary.buyDiary.emotion,
        buyReason: diary.buyDiary.buyReason,
        goalPrice: decimalToNumber(diary.buyDiary.goalPrice),
        goalHoldPeriod:
          (diary.buyDiary.goalHoldPeriod as GoalHoldPeriod | null) ?? null,
        customGoalHoldPeriod: diary.buyDiary.customGoalHoldPeriod,
        memo: diary.buyDiary.memo,
      };
    }

    if (diary.sellDiary === null) {
      throw this.integrityError(diary.id, DiaryType.SELL);
    }

    return {
      ...common,
      type: DiaryType.SELL,
      emotion: diary.sellDiary.emotion,
      sellReasonCode: diary.sellDiary.sellReasonCode as SellReasonCode,
      sellReasonDetail: diary.sellDiary.sellReasonDetail,
      goalEvaluationCode:
        (diary.sellDiary.goalEvaluationCode as GoalEvaluationCode | null) ??
        null,
      goalEvaluationDetail: diary.sellDiary.goalEvaluationDetail,
      memo: diary.sellDiary.memo,
    };
  }

  private toDiaryType(value: TradeType): DiaryType {
    return value === TradeType.BUY ? DiaryType.BUY : DiaryType.SELL;
  }

  private integrityError(diaryId: number, type: DiaryType): Error {
    return new Error(`Diary ${diaryId} is missing its ${type} detail record.`);
  }

  private async withTransactionRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation);
      } catch (error) {
        if (
          attempt === MAX_TRANSACTION_ATTEMPTS ||
          !this.isRetryableTransactionError(error)
        ) {
          throw error;
        }
      }
    }

    throw new Error('Transaction retry loop ended unexpectedly.');
  }

  private isRetryableTransactionError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === RETRYABLE_TRANSACTION_ERROR
    );
  }
}
