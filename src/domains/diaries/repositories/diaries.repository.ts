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

/**
 * 일기 저장 기술(Prisma 쿼리 등)을 서비스 계층에서 분리하기 위한 포트입니다.
 */
export abstract class DiariesRepository {
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
}
