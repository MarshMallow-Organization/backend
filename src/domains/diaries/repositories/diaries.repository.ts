import { CreateDiaryResponseDto } from '../dto/response/create-diary-response.dto';
import { CreateDiaryCommand } from '../models/create-diary-command.model';
import { DiaryOrderSnapshot } from '../models/diary-order-snapshot.model';
import { DiaryPageCriteria, DiaryPageResult } from '../models/diary-page.model';

/**
 * 일기 저장 기술(Prisma 쿼리 등)을 서비스 계층에서 분리하기 위한 포트입니다.
 */
export abstract class DiariesRepository {
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
}
