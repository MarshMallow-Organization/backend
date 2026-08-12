import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/exception/businessException';
import { DiariesErrorCode } from '../diaries.error';
import {
  DIARY_MAX_SIZE,
  GetDiariesQueryDto,
} from '../dto/request/get-diaries-query.dto';
import { GetDiariesResponseDto } from '../dto/response/get-diaries-response.dto';
import { DiariesRepository, DiaryPageCriteria } from './diaries.repository';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;

@Injectable()
export class DiariesService {
  constructor(private readonly diariesRepository: DiariesRepository) {}

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
