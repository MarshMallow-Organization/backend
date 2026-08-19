// 토스 api 응답 형식을 정의하는 인터페이스

export interface TossStock {
  // 토스 종목 정보
  symbol: string;
  name: string;
  englishName: string;
  isinCode: string;
  market: string;
  securityType: string;
  isCommonShare: boolean;
  status: string;
  currency: string;
  listDate: string | null;
  delistDate: string | null;
  sharesOutstanding: string;
  leverageFactor: string | null;
  koreanMarketDetail: {
    liquidationTrading: boolean;
    nxtSupported: boolean;
    krxTradingSuspended: boolean;
    nxtTradingSuspended: boolean | null;
  } | null;
}

export interface TossRankingItem {
  // 종목 랭킹조회
  rank: number;
  symbol: string;
  currency: string;
  price: {
    lastPrice: string;
    basePrice: string;
    changeRate: string;
  };
  tradingVolume: string;
  tradingAmount: string;
}

export interface TossRanking {
  rankedAt: string | null;
  rankings: TossRankingItem[];
}

export interface TossRankingResponse {
  result: TossRanking;
}
export interface TossStockResponse {
  result: TossStock[];
}
