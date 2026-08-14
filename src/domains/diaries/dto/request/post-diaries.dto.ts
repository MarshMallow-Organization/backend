import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsDefined,
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
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

export enum DiaryType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum GoalHoldPeriod {
  SHORT_TERM = 'SHORT_TERM',
  MID_TERM = 'MID_TERM',
  LONG_TERM = 'LONG_TERM',
  CUSTOM = 'CUSTOM',
}

export enum SellReasonCode {
  GOAL_REACHED = 'GOAL_REACHED',
  STOP_LOSS = 'STOP_LOSS',
  REBALANCING = 'REBALANCING',
  PROFIT_TAKING = 'PROFIT_TAKING',
  OTHER = 'OTHER',
}

export enum GoalEvaluationCode {
  KEPT_GOAL = 'KEPT_GOAL',
  SOLD_TOO_EARLY = 'SOLD_TOO_EARLY',
  SOLD_TOO_LATE = 'SOLD_TOO_LATE',
  EMOTIONAL_SELL = 'EMOTIONAL_SELL',
  AS_PLANNED = 'AS_PLANNED',
  OTHER = 'OTHER',
}

const BUY_FIELDS = [
  'buyReason',
  'goalPrice',
  'goalHoldPeriod',
  'customGoalHoldPeriod',
] as const;

const SELL_FIELDS = [
  'sellReasonCode',
  'sellReasonDetail',
  'goalEvaluationCode',
  'goalEvaluationDetail',
] as const;

@ValidatorConstraint({ name: 'diaryRequestShape', async: false })
class DiaryRequestShapeConstraint implements ValidatorConstraintInterface {
  validate(_type: unknown, args: ValidationArguments): boolean {
    const request = args.object as PostDiariesDto;

    if (request.type === DiaryType.BUY) {
      return SELL_FIELDS.every((field) => request[field] === undefined);
    }

    if (request.type === DiaryType.SELL) {
      return BUY_FIELDS.every((field) => request[field] === undefined);
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const request = args.object as PostDiariesDto;

    return request.type === DiaryType.BUY
      ? 'BUY 일기에는 SELL 전용 필드를 포함할 수 없습니다.'
      : 'SELL 일기에는 BUY 전용 필드를 포함할 수 없습니다.';
  }
}

export class PostDiariesDto {
  @ApiProperty({
    description: '일기의 기준이 되는 주문 ID',
    example: 12,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiProperty({
    description: '일기 유형. 주문 유형과 일치해야 한다.',
    enum: DiaryType,
    example: DiaryType.BUY,
  })
  @IsEnum(DiaryType)
  @Validate(DiaryRequestShapeConstraint)
  type: DiaryType;

  @ApiProperty({
    description: '일기 날짜',
    example: '2026-07-30',
    format: 'date',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date: string;

  @ApiProperty({
    description: '거래 당시 감정. 1은 매우 좋음, 5는 매우 나쁨을 의미한다.',
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  emotion: number;
  //공통 diary
  
  @ApiPropertyOptional({
    description: '매수 이유. BUY 일기일 때 필수이다.',
    example: 'AI 반도체 수요 증가와 저평가 구간이라고 판단했습니다.',
    maxLength: 300,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.BUY)
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  buyReason?: string;

  @ApiPropertyOptional({
    description: '목표 주가. BUY 일기에만 사용할 수 있다.',
    type: Number,
    example: 290000,
    minimum: 0,
    exclusiveMinimum: true,
    nullable: true,
  })
  @ValidateIf(
    (request: PostDiariesDto) =>
      request.type === DiaryType.BUY && request.goalPrice !== null,
  )
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  goalPrice?: number | null;

  @ApiPropertyOptional({
    description: '목표 보유 기간. BUY 일기에만 사용할 수 있다.',
    enum: GoalHoldPeriod,
    example: GoalHoldPeriod.CUSTOM,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.BUY)
  @IsOptional()
  @IsEnum(GoalHoldPeriod)
  goalHoldPeriod?: GoalHoldPeriod;

  @ApiPropertyOptional({
    description:
      '직접 입력한 목표 보유 기간. goalHoldPeriod가 CUSTOM이면 필수이다.',
    example: '45일',
    maxLength: 50,
  })
  @ValidateIf(
    (request: PostDiariesDto) =>
      request.type === DiaryType.BUY &&
      request.goalHoldPeriod === GoalHoldPeriod.CUSTOM,
  )
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  customGoalHoldPeriod?: string;

  @ApiPropertyOptional({
    description: '매도 이유 코드. SELL 일기일 때 필수이다.',
    enum: SellReasonCode,
    example: SellReasonCode.GOAL_REACHED,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.SELL)
  @IsDefined()
  @IsEnum(SellReasonCode)
  sellReasonCode?: SellReasonCode;

  @ApiPropertyOptional({
    description: '매도 이유 상세. SELL 일기에만 사용할 수 있다.',
    example: '목표 가격에 도달하여 계획대로 매도했습니다.',
    maxLength: 100,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.SELL)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sellReasonDetail?: string;

  @ApiPropertyOptional({
    description: '목표 대비 평가 코드. SELL 일기에만 사용할 수 있다.',
    enum: GoalEvaluationCode,
    example: GoalEvaluationCode.KEPT_GOAL,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.SELL)
  @IsOptional()
  @IsEnum(GoalEvaluationCode)
  goalEvaluationCode?: GoalEvaluationCode;

  @ApiPropertyOptional({
    description: '목표 대비 평가 상세. SELL 일기에만 사용할 수 있다.',
    example: '원칙을 지킨 거래였습니다.',
    maxLength: 100,
  })
  @ValidateIf((request: PostDiariesDto) => request.type === DiaryType.SELL)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  goalEvaluationDetail?: string;

  @ApiPropertyOptional({
    description: '매수 메모 또는 매도 회고 메모',
    example: '앞으로도 계획에 따라 거래할 것',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  memo?: string;
}
