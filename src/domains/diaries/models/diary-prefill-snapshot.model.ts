import { DiaryType } from '../dto/request/post-diaries.dto';

/** Repository가 주문·체결 데이터에서 구성해 서비스에 전달하는 자동채움 원본 값. */
export type DiaryPrefillSnapshot = {
  orderId: number;
  userId: number;
  type: DiaryType;
  corpCode: string;
  corpName: string;
  orderedAt: string;
  price: number | null;
  quantity: number;
  /** 회사별 평단 조회 정책이 확정될 때까지 null을 허용한다. */
  buyPrice: number | null;
  realizedProfit: number | null;
  returnRate: number | null;
  perAtOrder: number | null;
  pbrAtOrder: number | null;
  marketCapAtOrder: number | null;
  candleChartAtUrl: string | null;
};
