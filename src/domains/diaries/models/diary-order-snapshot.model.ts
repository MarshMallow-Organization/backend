import { DiaryType } from '../dto/request/post-diaries.dto';

export type DiaryOrderSnapshot = {
  orderId: number;
  userId: number;
  type: DiaryType;
  corpCode: string;
  corpName: string;
  perAtOrder: number | null;
  pbrAtOrder: number | null;
  marketCapAtOrder: number | null;
  candleChartAtOrderUrl: string | null;
};
