import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../../models/diary.model';

export class UpdateDiaryDto {
  /** 변경할 일기 날짜. @example 2026-08-05 */
  @ValidateIf((_request, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date?: string;

  /** 변경할 감정 점수. @example 3 */
  @ValidateIf((_request, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  emotion?: number;

  /** BUY 일기의 매수 이유. */
  @ValidateIf((_request, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  buyReason?: string;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  goalPrice?: number | null;

  @ApiPropertyOptional({ enum: GoalHoldPeriod, nullable: true })
  @IsOptional()
  @IsEnum(GoalHoldPeriod)
  goalHoldPeriod?: GoalHoldPeriod | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customGoalHoldPeriod?: string | null;

  /** SELL 일기의 매도 이유 코드. */
  @ValidateIf((_request, value) => value !== undefined)
  @IsEnum(SellReasonCode)
  sellReasonCode?: SellReasonCode;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  sellReasonDetail?: string | null;

  @ApiPropertyOptional({ enum: GoalEvaluationCode, nullable: true })
  @IsOptional()
  @IsEnum(GoalEvaluationCode)
  goalEvaluationCode?: GoalEvaluationCode | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  goalEvaluationDetail?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  memo?: string | null;
}
