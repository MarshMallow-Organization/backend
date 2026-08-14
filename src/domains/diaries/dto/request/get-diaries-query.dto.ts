import { Type, Transform } from 'class-transformer';
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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DIARY_MAX_SIZE)
  size?: number;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  ) //하나의 date만 요청을 한 경우 배열로 transform
  @IsDateString({}, { each: true })
  dates?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
