import { DiaryType } from '../request/post-diaries.dto';

export class CreateDiaryResponseDto {
  /** 생성된 일기 ID. @example 1 */
  diaryId: number;
  /** 일기의 기준 주문 ID. @example 12 */
  orderId: number;
  /** 생성된 일기 유형. @example BUY */
  type: DiaryType;
  /** 일기 날짜. @example 2026-07-30 */
  date: string;
  /** 생성 시각(ISO 8601). @example 2026-07-30T16:10:00.000Z */
  createdAt: string;
}
