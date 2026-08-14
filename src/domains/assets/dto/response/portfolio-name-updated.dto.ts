/**
 * PATCH /assets/portfolios/:portfolioId 응답.
 *
 * 목록·생성이 쓰는 PortfolioSummaryDto와 달리 sortOrder·createdAt이 없고
 * updatedAt이 있다. 이름만 바꾸는 요청이라 프론트가 갱신해야 하는 값도
 * 그것뿐이다.
 */
export class PortfolioNameUpdatedDto {
  id: number;

  name: string;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다. */
  updatedAt: string;
}
