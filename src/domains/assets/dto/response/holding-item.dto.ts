/**
 * 보유 종목 목록(/assets/holdings) 한 건.
 *
 * 화면에는 종목명과 평가금액만 필요하다. 수량·단가·손익 등은
 * `/assets/portfolios/:id`가 쓰는 HoldingDto(holding.dto.ts)의 몫이라
 * 여기서는 별도 타입으로 둔다 — 이 목록의 필드를 줄인다고 그쪽까지
 * 같이 줄어들면 안 된다.
 */
export class HoldingItemDto {
  /** 종목명.
   * @example 삼성전자
   */
  stockName: string;

  /** 평가금액(원화). 토스 marketValue.amount.krw.
   * @example 7200000
   */
  evaluationAmount: number;
}
