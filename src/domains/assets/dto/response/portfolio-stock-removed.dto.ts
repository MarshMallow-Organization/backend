/**
 * DELETE /assets/portfolios/:portfolioId/stocks/:stockCode 응답.
 *
 * PortfolioDeletedDto와 형태가 다르다. 그쪽은 계좌 하나를 가리키는
 * { id, deleted }지만, 종목 제거는 계좌·종목 쌍을 가리켜야 한다.
 */
export class PortfolioStockRemovedDto {
  portfolioId: number;

  stockCode: string;

  /** 항상 true다. 제거에 실패하면 예외가 나가므로 false가 담길 일은 없다. */
  removed: boolean;
}
