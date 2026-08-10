import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,} from 'class-validator';

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
  @Max(20)
  size?: number;

  @IsOptional()
  @IsArray()
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