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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  expiredAt?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  corpCode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  corpName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  perAtOrder?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pbrAtOrder?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  marketCapAtOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  price?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  currenciesId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrderConditionDto)
  @Transform(({ value }: { value: unknown }) =>
    value && typeof value === 'object' && Object.keys(value).length > 0
      ? value
      : undefined,
  )
  orderCondition?: UpdateOrderConditionDto;
}
