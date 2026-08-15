import { DiaryType } from '../dto/request/post-diaries.dto';

export type DiaryOrderSnapshot = {
  orderId: number;
  userId: number;
  type: DiaryType;
  corpCode: string;
  corpName: string;
  perAtTrade: number | null;
  pbrAtTrade: number | null;
  marketCapAtTrade: number | null;
  candelChartAtUrl: string | null;
};
