import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../../models/diary.model';

export class UpdateDiaryResponseDto {
  /** 수정된 일기 ID. @example 1 */
  diaryId: number;
  /** 주문 ID. @example 12 */
  orderId: number;
  /** 일기 유형. @example BUY */
  type: DiaryType;
  /** 체결 수량 가중평균 가격 또는 미체결 주문 가격. @example 72500 */
  @ApiProperty({ type: Number, nullable: true, example: 72500 })
  price: number | null;
  /** 전체 체결 수량 또는 미체결 주문 수량. @example 7 */
  quantity: number;
  /** 전체 체결 금액 또는 주문 가격과 수량의 곱. @example 507500 */
  @ApiProperty({ type: Number, nullable: true, example: 507500 })
  totalAmount: number | null;
  /** 일기 날짜. @example 2026-08-05 */
  date: string;
  /** 감정 점수. @example 3 */
  emotion: number;

  @ApiPropertyOptional()
  buyReason?: string;
  @ApiPropertyOptional({ nullable: true })
  goalPrice?: number | null;
  @ApiPropertyOptional({ enum: GoalHoldPeriod, nullable: true })
  goalHoldPeriod?: GoalHoldPeriod | null;
  @ApiPropertyOptional({ nullable: true })
  customGoalHoldPeriod?: string | null;
  @ApiPropertyOptional({ enum: SellReasonCode })
  sellReasonCode?: SellReasonCode;
  @ApiPropertyOptional({ nullable: true })
  sellReasonDetail?: string | null;
  @ApiPropertyOptional({ enum: GoalEvaluationCode, nullable: true })
  goalEvaluationCode?: GoalEvaluationCode | null;
  @ApiPropertyOptional({ nullable: true })
  goalEvaluationDetail?: string | null;
  @ApiPropertyOptional({ nullable: true })
  memo?: string | null;

  /** 수정 시각(ISO 8601). @example 2026-08-05T01:10:00.000Z */
  updatedAt: string;
}
