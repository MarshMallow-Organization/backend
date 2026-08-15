import { DiaryType } from '../request/post-diaries.dto';

class DiaryPrefillBaseDto {
  orderId: number;
  type: DiaryType;
  corpCode: string;
  corpName: string;
  orderedAt: string;
  quantity: number;
  perAtTrade: number | null;
  pbrAtTrade: number | null;
  marketCapAtTrade: number | null;
  candelChartAtUrl: string | null;
}

export class BuyDiaryPrefillDto extends DiaryPrefillBaseDto {
  declare type: DiaryType.BUY;
  price: number | null;
  totalAmount: number | null;
}

export class SellDiaryPrefillDto extends DiaryPrefillBaseDto {
  declare type: DiaryType.SELL;
  buyPrice: number | null;
  sellPrice: number | null;
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  realizedProfit: number | null;
  returnRate: number | null;
}

export type DiaryPrefillResponseDto = BuyDiaryPrefillDto | SellDiaryPrefillDto;
