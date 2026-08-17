import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const DIARY_MAX_SIZE = 20;

export class GetDiariesQueryDto {
  /** 0부터 시작하는 페이지 번호.
   * @example 0
   */
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  /** 페이지당 조회할 일기 수.
   * @example 10
   */
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DIARY_MAX_SIZE)
  size?: number;

  /** 조회할 특정 일자 목록. startDate/endDate와 함께 사용할 수 없다.
   * @example ["2026-08-12", "2026-08-13"]
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  ) //하나의 date만 요청을 한 경우 배열로 transform
  @IsDateString({}, { each: true })
  dates?: string[];

  /** 조회 시작일. endDate와 함께 전달해야 한다.
   * @example 2026-08-01
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** 조회 종료일. startDate와 함께 전달해야 한다.
   * @example 2026-08-31
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 조회할 종목 코드 목록.
   * @example ["000660", "005930"]
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  ) //하나의 company만 요청을 한 경우 배열로 transform
  @IsString({ each: true })
  companies?: string[];

  //   @IsOptional()
  //   @IsString()
  //   keyword?: string;

  //   @IsOptional()
  //   @IsArray()
  //   @Type(() => Number)
  //   @IsInt({ each: true })
  //   emotions?: number[];
}
