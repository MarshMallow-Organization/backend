import { HoldingDto } from './holding.dto';

/**
 * GET /assets/portfolios/:portfolioId 응답.
 *
 * PortfolioSummaryDto를 상속하지 않고 필드를 다시 적는다. 상속하면
 * Swagger 플러그인이 부모 필드의 JSDoc을 끌어오지 못해 문서에서
 * 설명이 비고, 목록 응답이 바뀔 때 상세 응답이 같이 흔들린다.
 */
export class PortfolioDetailResponseDto {
  id: number;

  name: string;

  /** 정렬 순서 (0-base). 목록 응답의 sortOrder와 같은 값이다. */
  sortOrder: number;

  /** ISO 8601. */
  createdAt: string;

  /**
   * 계좌 전체 수익률.
   *
   * Σ unrealizedProfit / Σ (avgBuyPrice × quantity) × 100 으로 계산하는
   * 금액가중 평균이다. 종목별 returnRate의 단순평균이 아니다. 1주짜리
   * 종목과 100주짜리 종목을 같은 무게로 세면 실제 손익과 어긋난다.
   *
   * 퍼센트, 소수 2자리. holdings가 비어 있으면 0이다.
   */
  totalReturnRate: number;

  /**
   * 이 계좌에 등록된 종목 중 실제로 보유 중인 것.
   *
   * 등록해 뒀지만 전량 매도한 종목은 빠진다. 등록 자체는 남아 있어
   * 재매수하면 별도 조작 없이 다시 나타난다.
   */
  holdings: HoldingDto[];
}
