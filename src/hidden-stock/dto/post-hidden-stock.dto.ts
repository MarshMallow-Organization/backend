import { IsString, IsDateString } from 'class-validator';

export class PostHiddenStockDto {
  @IsString()
  stockCode!: string; // 실제로 들어온 stockCode가 문자열인지 검사

  @IsDateString()
  hiddenUntil!: string;
}
