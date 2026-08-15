import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateOrderConditionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  triggerPrice?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  expiredAt?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  price?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  currenciesId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrderConditionDto)
  @Transform(({ value }) => (value && Object.keys(value).length > 0 ? value : undefined))
  orderCondition?: UpdateOrderConditionDto;
}
