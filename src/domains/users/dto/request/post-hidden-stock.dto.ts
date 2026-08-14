import { IsString, IsDateString } from 'class-validator';

export class PostHiddenStockDto {
  @IsString()
  stockCode!: string;

  @IsDateString()
  hiddenUntil!: string;
}
