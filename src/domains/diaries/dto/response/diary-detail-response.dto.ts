import {
  DiaryType,
  GoalEvaluationCode,
  GoalHoldPeriod,
  SellReasonCode,
} from '../request/post-diaries.dto';

class DiaryDetailBaseDto {
  diaryId: number;
  orderId: number;
  type: DiaryType;
  date: string;
  corpCode: string;
  corpName: string;
  orderedAt: string;
  quantity: number;
  perAtTrade: number | null;
  pbrAtTrade: number | null;
  marketCapAtTrade: number | null;
  candelChartAtUrl: string | null;
  emotion: number;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export class BuyDiaryDetailDto extends DiaryDetailBaseDto {
  declare type: DiaryType.BUY;
  price: number | null;
  totalAmount: number | null;
  buyReason: string;
  goalPrice: number | null;
  goalHoldPeriod: GoalHoldPeriod | null;
}

export class SellDiaryDetailDto extends DiaryDetailBaseDto {
  declare type: DiaryType.SELL;
  averagePrice: number | null;
  sellPrice: number | null;
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  realizedProfit: number | null;
  returnRate: number | null;
  sellReasonCode: SellReasonCode;
  sellReasonDetail: string | null;
  goalEvaluationCode: GoalEvaluationCode | null;
  goalEvaluationDetail: string | null;
}

export type DiaryDetailResponseDto = BuyDiaryDetailDto | SellDiaryDetailDto;
