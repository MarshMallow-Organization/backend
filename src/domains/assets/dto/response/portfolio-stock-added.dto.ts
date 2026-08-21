/** POST /assets/portfolios/:portfolioId/stocks 응답. */
export class PortfolioStockAddedDto {
  portfolioId: number;

  stockCode: string;

  /** ISO 8601. Prisma의 Date를 서비스에서 문자열로 변환해 담는다. */
  addedAt: string;
}
