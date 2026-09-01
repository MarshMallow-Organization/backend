// 토스 API 응답 원본 인터페이스 정의

export interface TossStock {
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
  koreanMarketDetail: TossKoreanMarketDetail | null;
  price?: number;
  [key: string]: unknown;
}

export interface TossKoreanMarketDetail {
  liquidationTrading: boolean;
  nxtSupported: boolean;
  krxTradingSuspended: boolean;
  nxtTradingSuspended?: boolean | null;
}

export interface TossStockResponse {
  result: TossStock[];
}

/** 토스 전체 종목 조회 API에서 지원하는 시장 */
export type TossStockMarket =
  'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ' | 'AMEX' | 'KR_ETC' | 'US_ETC';

/** GET /api/v1/stocks/all 응답의 개별 종목 */
export interface TossListedStock {
  symbol: string;
  name: string;
  securityType: string;
  isCommonShare: boolean;
  isinCode: string;
}

/** GET /api/v1/stocks/all 원본 응답 */
export interface TossListedStockResponse {
  result: TossListedStock[];
}

/** 토스 인증 토큰 응답 인터페이스 */
export interface TossTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number; // 초 단위 유효기간
}

/** 토스 에러 응답 Envelope 인터페이스 */
export interface TossErrorDetail {
  requestId?: string;
  referenceId?: string;
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface TossErrorEnvelope {
  error: TossErrorDetail;
}

/** 토스 API 인증 키 정보 (개발자 기본값 또는 사용자별 키) */
export interface TossCredentials {
  clientKey: string;
  clientSecret: string;
  accessToken?: string;
}
