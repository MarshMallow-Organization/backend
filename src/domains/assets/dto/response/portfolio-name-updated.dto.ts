/**
 * PATCH /assets/portfolios/:portfolioId 응답.
 *
 * 목록·생성이 쓰는 PortfolioSummaryDto와 달리 sortOrder·createdAt이 없고
 * updatedAt이 있다. 이름만 바꾸는 요청이라 프론트가 갱신해야 하는 값도
 * 그것뿐이다.
 */
export class PortfolioNameUpdatedDto {
  /** 가상계좌 ID.
   * @example 12
   */
  id: number;

  /** 변경된 이름.
   * @example "공격형 투자"
   */
  name: string;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다.
   * @example 2026-07-24T11:30:00.000Z
   */
  updatedAt: string;
}
