/**
 * 사용자 전체 자산 요약.
 *
 * 숨김 처리된 종목은 제외하고 집계한다. 값은 HoldingsProvider가
 * 돌려주는 토스 원본 평가금액을 그대로 합산한 것이라, 이 서비스에서
 * 다시 계산하지 않는다.
 */
export class AssetSummaryResponseDto {
  /** 총 평가금액(원화). 숨김 종목·전량 매도 종목 제외 후 합산.
   * @example 7200000
   */
  totalEvaluationAmount: number;
}
