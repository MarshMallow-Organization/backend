/** 관심종목 항목. 목록·등록·등록 여부 조회 응답이 공유한다. */
export class FavoriteStockItemDto {
  id: number;

  stockCode: string;

  /** 등록 시점에 클라이언트가 보낸 값을 그대로 보관한다. */
  stockName: string;

  /**
   * 시장 구분 (KOSPI / KOSDAQ 등). **현재 항상 null이다.**
   *
   * FavoriteStock 모델에 컬럼이 없고 종목 마스터도 없어 채울 수 없다.
   * 종목 조회 서비스가 연동되면 값이 들어간다. 필드 존재 자체는 지금부터
   * 보장하므로 프론트는 나중에 타입을 바꿀 필요가 없다.
   */
  market: string | null;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다. */
  createdAt: string;
}
