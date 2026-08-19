import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { CreateDiaryCommand } from '../models/create-diary-command.model';
import { DiaryOrderSnapshot } from '../models/diary-order-snapshot.model';
import { DiaryPageCriteria, DiaryPageResult } from '../models/diary-page.model';
import { DiaryDetailResponseDto } from '../dto/response/diary-detail-response.dto';
import {
  DiaryUpdateSnapshot,
  UpdateDiaryCommand,
  UpdatedDiaryResult,
} from '../models/update-diary.model';
import { DeleteDiaryResponseDto } from '../dto/response/delete-diary-response.dto';
import { DiaryPrefillSnapshot } from '../models/diary-prefill-snapshot.model';

/**
 * 일기 저장 기술(Prisma 쿼리 등)을 서비스 계층에서 분리하기 위한 포트입니다.
 */
export abstract class DiariesRepository {
  /** userId를 함께 조회해 타인의 주문 존재 여부를 노출하지 않는다. */
  abstract findPrefillByOrderId(
    userId: number,
    orderId: number,
  ): Promise<DiaryPrefillSnapshot | null>;

  /** userId까지 조회 조건에 포함해 타인의 일기 존재 여부를 노출하지 않는다. */
  abstract findDetailById(
    userId: number,
    diaryId: number,
  ): Promise<DiaryDetailResponseDto | null>;

  abstract findPage(
    userId: number,
    criteria: DiaryPageCriteria,
  ): Promise<DiaryPageResult>;

  abstract findOrderById(orderId: number): Promise<DiaryOrderSnapshot | null>;

  abstract existsActiveDiary(userId: number, orderId: number): Promise<boolean>;

  abstract createDiary(
    userId: number,
    command: CreateDiaryCommand,
  ): Promise<CreateDiaryResponseDto>;

  /** 실제 Prisma 연결 단계에서 userId와 deletedAt=null 조건으로 구현한다. */
  abstract findActiveDiaryForUpdate(
    userId: number,
    diaryId: number,
  ): Promise<DiaryUpdateSnapshot | null>;

  /** 실제 Prisma 연결 단계에서 공통/유형별 테이블을 트랜잭션으로 갱신한다. */
  abstract updateDiary(
    userId: number,
    diaryId: number,
    command: UpdateDiaryCommand,
  ): Promise<UpdatedDiaryResult>;

  /**
   * 본인 소유 일기를 원자적으로 soft delete한다.
   * DB 구현은 이미 삭제된 행도 조회해 최초 deletedAt을 유지하고, 조회와 갱신을
   * 하나의 트랜잭션에서 처리해야 한다. 미존재/타인 소유이면 null을 반환한다.
   */
  abstract softDeleteDiary(
    userId: number,
    diaryId: number,
  ): Promise<DeleteDiaryResponseDto | null>;
}
