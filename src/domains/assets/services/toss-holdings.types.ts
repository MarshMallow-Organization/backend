/**
 * 토스 증권 계좌·자산 API(GET /api/v1/accounts, /holdings, /exchange-rate)
 * 원본 응답 타입.
 *
 * developers.tossinvest.com의 openapi.json을 직접 받아 확인한 실제 스키마다.
 * 금액·수량은 전부 문자열로 내려온다.
 */

/** GET /api/v1/accounts의 계좌 한 건. */
export interface TossAccountRaw {
  accountNo: string;
  accountSeq: number;
  accountType:
    | 'BROKERAGE'
    | 'OVERSEAS_DERIVATIVES'
    | 'PENSION_SAVINGS'
    | 'RESHORING_INVESTMENT';
}

export interface TossAccountsResponse {
  result: TossAccountRaw[];
}

/** GET /api/v1/holdings의 items[] 한 건. */
export interface TossHoldingItemRaw {
  symbol: string;
  name: string;
  marketCountry: 'KR' | 'US';
  currency: 'KRW' | 'USD';
  quantity: string;
  lastPrice: string;
  averagePurchasePrice: string;
  marketValue: {
    purchaseAmount: string;
    amount: string;
    amountAfterCost: string;
  };
  profitLoss: {
    amount: string;
    amountAfterCost: string;
    rate: string;
    rateAfterCost: string;
  };
  dailyProfitLoss: {
    amount: string;
    rate: string;
  };
}

/**
 * result의 요약 필드(totalPurchaseAmount 등)는 krw/usd가 안 합쳐진
 * 원본 그대로라 여기서 안 쓴다. items만 받아 우리가 원화로 환산·합산한다.
 */
export interface TossHoldingsResponse {
  result: {
    items: TossHoldingItemRaw[];
  };
}

/** GET /api/v1/exchange-rate 응답. rate: baseCurrency 1단위 = rate × quoteCurrency. */
export interface TossExchangeRateResponse {
  result: {
    baseCurrency: string;
    quoteCurrency: string;
    rate: string;
  };
}
