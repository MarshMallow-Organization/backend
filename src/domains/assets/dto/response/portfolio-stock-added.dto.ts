/** POST /assets/portfolios/:portfolioId/stocks 응답. */
export class PortfolioStockAddedDto {
  /** 종목을 추가한 가상계좌 ID.
   * @example 12
   */
  portfolioId: number;

  /** 추가한 종목 코드.
   * @example 005930
   */
  stockCode: string;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다.
   * @example 2026-07-24T11:30:00.000Z
   */
  addedAt: string;
}
