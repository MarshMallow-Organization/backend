import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { DiariesErrorCode } from '../error/diaries.error';
import {
  DIARY_MAX_SIZE,
  GetDiariesQueryDto,
} from '../dto/request/get-diaries-query.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { PostDiariesDto } from '../dto/request/post-diaries.dto';
import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { CreateDiaryCommand } from '../models/create-diary-command.model';
import { DiaryPageCriteria } from '../models/diary-page.model';
import { DiariesRepository } from '../repositories/diaries.repository';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import { DiaryPrefillResponseDto } from '../dto/response/diary-prefill-response.dto';
import { DiaryType } from '../dto/request/post-diaries.dto';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;

@Injectable()
export class DiariesService {
  constructor(private readonly diariesRepository: DiariesRepository) {}

  async getDiaryPrefill(
    userId: number,
    orderId: number,
  ): Promise<DiaryPrefillResponseDto> {
    const snapshot = await this.diariesRepository.findPrefillByOrderId(
      userId,
      orderId,
    );

    if (snapshot === null || snapshot.userId !== userId) {
      throw new BusinessException(DiariesErrorCode.ORDER_NOT_FOUND, {
        userId,
        orderId,
      });
    }

    const common = {
      orderId: snapshot.orderId,
      type: snapshot.type,
      corpCode: snapshot.corpCode,
      corpName: snapshot.corpName,
      orderedAt: snapshot.orderedAt,
      quantity: snapshot.quantity,
      perAtTrade: snapshot.perAtTrade,
      pbrAtTrade: snapshot.pbrAtTrade,
      marketCapAtTrade: snapshot.marketCapAtTrade,
      candelChartAtUrl: snapshot.candelChartAtUrl,
    };

    if (snapshot.type === DiaryType.BUY) {
      return {
        ...common,
        type: DiaryType.BUY,
        price: snapshot.price,
        totalAmount: this.calculateTotal(snapshot.price, snapshot.quantity),
      };
    }

    return {
      ...common,
      type: DiaryType.SELL,
      buyPrice: snapshot.buyPrice,
      sellPrice: snapshot.price,
      totalBuyAmount: this.calculateTotal(snapshot.buyPrice, snapshot.quantity),
      totalSellAmount: this.calculateTotal(snapshot.price, snapshot.quantity),
      realizedProfit: snapshot.realizedProfit,
      returnRate: snapshot.returnRate,
    };
  }

  async getDiaryDetail(
    userId: number,
    diaryId: number,
  ): Promise<DiaryDetailResponseDto> {
    const diary = await this.diariesRepository.findDetailById(userId, diaryId);

    if (diary === null) {
      throw new BusinessException(DiariesErrorCode.DIARY_NOT_FOUND, {
        userId,
        diaryId,
      });
    }

    return diary;
  }

  async getDiaries(
    userId: number,
    query: GetDiariesQueryDto,
  ): Promise<GetDiariesResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const size = query.size ?? DEFAULT_SIZE;

    this.validatePagination(page, size);
    this.validateDateFilter(query);

    const criteria: DiaryPageCriteria = {
      page,
      size,
      ...(query.dates !== undefined && { dates: query.dates }),
      ...(query.startDate !== undefined && { startDate: query.startDate }),
      ...(query.endDate !== undefined && { endDate: query.endDate }),
      ...(query.companies !== undefined && { companies: query.companies }),
      orderBy: [{ date: 'desc' }, { diaryId: 'desc' }],
    };

    const { items, totalElements } = await this.diariesRepository.findPage(
      userId,
      criteria,
    ); //DB 조회를 한다고 한다
    const totalPages = Math.ceil(totalElements / size);

    return {
      items,
      page,
      size,
      totalElements,
      totalPages,
      hasNext: page + 1 < totalPages,
    };
  }

  async createDiary(
    userId: number,
    request: PostDiariesDto,
  ): Promise<CreateDiaryResponseDto> {
    const order = await this.diariesRepository.findOrderById(request.orderId);

    // 타인의 주문도 존재 여부를 노출하지 않도록 미존재 주문과 동일하게 처리한다.
    if (order === null || order.userId !== userId) {
      throw new BusinessException(DiariesErrorCode.ORDER_NOT_FOUND, {
        userId,
        orderId: request.orderId,
      });
    }

    if (order.type !== request.type) {
      throw new BusinessException(DiariesErrorCode.ORDER_TYPE_MISMATCH, {
        orderId: request.orderId,
        orderType: order.type,
        diaryType: request.type,
      });
    }

    const alreadyExists = await this.diariesRepository.existsActiveDiary(
      userId,
      request.orderId,
    );

    if (alreadyExists) {
      throw new BusinessException(DiariesErrorCode.DIARY_ALREADY_EXISTS, {
        userId,
        orderId: request.orderId,
      });
    }

    const command = {
      ...request,
      corpCode: order.corpCode,
      corpName: order.corpName,
      perAtOrder: order.perAtOrder,
      pbrAtOrder: order.pbrAtOrder,
      marketCapAtOrder: order.marketCapAtOrder,
      candleChartAtOrderUrl: order.candleChartAtOrderUrl,
    } as CreateDiaryCommand;

    return this.diariesRepository.createDiary(userId, command);
  }

  private validatePagination(page: number, size: number): void {
    if (
      !Number.isInteger(page) ||
      page < 0 ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > DIARY_MAX_SIZE
    ) {
      throw new BusinessException(DiariesErrorCode.INVALID_QUERY_PARAMETER, {
        page,
        size,
      });
    }
  }

  private calculateTotal(
    price: number | null,
    quantity: number,
  ): number | null {
    return price === null ? null : price * quantity;
  }

  private validateDateFilter(query: GetDiariesQueryDto): void {
    const hasDates = query.dates !== undefined;
    const hasStartDate = query.startDate !== undefined;
    const hasEndDate = query.endDate !== undefined;
    const hasIncompleteRange = hasStartDate !== hasEndDate;
    const mixesDatesAndRange = hasDates && (hasStartDate || hasEndDate);
    const hasReversedRange =
      hasStartDate && hasEndDate && query.startDate! > query.endDate!;

    if (hasIncompleteRange || mixesDatesAndRange || hasReversedRange) {
      throw new BusinessException(DiariesErrorCode.INVALID_DATE_RANGE, {
        hasDates,
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      });
    }
  }
}
