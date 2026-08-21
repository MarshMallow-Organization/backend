/**
 * 가상계좌에 담긴 보유 종목 한 건.
 *
 * 등록 정보(stockCode)는 DB에서, 수량·단가는 HoldingsProvider에서 오고
 * 파생값 세 개는 서비스가 계산한다.
 */
export class HoldingDto {
  stockCode: string;

  stockName: string;

  /** 보유 수량. 1주 이상인 종목만 담긴다. */
  quantity: number;

  /** 평균 매수 단가. 가중평균이라 정수가 아닐 수 있다. */
  avgBuyPrice: number;

  /** 현재가. */
  currentPrice: number;

  /** currentPrice × quantity (반올림). */
  evaluationAmount: number;

  /** (currentPrice − avgBuyPrice) × quantity (반올림). 손실이면 음수다. */
  unrealizedProfit: number;

  /**
   * (currentPrice − avgBuyPrice) / avgBuyPrice × 100.
   *
   * 비율(0.1077)이 아니라 퍼센트(10.77)다. 소수 2자리로 반올림한다.
   */
  returnRate: number;
}
