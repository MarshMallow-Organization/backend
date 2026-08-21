// 토스 API 응답 원본 인터페이스 정의

export interface TossStock {
  // 토스 종목 정보
  symbol: string;
  name: string;
  price?: number;
  englishName?: string;
  isinCode?: string;
  market?: string;
  securityType?: string;
  isCommonShare?: boolean;
  status?: string;
  currency?: string;
  listDate?: string | null;
  delistDate?: string | null;
  sharesOutstanding?: string;
  leverageFactor?: string | null;
  koreanMarketDetail?: {
    liquidationTrading: boolean;
    nxtSupported: boolean;
    krxTradingSuspended: boolean;
    nxtTradingSuspended: boolean | null;
  } | null;
}

export interface TossStockResponse {
  result: TossStock[];
}
