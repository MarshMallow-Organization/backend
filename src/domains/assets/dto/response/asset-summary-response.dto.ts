/**
 * 사용자 전체 자산 요약.
 *
 * 숨김 처리된 종목은 제외하고 집계한다. 필드 값은 HoldingsProvider가
 * 돌려주는 토스 원본 금액을 그대로 합산한 것이라, 이 서비스에서
 * 평가금액·손익을 다시 계산하지 않는다.
 */
export class AssetSummaryResponseDto {
  /** 총 매입금액(원화). 숨김 종목 제외 후 합산.
   * @example 6500000
   */
  totalPurchaseAmount: number;

  /** 총 평가금액(원화).
   * @example 7200000
   */
  totalEvaluationAmount: number;

  /** 총 평가손익(원화). 손실이면 음수.
   * @example 700000
   */
  totalProfitAmount: number;

  /** 총 수익률(퍼센트, 소수 2자리). totalPurchaseAmount가 0이면 0.
   * @example 10.77
   */
  totalProfitRate: number;

  /** 일간 손익(원화).
   * @example 100000
   */
  dailyProfitAmount: number;

  /** 일간 수익률(퍼센트, 소수 2자리). 전일 평가금액이 0이면 0.
   * @example 1.41
   */
  dailyProfitRate: number;

  /** 현재 숨김 처리된 종목 개수.
   * @example 2
   */
  hiddenStockCount: number;
}
