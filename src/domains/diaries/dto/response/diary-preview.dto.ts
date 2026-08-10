export class DiaryPreviewDto {
  diaryId: number;
  orderId: number;
  type: 'BUY' | 'SELL';
  date: string;
  corpCode: string;
  corpName: string;
  avgPrice: number | null;
  quantity: number;
  memo: string;
  createdAt: string;
}
